// Motor de Tap Tempo e fórmulas de tempo/rate da Zoom G1on / G1Xon
// Portado do motor em C++ (tap_engine.cpp) da controladora física RP2040

export const TAP_HISTORY_SIZE = 4; // média móvel de 4 intervalos
export const TAP_MAX_GAP_MS = 2000; // gap maior que 2s = nova sequência iniciada
export const TAP_MIN_GAP_MS = 60; // gap menor que 60ms = bounce descartado

export interface TapResult {
  bpm: number;
  ms: number;
}

export class TapEngine {
  private lastTapMs = 0;
  private intervals: number[] = [];

  /**
   * Registra um clique no pedal de tap tempo.
   * Retorna { bpm, ms } calculados ou null se for o 1º toque ou timeout.
   */
  public registerTap(nowMs = performance.now()): TapResult | null {
    if (this.lastTapMs === 0) {
      this.lastTapMs = nowMs;
      return null;
    }

    const gap = nowMs - this.lastTapMs;
    this.lastTapMs = nowMs;

    if (gap > TAP_MAX_GAP_MS || gap < TAP_MIN_GAP_MS) {
      this.intervals = [];
      return null;
    }

    this.intervals.push(gap);
    if (this.intervals.length > TAP_HISTORY_SIZE) {
      this.intervals.shift();
    }

    const avg = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
    const bpm = Math.min(300, Math.max(30, Math.round(60000 / avg)));
    const ms = Math.round(avg);

    return { bpm, ms };
  }

  public reset(): void {
    this.lastTapMs = 0;
    this.intervals = [];
  }
}

// =========================================================================
// Fórmulas matemáticas de codificação e decodificação testadas no hardware
// =========================================================================

/** Família A: Phaser (plus1=true, range 1-50), CoronaTri (plus1=false, range 0-100) */
export function decodeFamilyA(fino: number, bitA: number, bitB: number, plus1 = false): number {
  return 4 * fino + 2 * bitA + bitB + (plus1 ? 1 : 0);
}

export function encodeFamilyA(value: number, plus1 = false): { fino: number; bitA: number; bitB: number } {
  const v = Math.max(0, value - (plus1 ? 1 : 0));
  const fino = Math.floor(v / 4);
  const rem = v % 4;
  return { fino, bitA: (rem >> 1) & 1, bitB: rem & 1 };
}

/** Família B: StereoCho, Tremolo, Flanger (esquema invertido fino/8 + bits grossos) */
export function decodeFamilyB(fino: number, bitA: number, bitB: number): number {
  return Math.floor(fino / 8) + 16 * bitA + 32 * bitB;
}

export function encodeFamilyB(value: number): { fino: number; bitA: number; bitB: number } {
  const coarse = Math.floor(value / 16);
  return {
    fino: (value % 16) * 8,
    bitA: coarse & 1,
    bitB: (coarse >> 1) & 1,
  };
}

/** Delays de range largo (Delay, TapeEcho, ReverseDL, StereoDly L: 100-4000ms) */
export function decodeWideDelay(b0: number, b1: number, b2: number, baseline0: number, C: number): number {
  const bitFlag = Math.floor((b0 - baseline0) / 4) & 1;
  const coarse = b2 - 0x10;
  const K = coarse * 2 + bitFlag;
  const v = K * 128 + b1;
  return (v + C) * 4;
}

export function encodeWideDelay(
  ms: number,
  baseline0: number,
  C: number
): { b0: number; b1: number; b2: number } {
  let v = Math.floor(ms / 4) - C;
  if (v < 0) v = 0;
  const K = Math.floor(v / 128);
  return {
    b1: v % 128,
    b0: baseline0 + 4 * (K % 2),
    b2: 0x10 + Math.floor(K / 2),
  };
}

/** Delays de range curto sem carry (CarbonDly) */
export function decodeShortDelay(b0: number, b1: number, baseline0: number, C: number, step = 4): number {
  const bitFlag = Math.floor((b0 - baseline0) / 4) & 1;
  const v = bitFlag * 128 + b1;
  return (v + C) * step;
}

/** StereoDly TimeR (passo 32, sem carry) */
export function decodeStereoDlyR(b1: number): number {
  return (b1 + 1) * 32;
}

export function encodeStereoDlyR(R: number): number {
  return Math.max(0, Math.floor(R / 32) - 1);
}
