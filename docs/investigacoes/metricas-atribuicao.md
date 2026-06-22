---
tipo: investigacao
status: estável
updated: 2026-06-22
description: Arquitetura de métricas unificadas + atribuição cross-canal — rollups em Postgres agendados por Cron Worker (Neon scale-to-zero mata pg_cron), DO p/ tiles ao vivo, atribuição position-based→Markov.
---

# Métricas unificadas & atribuição cross-canal

> Investigação da **arquitetura de analytics** do pilar #5 da [visao-geral.md](../produto/visao-geral.md) ("métricas unificadas de social + venda + atendimento"). A tela `metricas` **já define os KPIs** (em `_data/`), então a investigação é a **base de dados que os computa**, não quais métricas mostrar. KPIs reais: **Receita**, **Novos leads**, **Taxa de conversão**, **Speed-to-lead** (tempo até 1ª resposta), **% de conversas atendidas pela IA** (com AiTag do GraphRAG); o **funil** Novo→Contatado→Qualificado→Proposta→Ganho; e o **breakdown por canal** (leads/conversas/**receita atribuída** por instagram, whatsapp, mercadolivre, facebook, web). Stack: Cloudflare Workers + Postgres (Neon via Hyperdrive) — ver [referencia/arquitetura.md](../referencia/arquitetura.md).
>
> Pesquisa multi-fonte com verificação adversarial (≈120 claims citados; docs Cloudflare/Neon/ClickHouse/Tinybird, Meta CAPI/TikTok Events, literatura de atribuição/identity-resolution). Confiança por claim. **Ressalva:** preços/limites mudam; partes das docs Meta/TikTok vieram de fontes secundárias (páginas oficiais JS-rendered) — **reconfirmar normalização de campos antes de implementar**.
>
> **Resumo da decisão.**
> 1. **Rollups em Postgres como system-of-record** ⭐ — Postgres (Neon) guarda eventos crus (RLS por tenant) + **tabelas de rollup incrementais** (upsert `ON CONFLICT … DO UPDATE`). Tinybird (ClickHouse-aaS) é a opção colunar **"depois"**; Analytics Engine só p/ tiles de tendência amostrados (não billing-grade).
> 2. **Achado load-bearing: o scale-to-zero do Neon MATA `pg_cron` e o refresh de continuous aggregates do TimescaleDB** ⚠️ — eles rodam como background workers que só disparam com a compute ativa. **O agendamento dos rollups DEVE ser externalizado para um Cron Trigger Worker da Cloudflare** batendo via Hyperdrive. É a restrição arquitetural #1.
> 3. **Tiles ao vivo via Durable Objects** ⭐ — contadores sharded em DO (single-thread, forte-consistente) p/ "hoje-até-agora" (novos leads, contagens do funil); Queues bufferiza; alarms do DO fazem flush p/ o Postgres.
> 4. **Atribuição: position-based primeiro, Markov depois** ⭐ — U-shaped 40/40/20 no v1; data-driven (Markov antes de Shapley) **só com ≥100 conversões/mês por tenant**. **Identity stitching determinístico** (telefone + hash email/telefone + **fbclid capturado no 1º toque**) é pré-requisito — sem ele você nem enxerga os 3 toques.
> 5. **Fechar o ciclo p/ plataformas: mandar last-touch click-ID, guardar multi-touch internamente** ⭐ — Meta CAPI (`action_source: business_messaging`/`chat` p/ venda no WhatsApp), TikTok Events; **o Mercado Livre não tem conversions API** (usar webhook `orders_v2` como *fonte* de conversão).

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — os KPIs já existem; a base de dados não](#2-enquadramento--os-kpis-já-existem-a-base-de-dados-não)
3. [O achado load-bearing (Neon scale-to-zero)](#3-o-achado-load-bearing-neon-scale-to-zero)
4. [Arquitetura de analytics recomendada](#4-arquitetura-de-analytics-recomendada)
5. [Comparação de stores](#5-comparação-de-stores)
6. [Multi-tenant no analytics](#6-multi-tenant-no-analytics)
7. [Atribuição cross-canal](#7-atribuição-cross-canal)
8. [Fechar o ciclo para as plataformas](#8-fechar-o-ciclo-para-as-plataformas)
9. [Como cada KPI é computado](#9-como-cada-kpi-é-computado)
10. [Mitos refutados & caveats](#10-mitos-refutados--caveats)
11. [Perguntas em aberto](#11-perguntas-em-aberto)
12. [Fontes](#12-fontes)

---

## 1. Sumário executivo

| Store | O que é | Fit serverless/CF | Veredito |
|---|---|---|---|
| **Postgres (Neon) rollups** | tabelas de rollup incrementais no banco que já existe | já na stack (Hyperdrive); **agendar via Cron Worker, não pg_cron** | ⭐ **System-of-record + v1** |
| **Durable Objects (sharded)** | contadores ao vivo "hoje-até-agora" | nativo, forte-consistente | ⭐ **Tiles ao vivo** |
| **Tinybird** (ClickHouse-aaS) | colunar gerenciado + REST publicada + RLS por JWT | REST `fetch` + token (Worker-friendly) | ⭐ **Colunar "depois"** |
| **Cloudflare Analytics Engine** | time-series CF-nativo (write binding + SQL-HTTP) | nativo, baratíssimo | ⚠️ **só tiles amostrados** (3 meses retenção, sampling quebra COUNT exato) |
| **ClickHouse Cloud** | colunar, scale-to-zero | HTTPS | viável depois; mais ops que Tinybird |
| **DuckDB/MotherDuck** | warehouse serverless sobre Parquet em R2 | HTTPS | bom p/ ad-hoc; custo por-tenant awkward |
| **Apache Pinot** | OLAP distribuído high-QPS | cluster always-on | ❌ **rejeitar** (ops pesado demais) |

---

## 2. Enquadramento — os KPIs já existem; a base de dados não

A tela de métricas já fixou o contrato (em `metricas/_data/`): 5 KPIs de topo, um funil de 5 estágios, e breakdown por canal com **receita atribuída**. O `concorrentes.md` mostrou que **cruzar venda+social+atendimento com métricas unificadas** é exatamente a lacuna explorável do mercado. Então a pergunta é técnica e estreita: **como computar esses KPIs, em tempo (quase) real onde preciso, multi-tenant, barato, sobre Cloudflare+Postgres** — e como fazer a **atribuição cross-canal** que dá sentido à "receita por canal".

---

## 3. O achado load-bearing (Neon scale-to-zero)

No Neon, `pg_cron` e o refresh de **continuous aggregates** do TimescaleDB rodam como **background workers que só disparam enquanto a compute está ativa** — o **scale-to-zero silenciosamente os interrompe** (alta confiança, docs Neon). Além disso, o Neon entrega **TimescaleDB Apache-only** (sem compressão/tiered storage), e `REFRESH MATERIALIZED VIEW` rescaneia a fonte inteira mesmo p/ deltas minúsculos.

> **Consequência:** um design de rollups em Postgres aqui **tem** que externalizar o agendamento para um **Cloudflare Cron Trigger Worker** (conecta via Hyperdrive e roda os upserts). É a restrição arquitetural mais importante deste doc — e o tipo de coisa que, pega agora, evita um design que "funciona no dev e para de atualizar em produção".

---

## 4. Arquitetura de analytics recomendada

**Veredito: rollups em Postgres como system-of-record + v1 — mas com pipeline de ingestão/rollup CF-nativo, NÃO pg_cron.**

```
Eventos (Worker emite: lead_created, first_response, stage_changed,
         conversation_handled_by_ai, escalated_to_human, sale_won, touchpoint)
   → Cloudflare Queues  (buffer/batch; 3 retries → DLQ)
   → Durable Objects sharded (contadores ao vivo: novos leads, contagens do funil;
        single-thread/forte-consistente; SHARDAR contadores de alta escrita)
   → DO Alarms fazem flush periódico dos agregados parciais → Neon
   → Neon Postgres:
        • tabelas de evento cru (system-of-record, RLS por tenant)
        • tabelas de rollup incrementais: upsert ON CONFLICT (tenant_id, bucket, dims)
          DO UPDATE SET metric = metric + EXCLUDED.metric   (idempotente)
        • janela de recomputação (late events) — manter últimas N horas "abertas"
   → Cloudflare Cron Trigger Worker (batch noturno: Receita/atribuição/conversão
        via Hyperdrive — SUBSTITUI o pg_cron)
   → Leitura do dashboard: Worker → Hyperdrive → tabelas de rollup pré-agregadas
```

**Regras de design (da evidência):**
- **Híbrido por tier, não refresh uniforme:** contadores ao vivo (novos leads, funil) via DO; receita/conversão/atribuição toleram staleness noturno. Frequência de refresh **por tier**.
- **Tabelas de rollup batem materialized views** em alta ingestão: upsert incremental processa só o net-new e é idempotente; MV rescaneia tudo. (CA do Timescale daria MV com freshness, mas o scale-to-zero do Neon derruba o auto-refresh.)
- **Idempotência + late events:** chave única `(tenant_id, time_bucket, dims)` + `ON CONFLICT DO UPDATE`; dedupe do cru por `event_id`; recomputar a janela aberta a cada run.
- **Migrar p/ Tinybird** só quando o volume/cardinalidade de query por tenant superar os rollups do Postgres (é o colunar mais Worker-friendly: REST + RLS por JWT).
- **AE como firehose barato complementar** p/ tiles de tendência onde sampling é aceitável — **nunca** como fonte da Receita (sampling + 3 meses de retenção).

---

## 5. Comparação de stores

(ver tabela §1.) Pontos-chave: **AE** é o mais barato (10M writes + 1M reads/mês inclusos; depois $0.25/M write, $1.00/M read) mas **amostra** (usar `SUM(_sample_interval)`, não `COUNT`) e retém **3 meses** → tiles, não billing. **Tinybird** tem RLS + tokens JWT por tenant (melhor embedded-analytics) mas billing por vCPU-hora. **ClickHouse Cloud** tem piso real (~$66 Basic, ~$500 Scale). **Postgres** não adiciona vendor e já está na stack — vence como base, com o ajuste do Cron Worker (§3).

---

## 6. Multi-tenant no analytics

- **Padrão Postgres: tabela compartilhada + `tenant_id` + RLS** (muitos tenants pequenos/uniformes). Performance de RLS é dominada por **índice**: índice composto com **`tenant_id` à frente** = lookup barato; sem ele = full scan (~2 ordens de grandeza pior).
- **Gotcha de conexão pooled (serverless):** setar o contexto de tenant **por transação (`SET LOCAL` dentro da txn)** p/ uma conexão reusada não vazar contexto de outro tenant. **Neon Authorize / RLS** dirige policies por JWT (`pg_session_jwt`, `auth.user_id()`) em vez de session var — usar **endpoint pooled (PgBouncer, 5432)** + RLS em toda tabela + checagem na aplicação.
- **Particionamento time-series:** RANGE por tempo × HASH/LIST por tenant dá pruning em 2 níveis, mas **partição por-tenant não escala p/ muitos tenants** → preferir partição por tempo + índice com `tenant_id` à frente.
- **Colunar:** ClickHouse/Tinybird → `ORDER BY (tenant_id, timestamp)` (tenant PRIMEIRO, senão escaneia todos) + row policies. AE → `tenant_id` no único slot de índice (sampling consistente por tenant).
- **Rollups pré-agregados por tenant** são o padrão de escala: dashboard lê KB de pontos pré-bucketizados em vez de escanear 100M+ linhas; hierárquico 1m→1h→1d.

---

## 7. Atribuição cross-canal

**Position-based (U-shaped 40/40/20) PRIMEIRO; migrar p/ data-driven (Markov antes de Shapley) só quando o volume por tenant suportar.**

- Modelos heurísticos usam pesos fixos arbitrários — mas **data-driven precisa de ~100+ conversões/mês por tenant/modelo** p/ ser estatisticamente confiável; uma SaaS multi-tenant **raramente bate isso cedo por tenant** → position-based é o default seguro.
- Em **loops conversacionais curtos (IG→WhatsApp→ML), position-based bate time-decay** (time-decay é p/ ciclos >60 dias).
- **Markov antes de Shapley:** Markov (removal effect, normalizado) é **mais robusto em dados pequenos**; Shapley é exponencial (2^N coalizões, Monte-Carlo acima de ~8 canais) e mais sensível a dado raso. *Caveat: Markov precisa também dos caminhos que NÃO converteram, ou enviesa.*
- **Receita por canal:** `receita_canal = Σ (valor_negócio × peso_normalizado_canal)`. O **mesmo real se divide** entre instagram/whatsapp/mercadolivre numa jornada multi-touch. ⚠️ **"receita por canal" é dependente do modelo e não comparável entre modelos** — **fixar e rotular o modelo na UI**.

### Identity stitching (pré-requisito)
- **Determinístico primeiro** (hash email/telefone), **probabilístico como fallback**. Híbrido leva cobertura de ~50–60% p/ ~85–95%.
- **Caminho concreto p/ IG→WhatsApp→ML:** telefone (WhatsApp) + hash email/telefone (ML/web) + **captura do `fbclid` no 1º toque do anúncio IG**. Click-IDs (fbclid/gclid/ttclid) viajam na URL, sobrevivem à perda de cookie, e são a chave primária das conversion APIs server-side.
- Match exato perde ~30–40% dos duplicados reais → camada de fuzzy (Levenshtein; Jaro-Winkler p/ nomes) + survivorship. Liga no dedup do mini-CRM (`contact` por `email_hash`/`phone_hash`, [leads-crm](../funcionalidades/leads-crm.md) §6).

---

## 8. Fechar o ciclo para as plataformas

- **Meta CAPI:** server-to-server (passa por ATT/ITP/ad-block). Campos: `event_name`, `event_time`, `action_source` (+ `event_id`, `user_data`). **`action_source` inclui `business_messaging` e `chat`** — direto p/ venda fechada no WhatsApp. **Dedup com Pixel = mesmo `event_name` + `event_id`** (usar order id estável, ~48h). **Hashear (SHA-256 normalizado): `em`,`ph`,`fn`,`external_id`**; **mandar cru: `fbc`,`fbp`,`client_ip_address`,`client_user_agent`,`lead_id`** (hashear esses quebra o match). `fbc` = `fb.<sub>.<ts_ms>.<fbclid>`.
- **Venda dias depois (CRM):** fluxo conversion-leads / "CAPI for CRM"; linkar por **`lead_id` (15–16 díg.)** de lead-ads ou por **fbclid/fbc**; **estágio do lead em até 28 dias** da geração; eventos aceitos até ~7 dias, mas >1h atrasa otimização. **Guardar o click-ID no contato no 1º toque** é o passo habilitador crítico (liga em leads-crm §6.6).
- **TikTok Events API:** `/open_api/v1.3/event/track/`; `event_id` p/ dedup; hash SHA-256; capturar `ttclid`.
- **Mercado Livre NÃO tem conversions API estilo Meta** — Mercado Ads é só reporting de sponsored-products; o sinal mais próximo é o **webhook `orders_v2`** (usar como *fonte* de conversão p/ alimentar Meta/TikTok).
- **Tensão real de atribuição:** as plataformas otimizam em **last-touch do próprio click-ID** — mandar valores MTA-descontados degrada o sinal delas. **Recomendação: mandar p/ a plataforma a conversão last-touch click-ID que ela espera; manter o multi-touch interno** p/ o dashboard de Receita-por-canal. Dois consumidores, duas alocações.
- **LGPD:** PII hasheada **ainda é dado pessoal** (precisa de base legal — consentimento específico); enviar p/ Meta/TikTok (EUA) é **transferência transfronteiriça** (mecanismo válido); ANPD em enforcement ativo (caso Meta). Liga em [whatsapp](whatsapp.md) §11.

---

## 9. Como cada KPI é computado

| KPI | Computação | Tempo real? |
|---|---|---|
| **Receita** | `Σ (valor_negócio × peso_canal)` sob o modelo de atribuição; rollup batch noturno OK | Batch |
| **Novos leads** | `COUNT(lead_created)` por tenant/período; contador "hoje-até-agora" | **Ao vivo** (DO) |
| **Taxa de conversão** | `(conversões ÷ leads no funil) × 100` | Batch/near-RT |
| **Funil** (5 estágios) | por par adjacente: `(estágio_depois ÷ estágio_antes) × 100`; contagens de `stage_changed` | Contagens ao vivo / taxas batch |
| **Speed-to-lead** | `first_response.ts − lead_created.ts` **por lead em event-time** (correlacionar 2 eventos, não pré-agregar). Rollup avg/median **com denominador de cobertura** (não-contatados excluídos inflam). Dispara **alerta/roteamento**, não só tile | **Event-time + alerta near-RT** |
| **% atendidas pela IA** | precisar a métrica: **Containment** = `(resoluções automáticas sem escalar ÷ total automático) × 100`. **Exigir resolução real** (sem ticket humano em ~24h) — chat abandonado NÃO é "atendido pela IA". De `conversation_handled_by_ai` + `escalated_to_human` | Batch/near-RT |
| **Por canal** (leads/conversas/receita) | `COUNT`/`SUM` por dim de canal; receita usa pesos de atribuição (§7); rollup por `(tenant_id, channel, bucket)` | Misto |

---

## 10. Mitos refutados & caveats

- ❌ **"Usar pg_cron/TimescaleDB CA no Neon p/ os rollups"** — **refutado.** Scale-to-zero do Neon mata os background workers → agendar via **Cron Trigger Worker** da Cloudflare.
- ❌ **"Analytics Engine como fonte da Receita"** — **refutado.** Sampling quebra COUNT exato e a retenção é de 3 meses → AE só p/ tiles amostrados; Postgres p/ billing-grade.
- ❌ **"Atribuição data-driven (Markov/Shapley) já no v1"** — **refutado.** Estatisticamente inválido abaixo de ~100 conversões/mês por tenant → position-based primeiro.
- ❌ **"Mandar o valor multi-touch p/ Meta/TikTok"** — **má ideia.** Plataformas querem last-touch do próprio click-ID; manter MTA interno.
- ⚠️ **"Receita por canal é um número absoluto"** — depende do modelo; **fixar e rotular** o modelo na UI.
- ⚠️ **"Regra dos 5 min = 100× qualificação"** — estudo datado (MIT/Oldroyd 2007), direcional. ⚠️ Normalização de campos Meta/TikTok parcialmente de fontes secundárias — **reconfirmar no doc oficial**.

---

## 11. Perguntas em aberto

1. **Modelo de eventos canônico** (`lead_created`, `first_response`, `stage_changed`, `conversation_handled_by_ai`, `escalated_to_human`, `sale_won`, `touchpoint`) — formalizar no schema (liga em [referencia/arquitetura.md](../referencia/arquitetura.md) §11).
2. **Quando migrar p/ Tinybird** — definir o gatilho (cardinalidade/latência de query por tenant).
3. **Captura de click-ID** (`fbclid`/`ttclid`) no 1º toque — onde no funil de entrada (landing/form/ad referral) e persistir no `contact`.
4. **Modelo de atribuição default** exposto na UI + caminho p/ Markov quando o volume permitir.
5. **LGPD** do envio de PII hasheada a Meta/TikTok (base legal + transferência) — cruza com a investigação de **LGPD deep** (a fazer).
6. **Speed-to-lead como alerta** (roteamento/SLA), não só métrica — liga no runtime do agente/escalação.
7. **Unit economics** do pipeline de analytics (DO writes, Queue ops, query Hyperdrive) — cruza com a investigação de custo.

---

## 12. Fontes

> Preços/limites reconfirmar; normalização Meta/TikTok validar no doc oficial (páginas JS-rendered).

**Stores / analytics**
- Cloudflare Analytics Engine — <https://developers.cloudflare.com/analytics/analytics-engine/limits/> · <https://developers.cloudflare.com/analytics/analytics-engine/sql-api/> · <https://developers.cloudflare.com/analytics/analytics-engine/pricing/>
- Tinybird (multi-tenant/pricing) — <https://www.tinybird.co/blog/multi-tenant-saas-options> · <https://www.tinybird.co/pricing>
- ClickHouse Cloud (billing/multi-tenancy) — <https://clickhouse.com/docs/cloud/manage/billing/overview> · <https://clickhouse.com/docs/cloud/bestpractices/multi-tenancy>
- MotherDuck/DuckDB — <https://motherduck.com/docs/getting-started/customer-facing-analytics/>
- Pinot — <https://startree.ai/resources/apache-pinot-in-2026/>

**Postgres / Neon / rollups**
- Neon pg_cron / TimescaleDB (scale-to-zero) — <https://neon.com/docs/extensions/pg_cron> · <https://neon.com/docs/extensions/timescaledb> · <https://mydba.dev/blog/timescaledb-background-workers>
- Neon RLS / Authorize — <https://neon.com/blog/introducing-neon-authorize> · <https://neon.com/guides/rls-multi-tenant-apps>
- Rollup vs MV — <https://www.citusdata.com/blog/2018/10/31/materialized-views-vs-rollup-tables/> · <https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html>
- Idempotência incremental — <https://docs.getdbt.com/best-practices/how-we-handle-real-time-data/2-incremental-patterns>
- Cron Triggers / DO — <https://developers.cloudflare.com/workers/configuration/cron-triggers/> · <https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/>

**Atribuição / identity**
- Modelos — <https://www.invoca.com/blog/marketing-attribution-modeling-techniques> · <https://www.factors.ai/blog/types-of-attribution-models>
- Markov/Shapley — <https://adequate.digital/en/markov-chain-attribution-modeling-complete-guide/> · <https://www.koehn.ai/en/blog/dynamic-marketing-attribution-modelling-markov-chain-and-shapley-value/> · <https://arxiv.org/pdf/1804.05327>
- Identity resolution — <https://www.rudderstack.com/blog/deterministic-vs-probabilistic/> · <https://segment.com/docs/unify/identity-resolution/>
- Click-IDs — <https://www.northbeam.io/blog/what-is-fbclid-guide-to-facebook-click-identifiers>

**Fechar o ciclo (CAPI/Events)**
- Meta CAPI — <https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/server-event> · <https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events> · <https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/>
- TikTok Events — <https://business-api.tiktok.com/portal/docs/events-api-2.0/v1.3>
- Mercado Ads / orders — <https://developers.mercadolivre.com.br/en_us/product-ads-us-read>
- LGPD — <https://weblegal.ai/en/blog/lgpd-email-marketing-purchased-lists-brazil-2026/> · <https://fpf.org/blog/processing-of-personal-data-for-ai-training-in-brazil-takeaways-from-anpds-preliminary-decisions-in-the-meta-case/>
