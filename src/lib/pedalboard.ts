// Modelo de dados da GUI. A camada de MIDI/SysEx (Zoom G1On) é responsabilidade
// separada; aqui ficam apenas os tipos e defaults visuais/interativos.

export type LedMode = 'active' | 'solid' | 'pulse' | 'blink' | 'off';

export type SwitchRole = 'preset' | 'bankSelect' | 'tapTuner';

export interface SwitchConfig {
  id: string;
  /** Nome exibido entre o LED e o footswitch (ex.: nome do preset). */
  label: string;
  /** Linha secundária pequena (ex.: função / número). */
  sublabel: string;
  /** Tecla física do teclado que aciona este switch (e.key), ou null. */
  key: string | null;
  /** Cor do LED em hex. */
  color: string;
  ledMode: LedMode;
  /** 0–100 */
  brightness: number;
  /** Duração de um ciclo de pulso/blink em ms. */
  pulseSpeed: number;
  role: SwitchRole;
}

export type SlotId =
  | 'left'
  | 'right'
  | 'a1'
  | 'a2'
  | 'a3'
  | 'a4'
  | 'a5'
  | 'b1'
  | 'b2'
  | 'b3'
  | 'b4'
  | 'b5';

export const LED_MODE_LABELS: Record<LedMode, string> = {
  active: 'Ativo (acende quando selecionado)',
  solid: 'Fixo (sempre aceso)',
  pulse: 'Pulsação (respiração)',
  blink: 'Piscar',
  off: 'Apagado',
};

/** Paleta neon sugerida para os LEDs. */
export const LED_PALETTE: { name: string; hex: string }[] = [
  { name: 'Ciano', hex: '#22e0d6' },
  { name: 'Verde', hex: '#39e66a' },
  { name: 'Âmbar', hex: '#ffb020' },
  { name: 'Laranja', hex: '#ff6a2c' },
  { name: 'Vermelho', hex: '#ff3b4e' },
  { name: 'Rosa', hex: '#ff4fd8' },
  { name: 'Violeta', hex: '#9b6bff' },
  { name: 'Azul', hex: '#3b8cff' },
  { name: 'Branco', hex: '#eaf6ff' },
];

export const DEFAULT_SWITCHES: SwitchConfig[] = [
  // Laterais da tela
  {
    id: 'left',
    label: 'BANK',
    sublabel: 'Bancos',
    key: 'a',
    color: '#3b8cff',
    ledMode: 'solid',
    brightness: 70,
    pulseSpeed: 1600,
    role: 'bankSelect',
  },
  {
    id: 'right',
    label: 'TAP / TUNER',
    sublabel: 'Tempo · Afinador',
    key: 'd',
    color: '#ffb020',
    ledMode: 'blink',
    brightness: 80,
    pulseSpeed: 600,
    role: 'tapTuner',
  },
  // Fileira superior (A) — presets 1–5
  mkPreset('a1', 'CLEAN', '01', '#22e0d6', '1'),
  mkPreset('a2', 'CRUNCH', '02', '#39e66a', '2'),
  mkPreset('a3', 'LEAD', '03', '#ffb020', '3'),
  mkPreset('a4', 'FUZZ', '04', '#ff6a2c', '4'),
  mkPreset('a5', 'AMBIENT', '05', '#9b6bff', '5'),
  // Fileira inferior (B) — presets 6–10
  mkPreset('b1', 'FUNK', '06', '#ff4fd8', 'z'),
  mkPreset('b2', 'BLUES', '07', '#3b8cff', 'x'),
  mkPreset('b3', 'METAL', '08', '#ff3b4e', 'c'),
  mkPreset('b4', 'DELAYSOLO', '09', '#22e0d6', 'v'),
  mkPreset('b5', 'SHIMMER', '10', '#eaf6ff', 'b'),
];

export function mkPreset(
  id: string,
  label: string,
  sublabel: string,
  color: string,
  key: string,
): SwitchConfig {
  return {
    id,
    label,
    sublabel,
    key,
    color,
    ledMode: 'active',
    brightness: 100,
    pulseSpeed: 1600,
    role: 'preset',
  };
}

// ---- Cadeia de sinal (visual da "tela touch") ----

export type EffectCategory =
  | 'comp'
  | 'drive'
  | 'amp'
  | 'eq'
  | 'mod'
  | 'delay'
  | 'reverb'
  | 'pedal';

export const CATEGORY_META: Record<
  EffectCategory,
  { label: string; hex: string }
> = {
  pedal: { label: 'Pedal', hex: '#ff4fd8' },
  comp: { label: 'Dynamics', hex: '#39e66a' },
  drive: { label: 'Drive', hex: '#ff6a2c' },
  amp: { label: 'Amp', hex: '#ff3b4e' },
  eq: { label: 'EQ', hex: '#3b8cff' },
  mod: { label: 'Mod', hex: '#9b6bff' },
  delay: { label: 'Delay', hex: '#22e0d6' },
  reverb: { label: 'Reverb', hex: '#5bd0ff' },
};

export interface EffectBlock {
  id: string;
  name: string;
  category: EffectCategory;
  on: boolean;
}

export interface Patch {
  number: string;
  name: string;
  chain: EffectBlock[];
}

/** Patches de exemplo (a camada MIDI substitui por dados reais da pedaleira). */
export const DEMO_PATCHES: Record<string, Patch> = {
  a1: {
    number: '01',
    name: 'CLEAN',
    chain: [
      { id: 'c', name: 'CompC', category: 'comp', on: true },
      { id: 'e', name: 'GraphicEQ', category: 'eq', on: true },
      { id: 'm', name: 'Chorus', category: 'mod', on: false },
      { id: 'd', name: 'AnalogDly', category: 'delay', on: true },
      { id: 'r', name: 'Room', category: 'reverb', on: true },
    ],
  },
  a2: {
    number: '02',
    name: 'CRUNCH',
    chain: [
      { id: 'p', name: 'CryBaby', category: 'pedal', on: false },
      { id: 'o', name: 'OverDrive', category: 'drive', on: true },
      { id: 'a', name: 'FD Combo', category: 'amp', on: true },
      { id: 'd', name: 'TapeEcho', category: 'delay', on: true },
      { id: 'r', name: 'Hall', category: 'reverb', on: true },
    ],
  },
  a3: {
    number: '03',
    name: 'LEAD',
    chain: [
      { id: 'o', name: 'TS808', category: 'drive', on: true },
      { id: 'a', name: 'MS 800', category: 'amp', on: true },
      { id: 'e', name: 'ParaEQ', category: 'eq', on: true },
      { id: 'd', name: 'PingPong', category: 'delay', on: true },
      { id: 'r', name: 'Plate', category: 'reverb', on: true },
    ],
  },
  a4: {
    number: '04',
    name: 'FUZZ',
    chain: [
      { id: 'f', name: 'BigMuff', category: 'drive', on: true },
      { id: 'a', name: 'HW 100', category: 'amp', on: true },
      { id: 'm', name: 'Octaver', category: 'mod', on: true },
      { id: 'd', name: 'SlapBack', category: 'delay', on: false },
      { id: 'r', name: 'Spring', category: 'reverb', on: true },
    ],
  },
  a5: {
    number: '05',
    name: 'AMBIENT',
    chain: [
      { id: 'c', name: 'CompC', category: 'comp', on: true },
      { id: 'm', name: 'Chorus', category: 'mod', on: true },
      { id: 'd', name: 'ReverseDl', category: 'delay', on: true },
      { id: 'r', name: 'Shimmer', category: 'reverb', on: true },
      { id: 'e', name: 'ParaEQ', category: 'eq', on: false },
    ],
  },
  b1: {
    number: '06',
    name: 'FUNK',
    chain: [
      { id: 'p', name: 'AutoWah', category: 'pedal', on: true },
      { id: 'c', name: 'RackComp', category: 'comp', on: true },
      { id: 'a', name: 'DeluxeR', category: 'amp', on: true },
      { id: 'm', name: 'Phaser', category: 'mod', on: false },
      { id: 'r', name: 'Room', category: 'reverb', on: true },
    ],
  },
  b2: {
    number: '07',
    name: 'BLUES',
    chain: [
      { id: 'o', name: 'BluesDrv', category: 'drive', on: true },
      { id: 'a', name: 'TW Rock', category: 'amp', on: true },
      { id: 'e', name: 'GraphicEQ', category: 'eq', on: true },
      { id: 'd', name: 'AnalogDly', category: 'delay', on: true },
      { id: 'r', name: 'Spring', category: 'reverb', on: true },
    ],
  },
  b3: {
    number: '08',
    name: 'METAL',
    chain: [
      { id: 'o', name: 'MetalWrld', category: 'drive', on: true },
      { id: 'a', name: 'MS 800', category: 'amp', on: true },
      { id: 'e', name: 'ParaEQ', category: 'eq', on: true },
      { id: 'n', name: 'NoiseGate', category: 'comp', on: true },
      { id: 'r', name: 'Room', category: 'reverb', on: false },
    ],
  },
  b4: {
    number: '09',
    name: 'DELAYSOLO',
    chain: [
      { id: 'o', name: 'TS808', category: 'drive', on: true },
      { id: 'a', name: 'MS 800', category: 'amp', on: true },
      { id: 'd', name: 'PingPong', category: 'delay', on: true },
      { id: 'd2', name: 'TapeEcho', category: 'delay', on: true },
      { id: 'r', name: 'Hall', category: 'reverb', on: true },
    ],
  },
  b5: {
    number: '10',
    name: 'SHIMMER',
    chain: [
      { id: 'm', name: 'Chorus', category: 'mod', on: true },
      { id: 'p', name: 'PitchSft', category: 'mod', on: true },
      { id: 'd', name: 'ReverseDl', category: 'delay', on: true },
      { id: 'r', name: 'Shimmer', category: 'reverb', on: true },
      { id: 'r2', name: 'Hall', category: 'reverb', on: true },
    ],
  },
};
