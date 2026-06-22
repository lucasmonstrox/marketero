---
tipo: referencia
status: estável
updated: 2026-06-22
description: Contrato técnico do Marketero — stack convergente (Cloudflare Workers + Postgres único + Claude) consolidando as investigações; corrige a suposição AGE-no-Neon (não suportado → grafo via CTEs).
---

# Arquitetura de referência

> **O contrato técnico do Marketero.** Consolida as decisões que saíram das [investigações](../investigacoes/) numa só stack coerente e **valida as suposições load-bearing antes de virarem código**. É o primeiro documento do eixo `referencia/` (ver fluxo em [docs/README.md](../README.md): investigação → decisão → planos → **referência**).
>
> As investigações de API, IA e infra **convergiram na mesma stack** — Cloudflare Workers + Postgres único + Claude. Este doc desenha as **fronteiras** (o que roda onde) e os **contratos** (schema, isolamento de tenant, vault de credenciais), apontando para as investigações onde mora o detalhe.
>
> **Correção importante validada aqui:** a recomendação de [graphrag-noderag.md](../investigacoes/graphrag-noderag.md) de usar **Apache AGE** no Postgres **não se sustenta** — o **Neon não suporta AGE** (nem RDS; só Azure Flexible Server oficialmente), e o AGE é projeto Apache *Incubator* que perdeu o time de dev em out/2024. **Decisão: grafo via pgvector + CTEs recursivas/closure tables em Postgres puro**, sem AGE. Ver §4.
>
> Confiança por claim onde houver incerteza; specs de produto Cloudflare reconfirmar no console (mudam rápido).

---

## Índice

1. [Sumário executivo — a stack](#1-sumário-executivo--a-stack)
2. [Princípios](#2-princípios)
3. [Topologia — o que roda onde](#3-topologia--o-que-roda-onde)
4. [Camada de dados (a correção do AGE)](#4-camada-de-dados-a-correção-do-age)
5. [Multi-tenancy & isolamento](#5-multi-tenancy--isolamento)
6. [Vault de credenciais OAuth](#6-vault-de-credenciais-oauth)
7. [Pipeline de eventos](#7-pipeline-de-eventos)
8. [Runtime do agente](#8-runtime-do-agente)
9. [Cérebro de IA — RAG faseado](#9-cérebro-de-ia--rag-faseado)
10. [Classificação](#10-classificação)
11. [Modelo de dados consolidado](#11-modelo-de-dados-consolidado)
12. [Deploy, ambientes & observabilidade](#12-deploy-ambientes--observabilidade)
13. [Riscos & decisões em aberto](#13-riscos--decisões-em-aberto)
14. [Mapa: investigações que alimentam isto](#14-mapa-investigações-que-alimentam-isto)
15. [Fontes](#15-fontes)

---

## 1. Sumário executivo — a stack

| Camada | Escolha | Investigação de origem |
|---|---|---|
| **Frontend / app** | Next.js → **Cloudflare Workers via OpenNext** | [[marketero-web-cloudflare-deploy]] (memória) |
| **Ingestão de webhook** | **Worker** (verifica HMAC, 200 rápido) | [ingestao-inbox-realtime](../investigacoes/ingestao-inbox-realtime.md) |
| **Barramento** | **Cloudflare Queues** (at-least-once, DLQ) | ingestao §5 |
| **Pipeline durável** | **Cloudflare Workflows** (hydrate→classify→act) | ingestao §6 |
| **Estado conversa + inbox realtime** | **Durable Objects** (SQLite + WS Hibernation + alarm) | ingestao §7 |
| **Runtime do agente** | **FSM própria/XState v5 dentro de um DO** por `thread_id` | [orquestracao-agente](../investigacoes/orquestracao-agente.md) |
| **Banco** | **Postgres único (Neon)** — pgvector + CTEs (**sem AGE**) via **Hyperdrive** (driver TCP `pg`) | [graphrag-noderag](../investigacoes/graphrag-noderag.md) + correção §4 |
| **Embeddings** | **Workers AI `@cf/baai/bge-m3`** (1024-dim, multilíngue PT-BR) | §9 |
| **LLM** | **Claude** (Haiku/Sonnet/Opus) via **AI Gateway** (cache/observabilidade/BYOK) | classificacao + orquestracao |
| **Classificação** | **Cascade híbrido** (filtro encoder → Haiku structured → self-consistency) | [classificacao-eventos](../investigacoes/classificacao-eventos.md) |
| **Mídia** | **R2** (download de mídia de WhatsApp/etc.) | (a confirmar) |
| **Vault de tokens** | **Envelope encryption** (AES-GCM) em Postgres + master key no **Secrets Store**; refresh single-flight via DO | §6 |

**Diagrama macro:**

```
                         ┌────────────────────────────────────────────────┐
   6+ plataformas  ──▶   │ Worker de Ingestão (verify HMAC, 200 rápido)    │
   (webhooks)            │   → dedupe → Cloudflare Queue                   │
                         └───────────────┬────────────────────────────────┘
                                         ▼
                         ┌──────────────────────────────┐   ┌──────────────┐
                         │ Workflow durável             │   │ Workers AI   │
                         │  hydrate → classify → act    │◀─▶│  bge-m3      │
                         └───────┬──────────────┬───────┘   └──────────────┘
                                 ▼              ▼
                  ┌───────────────────┐  ┌───────────────┐   ┌──────────────┐
                  │ DO: conversa/inbox│  │ Postgres (Neon)│   │ AI Gateway   │
                  │  FSM + WS push    │◀▶│ pgvector + CTEs│   │  → Claude    │
                  │  alarm (timeout)  │  │ (RLS, tenant)  │   └──────────────┘
                  └─────────┬─────────┘  └───────────────┘
                            ▼ WebSocket (Hibernation)        ▲ Hyperdrive (TCP pg)
                  ┌───────────────────┐                      │
                  │ App Next (OpenNext│──────────────────────┘
                  │  on Workers)      │
                  └───────────────────┘
```

---

## 2. Princípios

- **Edge-first / serverless:** tudo roda em Workers (sem servidor longevo) → primitivos stateful (DO) e duráveis (Workflows) em vez de processos vivos; banco via Hyperdrive (conexão por-invocação).
- **Multi-tenant white-label:** isolamento de tenant é invariante de segurança (não só app-layer) → **RLS no Postgres** + `tenant_id` em tudo + vault de credenciais cifrado por tenant.
- **Evento → classificação → ação:** o produto é um pipeline reativo; a arquitetura é desenhada em torno do fluxo de eventos (ingestão → fila → durável → ação), não de CRUD.
- **Custo como constraint:** classificação por evento e extração de grafo são recorrentes → modelos pequenos (Haiku/bge-m3), debounce/batch, cache (AI Gateway, prompt caching).
- **Um store quando possível:** Postgres único (relacional + vetor + grafo-via-CTE) evita lag de sync e simplifica isolamento. Ver §4.

---

## 3. Topologia — o que roda onde

| Componente | Runtime | Responsabilidade |
|---|---|---|
| **App** (telas, ver [[marketero-web-page-surfaces]]) | Next.js/OpenNext em Workers | UI, auth, painel; consome o inbox via WebSocket do DO |
| **Worker de ingestão** | Worker | recebe webhook, verifica assinatura (Web Crypto), grava dedupe, enfileira, **200 em ms** |
| **Queue consumer** | Worker | dispara o Workflow por evento |
| **Workflow** | Cloudflare Workflows | `hydrate` (GET autenticado p/ id-only) → `classify` → `act`; retries duráveis; `waitForEvent` p/ HITL |
| **DO de conversa/inbox** | Durable Object | FSM do agente + checkpoint (SQLite) + push WS ao vivo + alarm de timeout/abandono |
| **Postgres** | Neon (externo) via Hyperdrive | verdade durável: CRM, mensagens, embeddings (pgvector), grafo-via-CTE |
| **Workers AI** | binding | embeddings bge-m3 (RAG + cabeça de classificação) |
| **AI Gateway** | proxy | chamadas Claude com cache/observabilidade/BYOK |
| **Cron Worker** | Worker (scheduled) | reconciliação (`/missed_feeds` do ML, relatórios MP), refresh proativo de tokens |
| **R2** | binding | mídia (download de áudio/imagem do WhatsApp/IG) |

---

## 4. Camada de dados (a correção do AGE)

> **Verdadeiro problema resolvido:** a suposição "Postgres + pgvector + **AGE**" do [graphrag-noderag](../investigacoes/graphrag-noderag.md) §5 **não é implementável no Neon**.

| Achado | Conf. |
|---|---|
| **Neon NÃO suporta Apache AGE** (não está na lista de extensões; "bring your own extension" é beta request-only, não self-serve, e AGE não é confirmado) | alta |
| **RDS também não** suporta AGE; **só Azure Flexible Server** oficialmente (via `azure.extensions` + `shared_preload_libraries`) | alta |
| **AGE é aposta arriscada por si só** — Apache *Incubator* (não Top-Level), Bitnine dispensou o time de dev out/2024, suporte a PG17 atrasado | alta |
| **pgvector no Neon: confirmado** (0.8.x, HNSW + IVFFlat; `vector(1024)` cabe o bge-m3 direto; `halfvec` p/ -50% storage) | alta |
| **Hyperdrive: confirmado** com Neon; **driver TCP `pg`, NÃO o serverless WS do Neon**; transparente a extensões; cache só de reads (usar binding sem cache p/ vetores frescos) | alta |
| **Cloudflare não tem Postgres nativo** — parceria PlanetScale (provisionar + billing unificado, jun/2026); D1 é SQLite-only (sem pgvector/AGE). PlanetScale PG tem pgvector, **sem AGE** | alta |

**Decisão (Opção B):** **Postgres único no Neon — pgvector (1024-dim HNSW) para o RAG + grafo via CTEs recursivas / closure tables / adjacency em SQL puro. Drop AGE.** Benchmarks mostram CTEs recursivas frequentemente **mais rápidas** que AGE em travessias hierárquicas comuns (~40× num caso citado); AGE só ganha em padrões openCypher multi-hop de comprimento variável — improvável no MVP de marketing.

**Fallback (Opção A):** Azure Database for PostgreSQL Flexible Server (AGE oficial) — **só se** property-graph virar requisito provado e as CTEs falharem demonstravelmente. Custo alto (sair do Neon, perder scale-to-zero/branching, adotar Azure). Self-host: não vale no alvo serverless.

> Isto **revisa** o graphrag-noderag §5/§8: a Fase 2 "graph-lite" passa a ser **closure/adjacency tables + CTEs**, não AGE. O design heterogêneo do NodeRAG (nós tipados + PPR raso) continua válido como inspiração, modelado em tabelas relacionais.

---

## 5. Multi-tenancy & isolamento

- **`tenant_id` em toda tabela** + **Row-Level Security (RLS)** no Postgres — isolamento no engine, não só WHERE de aplicação (defense-in-depth). Já é princípio do mini-CRM ([leads-crm](../funcionalidades/leads-crm.md) §6: "isolamento rígido por `tenant_id`, exigência de ToS").
- **Fan-out de webhook → tenant:** mapa `(plataforma, external_id) → tenant_id` (ex.: `phone_number_id`/WhatsApp, `user_id`/ML, `page_id`/Meta — já em `meta_page`). Um endpoint por app, N tenants.
- **White-label:** branding/tema por tenant (design-system multi-tenant já existe no `builder`); dados nunca cruzam tenant.
- **Auth:** **a investigar** (Clerk orgs/RBAC é candidato forte, ainda sem doc) — ver §13.

---

## 6. Vault de credenciais OAuth

O problema: guardar e usar **credenciais OAuth por tenant × plataforma** — refresh tokens do ML (rotativo single-use, 6 meses), MP (180 dias), system-user do WhatsApp/Meta, TikTok/X — lidos a cada ação webhook-driven, rotacionados no tempo. Cada investigação de API sinalizou isto.

**O que NÃO serve** (alta): **wrangler/env secrets** são deploy-time, por-Worker (limite ~64–128/Worker, 5KB) — não escalam para tokens dinâmicos por tenant.

**Padrão recomendado — envelope encryption:**
1. Token de cada tenant **cifrado em repouso no Postgres** (AES-GCM via **Web Crypto** no Worker) — alinhado ao `page_access_token cifrado` já presente em [leads-crm](../funcionalidades/leads-crm.md) §6.
2. **Master/data key** no **Cloudflare Secrets Store** (binding; *confirmar GA/limites no console* — conf. média), decifrada no Worker sob demanda. (Não há KMS nativo Cloudflare — envelope encryption manual.)
3. **Refresh single-flight via DO:** o refresh token do ML **rotaciona a cada uso** → webhooks concorrentes não podem refrescar em dobro (corrida = invalidar o token). Um **Durable Object por (tenant, plataforma)** serializa o refresh (lock single-flight) e persiste **sempre o novo** token. (alta — é o mesmo cuidado já anotado p/ ML/TikTok nas investigações.)
4. **LGPD:** tokens de terceiros + PII de cliente cifrados em repouso; isolamento por tenant; ver [whatsapp](../investigacoes/whatsapp.md) §11.

> ⚠️ Specs exatos do **Cloudflare Secrets Store** (GA, limites de quantidade, rotação, auditoria) ficaram sem confirmação final na pesquisa — **validar no console** antes de cravar. Se Secrets Store não couber, alternativa é master key em variável de ambiente do Worker (deploy-time, 1 segredo, não por-tenant) — aceitável porque os **tokens por-tenant** ficam no Postgres cifrado, e só a **master key** é "secret de plataforma".

---

## 7. Pipeline de eventos

Consolidado de [ingestao-inbox-realtime](../investigacoes/ingestao-inbox-realtime.md):

```
Worker ingestão (verify HMAC, dedupe, 200) → Queue → Workflow(hydrate→classify→act) → DO inbox (WS) 
                                                                          ↘ Postgres (Hyperdrive)
Cron 15min → /missed_feeds (ML) etc. → re-enfileira
```
**Invariantes:** ack-first (NUNCA `waitUntil` p/ trabalho crítico); idempotência por id (dedupe em **DO storage** ou **Postgres `ON CONFLICT`**, **nunca KV**); DLQ configurada; backoff manual nas Queues; SLAs por plataforma (ML **500ms**, MP ~22s) tratados no Worker de ingestão.

---

## 8. Runtime do agente

Consolidado de [orquestracao-agente](../investigacoes/orquestracao-agente.md) e [agentes.md](../funcionalidades/agentes.md):

- **FSM própria table-driven (ou XState v5) dentro de um DO por `thread_id`** — a `conversation` (§11) é o snapshot da FSM; checkpoint em DO SQLite (espelho Postgres); HITL via estado `escalated` + alarm.
- **LLM = Claude via AI Gateway** p/ NLU (extração de slot, digressão, `suggest_product` via RAG).
- **Não** LangGraph.js (checkpointer quebrado em Workers, bug #1692), **não** Temporal (não roda em Workers). Workflows como orquestrador durável por turno é fallback (cuidar da retenção de 30 dias p/ conversas dormentes → DO/Postgres é o registro durável).

---

## 9. Cérebro de IA — RAG faseado

Consolidado de [graphrag-noderag](../investigacoes/graphrag-noderag.md), com a correção do §4:

- **Fase 1 (MVP):** vector + rerank no Postgres/pgvector. Relações conhecidas (cliente↔conversa↔campanha↔venda) como **FK + CTEs** (já é grafo, custo zero de extração).
- **Fase 2 (graph-lite):** **closure/adjacency tables + CTEs** (não AGE) p/ multi-hop, com extração LLM **debounced** por janela de conversa, em modelo pequeno.
- **Embeddings:** **Workers AI `@cf/baai/bge-m3`** (1024-dim, multilíngue PT-BR, ~grátis na escala — 10k neurons/dia free; limite real de 8192 tokens/doc, chunkar). Anthropic **não** tem API de embeddings. Voyage/Cohere só como upgrade de qualidade se o PT-BR não bastar.
- **Geração:** Claude via AI Gateway (cache + observabilidade + BYOK via Stored Keys/Secrets Store).
- **NodeRAG = inspiração de design, não dependência** (research-grade — ver graphrag §3).

---

## 10. Classificação

Consolidado de [classificacao-eventos](../investigacoes/classificacao-eventos.md):

- **Cascade híbrido:** filtro barato (spam via cabeça sobre bge-m3 / regras) → **Claude Haiku + structured output** (enum da taxonomia fechada) no incerto → **self-consistency** na fronteira.
- **Bandas de confiança (`taxonomy.ts`):** ≥0.80 auto / 0.50–0.79 revisar / <0.50 ignorar — mas o **score deve ser calibrado** (encoder bge-m3 + temperature scaling **ou** concordância de self-consistency). **Claude não dá logprobs e confiança verbalizada é superconfiante** → não alimentar a banda com `confidence` cru de chamada única.
- **Guardrail:** prompt-injection (a mensagem é o input) → isolamento de dados + enum-schema limita o estrago; encoder é inerentemente resistente.

---

## 11. Modelo de dados consolidado

Tabelas existentes (de [leads-crm](../funcionalidades/leads-crm.md) §6 e [agentes.md](../funcionalidades/agentes.md) §9): `crm_tenant`, `meta_page`, `lead_form`, `contact` (dedup por `email_hash`/`phone_hash`, `UNIQUE(tenant_id, …)`), `lead`, `lead_pipeline`, `lead_custom_field`, `lead_consent`, `form`, `agent`, `campaign`, `conversation`.

**Novas tabelas que esta arquitetura introduz:**

```sql
-- Vault: credenciais OAuth por tenant × plataforma (cifradas em repouso) — §6
CREATE TABLE oauth_credential (
  tenant_id      UUID NOT NULL REFERENCES crm_tenant(id),
  platform       TEXT NOT NULL,          -- 'mercadolivre'|'mercadopago'|'whatsapp'|'meta'|'tiktok'|'x'|'olx'
  external_id    TEXT NOT NULL,          -- seller_id / phone_number_id / page_id (chave de fan-out)
  access_token   BYTEA NOT NULL,         -- AES-GCM ciphertext
  refresh_token  BYTEA,                  -- AES-GCM ciphertext (rotativo no ML)
  expires_at     TIMESTAMPTZ,
  rotated_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (tenant_id, platform, external_id)
);
CREATE INDEX ON oauth_credential (platform, external_id);  -- webhook → tenant

-- Dedupe de evento (idempotência at-least-once) — §7
CREATE TABLE inbound_event (
  platform_event_id TEXT NOT NULL,       -- id estável do provedor (dedupe)
  platform          TEXT NOT NULL,
  tenant_id         UUID NOT NULL REFERENCES crm_tenant(id),
  object_type       TEXT NOT NULL,
  received_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (platform, platform_event_id)   -- ON CONFLICT DO NOTHING
);

-- Mensagem do inbox unificado (todos os canais) — §7/§8
CREATE TABLE message (
  id             UUID PRIMARY KEY,
  tenant_id      UUID NOT NULL REFERENCES crm_tenant(id),
  conversation_id UUID REFERENCES conversation(id),
  contact_id     UUID REFERENCES contact(id),
  channel        TEXT NOT NULL,          -- channels.ts: instagram|facebook|whatsapp|tiktok|x|mercadolivre|web
  direction      TEXT NOT NULL,          -- inbound|outbound
  body           TEXT,
  intent         TEXT,                   -- taxonomy.ts: duvida|intencao_de_compra|... (nullable)
  confidence     REAL,                   -- score CALIBRADO (§10)
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Embeddings p/ RAG (pgvector) — §9
CREATE TABLE embedding (
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES crm_tenant(id),
  source_type TEXT NOT NULL,             -- message|product|doc|conversation
  source_id   UUID NOT NULL,
  vec         vector(1024) NOT NULL,     -- bge-m3
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON embedding USING hnsw (vec vector_cosine_ops);
```

> Refator pendente já anotado em [agentes.md](../funcionalidades/agentes.md) §7: generalizar `lead` (PK própria `lead_id` + `source`, `leadgen_id` opcional) p/ acomodar leads conversacionais. Grafo via **closure/adjacency tables** entre `contact`/`product`/`campaign`/`conversation` (não AGE).

---

## 12. Deploy, ambientes & observabilidade

- **Deploy:** Workers via **wrangler**; app Next via **OpenNext** (buildCommand webpack p/ evitar ChunkLoadError do Turbopack — ver [[marketero-web-cloudflare-deploy]]). Conta `joao`, worker `marketero-web`.
- **Bindings:** Queues, DO namespaces, Hyperdrive (Postgres), Workers AI, AI Gateway, R2, Secrets Store, KV (cache best-effort, não dedupe).
- **Observabilidade:** **AI Gateway** dá logging/analytics das chamadas Claude (custo, latência, cache hit); Workers Analytics/Logpush p/ o resto; evals de classificação (ECE/F1) e drift como pipeline próprio (classificacao §9).
- **Ambientes:** prod/preview por ambiente wrangler; segredos de plataforma (master key, API keys) no Secrets Store; nunca tokens de tenant em env.

---

## 13. Riscos & decisões em aberto

1. **AGE descartado** → validar que **CTEs/closure tables** cobrem as queries multi-hop reais antes de modelar o grafo. (risco baixo; CTEs cobrem o comum)
2. **Secrets Store** — confirmar GA/limites/rotação no console; senão, master key em env + tokens cifrados no Postgres.
3. **Auth & multi-tenancy white-label** — **sem investigação ainda** (Clerk orgs/RBAC candidato). Bloqueia o modelo de org/usuário/RBAC. **Próxima investigação natural.**
4. **Onde roda o encoder de classificação** — cabeça linear sobre bge-m3 no Workers AI? treino/serving? (classificacao §12).
5. **Workflows vs DO** p/ orquestração por turno (retenção 30d p/ conversas dormentes).
6. **Unit economics fim-a-fim** (classificação + embeddings + geração + DO/Queue) — investigação própria pendente.
7. **Mídia (R2)** e **voz/áudio** (transcrição) — não detalhados aqui.
8. **PlanetScale-via-CF vs Neon-via-Hyperdrive** — decisão de DX/billing, não de capacidade (nenhum dá AGE).

---

## 14. Mapa: investigações que alimentam isto

| Eixo | Investigação | O que entrega à arquitetura |
|---|---|---|
| Canais | [whatsapp](../investigacoes/whatsapp.md), [marketplaces-venda](../investigacoes/marketplaces-venda.md), facebook/instagram/tiktok/twitter | webhooks, SLAs de ACK, OAuth por tenant, fan-out |
| Cérebro | [graphrag-noderag](../investigacoes/graphrag-noderag.md) | RAG faseado, Postgres single-store (corrigido: sem AGE) |
| Classificação | [classificacao-eventos](../investigacoes/classificacao-eventos.md) | cascade, calibração, bge-m3 |
| Infra | [ingestao-inbox-realtime](../investigacoes/ingestao-inbox-realtime.md) | Worker→Queue→Workflow→DO, dedupe, Hyperdrive |
| Runtime | [orquestracao-agente](../investigacoes/orquestracao-agente.md) | FSM num DO, Claude via AI Gateway |
| Feature | [agentes.md](../funcionalidades/agentes.md), [leads-crm.md](../funcionalidades/leads-crm.md) | modelo de dados, FSM, mini-CRM |

---

## 15. Fontes

> Specs Cloudflare/Neon reconfirmar no console (mudam rápido). Detalhe e fontes primárias completas em cada investigação linkada.

**Camada de dados (verificação desta arquitetura)**
- Neon extensões / pgvector — <https://neon.com/docs/extensions/pg-extensions> · <https://neon.com/docs/extensions/pgvector>
- Azure AGE (fallback) — <https://learn.microsoft.com/en-us/azure/postgresql/azure-ai/generative-ai-age-overview>
- RDS extensões (sem AGE) — <https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-extensions.html>
- AGE saúde do projeto — <https://incubator.apache.org/projects/age.html> · <https://age.apache.org/release-notes/>
- CTEs vs AGE — <https://medium.com/@sjksingh/postgresql-showdown-complex-joins-vs-native-graph-traversals-with-apache-age-78d65f2fbdaa>
- Cloudflare + PlanetScale — <https://blog.cloudflare.com/deploy-planetscale-postgres-with-workers/> · <https://developers.cloudflare.com/changelog/post/2026-06-18-planetscale-databases-cloudflare-billing/>
- Hyperdrive + Neon — <https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/>

**IA / embeddings**
- Workers AI bge-m3 — <https://developers.cloudflare.com/workers-ai/models/bge-m3/> · <https://huggingface.co/BAAI/bge-m3>
- Workers AI pricing — <https://developers.cloudflare.com/workers-ai/platform/pricing/>
- AI Gateway (Anthropic / BYOK) — <https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/> · <https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/>
- Anthropic sem embeddings — <https://docs.anthropic.com/en/docs/build-with-claude/embeddings>

**Infra (detalhe nas investigações)**
- Hyperdrive / DO / Queues / Workflows — ver [ingestao-inbox-realtime](../investigacoes/ingestao-inbox-realtime.md) §16 e [orquestracao-agente](../investigacoes/orquestracao-agente.md) §9.
