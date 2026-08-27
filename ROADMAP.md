# ZoomBoard — Roadmap e histórico

Registro do que já foi feito, **como** foi feito e **por quê**. Serve para
retomar o projeto em uma nova sessão sem reconstruir o contexto do zero.
Complementa `HANDOFF.md` (estado atual + próximos passos) e `PRD.md` (requisitos).

---

## Visão geral do produto
ZoomBoard é um editor/controlador **WebMIDI** para a pedaleira **Zoom
G1On/G1Xon**, feito para quem está com a tela da pedaleira queimada e não
consegue editar patches nela. Roda no navegador (PC e Android), é leve e será
distribuído de graça para a comunidade. A camada MIDI/SysEx real fica a cargo do
Claude; o v0 cuida só da GUI.

---

## FEITO

### 1. UI base do pedalboard (sessões anteriores)
**O quê:** casca visual completa e interativa — chassi estilo HeadRush, tela
central emulando touchscreen, 12 footswitches (BANK + TAP/TUNER laterais e 2x5
embaixo), anéis de LED configuráveis, modos Tocar/Configurar e diálogo de
config por switch.
**Como:** Next.js 16 + React 19 + Tailwind v4, sem engine 3D — só CSS/React.
Estado central em `components/pedalboard.tsx`; catálogo de efeitos e defaults em
`lib/pedalboard.ts`; tokens de design e keyframes de LED em `app/globals.css`.
**Por quê:** leveza (rodar liso em Android e PCs modestos) e manutenção simples.
Sem 3D para não pesar. Layout espelha o hardware real para o usuário se orientar.

### 2. Teclado configurável + bloqueio de context-menu (sessões anteriores)
**O quê:** cada switch pode ser acionado por uma tecla mapeável (com resolução
de conflitos); right-click e long-press bloqueados na superfície.
**Por quê:** uso ao vivo com teclado/pedal USB; o bloqueio evita abrir o menu do
navegador por engano durante a performance.

### 3. Persistência local da configuração (sessões anteriores)
**O quê:** nome, tecla, cor, modo de LED, brilho e pulso de cada switch são
salvos no navegador.
**Como:** `localStorage`, chave `zoomboard:switch-config:v1`, com guarda de
hidratação (evita mismatch de SSR) e validação dos IDs ao carregar.
**Por quê:** o usuário não pode perder a configuração ao recarregar a página.
Observação: o PRD antigo marcava isto como pendente — a UI está à frente do doc.

### 4. Deploy no GitHub Pages (sessão atual)
**O quê:** o app agora é publicado como site estático em
`https://angelomiggliori.github.io/ZoomBoard` via GitHub Actions.
**Como:**
- `next.config.mjs`: `output: 'export'` (site 100% estático, pois o Pages não
  roda Node), `images.unoptimized` (sem otimizador do Next no Pages),
  `trailingSlash: true` (gera `index.html` por pasta e evita 404), e
  `basePath`/`assetPrefix` = `/ZoomBoard` ligados por
  `process.env.GITHUB_PAGES === 'true'`.
- `.github/workflows/deploy.yml`: instala com pnpm (`--frozen-lockfile`),
  builda com `GITHUB_PAGES=true`, sobe `./out` como artifact e publica com
  `actions/deploy-pages`. Dispara em push na `main` e manualmente
  (`workflow_dispatch`).
- `public/.nojekyll`: impede o Jekyll de ignorar as pastas `_next`.
- `.gitignore`: ignora `out/`.
**Por quê:**
- O `basePath` é condicional para o preview do v0 e o `next dev` continuarem
  funcionando na raiz "/"; só o build de produção no CI usa `/ZoomBoard`. Sem
  isso, CSS e imagens quebrariam no Pages (repo de projeto = URL com subpasta).
- GitHub Actions (em vez de "Deploy from a branch") foi escolha do usuário e é o
  caminho recomendado para build de framework.
**Validação:** build local com `GITHUB_PAGES=true` gera `out/` com `.nojekyll` e
assets prefixados por `/ZoomBoard/`. Confirmado.

#### Incidente resolvido (sessão atual)
Ao ativar o Pages, o botão "Configure" do card sugerido do GitHub criou um
workflow genérico `nextjs.yml` (commitado direto no repo) que rodou e falhou —
faltava o `basePath`. Foi removido via API do GitHub. Lição: ignorar esse card;
o workflow correto é o nosso `deploy.yml`.

---

## A FAZER (resumo — detalhes e prioridades em HANDOFF.md)
1. Fidelidade visual à HeadRush Prime: LED em barra (não anel), placa de nome
   translúcida "retroiluminada", footswitch hexagonal cromado, chassi preto com
   filete dourado. PRIORIDADE MÁXIMA.
2. Editor de parâmetros por efeito (só a UI + ganchos).
3. Status MIDI real na top bar (só o gancho; hoje `midiConnected={false}` fixo).
4. Futuro: versão de 5 switches, presets de layout, import/export JSON, PWA.

## Fora do escopo do v0
Implementação de MIDI/SysEx (detecção, leitura/escrita de parâmetros, I/O) — é
responsabilidade do Claude. O v0 só mantém props/callbacks prontos para conectar.
