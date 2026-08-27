# ZoomBoard — Handoff (atualizado)

> Documento vivo entre sessões. O time trabalha em janelas curtas por causa do
> limite de tokens, então este arquivo guarda o estado real. Leia junto com
> `ROADMAP.md` (o que já foi feito, como e por quê).
> Referência visual: `public/reference/headrush-prime.jpg`.

---

## STATUS ATUAL (o mais importante primeiro)

### Deploy / GitHub Pages — CONFIGURADO
- Repositório: `angelomiggliori/ZoomBoard`, branch `main`. Git conectado ao v0
  (mudanças feitas no v0 viram push automático).
- URL final: **https://angelomiggliori.github.io/ZoomBoard**
- Como funciona: build estático (`output: 'export'`) publicado por GitHub
  Actions (`.github/workflows/deploy.yml`) a cada push na `main`.
- Passo manual já feito uma vez: Settings > Pages > Source = **GitHub Actions**.
  NÃO usar "Deploy from a branch". NÃO clicar em "Configure" no card sugerido
  do GitHub (ele cria um `nextjs.yml` genérico que conflita — já foi removido
  uma vez).
- `basePath`/`assetPrefix` = `/ZoomBoard` ligam SÓ quando `GITHUB_PAGES=true`
  (setado no workflow). No preview do v0 e no `next dev` continua na raiz "/".

### Divisão de trabalho (não mudar)
- **v0:** APENAS a parte VISUAL/GUI e interações de UI (layout, LEDs,
  footswitches, teclado, tela touch emulada, persistência local da config).
- **Claude:** a camada MIDI/SysEx real (detecção do dispositivo, leitura/escrita
  de parâmetros via SysEx da Zoom G1On/G1Xon, I/O). O v0 NÃO implementa SysEx —
  só mantém os "ganchos" (props/callbacks) prontos para o Claude plugar.

---

## O QUE FAZER NA SEQUÊNCIA (prioridades de UI)

1. **Fidelidade visual à HeadRush Prime (PRIORIDADE MÁXIMA).** Ver
   `headrush-prime.jpg`. Ajustar o footswitch para bater com o hardware:
   - **LED**: NÃO é anel. É uma **barra/pílula horizontal fina** ACIMA da placa
     de nome. Refazer `led-ring.tsx` (ou criar `led-bar.tsx`) mantendo os mesmos
     modos/cor/brilho/pulso já existentes.
   - **Placa de nome translúcida**: nome do preset parecendo "gravado dentro do
     plástico" retroiluminado (text-shadow interno, leve blur, brilho na cor do
     LED). É o detalhe estético que o dono mais quer.
   - **Footswitch**: botão hexagonal cromado/metálico abaixo da placa.
   - **Chassi**: preto fosco com filete/borda dourada fina; fundo da área dos
     switches com textura de linhas diagonais finas.
   - Ordem vertical de cada switch: barra de LED (topo) → placa de nome
     translúcida → footswitch hexagonal (base).
2. **Editor de parâmetros por efeito** (só a UI): ao abrir um bloco na tela,
   mostrar knobs/sliders dos parâmetros. Deixar os valores vindo de props e os
   callbacks prontos para o Claude ligar no SysEx.
3. **Status MIDI real na top bar** (só o gancho): hoje é `midiConnected={false}`
   fixo. Deixar props/estado claros para o Claude alimentar a conexão real.
4. Ideias futuras: versão de 5 switches, presets de layout, import/export de
   config (JSON), PWA offline.

---

## Stack (NÃO trocar)
- Next.js 16 (App Router) + React 19 + Tailwind v4 (tema em `app/globals.css`
  via `@theme`). `lucide-react` para ícones. Sem engine 3D — tudo CSS/React por
  leveza (roda liso em PC e Android). Tema grafite escuro + acento neon.

## Estrutura de arquivos
- `app/page.tsx` — monta o `<Pedalboard/>`.
- `app/layout.tsx` — fontes (display + mono) e metadata.
- `app/globals.css` — tokens de design (grafite/neon), keyframes de LED.
- `lib/pedalboard.ts` — tipos, `DEFAULT_SWITCHES` (12), catálogo de efeitos do
  G1On, paletas de LED, `mkPreset()`.
- `components/pedalboard.tsx` — CÉREBRO: estado, teclado configurável, bloqueio
  de context-menu, layout, **persistência em localStorage**.
- `components/foot-switch.tsx` — footswitch + LED + nome do preset.
- `components/led-ring.tsx` — LED (hoje anel; ver tarefa 1).
- `components/device-screen.tsx` — "touchscreen" com cadeia de sinal.
- `components/switch-config-dialog.tsx` — config por switch (nome, tecla, cor,
  modo LED, brilho, pulso).
- `components/top-bar.tsx` — status MIDI (gancho) + toggle Tocar/Configurar.
- `next.config.mjs` — export estático + basePath condicional do Pages.
- `.github/workflows/deploy.yml` — CI de deploy para o Pages.
- `PRD.md` — requisitos completos. `ROADMAP.md` — histórico do que foi feito.

## Layout atual (aprovado — não quebrar)
- Tela grande no centro-topo (emula touchscreen).
- 1 footswitch à esquerda (**BANK**) e 1 à direita (**TAP / TUNER**) — botões de
  FUNÇÃO, não bank up/down.
- Duas fileiras de 5 footswitches embaixo (total 12).
- Responsivo: no mobile a tela vai full-width em cima e os laterais refluem.

## Já implementado (não refazer, só aprimorar)
- LED por switch: modos (aceso / ativo-quando-selecionado / pulsação / piscar /
  apagado), cor customizável, brilho, velocidade de pulso.
- Teclado configurável (captura a tecla apertada, resolve conflitos).
- Bloqueio de menu de contexto (right-click e long-press).
- Modos Tocar / Configurar (engrenagem abre o painel do switch).
- Cadeia de sinal do G1On na tela (5 slots, cor por tipo de efeito).
- Persistência da config dos switches em localStorage
  (`zoomboard:switch-config:v1`), com guarda de hidratação.

## Regras
- Português nas respostas. Sem emojis. Tudo leve (sem 3D), acabamento premium
  com CSS. Não quebrar o layout aprovado. Não implementar SysEx — só ganchos.
