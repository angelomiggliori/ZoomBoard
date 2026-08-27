'use client'

import { Settings2 } from 'lucide-react'
import { LedRing } from '@/components/led-ring'
import type { SwitchConfig } from '@/lib/pedalboard'

interface FootSwitchProps {
  config: SwitchConfig
  active: boolean
  pressed: boolean
  flash: boolean
  editing: boolean
  size?: 'lg' | 'md'
  onTrigger: () => void
  onConfigure: () => void
}

export function FootSwitch({
  config,
  active,
  pressed,
  flash,
  editing,
  size = 'md',
  onTrigger,
  onConfigure,
}: FootSwitchProps) {
  const pad = size === 'lg' ? 'h-20 w-24 sm:h-24 sm:w-28' : 'h-[4.65rem] w-[5.25rem] sm:h-20 sm:w-24'
  const ledWidth = size === 'lg' ? 'w-16 sm:w-20' : 'w-14 sm:w-16'

  function handleActivate() {
    if (editing) onConfigure()
    else onTrigger()
  }

  return (
    <div className="flex w-full min-w-0 select-none flex-col items-center gap-1.5">
      <LedRing
        color={config.color}
        mode={config.ledMode}
        brightness={config.brightness}
        pulseSpeed={config.pulseSpeed}
        active={active}
        flash={flash}
        className={ledWidth}
      />

      <div
        className="preset-plaque relative flex min-h-9 w-full max-w-[9rem] flex-col items-center justify-center overflow-hidden px-2 py-1 text-center"
        style={{ '--plaque-color': config.color } as React.CSSProperties}
      >
        <span
          className="preset-plaque-text block max-w-full truncate font-display text-[0.72rem] font-semibold uppercase tracking-[0.11em] sm:text-[0.8rem]"
          style={active ? { color: config.color } : undefined}
        >
          {config.label}
        </span>
        <span className="mt-0.5 block max-w-full truncate font-display text-[0.48rem] uppercase tracking-[0.2em] text-muted-foreground/75">
          {config.sublabel}
        </span>
      </div>

      <button
        type="button"
        aria-pressed={active}
        aria-label={`${config.label} ${config.sublabel}`}
        onPointerDown={(e) => {
          e.preventDefault()
          handleActivate()
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={[
          pad,
          'footswitch-hex relative grid place-items-center outline-none transition-transform duration-75',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          pressed ? 'footswitch-hex-pressed translate-y-0.5 scale-[0.97]' : '',
        ].join(' ')}
      >
        <span className="footswitch-cap grid h-10 w-10 place-items-center sm:h-12 sm:w-12">
          {editing ? (
            <Settings2 className="h-4 w-4 text-primary" aria-hidden="true" />
          ) : (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: config.color, opacity: active ? 1 : 0.35 }}
            />
          )}
        </span>

        {config.key && (
          <span className="pointer-events-none absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-md border border-white/10 bg-panel px-1 font-mono text-[0.58rem] font-semibold uppercase text-muted-foreground shadow-lg">
            {keyLabel(config.key)}
          </span>
        )}
      </button>
    </div>
  )
}

function keyLabel(key: string) {
  const map: Record<string, string> = {
    ' ': '␣',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Enter: '⏎',
  }
  return map[key] ?? key.toUpperCase()
}
