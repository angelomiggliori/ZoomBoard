'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TopBar } from '@/components/top-bar'
import { FootSwitch } from '@/components/foot-switch'
import { DeviceScreen } from '@/components/device-screen'
import { SwitchConfigDialog } from '@/components/switch-config-dialog'
import {
  DEFAULT_SWITCHES,
  DEMO_PATCHES,
  type Patch,
  type SwitchConfig,
} from '@/lib/pedalboard'

const PRESET_ORDER = ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5']

export function Pedalboard() {
  const [switches, setSwitches] = useState<SwitchConfig[]>(DEFAULT_SWITCHES)
  const [hydrated, setHydrated] = useState(false)
  const [activePreset, setActivePreset] = useState('a1')
  const [editing, setEditing] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  const [pressed, setPressed] = useState<Set<string>>(new Set())
  const [flashing, setFlashing] = useState<Set<string>>(new Set())

  const [patches, setPatches] = useState<Record<string, Patch>>(DEMO_PATCHES)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const STORAGE_KEY = 'zoomboard:switch-config:v1'

  // Carrega apenas no cliente para evitar mismatch de hidratação do Next.js.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as SwitchConfig[]
        if (Array.isArray(saved) && saved.length === DEFAULT_SWITCHES.length) {
          const validIds = new Set(DEFAULT_SWITCHES.map((s) => s.id))
          if (saved.every((s) => s && validIds.has(s.id))) setSwitches(saved)
        }
      }
    } catch {
      // Preferir defaults a quebrar a interface por uma entrada inválida.
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(switches))
    } catch {
      // localStorage pode estar indisponível em navegação privada/restrita.
    }
  }, [switches, hydrated])

  const byId = useMemo(() => {
    const m: Record<string, SwitchConfig> = {}
    for (const s of switches) m[s.id] = s
    return m
  }, [switches])

  const takenKeys = useMemo(() => {
    const m: Record<string, string> = {}
    for (const s of switches) if (s.key) m[s.key] = s.id
    return m
  }, [switches])

  // ---- Ações ----

  const pulsePressed = useCallback((id: string) => {
    setPressed((p) => new Set(p).add(id))
    clearTimeout(timeouts.current[`p-${id}`])
    timeouts.current[`p-${id}`] = setTimeout(() => {
      setPressed((p) => {
        const n = new Set(p)
        n.delete(id)
        return n
      })
    }, 150)
  }, [])

  const flash = useCallback((id: string) => {
    setFlashing((f) => new Set(f).add(id))
    clearTimeout(timeouts.current[`f-${id}`])
    timeouts.current[`f-${id}`] = setTimeout(() => {
      setFlashing((f) => {
        const n = new Set(f)
        n.delete(id)
        return n
      })
    }, 280)
  }, [])

  const triggerSwitch = useCallback(
    (id: string) => {
      const cfg = byId[id]
      if (!cfg) return
      pulsePressed(id)

      if (cfg.role === 'preset') {
        setActivePreset(id)
        setSelectedBlockId(null)
      } else if (id === 'left' || id === 'right') {
        // BANK ▾ / ▴ — navega entre presets
        flash(id)
        setActivePreset((cur) => {
          const idx = PRESET_ORDER.indexOf(cur)
          const base = idx === -1 ? 0 : idx
          const next =
            id === 'right'
              ? (base + 1) % PRESET_ORDER.length
              : (base - 1 + PRESET_ORDER.length) % PRESET_ORDER.length
          return PRESET_ORDER[next]
        })
        setSelectedBlockId(null)
      } else {
        flash(id)
      }
    },
    [byId, pulsePressed, flash],
  )

  // ---- Proteção contra menu de contexto (right-click / long-press) ----
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [])

  // ---- Teclado físico configurável ----
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (editing || configId) return
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      const id = takenKeys[e.key]
      if (id) {
        e.preventDefault()
        triggerSwitch(id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [takenKeys, editing, configId, triggerSwitch])

  useEffect(() => {
    const t = timeouts.current
    return () => {
      for (const k in t) clearTimeout(t[k])
    }
  }, [])

  function saveConfig(next: SwitchConfig) {
    setSwitches((list) =>
      list.map((s) => {
        // Evita duplicidade de tecla: remove de quem já a usava
        if (next.key && s.id !== next.id && s.key === next.key) {
          return { ...s, key: null }
        }
        return s.id === next.id ? next : s
      }),
    )
    setConfigId(null)
  }

  function toggleBlock(blockId: string) {
    setPatches((all) => {
      const patch = all[activePreset]
      if (!patch) return all
      return {
        ...all,
        [activePreset]: {
          ...patch,
          chain: patch.chain.map((b) =>
            b.id === blockId ? { ...b, on: !b.on } : b,
          ),
        },
      }
    })
  }

  const patch = patches[activePreset] ?? Object.values(patches)[0]
  const left = byId.left
  const right = byId.right
  const rowA = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => byId[id])
  const rowB = ['b1', 'b2', 'b3', 'b4', 'b5'].map((id) => byId[id])

  function renderFoot(cfg: SwitchConfig, size: 'lg' | 'md' = 'md') {
    return (
      <FootSwitch
        key={cfg.id}
        config={cfg}
        active={cfg.role === 'preset' && activePreset === cfg.id}
        pressed={pressed.has(cfg.id)}
        flash={flashing.has(cfg.id)}
        editing={editing}
        size={size}
        onTrigger={() => triggerSwitch(cfg.id)}
        onConfigure={() => setConfigId(cfg.id)}
      />
    )
  }

  return (
    <main className="device-surface graphite-bg min-h-screen w-full overflow-x-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-3 py-4 sm:px-6 sm:py-6">
        <TopBar
          editing={editing}
          onToggleEditing={() => setEditing((e) => !e)}
          midiConnected={false}
        />

        {/* Chassi do device */}
        <div className="switch-chassis flex flex-1 flex-col gap-6 rounded-3xl border p-4 sm:gap-8 sm:p-8">
          {/* Fileira central: no mobile a tela fica em cima e os foots laterais
              numa linha abaixo; no desktop vira foot | tela | foot. */}
          <div className="flex flex-1 flex-col items-stretch justify-center gap-5 sm:flex-row sm:items-center sm:gap-8">
            <div className="order-1 flex h-[300px] max-h-[360px] min-h-[240px] min-w-0 flex-1 sm:order-2 sm:h-full sm:max-h-[420px] sm:min-h-[260px]">
              <DeviceScreen
                patch={patch}
                bpm={null}
                selectedBlockId={selectedBlockId}
                onSelectBlock={setSelectedBlockId}
                onToggleBlock={toggleBlock}
              />
            </div>

            <div className="order-2 flex justify-around gap-6 sm:contents">
              {left && <div className="sm:order-1">{renderFoot(left, 'lg')}</div>}
              {right && <div className="sm:order-3">{renderFoot(right, 'lg')}</div>}
            </div>
          </div>

          {/* Duas fileiras de 5 footswitches */}
          <div className="flex flex-col gap-5 sm:gap-6">
            <div className="grid grid-cols-5 justify-items-center gap-2 sm:gap-4">
              {rowA.map((c) => c && renderFoot(c))}
            </div>
            <div className="grid grid-cols-5 justify-items-center gap-2 sm:gap-4">
              {rowB.map((c) => c && renderFoot(c))}
            </div>
          </div>
        </div>

        {/* Rodapé com dica de modo */}
        <p className="text-center font-display text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {editing
            ? 'Modo configuração — toque num switch para editar LED, cor e tecla'
            : 'Modo tocar — clique, toque ou use o teclado mapeado'}
        </p>
      </div>

      {configId && byId[configId] && (
        <SwitchConfigDialog
          config={byId[configId]}
          takenKeys={takenKeys}
          onClose={() => setConfigId(null)}
          onSave={saveConfig}
        />
      )}
    </main>
  )
}
