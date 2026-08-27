'use client'

import { Piano, Settings2, Play } from 'lucide-react'

interface TopBarProps {
  editing: boolean
  onToggleEditing: () => void
  midiConnected: boolean
}

export function TopBar({ editing, onToggleEditing, midiConnected }: TopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <Piano className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <div className="font-display text-base font-700 tracking-wide">
            ZoomBoard
          </div>
          <div className="font-display text-[0.6rem] uppercase tracking-[0.25em] text-muted-foreground">
            WebMIDI · G1On
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Status MIDI — a camada MIDI/SysEx alimenta este estado */}
        <span
          className="flex items-center gap-2 rounded-full border border-white/10 bg-panel px-3 py-1.5 text-xs"
          title="Status da conexão MIDI (gerenciado pela camada MIDI)"
        >
          <span
            className={[
              'h-2 w-2 rounded-full',
              midiConnected
                ? 'bg-primary shadow-[0_0_8px_var(--neon)]'
                : 'bg-muted-foreground/50',
            ].join(' ')}
          />
          <span className="hidden font-display uppercase tracking-widest text-muted-foreground sm:inline">
            {midiConnected ? 'Conectado' : 'Sem MIDI'}
          </span>
        </span>

        {/* Toggle Tocar / Configurar */}
        <button
          type="button"
          onClick={onToggleEditing}
          aria-pressed={editing}
          className={[
            'flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-600 transition-colors',
            editing
              ? 'bg-primary text-primary-foreground'
              : 'border border-white/10 bg-panel text-foreground hover:bg-white/5',
          ].join(' ')}
        >
          {editing ? (
            <>
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Configurando</span>
              <span className="sm:hidden">Config</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              <span>Tocar</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}
