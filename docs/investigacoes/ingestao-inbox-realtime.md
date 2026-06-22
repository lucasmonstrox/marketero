---
tipo: investigacao
status: estável
updated: 2026-06-22
description: Arquitetura de ingestão de webhooks (6+ plataformas) + inbox realtime sobre Cloudflare Workers — Worker→Queue→Workflow durável→Durable Object (WS Hibernation); waitUntil é cilada, KV é inseguro p/ dedupe.
---

# Ingestão de webhooks & inbox realtime

> Investigação da **infraestrutura de eventos** que sustenta o loop `evento → classificação → ação` da [visao-geral.md](../produto/visao-geral.md): webhooks chegam de **6+ plataformas** (Instagram/Facebook, WhatsApp, TikTok, X, Mercado Livre, Mercado Pago, OLX), cada uma com **SLA de ACK diferente** (Mercado Livre exige **200 em 500ms**; Mercado Pago ~22s; WhatsApp re-tenta por 7 dias), vários entregam **só o id** (exigem hidratação via GET autenticado), e há um **inbox unificado realtime** que precisa atualizar ao vivo. A stack é **Cloudflare Workers + Postgres (Neon via Hyperdrive)**, TS/JS — ver [[marketero-web-cloudflare-deploy]]. Toda investigação de API anterior ([marketplaces-venda](marketplaces-venda.md), [whatsapp](whatsapp.md)) terminou pedindo exatamente esta cola.
>
> Pesquisa multi-fonte com verificação adversarial (≈70 fontes; docs oficiais `developers.cloudflare.com` — limites/pricing/garantias re-verificados direto contra as páginas primárias — + docs de webhook de cada plataforma). Confiança: **alta** = verbatim de doc oficial; **média** = snippet/versão volátil; **baixa** = comunidade. **Ressalva:** limites e preços da Cloudflare mudam (vários subiram em 2025–2026) — reconfirmar no console antes de planejar capacidade.
>
> **Resumo da decisão.**
> 1. **Padrão ack-fast-then-async** ⭐ — Worker de ingestão: verifica HMAC no edge → grava chave de dedupe + enfileira o envelope cru na **Queue** → retorna **200** na hora. **NÃO usar `ctx.waitUntil()` como caminho de processamento** (teto duro de 30s, sem retry, sem durabilidade — a própria Cloudflare manda mandar p/ Queue).
> 2. **Pipeline durável em Workflows** ⭐ — consumidor da Queue → **Cloudflare Workflows** (GA desde abr/2025) p/ o `hydrate → classify → act` (multi-step, retry exponencial por padrão, `sleep`/`waitForEvent`, ocioso = sem CPU).
> 3. **Inbox = Durable Object** ⭐ — um DO por conversa (ou por tenant) com **WebSocket Hibernation** (push ao vivo, ocioso ≈ grátis), **SQLite** (dedupe forte-consistente) e **alarm** (timeout/abandono).
> 4. **Dedupe nunca em KV** ❌ — KV é eventualmente consistente e **negative-caches** ausências → derrota a deduplicação. Chave autoritativa em **DO storage** (transacional) ou **Postgres `ON CONFLICT`**.
> 5. **Hyperdrive p/ Postgres** ⭐ — pooling transaction-mode; **driver TCP `pg`, NÃO o serverless WebSocket do Neon**.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — o problema](#2-enquadramento--o-problema)
3. [Padrão ack-fast-then-async (waitUntil é cilada)](#3-padrão-ack-fast-then-async-waituntil-é-cilada)
4. [Arquitetura de referência](#4-arquitetura-de-referência)
5. [Cloudflare Queues — o barramento](#5-cloudflare-queues--o-barramento)
6. [Cloudflare Workflows — pipeline durável](#6-cloudflare-workflows--pipeline-durável)
7. [Durable Objects — estado + realtime](#7-durable-objects--estado--realtime)
8. [Agents SDK — fit e risco de churn](#8-agents-sdk--fit-e-risco-de-churn)
9. [Idempotência & dedup](#9-idempotência--dedup)
10. [Entrega realtime ao inbox](#10-entrega-realtime-ao-inbox)
11. [Normalização de N plataformas](#11-normalização-de-n-plataformas)
12. [Hyperdrive → Postgres](#12-hyperdrive--postgres)
13. [Comparação Queues × Workflows × DO](#13-comparação-queues--workflows--do)
14. [Ciladas (custo / confiabilidade / plataforma)](#14-ciladas-custo--confiabilidade--plataforma)
15. [Perguntas em aberto](#15-perguntas-em-aberto)
16. [Fontes](#16-fontes)

---

## 1. Sumário executivo

| Job | Primitivo Cloudflare | Por quê | GA? |
|---|---|---|---|
| Receber webhook, verificar, ACK rápido | **Worker** (ingestão) | edge, Web Crypto, retorna 200 em ms | ✓ |
| Desacoplar ingestão↔processamento | **Queues** | at-least-once, retries, DLQ | ✓ |
| Pipeline durável hydrate→classify→act | **Workflows** | steps duráveis, retry exp default, sleep 365d | ✓ (abr/2025) |
| Estado da conversa + push ao vivo | **Durable Objects** | SQLite forte-consistente + WS Hibernation + alarm | ✓ |
| Coordenador de conversa (conveniência) | **Agents SDK** (sobre DO) | ergonomia, mas **0.x, não-GA** | ✗ |
| Postgres a partir de Workers | **Hyperdrive** | pooling transaction-mode (driver TCP `pg`) | ✓ |

**Veredito:** `Worker → Queue → Workflow → DO (inbox, WS) ` + Hyperdrive→Postgres p/ dado de negócio + cron Worker p/ reconciliação (`/missed_feeds` do ML).

---

## 2. Enquadramento — o problema

A dificuldade não é "receber um webhook" — é **reconciliar 6+ plataformas heterogêneas** num só barramento confiável:

- **SLAs de ACK díspares:** ML **500ms**, X CRC **3s**, MP ~22s, WhatsApp/Meta prontos mas com janelas de retry diferentes (WhatsApp 7d, Meta 36h, TikTok 72h). O ACK de 500ms do ML dita o design: **verificar + enfileirar + 200**, adiando até o write de dedupe se preciso.
- **Payloads id-only:** ML (`resource`), MP (`data.id`) entregam só o id → o pipeline faz **GET autenticado** (com o token do seller) p/ hidratar antes de classificar.
- **Entrega at-least-once + retries da plataforma** → **duplicatas são normais** → consumidor idempotente obrigatório.
- **Inbox realtime:** a UI precisa de push ao vivo conforme mensagens chegam.
- **Multi-tenant:** um endpoint por app recebe eventos de todos os tenants → mapear `phone_number_id`/`user_id`/`for_user_id`/`open_id` → `tenant_id`.

---

## 3. Padrão ack-fast-then-async (waitUntil é cilada)

Sequência no Worker de ingestão (alta confiança): `request.arrayBuffer()` (bytes crus, **antes** de `.json()` — o stream do body é single-use) → `crypto.subtle.verify()` HMAC (Web Crypto, constant-time) → persistência mínima + **enfileirar na Queue** → retornar **200**. Processar no consumidor/Workflow.

> ⚠️ **`ctx.waitUntil()` é a ferramenta errada p/ trabalho que não pode perder:** teto **duro de 30s** (compartilhado entre todas as chamadas waitUntil do request), depois promises não-resolvidas são **canceladas**. Sem retry, sem durabilidade — eviction do isolate descarta silenciosamente. Usar só p/ fire-and-forget (analytics/log/cache). A doc da Cloudflare é explícita: "se o trabalho não cabe no limite do waitUntil(), mande para uma Queue."

**Por que dá:** o Worker tem **wall-clock ilimitado** enquanto o cliente está conectado; só **CPU time** é medido (Free 10ms; Paid 30s default, configurável a **5min** via `limits.cpu_ms`); espera de I/O **não** conta como CPU.

---

## 4. Arquitetura de referência

```
Webhook da plataforma
  │  (ML: 200 em 500ms; X: CRC em 3s)
  ▼
[Worker de Ingestão]  ── verifica HMAC (crypto.subtle.verify, arrayBuffer cru)
  │                    ── monta envelope; grava chave de dedupe (DO ou PG ON CONFLICT)
  │                    ── enfileira envelope cru na Queue
  └─► retorna 200 imediatamente        (NÃO waitUntil p/ processar)
            │
            ▼
   [Cloudflare Queue]   at-least-once · DLQ configurada · backoff manual p/ GETs instáveis
            │  (consumidor, ≤250 concorrência)
            ▼
   [Cloudflare Workflow]   pipeline durável por evento
      step.do  hidratar (GET autenticado p/ id-only do ML/MP)   ← retries duráveis (exp default)
      step.do  classificar (IA)                                  ← ver classificacao-eventos.md
      step.do  agir (responder / rotear / persistir no Postgres via Hyperdrive)
      step.sleep / waitForEvent (aguardar resposta; reconciliar /missed_feeds do ML)
            │
            ▼
   [Durable Object: inbox]   (por conversa ou por tenant)
      • SQLite: conversa/mensagens + chaves de dedupe (forte-consistente)
      • WebSocket Hibernation: push ao vivo p/ a UI  ← acceptWebSocket()
      • Alarm: timeout/abandono (1 alarm, multiplexar)
            │
            ▼  WebSocket (hibernável)  [+ SSE fallback c/ heartbeat se for one-way]
        [Inbox UI]

   [Hyperdrive] ──► Postgres (Neon, driver TCP pg)  dado de negócio durável + queries cross-tenant

   [Cron Worker 15min] ──► GET /missed_feeds (ML) por app → re-enfileira feeds perdidos
```

---

## 5. Cloudflare Queues — o barramento

| Propriedade | Valor | Conf. |
|---|---|---|
| Garantia | **at-least-once** (pode entregar >1× → consumidor idempotente). Sem ordenação documentada | alta |
| Tamanho da msg | **128 KB** | alta |
| Batch | máx **100 msgs / 256 KB**; `max_batch_timeout` até **60s** (default 5s) | alta |
| Retries | cap **100**; `max_retries` default **3** | alta |
| **Backoff** | **SEM backoff automático** — retries são imediatos. Exponencial é padrão **manual** (`retry({delaySeconds})`), atraso máx 24h. *(Cilada — contrasta com Workflows, que tem exp por default.)* | alta |
| DLQ | `dead_letter_queue`; **se não configurar, mensagens são DESCARTADAS após max_retries** | alta |
| Concorrência | até **250** invocações (push), autoscale; `retry()` **não** dispara autoscale-down | alta |
| Throughput | **5.000 msg/s por queue** | alta |
| Retenção | até **14 dias** (Paid); **24h fixo no Free** | alta/média |
| Preço | **$0,40/milhão de operações**; 1 op = cada **64 KB** lido/escrito/deletado (msg típica ≈ 3 ops) | alta |

**Fit:** ótimo buffer edge→processamento. **Cilada de custo:** "operação" é por 64KB, não por mensagem. **Cilada de confiabilidade:** configurar DLQ explícita ou perde poison messages; adicionar backoff manual p/ APIs instáveis (os GETs de hidratação).

---

## 6. Cloudflare Workflows — pipeline durável

- **GA desde 7/abr/2025** (não é beta). Free + Paid. (alta)
- **Modelo:** `step.do()` (retryável, resultado persistido), `step.sleep`/`sleepUntil` (não contam no limite de steps), `step.waitForEvent` (timeout default 24h). Instâncias ociosas/dormindo/aguardando **não consomem CPU nem contam na concorrência**. (alta)
- **Retry default de step:** `limit 5, delay 10s, backoff exponencial, timeout 10min` — exponencial é **default** aqui (≠ Queues). Até 10.000 retries/step. (alta)
- **Limites (Paid/Free):** steps **10.000 → 25.000** config / 1.024; instâncias concorrentes **50.000** (subiu em abr/2026 — *soft, crescendo, verificar ao vivo*) / 100; estado persistido **1GB**/100MB; resultado de step & payload de evento **1 MiB**; sleep máx **365 dias**; retenção 30d/3d. Sem cap total de duração publicado (limitado por steps + sleep). (alta, exceto concorrência média)
- **Preço:** sem preço separado — cobrado como Workers (req + CPU-ms + storage). Dormindo = sem CPU. (alta)

**Fit:** ideal p/ o pipeline por evento (hidratar → classificar → agir), com retry/rate-limit de plataforma via retries duráveis de step e `step.sleep` p/ backoff. `waitForEvent` + sleep 365d servem p/ "aguardar resposta humana / reconciliar `/missed_feeds`".

---

## 7. Durable Objects — estado + realtime

- **WebSocket Hibernation:** anexar via `ctx.acceptWebSocket(ws)` (**NÃO** `ws.accept()`); handlers `webSocketMessage/Close/Error`. **Billing:** `ws.accept()` simples cobra **duração GB-s pela conexão inteira**; hibernation = **sem cobrança de duração na inatividade** (só enquanto um handler roda). **Maior cilada de custo do DO.** (alta)
- Estado por-socket sobrevive à hibernação só via `serializeAttachment()` (cap **16 KiB**); vars em memória se perdem na eviction. Broadcast via `ctx.getWebSockets()`. (alta/média)
- **Máx conexões WS por DO: 32.768**; msg WS máx 32 MiB. Na prática "milhares por instância" → **shardar por tenant/sala** p/ fan-out grande. (alta/média)
- **Alarms:** **um alarm por DO** (re-setar sobrescreve); execução **at-least-once**, auto-retry com backoff exp de 2s, até 6 retries; handler 15min wall-clock. Multiplexar múltiplos timers você mesmo. (alta)
- **SQLite:** KV síncrono + SQL, colocado zero-latência; **10 GB/DO** (Paid); forte-consistente, transacional, escopo do objeto. **Billing de storage começou 7/jan/2026**; **Free = SQLite-only, 5GB/conta, sem cobrança de storage**. (alta)
- Execução **single-threaded** cooperativa → ponto de coordenação natural. (gates exatos não confirmados — baixa)
- **Preço (Paid):** req $0,15/M; duração $12,50/M GB-s; **msgs WS entrantes cobradas 20:1**; SQLite linhas lidas $0,001/M, escritas $1,00/M, storage $0,20/GB-mês. (alta)

**Fit:** primitivo correto p/ o inbox. Um DO por conversa = isolamento + dedupe forte-consistente + push ao vivo hibernável + timeout de abandono por alarm. **Obrigatório:** usar o caminho de hibernation ou paga socket ocioso.

---

## 8. Agents SDK — fit e risco de churn

- **Construído sobre DO:** `Agent extends DurableObject` → SQLite embutido (`this.sql`), estado persistido (`this.state`/`setState()`), callbacks WS, `this.schedule()` (envolve o alarm do DO), RPC, e-mail. (alta)
- **Maturidade:** **0.x, NÃO-GA** (v0.1.0 set/2025 → v0.3.0 dez/2025; AI SDK v5→v6 com breaking changes). Já roda em produção, mas **espere churn de API**. Workflows (irmão) **é** GA. (média-alta)

**Fit:** forte ergonomicamente como coordenador stateful por conversa — entrega tudo que você construiria à mão sobre um DO. **Trade-off:** churn de 0.x. P/ estabilidade, construir direto em **DO + Workflows**; adotar Agents SDK se quiser as conveniências de conversa-IA e aceitar a volatilidade. (Cruza com a investigação de **orquestração do agente**.)

---

## 9. Idempotência & dedup

At-least-once (Queues) + retries de plataforma (WhatsApp 7d, Meta 36h, TikTok 72h, MP/ML múltiplos) ⇒ **duplicatas são normais** → consumidor deduplica por id de recurso/evento.

**Onde guardar a chave:**
- **DO storage** — transacional, forte-consistente (`storage.transaction()` resolve dupla-entrega concorrente p/ um vencedor). Melhor CF-nativo **se** rotear eventos da mesma chave p/ um DO (hash do event-id → N DOs, ou um DO/tenant). (alta)
- **Postgres** — `UNIQUE` + `INSERT … ON CONFLICT DO NOTHING`. Mais portável, consultável junto do dado de negócio; paga latência Hyperdrive. A própria doc de Queues recomenda isto (id único como PK / chave de idempotência). (alta)
- **KV — NÃO usar como autoritativo.** Eventualmente consistente (~60s de propagação), **negative-caches ausências** (outro PoP responde "ausente" depois que você escreveu → dedup derrotada), sem CAS atômico. A doc da Cloudflare manda usar DO p/ consistência forte. KV só como cache quente best-effort. (alta)

**Chave de dedupe por plataforma:** ML `resource`/`_id`; MP `data.id`; WhatsApp message id; Meta entry+change. Preferir ids estáveis do provedor aos seus.

---

## 10. Entrega realtime ao inbox

| Opção | A favor | Contra | Conf. |
|---|---|---|---|
| **DO WebSocket Hibernation** ⭐ | Melhor custo (ocioso ≈ grátis), isolamento por tenant, ping/pong auto, bidirecional | Você implementa resume/replay; shardar p/ salas grandes | alta |
| **SSE do Worker/DO** | Mais simples p/ push one-way (inbox é read-mostly); `Last-Event-ID` nativo (resume/replay); sem handshake | One-way; **~100s ocioso → HTTP 524** → heartbeat (`: ping`) a cada ~15–30s; ~6 conns/domínio em HTTP/1.1 | alta / média-alta |
| **Ably / Pusher** | Terceiriza escala/reconexão/histórico | Custo + dependência fora da CF; redundante se já está em DO | média |
| **PartyKit / PartyServer** | Ergonomia DO + SDK cliente com reconexão; **adquirido pela Cloudflare** (abr/2024), sobre DO | Fan-out multi-sala (PartySub) é **experimental** | alta |

**Recomendação:** **DO Hibernation** como default (você já está em DO p/ o estado do inbox). SSE se o tráfego for puramente servidor→cliente e quiser `Last-Event-ID` de graça (mas implemente heartbeat). Pular terceiros salvo necessidade de histórico/replay global turnkey.

---

## 11. Normalização de N plataformas

Envelope interno proposto: `{ tenant_id, platform, platform_event_id (chave dedupe), object_type, raw_ref, received_at, signature_verified, needs_hydration, resource_url? }`.

| Plataforma | SLA ACK | Janela retry | Payload | Hidratar? | Assinatura | Chave de tenant |
|---|---|---|---|---|---|---|
| **Mercado Livre** | **200 em 500ms** (legado 20s também na doc — projetar p/ 500ms) | ~8 retries/~1h, depois perdido; **`GET /missed_feeds?app_id=`** | id-only (`resource`,`user_id`,`topic`) | **Sim — GET no `resource` c/ token do seller** | **nenhuma inbound** (validar via o GET) | **`user_id`** (seller) |
| **Mercado Pago** | 200/201, **~22s** | ~15min estendendo (~8); `stop_delivery_op_wh` **nunca re-tenta** | id-only (`data.id`) | **Sim — GET `/v1/payments/{id}`** | `x-signature` `ts,v1`; manifesto **`id:…;request-id:…;ts:…;`** HMAC-SHA256 | via `collector_id`/app do secret |
| **WhatsApp Cloud** | 200, pronto | **até 7 dias** | **conteúdo completo** | Não (mídia = download à parte) | `X-Hub-Signature-256` HMAC-SHA256 | **`metadata.phone_number_id`** |
| **Meta IG/FB** | 200 | **36h** decrescente | **configurável** (muitas vezes id-only) | Se id-only | `X-Hub-Signature-256` | `entry[].id` (Page/IG) |
| **TikTok** | **200 imediato** | exp backoff **72h**, at-least-once | conteúdo do evento | Às vezes | `TikTok-Signature` | `open_id` (*Shop = sistema separado*) |
| **X / Twitter** | 200; **CRC `crc_token` em 3s** (~24h) | retries ~4h (pago) | objetos completos | Não | `x-twitter-webhooks-signature` sha256 | `for_user_id` (*acesso/preço voláteis*) |
| **OLX BR** | **não documentado** | **não documentado** | JSON status do anúncio | Não | **nenhuma documentada** | contexto OAuth |

---

## 12. Hyperdrive → Postgres

- **Por quê:** Workers são isolates stateless por-invocação sem reuso de conexão → sem pooling, cada invocação paga o handshake e pode esgotar os slots do banco. (alta)
- **Como:** split-connection (Client perto do Worker ~4ms + cache; Endpoint perto do DB segura conexões **transaction-mode** pooled; autoscale). (alta)
- **Cache de query:** só read-only/não-mutante (exclui INSERT/UPDATE e funcs VOLATILE/STABLE como NOW()/RANDOM()); default max_age 60s, swr 15s; `--caching-disabled`. (alta)
- **Drivers:** `pg` (node-postgres, recomendado) e Postgres.js. **Gotcha Neon: usar o driver TCP `pg`, NÃO o serverless (WebSocket/HTTP) do Neon** — Hyperdrive precisa de TCP. (alta)
- **Limites:** conexões de origem ~20 (Free)/~100 (Paid); **mín 5**; statement máx 60s; resposta cacheada máx 50MB. (alta)
- **Preço:** **grátis** (Free + Paid). **Cap Free = 100.000 queries/dia** (cacheadas + não). DB de origem (Neon) cobra à parte. (alta)

> Cruza com [graphrag-noderag.md](graphrag-noderag.md): o mesmo Postgres (pgvector + AGE) é o store único recomendado — Hyperdrive é o caminho edge-compatível p/ ele.

---

## 13. Comparação Queues × Workflows × DO

| Dimensão | **Queues** | **Workflows** | **Durable Objects** |
|---|---|---|---|
| Job | Buffer/barramento | Pipeline multi-step durável | Coordenação stateful + realtime |
| Uso aqui | desacoplar ingestão→proc | hydrate→classify→act | inbox por conversa + push WS + dedupe |
| Entrega/exec | at-least-once, retry, DLQ | durável, retry por step | single-thread, storage transacional |
| Backoff | **manual** (sem auto) | **exponencial default** | alarm: exp de 2s, 6 retries |
| Estado | nenhum | steps persistidos (1GB) | SQLite 10GB, forte-consistente |
| Timing | retry ≤24h | sleep ≤365d, waitForEvent | alarms (1/DO) |
| Concorrência | 250 consumidores/queue | 50.000 instâncias (soft) | 1 por id (ponto de coordenação) |
| Push realtime | Não | Não | **Sim (WS Hibernation)** |
| Custo ocioso | n/a | **sem CPU dormindo** | **sem duração hibernando** |
| GA? | Sim | **Sim (abr/2025)** | Sim (billing SQLite jan/2026) |

---

## 14. Ciladas (custo / confiabilidade / plataforma)

**Custo:** [1] `ws.accept()` simples cobra a conexão ociosa inteira — **usar hibernation**. [2] "operação" de Queues = por 64KB, não por msg. [3] msgs WS entrantes no DO cobradas 20:1. [4] Hyperdrive grátis mas **100k queries/dia** no Free. [5] storage SQLite do DO agora cobrado (desde 7/jan/2026); Free não cobra mas limita 5GB/conta.

**Confiabilidade:** [6] retries de Queues **sem backoff automático** + **descartam se não houver DLQ**. [7] `waitUntil` teto 30s, sem retry — não p/ trabalho crítico. [8] SSE ~100s ocioso → **HTTP 524** → heartbeat. [9] DO: só **um** alarm — multiplexar. [10] dedupe: **KV inseguro**. [11] hibernation perde estado em memória (persistir ou 16KB `serializeAttachment`). [12] Neon: driver TCP `pg`, não o serverless WS.

**Plataforma:** [13] ML **500ms** (doc também diz 20s — projetar p/ 500ms); `/missed_feeds` é a rede de segurança. [14] tópico de fraude do MP `stop_delivery_op_wh` **nunca re-tenta**. [15] Meta 36h vs WhatsApp 7d apesar da mesma empresa. [16] ordem do manifesto de assinatura do MP (`id;request-id;ts`) quebra fácil. [17] X Account Activity API com acesso/preço voláteis.

**Não confirmado:** wording exato dos input/output gates do DO; se CPU de `waitUntil` em background sai do mesmo orçamento `cpu_ms`; versão atual exata do Agents SDK (é 0.x, não-GA); 50.000 de concorrência de Workflows é soft e crescente; schedule de retry exato do MP (página atrás de JS); OLX **sem** contrato de ACK/retry/assinatura publicado.

---

## 15. Perguntas em aberto

1. **Granularidade do DO de inbox:** um DO por conversa (isolamento máximo) vs por tenant (menos objetos, fan-out maior) — decidir pelo padrão de tráfego e pelo limite de 32.768 WS/DO.
2. **Onde mora o dedupe** definitivo: DO storage (precisa rotear mesma-chave→mesmo DO) vs Postgres `ON CONFLICT` (mais portável). Provavelmente os dois (DO p/ realtime, PG p/ verdade durável).
3. **Agents SDK vs DO+Workflows à mão:** aceitar churn de 0.x pela ergonomia, ou estabilidade — decidir junto da investigação de **orquestração do agente**.
4. **Reconciliação:** cron Worker 15min chamando `/missed_feeds` do ML; definir equivalente p/ MP (relatórios) e demais.
5. **Verificação de assinatura por plataforma** (HMAC distinto cada uma; OLX por IP `54.162.151.93` allowlist) — uma camada de adapters no Worker de ingestão.
6. **Capacidade:** reconfirmar limites soft (concorrência de Workflows, conexões Hyperdrive) antes de planejar escala.
7. **Custo real:** modelar ops de Queue (por 64KB) + GB-s de DO + queries Hyperdrive no volume esperado — cruza com **unit economics**.

---

## 16. Fontes

> Limites/preços/garantias da Cloudflare re-verificados direto contra `developers.cloudflare.com`; SLAs de plataforma das docs oficiais. Itens atrás de JS ou em fluxo marcados média/baixa no corpo.

**Cloudflare — Queues / Workflows / Workers**
- Queues limites/preço/garantias — <https://developers.cloudflare.com/queues/platform/limits/> · <https://developers.cloudflare.com/queues/platform/pricing/> · <https://developers.cloudflare.com/queues/reference/delivery-guarantees/> · <https://developers.cloudflare.com/queues/configuration/batching-retries/>
- Workflows — <https://developers.cloudflare.com/workflows/> · <https://developers.cloudflare.com/workflows/reference/limits/> · <https://developers.cloudflare.com/workflows/build/sleeping-and-retrying/> · <https://developers.cloudflare.com/changelog/post/2025-04-07-workflows-ga/>
- Workers (waitUntil/limits/crypto) — <https://developers.cloudflare.com/workers/runtime-apis/context/> · <https://developers.cloudflare.com/workers/platform/limits/> · <https://developers.cloudflare.com/workers/runtime-apis/web-crypto/>

**Cloudflare — Durable Objects / Agents / KV / Hyperdrive**
- DO websockets/hibernation — <https://developers.cloudflare.com/durable-objects/best-practices/websockets/> · <https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/>
- DO alarms/storage/pricing/limits — <https://developers.cloudflare.com/durable-objects/api/alarms/> · <https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/> · <https://developers.cloudflare.com/durable-objects/platform/pricing/> · <https://developers.cloudflare.com/durable-objects/platform/limits/>
- Agents SDK — <https://developers.cloudflare.com/agents/> · <https://developers.cloudflare.com/agents/concepts/agent-class/>
- KV (por que não dedupe) — <https://developers.cloudflare.com/kv/concepts/how-kv-works/> · <https://developers.cloudflare.com/workers/platform/storage-options/>
- Hyperdrive — <https://developers.cloudflare.com/hyperdrive/platform/pricing/> · <https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/> · <https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/>
- PartyKit (aquisição) — <https://blog.cloudflare.com/cloudflare-acquires-partykit/>

**Webhooks de plataforma**
- Meta/WhatsApp — <https://developers.facebook.com/docs/graph-api/webhooks/getting-started/> · <https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks/>
- Mercado Livre — <https://developers.mercadolivre.com.br/pt_br/produto-receba-notificacoes>
- Mercado Pago — <https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks>
- TikTok — <https://developers.tiktok.com/doc/webhooks-overview>
- X — <https://developer.twitter.com/en/docs/twitter-api/enterprise/account-activity-api/quick-start/enterprise-account-activity-api>
- OLX — <https://developers.olx.com.br/webhooks/home.html>
