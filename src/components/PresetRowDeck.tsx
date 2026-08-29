import React from 'react';
import { Settings2 } from 'lucide-react';
import { LedBar } from './LedBar';
import { FootSwitchButton } from './FootSwitchButton';
import type { SwitchConfig } from '../types';

interface PresetRowDeckProps {
  switches: SwitchConfig[];
  activePreset: string;
  pressedKeys: Set<string>;
  flashingKeys: Set<string>;
  editing: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerUp: (id: string, e: React.PointerEvent) => void;
  onPointerLeave: (id: string, e: React.PointerEvent) => void;
  onConfigure: (id: string) => void;
}

/**
 * Deck de Preset com Footswitches Coladinhos na Barra:
 * - 1. LEDS PILL com glow intenso acima da barra.
 * - 2. UMA ÚNICA BARRA CONTÍNUA DE PONTA A PONTA (100% estática, sem divisores, sem highlight de fundo).
 * - 3. FOOTSWITCHES BEM COLADINHOS na barra com afastamento mínimo, preenchendo a largura de cada coluna.
 */
export const PresetRowDeck: React.FC<PresetRowDeckProps> = ({
  switches,
  activePreset,
  pressedKeys,
  flashingKeys,
  editing,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onConfigure,
}) => {
  return (
    <div className="w-full flex flex-col gap-1 sm:gap-1.5">
      {/* 1. LEDS PILL COM EXTENSÃO AMPLA E GLOW INTENSO */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 justify-items-center w-full px-1">
        {switches.map((cfg) => {
          const isActive = cfg.role === 'preset' && activePreset === cfg.id;
          const isFlashing = flashingKeys.has(cfg.id);

          return (
            <div key={`led-slot-${cfg.id}`} className="w-full max-w-[130px] sm:max-w-[150px] flex justify-center">
              <LedBar
                color={cfg.color}
                mode={cfg.ledMode}
                brightness={cfg.brightness}
                pulseSpeed={cfg.pulseSpeed}
                active={isActive}
                flash={isFlashing}
              />
            </div>
          );
        })}
      </div>

      {/* 2. UMA ÚNICA BARRA CONTÍNUA INTEIRIÇA DE GRAFITE / CARBONO ESCURO (100% ESTÁTICA) */}
      <div className="carbon-dark-continuous-strip w-full">
        {switches.map((cfg) => {
          const isActive = cfg.role === 'preset' && activePreset === cfg.id;

          return (
            <div
              key={`name-cell-${cfg.id}`}
              onClick={() => {
                if (editing) onConfigure(cfg.id);
              }}
              className={`carbon-dark-cell ${
                editing ? 'hover:bg-amber-500/15 ring-1 ring-amber-400/50' : ''
              }`}
            >
              {/* Nome do preset na fonte Chakra Petch - sem divisores e sem fundo colorido */}
              <span
                className={`patch-name-display ${
                  isActive ? 'patch-name-display-active' : ''
                }`}
              >
                {cfg.label}
              </span>

              {/* Indicador no modo de edição */}
              {editing && (
                <span className="absolute top-1 right-1 bg-amber-500 text-black rounded-full p-0.5 shadow-sm">
                  <Settings2 className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. FILEIRA DE FOOTSWITCHES LARGOS BEM COLADINHOS NA BARRA */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 md:gap-4 justify-items-center w-full mt-0">
        {switches.map((cfg) => {
          const isActive = cfg.role === 'preset' && activePreset === cfg.id;
          const isPressed = pressedKeys.has(cfg.id);

          return (
            <div key={`fs-wrap-${cfg.id}`} className="flex justify-center w-full px-0.5">
              <FootSwitchButton
                config={cfg}
                active={isActive}
                pressed={isPressed}
                editing={editing}
                size="md"
                onPointerDown={(e) => onPointerDown(cfg.id, e)}
                onPointerUp={(e) => onPointerUp(cfg.id, e)}
                onPointerLeave={(e) => onPointerLeave(cfg.id, e)}
                onConfigure={() => onConfigure(cfg.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
