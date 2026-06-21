---
tipo: design
status: rascunho
updated: 2026-06-21
description: Investigação e proposta do design system: tokens, temas, camadas de componentes e padrões de UI das superfícies do produto, com white-label/multi-tenant para forms e landing pages.
---

# Design System — Marketero

> Investigação e proposta de **design system** para o Marketero — a plataforma que unifica
> **marketing, vendas e atendimento** num só cérebro de IA (ver [visao-geral.md](../produto/visao-geral.md)).
> Este documento define a estratégia de **tokens, temas, camadas de componentes e padrões de UI**
> para as superfícies do produto (inbox unificado, Kanban de funil, editor visual de workflows,
> page/form builders, dashboards de métricas, agentes conversacionais) e para o desafio extra de
> **white-label / multi-tenant** dos forms e landing pages hospedados.
>
> Stack real do projeto (confirmado no código): monorepo **Turborepo + Bun**, **Next.js 16**,
> **React 19**, **Tailwind v4 (CSS-first `@theme`)**, **shadcn/ui v4** (style `radix-nova`,
> baseColor `neutral`), **radix-ui**, **lucide-react**, **next-themes**, tokens em **OKLCH**.
> Os componentes vivem no pacote `@workspace/ui`; o app consumidor é `apps/web`.
>
> **Resumo da decisão**: não inventar um sistema paralelo — **adotar a camada de tokens semânticos
> que o shadcn v4 já expõe em `packages/ui/src/styles/globals.css`** como o contrato único, e
> construir por cima dela três coisas que faltam: (1) uma **identidade de marca** (hoje o tema é
> 100% cinza, chroma zero), (2) **paletas funcionais** (canais sociais, status de automação,
> data-viz para métricas), e (3) **theming multi-tenant** por troca de variáveis CSS para o
> conteúdo white-label.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Estado atual do código](#2-estado-atual-do-código)
3. [Princípios de design](#3-princípios-de-design)
4. [Camadas do sistema (arquitetura)](#4-camadas-do-sistema-arquitetura)
5. [Tokens — fundação](#5-tokens--fundação)
   - 5.1 [Cor de marca e semântica](#51-cor-de-marca-e-semântica)
   - 5.2 [Paleta de canais sociais](#52-paleta-de-canais-sociais)
   - 5.3 [Status de automação e atendimento](#53-status-de-automação-e-atendimento)
   - 5.4 [Data-viz / charts](#54-data-viz--charts)
   - 5.5 [Tipografia](#55-tipografia)
   - 5.6 [Espaçamento, raio, elevação, motion](#56-espaçamento-raio-elevação-motion)
6. [Temas: claro/escuro + white-label multi-tenant](#6-temas-claroescuro--white-label-multi-tenant)
7. [Inventário de componentes por superfície](#7-inventário-de-componentes-por-superfície)
8. [Padrões transversais](#8-padrões-transversais)
   - 8.1 [Densidade](#81-densidade)
   - 8.2 [Estados (loading / vazio / erro / IA)](#82-estados-loading--vazio--erro--ia)
   - 8.3 [Acessibilidade](#83-acessibilidade)
   - 8.4 [Conteúdo, i18n e pt-BR](#84-conteúdo-i18n-e-pt-br)
   - 8.5 [Iconografia](#85-iconografia)
9. [Governança e workflow de adoção](#9-governança-e-workflow-de-adoção)
10. [Decisões em aberto](#10-decisões-em-aberto)

---

## 1. Sumário executivo

O Marketero é uma aplicação de **alta densidade de informação e muitas superfícies heterogêneas**
— um inbox estilo helpdesk, um Kanban com automações, um editor de nós (React Flow), construtores
visuais de página/formulário, dashboards de métricas e fluxos conversacionais de IA. Esse perfil
exige um design system **mais rígido na fundação (tokens) e mais flexível nas pontas (superfícies)**.

A boa notícia: o template já entrega 90% da infraestrutura. O shadcn/ui v4 com Tailwind v4 expõe
um **contrato de tokens semânticos em OKLCH** (`--background`, `--primary`, `--card`, `--sidebar-*`,
`--chart-1..5`) e os mapeia para utilitários Tailwind via `@theme inline`. Qualquer componente do
catálogo shadcn consome esses tokens automaticamente. **Esse contrato é o design system** — não
deve existir nenhum hex solto nem token concorrente.

O que falta e este documento propõe:

| Lacuna | Estado hoje | Proposta |
|---|---|---|
| **Identidade visual** | Tema 100% cinza (todas as cores `oklch(L 0 0)`, chroma 0) | Definir um `--primary` de marca + neutros com leve temperatura |
| **Cores de canal** | Inexistente | Tokens `--channel-*` (IG, FB, WhatsApp, TikTok, X, Mercado Livre…) |
| **Status semânticos** | Só `--destructive` | `--success / --warning / --info` + tokens de status de automação |
| **Data-viz** | `--chart-1..5` em escala de cinza | Paleta categórica + sequencial legível em claro/escuro |
| **White-label** | next-themes só faz claro/escuro | Tema por tenant via troca de variáveis CSS no escopo do conteúdo hospedado |
| **Padrões de superfície** | Nenhuma página real ainda (`page.tsx` é placeholder) | Inventário de componentes de domínio (§7) |

A regra de ouro: **tudo que pinta a tela lê um token semântico**; a marca e o tenant trocam o
*valor* do token, nunca o componente.

---

## 2. Estado atual do código

Levantamento factual (não inferido) do que existe no repositório hoje:

- **Monorepo**: `apps/web` (Next.js 16, App Router, RSC) + `packages/ui` (`@workspace/ui`), além de
  `packages/eslint-config` e `packages/typescript-config`. Gerenciado por **Turborepo + Bun**.
- **Componentes**: o pacote `@workspace/ui` tem apenas `button.tsx` instalado. O resto do catálogo
  shadcn é adicionado sob demanda com `bun x shadcn@latest add <comp> -c apps/web` (vai para
  `packages/ui/src/components`). Aliases já configurados em `components.json`
  (`@workspace/ui/components`, `.../lib/utils`, etc.).
- **Tokens**: definidos em `packages/ui/src/styles/globals.css`.
  - Bloco `@theme inline` mapeia variáveis CSS → utilitários Tailwind (`--color-primary`, etc.).
  - `:root` (claro) e `.dark` (escuro) definem os valores em **OKLCH**.
  - **Importante**: todos os valores de cor têm **chroma 0** (`oklch(0.205 0 0)`) — ou seja, é o
    tema neutro/cinza padrão do shadcn. Não há marca. (Única exceção: `--sidebar-primary` no dark,
    que herdou um roxo `oklch(0.488 0.243 264.376)` do template — inconsistência a corrigir.)
  - Escala de raio derivada de um único `--radius: 0.625rem` (sm→4xl calculados por fator).
- **Tipografia**: `apps/web/app/layout.tsx` carrega **Geist** (`--font-sans`) e **Geist Mono**
  (`--font-mono`) via `next/font/google`. `--font-heading` aponta para `--font-sans` (sem fonte de
  display dedicada ainda).
- **Tema**: `next-themes` via `ThemeProvider` em `apps/web/components/theme-provider.tsx`;
  `suppressHydrationWarning` no `<html>`. Variante dark por classe (`@custom-variant dark (&:is(.dark *))`).
- **Config shadcn**: style `radix-nova`, `baseColor: neutral`, `cssVariables: true`,
  `iconLibrary: lucide`, `rsc: true`. RTL desligado.
- **UI real**: ainda não existe. `apps/web/app/page.tsx` é placeholder. **É o momento ideal para
  fixar o sistema antes de qualquer tela nascer torta.**

> Conclusão: a fundação técnica é sólida e idiomática (Tailwind v4 + shadcn v4 + OKLCH). O trabalho
> de design system aqui é **curadoria de tokens e padrões**, não reescrita de infraestrutura.

---

## 3. Princípios de design

Princípios derivados do produto (marketing/vendas/atendimento com IA no centro), não genéricos:

1. **Operação antes de estética.** O usuário-alvo (PME/agência BR, ver [concorrentes.md](../investigacoes/concorrentes.md))
   passa o dia *dentro* da ferramenta. Densidade legível, ações rápidas e zero fricção ganham de
   telas bonitas e vazias. Inspiração: helpdesks (Intercom, Front), não landing pages.
2. **A IA é um cidadão de primeira classe, e sempre identificável.** Toda sugestão, classificação
   ou resposta gerada por GraphRAG tem um **tratamento visual próprio** (cor de accent + ícone
   "sparkle") que a distingue de conteúdo humano. Transparência de IA é requisito de confiança,
   não enfeite.
3. **Multicanal sem virar arco-íris.** Cada canal (IG/FB/WhatsApp/TikTok/X) tem cor própria, mas
   usada como **acento pontual** (badge, ícone, borda lateral), nunca como fundo de superfície —
   senão o inbox unificado vira caos cromático.
4. **Um token, muitos donos.** A mesma UI roda para o operador interno (tema do produto) e para o
   lead final (form/landing white-label do tenant). O componente é o mesmo; só o valor do token muda.
5. **Acessível por padrão (WCAG AA).** Contraste, foco visível e navegação por teclado não são
   opcionais — em parte porque os forms hospedados são públicos e podem cair sob exigência legal.
6. **pt-BR é a língua-mãe.** Copy, formatação de data/número/moeda e pluralização nascem em
   português brasileiro; i18n é estrutural, não um patch.

---

## 4. Camadas do sistema (arquitetura)

```
┌─────────────────────────────────────────────────────────────┐
│ L4  Superfícies / Páginas (apps/web/app/**)                  │  rotas, layouts, composição
├─────────────────────────────────────────────────────────────┤
│ L3  Componentes de domínio (@workspace/ui + apps/web)        │  InboxThread, KanbanCard,
│                                                              │  WorkflowNode, MetricCard, AIReply
├─────────────────────────────────────────────────────────────┤
│ L2  Primitivos shadcn (@workspace/ui/components/*)           │  Button, Dialog, Card, Tabs...
├─────────────────────────────────────────────────────────────┤
│ L1  Tokens semânticos (globals.css :root / .dark / tenant)   │  --primary, --channel-wa, --chart-1
├─────────────────────────────────────────────────────────────┤
│ L0  Primitivos de cor/escala (OKLCH, ramps)                  │  valores brutos — só referenciados
└─────────────────────────────────────────────────────────────┘
```

Regras de dependência (de cima para baixo apenas):

- **L4 não pinta nada diretamente.** Página compõe componentes; não usa `bg-[#...]` nem cor crua.
- **L3 é onde mora a "linguagem Marketero".** Componentes de domínio encapsulam as decisões de
  produto (como um card de lead se parece, como uma resposta de IA é marcada). Vivem em
  `@workspace/ui` quando reutilizáveis entre apps; em `apps/web/components` quando específicos.
- **L2 é shadcn puro**, instalado via CLI. Não fork sem necessidade; customização vem de tokens.
- **L1 é o contrato.** Único lugar onde valores de cor existem. Claro/escuro/tenant são variações
  de L1 — L2/L3/L4 não sabem qual tema está ativo.
- **L0** são as rampas de cor OKLCH de referência (documentadas, não necessariamente todas no CSS).

---

## 5. Tokens — fundação

Todos os tokens são variáveis CSS em `oklch()`, declaradas em `:root` (claro) e sobrescritas em
`.dark`. Naming segue o shadcn (`--<role>` e `--<role>-foreground`) para que os componentes do
catálogo funcionem sem patch.

### 5.1 Cor de marca e semântica

**Problema central**: hoje `--primary` é `oklch(0.205 0 0)` — preto-acinzentado, chroma zero. Um
produto de marketing precisa de uma marca. Proposta (valores iniciais, a calibrar com o time):

- **Definir um hue de marca** e aplicá-lo a `--primary` mantendo a *lightness* atual (para não
  quebrar contraste de `--primary-foreground`). Ex.: trocar `oklch(0.205 0 0)` por
  `oklch(0.205 0.09 264)` (mesma luminosidade, agora com chroma/hue). Opções de direção em §10.
- **Neutros com leve temperatura**: dar aos cinzas um chroma mínimo (~0.005–0.01) no mesmo hue da
  marca, para a UI parecer intencional em vez de "cinza de template".
- **Acento de IA** — token dedicado para tudo que vem do GraphRAG:
  ```
  --ai            /* fundo sutil de bolha/sugestão de IA */
  --ai-foreground /* texto/ícone do tratamento de IA   */
  --ai-border     /* borda/realce de elementos gerados  */
  ```
  Sugestão de direção: um hue distinto da marca (ex.: violeta/índigo) para que "isto é IA" seja
  lido instantaneamente sem depender só do ícone sparkle.

**Status semânticos** (faltam — só existe `--destructive`):

| Token | Uso | Direção OKLCH (hue) |
|---|---|---|
| `--success` / `--success-foreground` | publicado, entregue, conversão | verde (~145) |
| `--warning` / `--warning-foreground` | pendente, rate-limit, aprovação | âmbar (~85) |
| `--info` / `--info-foreground` | dica neutra, estado informativo | azul (~240) |
| `--destructive` *(existe)* | erro, falha de envio, exclusão | vermelho (~27) |

> **Por que OKLCH e não HSL/hex**: a *lightness* (L) é perceptualmente uniforme. Isso significa que
> dá para gerar `success`, `warning`, etc. **na mesma luminosidade do `--primary`**, garantindo que
> todos os status tenham contraste equivalente contra o fundo — algo trabalhoso em hex. E permite
> theming multi-tenant trocando só o **hue** sem reavaliar contraste (ver §6).

### 5.2 Paleta de canais sociais

O inbox unificado, o Kanban e os dashboards misturam mensagens/posts de vários canais. Cada canal
precisa de identidade reconhecível, usada como **acento** (ícone, badge, borda-de-4px lateral do
card), nunca como fundo de container.

```
--channel-instagram   /* magenta/rosa do gradiente IG */
--channel-facebook    /* azul Meta                     */
--channel-whatsapp    /* verde WhatsApp                */
--channel-tiktok      /* preto/ciano/magenta TikTok    */
--channel-x           /* preto/branco X (adaptar p/ dark) */
--channel-mercadolivre/* amarelo ML                    */
--channel-web         /* forms/landing próprios → cor de marca */
```

Diretrizes:
- Cada token tem par `--channel-*-foreground` para texto legível sobre o acento.
- Em **dark mode**, canais quase-pretos (X, TikTok) recebem variação clara para não sumir.
- Cores de canal **não** participam de data-viz (charts usam `--chart-*`) — para não confundir
  "volume do Instagram" (categoria de canal) com "série 1 do gráfico".
- Ícones de canal: usar marcas oficiais (lucide tem alguns; o resto via SVG próprio em
  `@workspace/ui/components/channel-icon.tsx`). Respeitar guidelines de marca de cada plataforma.

### 5.3 Status de automação e atendimento

O motor de automação (evento → classificação → ação, ver [kanban.md](../funcionalidades/kanban.md))
e o inbox precisam de uma linguagem de status consistente:

- **Estado do agente/automação**: `idle`, `running`, `waiting` (timer/robô armado), `escalated`
  (escalado a humano), `failed`. Mapeiam para `--info/--success/--warning/--destructive` + ícone.
- **Classificação de IA do comentário/mensagem** (dúvida, elogio, reclamação, intenção de compra,
  spam): usar **badges** com cor derivada de status semântico — ex.: intenção de compra →
  `--success`, reclamação → `--warning`, spam → `--muted`. **Não** criar um novo hue por categoria;
  reaproveitar a escala semântica mantém o sistema enxuto.
- **Estágio do Kanban**: a cor da coluna/etapa é configurável **por tenant/funil** (dado, não
  token global) — o componente lê uma cor vinda da config do funil, validada contra contraste.

### 5.4 Data-viz / charts

`--chart-1..5` já existem, mas em escala de cinza. Métricas unificadas (§5 da visão-geral) são um
pilar do produto, então precisam de paleta real:

- **Categórica** (séries distintas, ex.: canais ou campanhas): 5–8 hues bem separados em OKLCH,
  todos na mesma faixa de L para peso visual equivalente. Expandir `--chart-1..8`.
- **Sequencial** (intensidade, ex.: heatmap de horário de engajamento): rampa de um hue da marca,
  variando só L.
- **Divergente** (ex.: variação +/- de conversão): dois hues (success ↔ destructive) com neutro no
  meio.
- Garantir distinção em **daltonismo** (não depender de vermelho/verde como único diferenciador —
  combinar com forma/rótulo) e legibilidade em dark mode (recalcular L, não só inverter).
- Biblioteca: shadcn já casa com **Recharts** (componente `chart` do catálogo), que consome
  `--chart-*` nativamente. Adotar.

### 5.5 Tipografia

- **Sans (UI/corpo)**: Geist — já carregada, manter. Ótima para densidade e telas.
- **Mono**: Geist Mono — manter para IDs, JSON de webhooks, tokens de API, editor de expressões do
  workflow.
- **Heading/display**: hoje `--font-heading` = `--font-sans`. Decisão em aberto (§10): manter Geist
  para um visual coeso e técnico, **ou** introduzir uma fonte de display com mais personalidade
  para marketing/marca. Recomendação inicial: **manter Geist** no produto (operação) e reservar
  fontes de display apenas para o conteúdo white-label, onde o tenant escolhe.
- **Escala tipográfica**: adotar a escala utilitária do Tailwind (`text-xs` → `text-4xl`) com line-heights
  do shadcn. Para densidade de operação, o corpo padrão é `text-sm` (14px), não `text-base`.
- **Pesos**: 400 (corpo), 500 (labels/ênfase), 600 (títulos). Evitar 700+ na UI de operação.

### 5.6 Espaçamento, raio, elevação, motion

- **Espaçamento**: escala base-4 do Tailwind (`1`=4px). Densidade de operação favorece passos
  menores (`gap-2`, `p-3`) em listas/inbox; superfícies de marketing (landing) podem respirar mais.
- **Raio**: já parametrizado por `--radius: 0.625rem` com derivados sm→4xl. Manter. Componentes de
  operação tendem a `--radius-sm/md`; cards de marketing a `--radius-lg/xl`.
- **Elevação**: usar sombras do Tailwind com parcimônia. Em apps densos, **borda + `--card`** separa
  melhor que sombra pesada. Reservar sombra para overlays (dialog, popover, dropdown, comando).
- **Motion**: `tw-animate-css` já instalado. Princípios: transições curtas (150–200ms) e funcionais
  (feedback de ação, entrada de toast/sheet); **respeitar `prefers-reduced-motion`**; nada de
  animação decorativa na UI de operação. O editor de workflow (React Flow) tem motion próprio
  (pan/zoom/conexão de nós) — não sobrepor.

---

## 6. Temas: claro/escuro + white-label multi-tenant

Há **dois eixos de tema independentes** no Marketero, e é crucial não confundi-los:

**Eixo A — aparência do produto (operador interno): claro ⇄ escuro.**
Já resolvido por `next-themes` + classe `.dark`. Operadores escolhem; persiste por usuário.

**Eixo B — marca do conteúdo hospedado (white-label por tenant).**
Os forms e landing pages hospedados (ver [editores-ui-page-form-builders.md](../investigacoes/editores-ui-page-form-builders.md)
e visão-geral §"Web forms próprios") são **públicos e devem exibir a marca do cliente do Marketero**,
não a do Marketero. Isso é um sistema de theming por tenant.

Estratégia recomendada para o Eixo B — **escopo de variáveis CSS por tenant** (sem rebuild):

```css
/* tema base do conteúdo hospedado herda os tokens semânticos */
[data-tenant] { /* defaults = tokens do design system */ }

/* override por tenant, injetado no SSR a partir da config salva */
[data-tenant="acme"] {
  --primary: oklch(0.55 0.18 28);     /* cor da marca Acme   */
  --radius: 1rem;                      /* tenant mais arredondado */
  --font-sans: "Inter", sans-serif;   /* fonte da marca       */
}
```

Por que essa abordagem:
- **Zero rebuild / zero CSS por tenant**: o builder (Puck/SurveyJS, conforme o doc de page builders)
  renderiza componentes que leem tokens; o tenant só fornece *valores*.
- **OKLCH faz o trabalho pesado**: o tenant escolhe **um hue de marca** e as variações (hover,
  muted, foreground) são derivadas mantendo L — contraste continua AA sem o tenant pensar nisso.
- **Validação de contraste no momento de salvar**: ao gravar a cor da marca, calcular contraste do
  par primary/foreground e avisar se reprova AA (especialmente importante em form público).
- **Isolamento**: o conteúdo hospedado roda sob `[data-tenant]` (ou Shadow DOM no caso embedável/iframe)
  para os tokens do tenant **não vazarem** para o chrome do produto Marketero e vice-versa.

Resumo dos dois eixos:

| | Eixo A (produto) | Eixo B (white-label) |
|---|---|---|
| Quem vê | Operador interno | Lead/visitante público |
| Quem controla | Usuário (toggle) | Config do tenant |
| Mecanismo | `.dark` + next-themes | `[data-tenant]` + vars injetadas no SSR |
| Tokens que mudam | L (luminosidade) | hue/chroma da marca, fonte, raio |
| Escopo | App inteiro | Só a árvore do conteúdo hospedado |

---

## 7. Inventário de componentes por superfície

Mapeamento das superfícies do produto → primitivos shadcn (L2) a instalar + componentes de domínio
(L3) a construir. Serve de backlog de UI.

### 7.1 Shell de aplicação
- **L2**: `sidebar`, `breadcrumb`, `dropdown-menu`, `avatar`, `command` (paleta ⌘K), `tooltip`,
  `sonner` (toasts).
- **L3**: `AppSidebar` (navegação por módulo: Inbox, Funil, Campanhas, Workflows, Builder, Métricas),
  `TenantSwitcher`, `GlobalSearch`, `NotificationCenter`.

### 7.2 Inbox unificado (DMs/comentários multicanal)
- **L2**: `resizable` (3 painéis: lista / conversa / contexto), `scroll-area`, `tabs`, `badge`,
  `textarea`, `popover`.
- **L3**: `ConversationListItem` (com `--channel-*` na borda lateral), `MessageThread`,
  `MessageBubble` (humano vs `AIReply` com tratamento `--ai`), `ChannelBadge`, `ClassificationBadge`
  (dúvida/elogio/reclamação/compra/spam), `SuggestedReplyCard` (sugestão GraphRAG + ações
  Responder/Ignorar/Sugerir produto/Escalar), `ContactContextPanel` (dados do grafo).

### 7.3 Funil Kanban + automações
- **L2**: `card`, `badge`, `dropdown-menu`, `dialog`, `select`. (Drag-and-drop: `dnd-kit`, fora do
  shadcn — adicionar.)
- **L3**: `KanbanBoard`, `KanbanColumn` (cor de etapa por config do funil), `LeadCard`,
  `TriggerBadge` / `RobotBadge` (distinção trigger-move vs robô-age, ver
  [kanban.md](../funcionalidades/kanban.md)), `StageAutomationPanel`.

### 7.4 Editor visual de workflows
- **Base**: **React Flow (`@xyflow/react`)** conforme [workflows-visuais.md](../investigacoes/workflows-visuais.md).
  React Flow **não é shadcn** — estilizar seus nós/edges com tokens do sistema para coerência.
- **L3**: `WorkflowCanvas`, `TriggerNode` / `ActionNode` / `ConditionNode` / `AINode` (com accent
  `--ai`), `NodeInspector` (painel lateral de config), `EdgeLabel`, `NodePalette` (drag de nós).
- **Cuidado**: os nós devem ler `--card`, `--border`, `--primary`, `--ai` — não cores hardcoded —
  para acompanhar tema claro/escuro.

### 7.5 Page / Form builder (hosted + embedável)
- **Base**: Puck (páginas) + SurveyJS/Formbricks (forms), conforme
  [editores-ui-page-form-builders.md](../investigacoes/editores-ui-page-form-builders.md).
- **L3**: blocos do builder (`HeroBlock`, `FormBlock`, `CTABlock`, `ImageBlock`…) que **renderizam
  sob `[data-tenant]`** (Eixo B). Os controles do editor usam tokens do produto; o *preview/output*
  usa tokens do tenant. Anti-spam (captcha/Turnstile) e estados de submissão são parte do form.

### 7.6 Dashboards / métricas
- **L2**: `chart` (Recharts), `card`, `table`, `tabs`, `select` (período), `skeleton`.
- **L3**: `MetricCard` (KPI + delta com `--success`/`--destructive`), `TimeSeriesChart`,
  `ChannelBreakdown` (usa `--channel-*` aqui sim, como categoria), `FunnelChart`,
  `DateRangePicker`.

### 7.7 Criativos com IA (Nano Banana)
- **L3**: `CreativeGenerator` (prompt + parâmetros), `CreativeGrid` (resultados),
  `CreativePreview`, estados de geração (loading/streaming/erro) com tratamento `--ai`.

### 7.8 Agente conversacional (config/preview)
- Ver [agentes.md](../funcionalidades/agentes.md). **L3**: `AgentPreviewChat`
  (testar o agente conduzindo um Form via FSM), `SlotInspector`, `FormBinding`.

> Priorização sugerida de instalação dos primitivos shadcn: **shell + inbox primeiro** (maior uso
> diário), depois Kanban e métricas, depois os editores (que são projetos por si).

---

## 8. Padrões transversais

### 8.1 Densidade
Produto de operação → **densidade alta por padrão**. Corpo `text-sm`, paddings compactos em listas.
Considerar um toggle de densidade (confortável/compacto) no shell para usuários que passam o dia no
inbox. Conteúdo white-label (landing/form público) usa densidade **confortável** — é vitrine, não
operação.

### 8.2 Estados (loading / vazio / erro / IA)
Todo componente de dados define quatro estados explícitos:
- **Loading**: `skeleton` que reflete o layout final (não spinner genérico).
- **Vazio**: ilustração/ícone + copy acionável em pt-BR ("Nenhuma conversa ainda. Conecte um canal
  para começar."). Não deixar tela em branco.
- **Erro**: mensagem clara + ação de retry; nunca stack trace ao usuário.
- **IA**: estados próprios de "gerando…" (streaming), "sugestão pronta", "IA não tem certeza →
  escalar". Sempre com o accent `--ai` e ícone sparkle, deixando claro que é geração automática.

### 8.3 Acessibilidade
- **WCAG AA** mínimo: contraste ≥ 4.5:1 (texto), foco visível (`--ring`, já no `outline-ring/50`).
- Componentes shadcn herdam acessibilidade do **radix-ui** (roles, ARIA, foco em dialogs/menus) —
  manter; não recriar primitivos à mão.
- Navegação por teclado em tudo que é operação (inbox, Kanban): atalhos + ⌘K (`command`).
- Forms hospedados (públicos): labels associados, mensagens de erro programáticas, `aria-live` em
  validação — risco legal além de boa prática.
- Não usar **cor como único portador de significado** (status, classificação, charts) — sempre
  acompanhar de ícone/rótulo/forma.

### 8.4 Conteúdo, i18n e pt-BR
- **pt-BR é a base.** Formatação de data (`dd/MM/yyyy`), número (`1.234,56`) e moeda (`R$`) via
  `Intl` com locale `pt-BR`. Considerar `next-intl`/dictionary desde já — retrofit de i18n é caro.
- **Voz**: direta, operacional, sem jargão de marketing gringo. Microcopy de IA deve deixar claro
  quando algo foi gerado/sugerido automaticamente.
- Conteúdo white-label pode ter idioma definido pelo tenant (lead final pode não falar português).

### 8.5 Iconografia
- **lucide-react** já é a lib oficial (config shadcn + dependência). Usar exclusivamente lucide na
  UI de produto para coerência de traço.
- **Ícones de canal** (logos IG/FB/WhatsApp/TikTok/X) **não** são lucide — viram um componente
  `ChannelIcon` com SVGs oficiais, respeitando brand guidelines de cada plataforma.
- Ícone de IA: padronizar um (ex.: `Sparkles`) como marca visual de tudo que é GraphRAG.

---

## 9. Governança e workflow de adoção

**Como adicionar/alterar:**
- **Primitivo (L2)**: `bun x shadcn@latest add <comp> -c apps/web` → cai em
  `packages/ui/src/components`. Não editar à mão salvo necessidade; preferir customização por token.
- **Token (L1)**: alterações só em `packages/ui/src/styles/globals.css`, sempre adicionando o par
  claro **e** escuro (e revisando impacto em white-label). PR exige checagem de contraste.
- **Componente de domínio (L3)**: em `@workspace/ui` se reutilizável entre apps; em
  `apps/web/components` se específico do app. Sempre consumindo tokens, nunca cor crua.

**Regras de lint/disciplina:**
- Proibir hex/`rgb()` solto em `.tsx` (lint rule) — força uso de utilitários de token.
- `--font-heading`/`--sidebar-primary` no dark precisam de **correção** (hoje há um roxo herdado
  inconsistente) — primeira dívida técnica a quitar ao definir a marca.
- Documentar cada token novo neste arquivo (tabela) no mesmo PR que o introduz.

**Ferramenta de referência viva (recomendado, fase 2):** um **Storybook** ou rota interna
`/_design` que renderize a paleta, tipografia e o catálogo de componentes de domínio — fonte única
de verdade visual para o time e para QA de contraste.

---

## 10. Decisões em aberto

Itens que dependem do time (produto/marca) antes de virar token definitivo:

1. **Hue de marca do `--primary`.** Direções plausíveis para um SaaS de marketing BR:
   - **Violeta/Índigo** (`~265`) — moderno, "IA", diferencia de concorrentes verde-WhatsApp.
   - **Azul** (`~240`) — confiança/SaaS, mas saturado no mercado de produtividade.
   - **Verde-teal** (`~165`) — afinidade com WhatsApp/conversão, risco de colidir com canal.
   - **Laranja/coral** (`~40`) — energia/marketing, alta distinção, cuidado com contraste.
   > Recomendação para começar: **violeta/índigo**, separando claramente a *marca* do *accent de IA*
   > (que pode ser um violeta vizinho, ou inverter — marca azul + IA violeta). A decidir junto.
2. **Accent de IA**: hue dedicado vs derivado da marca. (Recomendo dedicado, para "isto é IA" ser
   inequívoco.)
3. **Fonte de display**: manter Geist em tudo (coeso/técnico) vs fonte de marca para superfícies de
   marketing. (Recomendo Geist no produto; display só no white-label, escolhido pelo tenant.)
4. **Toggle de densidade** (confortável/compacto) no shell: incluir no MVP ou adiar?
5. **Isolamento do white-label**: `[data-tenant]` + CSS vars (mais simples) vs Shadow DOM (mais
   isolado, exigido no modo embedável/iframe de terceiros). Provável: **ambos** — vars no hosted,
   Shadow DOM no embed.
6. **Storybook vs rota `/_design`** como referência viva.

---

## Documentos relacionados

- [visao-geral.md](../produto/visao-geral.md) — pilares do produto e proposta de valor.
- [concorrentes.md](../investigacoes/concorrentes.md) — referências de mercado e benchmarks de UI.
- [workflows-visuais.md](../investigacoes/workflows-visuais.md) — React Flow para o editor de nós (§7.4).
- [editores-ui-page-form-builders.md](../investigacoes/editores-ui-page-form-builders.md) — Puck/SurveyJS para o
  builder white-label (§7.5, §6).
- [kanban.md](../funcionalidades/kanban.md) — modelo trigger/robô do Kanban (§7.3).
- [agentes.md](../funcionalidades/agentes.md) — agente conversacional (§7.8).
- Código de tokens: `packages/ui/src/styles/globals.css`. Config: `packages/ui/components.json`.
