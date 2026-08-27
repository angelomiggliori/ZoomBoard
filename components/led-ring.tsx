'use client'

import type { CSSProperties } from 'react'
import type { LedMode } from '@/lib/pedalboard'

interface LedRingProps {
  color: string
  mode: LedMode
  brightness: number
  pulseSpeed: number
  active: boolean
  flash?: boolean
  className?: string
}

/** Barra LED horizontal inspirada em pedaleiras de palco. */
export function LedRing({
  color,
  mode,
  brightness,
  pulseSpeed,
  active,
  flash,
  className,
}: LedRingProps) {
  const bright = Math.max(0, Math.min(100, brightness)) / 100
  const style = {
    '--led-color': color,
    '--led-bright': bright,
    '--pulse-speed': `${pulseSpeed}ms`,
  } as CSSProperties

  let stateClass = 'led-off'
  if (flash) stateClass = 'led-flash'
  else if (mode === 'off') stateClass = 'led-off'
  else if (mode === 'pulse') stateClass = 'led-pulse'
  else if (mode === 'blink') stateClass = 'led-blink'
  else if (mode === 'solid') stateClass = 'led-on'
  else stateClass = active ? 'led-on' : 'led-dim'

  return <span aria-hidden="true" style={style} className={`led-bar ${stateClass} ${className ?? ''}`} />
}
