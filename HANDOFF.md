# ZoomBoard — Prompt de Handoff (colar em nova sessão)

> Copie TODO o bloco abaixo e cole como primeira mensagem na nova sessão.
> Anexe também a imagem `public/reference/headrush-prime.jpg` (referência visual).

---

## Contexto do projeto

Estou continuando um projeto chamado **ZoomBoard**: um **editor/controlador WebMIDI para a pedaleira Zoom G1On/G1Xon**, feito para quem está com a tela da pedaleira queimada e não consegue editar patches nela. A ideia é disponibilizar de graça pra comunidade. Já existe hardware controlador físico (RPi Pico / RP2040) funcionando; esta é a versão web.

**Divisão de trabalho:**
- **Você (v0):** cuida APENAS da parte VISUAL/GUI e das interações de UI (layout, LEDs, footswitches, teclado, tela touch emulada).
- **Outra IA (Claude):** cuida da camada MIDI/SysEx real (detecção do dispositivo, leitura/escrita de parâmetros via SysEx da Zoom, I/O). NÃO implemente SysEx — apenas mantenha e melhore os "ganchos" (props/callbacks) prontos para ele conectar.

## Stack já existente (NÃO trocar)
- Next.js 16 (App Router) + React 19 + Tailwind v4 (tema em `app/globals.css` via `@theme`).
- `lucide-react` para ícones. Sem engine 3D — tudo CSS/React por leveza (roda liso em PC e Android).
- Tema grafite escuro + acento neon.

## Estrutura de arquivos atual
- `app/page.tsx` — monta o `<Pedalboard/>`.
- `app/layout.tsx` — fontes (display + mono) e metadata.
- `app/globals.css` — tokens de design (grafite/neon), keyframes de LED (pulse/blink/glow).
- `lib/pedalboard.ts` — tipos, `DEFAULT_SWITCHES` (12 switches), catálogo de efeitos do G1On, paletas de LED, `mkPreset()`.
- `components/pedalboard.tsx` — CÉREBRO: estado, teclado configurável, bloqueio de context-menu, layout.
- `components/foot-switch.tsx` — footswitch + LED + nome do preset.
- `components/led-ring.tsx` — LED (hoje é anel; ver tarefa 1).
- `components/device-screen.tsx` — "touchscreen" com cadeia de sinal e patch ativo.
- `components/switch-config-dialog.tsx` — painel de config por switch (nome, tecla, cor, modo LED, brilho, pulso).
- `components/top-bar.tsx` — status MIDI (gancho) + toggle Tocar/Configurar.
- `PRD.md` — documento de requisitos completo (leia para o panorama).

## Layout atual (confirmado e aprovado)
- Tela grande no centro-topo (emula touchscreen).
- 1 footswitch à esquerda da tela (**BANK**) e 1 à direita (**TAP / TUNER**) — são botões de FUNÇÃO, não bank up/down.
- Duas fileiras de 5 footswitches embaixo, ocupando toda a largura. Total: 12 switches virtuais.
- Responsivo: no mobile a tela vai full-width em cima e os laterais reflui para uma linha abaixo.

## Já implementado (não refazer, só aprimorar)
- Sistema de LED por switch: modos (aceso / ativo-quando-selecionado / pulsação / piscar / apagado), cor customizável (paleta + color picker), brilho, velocidade de pulso.
- Acionamento por teclado com mapeamento configurável (captura a tecla apertada).
- Proteção contra menu de contexto (right-click e long-press bloqueados na superfície).
- Modos Tocar / Configurar (engrenagem abre o painel do switch).
- Cadeia de sinal do G1On na tela (5 slots, cor por tipo de efeito).

## O QUE EU QUERO NESTA SESSÃO (tarefas priorizadas)

### 1. Fidelidade visual à HeadRush Prime (PRIORIDADE MÁXIMA)
Ver imagem `headrush-prime.jpg`. Ajustar o footswitch para bater com o hardware real:
- **LED**: NÃO é anel. É uma **barra/pílula horizontal fina** ACIMA da placa de nome (como no HeadRush). Refazer `led-ring.tsx` (ou criar `led-bar.tsx`) mantendo os mesmos modos/cor/brilho/pulso já existentes.
- **Placa de nome translúcida**: o nome do preset deve parecer "gravado dentro do plástico" da placa — efeito retroiluminado/translúcido, texto que emerge do material escuro (usar text-shadow interno, leve blur, brilho sutil na cor do LED). Esse é o detalhe estético que o dono mais quer.
- **Footswitch**: botão hexagonal cromado/metálico abaixo da placa.
- **Chassi**: preto fosco com **filete/borda dourada** fina (accent gold), como o HeadRush. Fundo da área dos switches com textura de linhas diagonais finas.
- Ordem vertical de cada switch: LED em barra (topo) → placa de nome translúcida → footswitch hexagonal (base).

### 2. Persistência
Salvar as configurações dos switches (nome, tecla, cor, modo LED, brilho, pulso) no navegador (localStorage) para não perder ao recarregar.

### 3. Manter os ganchos de MIDI intactos
Não implementar SysEx. Apenas garantir que existam props/callbacks claros (ex.: `onSwitchPress(id)`, status de conexão MIDI na top bar) para o Claude plugar depois.

## Regras
- Português nas respostas.
- Não usar emojis.
- Manter tudo leve (sem 3D). Foco em acabamento premium com CSS.
- Não quebrar o layout aprovado (tela central, BANK/TAP-TUNER laterais, 2x5 embaixo).
