import React from 'react';
import { Settings2 } from 'lucide-react';
import { FootswitchSvg } from './FootswitchSvg';
import type { SwitchConfig } from '../types';

interface FootSwitchButtonProps {
  config: SwitchConfig;
  active: boolean;
  pressed: boolean;
  editing: boolean;
  size?: 'lg' | 'md';
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerLeave: (e: React.PointerEvent) => void;
  onConfigure: () => void;
  /**
   * Opcional. Ligado ao evento nativo `click` do navegador (não a
   * pointerdown/up) -- só dispara depois de um clique de verdade
   * confirmado pelo próprio navegador (mouse: down+up sem arrastar;
   * touch: tap completo). Diferente de pointerdown, não é vulnerável a
   * hover/toque acidental de trackpad. Usado pelos switches BANK/TAP em
   * Pedalboard.tsx pra decidir a ação de clique curto; os presets
   * continuam disparando no pointerdown (feedback instantâneo).
   */
  onClick?: (e: React.MouseEvent) => void;
}

export const FootSwitchButton: React.FC<FootSwitchButtonProps> = ({
  config,
  active,
  pressed,
  editing,
  size = 'md',
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onConfigure,
  onClick,
}) => {
  const isLg = size === 'lg';

  return (
    <div
      className="relative flex flex-col items-center justify-center select-none p-0 m-0 touch-none w-full"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        aria-pressed={active}
        aria-label={config.label}
        onPointerDown={(e) => {
          if (editing) {
            e.preventDefault();
            onConfigure();
          } else {
            onPointerDown(e);
          }
        }}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerLeave}
        onClick={(e) => {
          if (!editing) onClick?.(e);
        }}
        className={`relative grid place-items-center outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer rounded-lg active:outline-none transition-transform w-full ${
          isLg ? 'h-20 sm:h-24' : 'h-16 sm:h-20'
        }`}
      >
        {/* Footswitch trapezoidal/triangular extenso cobrindo a largura da área */}
        <FootswitchSvg
          pressed={pressed}
          width="100%"
          height="100%"
        />

        {/* Ícone de configuração no modo de edição */}
        {editing && (
          <span className="absolute inset-0 grid place-items-center bg-black/50 rounded-lg z-30">
            <Settings2 className="w-5 h-5 text-amber-400 animate-spin-slow" />
          </span>
        )}
      </button>
    </div>
  );
};
