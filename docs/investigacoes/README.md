---
tipo: indice
status: estável
updated: 2026-06-21
description: O eixo investigação — o que estudei pra decidir. Pesquisa com evidência (APIs, mercado, tooling).
---

# Investigações

Responde **o que estudei pra decidir**. Pesquisa com evidência e verificação
adversarial: capacidades de API das plataformas, o mercado e as opções de tooling.

**Entra aqui** o levantamento que embasa uma decisão — com fontes, claims verificados e
ressalvas de validação (preços e versões de API mudam; reconfirmar antes do go-live).

**Não entra** a decisão de produto em si (vai pra [`produto/`](../produto/)) nem o design
da feature que sai dela (vai pra [`design/`](../design/)).

## APIs de plataforma — evento → classificação → ação
- [facebook.md](facebook.md) — API da Meta/Facebook (Graph/Marketing v25.0): automação de
  comentários, Messenger, remarketing e atendimento com IA.
- [instagram.md](instagram.md) — Plataforma Instagram (Graph API v25.0): webhooks de
  comentários, DMs, menções e referrals de anúncio.
- [tiktok.md](tiktok.md) — APIs do TikTok (Developers, API for Business, Shop):
  publicação orgânica, remarketing pago e atendimento; lacunas no social orgânico.
- [twitter.md](twitter.md) — X (Twitter) API: respostas, engajamento, DM e remarketing;
  viabilidade após as mudanças de preço e regras de 2026.
- [whatsapp.md](whatsapp.md) — WhatsApp Business Platform (Cloud API) como canal #1 de
  atendimento: On-Prem morto, multi-tenant via Tech Provider, janela 24h grátis, e por que
  rotas não-oficiais (Z-API/Baileys) não servem de fundação.

## Núcleo de IA — o cérebro GraphRAG
- [graphrag-noderag.md](graphrag-noderag.md) — avaliação adversarial do NodeRAG
  (research-grade, não usar como dependência) e caminho faseado vector→graph-lite sobre
  Postgres/pgvector+AGE.
- [classificacao-eventos.md](classificacao-eventos.md) — a "classificação" do loop: Claude
  não tem logprobs e confiança verbalizada é superconfiante; as bandas 0.80/0.50 precisam de
  fonte calibrada (encoder + temperature scaling ou self-consistency). Arquitetura: cascade.

## Infra de eventos & runtime do agente
- [ingestao-inbox-realtime.md](ingestao-inbox-realtime.md) — ingestão de webhooks (6+
  plataformas, SLAs díspares) + inbox realtime sobre Cloudflare: Worker→Queue→Workflow→
  Durable Object (WS Hibernation); waitUntil é cilada, KV é inseguro p/ dedupe.
- [orquestracao-agente.md](orquestracao-agente.md) — runtime do Agente FSM+LLM: FSM
  própria/XState num Durable Object por thread_id; LangGraph.js desqualificado em Workers.
- [classificacao-eventos.md](classificacao-eventos.md) — a "classificação": bandas 0.80/0.50
  precisam de confiança calibrada (Claude não dá logprob); cascade híbrido.
- [avaliacao-guardrails.md](avaliacao-guardrails.md) — eval/guardrails do auto-reply: a banda
  0.50–0.79 é infra de compliance (Meta + LGPD Art. 20); compromissos (preço/reembolso) só em
  camada de regras determinística; LLM-as-judge usável mas enviesado.

## Negócio — custo & métricas
- [unit-economics.md](unit-economics.md) — custo de IA fim-a-fim: conversa ~R$0,05, evento
  ~R$0,0003; plano flat R$150 afunda acima de ~2.400 conversas/mês → metrificar ou R$199–299.
- [metricas-atribuicao.md](metricas-atribuicao.md) — analytics unificado + atribuição cross-canal:
  rollups em Postgres agendados por Cron Worker (Neon scale-to-zero mata pg_cron), DO p/ tiles
  ao vivo, position-based→Markov, identity stitching, CAPI/TikTok/ML.

## Marketplaces de venda — fechar conteúdo→conversa→conversão
- [marketplaces-venda.md](marketplaces-venda.md) — APIs de Mercado Livre, Mercado Pago e
  OLX Brasil sob a lente evento→ação: ML é canal completo, MP é sinal de conversão, OLX é
  canal de integrador vertical (Autos/Imóveis).

## Mercado
- [concorrentes.md](concorrentes.md) — benchmark de 22 concorrentes verificados; o
  diferencial defensável é a **unificação operacional** com localização BR/LATAM.

## Tooling
- [editores-ui-page-form-builders.md](editores-ui-page-form-builders.md) — build vs buy de
  page/form builders embedáveis, multi-tenant e white-label (Puck, SurveyJS, Formbricks…).
- [workflows-visuais.md](workflows-visuais.md) — packages para o editor visual de
  workflows; recomendação React Flow + Inngest como motor.
