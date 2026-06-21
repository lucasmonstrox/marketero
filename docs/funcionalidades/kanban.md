---
tipo: funcionalidade
status: rascunho
updated: 2026-06-21
description: Design dos triggers e automações do funil Kanban estilo Bitrix24; invariante trigger-move vs robô-age, com GraphRAG roteando as transições.
---

# Marketero — Triggers e Automações do Kanban (estilo Bitrix24)

> Funil em Kanban onde cada movimentação de card dispara automações: **triggers** movem o card para uma etapa, **robôs** executam ações ao entrar nela — com a IA GraphRAG roteando a transição. Invariante: **tudo que MOVE card é trigger; tudo que age DENTRO da etapa (inclusive armar um timer) é robô.**

## Visão geral

O Marketero modela suas operações de marketing, vendas e atendimento como **funis em Kanban**: cada coluna é uma **etapa** do funil e cada card é um lead/contato/negócio que percorre essas etapas. O diferencial não é o board em si (concorrentes como BotConversa, Kommo e Clint já vendem CRM Kanban no WhatsApp — ver [concorrentes.md](../investigacoes/concorrentes.md)), mas o que move e o que age sobre os cards: um motor de **triggers e automações inspirado no Bitrix24**, onde a **classificação por GraphRAG/NodeRAG** preenche a decisão de transição.

A inspiração no Bitrix24 é explícita. O Bitrix24 separa a automação de funil em **duas primitivas complementares**, ambas configuradas **por etapa** do pipeline. O Marketero adota essa base, mas com uma correção importante: a dualidade "inbound vs. outbound" **não** mapeia 1:1, porque parte do que "move o card" não vem de um evento de canal externo e sim de um **timer interno**. Por isso adotamos **três categorias** de primitivas, não duas:

| # | Primitiva | Direção | O que faz | Quando age |
|---|-----------|---------|-----------|------------|
| 1 | **Trigger de evento externo** (PUSH / inbound real) | **Inbound** — entra na etapa | Fica "à escuta" de um **evento externo** (ação do cliente/sistema: comentário, DM, WhatsApp, leadgen, pedido de venda) e, quando ele ocorre, **move o card PARA** a etapa onde o trigger está ancorado | Reage a um **evento de canal** |
| 2 | **Robô que arma timer** (TIMER) | **Outbound** — age na etapa | É um **robô** executado ao entrar/permanecer na etapa cujo único efeito é criar um `scheduled_task`. Ao disparar (`fire_at`), o timer emite um **evento sintético de movimentação** que se comporta como um trigger | Ao **entrar** na etapa (arma) → mais tarde (dispara) |
| 3 | **Regra de automação** (robô) | **Outbound** — parte da etapa | **Executa ações** (responder, criar tarefa, atribuir, esperar, webhook, ação de IA, CAPI) | Ao **entrar** ou **permanecer** na etapa |

Em termos do próprio Bitrix24 (ver [Automation rules and triggers](https://helpdesk.bitrix24.com/open/22555350/)): **regras de automação** executam ações quando o elemento chega a um estágio, enquanto **triggers** monitoram eventos externos e respondem **movendo** o elemento adiante no funil. Na **mesma etapa** coexistem robôs que agem ao entrar e triggers que escutam para mover o card adiante. Exemplo canônico: numa etapa, um **robô** envia a fatura quando o negócio chega; um **trigger** de "pagamento recebido" move o negócio para a próxima etapa quando o cliente paga.

> **Por que três e não duas categorias.** Um "trigger de tempo/estado" derivado de cron sobre o estado do card **não** é "à escuta de um evento externo" — não há ação de cliente/sistema. O que existe é um **robô** (categoria 2) que, ao entrar na etapa, **arma um `scheduled_task`**; quando esse task dispara, ele emite um **evento sintético de movimentação** que então se comporta como trigger (categoria 1). Ou seja: o `on-stay-duration` **não é um "trigger PULL"** — é um **robô que arma timer**, e o efeito do timer (mover o card) é que é o trigger. Mantemos a regra dura: **tudo que MOVE card é trigger; o que arma o timer é robô.**

No Marketero, então:

- Os **eventos de canal** (comentário no IG/FB, DM, WhatsApp recebido, Lead Ad preenchido, formulário web, **pedido/venda na loja ou marketplace**) são **triggers de evento externo** (categoria 1) que movem o lead pelo funil.
- Os **timers de SLA/cadência** (sem resposta há X, parado na etapa há Y) são **robôs que armam timer** (categoria 2); seu disparo gera o movimento.
- A **IA GraphRAG + ações** (responder, sugerir produto, escalar, etiquetar, esperar, webhook, devolver conversão à Meta via CAPI) são os **robôs** da etapa (categoria 3). A **classificação de roteamento da IA roda antes** disso, na ingestão — não é robô de etapa (ver [§Onde a IA entra](#onde-a-ia-entra-sempre-desacoplada)).

> **Decisão de design central:** modelar **entidades separadas** no schema — nunca fundir condição de avanço e ação num único nó. Trigger é condição de **entrada** ancorada na etapa-destino; robô é ação de **saída** executada ao entrar; o timer é um robô cujo *efeito* é um trigger sintético. Na UI, um painel por coluna com duas faixas: *"Mover card para cá quando…"* (triggers + disparos de timer) e *"Quando o card chega aqui…"* (robôs, incluindo "armar timer de SLA").

## Conceitos e terminologia

| Termo | Definição |
|-------|-----------|
| **Pipeline (funil)** | Sequência ordenada de etapas para um tipo de operação (Vendas, Atendimento, Recuperação de carrinho, Conteúdo). Um tenant pode ter múltiplos pipelines independentes. |
| **Etapa / Coluna** | Estado discreto do card dentro do pipeline (ex.: `new`, `contacted`, `qualified`, `won`, `lost`). Cada coluna do Kanban possui seu próprio conjunto de triggers e robôs. |
| **Card / Negócio** | Item que percorre o funil. No Marketero é o **Contact deduplicado** (uma pessoa, N leads — ver [leads-crm.md](./leads-crm.md) §6.2/§6.4), com o snapshot imutável do Lead guardado como histórico. |
| **Trigger (gatilho)** | Regra **inbound** ancorada numa etapa-destino: ao ocorrer um evento (externo **ou** sintético vindo de um timer), **move o card para** aquela etapa. **Tudo que move card é trigger.** |
| **Robô que arma timer** | Robô outbound cujo efeito é criar um `scheduled_task`. Ao disparar, emite o **evento sintético** que aciona o trigger de movimentação. **Armar o timer é robô; o disparo que move é trigger.** |
| **Regra de automação / Robô** | Regra **outbound** que **executa ações** quando o card entra (ou permanece) na etapa. |
| **Condição** | Filtro que decide **se** uma regra roda e a **quais** cards se aplica (operadores `eq/neq/gt/gte/lt/lte/in/contains/exists/matches`, combináveis com `AND`/`OR`). |
| **Ação** | Efeito executado por um robô (responder, mover card, criar tarefa, esperar, webhook, ação de IA, CAPI). |
| **Classificador de roteamento** | Função de IA que roda na **ingestão/dispatcher**, ANTES da transição, produzindo o evento `ai.intent_detected` e/ou a decisão de coluna. **Não é robô de etapa.** |
| **Log de execução** | Registro append-only de cada execução de regra e de cada step (input/output/erro/tentativa), para auditoria, custo de IA e idempotência. |

## Catálogo de Triggers (eventos que movem cards)

Triggers são **sempre filhos de `(pipeline, etapa)`**, nunca globais — o mesmo evento "WhatsApp recebido" pode comportar-se diferente no funil de Vendas, de Suporte ou de Recuperação de carrinho.

Conforme a [Visão geral](#visão-geral), separamos os triggers por **origem do evento**:

- **PUSH (evento externo)** — webhook de canal: comentário, DM, WhatsApp, leadgen, formulário, **pedido/venda**.
- **TIMER (evento sintético)** — disparado por um `scheduled_task` que um **robô armou** ao entrar na etapa. A linha aparece aqui porque o **disparo move o card**; o que arma está no [Catálogo de Robôs](#catálogo-de-ações--robôs-executados-na-etapa).

| Trigger | Origem | Gatilho (evento) | Condição típica | Etapa-destino sugerida |
|---------|--------|------------------|-----------------|------------------------|
| **Comentário novo (IG/FB)** | PUSH | Webhook `comments` do canal | `not spam` (classificação roda na ingestão, ver §IA) | `new` / abrir card no funil de Vendas |
| **DM recebida (Instagram / Messenger)** | PUSH | Webhook `messages` (IG DM, story reply/mention; FB Page Messenger) | primeira mensagem do contato | `contacted` (Em atendimento) |
| **WhatsApp recebido** | PUSH | Mensagem nova no Inbox/WhatsApp Cloud API | `message contém keyword` **ou** intenção semântica | `contacted` |
| **Lead Ads / webhook `leadgen`** | PUSH | Webhook `leadgen` (entrega só IDs → re-fetch `GET` do `leadgen_id`) | sempre | `new` |
| **Formulário web próprio** | PUSH | Submissão do form hospedado/embedável do Marketero | mapeamento de campos válido | `new` |
| **Pedido/venda na loja (e-commerce próprio)** | PUSH | Webhook `commerce.order_created` / `order_paid` da loja própria | `status = paid` | `won` (e disparar CAPI) |
| **Pergunta/mensagem em marketplace** | PUSH | Webhook `marketplace.question_received` (Mercado Livre, Facebook Marketplace, TikTok Shop, OLX) | sempre | `contacted` / `new` |
| **Pedido pago em marketplace** | PUSH | Webhook `marketplace.order_paid` (Mercado Livre / Mercado Pago, etc.) | `status = paid` | `won` |
| **Intenção de compra detectada pela IA** | PUSH (sintético) | Evento `ai.intent_detected` emitido pelo **classificador de roteamento na ingestão** (não é robô de etapa) | `intent = intencao_de_compra` e `confidence ≥ 0.8` | `qualified` |
| **Sem resposta por X tempo / parado na etapa** | TIMER | Disparo de `scheduled_task(kind=on_stay_duration)` **armado por um robô** ao entrar na etapa; revalida pré-condições no `fire_at` | `card ainda no stage` e `not respondido` | escalar / notificar / etapa de reativação |
| **Tag aplicada** | PUSH | Tag adicionada ao card | `tag = vip` (ou outra) | etapa específica do segmento |
| **Campo alterado** | PUSH | `card.field_changed` (valor adicionado/alterado/limpo) | `path = card.custom.uf` e `value = SP` | etapa regionalizada |

> **`ai.intent_detected` não é "PULL".** Não há cron varrendo cards à procura de intenção — o classificador roda **na ingestão da mensagem/comentário** e emite o evento de uma vez. É um trigger PUSH cujo "canal" é o próprio classificador de roteamento. A decisão de coluna que ele carrega é a **função de transição** (ver §IA), não uma ação outbound de etapa.

> **`on-stay-duration` não é "trigger PULL".** A linha TIMER acima representa o **disparo** do timer (que move o card). O **armar** o timer é um robô (categoria 2), catalogado em [Robôs](#catálogo-de-ações--robôs-executados-na-etapa). Mantemos isso explícito para o leitor nunca confundir "armar" com "mover".

> **Cobertura de venda (ciclo conteúdo→conversa→conversão).** Os triggers de **loja própria e marketplaces** fecham o ciclo da [visao-geral.md](../produto/visao-geral.md) §4 (Integrações de venda): além do webhook de **saída** para ERP/loja/marketplace, existe agora o caminho de **entrada** — uma pergunta no Mercado Livre abre card em `contacted`; um pedido pago na loja move o card para `won` e dispara CAPI.

> O **trigger semântico de intenção** é o diferencial sobre o Bitrix24, que só faz *match* literal de palavra-chave. O Marketero combina `Track Customer Messages` (por keyword) com **classificação GraphRAG** — match literal **e** semântico.

> **Movimento para trás (backward movement):** assim como no Bitrix24, cada trigger tem um flag **`allow_backward`** (default `false`) controlando se pode **trazer o card de volta** de uma etapa posterior. O critério é por **posição**: um trigger só move o card para trás (`stage.position` destino `<` posição atual) se `allow_backward = true`. Além disso, etapas com `stage.type ∈ {won, lost}` são **absorventes** para triggers de canal — um lead já em `won` que manda nova mensagem **não** volta para `new` automaticamente (gera, no máximo, um card novo de pós-venda em outro pipeline). Sob movimento para trás permitido, `on-exit`/`on-enter` disparam normalmente, mas a **histerese da reversão** (ver [Loop-guard](#loop-guard-parâmetros-e-justificativa)) e o `max_executions_per_card` por janela evitam o zigue-zague.

> **Escopo multicanal (TikTok, X/Twitter).** O catálogo PUSH acima cobre IG/FB/WhatsApp e venda. **TikTok** (comentários, DMs — ver [tiktok.md](../investigacoes/tiktok.md)) e **X/Twitter** (replies, DMs — ver [twitter.md](../investigacoes/twitter.md)) **não estão no MVP**, mas serão plugados no **mesmo barramento** via os tipos genéricos `channel.message_received` / `channel.comment_received`, reaproveitando o modelo de comments/messages já existente. A omissão é deliberada e marcada — não silenciosa. Ver [Roadmap](#roadmap--faseamento-sugerido).

## Catálogo de Ações / Robôs (executados na etapa)

Robôs também são filhos de `(pipeline, etapa)` e cada um tem três parâmetros de execução (ver §6): **dependência** (sequencial vs. paralelo), **timing** (imediato / após delay / agendado) e **condição**. As **ações de IA** são cidadãs de primeira classe — é nelas que mora o fosso defensável.

> **Onde a classificação NÃO está.** A "Classificar evento" **não** é um robô de etapa. Ela é a **função de roteamento do dispatcher** (ingestão), que roda ANTES de existir etapa-destino — ver [§Onde a IA entra](#onde-a-ia-entra-sempre-desacoplada). Listá-la como ação outbound seria contraditório: ela decide PARA qual coluna o card vai, então não pode rodar AO ENTRAR na coluna. As ações de IA abaixo são as que rodam **on-enter**, depois que a coluna já foi decidida.

### Ações de IA on-enter (exclusivas do Marketero)

| Ação | Descrição |
|------|-----------|
| **Responder via GraphRAG/NodeRAG** | Resposta contextualizada pelo grafo (clientes, produtos, conversas, campanhas, vendas). Operacionalizada por reply em comentário, *private reply* comentário→DM, ou `POST` de mensagem. Não é diálogo fixo nem LLM-por-prompt. |
| **Sugerir produto do grafo** | Cruza grafo de produto + histórico do contato para recomendar o item certo na resposta. |
| **Gerar criativo (Nano Banana)** | Variante de `generate` que chama o Nano Banana/Gemini para gerar imagem — usada no board de Conteúdo. |
| **Escalar para humano** | Aplica a tag `HUMAN_AGENT` (permite responder fora da janela de 24h por até 7 dias), muda `assigned_to` e a coluna, entregando contexto completo ao atendente. |

### Ações operacionais (paridade com concorrentes)

| Ação | Descrição |
|------|-----------|
| **Etiquetar (add_tag)** | Aplica labels ao card (intenção, canal, campanha via `utm`/`tracking_params`). |
| **Enviar WhatsApp / template / DM / comentário** | Envia mensagem por template ou dinâmica no canal correspondente. |
| **Criar tarefa** | Cria tarefa para o time (handoff IA→humano). |
| **Atribuir responsável** | Define/troca `assigned_to` (distribuição: rodízio, região, interesse, carga). |
| **Esperar / delay** | Primitiva de primeira classe para cadências (ex.: follow-up 24h depois). Suspende a execução (não bloqueia worker). |
| **Armar timer de SLA / on-stay** | Cria `scheduled_task(kind=on_stay_duration)`. É **este** robô que arma o timer cujo disparo, mais tarde, atua como **trigger de movimentação** (ver Catálogo de Triggers). |
| **Condicional if/else** | Avalia condições e ramifica em `then`/`else`. |
| **Webhook (saída)** | Chama URL externa com parâmetros (ERP/loja/marketplace), com timeout + circuit breaker. |
| **Mover card / mudar campo / mudar pipeline** | Transição de estado; pode mover o card **entre pipelines** (ver semântica abaixo). |
| **Devolver conversão à Meta (CAPI)** | Efeito da transição para `qualified`/`won`: `POST` ao dataset da Meta, gravando `conversion_synced_at` (idempotência). Ver validação de `action_source`/`event_name` no [Cenário 1](#cenário-1--lead-ads--qualificação--atendimento-whatsapp--proposta--ganho--capi). |

> A regra de **espera/delay** é crítica para cadências de nurturing WhatsApp-first e **deve ser primitiva de primeira classe**, não um hack. Permite cadências resilientes: `msg → espera 24h → se não respondeu, nova msg → espera 3d → tarefa para vendedor`.

**Semântica de "Mover card entre pipelines".** Mudar `pipeline_id` muda o conjunto de stages válidos, então **não** é trivial:

- **Stage de pouso:** o card cai no stage marcado como `type = new` (ou um `landing_stage_id` configurado por regra) do pipeline-destino. Nunca herda o `stage_id` do pipeline antigo (que não existe lá).
- **Timers do pipeline origem:** todos os `scheduled_task` e execuções `waiting` ancorados em `(card, stage_origem)` são **cancelados** (`status = cancelled`) na mesma transação da troca de pipeline — análogo ao cancelamento no `stage_exited`. Não vazam timers órfãos do pipeline antigo.
- O movimento emite `card.pipeline_changed { from_pipeline, to_pipeline, landing_stage_id }` além de `card.stage_changed`, para que triggers `on-enter` do novo stage disparem normalmente.

## Modelo unificado evento → roteamento IA → ação

O modelo descrito na [visao-geral.md](../produto/visao-geral.md) (§"Automação de fluxos", l.33-45) — **evento → classificação → ação** — e o motor de triggers de Kanban são **a mesma máquina vista de dois ângulos**:

- O modelo da visão-geral é **event-driven (push)**: chega algo, a IA classifica, dispara ação.
- O Kanban é **state-driven (pull)**: o card tem um estado (coluna) e regras por estado.

A ponte: **a classificação de roteamento da IA é a função de transição da máquina de estados** — mapeia `(estado_atual, evento) → (próxima_coluna, ações)`. Crucialmente, essa classificação roda **na ingestão**, ANTES da transição; as **ações** de IA (responder, sugerir produto, gerar criativo) rodam **on-enter**, DEPOIS. São papéis distintos e nunca o mesmo nó:

```
trigger (evento de canal externo OU disparo de timer)
   → [ingestão] classificação de roteamento GraphRAG  ← FUNÇÃO DE TRANSIÇÃO (não é robô de etapa)
        (rótulo, intenção, sugestão de produto/resposta) → produz ai.intent_detected / decisão de coluna
      → decisão de transição (mover card, criar card ou manter)
         → [on-enter da etapa-destino] execução de ações  ← ROBÔS (responder, etiquetar, escalar, CAPI)
```

A tabela `lead_pipeline` ([leads-crm.md](./leads-crm.md) §6.2) é a tabela de **ESTADO**; o **classificador de roteamento na ingestão** é o **ROTEADOR**; as ações on-enter são os **EFEITOS**. Assim, "regras + IA" são automações de Kanban onde, em vez de o usuário escrever cada `if/then`, **a IA preenche o ramo de decisão a partir do grafo** — mas o roteador e os robôs são componentes separados.

> Eventos com pessoa identificável (DM, lead, form, pedido) **entram no board** como cards. Eventos sem card associado (comentário público, spam) podem agir **direto** (responder/ocultar) sem criar card.

## Gatilhos por movimentação de etapa

O segredo de implementação é que **todo movimento de card emite UM único evento canônico**, na mesma transação que o `UPDATE` do card: `card.stage_changed { card_id, from_stage_id, to_stage_id, moved_by, occurred_at }`. A partir dele o dispatcher deriva os três gatilhos:

| Gatilho | Como deriva | Exemplo |
|---------|-------------|---------|
| **on-enter** | Casar regras com `trigger.stage_entered.stage_id == to_stage_id` | Ao entrar em `qualified`, disparar CAPI |
| **on-exit** | Casar regras com `trigger.stage_exited.stage_id == from_stage_id` (quando `from != null` e `from != to`) | Ao sair de `new`, cancelar timers de SLA |
| **on-stay-duration** (tempo na etapa) | **Não** sai de um evento instantâneo — é um **robô on-enter que arma** `scheduled_task(fire_at = now + duration)`; o **disparo** desse task é que age como trigger de movimentação | Lead em `new` sem contato há 2 dias → escalar |

**Ordem de execução dentro da etapa.** Cada robô tem: (1) **dependência** — "começar após os anteriores terminarem" (encadeamento sequencial) ou "rodar independentemente" (paralelo); (2) **timing** — imediato / após delay relativo / agendado para timestamp absoluto; (3) **condição**. Isso cria um pipeline ordenado dentro da etapa.

**Ramificações.** Seguindo o Bitrix24, **não há `if/else` num único nó nativo** — a regra simplesmente roda ou não. A ramificação emerge de regras paralelas com condições mutuamente exclusivas (`X` e `NOT X`).

> **Recomendação:** expor `if/else` **visual** no builder (UX de flow-builder tipo ManyChat/Pipedrive), mas **compilar** internamente para o modelo de regras-condicionais-por-etapa do Bitrix24 — ganha-se a UX de ramificação sem perder a robustez de avaliação por etapa.

**Pontos críticos do `on-stay-duration` (e de delays de cadência):**

- Ao **disparar** o stay-timer, **revalidar** que o card AINDA está no mesmo stage, que `entered_stage_at` não mudou e que **a regra ainda está `enabled`** — senão é no-op/cancelado (evita escalonamentos fantasma).
- Ao **sair** do stage (ou mudar de pipeline), **cancelar** (`status = cancelled`) os `scheduled_task` pendentes daquele `(card, stage)`.
- `entered_stage_at` no card é a **fonte de verdade** do "há quanto tempo".
- **A mesma revalidação no `fire_at` vale para delays internos de cadência**, não só para o on-stay — ver [Versionamento e invalidação](#versionamento-e-invalidação-de-continuations).

## Diagrama do fluxo

```mermaid
flowchart TD
    subgraph Canais
      A1[Comentário IG/FB] --> BUS
      A2[DM / WhatsApp] --> BUS
      A3[Lead Ads / leadgen] --> BUS
      A4[Formulário web] --> BUS
      A5[Loja / Marketplace<br/>pedido · pergunta] --> BUS
      A6[Disparo de timer<br/>scheduled_task] --> BUS
      A7[TikTok / X<br/>fora do MVP] -.futuro.-> BUS
    end

    BUS["Barramento de eventos<br/>(automation_event + outbox)"] --> ING["Ingestão / Dispatcher<br/>+ classificador de roteamento IA<br/>(GraphRAG / NodeRAG)"]
    ING --> DEC{Decisão de transição<br/>(função de transição)}

    DEC -->|mover / criar card| STAGE[(Etapa-destino<br/>no Kanban)]
    DEC -->|spam / ignorar| HIDE[Ocultar comentário<br/>sem criar card]

    STAGE -->|on-enter| ROBOS["Robôs da etapa<br/>(ordem + delay + condição)"]
    ROBOS --> R1[Responder via GraphRAG]
    ROBOS --> R2[Sugerir produto]
    ROBOS --> R3[Escalar p/ humano]
    ROBOS --> R4[Esperar / cadência]
    ROBOS --> R5[Enviar WhatsApp/template]
    ROBOS --> R6[Devolver conversão CAPI]
    ROBOS --> R7["Armar timer de SLA<br/>(robô → cria scheduled_task)"]

    R6 --> META[(Meta Conversions API)]
    R7 -.fire_at.-> A6
```

> No diagrama, o **classificador roda na ingestão** (antes da etapa-destino) e o **armar timer é um robô** (R7) cujo disparo volta ao barramento como evento de movimentação (A6) — refletindo as três categorias de primitiva.

## Exemplos de fluxo end-to-end

> **Taxonomia de intents e faixas de confidence (calibração).** A taxonomia é **fechada**: `{ duvida, intencao_de_compra, elogio, reclamacao, suporte, spam }`. O classificador de roteamento devolve `{ intent, confidence ∈ [0,1] }`. Três faixas, calibradas pelo time de dados sobre um conjunto rotulado por tenant (revisado mensalmente):
>
> | Faixa | `confidence` | Comportamento |
> |-------|--------------|---------------|
> | **Auto-agir** | `≥ 0.80` | Aplica a transição/ação automaticamente. |
> | **Fallback humano** | `0.50 – 0.79` | Cria card mas **não** age sozinho: tag `REVISAR_IA` + tarefa para um humano confirmar a coluna. |
> | **Ignorar / inbox** | `< 0.50` | Não classifica; vai para inbox manual (ou, se spam com alta confiança, oculta). |
>
> Os valores são o **default do produto**; cada tenant pode ajustar os cortes. A faixa cinzenta (0.50–0.79) é resolvida por humano, não por auto-decisão.

### Cenário 1 — Lead Ads → qualificação → atendimento WhatsApp → proposta → Ganho + CAPI

1. **Trigger PUSH:** webhook `leadgen` chega (só IDs) → re-fetch `GET` do `leadgen_id` → cria card em **`new`** (funil de Vendas).
2. **on-enter `new`:** robô **Responder via GraphRAG** envia primeira mensagem WhatsApp + robô **Notificar** (speed-to-lead); robô **Armar timer de SLA** cria `scheduled_task` (sem contato em X min → escalar).
3. **Trigger PUSH:** WhatsApp recebido → o **classificador de roteamento (ingestão)** detecta `intencao_de_compra` (`confidence ≥ 0.80`) → move card para **`qualified`**.
4. **on-enter `qualified`:** robô **Sugerir produto do grafo** + robô **Devolver CAPI**, gravando `conversion_synced_at`.
5. Vendedor envia proposta; ao fechar, card vai para **`won`** → on-enter `won` dispara **CAPI** de compra/won.

> **CAPI — validação de `action_source`/`event_name`.** Para eventos de CRM/funil sem hit de site, o `action_source` correto é **`system_generated`** (a Meta lista explicitamente esse valor para "offline events… and CRM events"). Em `qualified` usamos o fluxo **Conversions API for CRM**, no qual o `event_name` é um **evento customizado configurado no Events Manager** (ex.: `qualified_lead`) — *não* o standard `Lead`; em `won` mapeamos para o standard **`Purchase`** (ou um custom `closed_won`, conforme a configuração de eventos do tenant). Validar sempre o par contra a doc atual antes de codar — ver Sources ao final.

> **Timing do CAPI:** **não** disparar só em `won` (raro demais para o algoritmo aprender) — disparar também em `qualified` (~1/3 a 1/2 dos leads). Só para cards com `leadgen_id` (Lead Ads / IG Lead Ads); forms web próprios usam outro mecanismo (CAPI via dataset com `user_data` hasheado — **a definir** na [visao-geral.md](../produto/visao-geral.md) §"Web forms"; ver [Decisões em aberto](#decisões-em-aberto)).

### Cenário 2 — Comentário com intenção de compra → DM automática → card no funil

1. **Trigger PUSH:** webhook `comments` (IG/FB) → o **classificador de roteamento (ingestão)** retorna `intent = intencao_de_compra`, `confidence = 0.92` (faixa auto-agir).
2. **Ação direta (sem card ainda):** *private reply* comentário→DM com **Responder via GraphRAG** + **Sugerir produto**. **A resposta GraphRAG já foi enviada aqui.**
3. Como há pessoa identificável (a DM abre conversa), **cria card** em `new` no funil de Vendas e segue o **Cenário 1 a partir do passo 3** (a saber: aguarda o WhatsApp/DM do cliente que reclassifica para `qualified`). **Não** reexecuta o passo 2 do Cenário 1 (Responder via GraphRAG), para **evitar dupla resposta GraphRAG** — o on-enter de `new` aqui marca `first_reply_sent = true` (gravado no passo 2 acima), e o robô de resposta tem condição `not first_reply_sent`.
4. Comentário classificado como **spam** → **Ocultar comentário** (`hide`), **sem** criar card.

> **Anti-dupla-resposta.** O robô **Responder via GraphRAG** de `new` carrega a condição `card.custom.first_reply_sent != true`. Quando um card entra em `new` vindo do Cenário 2 (que já respondeu no passo 2), a flag está `true` e o robô **não** dispara segunda resposta. Em fluxos puros de Lead Ads (Cenário 1), a flag começa ausente, então o robô responde normalmente.

### Cenário 3 — Cadência de reativação por inatividade

1. **Robô que arma timer (on-enter `contacted`):** ao entrar, arma `scheduled_task(kind=on_stay_duration, fire_at = +3d)`.
2. **Disparo do timer (trigger TIMER):** no `fire_at`, revalida (card ainda em `contacted`, sem resposta, regra `enabled`) → move para **`reativação`**.
3. **on-enter `reativação`:** robô **Enviar template** (msg 1) → **Esperar 2 dias** → condicional: se respondeu, mover de volta para `contacted`; senão **Esperar 5 dias** → **Criar tarefa** para o vendedor. Cada `Esperar` revalida pré-condições no `fire_at`.

## Arquitetura técnica

Coerente com a stack do Marketero (Turborepo + Bun, Next.js 16, TS, Postgres/Neon, CRM multi-tenant Lead→Contact→Pipeline existente, cérebro GraphRAG/NodeRAG, canais WhatsApp/Meta). Três planos: **definição no-code**, **execução evento-orientada durável** e **IA assíncrona**.

### Modelo de dados (esboço)

Separar **DEFINIÇÃO** (editada no builder, versionada) de **EXECUÇÃO** (append-only). `tenant_id` em **toda** tabela.

**Definição:**

```
pipeline(id, tenant_id, name, channel_scope)
stage(id, pipeline_id, tenant_id, name, position, type[new|active|won|lost],
     landing_stage BOOL /* alvo de mover-entre-pipelines */, wip_limit)
card(id, tenant_id, pipeline_id, stage_id, contact_id→contact, lead_id→lead,
     title, value_cents, assigned_to, entered_stage_at, custom JSONB)
automation_rule(id, tenant_id, pipeline_id NULL, name, enabled, version,
     trigger JSONB, definition JSONB /* grafo de ações */,
     max_executions_per_card INT NULL,
     max_executions_window INTERVAL NULL /* janela rolling do contador */, created_by)
```

**Execução (append-only):**

```
automation_event(id ULID, tenant_id, aggregate_type, aggregate_id, type,
     payload JSONB, dedupe_key TEXT UNIQUE, occurred_at,
     seq BIGSERIAL /* monotônico GLOBAL; ordem POR aggregate = ORDER BY seq WHERE aggregate_id = ? */,
     provider_seq TEXT NULL /* tie-breaker do provedor p/ timestamps empatados */)
rule_execution(id ULID, tenant_id, rule_id, rule_version, event_id, card_id,
     status[pending|running|waiting|completed|failed|cancelled],
     current_step_id, context JSONB,
     depth INT /* anti-loop */,
     causation_id ULID NULL /* evento/execução que causou esta */,
     root_event_id ULID NULL /* raiz da causation_chain */,
     is_external_origin BOOL /* true = evento genuíno do cliente; reseta depth */,
     started_at, finished_at)
execution_log(id, execution_id, tenant_id, step_id, action_type, status,
     input JSONB, output JSONB, error JSONB, attempt, started_at, finished_at)
scheduled_task(id, tenant_id, execution_id NULL, card_id,
     kind[delay|on_stay_duration|wait_until], rule_id, rule_version,
     fire_at /* UTC, com jitter aplicado */, dedupe_key UNIQUE,
     status[pending|fired|cancelled])
card_rule_counter(tenant_id, card_id, rule_id, window_start,
     count INT /* execuções na janela rolling, p/ max_executions_per_card */,
     PRIMARY KEY(tenant_id, card_id, rule_id, window_start))
channel_rate_state(tenant_id, channel, tokens NUMERIC, refilled_at,
     PRIMARY KEY(tenant_id, channel) /* token-bucket persistido */)
```

> **Correções de schema (load-bearing):**
> - `automation_event.seq` é **monotônico global** (BIGSERIAL é global, não por aggregate). A ordenação "por aggregate" é obtida com `ORDER BY seq` **filtrando** `aggregate_id`. Gaps são esperados (rollbacks) e não quebram a ordem relativa. O comentário antigo ("ordem por aggregate") induzia a erro e foi corrigido.
> - `rule_execution` ganhou **`causation_id` + `root_event_id`** para materializar a `causation_chain` citada no anti-loop (antes ausentes no schema).
> - **`card_rule_counter`** dá morada ao contador de `max_executions_per_card` (não cabe em `automation_rule`, que é definição). Janela rolling via `window_start`.
> - **`channel_rate_state`** persiste o token-bucket por `(tenant, canal)` citado nos riscos (antes sem tabela).

> **Reuso:** `contact(id)` e `lead(leadgen_id)` já existem ([leads-crm.md](./leads-crm.md) §6.2). O `lead_pipeline.stage` atual (hoje um `TEXT` solto `new|contacted|qualified|won|lost`) vira **FK** para `stage(id)`, versionável por tenant. `scheduled_task` é o coração dos timers (delays/on-stay). `card.entered_stage_at` é o relógio do `on-stay-duration`.

### Motor evento-orientado / fila

Padrão em 4 camadas:

1. **Produção via Transactional Outbox:** qualquer mutação de card escreve, **na mesma transação**, a linha em `automation_event`. Evita o anti-padrão dual-write (app→fila) — nenhum evento se perde no crash.
2. **Notificação via LISTEN/NOTIFY:** trigger `AFTER INSERT` emite `pg_notify`. É apenas um **sino** para acordar o dispatcher — a fonte de verdade é a tabela. Polling de fallback `SELECT ... FOR UPDATE SKIP LOCKED WHERE status='pending' ORDER BY seq`.
3. **Fila durável:** **pg-boss** (fila sobre o próprio Postgres/Neon — zero infra extra, recomendado para começar), **BullMQ** (precisa Redis/Upstash — *rate-limiter* nativo por fila, útil para throttle de canal) ou **Cloudflare Queues/Workflows** se serverless-first. **Esta escolha é load-bearing** — ver [Decisões em aberto](#decisões-em-aberto).
4. **Worker idempotente com checkpoint:** após cada step persiste `current_step_id` + `context`; retry retoma do último step sem reexecutar ações já feitas.

#### Scheduler de timers (drenagem de `scheduled_task`)

O scheduler é o **coração** de delays e on-stay. Especificação concreta:

- **Loop de poll:** um worker dedicado executa, a cada **tick de ~15s**, a query:
  ```sql
  SELECT * FROM scheduled_task
  WHERE status = 'pending' AND fire_at <= now()
  ORDER BY fire_at
  FOR UPDATE SKIP LOCKED
  LIMIT 200;  -- batching
  ```
  `SKIP LOCKED` evita contenção entre réplicas do scheduler; o `LIMIT` faz **batching** para não puxar tudo de uma vez.
- **Garantia at-least-once:** o task só vira `fired` **após** a continuation ser enfileirada com sucesso (na mesma transação do `UPDATE status='fired'`); idempotência por `scheduled_task.dedupe_key UNIQUE` + a idempotência de execução cobre re-disparos.
- **Anti-thundering-herd (timers em massa):** ao **gravar** `fire_at`, aplicar **jitter** determinístico — `fire_at = base + duration + (hash(card_id) % spread)`, com `spread` ~ alguns minutos. Isso espalha os 10k leads que entraram em `new` às 9h para que o SLA das 9h+X **não** dispare todos no mesmo segundo. O batching + `LIMIT` no poll completa a defesa.
- **Revalidação no fire:** todo disparo revalida pré-condições (card ainda no stage, regra `enabled`, versão pinada) — ver [§on-stay-duration](#gatilhos-por-movimentação-de-etapa) e [Versionamento](#versionamento-e-invalidação-de-continuations).

> **Tensão com Neon autosuspend (resolvida).** Um scheduler que faz poll constante mantém a compute do Neon **sempre acordada**, contrariando o argumento "serverless-first / zero infra". Resolução: **o poll não roda de dentro do Postgres**. Um **cron externo** acorda a compute na cadência do tick — **Cloudflare Cron Trigger** (ou `pg_cron` se a compute já estiver ativa, ou o agendador da fila escolhida) chama o endpoint de drenagem. Como `LISTEN/NOTIFY` é **não-confiável** sob PgBouncer transaction mode (ver nota abaixo), o **polling com cron externo é o mecanismo primário** dos timers; NOTIFY é só otimização para a compute já-acordada. Isso casa a durabilidade dos timers com o autosuspend em vez de mantê-lo eternamente ligado.

> **Atenção Neon:** com autosuspend/pooling (PgBouncer transaction mode), **LISTEN/NOTIFY não é confiável**. O dispatcher depende de **POLLING (SKIP LOCKED)** como mecanismo primário e NOTIFY vira otimização opcional via conexão direta sem pooler.

### DSL JSON de condições e ações

A regra inteira é um JSON **versionado**, editado pelo builder no-code (nunca à mão), validado com **Zod** no save e no load. Recomenda-se um JSON Schema da DSL como contrato compartilhado no monorepo (ex.: `packages/automation-dsl`).

```jsonc
{
  "trigger": { "type": "card.stage_entered", "stage_id": "qualified", "pipeline_id": "vendas", "allow_backward": false },
  "conditions": {
    "all": [
      { "path": "card.value_cents", "op": "gte", "value": 100000 },
      { "any": [
        { "path": "contact.tags", "op": "contains", "value": "vip" },
        { "path": "card.custom.uf", "op": "eq", "value": "SP" }
      ]}
    ]
  },
  "actions": [
    { "id": "a1", "type": "ai_action", "params": { "op": "classify" }, "output_var": "cls" },
    { "id": "a2", "type": "condition",
      "if": { "path": "{{ vars.cls.intent }}", "op": "eq", "value": "intencao_de_compra" },
      "then": [
        { "id": "a3", "type": "send_whatsapp_template", "params": { "template_id": "proposta" } },
        { "id": "a4", "type": "delay", "params": { "for": "PT1H" } },
        { "id": "a5", "type": "move_card", "params": { "to_stage_id": "proposta" } }
      ],
      "else": [ { "id": "a6", "type": "add_tag", "params": { "tag": "frio" } } ]
    },
    { "id": "a7", "type": "http_webhook" }
  ]
}
```

#### Resolução de variáveis (esquema único, normativo)

Para eliminar a inconsistência entre `output_var` e `steps.<id>.output`, a DSL adota **um único esquema**: cada step que produz saída declara um **`output_var`** nomeado; toda referência usa **`{{ vars.<output_var>.<path> }}`**. O esquema `steps.<id>.output` está **descontinuado** e não deve aparecer.

- **Gramática de interpolação:** `{{ vars.<nome>.<path.dotted> }}`. Escopo: as variáveis vivem em `rule_execution.context.vars`, visíveis a todos os steps **posteriores** da mesma execução. Sem escopo global entre execuções.
- **Path inexistente:** resolve para `null` (nunca lança). Numa **condição**, comparar `null` com `op: eq/gte/...` retorna `false` (a regra não dispara) — falha segura, sem exceção que trave o worker. Operadores `exists`/`not exists` permitem testar presença explicitamente.
- **Coerção de tipos:** sem coerção implícita silenciosa. `gte/lt/...` exigem ambos os lados numéricos (string numérica é convertida; não-numérico → `false`). `contains`/`in` operam sobre arrays/strings. `eq` compara por tipo+valor. Coerções inválidas logam `warn` em `execution_log` e tratam como `false`.
- **Dependência de dados com IA assíncrona (regra dura):** um node `condition` que referencia `{{ vars.cls.* }}` produzido por um `ai_action` **assíncrono** só é avaliado **após o step-fonte atingir `status = completed`**. Isso cria uma **dependência implícita de dados** além da sequência declarada: o worker **bloqueia o ramo** (mantém a execução `waiting`) até `a1` resolver; não avalia `a2` com `vars.cls` ainda ausente. Em outras palavras, a condição **espera** o classificador retornar — nunca lê um `waiting` como `null`.

**Tipos de trigger:** `card.stage_entered` · `card.stage_exited` · `card.stay_duration` · `card.created` · `card.field_changed` · `channel.message_received` · `channel.comment_received` · `ai.intent_detected` · `commerce.order_created` · `commerce.order_paid` · `marketplace.question_received` · `marketplace.order_paid`.

Todo trigger aceita **`allow_backward` BOOL (default `false`)**: quando `false`, o trigger é ignorado se moveria o card para uma `stage.position` anterior à atual, e nunca tira o card de uma etapa absorvente (`type ∈ {won, lost}`). Isso é validado no dispatcher antes de aplicar a transição.

**Controle de fluxo:**

- **Sequência** = ordem do array.
- **`if/else`** = node `type:condition` com ramos `then`/`else`.
- **Delay** = cria `scheduled_task(fire_at = now + for)`, marca a execução `status = waiting`; o worker **suspende** (não usa `sleep` bloqueante) e o scheduler reacorda no `fire_at`.
- **Wait por evento externo** = node `wait_for_event` registra a execução aguardando `(tenant, card, event_type)` com timeout; quando o evento chega o dispatcher casa e retoma.

#### Motor de workflow durável e versionamento

Isto é um **motor de workflow durável** (estilo Temporal/Vercel Workflow/Cloudflare Workflows): delays e waits **não consomem worker** — são continuations dirigidas por timer/evento. O versionamento (`automation_rule.version` + `rule_execution.rule_version` + `scheduled_task.rule_version`) garante que execuções longas em andamento (ex.: delay de 2 dias) continuem com a **definição com que começaram**, mesmo se o usuário editar a regra.

##### Versionamento e invalidação de continuations

A pinagem de `rule_version` **não** isenta de revalidar pré-condições no `fire_at`. Política explícita de invalidação:

| Evento durante uma continuation `waiting`/`scheduled` | Política |
|--------------------------------------------------------|----------|
| **Regra editada (nova `version`)** | A continuation segue com `rule_version` pinada (a definição antiga). Edição **não** muda execuções em voo. |
| **Regra desabilitada (`enabled = false`)** | No `fire_at`, a revalidação detecta `enabled = false` e **cancela** a continuation (`status = cancelled`, log "rule disabled"). O `scheduled_task` **não** executa com a versão antiga. |
| **Regra deletada** | Soft-delete (`deleted_at`); `scheduled_task` pendentes ficam **órfãos detectáveis** e são cancelados no `fire_at` pela revalidação (regra inexistente/deletada → cancela). Nunca executa órfão. |
| **Card sai do stage durante um delay no meio de uma cadência on-enter** | A revalidação no `fire_at` checa `card.stage_id == stage_da_regra`; se o card saiu, **cancela** o restante da cadência (mesma semântica do `stage_exited` cancelar timers). Vale para **delays internos de cadência**, não só para o on-stay. |
| **Card muda de pipeline durante a cadência** | Cancela todas as continuations `(card, stage_origem)` (ver [mover-entre-pipelines](#catálogo-de-ações--robôs-executados-na-etapa)). |

> **Princípio:** pinar a versão garante *determinismo da definição*; revalidar no `fire_at` garante *relevância da execução*. Os dois juntos evitam tanto "a regra mudou no meio" quanto "a regra/card não existe mais, mas o timer disparou assim mesmo".

### Onde a IA entra (sempre desacoplada)

A IA entra em **dois pontos distintos e separados** — e é crucial não confundi-los, porque um decide a transição e o outro executa efeitos:

1. **(a) Classificador de roteamento (ingestão/dispatcher) — NÃO é robô de etapa.** Roda **antes** da transição, sobre a mensagem/comentário/evento que acabou de chegar. Produz `ai.intent_detected` e/ou a **decisão de coluna** (a função de transição). É **assíncrono**: o dispatcher enfileira um job na **fila de IA separada**, e a ingestão do webhook dá ack imediato. Como decide PARA qual etapa o card vai, **não pode** ser uma ação on-enter da etapa (que roda DEPOIS de a etapa já estar decidida).
2. **(b) Ações de IA de etapa (`ai_action`, on-enter) — são robôs.** `op: respond|suggest_product|generate|decide`. O worker **não** chama o LLM inline — enfileira na fila de IA e marca `status = waiting`. O job chama o NodeRAG (recupera `contact`, produtos, conversas, campanhas, histórico), produz output estruturado (ex.: `{ suggested_reply, product_ids }` ou, para `decide`, qual ramo seguir), grava em `context.vars.<output_var>` e reacorda o próximo step.

> **Reconciliação dos dois papéis.** A versão anterior listava "Classificar evento" simultaneamente como **trigger** (`ai.intent_detected`) e como **ação de robô** que "decide a coluna" — contraditório, porque a classificação não pode rodar AO ENTRAR na etapa e ao mesmo tempo decidir PARA qual etapa ir. Resolução: **classificação = roteamento na ingestão (a)**; **ações de IA on-enter (b)** são responder/sugerir/gerar/decidir-ramo-interno. "Classificar evento" foi **removida** da tabela de ações de etapa e vive como função do dispatcher.

> **Contrato e guardrails de IA:** toda saída é validada (Zod/JSON Schema) antes de virar decisão; `confidence` na faixa cinzenta cai em **fallback humano** (ver [taxonomia/faixas](#exemplos-de-fluxo-end-to-end)). O job de IA tem `idempotency-key (execution_id, step_id)` — retry **não re-gera** chamada cara ao LLM; cacheia o resultado. `execution_log` guarda input/output/tokens para auditoria e custo. Cachear por `(tenant, contact, intent)` é essencial dado o custo de recuperação no grafo.

### Idempotência e retries

Idempotência em **3 níveis**:

- **Evento:** `automation_event.dedupe_key UNIQUE` (ex.: `sha256(card_id|stage_changed|from|to|bucket)`); webhooks entram com `dedupe_key` = id natural do provedor (`leadgen_id`, message id, order id) e `INSERT ON CONFLICT DO NOTHING` (igual à ingestão de webhooks, §3.3 do doc de CRM).
- **Execução:** `UNIQUE(rule_id, event_id)` impede que o mesmo evento crie duas execuções da mesma regra.
- **Ação com efeito externo:** `idempotency-key` determinística por `(execution_id, step_id)` — retry não envia mensagem duas vezes.

**Retries:** backoff exponencial com jitter, `max attempts` por step; ao esgotar, vai para **DLQ** (`status = failed` + log) sem travar a fila.

**Ordenação (condicionada à fila escolhida).** Eventos do mesmo `card_id` devem rodar em ordem de `seq` (FIFO por card), senão `stage_exited` roda depois de `stage_entered`. **A garantia FIFO-por-card depende da fila:**

| Fila | Como faz FIFO-por-card |
|------|------------------------|
| **BullMQ** | Suporte nativo via **grouped jobs / FlowProducer** (chave de grupo = `card_id`). |
| **pg-boss** | **Não** tem ordering por chave nativo equivalente. FIFO-por-card precisa ser feito na **camada de aplicação**. |
| **Cloudflare Queues** | Ordering por consumer; agrupar por `card_id` exige lógica de aplicação. |

> **Recomendação resiliente à fila:** implementar a ordenação **na camada de aplicação** usando o `seq` já existente em `automation_event` — o worker processa eventos de um `card_id` apenas se não há `seq` anterior do mesmo aggregate ainda `pending`/`running` (`ORDER BY seq` + lock por aggregate). Assim a garantia FIFO-por-card **não fica refém** da fila. **Tie-breaker:** para webhooks da Meta com `created_time` na mesma granularidade de segundo, desempatar por `provider_seq` (id/sequência do provedor) e, em último caso, pelo `seq` interno. Ordem global não é necessária nem desejável.

## Riscos e anti-padrões

| Risco | Defesa |
|-------|--------|
| **Loops de automação** (card dispara trigger que move card que dispara trigger…) | (a) **Guarda de profundidade com `causation_chain`** — ver detalhamento abaixo. (b) **Dedupe** por `dedupe_key`. (c) **`max_executions_per_card` com janela rolling** (não vitalício). (d) **No-op detection** — `move_card` para o stage atual **não** emite `stage_changed`. (e) **Detecção de ciclo em design-time** no builder (A→X, X→Y, Y→X). |
| **Rate limits Meta / WhatsApp** | **Token-bucket persistido por `(tenant, canal)`** (`channel_rate_state`) na frente de toda action de envio (WhatsApp Cloud tem tiers 1k/10k/100k + janela 24h; Meta limita por Page — erro `32`/`613`). Ao estourar, a action **não falha** — **re-agenda** (`scheduled_task`) respeitando o limite; respeitar `X-Business-Use-Case-Usage`; **fila separada por canal** para que throttle de WhatsApp não bloqueie IG. |
| **Ordenação de eventos** | Webhooks chegam fora de ordem → ordenar por `created_time`/`timestamp` do payload, **não** por chegada; **tie-breaker** `provider_seq`/`seq` para empates de segundo. FIFO por `card_id` na camada de aplicação (independente da fila). |
| **Multi-tenant** | `tenant_id` em toda tabela, query e mensagem de fila. **Postgres RLS** como rede de segurança além do filtro de aplicação. Nunca regra do tenant A age sobre card do tenant B. |
| **Noisy neighbor** | Cota/rate-limit de execução **por tenant**; fairness via filas por tenant ou weighted scheduling — um tenant barulhento não esgota os workers. |
| **Outros guardrails** | Secrets de canal (`page_access_token`) cifrados; `http_webhook` com timeout + circuit breaker; timers em **UTC** (`fire_at`) com jitter, tolerando atraso do scheduler; **modo de teste/simulação** (como o do Bitrix24) para validar regras antes de ativar. |

### Loop-guard: parâmetros e justificativa

O loop-guard é **inegociável** num produto onde a IA decide ações — uma cadeia que se realimenta espirala **custo de LLM**, não só de DB. Os parâmetros precisam de critério, não números soltos:

- **`depth` por `causation_chain`, não por card.** Cada execução guarda `causation_id` (quem a causou) e `root_event_id` (a raiz). **`depth` incrementa** ao longo de uma cadeia **causada pela própria automação** (evento automação-derivado herda `root_event_id` e `depth+1`). Um **evento externo genuíno do cliente** (`is_external_origin = true`: nova DM, nova mensagem, novo pedido) **reseta `depth = 0` e inicia nova `causation_chain`**. Assim o nurturing legítimo de meses **não** acumula depth de cadeias antigas.
- **Critério do limite (em vez de "10").** Escolher o teto pelo **custo de LLM esperado por cadeia**: se cada salto pode acionar uma classificação/resposta (custo `c`), e o orçamento aceitável por evento-raiz é `B`, então `max_depth ≈ B / c`. Para o caso típico (1–2 chamadas de LLM por salto), isso costuma cair em **3–6**, não 10. O teto é **configurável por tenant** e logado quando estoura ("loop guard tripped", com a `causation_chain` para depuração).
- **`max_executions_per_card` com janela temporal.** O contador vive em `card_rule_counter` com `window_start` — limite é **N por janela rolling** (ex.: 20 / 24h), não no total de vida do card. Sem janela, uma cadência de nurturing de meses bateria no limite indevidamente.
- **Loop A→B→A com IA oscilante.** O caso caro (lead manda msg → IA move para `qualified` → robô responde → cliente responde → IA reclassifica → move de volta → …): a resposta do cliente é **evento externo** (reseta depth), então o `depth` sozinho não barra. Quem barra é a combinação **`max_executions_per_card` por janela** (limita reclassificações por card/hora) + **no-op detection** + **histerese na transição** (a IA precisa de `confidence` mais alta para *reverter* uma transição recente do que para avançar). O critério de auto-reversão é mais estrito que o de avanço, justamente para amortecer a oscilação.

> O **rate-limit por tenant+canal é existencial**: o WhatsApp suspende números que excedem limites — o motor trata throttle como **re-agendamento**, nunca como falha descartada.

## A definir / Decisões em aberto

Estas decisões são **load-bearing**: várias propriedades afirmadas no resto do doc dependem delas. Enquanto não resolvidas, as afirmações abaixo ficam **condicionais** (e estão marcadas como tal no texto).

### Escolha da fila (pg-boss vs. BullMQ vs. Cloudflare)

Critério explícito para decidir **agora**:

- **Já existe Redis/Upstash no projeto?** Se sim, **BullMQ** ganha: traz **rate-limiter nativo por fila** e **FIFO-por-card via grouped jobs/FlowProducer** sem código extra.
- **Throttle de WhatsApp é prioridade dia-1?** Se sim, idem BullMQ (o rate-limiter nativo encurta o caminho).
- **Zero-infra / serverless-first é prioridade?** **pg-boss** (sobre Neon) para começar, **assumindo** que FIFO-por-card e rate-limiting serão feitos na **camada de aplicação** (já especificada: `seq` por aggregate + `channel_rate_state`).
- **Serverless puro / edge?** **Cloudflare Queues/Workflows** + Cron Trigger para o scheduler.

**Afirmações condicionadas a esta escolha** (não tratar como garantidas até decidir):

| Propriedade | Garantida nativamente por | Se a fila não fornecer |
|-------------|---------------------------|------------------------|
| **Rate-limiter por canal** | BullMQ | Implementar `channel_rate_state` (token-bucket) na aplicação |
| **FIFO-por-card** | BullMQ (grouped) | Implementar ordering por `seq`/aggregate na aplicação |
| **Suspensão de worker sem bloquear** | todas (via `scheduled_task`) | — |
| **NOTIFY vs. polling em Neon** | — (Neon força polling) | Cron externo drena o scheduler |

> **Decisão recomendada (default):** começar com **pg-boss** + ordering/rate-limit na camada de aplicação (mantém zero-infra e não fica refém da fila); migrar para **BullMQ** quando o throttle de WhatsApp em escala justificar o Redis. As propriedades de FIFO/rate-limit são afirmadas como **da aplicação**, não da fila — por isso não dependem da escolha.

### CAPI para forms web próprios

Citado em 3 lugares (Cenário 1, Catálogo, Roadmap) e **ainda não resolvido**. O mecanismo (CAPI via dataset com `user_data` hasheado, `action_source = website`) será especificado na [visao-geral.md](../produto/visao-geral.md) §"Web forms". **Até lá**, os trechos que o mencionam ficam marcados como condicionais — não tratar o fluxo de forms web como pronto.

## Roadmap / faseamento sugerido

| Fase | Escopo |
|------|--------|
| **MVP** | Pipeline padrão = `lead_pipeline.stage` existente (Vendas/Atendimento). Triggers PUSH essenciais (leadgen, WhatsApp/DM recebido, comentário). **Triggers de venda** (pedido pago na loja própria → `won`). Outbox + polling (SKIP LOCKED) + pg-boss + cron externo para o scheduler. Robôs: responder GraphRAG, etiquetar, atribuir, mover card, esperar, armar timer. Classificador de roteamento na ingestão. CAPI on-enter em `qualified`/`won` (action_source `system_generated`). Idempotência (3 níveis) e loop-guard com `causation_chain`. |
| **Fase 2** | `on-stay-duration` + scheduler de timers com jitter (speed-to-lead, reativação). **Triggers de marketplace** (Mercado Livre/OLX: pergunta → card; pedido pago → `won`). Builder no-code visual com `if/else` compilado para regras-por-etapa. Condições `AND`/`OR` + biblioteca de **templates prontos** (estilo RD/HubSpot). Rate-limiter por `(tenant, canal)`. Modo de teste/simulação. |
| **Fase 3** | Trigger semântico `ai.intent_detected` maduro. Ação **sugerir produto do grafo**. Múltiplos pipelines por tenant + mover card **entre pipelines** (com stage de pouso + cancelamento de timers). Board de **Conteúdo** (Ideia→Criativo Nano Banana→Aprovação→Agendado→Publicado→Engajamento). **Canais TikTok e X/Twitter** plugados no mesmo barramento via `channel.message_received`/`channel.comment_received` (ver [tiktok.md](../investigacoes/tiktok.md), [twitter.md](../investigacoes/twitter.md)). |
| **Avançado** | `wait_for_event` (continuations dirigidas por evento). Enrollment por critério (HubSpot). Distribuição inteligente de leads (rodízio/região/carga). Observabilidade de custo de IA por execução. RLS por tenant. CAPI para forms web próprios (dataset com `user_data` hasheado, `action_source = website`). |

## Glossário

- **Trigger (gatilho)** — regra *inbound* que **move o card para** uma etapa ao ocorrer um evento (externo ou sintético de timer). **Tudo que move card é trigger.**
- **Robô / Regra de automação** — regra *outbound* que **executa ações** ao entrar/permanecer numa etapa.
- **Robô que arma timer** — robô outbound cujo efeito é criar um `scheduled_task`; o **disparo** do timer age como trigger de movimentação. **Armar é robô; mover é trigger.**
- **Classificador de roteamento** — função de IA que roda na **ingestão**, antes da transição, decidindo a coluna-destino. Não é robô de etapa.
- **on-enter / on-exit / on-stay-duration** — gatilhos derivados da entrada, saída e tempo de permanência. O on-stay é um **robô que arma timer** cujo disparo move o card.
- **causation_chain** — cadeia causal de execuções (via `causation_id`/`root_event_id`) usada para incrementar `depth` em loops automação-derivados e **resetá-lo** em eventos externos genuínos.
- **Transactional Outbox** — padrão de escrever o evento na mesma transação da mutação, garantindo que nenhum evento se perca.
- **DLQ (Dead Letter Queue)** — fila de mensagens que esgotaram retries, isoladas para não travar a fila principal.
- **Loop-guard** — guarda de profundidade (por `causation_chain`) que interrompe cadeias de automação que se realimentam.
- **CAPI (Conversions API)** — API da Meta para devolver conversões server-side, otimizando campanhas. `action_source = system_generated` para eventos de CRM/funil.
- **DSL** — *Domain-Specific Language*; aqui, o JSON versionado que descreve trigger + condições + grafo de ações.

## Documentos relacionados

- [visao-geral.md](../produto/visao-geral.md) — visão geral do produto, o modelo evento → classificação → ação e as Integrações de venda (§4: loja/marketplaces).
- [concorrentes.md](../investigacoes/concorrentes.md) — análise de mercado (Kommo, BotConversa, Clint, RD, Pipedrive, HubSpot) e o que copiar vs. diferenciar.
- [leads-crm.md](./leads-crm.md) — fluxo Lead Ads → mini-CRM, pipeline `new→contacted→qualified→won/lost` e Conversion Leads (CAPI).
- [instagram.md](../investigacoes/instagram.md) — webhooks de canal (comments, mentions, messages, postbacks, referral, optins), a espinha dorsal dos triggers PUSH.
- [facebook.md](../investigacoes/facebook.md) — webhooks de Facebook (comentários de Página, Messenger), fonte dos triggers PUSH de comentário FB e DM via Messenger.
- [tiktok.md](../investigacoes/tiktok.md) — investigação de TikTok (comentários, DMs, remarketing, posting); canal a plugar via `channel.*` numa fase futura.
- [twitter.md](../investigacoes/twitter.md) — investigação de X/Twitter (replies, DM, engajamento, remarketing); canal a plugar via `channel.*` numa fase futura.

---

> **Fontes (validação CAPI):** os valores de `action_source`/`event_name` devem ser validados contra a doc atual da Meta antes de implementar.
> - [Conversions API — Parameters (Meta for Developers)](https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters)
> - [Conversions API for CRM for Platforms (Meta for Developers)](https://developers.facebook.com/docs/marketing-api/conversions-api/guides/conversions-api-crm-for-platforms/)
