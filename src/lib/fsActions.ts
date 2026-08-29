// =============================================================================
// fsActions.ts - Tabela de Ações e Executor dos Footswitches
// Portado diretamente de fs_actions.h / fs_actions.cpp / fs_actions_data.cpp
// =============================================================================

export enum ZoomActionType {
  ACTION_NONE = 0, // Slot vazio
  ACTION_PATCH = 1, // Troca direta de patch: a=bank(0..9) b=preset(0..9)
  ACTION_CC = 2, // Control Change cru: a=cc(0..127) b=value(0..127)
  ACTION_BYPASS = 3, // Liga/Desliga slot: a=slot(0..4) b=on(0|1)
  ACTION_PARAM = 4, // Edição em tempo real: a=slot(0..4) b=param_id c=value
  ACTION_TAP = 5, // Pulso de Tap Tempo (CC#64 ou motor de tap)
  ACTION_TUNER_TOGGLE = 6, // Alterna afinador (CC#81)
}

export interface ZoomAction {
  type: ZoomActionType;
  a: number;
  b: number;
  c: number;
}

export const FS_ACTIONS_PER_PRESS = 5;
export const FS_PARITY_COUNT = 2; // 0 = Par / 1º toque, 1 = Ímpar / 2º toque
export const NUM_BANKS_TOTAL = 10; // Bancos A..J (0..9)
export const FS_COUNT = 5; // FS1..FS5 (0..4)

// Cria a tabela padrão FS_ACTIONS 10x5x2x5 (Bancos A-J, FS1-5, Paridades 0/1)
function buildDefaultFsActions(): ZoomAction[][][][] {
  const table: ZoomAction[][][][] = [];

  for (let bank = 0; bank < NUM_BANKS_TOTAL; bank++) {
    const bankTable: ZoomAction[][][] = [];
    for (let fs = 0; fs < FS_COUNT; fs++) {
      const parityTable: ZoomAction[][] = [];
      // Parity 0 (Par / Even): preset fs * 2
      const slotEven: ZoomAction[] = [
        { type: ZoomActionType.ACTION_PATCH, a: bank, b: fs * 2, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
      ];
      // Parity 1 (Ímpar / Odd): preset fs * 2 + 1
      const slotOdd: ZoomAction[] = [
        { type: ZoomActionType.ACTION_PATCH, a: bank, b: fs * 2 + 1, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
        { type: ZoomActionType.ACTION_NONE, a: 0, b: 0, c: 0 },
      ];
      parityTable.push(slotEven, slotOdd);
      bankTable.push(parityTable);
    }
    table.push(bankTable);
  }

  return table;
}

export const FS_ACTIONS = buildDefaultFsActions();
