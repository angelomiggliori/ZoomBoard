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
import type { Patch, SwitchConfig } from '../types';

// v12: role 'momentary' virou 'bankSelect'/'tapTuner' (ver pedalboard.ts) --
// bump obrigatório, senão uma config salva por uma sessão anterior a essa
// mudança ficaria com BANK/TAP mudos (role antigo não bate com os novos
// checks de handlePressStart/handleKeyUp).
const STORAGE_KEY = 'zoomboard:switch-config:v12';
const PRESET_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5'];

// ---------------------------------------------------------------------------
// Modo de interação do grid de 10 presets.
//
// Em modo normal cada botão seleciona diretamente um preset do banco ativo.
// Clicar em BANK entra em "pickingBank": o MESMO grid de 10 botões passa a
// representar os 10 bancos (A..J) -- um encaixe 1:1 direto, sem precisar do
// truque de faixa A-E/F-J que o firmware original usa pra caber 10 bancos
// em só 5 botões físicos (esse truque continua disponível em
// zoomProtocolEngine.ts::handleFootswitchHold(2) caso um dia sirva pra um
// controlador MIDI físico de 5 botões, mas não faz sentido forçar aqui).
// Escolhido o banco, o grid passa pra "pickingPreset": agora mostra os 10
// presets DAQUELE banco: escolher um confirma a troca de patch de verdade
// e volta pro modo normal. Clicar em BANK de novo em qualquer ponto desse
// fluxo cancela e volta pro normal, sem mandar nenhum MIDI.
// ---------------------------------------------------------------------------
type InteractionMode = { kind: 'normal' } | { kind: 'pickingBank' } | { kind: 'pickingPreset'; bank: number };

/** Durante a escolha do banco, troca os rótulos do grid pelas letras A..J. */
function displaySwitchesForMode(list: SwitchConfig[], mode: InteractionMode): SwitchConfig[] {
  if (mode.kind !== 'pickingBank') return list;
  return list.map((cfg) => {
    const gridIndex = PRESET_ORDER.indexOf(cfg.id);
    return { ...cfg, label: bankLetter(gridIndex), sublabel: 'BANCO' };
  });
}

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
  const [mode, setMode] = useState<InteractionMode>({ kind: 'normal' });

  // Botões atualmente afundados
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set());

  // Estado dos Patches e Cadeia de Efeitos Zoom G1On (visual/demo -- ver nota
  // no README sobre o que é real vs. decorativo)
  const [patches, setPatches] = useState<Record<string, Patch>>(DEMO_PATCHES);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Camada WebMIDI + Motor de Protocolo Zoom + Motor de Tap Tempo (o "motor").
  // activeBank/activePreset (numéricos, 0..9) são a fonte de verdade de qual
  // slot está ativo DE VERDADE no hardware -- não confundir com o "destaque"
  // visual do grid, que durante o modo de seleção mostra outra coisa (ver
  // highlightSlotId abaixo).
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

  // Slot ativo DE VERDADE no motor (independe do modo de seleção -- só muda
  // quando um patch é realmente confirmado).
  const realActiveSlotId = PRESET_ORDER[activePresetIndex] ?? PRESET_ORDER[0];

  // Slot que deve ACENDER no grid agora. Em pickingBank, mostra onde o banco
  // ativo está (referência de "você está aqui"); em pickingPreset não
  // destaca nada (ainda não existe "ativo" nesse banco não visitado); em
  // modo normal, é o preset ativo de verdade.
  const highlightSlotId =
    mode.kind === 'pickingBank' ? PRESET_ORDER[activeBank] ?? PRESET_ORDER[0] : mode.kind === 'pickingPreset' ? '' : realActiveSlotId;

  const pickerHint =
    mode.kind === 'pickingBank'
      ? 'ESCOLHA O BANCO'
      : mode.kind === 'pickingPreset'
      ? `ESCOLHA O PRESET · BANCO ${bankLetter(mode.bank)}`
      : null;

  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Timer de "segurar" -- hoje só o TAP/TUNER precisa (clique = tap tempo,
  // segurar = liga/desliga afinador). BANK não usa mais hold: seu único
  // propósito é abrir/fechar o seletor de banco, então um clique simples
  // já basta, sem precisar da distinção clique-vs-segurar.
  const holdTimerRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const holdFiredRef = useRef<Record<string, boolean>>({});

  // Atualiza o nome do patch ativo quando lido via SysEx do hardware real.
  // Sempre pelo slot ATIVO DE VERDADE (realActiveSlotId) -- nunca pelo que
  // está sendo navegado no seletor, que ainda não foi confirmado.
  useEffect(() => {
    if (activePatchName !== null) {
      setPatches((prev) => {
        const current = prev[realActiveSlotId];
        if (!current || current.name === activePatchName) return prev;
        return {
          ...prev,
          [realActiveSlotId]: {
            ...current,
            name: activePatchName,
          },
        };
      });
    }
  }, [activePatchName, realActiveSlotId]);

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

  // Clique em BANK (evento `click` nativo): alterna entre modo normal e
  // "escolhendo banco". Sem hold aqui -- ver comentário no topo do arquivo.
  const handleBankSelectClick = useCallback(() => {
    setMode((prev) => (prev.kind === 'normal' ? { kind: 'pickingBank' } : { kind: 'normal' }));
  }, []);

  // Clique curto em TAP/TUNER (evento `click` nativo) -- só dispara se o
  // hold ainda não tiver disparado pra esse pressionamento.
  const handleTapTunerClick = useCallback(() => {
    if (holdFiredRef.current['right']) return;
    triggerTap();
  }, [triggerTap]);

  // Clique num botão do grid de presets (evento `click` nativo, não
  // pointerdown). Em modo normal essa função não faz nada -- a seleção
  // direta de preset já aconteceu no pointerdown (handlePressStart), pra
  // manter o feedback instantâneo de footswitch. Aqui é só onde o grid
  // "significa outra coisa" quando reaproveitado como seletor.
  const handleGridClick = useCallback(
    (id: string) => {
      const gridIndex = PRESET_ORDER.indexOf(id);
      if (gridIndex < 0) return;

      if (mode.kind === 'pickingBank') {
        setMode({ kind: 'pickingPreset', bank: gridIndex });
      } else if (mode.kind === 'pickingPreset') {
        sendBankAndProgram(mode.bank, gridIndex);
        setMode({ kind: 'normal' });
      }
    },
    [mode, sendBankAndProgram]
  );

  // Início do pressionamento (pointerdown): afunda o botão e, SÓ em modo
  // normal, já dispara a troca de preset na hora (feedback instantâneo de
  // footswitch). BANK e TAP/TUNER despacham pelo `role`, não mais por
  // comparação de `id` -- é isso que tava causando o bug do banco: tratar o
  // botão pela posição em vez de pela função que ele exerce.
  const handlePressStart = useCallback(
    (id: string) => {
      const cfg = switchesById[id];
      if (!cfg) return;

      setPressedKeys((prev) => new Set(prev).add(id));

      if (cfg.role === 'preset') {
        setSelectedBlockId(null);
        if (mode.kind === 'normal') {
          const presetIndex = PRESET_ORDER.indexOf(id);
          if (presetIndex >= 0) {
            sendBankAndProgram(activeBank, presetIndex);
          }
        }
        // Fora do modo normal, a ação real só acontece no click nativo (ver
        // handleGridClick) -- aqui só afunda visualmente.
      } else if (cfg.role === 'bankSelect') {
        triggerFlashFeedback(id);
        // Sem hold: o click nativo (handleBankSelectClick) decide tudo.
      } else if (cfg.role === 'tapTuner') {
        triggerFlashFeedback(id);
        holdFiredRef.current[id] = false;
        holdTimerRef.current[id] = setTimeout(() => {
          holdFiredRef.current[id] = true;
          // Reusa a lógica real do motor (idx 3 = FS4 no firmware) em vez
          // de reimplementar o toggle do afinador aqui.
          triggerFootswitchHold(3);
        }, FS_HOLD_MS);
      }
    },
    [switchesById, mode, triggerFlashFeedback, sendBankAndProgram, activeBank, triggerFootswitchHold]
  );

  // Fim do pressionamento: sobe o botão e cancela o hold-timer de
  // TAP/TUNER se ainda não tiver disparado.
  const handlePressEnd = useCallback(
    (id?: string) => {
      if (id) {
        setPressedKeys((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        const cfg = switchesById[id];
        if (cfg?.role === 'tapTuner' && holdTimerRef.current[id]) {
          clearTimeout(holdTimerRef.current[id]!);
          holdTimerRef.current[id] = null;
        }
      } else {
        setPressedKeys(new Set());
      }
    },
    [switchesById]
  );

  // Listener global de soltura
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setPressedKeys(new Set());
      // Rede de segurança: cancela qualquer hold-timer pendente do
      // TAP/TUNER sem disparar ação, caso pointerup/leave não tenha
      // disparado no próprio elemento.
      if (holdTimerRef.current['right']) {
        clearTimeout(holdTimerRef.current['right']!);
        holdTimerRef.current['right'] = null;
      }
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

  // Atalhos do teclado. O teclado nunca dispara um evento `click` nativo no
  // elemento (esse só existe pra interação de ponteiro real), então no
  // keyup replicamos manualmente a mesma decisão que o mouse ganha de
  // graça via onClick.
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
      if (!switchId) return;

      e.preventDefault();
      handlePressEnd(switchId);

      const cfg = switchesById[switchId];
      if (cfg?.role === 'bankSelect') {
        handleBankSelectClick();
      } else if (cfg?.role === 'tapTuner') {
        handleTapTunerClick();
      } else if (cfg?.role === 'preset' && mode.kind !== 'normal') {
        handleGridClick(switchId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    editing,
    configId,
    takenKeys,
    switchesById,
    mode,
    handlePressStart,
    handlePressEnd,
    handleBankSelectClick,
    handleTapTunerClick,
    handleGridClick,
  ]);

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
      const current = prev[realActiveSlotId];
      if (!current) return prev;
      return {
        ...prev,
        [realActiveSlotId]: {
          ...current,
          chain: current.chain.map((b) => (b.id === blockId ? { ...b, on: !b.on } : b)),
        },
      };
    });
  };

  const rawPatch = patches[realActiveSlotId] ?? Object.values(patches)[0];
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
  const displayRowA = displaySwitchesForMode(rowA, mode);
  const displayRowB = displaySwitchesForMode(rowB, mode);

  const renderSideSwitch = (cfg?: SwitchConfig) => {
    if (!cfg) return null;
    const isPressed = pressedKeys.has(cfg.id);
    const isFlashing = flashingKeys.has(cfg.id);
    const isPicking = cfg.role === 'bankSelect' && mode.kind !== 'normal';
    const handleClick = cfg.role === 'bankSelect' ? handleBankSelectClick : handleTapTunerClick;

    return (
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 w-full">
        {/* 1. LED Pill com extensão ampla posicionado no topo */}
        <div className="w-full flex justify-center">
          <LedBar
            color={cfg.color}
            mode={isPicking ? 'blink' : cfg.ledMode}
            brightness={cfg.brightness}
            pulseSpeed={isPicking ? 350 : cfg.pulseSpeed}
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
            onClick={handleClick}
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
                pickerHint={pickerHint}
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
                switches={displayRowA}
                activePreset={highlightSlotId}
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
                onClick={(id) => handleGridClick(id)}
                onConfigure={(id) => setConfigId(id)}
              />
            </div>

            {/* DEGRAU CHANFRADO DE TRANSIÇÃO ESTILO POD HD500 DE PONTA A PONTA */}
            <div className="pod-step-bevel" />

            {/* PATAMAR INFERIOR REBAIXADO (FILEIRA B) */}
            <div className="pod-lower-shelf px-1 sm:px-2 pb-2">
              <PresetRowDeck
                switches={displayRowB}
                activePreset={highlightSlotId}
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
                onClick={(id) => handleGridClick(id)}
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
