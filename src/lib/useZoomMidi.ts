// =============================================================================
// useZoomMidi.ts - Hook WebMIDI completo com esqueleto da controladora física
// Integração não-bloqueante baseada em tick, handshake e motor de Tap Tempo
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ZoomProtocolEngine,
  ZoomLinkState,
  AppMode,
} from './zoomProtocolEngine';
import { TapEngine, type TapResult } from './tapEngine';

export interface UseZoomMidiReturn {
  midiSupported: boolean;
  midiConnected: boolean;
  deviceName: string | null;
  currentBpm: number | null;
  lastTapMs: number | null;
  lastMidiLog: string | null;
  activePatchName: string | null;
  activeBank: number;
  activePreset: number;
  activeParity: number;
  appMode: AppMode;
  isTunerActive: boolean;
  connectMidi: () => Promise<boolean>;
  sendBankAndProgram: (bankIndex: number, presetIndex: number) => void;
  requestCurrentPatch: () => void;
  triggerFootswitchClick: (fsIndex: number) => void;
  triggerFootswitchHold: (fsIndex: number) => void;
  triggerFootswitchLongHold: (fsIndex: number) => void;
  triggerTap: () => TapResult | null;
  setBpmManual: (bpm: number) => void;
}

export function useZoomMidi(): UseZoomMidiReturn {
  const [midiSupported, setMidiSupported] = useState<boolean>(true);
  const [midiConnected, setMidiConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [lastTapMs, setLastTapMs] = useState<number | null>(null);
  const [lastMidiLog, setLastMidiLog] = useState<string | null>(null);
  const [activePatchName, setActivePatchName] = useState<string | null>(null);
  const [activeBank, setActiveBank] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<number>(0);
  const [activeParity, setActiveParity] = useState<number>(0);
  const [appMode, setAppMode] = useState<AppMode>(AppMode.MODE_NORMAL);
  const [isTunerActive, setIsTunerActive] = useState<boolean>(false);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const midiInputRef = useRef<MIDIInput | null>(null);
  const midiOutputRef = useRef<MIDIOutput | null>(null);
  const tapEngineRef = useRef<TapEngine>(new TapEngine());
  const protocolEngineRef = useRef<ZoomProtocolEngine | null>(null);

  // Envio de bytes seguro para a saída MIDI
  const sendMidiBytes = useCallback((bytes: Uint8Array) => {
    if (!midiOutputRef.current) return;
    try {
      midiOutputRef.current.send(bytes);
    } catch (err) {
      console.warn('Erro no envio WebMIDI:', err);
    }
  }, []);

  // Cria e inicializa o motor de protocolo da Zoom
  if (!protocolEngineRef.current) {
    protocolEngineRef.current = new ZoomProtocolEngine({
      sendMidiBytes: (bytes) => sendMidiBytes(bytes),
      onStateChange: (state) => {
        setMidiConnected(state === ZoomLinkState.ZLINK_READY);
      },
      onPatchChange: (bank, preset, patchName) => {
        setActiveBank(bank);
        setActivePreset(preset);
        setActivePatchName(patchName);
      },
      onTunerChange: (active) => {
        setIsTunerActive(active);
      },
      onLog: (msg) => {
        setLastMidiLog(msg);
      },
    });
  }

  // Loop de relógio não-bloqueante (zoomProtocolTick / appLoop da controladora)
  useEffect(() => {
    const interval = setInterval(() => {
      protocolEngineRef.current?.tick();
    }, 15);
    return () => clearInterval(interval);
  }, []);

  // Motor de Tap Tempo (FS5 / TAP)
  const triggerTap = useCallback((): TapResult | null => {
    const result = tapEngineRef.current.registerTap();
    if (result) {
      setCurrentBpm(result.bpm);
      setLastTapMs(result.ms);
      setLastMidiLog(`TAP: ${result.bpm} BPM (${result.ms}ms)`);
    } else {
      setLastMidiLog('TAP: 1º clique (aguardando próximo...)');
    }
    return result;
  }, []);

  const setBpmManual = useCallback((bpm: number) => {
    setCurrentBpm(bpm);
    setLastTapMs(Math.round(60000 / bpm));
  }, []);

  // Trata mensagens MIDI de entrada (SysEx da Zoom G1on)
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    if (!event.data) return;
    const data = new Uint8Array(event.data);
    protocolEngineRef.current?.onSysEx(data);
  }, []);

  // Conexão via Web MIDI API nativa
  const connectMidi = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      setMidiSupported(false);
      setLastMidiLog('Web MIDI API não suportada neste navegador.');
      return false;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      midiAccessRef.current = midiAccess;
      // Precisa ser atribuído AQUI (não no useEffect que chama connectMidi)
      // -- midiAccessRef.current só existe depois que essa Promise resolve,
      // então tentar anexar no useEffect corria contra essa mesma Promise e
      // quase sempre encontrava a ref ainda nula. Isso fazia plugar o pedal
      // DEPOIS de abrir a página nunca dispersar reconexão automática.
      midiAccess.onstatechange = () => {
        connectMidi();
      };

      let foundInput: MIDIInput | null = null;
      let foundOutput: MIDIOutput | null = null;
      let nameFound = '';

      for (const input of midiAccess.inputs.values()) {
        const lower = (input.name || '').toLowerCase();
        if (lower.includes('zoom') || lower.includes('g1on') || lower.includes('g1xon')) {
          foundInput = input;
          nameFound = input.name || 'Zoom G1on/G1Xon';
          break;
        }
      }
      if (!foundInput && midiAccess.inputs.size > 0) {
        foundInput = midiAccess.inputs.values().next().value || null;
        if (foundInput) nameFound = foundInput.name || 'Dispositivo MIDI';
      }

      for (const output of midiAccess.outputs.values()) {
        const lower = (output.name || '').toLowerCase();
        if (lower.includes('zoom') || lower.includes('g1on') || lower.includes('g1xon')) {
          foundOutput = output;
          break;
        }
      }
      if (!foundOutput && midiAccess.outputs.size > 0) {
        foundOutput = midiAccess.outputs.values().next().value || null;
      }

      if (foundInput && foundOutput) {
        midiInputRef.current = foundInput;
        midiOutputRef.current = foundOutput;
        foundInput.onmidimessage = handleMidiMessage;

        setDeviceName(nameFound);
        protocolEngineRef.current?.onDeviceConnected();
        return true;
      } else {
        setDeviceName(null);
        protocolEngineRef.current?.onDeviceDisconnected();
        return false;
      }
    } catch (err) {
      protocolEngineRef.current?.onDeviceDisconnected();
      setLastMidiLog(`Erro ao acessar WebMIDI: ${String(err)}`);
      return false;
    }
  }, [handleMidiMessage]);

  const sendBankAndProgram = useCallback((bankIndex: number, presetIndex: number) => {
    protocolEngineRef.current?.selectPatch(bankIndex, presetIndex);
    setActiveBank(bankIndex);
    setActivePreset(presetIndex);
  }, []);

  const requestCurrentPatch = useCallback(() => {
    if (protocolEngineRef.current) {
      const cellIdx = activeBank * 10 + activePreset;
      protocolEngineRef.current.requestPatchName(cellIdx);
    }
  }, [activeBank, activePreset]);

  // Ações de Footswitch vindas da UI
  const triggerFootswitchClick = useCallback((fsIndex: number) => {
    if (!protocolEngineRef.current) return;
    const res = protocolEngineRef.current.handleFootswitchClick(fsIndex);
    setActiveBank(res.bank);
    setActivePreset(res.preset);
    setActiveParity(res.parity);
    setAppMode(res.mode);
  }, []);

  const triggerFootswitchHold = useCallback((fsIndex: number) => {
    if (!protocolEngineRef.current) return;
    const mode = protocolEngineRef.current.handleFootswitchHold(fsIndex);
    setAppMode(mode);
  }, []);

  const triggerFootswitchLongHold = useCallback((fsIndex: number) => {
    if (!protocolEngineRef.current) return;
    const mode = protocolEngineRef.current.handleFootswitchLongHold(fsIndex);
    setAppMode(mode);
  }, []);

  useEffect(() => {
    connectMidi();

    return () => {
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null;
      }
      if (midiInputRef.current) {
        midiInputRef.current.onmidimessage = null;
      }
    };
  }, [connectMidi]);

  return {
    midiSupported,
    midiConnected,
    deviceName,
    currentBpm,
    lastTapMs,
    lastMidiLog,
    activePatchName,
    activeBank,
    activePreset,
    activeParity,
    appMode,
    isTunerActive,
    connectMidi,
    sendBankAndProgram,
    requestCurrentPatch,
    triggerFootswitchClick,
    triggerFootswitchHold,
    triggerFootswitchLongHold,
    triggerTap,
    setBpmManual,
  };
}
