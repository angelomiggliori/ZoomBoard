import React from 'react';
import type { LedMode } from '../types';
import { cn } from '../lib/utils';

interface LedBarProps {
  color: string;
  mode?: LedMode;
  brightness?: number;
  pulseSpeed?: number;
  active?: boolean;
  flash?: boolean;
  className?: string;
}

/**
 * LED Pill com extensão ampla (ocupando a largura correspondente ao botão),
 * posicionado FORA e ACIMA da barra de nomes.
 */
export const LedBar: React.FC<LedBarProps> = ({
  color,
  mode = 'solid',
  brightness = 1,
  pulseSpeed = 1600,
  active = false,
  flash = false,
  className,
}) => {
  let modeClass = 'led-pill-off';
  if (flash) {
    modeClass = 'led-pill-flash';
  } else if (active) {
    if (mode === 'pulse') modeClass = 'led-pill-pulse';
    else if (mode === 'blink') modeClass = 'led-pill-blink';
    else modeClass = 'led-pill-on';
  } else {
    modeClass = 'led-pill-dim';
  }

  return (
    <div className={cn('w-full flex items-center justify-center px-1 py-0.5', className)}>
      <span
        className={`led-pill-wide ${modeClass}`}
        style={
          {
            '--led-color': color,
            '--led-bright': brightness,
            '--pulse-speed': `${pulseSpeed}ms`,
          } as React.CSSProperties
        }
      />
    </div>
  );
};
