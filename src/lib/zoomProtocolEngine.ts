// =============================================================================
// zoomProtocolEngine.ts - Máquina de Estados e Protocolo SysEx Zoom G1Xon-K
// Portado diretamente de zoom_protocol.cpp / zoom_protocol.h / app.cpp
// =============================================================================

import {
  ZOOM_DEV_ID,
  ZOOM_MFR_ID,
  MIDI_CHANNEL,
  SYSEX_START,
  SYSEX_END,
  EDIT_MODE_ENTER,
  EDIT_MODE_EXIT,
  IDENTITY_REQUEST,
  REQUEST_PATCH_DATA,
  decodePatchName,
  parsePatchDataResponse,
} from './zoomMidi';
import {
  FS_ACTIONS,
  ZoomActionType,
  NUM_BANKS_TOTAL,
  FS_ACTIONS_PER_PRESS,
  type ZoomAction,
} from './fsActions';

// Timing ported from config.h (HOLD_MS / LONG_HOLD_MS). footswitches.cpp
// usa isso num loop de polling com debounce; no navegador não temos esse
// loop, então a UI (Pedalboard.tsx) usa esses mesmos valores num
// setTimeout a partir do pointerdown/keydown para distinguir clique curto
// de "segurar" nos switches que têm dupla função (BANK, TAP/TUNER).
export const FS_HOLD_MS = 500;
export const FS_LONG_HOLD_MS = 2000;

export enum ZoomLinkState {
  ZLINK_DISCONNECTED = 'ZLINK_DISCONNECTED',
  ZLINK_AWAIT_IDENTITY = 'ZLINK_AWAIT_IDENTITY',
  ZLINK_AWAIT_EDIT_MODE = 'ZLINK_AWAIT_EDIT_MODE',
  ZLINK_AWAIT_PATCH = 'ZLINK_AWAIT_PATCH',
  ZLINK_READY = 'ZLINK_READY',
}

export enum AppMode {
  MODE_NORMAL = 'MODE_NORMAL',
  MODE_PRE_BANK = 'MODE_PRE_BANK',
  MODE_PRE_PRESET = 'MODE_PRE_PRESET',
  MODE_TUNER = 'MODE_TUNER',
}

export interface ZoomProtocolCallbacks {
  onStateChange?: (state: ZoomLinkState) => void;
  onPatchChange?: (bank: number, preset: number, patchName: string) => void;
  onTunerChange?: (active: boolean) => void;
  onLog?: (msg: string) => void;
  sendMidiBytes: (bytes: Uint8Array) => void;
}

export class ZoomProtocolEngine {
  private state: ZoomLinkState = ZoomLinkState.ZLINK_DISCONNECTED;
  private appMode: AppMode = AppMode.MODE_NORMAL;
  private currentBank: number = 0; // 0..9 (A..J)
  private currentPreset: number = 0; // 0..9 (0..9)
  private currentPatchName: string = '';
  private lastPressedIdx: number = 0xff; // 0..4 ou 0xFF
  private lastParity: number = 0; // 0 = even, 1 = odd
  private bankRangeStart: number = 0; // 0 = A-E, 5 = F-J
  private preSelectedBank: number = 0;
  private isTunerOn: boolean = false;

  private stateEnteredMs: number = 0;
  private handshakeRetries: number = 0;
  private lastSysExMs: number = 0;
  private pendingPatchRequest: boolean = false;
  private pendingCellIdx: number = 0;
  private callbacks: ZoomProtocolCallbacks;

  private static readonly SYSEX_THROTTLE_MS = 30;
  private static readonly HANDSHAKE_RETRY_MS = 1500;
  private static readonly EDIT_MODE_SETTLE_MS = 150;

  constructor(callbacks: ZoomProtocolCallbacks) {
    this.callbacks = callbacks;
  }

  public init(): void {
    this.state = ZoomLinkState.ZLINK_DISCONNECTED;
    this.currentBank = 0;
    this.currentPreset = 0;
    this.currentPatchName = '';
    this.lastPressedIdx = 0xff;
    this.lastParity = 0;
    this.appMode = AppMode.MODE_NORMAL;
  }

  public onDeviceConnected(): void {
    this.callbacks.onLog?.('[zoom] dispositivo conectado, iniciando handshake');
    this.handshakeRetries = 0;
    this.enterState(ZoomLinkState.ZLINK_AWAIT_IDENTITY);
    this.sendIdentityRequest();
  }

  public onDeviceDisconnected(): void {
    this.callbacks.onLog?.('[zoom] dispositivo desconectado');
    this.enterState(ZoomLinkState.ZLINK_DISCONNECTED);
  }

  private enterState(s: ZoomLinkState): void {
    this.state = s;
    this.stateEnteredMs = performance.now();
    this.callbacks.onStateChange?.(s);
  }

  private throttleReady(): boolean {
    return performance.now() - this.lastSysExMs >= ZoomProtocolEngine.SYSEX_THROTTLE_MS;
  }

  private sendSysEx(payloadNoF0F7: Uint8Array): void {
    const full = new Uint8Array(payloadNoF0F7.length + 2);
    full[0] = SYSEX_START;
    full.set(payloadNoF0F7, 1);
    full[full.length - 1] = SYSEX_END;
    this.callbacks.sendMidiBytes(full);
    this.lastSysExMs = performance.now();
  }

  private sendZoomCommand(cmd: number, extra: Uint8Array = new Uint8Array(0)): void {
    const payload = new Uint8Array(4 + extra.length);
    payload[0] = ZOOM_MFR_ID;
    payload[1] = MIDI_CHANNEL;
    payload[2] = ZOOM_DEV_ID;
    payload[3] = cmd;
    if (extra.length > 0) {
      payload.set(extra, 4);
    }
    this.sendSysEx(payload);
  }

  private sendIdentityRequest(): void {
    // 7E 00 06 01 sem F0/F7
    const idReq = new Uint8Array([0x7e, 0x00, 0x06, 0x01]);
    this.sendSysEx(idReq);
  }

  private sendProgramChange(cellIdx: number): void {
    const statusPC = 0xc0 | (MIDI_CHANNEL & 0x0f);
    const msg = new Uint8Array([statusPC, cellIdx & 0x7f]);
    this.callbacks.sendMidiBytes(msg);
  }

  private sendControlChange(cc: number, val: number): void {
    const statusCC = 0xb0 | (MIDI_CHANNEL & 0x0f);
    const msg = new Uint8Array([statusCC, cc & 0x7f, val & 0x7f]);
    this.callbacks.sendMidiBytes(msg);
  }

  public requestPatchName(cellIdx: number): void {
    if (!this.throttleReady()) {
      this.pendingPatchRequest = true;
      this.pendingCellIdx = cellIdx;
      return;
    }
    this.pendingPatchRequest = false;
    // 0x29 - Req. Edit Buffer da Zoom G1on
    this.sendZoomCommand(0x29);
  }

  public onSysEx(data: Uint8Array): void {
    if (data.length < 4 || data[1] !== ZOOM_MFR_ID) {
      return;
    }

    if (this.state === ZoomLinkState.ZLINK_AWAIT_IDENTITY) {
      // F0 52 00 [dev_id] ... F7
      if (data[2] === 0x00 && data.length >= 5) {
        const reportedId = data[3];
        if (reportedId === ZOOM_DEV_ID) {
          this.callbacks.onLog?.('[zoom] identidade confirmada (0x63, G1Xon-K)');
        } else {
          this.callbacks.onLog?.(`[zoom] aviso: ID = 0x${reportedId.toString(16)}`);
        }
        this.enterState(ZoomLinkState.ZLINK_AWAIT_EDIT_MODE);
        // F0 52 00 63 50 01 F7
        this.sendZoomCommand(0x50, new Uint8Array([0x01]));
      }
      return;
    }

    if (data.length < 5) return;
    const cmd = data[4];

    if (cmd === 0x28) {
      // Patch data reply
      const payload = parsePatchDataResponse(data);
      if (payload) {
        this.currentPatchName = decodePatchName(payload);
        this.callbacks.onPatchChange?.(
          this.currentBank,
          this.currentPreset,
          this.currentPatchName
        );
        this.callbacks.onLog?.(`[zoom] patch recebido: "${this.currentPatchName}"`);
      }

      if (this.state === ZoomLinkState.ZLINK_AWAIT_PATCH) {
        this.enterState(ZoomLinkState.ZLINK_READY);
        this.callbacks.onLog?.('[zoom] handshake completo, pronto para tocar');
      }
    }
  }

  public tick(): void {
    const elapsed = performance.now() - this.stateEnteredMs;

    switch (this.state) {
      case ZoomLinkState.ZLINK_DISCONNECTED:
        break;

      case ZoomLinkState.ZLINK_AWAIT_IDENTITY:
        if (elapsed >= ZoomProtocolEngine.HANDSHAKE_RETRY_MS) {
          this.handshakeRetries++;
          this.callbacks.onLog?.(`[zoom] identity retry #${this.handshakeRetries}`);
          this.sendIdentityRequest();
          this.stateEnteredMs = performance.now();
        }
        break;

      case ZoomLinkState.ZLINK_AWAIT_EDIT_MODE:
        if (elapsed >= ZoomProtocolEngine.EDIT_MODE_SETTLE_MS) {
          this.enterState(ZoomLinkState.ZLINK_AWAIT_PATCH);
          const cellIdx = this.currentBank * 10 + this.currentPreset;
          this.sendProgramChange(cellIdx);
          this.requestPatchName(cellIdx);
        }
        break;

      case ZoomLinkState.ZLINK_AWAIT_PATCH:
        if (elapsed >= ZoomProtocolEngine.HANDSHAKE_RETRY_MS) {
          this.callbacks.onLog?.('[zoom] patch request retry');
          const cellIdx = this.currentBank * 10 + this.currentPreset;
          this.requestPatchName(cellIdx);
          this.stateEnteredMs = performance.now();
        }
        break;

      case ZoomLinkState.ZLINK_READY:
        break;
    }

    if (this.pendingPatchRequest && this.throttleReady()) {
      this.requestPatchName(this.pendingCellIdx);
    }
  }

  public selectPatch(bank: number, preset: number): void {
    this.currentBank = bank;
    this.currentPreset = preset;
    const cellIdx = bank * 10 + preset;
    this.sendProgramChange(cellIdx);
    this.requestPatchName(cellIdx);
  }

  public setTuner(on: boolean): void {
    this.isTunerOn = on;
    this.sendControlChange(81, on ? 0x7f : 0x00);
    this.callbacks.onTunerChange?.(on);
  }

  public setEffectParam(slot: number, paramId: number, value: number): void {
    this.sendZoomCommand(0x31, new Uint8Array([slot, paramId, value]));
  }

  public setEffectBypass(slot: number, on: boolean): void {
    this.setEffectParam(slot, 0x00, on ? 0x01 : 0x00);
  }

  // ---- Executor de Ações da Tabela FS_ACTIONS ----
  public executeFsActions(bank: number, fsIndex: number, parity: number): boolean {
    if (bank >= NUM_BANKS_TOTAL || fsIndex >= 5 || parity >= 2) {
      return false;
    }

    let selectedPatch = false;
    const actions: ZoomAction[] = FS_ACTIONS[bank][fsIndex][parity];

    for (let i = 0; i < FS_ACTIONS_PER_PRESS; i++) {
      const act = actions[i];
      switch (act.type) {
        case ZoomActionType.ACTION_NONE:
          break;
        case ZoomActionType.ACTION_PATCH:
          this.selectPatch(act.a, act.b);
          selectedPatch = true;
          break;
        case ZoomActionType.ACTION_CC:
          this.sendControlChange(act.a, act.b);
          break;
        case ZoomActionType.ACTION_BYPASS:
          this.setEffectBypass(act.a, act.b !== 0);
          break;
        case ZoomActionType.ACTION_PARAM:
          this.setEffectParam(act.a, act.b, act.c);
          break;
        case ZoomActionType.ACTION_TAP:
          this.sendControlChange(64, 0x7f);
          break;
        case ZoomActionType.ACTION_TUNER_TOGGLE:
          // Fiel ao fs_actions.cpp real: deliberadamente NÃO sincronizado
          // com isTunerOn/MODE_TUNER (esses só existem no hold do switch
          // dedicado). Uma ação de slot com esse tipo apenas manda
          // CC81=0x7F (liga) sempre, nunca desliga e nunca alterna --
          // limitação documentada no firmware, não um bug daqui.
          this.sendControlChange(81, 0x7f);
          break;
      }
    }
    return selectedPatch;
  }

  // ---- Máquina de Estados de Cliques (app.cpp: handleClick, handleHold) ----
  public handleFootswitchClick(idx: number): {
    bank: number;
    preset: number;
    parity: number;
    mode: AppMode;
  } {
    switch (this.appMode) {
      case AppMode.MODE_NORMAL: {
        const parity = idx === this.lastPressedIdx ? this.lastParity ^ 1 : 0;
        this.executeFsActions(this.currentBank, idx, parity);
        this.lastPressedIdx = idx;
        this.lastParity = parity;
        break;
      }
      case AppMode.MODE_PRE_BANK: {
        this.preSelectedBank = this.bankRangeStart + idx;
        this.appMode = AppMode.MODE_PRE_PRESET;
        break;
      }
      case AppMode.MODE_PRE_PRESET: {
        this.executeFsActions(this.preSelectedBank, idx, 0);
        this.lastPressedIdx = idx;
        this.lastParity = 0;
        this.appMode = AppMode.MODE_NORMAL;
        break;
      }
      case AppMode.MODE_TUNER:
        break;
    }

    return {
      bank: this.currentBank,
      preset: this.currentPreset,
      parity: this.lastParity,
      mode: this.appMode,
    };
  }

  public handleFootswitchHold(idx: number): AppMode {
    if (idx === 2) {
      // FS3: Bank Select
      if (this.appMode === AppMode.MODE_NORMAL) {
        this.appMode = AppMode.MODE_PRE_BANK;
        this.bankRangeStart = 0;
      } else if (this.appMode === AppMode.MODE_PRE_BANK) {
        this.bankRangeStart = this.bankRangeStart === 0 ? 5 : 0;
      } else if (this.appMode === AppMode.MODE_PRE_PRESET) {
        this.appMode = AppMode.MODE_PRE_BANK;
      }
    } else if (idx === 3) {
      // FS4: Tuner
      if (this.appMode === AppMode.MODE_NORMAL) {
        this.setTuner(true);
        this.appMode = AppMode.MODE_TUNER;
      } else if (this.appMode === AppMode.MODE_TUNER) {
        this.setTuner(false);
        this.appMode = AppMode.MODE_NORMAL;
      }
    }
    return this.appMode;
  }

  public handleFootswitchLongHold(idx: number): AppMode {
    if (idx === 2 && (this.appMode === AppMode.MODE_PRE_BANK || this.appMode === AppMode.MODE_PRE_PRESET)) {
      this.appMode = AppMode.MODE_NORMAL; // Cancela seleção de banco
    }
    return this.appMode;
  }

  public getState(): ZoomLinkState {
    return this.state;
  }
  public getAppMode(): AppMode {
    return this.appMode;
  }
  public getCurrentBank(): number {
    return this.currentBank;
  }
  public getCurrentPreset(): number {
    return this.currentPreset;
  }
  public getCurrentPatchName(): string {
    return this.currentPatchName;
  }
  public getLastPressedIdx(): number {
    return this.lastPressedIdx;
  }
  public getLastParity(): number {
    return this.lastParity;
  }
  public getBankRangeStart(): number {
    return this.bankRangeStart;
  }
}
