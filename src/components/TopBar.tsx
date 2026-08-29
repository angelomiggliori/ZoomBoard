import React from 'react';
import { Play, Settings2, RotateCcw, Radio } from 'lucide-react';

interface TopBarProps {
  editing: boolean;
  onToggleEditing: () => void;
  midiConnected: boolean;
  onResetDefaults: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  editing,
  onToggleEditing,
  midiConnected,
  onResetDefaults,
}) => {
  return (
    <header className="w-full flex items-center justify-between gap-3 px-2 py-1 select-none">
      {/* 1. LOGO HEADRUSH / ZOOMBOARD BRANDING */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-lg sm:text-xl tracking-[0.18em] text-neutral-100 uppercase">
              ZOOM<span className="text-amber-400">BOARD</span>
            </span>
            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-tech text-[0.62rem] font-bold px-1.5 py-0.5 rounded tracking-widest uppercase">
              PRIME EDITION
            </span>
          </div>
          <span className="font-tech text-[0.65rem] tracking-[0.25em] text-neutral-400 uppercase font-semibold">
            WEBMIDI VIRTUAL CONTROLLER FOR ZOOM G1On
          </span>
        </div>
      </div>

      {/* 2. AÇÕES DISCRETAS NO CABEÇALHO */}
      <div className="flex items-center gap-2">
        {/* Restaurar Padrões */}
        <button
          type="button"
          onClick={onResetDefaults}
          title="Restaurar configurações de fábrica dos switches"
          className="flex items-center gap-1.5 rounded border border-neutral-800/80 bg-neutral-900/60 px-2.5 py-1 font-tech text-[0.68rem] font-semibold text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESTAURAR</span>
        </button>
      </div>
    </header>
  );
};
