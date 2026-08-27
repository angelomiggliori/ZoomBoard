# PRD — ZoomBoard (Editor WebMIDI para Zoom G1On)

> **Status:** v0.1 — camada visual/interação concluída. Camada MIDI/SysEx pendente (responsabilidade do Claude).
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react
> **Renderização:** UI 2D de alto acabamento (sem engine 3D). Roda liso em PC e Android.

---

## 1. Visão geral

ZoomBoard é uma controladora/editor virtual, gratuita e rodando no navegador, para a pedaleira
**Zoom G1On / G1Xon**. Nasceu de uma dor real: telas queimadas nessas pedaleiras impedem a
edição de parâmetros direto no aparelho, deixando o usuário limitado a patch up/down. O ZoomBoard
oferece uma interface WebMIDI para ver e editar tudo pelo PC ou celular Android.

A estética é inspirada na **HeadRush Prime**: chassi grafite escuro, footswitches metálicos com
relevo, anéis de LED com glow neon, e o **nome do preset exibido entre o LED e o footswitch**.

### Divisão de responsabilidades
- **Camada visual / interação (este projeto, feito no v0):** layout, footswitches, LEDs, tela
  "touch", teclado configurável, proteção de menu de contexto, modais de configuração.
- **Camada MIDI / SysEx (a ser feita pelo Claude):** detecção automática de dispositivo, I/O de
  Web MIDI, mensagens SysEx específicas da Zoom, leitura/escrita de parâmetros reais dos patches.
  A UI já expõe os "ganchos" (props e handlers) para essa integração.

---

## 2. Objetivos

| # | Objetivo | Status |
|---|----------|--------|
| 1 | Reproduzir a régua de footswitches estilo HeadRush (LED + nome + switch) | ✅ Feito |
| 2 | Layout: tela central no topo, 1 foot à esquerda, 1 à direita, 2 fileiras de 5 embaixo | ✅ Feito |
| 3 | 12 switches virtuais (versão de 5 fica para o futuro) | ✅ Feito |
| 4 | Sistema de LED configurável (modo, cor, brilho, velocidade de pulso) | ✅ Feito |
| 5 | Acionamento por teclado físico com mapeamento configurável | ✅ Feito |
| 6 | Proteção contra menu de contexto (right-click / long-press) | ✅ Feito |
| 7 | Responsivo PC + Android | ✅ Feito |
| 8 | Integração WebMIDI/SysEx real | ⏳ Claude |
| 9 | Persistência das configurações (localStorage/DB) | ⏳ Pendente |

---

## 3. Layout (o "device")

```
┌───────────────────────────────────────────────┐
│  TopBar: nome · status MIDI · Tocar/Configurar  │
├───────────────────────────────────────────────┤
│                                                 │
│   [PATCH −]      TELA TOUCHSCREEN     [PATCH +]  │  ← fileira central
│                (cadeia de sinal)                │
│                                                 │
│   [ 1 ][ 2 ][ 3 ][ 4 ][ 5 ]                     │  ← fileira A
│   [ 6 ][ 7 ][ 8 ][ 9 ][10 ]                     │  ← fileira B
└───────────────────────────────────────────────┘
```

- **Desktop:** `foot | tela | foot` na horizontal, centralizados verticalmente com a tela.
- **Mobile:** reflui — tela em largura total no topo, os dois foots laterais numa linha logo
  abaixo, e as duas fileiras de 5 seguem embaixo. Sem scroll horizontal; nomes longos truncam.

Cada footswitch tem, de cima para baixo: **anel de LED → nome do preset → legenda → botão metálico**.

---

## 4. Funcionalidades detalhadas

### 4.1 Footswitches (12)
- 2 laterais (`left` = PATCH −, `right` = PATCH +) que navegam entre presets.
- 10 de preset (fileiras A e B) que selecionam patches `01`–`10`.
- Estados visuais: normal, **pressed** (afunda ~150ms), **flash** (feedback ~280ms), **active**.
- `role`: `preset` | `momentary` | `toggle` (preparado para switch multifunção).

### 4.2 Sistema de LED (`components/led-ring.tsx`)
Modos (`LedMode`):
- `active` — acende só quando o switch está selecionado.
- `solid` — sempre aceso.
- `pulse` — respiração (fade in/out) na velocidade configurada.
- `blink` — piscar on/off.
- `off` — apagado.

Parâmetros por switch: **cor** (paleta neon + color picker custom), **brilho** (0–100%),
**velocidade de pulso** (200–3000 ms/ciclo, relevante em pulse/blink). O glow usa a cor do LED.

### 4.3 Tela "touchscreen" (`components/device-screen.tsx`)
- Barra de status: rótulo "Zoom G1On", BPM (placeholder `-- BPM`), "RIG VIEW".
- Cabeçalho do patch: número grande + nome.
- **Cadeia de sinal** `IN → [blocos] → OUT`. Cada bloco é um efeito colorido por categoria
  (comp/dynamics, drive, amp, eq, mod, delay, reverb, pedal).
- Interação: **1 toque** seleciona o bloco; **toque duplo** liga/desliga (bypass). Blocos em
  bypass ficam com opacidade reduzida.

### 4.4 Teclado configurável (`components/pedalboard.tsx`)
- Cada switch pode ter uma tecla (`e.key`). Pressionar a tecla aciona o switch.
- Ignora quando um input/textarea está focado, quando há modificadores (Ctrl/Alt/Meta) ou repeat.
- No modal, o botão "capturar tecla" lê a próxima tecla pressionada. Conflitos são detectados e,
  ao salvar, a tecla é reatribuída (removida do switch antigo).

### 4.5 Proteção de menu de contexto
- `contextmenu` bloqueado no documento inteiro (`e.preventDefault()`).
- `onContextMenu` também bloqueado nos elementos interativos (blocos, modal).

### 4.6 Modos Tocar / Configurar
- **Tocar:** clique/toque/teclado acionam os switches.
- **Configurar:** cada switch vira um botão de engrenagem que abre o `SwitchConfigDialog`.

---

## 5. Modelo de dados (`lib/pedalboard.ts`)

```ts
type LedMode = 'active' | 'solid' | 'pulse' | 'blink' | 'off'
type SwitchRole = 'preset' | 'momentary' | 'toggle'

interface SwitchConfig {
  id: string
  label: string        // nome exibido (ex.: nome do preset)
  sublabel: string     // linha secundária (função / número)
  key: string | null   // tecla do teclado (e.key)
  color: string        // hex do LED
  ledMode: LedMode
  brightness: number   // 0–100
  pulseSpeed: number   // ms por ciclo
  role: SwitchRole
}

type EffectCategory = 'comp'|'drive'|'amp'|'eq'|'mod'|'delay'|'reverb'|'pedal'
interface EffectBlock { id: string; name: string; category: EffectCategory; on: boolean }
interface Patch { number: string; name: string; chain: EffectBlock[] }
```

Constantes exportadas: `DEFAULT_SWITCHES`, `DEMO_PATCHES`, `LED_MODE_LABELS`, `LED_PALETTE`,
`CATEGORY_META`. Os `DEMO_PATCHES` são dados de exemplo — a camada MIDI deve substituí-los pelos
dados reais lidos da pedaleira.

---

## 6. Arquitetura de arquivos

```
app/
  layout.tsx              # fontes, metadata, <html> com bg do tema
  globals.css             # tema grafite + neon (Tailwind v4, tokens em @theme)
  page.tsx                # monta <Pedalboard/>
components/
  pedalboard.tsx          # estado central, teclado, proteção de contexto, layout
  foot-switch.tsx         # botão metálico + LED + nome (responsivo)
  led-ring.tsx            # anel de LED com modos/cor/brilho/pulso
  device-screen.tsx       # tela "touch": cadeia de sinal + patch
  switch-config-dialog.tsx# modal de configuração por switch
  top-bar.tsx             # status MIDI + toggle Tocar/Configurar
lib/
  pedalboard.ts           # tipos, defaults, paletas, patches de exemplo
PRD.md                    # este documento
```

---

## 7. Ganchos para a integração MIDI (o que o Claude precisa conectar)

1. **`top-bar.tsx`** — prop `midiConnected: boolean` (hoje `false`). Trocar por estado real do
   `navigator.requestMIDIAccess()`.
2. **`pedalboard.tsx`**
   - `triggerSwitch(id)` — ponto onde enviar Program Change / SysEx ao acionar um switch.
   - `activePreset` — deve espelhar/receber o patch atual da pedaleira.
   - `patches` (state) — substituir `DEMO_PATCHES` por dados lidos via SysEx.
   - `toggleBlock(blockId)` — ponto onde enviar SysEx de bypass do efeito.
3. **`device-screen.tsx`** — prop `bpm` para o tempo real; e a cadeia de sinal renderiza o que
   vier em `patch.chain`.

Sugestão: criar `lib/midi.ts` com a lógica Web MIDI/SysEx e um hook `useZoomG1On()` que exponha
`{ connected, patches, activePreset, selectPatch, toggleEffect, setParam }` e alimente o
`Pedalboard`.

---

## 8. Design tokens (tema)

- **Base:** grafite/carvão escuro (chassi ~`oklch(0.185 …)`, tela ~`oklch(0.12 …)`).
- **Acento:** neon (variável `--neon`), com glow nos LEDs e detalhes.
- **Tipografia:** fonte display para nomes/rótulos + fonte mono para dados técnicos (BPM, IN/OUT).
- Máximo de 2 famílias de fonte; paleta enxuta grafite + neon + neutros.

---

## 9. Roadmap / próximos passos

- [ ] **MIDI real (Claude):** detecção, Program Change, SysEx de leitura/escrita de parâmetros.
- [ ] **Persistência:** salvar `SwitchConfig[]` (nomes, teclas, LEDs) em localStorage e/ou banco.
- [ ] **Editor de parâmetros:** knobs/sliders por efeito ao abrir um bloco da cadeia.
- [ ] **Versão de 5 switches** para controladoras menores.
- [ ] **Presets de layout** e import/export de configuração.
- [ ] **PWA** para instalar no Android e usar offline.

---

## 10. Limitações conhecidas

- **Web MIDI não funciona no Safari/iOS** nativamente — a versão Android/desktop Chromium é o alvo.
- Dados de efeitos/patches atuais são de exemplo (`DEMO_PATCHES`) até a camada MIDI entrar.
- Ainda não há persistência: recarregar a página volta aos defaults.
