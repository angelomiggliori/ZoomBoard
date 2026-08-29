import React from 'react';
import { ChevronRight, Power, Sliders, Activity, Radio, Play, Settings2 } from 'lucide-react';
import { CATEGORY_META } from '../lib/pedalboard';
import { bankLetter } from '../lib/zoomMidi';
import type { Patch } from '../types';

interface DeviceScreenProps {
  patch: Patch;
  bpm: number | null;
  selectedBlockId: string | null;
  editing: boolean;
  onToggleEditing: () => void;
  midiConnected: boolean;
  midiSupported: boolean;
  midiStatusDetail: string | null;
  /** Banco ativo, 0..9 (A..J) -- ver zoomProtocolEngine.ts */
  activeBank: number;
  tunerActive: boolean;
  /** Não-nulo quando o grid de presets virou seletor de banco/preset (ver
   * InteractionMode em Pedalboard.tsx). Substitui o cabeçalho normal por um
   * aviso -- sem isso, o usuário não teria como saber que apertar os
   * footswitches agora significa outra coisa. */
  pickerHint: string | null;
  onSelectBlock: (id: string) => void;
  onToggleBlock: (id: string) => void;
}

export const DeviceScreen: React.FC<DeviceScreenProps> = ({
  patch,
  bpm,
  selectedBlockId,
  editing,
  onToggleEditing,
  midiConnected,
  midiSupported,
  midiStatusDetail,
  activeBank,
  tunerActive,
  pickerHint,
  onSelectBlock,
  onToggleBlock,
}) => {
  const bankLabel = bankLetter(activeBank);
  return (
    <div className="w-full h-full flex flex-col justify-between rounded-xl overflow-hidden bg-[#0a0c10] border border-neutral-700/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.9),0_15px_35px_rgba(0,0,0,0.8)] relative">
      {/* Reflexo sutil de vidro na tela */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] pointer-events-none" />

      {/* 1. BARRA DE STATUS DA TELA TOUCHSCREEN */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 bg-[#0d1017]/95 px-3 py-1.5 text-xs text-neutral-400 z-10 backdrop-blur-sm gap-2">
        {/* Lado Esquerdo: Identificação e Monitor MIDI Discreto */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff] animate-pulse" />
            <span className="font-display font-bold tracking-[0.16em] text-neutral-200 text-[0.7rem] uppercase hidden xs:inline">
              ZOOM G1On
            </span>
          </div>

          {/* Botão / Indicador Discreto de Monitor MIDI na tela */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[0.65rem] font-tech font-bold uppercase transition-colors ${
              midiConnected
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                : !midiSupported
                ? 'border-red-900/60 bg-red-950/30 text-red-400'
                : 'border-neutral-800 bg-neutral-900/90 text-neutral-400'
            }`}
            title={
              !midiSupported
                ? 'Web MIDI não suportado neste navegador -- use Chrome, Edge ou Opera'
                : midiStatusDetail ?? (midiConnected ? 'WebMIDI conectado' : 'Aguardando pedal via USB...')
            }
          >
            <Radio className={`w-2.5 h-2.5 ${midiConnected ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600">
              <span className={`block w-1.5 h-1.5 rounded-full ${midiConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-neutral-500'}`} />
            </span>
            <span>{!midiSupported ? 'SEM WEBMIDI' : midiConnected ? 'MIDI ONLINE' : 'MONITOR MIDI'}</span>
          </div>
        </div>

        {/* Lado Direito: Telemetria e Botão Discreto de Modo Tocar / Configuração */}
        <div className="flex items-center gap-2 sm:gap-2.5 font-tech text-xs">
          <div className="hidden md:flex items-center gap-1 text-cyan-400/90 font-bold text-[0.7rem]">
            <Activity className="w-3 h-3" />
            <span>{bpm ? `${bpm} BPM` : '-- BPM'}</span>
          </div>

          <span className="text-neutral-800 hidden md:inline">|</span>

          {/* Botão Modo Tocar / Configurar Embutido no padrão visual discreto */}
          <button
            type="button"
            onClick={onToggleEditing}
            aria-pressed={editing}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border font-tech text-[0.68rem] font-bold tracking-wider uppercase transition-all cursor-pointer ${
              editing
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'border-neutral-800 bg-neutral-900/90 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
          >
            {editing ? (
              <>
                <Settings2 className="w-3 h-3 text-amber-400 animate-spin-slow" />
                <span>CONFIGURANDO</span>
              </>
            ) : (
              <>
                <Play className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                <span>MODO TOCAR</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. CABEÇALHO DO PATCH ATIVO -- ou tela de afinador / seletor de
          banco-preset, quando algum dos dois estiver ativo */}
      {pickerHint ? (
        <div className="px-4 pt-3 pb-1 flex flex-col items-center justify-center z-10 flex-1">
          <span className="font-display text-2xl sm:text-3xl font-black text-amber-400 tracking-[0.1em] drop-shadow-[0_0_14px_rgba(245,158,11,0.4)] animate-pulse text-center">
            {pickerHint}
          </span>
          <span className="font-tech text-xs text-neutral-400 mt-1.5 uppercase tracking-widest">
            aperte BANK de novo pra cancelar
          </span>
        </div>
      ) : tunerActive ? (
        <div className="px-4 pt-3 pb-1 flex flex-col items-center justify-center z-10 flex-1">
          <span className="font-display text-3xl sm:text-4xl font-black text-amber-400 tracking-[0.15em] drop-shadow-[0_0_14px_rgba(245,158,11,0.4)] animate-pulse">
            AFINADOR
          </span>
          <span className="font-tech text-xs text-neutral-400 mt-1 uppercase tracking-widest">
            segure TAP / TUNER de novo para sair
          </span>
        </div>
      ) : (
        <div className="px-4 pt-3 flex items-baseline justify-between z-10">
          <div className="min-w-0">
            <div className="font-tech text-[0.68rem] uppercase tracking-[0.25em] text-neutral-400 font-semibold">
              PATCH NUMBER / NAME
            </div>
            <div className="flex items-baseline gap-2.5 truncate">
              <span className="font-display text-4xl sm:text-5xl font-black text-cyan-400 tracking-tight drop-shadow-[0_0_12px_rgba(0,240,255,0.35)]">
                {patch.number}
              </span>
              <span className="font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-wide text-neutral-100 truncate">
                {patch.name || '(sem nome)'}
              </span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="font-tech text-[0.65rem] tracking-widest text-neutral-500 uppercase font-semibold">BANCO</span>
            <span className="font-display text-lg tracking-wider text-amber-400 font-bold">{bankLabel}</span>
          </div>
        </div>
      )}

      {/* 3. CADEIA DE SINAL VIRTUAL (IN -> 5 SLOTS G1On -> OUT) */}
      <div className={`flex-1 flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 px-3 py-2 overflow-x-auto z-10 scrollbar-none ${tunerActive || pickerHint ? 'hidden' : ''}`}>
        {/* NÓ IN */}
        <div className="flex flex-col items-center justify-center shrink-0 mx-0.5">
          <span className="w-7 h-7 rounded-full border border-neutral-700 bg-neutral-900/80 font-tech font-bold text-[0.6rem] tracking-wider text-neutral-400 grid place-items-center shadow-inner">
            IN
          </span>
        </div>

        <ChevronRight className="w-3.5 h-3.5 text-neutral-700 shrink-0" />

        {/* 5 BLOCOS DA ZOOM G1On */}
        {patch.chain.map((block, index) => {
          const meta = CATEGORY_META[block.category];
          const isSelected = block.id === selectedBlockId;

          return (
            <React.Fragment key={block.id}>
              <div
                role="button"
                tabIndex={0}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onSelectBlock(block.id);
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  onToggleBlock(block.id);
                }}
                className={`relative flex flex-col justify-between w-[4.8rem] sm:w-[5.4rem] h-22 sm:h-24 p-2 rounded-lg border text-left transition-all shrink-0 cursor-pointer select-none ${
                  isSelected
                    ? 'border-cyan-400/90 bg-neutral-900 shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/40'
                    : 'border-neutral-800 bg-[#0d1015] hover:border-neutral-700'
                } ${block.on ? 'opacity-100' : 'opacity-40 grayscale-[40%]'}`}
              >
                {/* Header do bloco com LED de Categoria e Ícone Power */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      backgroundColor: meta.hex,
                      boxShadow: block.on ? `0 0 8px ${meta.hex}` : 'none',
                    }}
                  />

                  <button
                    type="button"
                    title={block.on ? 'Desligar efeito (Bypass)' : 'Ligar efeito'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBlock(block.id);
                    }}
                    className="p-0.5 text-neutral-400 hover:text-neutral-100 transition-colors"
                  >
                    <Power className={`w-3 h-3 ${block.on ? 'text-emerald-400' : 'text-neutral-600'}`} />
                  </button>
                </div>

                {/* Nome do Módulo e Categoria */}
                <div>
                  <div
                    className="font-tech text-[0.62rem] font-bold uppercase tracking-wider"
                    style={{ color: meta.hex }}
                  >
                    {meta.label}
                  </div>
                  <div className="font-display text-xs sm:text-[0.82rem] font-bold text-neutral-100 truncate leading-tight mt-0.5">
                    {block.name}
                  </div>
                </div>

                {/* Barra de status de bypass */}
                <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: block.on ? '100%' : '0%',
                      backgroundColor: meta.hex,
                    }}
                  />
                </div>
              </div>

              {index < patch.chain.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}

        <ChevronRight className="w-3.5 h-3.5 text-neutral-700 shrink-0" />

        {/* NÓ OUT */}
        <div className="flex flex-col items-center justify-center shrink-0 mx-0.5">
          <span className="w-7 h-7 rounded-full border border-neutral-700 bg-neutral-900/80 font-tech font-bold text-[0.6rem] tracking-wider text-neutral-400 grid place-items-center shadow-inner">
            OUT
          </span>
        </div>
      </div>

      {/* 4. RODAPÉ INFORMATIVO COM DICA TOUCH */}
      <div className="border-t border-neutral-800/80 bg-[#0c0e14] px-3 py-1.5 flex items-center justify-between text-[0.62rem] font-tech tracking-wider text-neutral-400 z-10">
        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Sliders className="w-3 h-3" />
          <span>1 TOQUE: SELECIONAR | DUPLO TOQUE: BYPASS (ON/OFF)</span>
        </div>

        <div className="hidden sm:block text-neutral-500 font-semibold">
          SYS-EX READY · G1ON DSP V1.21
        </div>
      </div>
    </div>
  );
};
