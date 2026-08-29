# ZoomBoard

Controlador e editor **WebMIDI** para pedaleiras Zoom G1On / G1Xon, no
estilo HeadRush Prime: footswitches virtuais, tela touchscreen, barras de
LED dinâmicas e atalhos de teclado configuráveis -- tudo rodando 100% no
navegador, sem instalar nada.

O protocolo SysEx (handshake, troca de patch, nome do patch, afinador,
tap tempo) foi portado a partir do firmware de um controlador físico
baseado em Raspberry Pi Pico para o mesmo pedal, então o comportamento
segue o que foi validado em hardware real -- ver "Fidelidade ao
protocolo" abaixo.

## Requisitos

- Navegador com **Web MIDI API**: Chrome, Edge ou Opera (desktop ou
  Android). Firefox e Safari não suportam -- o app avisa na tela se
  detectar isso.
- O pedal **Zoom G1On/G1Xon conectado via USB direto no computador**
  (não precisa do controlador físico RP2040 no meio -- o navegador fala
  SysEx diretamente com o pedal).
- Servido via **HTTPS** (ou `localhost`), exigência da própria Web MIDI
  API. GitHub Pages já serve em HTTPS por padrão.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. Ao carregar, o navegador vai pedir
permissão de acesso MIDI (com SysEx) -- aceite pra conectar no pedal.

## Build

```bash
npm run build    # gera dist/
npm run preview  # serve o build de produção localmente, pra conferir
npm run lint      # checagem de tipos (tsc --noEmit)
```

## Deploy no GitHub Pages

Já vem com um workflow em `.github/workflows/deploy.yml` que builda e
publica automaticamente a cada push na branch `main`:

1. Suba este repositório pro GitHub.
2. Em **Settings → Pages → Source**, escolha **GitHub Actions** (só
   precisa fazer isso uma vez).
3. Dê push na `main` -- o Action builda e publica sozinho. O link fica
   disponível em Settings → Pages depois do primeiro run.

Se o seu branch principal for `master` em vez de `main`, ajuste o
`on: push: branches:` no topo do workflow.

`vite.config.ts` já usa `base: './'` (caminhos relativos), então
funciona tanto em `usuario.github.io/repo/` quanto em domínio próprio,
sem precisar editar nada pro nome do repositório.

## Fidelidade ao protocolo -- o que é real e o que é visual

A camada de MIDI (`src/lib/zoomMidi.ts`, `zoomProtocolEngine.ts`,
`fsActions.ts`, `tapEngine.ts`, `useZoomMidi.ts`) implementa o mesmo
protocolo SysEx do firmware do controlador físico:

- Handshake (Identity Request → Edit Mode → leitura do patch atual) e
  reconexão automática quando o pedal é plugado/desplugado.
- Troca de patch = Program Change direto (0-99), sem Bank Select CC --
  igual ao firmware, que não usa CC0/CC32 pra isso.
- Nome do patch decodificado dos últimos 8 bytes da resposta `0x28`
  (`PATCH_NAME_LEN`), com o mesmo tratamento de bytes não-imprimíveis do
  C++ original.
- Afinador (CC#81) e tap tempo -- ver limitações abaixo.

O que é **decorativo/demo**: a cadeia de efeitos (os 5 blocos coloridos
COMP/DRIVE/AMP/EQ/MOD/DELAY/REVERB na tela) não vem do pedal -- o
protocolo que temos documentado só expõe o **nome** do patch via SysEx,
não os parâmetros/efeitos de cada slot. Os nomes dos botões que você
ainda não visitou em cada banco (CLEAN, CRUNCH, LEAD...) também
continuam sendo os nomes de demonstração até você navegar até eles
com o pedal conectado (só o slot ativo no momento é atualizado com o
nome real).

## Limitações conhecidas (herdadas do firmware original)

- **Afinador (CC#81)**: marcado como INFERIDO na documentação de
  engenharia reversa original -- não validado empiricamente em
  hardware. Se não fizer o pedal entrar no modo afinador, pode ser que
  o CC ou os valores estejam diferentes na sua unidade/firmware.
- **Nome do patch com 10 bytes**: o firmware assume 8 bytes
  (`PATCH_NAME_LEN` em `zoomMidi.ts`); há uma menção não confirmada de
  variantes com 10 bytes em outra unidade/firmware. Se os nomes vierem
  cortados ou deslocados, esse é o primeiro lugar pra tentar ajustar.
- **Tap tempo**: o firmware físico nunca chegou a implementar isso
  (ficou reservado pro FS5, "pra depois"). Aqui no navegador o motor de
  tap tempo (`tapEngine.ts`) já está funcional e ligado ao switch
  TAP/TUNER -- é uma capacidade a mais da versão web, não uma port 1:1.

## Mapeamento de interação (switches virtuais vs. os 5 footswitches físicos)

O controlador físico original tem só 5 footswitches e usa um esquema de
"par/ímpar" (cada botão alterna entre 2 presets) mais um modo de
segurar-para-trocar-banco pra caber 10 bancos × 10 presets em 5 botões.
Essa lógica inteira continua disponível em `zoomProtocolEngine.ts`
(`handleFootswitchClick/Hold/LongHold`, `FS_ACTIONS`) caso um dia você
queira usar com um controlador MIDI físico de 5 botões -- mas **não é o
que dirige a grade de 10 presets na tela**, porque essa tem espaço de
sobra pra acesso direto:

- **10 footswitches de preset**: cada um seleciona diretamente um
  preset do banco ativo (sem par/ímpar -- não precisa, já que cada
  preset tem seu próprio botão).
- **BANK** (switch esquerdo): clique curto = próximo banco; segurar =
  banco anterior. Mantém a posição do preset ao trocar de banco.
- **TAP / TUNER** (switch direito): clique curto = tap tempo; segurar =
  liga/desliga afinador (reaproveita a mesma lógica de hold do
  firmware, só que ligada a este switch dedicado em vez do antigo FS4).

Se preferir outro mapeamento, é decisão de UI isolada em
`Pedalboard.tsx` (`handlePressStart`/`handlePressEnd`) -- a camada de
protocolo por baixo não muda.

## Estrutura

```
src/
├── lib/
│   ├── zoomMidi.ts           <- constantes SysEx, decode de nome de patch
│   ├── zoomProtocolEngine.ts <- handshake, troca de patch, máquina de estados
│   ├── fsActions.ts          <- tabela de ações por footswitch/banco/paridade
│   ├── tapEngine.ts          <- tap tempo + fórmulas de encode/decode de parâmetro
│   ├── useZoomMidi.ts        <- hook React: Web MIDI API + motor acima
│   └── pedalboard.ts         <- modelo de dados visual (switches, patches demo)
└── components/                <- a "belezura": tela, footswitches, LEDs, diálogo de config
```
