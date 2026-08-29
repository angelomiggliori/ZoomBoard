import React, { useEffect, useState } from 'react';
import { Check, Keyboard, X, RotateCcw, Sliders, Palette, Zap } from 'lucide-react';
import { LedBar } from './LedBar';
import { LED_MODE_LABELS, LED_PALETTE } from '../lib/pedalboard';
import type { LedMode, SwitchConfig } from '../types';

interface SwitchConfigDialogProps {
  config: SwitchConfig;
  takenKeys: Record<string, string>; // key -> switchId
  onClose: () => void;
  onSave: (next: SwitchConfig) => void;
}

const MODES: LedMode[] = ['active', 'solid', 'pulse', 'blink', 'off'];

export const SwitchConfigDialog: React.FC<SwitchConfigDialogProps> = ({
  config,
  takenKeys,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<SwitchConfig>({ ...config });
  const [capturing, setCapturing] = useState(false);

  // Fecha com tecla Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (capturing) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
          setCapturing(false);
          return;
        }
        setDraft((d) => ({ ...d, key: e.key.toLowerCase() }));
        setCapturing(false);
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [capturing, onClose]);

  const keyConflict =
    draft.key && takenKeys[draft.key] && takenKeys[draft.key] !== config.id;

  const updateDraft = <K extends keyof SwitchConfig>(key: K, value: SwitchConfig[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onPointerDown={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configurar footswitch ${config.label}`}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0f1117] shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_20px_rgba(212,175,55,0.1)] flex flex-col max-h-[90vh]"
      >
        {/* 1. CABEÇALHO COM PREVIEW DO LED E DO SWITCH */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-[#141822] px-5 py-4">
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{
                backgroundColor: draft.color,
                boxShadow: `0 0 10px ${draft.color}`,
              }}
            />
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-neutral-100 uppercase tracking-wider">
                Configurar Footswitch ({config.id.toUpperCase()})
              </h2>
              <p className="font-tech text-xs text-neutral-400">
                Personalize nome, LED, cor e atalho de teclado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 grid place-items-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. ÁREA DE PREVIEW EM TEMPO REAL */}
        <div className="px-5 py-3.5 bg-[#090a0e] border-b border-neutral-800/80 flex items-center justify-between">
          <span className="font-tech text-xs uppercase tracking-widest text-neutral-400 font-bold">
            Pré-visualização:
          </span>

          <div className="flex flex-col items-center w-36">
            <LedBar
              color={draft.color}
              mode={draft.ledMode}
              brightness={draft.brightness}
              pulseSpeed={draft.pulseSpeed}
              active={true}
              className="w-full mb-1"
            />
            <div
              className="translucent-plaque w-full py-1 px-2 text-center"
              style={{ '--plaque-color': draft.color } as React.CSSProperties}
            >
              <span
                className="font-display text-xs font-bold uppercase tracking-wider block truncate"
                style={{ color: draft.color }}
              >
                {draft.label || 'PRESET'}
              </span>
              <span className="font-tech text-[0.55rem] font-semibold uppercase text-neutral-400 block truncate">
                {draft.sublabel || 'PATCH'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. CORPO DE FORMULÁRIO COM ABAS / SEÇÕES */}
        <div className="overflow-y-auto px-5 py-4 space-y-4.5 scrollbar-thin">
          {/* NOME E LEGENDA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-tech text-xs uppercase tracking-wider font-bold text-neutral-300 mb-1">
                Nome do Preset / Função
              </label>
              <input
                type="text"
                value={draft.label}
                maxLength={14}
                onChange={(e) => updateDraft('label', e.target.value)}
                placeholder="Ex: RIG A"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-display text-sm uppercase tracking-wider text-neutral-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block font-tech text-xs uppercase tracking-wider font-bold text-neutral-300 mb-1">
                Sublegenda / Linha 2
              </label>
              <input
                type="text"
                value={draft.sublabel}
                maxLength={16}
                onChange={(e) => updateDraft('sublabel', e.target.value)}
                placeholder="Ex: PATCH 01"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 font-tech text-sm uppercase tracking-wider text-neutral-100 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* TECLA DE ATALHO FÍSICO */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-tech text-xs uppercase tracking-wider font-bold text-neutral-300 flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Atalho de Teclado Físico</span>
              </label>

              {draft.key && (
                <button
                  type="button"
                  onClick={() => updateDraft('key', null)}
                  className="font-tech text-xs text-neutral-400 hover:text-red-400 transition-colors"
                >
                  Remover atalho
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setCapturing(true)}
              className={`w-full flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-all ${
                capturing
                  ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300 ring-2 ring-cyan-400/40 animate-pulse'
                  : 'border-neutral-700 bg-neutral-900 hover:border-neutral-600 text-neutral-200'
              }`}
            >
              <span className="font-display text-sm tracking-wide">
                {capturing
                  ? 'Pressione qualquer tecla no seu teclado…'
                  : draft.key
                  ? `Tecla atribuída: [ ${draft.key === ' ' ? 'BARRA DE ESPAÇO' : draft.key.toUpperCase()} ]`
                  : 'Nenhuma tecla atribuída (Clique para capturar)'}
              </span>

              <span className="font-tech text-xs bg-neutral-800 px-2 py-0.5 rounded text-neutral-400">
                {capturing ? 'Aguardando' : 'Mudar'}
              </span>
            </button>

            {keyConflict && (
              <p className="mt-1.5 font-tech text-xs text-amber-400">
                Aviso: A tecla &quot;{draft.key?.toUpperCase()}&quot; já está sendo usada pelo switch {takenKeys[draft.key!].toUpperCase()}. Ao salvar, ela será transferida para este switch.
              </p>
            )}
          </div>

          {/* PALETA DE COR DO LED */}
          <div>
            <label className="font-tech text-xs uppercase tracking-wider font-bold text-neutral-300 flex items-center gap-1.5 mb-2">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span>Cor do LED / Placa Iluminada</span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {LED_PALETTE.map((pal) => (
                <button
                  key={pal.hex}
                  type="button"
                  title={pal.name}
                  onClick={() => updateDraft('color', pal.hex)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                    draft.color.toLowerCase() === pal.hex.toLowerCase()
                      ? 'scale-115 border-white shadow-[0_0_12px_rgba(255,255,255,0.8)]'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: pal.hex,
                    boxShadow: `0 0 8px ${pal.hex}60`,
                  }}
                />
              ))}

              {/* Seletor Customizado HTML5 */}
              <label
                title="Escolher cor personalizada"
                className="w-8 h-8 rounded-full border border-neutral-600 bg-neutral-800 flex items-center justify-center cursor-pointer text-xs font-bold text-neutral-300 hover:border-neutral-400"
              >
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => updateDraft('color', e.target.value)}
                  className="sr-only"
                />
                +
              </label>
            </div>
          </div>

          {/* MODO DE COMPORTAMENTO DO LED */}
          <div>
            <label className="font-tech text-xs uppercase tracking-wider font-bold text-neutral-300 flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modo de Iluminação do LED</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateDraft('ledMode', mode)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left font-tech text-xs font-semibold tracking-wide transition-all ${
                    draft.ledMode === mode
                      ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                      : 'border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <span>{LED_MODE_LABELS[mode]}</span>
                  {draft.ledMode === mode && <Check className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* CONTROLE DE BRILHO */}
          <div>
            <div className="flex items-center justify-between font-tech text-xs font-bold text-neutral-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                <span>Intensidade de Brilho</span>
              </span>
              <span className="text-amber-400">{draft.brightness}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={draft.brightness}
              onChange={(e) => updateDraft('brightness', Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* VELOCIDADE DE PULSO (QUANDO APLICÁVEL) */}
          {(draft.ledMode === 'pulse' || draft.ledMode === 'blink') && (
            <div>
              <div className="flex items-center justify-between font-tech text-xs font-bold text-neutral-300 mb-1">
                <span>Velocidade de Pulso / Ciclo</span>
                <span className="text-cyan-400">{(draft.pulseSpeed / 1000).toFixed(2)}s por ciclo</span>
              </div>
              <input
                type="range"
                min={200}
                max={3000}
                step={50}
                value={draft.pulseSpeed}
                onChange={(e) => updateDraft('pulseSpeed', Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* 4. FOOTER DE AÇÃO */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-[#12151e] px-5 py-3.5">
          <button
            type="button"
            onClick={() => setDraft({ ...config })}
            className="flex items-center gap-1.5 font-tech text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar original</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2 font-tech text-xs font-bold tracking-wider text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              CANCELAR
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-5 py-2 font-display text-xs font-bold tracking-wider transition-colors shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer"
            >
              SALVAR CONFIGURAÇÃO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
