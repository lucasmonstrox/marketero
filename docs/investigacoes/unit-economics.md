---
tipo: investigacao
status: estável
updated: 2026-06-22
description: Custo de IA fim-a-fim — conversa inbound ~R$0,05 (transporte R$0), evento ~R$0,0003 via cascade; plano flat R$150 afunda acima de ~2.400 conversas/mês → metrificar volume ou ancorar entrada em R$199–299.
---

# Unit economics — custo de IA fim-a-fim

> Investigação do **custo recorrente** do pipeline de IA do Marketero (`evento → classificação → ação` + agente conversacional) sobre **Cloudflare Workers + Postgres + Claude**, e se ele **fecha margem** contra o preço dos concorrentes BR. Vários documentos adiaram a unit economics para cá ([classificacao-eventos](classificacao-eventos.md) §12, [graphrag-noderag](graphrag-noderag.md) §10, [metricas-atribuicao](metricas-atribuicao.md) §11, [referencia/arquitetura](../referencia/arquitetura.md) §13).
>
> **FX assumido: R$/USD ≈ 5,4** (todas as conversões usam isto). Pesquisa multi-fonte + reaproveitamento dos preços unitários **já verificados adversarialmente** nas investigações anteriores. Confiança por claim: **[A]** alta (doc oficial/1ª-parte), **[M]** média (research/vendor direcional), **[B]** baixa (assumido). **Ressalva forte:** os números mais fracos são as **suposições de volume [B]** e as **tarifas de template do WhatsApp BR [B-M, não verificadas no rate card da Meta]** — re-medir com `count_tokens` em tráfego PT-BR real antes de travar pricing.
>
> **Resumo da decisão.**
> 1. **Conversa inbound de atendimento ≈ R$0,05 de compute, R$0 de transporte** [M/A] — a janela de 24h grátis do WhatsApp (desde jul/2025) torna a **IA o único custo variável** do inbound. Evento classificado ≈ **R$0,0003** via cascade.
> 2. **COGS por tenant/mês ≈ R$22 (baixo) / R$94 (médio) / R$366 (alto)** [M].
> 3. **O plano flat barato é inviável** ⚠️ — contra o teto competitivo BR de **R$140–300**, um plano **flat R$150 só tem margem no tier baixo**; vira fino no médio e **afunda acima de ~2.400 conversas/mês**. **→ metrificar o volume de conversas-IA (cota + overage) ou ancorar a entrada em R$199–299.**
> 4. **Maiores alavancas:** cascade encoder-first (**~6–7×** vs Haiku-em-tudo), **prompt caching (~10×** no input), **Haiku como default** (Sonnet/Opus só no difícil), **debounce + Batches (50%)**, e manter o WhatsApp **in-window (grátis)**.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — custo recorrente, teto competitivo](#2-enquadramento--custo-recorrente-teto-competitivo)
3. [Preços unitários (inputs verificados)](#3-preços-unitários-inputs-verificados)
4. [O fato estrutural: inbound in-window é R$0 de transporte](#4-o-fato-estrutural-inbound-in-window-é-r0-de-transporte)
5. [Custo por evento (cascade vs naive)](#5-custo-por-evento-cascade-vs-naive)
6. [Custo por conversa](#6-custo-por-conversa)
7. [Custo por tenant/mês × 3 tiers + veredito de margem](#7-custo-por-tenantmês--3-tiers--veredito-de-margem)
8. [Drivers & alavancas](#8-drivers--alavancas)
9. [Mitos refutados](#9-mitos-refutados)
10. [Perguntas em aberto](#10-perguntas-em-aberto)
11. [Fontes](#11-fontes)

---

## 1. Sumário executivo

| Métrica | Valor | Conf. |
|---|---|---|
| Conversa inbound (compute) | **~R$0,05** | [M] |
| Conversa inbound (transporte WhatsApp in-window) | **R$0** | [A] |
| Evento classificado (cascade) | **~R$0,0003** | [M] |
| Evento classificado (Haiku-em-tudo, naive) | ~R$0,0022 | [M] |
| COGS/tenant/mês — baixo / médio / alto | **~R$22 / R$94 / R$366** | [M] |
| Teto competitivo BR (entrada PME) | R$140–300/mês | [M] |
| Break-even do plano flat R$150 | **~2.400 conversas / ~16k eventos/mês** | [M] |

---

## 2. Enquadramento — custo recorrente, teto competitivo

Diferente de um índice de RAG (custo único), aqui o custo é **recorrente por evento e por conversa, para sempre** — então a unit economics decide tanto as **escolhas de arquitetura** (modelo pequeno, cascade, caching) quanto o **modelo de pricing**. O teto é dado pelo mercado: o [concorrentes.md](concorrentes.md) e esta pesquisa situam a faixa PME-first (WhatsApp+social) em **R$140–300/mês** (Leadster R$142–154, Manychat ~R$149, BotConversa R$199–297, Blip Go R$299), com plataformas "de verdade" bem acima (RD Conversas R$798, SleekFlow R$459+, Zenvia ~R$499+). O **R$140–154** anotado é o **piso** do mercado crível — e o preço mais difícil de defender margem.

---

## 3. Preços unitários (inputs verificados)

| Input | Preço | Conf. |
|---|---|---|
| Claude **Haiku 4.5** | **$1 / $5** por MTok (in/out) | [A] |
| Claude **Sonnet 4.6** | $3 / $15 | [A] |
| Claude **Opus 4.8** | $5 / $25 | [A] |
| **Prompt caching** | cache-read ≈ **0,1×** input | [A] |
| **Batches API** | **−50%** | [A] |
| Workers AI **bge-m3** | ~$0,012/MTok; **10k neurons/dia grátis** | [M] |
| Encoder self-hosted (BERTimbau/e5) | **~$0,001–0,01 / 1k eventos** | [M-A] |
| Cloudflare **Queues** | $0,40/M ops (64KB/op) | [M] |
| **Durable Objects** | $0,15/M req + $12,50/M GB-s + linhas SQLite | [M] |
| **Hyperdrive** | grátis (100k queries/dia free) | [M] |
| **WhatsApp BR** templates | Marketing ~R$0,31–0,38 · Utility ~R$0,04–0,05 (grátis in-window) · Auth ~R$0,15–0,19 | [B-M] ⚠️ não verificado no rate card |
| **WhatsApp serviço in-window** | **GRÁTIS desde jul/2025** | [A] |

---

## 4. O fato estrutural: inbound in-window é R$0 de transporte

O caso de uso #1 do Marketero — resposta de atendimento inbound dentro da janela de 24h — é **R$0 no transporte do WhatsApp** [A]. Logo, a **compute de IA é o custo variável inteiro** de uma conversa inbound. O custo de transporte só aparece no **re-engajamento outbound** (templates marketing/auth), que é tipicamente uma ação separada e cobrável/disparada pelo usuário. **Implicação:** otimizar custo = otimizar tokens de IA + manter a conversa inbound/in-window; nunca auto-disparar campanhas outbound sem necessidade.

---

## 5. Custo por evento (cascade vs naive)

Arquitetura ([classificacao-eventos](classificacao-eventos.md) §10): **[1]** filtro encoder/regex (spam + core fácil; resistente a injeção; $0,001–0,01/1k) → **[2]** Haiku structured (~250 in / 30 out) só na cauda incerta → **[3]** self-consistency (Haiku ×3–5) só na fronteira 0,50–0,79.

| Caminho | Fatia (assumida) | Custo/evento |
|---|---|---|
| Só filtro encoder | ~70% | ~$0,000005 |
| + Haiku structured (cacheado) | ~28% | ~$0,0002 |
| + Self-consistency N=4 (só fronteira) | ~2% | ~$0,0008 |
| **Blended** | 100% | **≈ $0,00006 ≈ R$0,0003** [M] |
| **Naive (Haiku em todo evento)** | — | **$0,0004 ≈ R$0,0022** [M] |

> O **cascade é ~6–7× mais barato** que Haiku-em-tudo (R$0,33 vs R$2,16 por 1k eventos). É a maior alavanca do lado dos eventos.

---

## 6. Custo por conversa

Runtime ([orquestracao-agente](orquestracao-agente.md)): um DO por `thread_id`, checkpoint da FSM em SQLite, Claude para NLU + geração ocasional via GraphRAG. ~5 turnos/conversa [M].

| Componente | Custo | Conf. |
|---|---|---|
| 5 turnos × (Haiku NLU ~600 in cacheado + 120 out) | ~$0,0035 | [M] |
| ~2 respostas de geração (digressão GraphRAG, Haiku) | ~$0,003 | [M] |
| Escalada ocasional p/ Sonnet (~10% das conversas) | ~$0,0006 amortizado | [M] |
| Extração de grafo (debounced 1×/conversa, Haiku) | ~$0,002 | [M] |
| Embeddings (bge-m3, ~grátis sob 10k neurons/dia) | ~$0 | [M] |
| Queue + DO req/GB-s + alarms | ~$0,0005 | [B] |
| **Total por conversa** | **≈ $0,009 ≈ R$0,05** | [M] |
| WhatsApp transporte (in-window) | **R$0** | [A] |

> Geração + extração de grafo (as partes **opcionais e debounce-áveis**) são ~55% do custo da conversa — exatamente as alavancas do §8. A conversa é barata; **volume × eventos é o que escala a conta.**

---

## 7. Custo por tenant/mês × 3 tiers + veredito de margem

Tiers (suposições **[B]** — o número mais fraco; validar com tráfego real). Eventos ≫ conversas porque o loop classifica *todo* comentário/DM/pergunta, e a maioria nunca vira conversa.

| | **BAIXO** | **MÉDIO** | **ALTO** |
|---|---|---|---|
| Conversas/mês | 300 | 1.500 | 6.000 |
| Eventos/mês | 1.500 | 10.000 | 50.000 |
| Custo conversas | R$15 | R$75 | R$300 |
| Custo eventos | R$0,50 | R$3,30 | R$16,50 |
| Overhead plataforma (embeddings/Queue/DO) | ~R$2 | ~R$8 | ~R$35 |
| Infra fixa/tenant (Hyperdrive grátis, Workers, PG) | ~R$5 | ~R$8 | ~R$15 |
| **COGS/tenant/mês** | **≈ R$22** | **≈ R$94** | **≈ R$366** |
| Pessimista (×2,5, sem caching, mais geração) | ~R$55 | ~R$235 | ~R$915 |

**Margem (preço R$150 / R$199 / R$299):**

| Tier | COGS | @R$150 | @R$199 | @R$299 |
|---|---|---|---|---|
| Baixo | R$22 | **85%** ✅ | 89% | 93% |
| Médio | R$94 | **37%** ⚠️ | 53% | 69% ✅ |
| Alto | R$366 | **−144%** 🔴 | −84% 🔴 | −22% 🔴 |

**Onde o plano flat afunda:** um plano **flat R$150 só é saudável no tier baixo**; é fino no médio e **prejuízo profundo no alto** — um único power-tenant com 6.000 conversas-IA/mês custa ~R$366 e paga R$150 → perde-se ~R$216/mês nele. **Break-even do flat R$150 ≈ 2.400 conversas / ~16k eventos/mês.** Depois disso, cada conversa é prejuízo.

> **Implicação de produto:** plano flat unlimited barato é inviável. **Metrificar o volume de conversas/eventos-IA** (cota inclusa + overage, ou tier-por-volume), e/ou rotear power-tenants por caminhos mais baratos (encoder-first, debounce, Batches). **Ancorar a entrada em R$199–299**, não R$150, mantém o tier médio positivo sem metrificar.

---

## 8. Drivers & alavancas

**Drivers (ranqueados):** (1) **geração + extração de grafo por conversa** (~55% do custo da conversa); (2) **volume de eventos × classificação naive** (Haiku-em-tudo = ~6–7× o cascade); (3) **contagem de conversas no tier alto** (linear e ilimitada sob plano flat); (4) **templates outbound** do WhatsApp (marketing R$0,31–0,38) — fora do COGS acima, mas explode se o produto auto-disparar campanhas.

| Alavanca | Mecanismo | Impacto | Conf. |
|---|---|---|---|
| **Cascade encoder-first** | filtro barato pega ~70%; Haiku só na cauda | **~6–7×** mais barato no classify | [M-A] |
| **Prompt caching** | cache-read 0,1× (system+schema+contexto de grafo) | input → ~1/10; classify $0,40→$0,10–0,20/1k | [A] |
| **Tiering Haiku-vs-Opus** | Haiku default; Sonnet/Opus só em ~10% (geração/escalada difícil) | evita 5–25× do Opus nos 90% | [A] |
| **Debounce / batch** | classificar estado final; extrair grafo 1×/conversa | corta chamadas redundantes | [M-A] |
| **Batches API** | extração/backfill fora do caminho ao vivo | **−50%** | [A] |
| **WhatsApp in-window grátis** | manter inbound/serviço, escalar a humano (não template) | transporte **R$0** | [A] |
| **Self-consistency só na fronteira** | N=4 Haiku só na banda 0,50–0,79 | confina o 4× a ~2% dos eventos | [M] |
| **Metrificar a conversa-IA** | cota + overage | transforma o prejuízo do tier alto em receita | [A, design] |

---

## 9. Mitos refutados

- ❌ **"Plano flat barato (~R$150) unlimited fecha"** — **refutado.** Afunda acima de ~2.400 conversas/mês; um power-tenant dá prejuízo de centenas de reais. Metrificar ou ancorar em R$199–299.
- ❌ **"O transporte do WhatsApp é o grande custo do atendimento"** — **refutado** para inbound: serviço in-window é R$0 desde jul/2025; o custo é compute de IA.
- ❌ **"Classificar tudo com Haiku é barato o suficiente"** — **refutado.** Cascade encoder-first é ~6–7× mais barato; em escala, a diferença é material.
- ⚠️ **"Precisamos do Opus para qualidade"** — desnecessário no caminho comum; Haiku default + Sonnet/Opus só no difícil evita 5–25× de custo.

---

## 10. Perguntas em aberto

1. **Volume real [B → validar]:** medir conversas/mês e razão eventos:conversas por tenant em tráfego real BR (dominam o modelo).
2. **Tarifas WhatsApp BR [B-M]:** puxar o rate card ao vivo da Meta (os números aqui são de terceiros).
3. **`count_tokens` em PT-BR real** + prompt de produção (os $ são ordem de grandeza).
4. **Modelo de pricing:** cota + overage vs tier-por-volume vs por-assento — cruza com a investigação de **billing/monetização** (a fazer).
5. **Custo de analytics** (DO writes, Queue ops, rollups) — somar ao COGS (liga em [metricas-atribuicao](metricas-atribuicao.md) §11).
6. **Encoder onde roda** (Workers AI vs externo) e seu custo/latência reais (liga em classificacao §12).

---

## 11. Fontes

> Preços unitários reaproveitados das investigações anteriores (já verificados); tarifas WhatsApp BR e volumes são os pontos fracos — validar.

**Volume / benchmarks WhatsApp**
- <https://www.aurorainbox.com/en/2026/03/02/whatsapp-customer-service-statistics/> · <https://www.infobip.com/blog/whatsapp-statistics> · <https://hyperleap.ai/blog/whatsapp-business-statistics-2026>

**Pricing de concorrentes BR**
- Leadster — <https://leadster.com.br/preco/> · Manychat — <https://manychat.com/pricing> · <https://www.portalinsights.com.br/perguntas-frequentes/quanto-custa-o-manychat-por-mes>
- SleekFlow — <https://sleekflow.io/pt-br/blog/quanto-custa-um-chatbot-para-whatsapp> · Blip — <https://www.blip.ai/blip-go/> · RD Conversas — <https://www.rdstation.com/planos/conversas/b/> · Zenvia — <https://zenvia.com/en/prices/>

**Preços unitários (docs internos já verificados)**
- [classificacao-eventos.md](classificacao-eventos.md) §8 (custo classify), [whatsapp.md](whatsapp.md) §8 (pricing, in-window grátis), [graphrag-noderag.md](graphrag-noderag.md) §6 (extração/geração), [orquestracao-agente.md](orquestracao-agente.md) (DO/Queue), [concorrentes.md](concorrentes.md) (preços BR).
- WhatsApp pricing oficial — <https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing/>
