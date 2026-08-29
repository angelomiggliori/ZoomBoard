import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { DeviceScreen } from './DeviceScreen';
import { SwitchConfigDialog } from './SwitchConfigDialog';
import { PresetRowDeck } from './PresetRowDeck';
import { FootSwitchButton } from './FootSwitchButton';
import { LedBar } from './LedBar';
import { DEFAULT_SWITCHES, DEMO_PATCHES } from '../lib/pedalboard';
import { useZoomMidi } from '../lib/useZoomMidi';
import { bankLetter } from '../lib/zoomMidi';
import { FS_HOLD_MS } from '../lib/zoomProtocolEngine';
import { NUM_BANKS_TOTAL } from '../lib/fsActions';
import type { Patch, SwitchConfig } from '../types';

const STORAGE_KEY = 'zoomboard:switch-config:v11';
const PRESET_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5'];

export const Pedalboard: React.FC = () => {
  const [switches, setSwitches] = useState<SwitchConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SwitchConfig[];
        if (Array.isArray(parsed) && parsed.length === DEFAULT_SWITCHES.length) {
          return parsed;
        }
      }
    } catch {
      // Ignora erro
    }
    return DEFAULT_SWITCHES;
  });

  const [editing, setEditing] = useState<boolean>(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // Botões atualmente afundados
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set());

  // Estado dos Patches e Cadeia de Efeitos Zoom G1On (visual/demo -- ver nota
  // no README sobre o que é real vs. decorativo)
  const [patches, setPatches] = useState<Record<string, Patch>>(DEMO_PATCHES);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Camada WebMIDI + Motor de Protocolo Zoom + Motor de Tap Tempo (o "motor").
  // activeBank/activePreset (numéricos, 0..9) são a fonte de verdade de qual
  // slot está ativo -- a UI deriva o id visual (a1..b5) a partir deles, em
  // vez de manter um estado paralelo que podia dessincronizar do motor.
  const {
    midiSupported,
    midiConnected,
    currentBpm,
    lastMidiLog,
    activePatchName,
    activeBank,
    activePreset: activePresetIndex,
    isTunerActive,
    sendBankAndProgram,
    triggerTap,
    triggerFootswitchHold,
  } = useZoomMidi();

  const activeSlotId = PRESET_ORDER[activePresetIndex] ?? PRESET_ORDER[0];

  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Timers de "segurar" para BANK e TAP/TUNER -- essas duas têm dupla função
  // (clique curto vs. hold), igual FS3/FS4 no firmware (footswitches.cpp).
  // A ação de hold dispara assim que FS_HOLD_MS estoura, ainda pressionado;
  // a ação de clique só dispara na soltura, e só se o hold nunca disparou.
  const holdTimerRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const holdFiredRef = useRef<Record<string, boolean>>({});

  // Atualiza o nome do patch ativo quando lido via SysEx do hardware real.
  // null = nenhuma resposta chegou ainda (mantém o nome de demonstração);
  // '' = o pedal respondeu com um patch sem nome (mostra isso de verdade,
  // não o nome de demonstração antigo -- ver decodePatchName em zoomMidi.ts).
  useEffect(() => {
    if (activePatchName !== null) {
      setPatches((prev) => {
        const current = prev[activeSlotId];
        if (!current || current.name === activePatchName) return prev;
        return {
          ...prev,
          [activeSlotId]: {
            ...current,
            name: activePatchName,
          },
        };
      });
    }
  }, [activePatchName, activeSlotId]);

  // Persistência
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(switches));
    } catch {
      // localStorage indisponível
    }
  }, [switches]);

  // Limpa qualquer hold-timer pendente ao desmontar
  useEffect(() => {
    return () => {
      Object.values(holdTimerRef.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  const switchesById = useMemo(() => {
    const map: Record<string, SwitchConfig> = {};
    for (const sw of switches) {
      map[sw.id] = sw;
    }
    return map;
  }, [switches]);

  const takenKeys = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sw of switches) {
      if (sw.key) {
        map[sw.key.toLowerCase()] = sw.id;
      }
    }
    return map;
  }, [switches]);

  const triggerFlashFeedback = useCallback((id: string) => {
    setFlashingKeys((prev) => new Set(prev).add(id));
    clearTimeout(timeoutRefs.current[`flash-${id}`]);
    timeoutRefs.current[`flash-${id}`] = setTimeout(() => {
      setFlashingKeys((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 280);
  }, []);

  // Início do pressionamento: afunda o botão e dispara comandos MIDI / Tap.
  // Presets disparam na hora (feedback instantâneo de footswitch). BANK e
  // TAP/TUNER armam um timer de hold e só decidem a ação no handlePressEnd
  // (clique) ou quando o timer estoura ainda pressionado (hold).
  const handlePressStart = useCallback(
    (id: string) => {
      const cfg = switchesById[id];
      if (!cfg) return;

      setPressedKeys((prev) => new Set(prev).add(id));

      if (cfg.role === 'preset') {
        setSelectedBlockId(null);
        const presetIndex = PRESET_ORDER.indexOf(id);
        if (presetIndex >= 0) {
          sendBankAndProgram(activeBank, presetIndex);
        }
      } else if (id === 'left' || id === 'right') {
        triggerFlashFeedback(id);
        holdFiredRef.current[id] = false;
        holdTimerRef.current[id] = setTimeout(() => {
          holdFiredRef.current[id] = true;
          if (id === 'left') {
            // Hold no BANK = banco anterior (ver handlePressEnd pro clique = próximo)
            const prevBank = (activeBank + NUM_BANKS_TOTAL - 1) % NUM_BANKS_TOTAL;
            sendBankAndProgram(prevBank, activePresetIndex);
          } else {
            // Hold no TAP/TUNER = liga/desliga afinador. Reusa a lógica real
            // do motor (idx 3 = FS4 no firmware, ver handleFootswitchHold em
            // zoomProtocolEngine.ts) em vez de reimplementar o toggle aqui.
            triggerFootswitchHold(3);
          }
        }, FS_HOLD_MS);
      } else {
        triggerFlashFeedback(id);
      }
    },
    [switchesById, triggerFlashFeedback, sendBankAndProgram, activeBank, activePresetIndex, triggerFootswitchHold]
  );

  // Fim do pressionamento: sobe o botão e, pra BANK/TAP-TUNER, resolve o
  // clique curto (só se o hold ainda não tiver disparado).
  const handlePressEnd = useCallback(
    (id?: string) => {
      if (id) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        if (id === 'left' || id === 'right') {
          if (holdTimerRef.current[id]) {
            clearTimeout(holdTimerRef.current[id]!);
            holdTimerRef.current[id] = null;
          }
          if (!holdFiredRef.current[id]) {
            if (id === 'left') {
              const nextBank = (activeBank + 1) % NUM_BANKS_TOTAL;
              sendBankAndProgram(nextBank, activePresetIndex);
            } else {
              triggerTap();
            }
          }
        }
      } else {
        setPressedKeys(new Set());
      }
    },
    [activeBank, activePresetIndex, sendBankAndProgram, triggerTap]
  );

  // Listener global de soltura
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setPressedKeys(new Set());
      // Rede de segurança: se pointerup/pointerleave não disparou no próprio
      // elemento (dedo saiu da tela em outro lugar), cancela qualquer
      // hold-timer pendente SEM disparar a ação de clique -- mais seguro que
      // executar um comando MIDI "atrasado" bem depois do dedo já ter saído.
      (['left', 'right'] as const).forEach((id) => {
        if (holdTimerRef.current[id]) {
          clearTimeout(holdTimerRef.current[id]!);
          holdTimerRef.current[id] = null;
        }
      });
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, []);

  // Previne menu de contexto ao segurar no Android/Touch/Desktop
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Atalhos do teclado (o próprio e.repeat=false já evita reiniciar o
  // hold-timer a cada auto-repeat do SO enquanto a tecla fica pressionada)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editing || configId) return;
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const keyName = e.key.toLowerCase();
      const switchId = takenKeys[keyName];

      if (switchId) {
        e.preventDefault();
        handlePressStart(switchId);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (editing || configId) return;
      const keyName = e.key.toLowerCase();
      const switchId = takenKeys[keyName];

      if (switchId) {
        e.preventDefault();
        handlePressEnd(switchId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [editing, configId, takenKeys, handlePressStart, handlePressEnd]);

  const handleSaveConfig = (updated: SwitchConfig) => {
    setSwitches((prevList) =>
      prevList.map((item) => {
        if (updated.key && item.id !== updated.id && item.key?.toLowerCase() === updated.key.toLowerCase()) {
          return { ...item, key: null };
        }
        return item.id === updated.id ? updated : item;
      })
    );
    setConfigId(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Restaurar layout e footswitches para o padrão?')) {
      setSwitches(DEFAULT_SWITCHES);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleToggleBlock = (blockId: string) => {
    setPatches((prev) => {
      const current = prev[activeSlotId];
      if (!current) return prev;
      return {
        ...prev,
        [activeSlotId]: {
          ...current,
          chain: current.chain.map((b) => (b.id === blockId ? { ...b, on: !b.on } : b)),
        },
      };
    });
  };

  const rawPatch = patches[activeSlotId] ?? Object.values(patches)[0];
  // Número exibido = banco real + preset real (1-indexado pra leitura
  // humana), sempre recalculado a partir do motor -- nunca o valor estático
  // do DEMO_PATCHES, que só fazia sentido fixo no banco A.
  const currentPatch: Patch = {
    ...rawPatch,
    number: `${bankLetter(activeBank)}${String(activePresetIndex + 1).padStart(2, '0')}`,
  };
  const switchLeft = switchesById['left'];
  const switchRight = switchesById['right'];
  const rowA = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => switchesById[id]).filter(Boolean);
  const rowB = ['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => switchesById[id]).filter(Boolean);

  const renderSideSwitch = (cfg?: SwitchConfig) => {
    if (!cfg) return null;
    const isPressed = pressedKeys.has(cfg.id);
    const isFlashing = flashingKeys.has(cfg.id);

    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full">
        {/* 1. LED Pill com extensão ampla posicionado no topo */}
        <div className="w-full flex justify-center">
          <LedBar
            color={cfg.color}
            mode={cfg.ledMode}
            brightness={cfg.brightness}
            pulseSpeed={cfg.pulseSpeed}
            active={true}
            flash={isFlashing}
          />
        </div>

        {/* 2. Barra grafite / carbono escuro estática */}
        <div
          onClick={() => {
            if (editing) setConfigId(cfg.id);
          }}
          className={`w-full max-w-[150px] carbon-dark-single-cell ${
            editing ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <span className="patch-name-display">{cfg.label}</span>
        </div>

        {/* 3. Footswitch triangular extenso estilo Zoom G6 bem coladinho */}
        <div className="w-full flex justify-center mt-0">
          <FootSwitchButton
            config={cfg}
            active={false}
            pressed={isPressed}
            editing={editing}
            size="lg"
            onPointerDown={(e) => {
              e.preventDefault();
              handlePressStart(cfg.id);
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              handlePressEnd(cfg.id);
            }}
            onPointerLeave={(e) => {
              e.preventDefault();
              handlePressEnd(cfg.id);
            }}
            onConfigure={() => setConfigId(cfg.id)}
          />
        </div>
      </div>
    );
  };

  return (
    <main className="device-surface min-h-screen w-full bg-[#07080a] text-neutral-100 flex flex-col items-center justify-start p-2 sm:p-4 md:p-6 select-none overflow-x-hidden">
      <div className="w-full max-w-6xl flex flex-col gap-3.5 sm:gap-5">
        {!midiSupported && (
          <div className="w-full rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-center font-tech text-[0.7rem] sm:text-xs text-red-300">
            Este navegador não suporta Web MIDI -- abra em Chrome, Edge ou Opera (desktop ou Android) e conecte o pedal via USB para controlar de verdade.
          </div>
        )}

        {/* BARRA SUPERIOR */}
        <TopBar
          editing={editing}
          onToggleEditing={() => setEditing((prev) => !prev)}
          midiConnected={midiConnected}
          onResetDefaults={handleResetDefaults}
        />

        {/* CHASSI PRINCIPAL COM TEXTURA E FILETE DOURADO */}
        <div className="headrush-texture rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 relative shadow-[0_30px_90px_rgba(0,0,0,0.95)] flex flex-col gap-4 sm:gap-6">
          {/* FILETE DOURADO SUPERIOR */}
          <div className="gold-accent-line w-full rounded-full" />

          {/* FILEIRA SUPERIOR: [BANK] | [TELA TOUCHSCREEN ZOOM G1On] | [TAP / TUNER] */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-6 min-h-[250px] sm:min-h-[280px]">
            {/* SWITCH LATERAL ESQUERDO (BANK) */}
            <div className="order-2 sm:order-1 flex justify-center sm:w-40 shrink-0">
              {renderSideSwitch(switchLeft)}
            </div>

            {/* TELA TOUCHSCREEN CENTRAL */}
            <div className="order-1 sm:order-2 flex-1 h-[240px] sm:h-[270px] md:h-[290px] w-full min-w-0">
              <DeviceScreen
                patch={currentPatch}
                bpm={currentBpm}
                selectedBlockId={selectedBlockId}
                editing={editing}
                onToggleEditing={() => setEditing((prev) => !prev)}
                midiConnected={midiConnected}
                midiSupported={midiSupported}
                midiStatusDetail={lastMidiLog}
                activeBank={activeBank}
                tunerActive={isTunerActive}
                onSelectBlock={setSelectedBlockId}
                onToggleBlock={handleToggleBlock}
              />
            </div>

            {/* SWITCH LATERAL DIREITO (TAP / TUNER) */}
            <div className="order-3 sm:order-3 flex justify-center sm:w-40 shrink-0">
              {renderSideSwitch(switchRight)}
            </div>
          </div>

          {/* DIVISOR DE SEÇÃO DOURADO */}
          <div className="gold-accent-line w-full rounded-full" />

          {/* =========================================================================
              CHASSI COM DEGRAU REBAIXADO LINE 6 POD HD500
              - Fileira Superior A: No patamar superior plano do chassi (SEM REBAIXO)
              - Degrau de Transição Chanfrado contínuo de ponta a ponta (pod-step-bevel)
              - Fileira Inferior B: No patamar inferior rebaixado (pod-lower-shelf)
             ========================================================================= */}
          <div className="w-full flex flex-col">
            {/* PATAMAR SUPERIOR (FILEIRA A) - SEM REBAIXO, FOOTS COLADINHOS */}
            <div className="w-full pb-1">
              <PresetRowDeck
                switches={rowA}
                activePreset={activeSlotId}
                pressedKeys={pressedKeys}
                flashingKeys={flashingKeys}
                editing={editing}
                onPointerDown={(id, e) => {
                  e.preventDefault();
                  handlePressStart(id);
                }}
                onPointerUp={(id, e) => {
                  e.preventDefault();
                  handlePressEnd(id);
                }}
                onPointerLeave={(id, e) => {
                  e.preventDefault();
                  handlePressEnd(id);
                }}
                onConfigure={(id) => setConfigId(id)}
              />
            </div>

            {/* DEGRAU CHANFRADO DE TRANSIÇÃO ESTILO POD HD500 DE PONTA A PONTA */}
            <div className="pod-step-bevel" />

            {/* PATAMAR INFERIOR REBAIXADO (FILEIRA B) */}
            <div className="pod-lower-shelf px-1 sm:px-2 pb-2">
              <PresetRowDeck
                switches={rowB}
                activePreset={activeSlotId}
                pressedKeys={pressedKeys}
                flashingKeys={flashingKeys}
                editing={editing}
                onPointerDown={(id, e) => {
                  e.preventDefault();
                  handlePressStart(id);
                }}
                onPointerUp={(id, e) => {
                  e.preventDefault();
                  handlePressEnd(id);
                }}
                onPointerLeave={(id, e) => {
                  e.preventDefault();
                  handlePressEnd(id);
                }}
                onConfigure={(id) => setConfigId(id)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CONFIGURAÇÃO */}
      {configId && switchesById[configId] && (
        <SwitchConfigDialog
          config={switchesById[configId]}
          takenKeys={takenKeys}
          onClose={() => setConfigId(null)}
          onSave={handleSaveConfig}
        />
      )}
    </main>
  );
};
