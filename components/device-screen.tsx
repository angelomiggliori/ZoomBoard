'use client'

import { ChevronRight, Power } from 'lucide-react'
import { CATEGORY_META, type Patch } from '@/lib/pedalboard'

interface DeviceScreenProps {
  patch: Patch
  bpm: number | null
  selectedBlockId: string | null
  onSelectBlock: (id: string) => void
  onToggleBlock: (id: string) => void
}

export function DeviceScreen({
  patch,
  bpm,
  selectedBlockId,
  onSelectBlock,
  onToggleBlock,
}: DeviceScreenProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.12_0.008_260)] shadow-[inset_0_0_60px_oklch(0_0_0/60%),0_20px_50px_oklch(0_0_0/55%)]">
      {/* Barra de status da tela */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--neon)]" />
          <span className="font-display uppercase tracking-[0.2em]">Zoom G1On</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>{bpm ? `${bpm} BPM` : '-- BPM'}</span>
          <span className="text-white/20">|</span>
          <span>RIG VIEW</span>
        </div>
      </div>

      {/* Cabeçalho do patch */}
      <div className="flex items-end justify-between px-5 pt-4">
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Patch
          </div>
          <div className="flex items-baseline gap-3 truncate">
            <span className="font-display text-4xl font-700 leading-none text-primary sm:text-5xl">
              {patch.number}
            </span>
            <span className="truncate font-display text-2xl font-600 leading-none tracking-wide text-foreground sm:text-3xl">
              {patch.name}
            </span>
          </div>
        </div>
      </div>

      {/* Cadeia de sinal */}
      <div className="flex flex-1 items-center gap-1 overflow-x-auto px-4 pb-4 pt-4">
        <ChainNode label="IN" />
        {patch.chain.map((block, i) => {
          const meta = CATEGORY_META[block.category]
          const selected = block.id === selectedBlockId
          return (
            <div key={block.id} className="flex items-center">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => onSelectBlock(block.id)}
                onDoubleClick={() => onToggleBlock(block.id)}
                onContextMenu={(e) => e.preventDefault()}
                className={[
                  'group relative flex h-24 w-[4.7rem] shrink-0 flex-col justify-between rounded-xl border p-2 text-left transition-all sm:w-20',
                  selected
                    ? 'border-white/40 bg-white/5'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25',
                  block.on ? 'opacity-100' : 'opacity-45',
                ].join(' ')}
                style={
                  selected
                    ? { boxShadow: `0 0 0 1px ${meta.hex}, 0 0 18px ${meta.hex}55` }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: meta.hex,
                      boxShadow: block.on ? `0 0 8px ${meta.hex}` : 'none',
                      opacity: block.on ? 1 : 0.4,
                    }}
                  />
                  <Power
                    className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div
                    className="font-display text-[0.6rem] uppercase tracking-widest"
                    style={{ color: meta.hex }}
                  >
                    {meta.label}
                  </div>
                  <div className="truncate font-display text-sm font-600 text-foreground">
                    {block.name}
                  </div>
                </div>
              </button>
              {i < patch.chain.length - 1 && (
                <ChevronRight
                  className="mx-0.5 h-4 w-4 shrink-0 text-white/20"
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
        <ChainNode label="OUT" />
      </div>

      {/* Rodapé: dica */}
      <div className="border-t border-white/5 px-4 py-2 text-center font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
        Toque para selecionar · toque duplo para ligar/desligar
      </div>
    </div>
  )
}

function ChainNode({ label }: { label: string }) {
  return (
    <div className="mx-1 flex h-24 shrink-0 flex-col items-center justify-center gap-1">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/5 font-mono text-[0.55rem] tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  )
}
