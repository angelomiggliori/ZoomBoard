// Protocolo MIDI e SysEx da Zoom G1on / G1Xon
// Totalmente validado e confirmado no hardware físico (dev_id = 0x63, channel = 0)

export const ZOOM_DEV_ID = 0x63;
export const ZOOM_MFR_ID = 0x52; // Zoom Corporation
export const MIDI_CHANNEL = 0x00; // Canal 1 (0-indexed)

export const SYSEX_START = 0xf0;
export const SYSEX_END = 0xf7;

// Tamanho do nome do patch em bytes, contados a partir do FINAL do payload
// de uma resposta 0x28. CONFIRMADO como 8 no config.h do firmware; a
// documentação de engenharia reversa aponta uma possibilidade não
// confirmada de 10 bytes em outra unidade/firmware. Se os nomes vierem
// cortados ou deslocados com hardware real, teste 10 aqui primeiro.
export const PATCH_NAME_LEN = 8;

/** Formata um índice de banco (0..9) como letra A..J, igual ao firmware (display.cpp: 'A' + bank). */
export function bankLetter(bank: number): string {
  const clamped = Math.max(0, Math.min(9, bank));
  return String.fromCharCode(65 + clamped);
}

export interface ZoomMidiState {
  connected: boolean;
  deviceName: string | null;
  currentBank: number; // 0..9 (A..J)
  currentPreset: number; // 0..9 (01..10)
  patchName: string | null;
  patchPayload: Uint8Array | null;
  lastMessage: string | null;
}

/**
 * Universal MIDI Identity Request
 * TX: F0 7E 00 06 01 F7
 */
export const IDENTITY_REQUEST = new Uint8Array([
  SYSEX_START,
  0x7e,
  0x00,
  0x06,
  0x01,
  SYSEX_END,
]);

/**
 * Entrar em Modo de Edição (Edit Mode Enter)
 * F0 52 00 63 50 01 F7
 */
export const EDIT_MODE_ENTER = new Uint8Array([
  SYSEX_START,
  ZOOM_MFR_ID,
  MIDI_CHANNEL,
  ZOOM_DEV_ID,
  0x50,
  0x01,
  SYSEX_END,
]);

/**
 * Sair do Modo de Edição (Edit Mode Exit)
 * F0 52 00 63 50 00 F7
 */
export const EDIT_MODE_EXIT = new Uint8Array([
  SYSEX_START,
  ZOOM_MFR_ID,
  MIDI_CHANNEL,
  ZOOM_DEV_ID,
  0x50,
  0x00,
  SYSEX_END,
]);

/**
 * Solicitar dados do patch atual (dentro do Edit Mode)
 * TX: F0 52 00 63 29 F7
 * RX esperado: F0 52 00 63 28 <patch_data...> F7 (tamanho do payload não
 * é fixo aqui -- ver parsePatchDataResponse)
 */
export const REQUEST_PATCH_DATA = new Uint8Array([
  SYSEX_START,
  ZOOM_MFR_ID,
  MIDI_CHANNEL,
  ZOOM_DEV_ID,
  0x29,
  SYSEX_END,
]);

/**
 * Decodifica o nome do patch a partir dos últimos PATCH_NAME_LEN bytes do
 * payload de patch_data (o payload inteiro entre o header 0x28 e o F7 final
 * -- o tamanho total do payload não é fixado aqui, só a "fatia" do nome no
 * final dele, exatamente como parsePatchNameFromReply() em zoom_protocol.cpp).
 *
 * Reproduz o C++ byte a byte: cada byte fora do range imprimível [32,126]
 * vira espaço (não é descartado -- diferença importante em relação a uma
 * versão anterior deste arquivo, que pulava bytes não-imprimíveis e podia
 * "colar" pedaços do nome sem o espaço que deveria estar entre eles). Só os
 * espaços do FINAL são removidos (trim), espaços internos/à esquerda ficam.
 */
export function decodePatchName(payload: Uint8Array | number[]): string {
  if (payload.length < PATCH_NAME_LEN) return '';
  const nameBytes = Array.from(payload).slice(payload.length - PATCH_NAME_LEN);

  const chars = nameBytes.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ' '));
  let end = chars.length;
  while (end > 0 && chars[end - 1] === ' ') {
    end--;
  }
  return chars.slice(0, end).join('');
}

/**
 * Valida se uma mensagem SysEx recebida é a resposta de dados do patch (0x28)
 * e retorna o payload completo (data entre o header de 5 bytes e o F7 final).
 *
 * O tamanho total do patch_data NÃO é fixado em 128 bytes aqui -- o
 * zoom_protocol.cpp real também não fixa; ele só exige bytes suficientes
 * para conter o nome no final (HEADER_LEN + TRAILER_LEN + PATCH_NAME_LEN).
 * Uma versão anterior deste arquivo exigia exatamente 134 bytes totais, o
 * que descartaria silenciosamente qualquer resposta real de tamanho
 * diferente do assumido.
 */
export function parsePatchDataResponse(data: Uint8Array): Uint8Array | null {
  // F0 52 ch dev_id 28 <patch_data...> F7
  const HEADER_LEN = 5; // F0, 52, ch, dev_id, cmd
  const TRAILER_LEN = 1; // F7
  if (
    data.length >= HEADER_LEN + TRAILER_LEN + PATCH_NAME_LEN &&
    data[0] === SYSEX_START &&
    data[1] === ZOOM_MFR_ID &&
    data[3] === ZOOM_DEV_ID &&
    data[4] === 0x28 &&
    data[data.length - 1] === SYSEX_END
  ) {
    return data.slice(HEADER_LEN, data.length - TRAILER_LEN);
  }
  return null;
}

/**
 * Helper de espera (settle time) para estabilizar o DSP do pedal entre comandos SysEx.
 */
export function settle(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
