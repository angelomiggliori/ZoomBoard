'use client'

import { useEffect, useState } from 'react'
import { Check, Keyboard, X } from 'lucide-react'
import { LedRing } from '@/components/led-ring'
import {
  LED_MODE_LABELS,
  LED_PALETTE,
  type LedMode,
  type SwitchConfig,
} from '@/lib/pedalboard'

interface SwitchConfigDialogProps {
  config: SwitchConfig
  takenKeys: Record<string, string> // key -> switchId
  onClose: () => void
  onSave: (next: SwitchConfig) => void
}

const MODES: LedMode[] = ['active', 'solid', 'pulse', 'blink', 'off']

export function SwitchConfigDialog({
  config,
  takenKeys,
  onClose,
  onSave,
}: SwitchConfigDialogProps) {
  const [draft, setDraft] = useState<SwitchConfig>(config)
  const [capturing, setCapturing] = useState(false)

  // Fecha com ESC (quando não está capturando tecla)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (capturing) {
        e.preventDefault()
        if (e.key === 'Escape') {
          setCapturing(false)
          return
        }
        setDraft((d) => ({ ...d, key: e.key }))
        setCapturing(false)
        return
      }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [capturing, onClose])

  const keyConflict =
    draft.key && takenKeys[draft.key] && takenKeys[draft.key] !== config.id

  function set<K extends keyof SwitchConfig>(k: K, v: SwitchConfig[K]) {
    setDraft((d) => ({ ...d, [k]: v }))
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onPointerDown={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Configurar ${config.label}`}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <LedRing
              color={draft.color}
              mode={draft.ledMode === 'off' ? 'solid' : draft.ledMode}
              brightness={draft.brightness}
              pulseSpeed={draft.pulseSpeed}
              active
              className="h-4 w-4"
            />
            <h2 className="font-display text-lg font-600 tracking-wide">
              Configurar switch
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          {/* Nome + sublabel */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome do preset">
              <input
                value={draft.label}
                onChange={(e) => set('label', e.target.value)}
                maxLength={12}
                className="w-full rounded-lg border border-white/10 bg-panel px-3 py-2 font-display text-sm tracking-wide outline-none focus:border-primary"
              />
            </Field>
            <Field label="Legenda">
              <input
                value={draft.sublabel}
                onChange={(e) => set('sublabel', e.target.value)}
                maxLength={16}
                className="w-full rounded-lg border border-white/10 bg-panel px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Field>
          </div>

          {/* Tecla do teclado */}
          <Field label="Tecla do teclado">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCapturing(true)}
                className={[
                  'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                  capturing
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/10 bg-panel hover:border-white/25',
                ].join(' ')}
              >
                <Keyboard className="h-4 w-4" />
                {capturing
                  ? 'Pressione uma tecla…'
                  : draft.key
                    ? `Tecla: ${draft.key === ' ' ? 'Espaço' : draft.key.toUpperCase()}`
                    : 'Nenhuma — clique para atribuir'}
              </button>
              {draft.key && (
                <button
                  type="button"
                  onClick={() => set('key', null)}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs text-muted-foreground hover:bg-white/5"
                >
                  Limpar
                </button>
              )}
            </div>
            {keyConflict && (
              <p className="mt-1.5 text-xs text-destructive">
                Essa tecla já está em uso por outro switch. Salvar vai
                reatribuí-la.
              </p>
            )}
          </Field>

          {/* Cor do LED */}
          <Field label="Cor do LED">
            <div className="flex flex-wrap items-center gap-2">
              {LED_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  aria-label={c.name}
                  onClick={() => set('color', c.hex)}
                  className={[
                    'h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform',
                    draft.color.toLowerCase() === c.hex.toLowerCase()
                      ? 'scale-110 ring-white/80'
                      : 'ring-transparent hover:scale-105',
                  ].join(' ')}
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: `0 0 10px ${c.hex}80`,
                  }}
                />
              ))}
              <label className="ml-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full border border-dashed border-white/25 text-xs text-muted-foreground">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => set('color', e.target.value)}
                  className="sr-only"
                />
                +
              </label>
            </div>
          </Field>

          {/* Modo de LED */}
          <Field label="Modo do LED">
            <div className="grid grid-cols-1 gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set('ledMode', m)}
                  className={[
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    draft.ledMode === m
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-white/10 bg-panel hover:border-white/25',
                  ].join(' ')}
                >
                  <span>{LED_MODE_LABELS[m]}</span>
                  {draft.ledMode === m && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </Field>

          {/* Brilho */}
          <Field label={`Brilho — ${draft.brightness}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.brightness}
              onChange={(e) => set('brightness', Number(e.target.value))}
              className="w-full accent-[var(--neon)]"
            />
          </Field>

          {/* Velocidade de pulso (só relevante em pulse/blink) */}
          {(draft.ledMode === 'pulse' || draft.ledMode === 'blink') && (
            <Field
              label={`Velocidade — ${(draft.pulseSpeed / 1000).toFixed(2)}s por ciclo`}
            >
              <input
                type="range"
                min={200}
                max={3000}
                step={50}
                value={draft.pulseSpeed}
                onChange={(e) => set('pulseSpeed', Number(e.target.value))}
                className="w-full accent-[var(--neon)]"
              />
            </Field>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-600 text-primary-foreground hover:opacity-90"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 font-display text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  )
}
