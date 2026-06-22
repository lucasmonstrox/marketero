---
tipo: investigacao
status: estável
updated: 2026-06-22
description: Runtime de orquestração do Agente conversacional (FSM+LLM) em Cloudflare Workers — FSM própria/XState dentro de um Durable Object por thread_id; LangGraph.js desqualificado (checkpointer quebrado), Temporal não roda em Workers.
---

# Orquestração do Agente conversacional — runtime

> Investigação do **runtime** que executa o Agente conversacional especificado em [agentes.md](../funcionalidades/agentes.md): uma IA híbrida **FSM + LLM** ("a FSM decide o fluxo, o LLM entende a linguagem") que conduz um Form em diálogo sobre canais **assíncronos** (WhatsApp/DM). Entre dois turnos **não há processo vivo** → o runtime precisa fazer **checkpoint por `thread_id`** e retomar na próxima mensagem, com **interrupt/resume para humano** (handoff). O `agentes.md` §5 deixou a escolha de runtime aberta ("talvez LangGraph"); esta investigação a fecha.
>
> **Constraint load-bearing:** o backend é **Cloudflare Workers** (isolates V8, JS/TS — **não** Node, **não** Python). Um framework Python-cêntrico que não roda em Workers está desqualificado ou vira um serviço à parte. A stack de eventos/estado é a de [ingestao-inbox-realtime.md](ingestao-inbox-realtime.md) (Worker→Queue→Workflow→Durable Object).
>
> Pesquisa multi-fonte com verificação adversarial (≈55 fontes; docs oficiais Cloudflare/XState/Temporal/Inngest/Restate, issue do LangGraph.js, papers de slot-filling/FSM). Confiança por claim. **Ressalva:** versões/limites de SDKs mudam rápido — reconfirmar antes de implementar.
>
> **Resumo da decisão.**
> 1. **Runtime recomendado: FSM própria table-driven (ou XState v5) dentro de um Durable Object por `thread_id`** ⭐ — checkpoint em **DO SQLite** (espelhado em Postgres), **alarms** do DO p/ timeout/escalação, Claude via `fetch`/`@anthropic-ai/sdk`. Casa exatamente com o `agentes.md` §5 ("tabela de transição como dado, runtime é detalhe"), roda nativo em Workers sem servidor de durable-execution externo, e dá serialização single-threaded por conversa de graça.
> 2. **Wrapper recomendado: Cloudflare Agents SDK** (sobre DO) ⭐ — dá `setState`, `schedule()`, SQL, RPC e um padrão de HITL documentado; use p/ encanamento e mantenha a **lógica da FSM como seu dado**. (É 0.x — ver [ingestao-inbox-realtime.md](ingestao-inbox-realtime.md) §8.)
> 3. **Fallback gerenciado: Cloudflare Workflows** (GA) ⭐ — `step.waitForEvent` p/ HITL até 365 dias; **cilada**: retenção de estado de instância ociosa é **30 dias** → conversas que dormem meses precisam de DO/Postgres como registro durável.
> 4. **Evitar em Workers** ❌ — **LangGraph.js** (checkpointers quebrados em Workers, bug aberto **#1692**), **Temporal** (Worker não roda em Workers). **Restate/Inngest** são viáveis mas forçam um serviço de durable-execution separado — só se quiser a ergonomia deles sobre o nativo da Cloudflare.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — o design está fixado, a questão é o runtime](#2-enquadramento--o-design-está-fixado-a-questão-é-o-runtime)
3. [O insight arquitetural (FSM decide, LLM entende)](#3-o-insight-arquitetural-fsm-decide-llm-entende)
4. [Opção a opção](#4-opção-a-opção)
5. [Comparação](#5-comparação)
6. [Stack recomendada (concreta)](#6-stack-recomendada-concreta)
7. [Mitos refutados](#7-mitos-refutados)
8. [Perguntas em aberto](#8-perguntas-em-aberto)
9. [Fontes](#9-fontes)

---

## 1. Sumário executivo

| Opção | Checkpoint entre turnos | HITL interrupt/resume | **Roda em CF Workers?** | Maturidade | Lock-in |
|---|---|---|---|---|---|
| **FSM própria table-driven** ⭐ | ✅ serializa p/ DO/Postgres (você controla) | ✅ estado `escalated` + alarm | ✅ **sim** | seu código | nenhum |
| **XState v5** ⭐ (motor da FSM) | ✅ `getPersistedSnapshot` (JSON) — precisa de store | ✅ estado + evento | ✅ **sim** (JS puro) | alta | baixo (OSS) |
| **Agents SDK** ⭐ (wrapper) | ✅ `setState`+SQL (DO) | ✅ documentado (needsApproval/Workflows/schedule) | ✅ **sim** (nativo) | média-alta | CF |
| **Durable Objects** ⭐ (substrato) | ✅ SQLite/KV + alarms, single-thread | ✅ estado + alarm + evento inbound | ✅ **sim** (nativo) | alta | CF |
| **CF Workflows** (fallback) | ✅ steps duráveis; **retenção ociosa 30d** | ✅ `waitForEvent` (1s–365d) | ✅ **sim** (nativo) | alta (GA) | CF |
| **LangGraph.js** | ❌ checkpointers **quebrados em Workers** (#1692) | ✅ `interrupt()` (em JS) | ⚠️ motor talvez; **persistência não** | média | LangGraph Platform |
| **Temporal** | ✅ (server-side) | ✅ Signals | ❌ **Worker não roda em Workers** | altíssima | Apache server |
| **Inngest / Restate** | ✅ (no serviço deles) | ✅ waitForEvent / Awakeables | ✅ handler sim; **estado fora de Workers** | média/nova | cloud proprietário |

**Veredito:** FSM própria/XState **dentro de um DO** (com Agents SDK como wrapper opcional); Workflows como fallback gerenciado por turno; DO/Postgres sempre como registro durável de longo prazo.

---

## 2. Enquadramento — o design está fixado, a questão é o runtime

O `agentes.md` já decidiu o *design*: Form compila numa FSM; a FSM garante obrigatórios/consentimento/escalação (determinístico); o LLM faz NLU (extrair slots, digressão, responder via GraphRAG). E já antecipou a tabela de alternativas (§5: LangGraph vs FSM própria vs XState) com a recomendação de "modelar a tabela de transição como dado e tratar o runtime como detalhe". Esta investigação **valida e fundamenta** essa intuição, e mata a dúvida "talvez LangGraph" com o constraint que decide tudo: **o backend é Workers (TS, não Python)**.

---

## 3. O insight arquitetural (FSM decide, LLM entende)

O híbrido separa duas preocupações que mapeiam em duas necessidades de runtime diferentes:

1. **Controle de fluxo (FSM determinística):** obrigatórios, gate de consentimento, escalação, estados terminais. É uma **função pura** `(estado, evento) → (próximo_estado, ações)`. Precisa de **serialização + reidratação**, não de processo vivo. → FSM table-driven / snapshot do XState.
2. **NLU (LLM/Claude):** extrair valor de slot de texto livre, digressão, responder via GraphRAG. É uma **chamada de I/O com efeito** — só um request HTTP ao Claude dentro de qualquer step/handler. **Todo runtime aqui trata a chamada LLM igual** (fetch/SDK normal) → a integração com o LLM **não diferencia** as opções.

> **Conclusão:** a decisão real é puramente **(a) onde o estado da FSM faz checkpoint** e **(b) como interrupt/resume funciona**. Em Workers, isso favorece fortemente o stack centrado em **Durable Object**.

---

## 4. Opção a opção

### 4.1. LangGraph (Python) vs LangGraph.js — ❌ desqualificado em Workers

- **Paridade JS:** o `@langchain/langgraph` chegou a 1.x e é estável; motor de grafo, HITL (`interrupt()`/`Command({resume})`) e `MemorySaver` existem em JS. Python segue sendo a implementação de referência, com ecossistema de checkpointer mais rico. (média)
- **CRÍTICO — checkpointers quebram em Workers:** issue aberta **langchain-ai/langgraphjs#1692** (set/2025, **ainda aberta, sem fix, sem workaround**): os checkpointers Postgres/Redis falham em Cloudflare Workers porque o runtime encerra o request antes do write assíncrono terminar, e **o LangGraph.js não expõe hook p/ `ctx.waitUntil()`** estender o ciclo de vida. Sem checkpointer não há retomada entre turnos — que é o requisito inteiro. (alta)
- **Veredito:** p/ o job assíncrono-com-checkpoint em Workers, **desqualificado** até #1692 ser resolvido. LangGraph Python não roda em Workers (seria serviço Python à parte). Atenção também ao lock-in do LangGraph Platform p/ persistência gerenciada. (alta)

### 4.2. XState v5 — ⭐ forte como motor da FSM (não como camada de durabilidade)

- Statecharts TS puros + modelo de atores; **sem dependências Node → roda limpo em Workers**. (alta)
- **Persistência é first-class e é exatamente nosso padrão:** `actor.getPersistedSnapshot()` devolve **objeto JSON serializável**; reidrata com `createActor(machine, { snapshot }).start()`. A doc cita explicitamente "server-side (persistir estado de workflow)" como caso de uso; v5 persiste profundo (atores aninhados). (alta)
- **HITL:** trivial — um estado `waitingForHuman` que retoma num evento externo. (alta)
- **Caveats:** (a) na reidratação, invocações já em andamento são **reiniciadas** (ações tidas como já executadas **não** re-rodam) — desenhar p/ a chamada LLM em voo não ser re-emitida nem perdida na fronteira de turno; no nosso modelo a chamada acontece *dentro* do turno e completa antes do snapshot, então é gerenciável **se** deliberado. (b) **compatibilidade de snapshot a longo prazo:** mudar a definição da máquina pode quebrar a reidratação de snapshots antigos → **versionar máquinas e migrar snapshots**. (alta/média)
- **Veredito:** melhor da categoria p/ *definição de FSM + serialização de checkpoint*. **Não** é camada de durabilidade/transporte — ainda precisa de onde guardar o snapshot e re-invocar (um DO/Postgres). Casa perfeito com 4.4/4.5.

### 4.3. FSM própria table-driven — ⭐ recomendada (casa com a spec)

- Compilar cada Form → tabela de transição (`estado × evento → próximo + slots + ações`) como **dado**; o runtime é um interpretador minúsculo. Alinha com slot-filling frame-based clássico controlado por autômato finito (fill-next, revise, fill-multiple, digress — exatamente o `agentes.md` §3.1). (alta)
- Roda no pipeline **webhook → Queue → Worker → (DO por `thread_id`)** já recomendado. Um DO dá **processamento sequencial single-threaded por conversa** (sem corrida entre mensagens inbound concorrentes do mesmo thread). (alta)
- Checkpoint = serializar `{estado, slots, history_cursor}` p/ **DO SQLite** (e/ou espelhar em Postgres p/ analytics/joins com o grafo). Resume = carregar linha, aplicar evento, persistir. HITL = estado `escalated` + **alarm** do DO p/ timeout/auto-escalação.
- **Prós:** zero lock-in; tabela é dado portável (sobrevive a troca de runtime — "runtime é detalhe"); testável trivial; sem serviço externo; controle total. **Contras:** você dona o código de resume/alarm/idempotência (pequeno); sem visualização/tooling grátis do XState.
- **Veredito:** maior aderência à spec. Refino pragmático: **usar XState v5 como o interpretador da tabela** (ganha serialização, guardas e visualização de graça), salvo se quiser zero-dep absoluto.

### 4.4. Cloudflare Agents SDK — ⭐ substrato/wrapper recomendado

- O `Agent` **é um Durable Object** com built-ins: `this.setState()` + SQL embutido, `this.schedule()` (alarms) p/ timeout/escalação, RPC, WebSockets, observabilidade. (alta)
- **Relação com FSM+LLM:** é *substrato durável*, não um loop de agente opinativo imposto. Você roda **sua FSM dentro** de um Agent e o usa só p/ estado durável + scheduling + RPC. (Tem helpers de chat/tool-loop — `AIChatAgent` — que você pode ignorar.) (média)
- **HITL documentado:** `AIChatAgent` `needsApproval` (pausa antes de executar), integração com **Workflows `waitForApproval()`** p/ pausas duráveis de horas/dias, e `this.schedule()` ("lembrar em 4h, escalar em 24h"). (alta)
- **Chama Claude:** fetch ou `@anthropic-ai/sdk` de dentro do Agent/DO; opcionalmente via **Cloudflare AI Gateway** p/ cache/observabilidade/BYOK. (alta)
- **Flags:** proprietário Cloudflare (lock-in); é **0.x, não-GA** (churn — ver [ingestao-inbox-realtime.md](ingestao-inbox-realtime.md) §8). (média)
- **Veredito:** substrato durável natural. **Par recomendado:** Agents SDK (ou DO cru) p/ estado+schedule+RPC; sua FSM table-driven/XState p/ a lógica.

### 4.5. Durable Objects direto — ⭐ o substrato sob tudo

- Um DO por `thread_id` = a instância da FSM + checkpoint. **SQLite/KV** guarda o snapshot; **alarms** cuidam de timeout de turno e escalação. Single-threaded → serialização built-in de mensagens concorrentes. (alta)
- **vs Agents SDK:** o Agents SDK é camada de conveniência *sobre* DO. DO cru = controle máximo/menos mágica; Agents SDK = pular boilerplate. Ambos CF-nativos, rodam a FSM + chamadas Claude inline.
- **Veredito:** fundação do stack recomendado. "DO cru" vs "wrapper Agents SDK" é escolha ergonômica, não arquitetural.

### 4.6. Durable-execution externo (Temporal / Inngest / Restate) — todos forçam serviço à parte

| Engine | Código durável EM Workers? | Serviço não-Workers separado? | Veredito |
|---|---|---|---|
| **Temporal** | **Não** | **Sim** — cluster/Cloud + frota de Workers polling gRPC | **Desqualificado em Workers.** SDK TS precisa de native Node-API (core Rust) + `vm`; serverless Workers é AWS-Lambda-only, pré-release. Worker só pode ser *client* fino. |
| **Inngest** | **Sim** (`inngest/cloudflare`/`hono`) | **Sim** — durabilidade/estado no serviço central da Inngest | Viável. Função roda em Workers; **orquestração é serviço separado** (maior lock-in cloud; dev server OSS). |
| **Restate** | **Sim** (`@restatedev/restate-sdk-cloudflare-workers`) | **Sim** — **Restate Server** separado (self-host single-binary ou Cloud) obrigatório | "Handler durável EM Workers" mais limpo dos três. Caveat: Workers em modo suspend/re-invoke não-bidirecional (latência extra). |

- Nos três, a chamada LLM é só HTTP/SDK dentro de um step durável. (alta)
- **Veredito:** nenhum dá durable-execution só **a partir de Workers** — cada um adiciona um broker/serviço externo p/ rodar e pagar. Como a Cloudflare oferece **Workflows** (nativo, sem servidor externo) p/ o mesmo job, externo só se justifica pela ergonomia específica ou portabilidade multi-cloud.

### 4.7. Cloudflare Workflows — fallback nativo (surgiu na pesquisa)

- GA desde abr/2025; durable execution nativo em Workers; `step.do` (checkpointed), `step.sleep` (até **365 dias**), **`step.waitForEvent` p/ HITL** casado com `instance.sendEvent()`. (alta)
- **⚠️ CILADA p/ conversas longas:** retenção de estado de instância **completa/ociosa é 30 dias no Paid (3 no Free)**. Embora o *timeout* do `waitForEvent` possa ser 365 dias, **não confie** no Workflows p/ segurar o estado de uma conversa dormente por meses. P/ um thread de WhatsApp que pode silenciar semanas e retomar, **preferir DO/Postgres como registro durável** e tratar Workflows como orquestração por turno. (alta; interação waitForEvent×retenção não totalmente documentada — verificar)

---

## 5. Comparação

(ver tabela do §1 — eixos: checkpoint entre turnos · HITL · **roda em Workers** · maturidade · lock-in). O divisor de águas é a coluna **"roda em Workers"**: ela elimina LangGraph.js (persistência), Temporal (runtime), e relega Inngest/Restate a "serviço externo". Sobra o quadrante CF-nativo: **DO / Agents SDK / Workflows**, com a **lógica de FSM** sendo sua (table-driven ou XState).

---

## 6. Stack recomendada (concreta)

```
webhook WhatsApp/DM → Worker (valida, 200 rápido) → Cloudflare Queue
   → Worker consumidor → Durable Object / Agent (Agents SDK) chaveado por thread_id
       • guarda o snapshot da FSM em DO SQLite (espelha em Postgres p/ analytics/joins de RAG)
       • FSM = table-driven (ou máquina XState v5) → decide fluxo/slots/consentimento/escalação
       • NLU/LLM = Claude via @anthropic-ai/sdk (opcional via AI Gateway) p/ extração de slot
         + respostas de digressão (GraphRAG)
       • HITL = estado `escalated`; alarm do DO p/ timeout/auto-escalar; retoma na próxima
         mensagem inbound ou evento de resposta humana
```

**Fallback se quiser orquestração durável gerenciada** em vez de resume na mão: trocar a lógica por-turno do DO por **Cloudflare Workflows** (`step.waitForEvent` p/ HITL) — mas manter DO/Postgres como registro durável p/ conversas que dormem > 30 dias.

> Coerente com o `agentes.md` §6 (persistência por checkpoint sobre o pipeline `ack-fast + fila`) e com [ingestao-inbox-realtime.md](ingestao-inbox-realtime.md) (mesmo substrato DO/Queue/Workflows). A `conversation` do `agentes.md` §9 (com `thread_id`, `current_state`, `slots`, `pending_question`) **é** o snapshot da FSM neste runtime.

---

## 7. Mitos refutados

- ❌ **"LangGraph é o caminho natural p/ o Agente"** (o "talvez" do `agentes.md` §5) — **refutado em Workers.** LangGraph.js tem checkpointers quebrados em Workers (#1692, aberto); LangGraph Python não roda em Workers. Só serviria como serviço Python separado.
- ❌ **"Precisamos de Temporal/durable-execution dedicado p/ retomar conversas"** — **desnecessário e inviável em Workers.** Temporal não roda seu Worker em Workers; Durable Objects + alarms já dão checkpoint+resume+timeout nativos. Workflows cobre o caso gerenciado.
- ❌ **"O runtime define a arquitetura do Agente"** — **refutado.** A chamada LLM é idêntica em todo runtime; a única decisão é onde o estado da FSM faz checkpoint e como interrupt/resume — daí "tabela de transição como dado, runtime é detalhe" (`agentes.md` §5) estar certo.
- ⚠️ **"Agents SDK é GA e estável"** — é **0.x**; produção-positioned mas com churn de API. Workflows (irmão) é GA.

---

## 8. Perguntas em aberto

1. **FSM própria vs XState v5 como interpretador:** zero-dep total vs ganhar serialização/guardas/visualização. Provável: XState como motor, tabela compilada do Form como dado.
2. **DO cru vs Agents SDK:** aceitar churn de 0.x pela ergonomia, ou DO cru por estabilidade — decisão conjunta com [ingestao-inbox-realtime.md](ingestao-inbox-realtime.md) §8.
3. **Workflows por turno vs lógica no DO:** usar Workflows como orquestrador durável por turno (HITL via `waitForEvent`) ou manter tudo no DO — medir a interação `waitForEvent` × retenção de 30 dias p/ conversas dormentes.
4. **Reentrância da chamada LLM:** garantir idempotência da extração de slot na fronteira de turno (XState reinicia invocações em voo; FSM própria precisa de guarda) — não re-emitir nem perder a chamada Claude.
5. **Versionamento de máquina/snapshot:** política de migração quando o Form (e logo a FSM) muda, respeitando o `form_snapshot_at` imutável do `agentes.md` §4.
6. **AI Gateway:** rotear as chamadas Claude por ele p/ cache/observabilidade/BYOK desde o início?
7. **Cruzamentos:** [classificacao-eventos.md](classificacao-eventos.md) (a classificação stateless decide *abrir* uma conversa do Agente) e [graphrag-noderag.md](graphrag-noderag.md) (o `suggest_product`/digressão consultam o grafo).

---

## 9. Fontes

> Limites/versões de SDK mudam — reconfirmar. Itens inferidos/atrás de JS marcados no corpo.

**Cloudflare — DO / Agents / Workflows**
- Durable Objects — <https://developers.cloudflare.com/durable-objects/> · <https://developers.cloudflare.com/durable-objects/platform/limits/>
- Agents SDK + HITL — <https://developers.cloudflare.com/agents/> · <https://developers.cloudflare.com/agents/concepts/human-in-the-loop/> · <https://developers.cloudflare.com/agents/api-reference/run-workflows/> · <https://github.com/cloudflare/agents>
- Workflows + waitForEvent — <https://developers.cloudflare.com/workflows/> · <https://developers.cloudflare.com/workflows/examples/wait-for-event/> · <https://developers.cloudflare.com/workflows/reference/limits/> · <https://blog.cloudflare.com/workflows-ga-production-ready-durable-execution/>
- AI Gateway (Anthropic) — <https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/>

**LangGraph.js**
- Checkpointer quebrado em Workers (issue) — <https://github.com/langchain-ai/langgraphjs/issues/1692>

**XState**
- Persistência — <https://stately.ai/docs/persistence> · <https://stately.ai/blog/2023-10-02-persisting-state> · <https://stately.ai/docs/actors>

**Durable-execution externo**
- Temporal (workers/serverless) — <https://docs.temporal.io/workers> · <https://docs.temporal.io/serverless-workers> · <https://github.com/temporalio/sdk-typescript>
- Inngest (Cloudflare/waitForEvent/self-host) — <https://www.inngest.com/docs/learn/serving-inngest-functions> · <https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event> · <https://www.inngest.com/docs/self-hosting>
- Restate (Workers SDK/server) — <https://docs.restate.dev/services/deploy/cloudflare-workers> · <https://docs.restate.dev/develop/ts/external-events> · <https://www.npmjs.com/package/@restatedev/restate-sdk-cloudflare-workers>

**FSM / slot-filling**
- State transition tables / data-oriented design — <https://www.dataorienteddesign.com/dodmain/node8.html> · <https://www.mathworks.com/help/stateflow/ug/state-transition-tables-in-stateflow.html>
- Slot-filling dialog — <https://arxiv.org/pdf/2406.08848>
