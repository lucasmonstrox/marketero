---
tipo: investigacao
status: estável
updated: 2026-06-22
description: APIs dos marketplaces de venda BR (Mercado Livre, Mercado Pago, OLX) sob a lente evento→classificação→ação; ML é canal completo, MP é sinal de conversão, OLX é canal de integrador vertical.
---

# Marketplaces de venda — Mercado Livre · Mercado Pago · OLX

> Investigação das APIs dos **marketplaces de venda** do pilar #4 da [visao-geral.md](../produto/visao-geral.md) ("Integrações de venda"), na lente do modelo **evento → classificação → ação** e da ingestão de dados de venda no grafo de conhecimento. Cobre **Mercado Livre**, **Mercado Pago** e **OLX Brasil** — os três marketplaces BR/LATAM listados que ainda não tinham arquivo. **Facebook Marketplace** e **TikTok Shop** já estão investigados em [facebook.md](facebook.md) e [tiktok.md](tiktok.md); **lojas próprias** (e-commerce/Nuvemshop/VTEX) ficam fora do escopo aqui.
>
> Pesquisa multi-fonte (≈80 fontes oficiais; portais de desenvolvedor `developers.mercadolivre.com.br`, `mercadopago.com.br/developers`, `developers.olx.com.br`) com verificação adversarial. **Ressalva de validação:** docs de marketplace mudam rápido, vários portais bloqueiam fetch automatizado (403/anti-bot), e limites de taxa/preços frequentemente **não são publicados**. Os claims abaixo trazem **confiança (alta/média/baixa)** e foram extraídos das fontes oficiais correntes — **reconfirme nos consoles logados antes de implementar**.
>
> **Resumo da decisão.** Os três não são a mesma coisa e **não devem compartilhar o mesmo adapter mental**:
> - **Mercado Livre = canal completo evento→ação** ⭐ — webhooks por tópico (backbone), **Perguntas** (melhor superfície de automação), Mensagens pós-venda (viável mas adversarial à automação), pedidos/itens/estoque/reputação, envios e claims. Maior valor; maior esforço.
> - **Mercado Pago = sinal de conversão, NÃO marketplace** ⭐ — o ouro é o **feed de webhooks de pagamento** (`approved`/`refunded`/`charged_back`/assinatura) que fecha o ciclo conteúdo→conversa→**conversão** no grafo. Alto valor, esforço médio.
> - **OLX Brasil = canal de integrador vertical** ⚠️ — ao contrário da hipótese inicial, **tem API oficial** (autoupload + Leads + **Chat bidirecional**), mas gated por homologação por e-mail, planos Empresa e verticais Autos/Imóveis/Peças. Viável como evento→ação para esse segmento; sem API de pagamento/entrega.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — três bichos diferentes](#2-enquadramento--três-bichos-diferentes)
3. [Mercado Livre](#3-mercado-livre)
4. [Mercado Pago](#4-mercado-pago)
5. [OLX Brasil](#5-olx-brasil)
6. [Como encaixa no modelo evento→classificação→ação](#6-como-encaixa-no-modelo-eventoclassificaçãoação)
7. [Recomendação para o Marketero](#7-recomendação-para-o-marketero)
8. [Mitos refutados](#8-mitos-refutados)
9. [Perguntas em aberto](#9-perguntas-em-aberto)
10. [Fontes](#10-fontes)

---

## 1. Sumário executivo

| Plataforma | Papel p/ o Marketero | Superfície conversacional (inbox) | Sinal de venda p/ o grafo | Acesso | Veredito |
|---|---|---|---|---|---|
| **Mercado Livre** | Canal completo evento→ação | **Perguntas** (pré-venda) ⭐ + Mensagens pós-venda ⚠️ | Pedidos, itens, estoque, reputação, envios, claims | OAuth (1 app, N sellers); sem gate de aprovação | ⭐ **Prioridade primária** |
| **Mercado Pago** | Sinal de **conversão** (não é marketplace) | — (sem inbox) | Webhook de pagamento aprovado/estornado/chargeback + assinaturas | OAuth multi-seller (split-payments) | ⭐ **Prioridade primária** (conversão/métricas) |
| **OLX Brasil** | Canal de integrador **vertical** (Autos/Imóveis/Peças) | **Chat bidirecional** (webhook + REST) + Leads | Anúncios (autoupload); **sem** API de pagamento/entrega | OAuth + **homologação por e-mail** + plano Empresa | ⚠️ **Fase 2** (gated, vertical) |

**Padrão arquitetural comum aos três:** OAuth por seller (multi-tenant), **webhooks como fonte de eventos** com **ACK rápido + processamento assíncrono** (hidratar o recurso fora de banda), e **idempotência** (entrega at-least-once → dedupe por id). Ver §6.

---

## 2. Enquadramento — três bichos diferentes

O erro a evitar é tratar "marketplaces de venda" como um adapter único. A pesquisa mostra três naturezas distintas:

- **Mercado Livre** é o único que é, de fato, um **marketplace conversacional + transacional** com APIs ricas para todo o ciclo (pergunta de pré-venda → pedido → envio → pós-venda → reclamação). É onde o modelo evento→ação tem mais terreno.
- **Mercado Pago** é um **processador de pagamentos**, não um marketplace de anúncios. Para o Marketero, seu valor não é "vender no MP" — é capturar o **evento de conversão** (pagamento aprovado, assinatura cobrada, estorno) e injetá-lo no grafo, fechando o ciclo conteúdo→conversa→conversão e alimentando as métricas unificadas. A camada "marketplace/split-payments" do MP só importa como **mecanismo de conexão multi-tenant** (OAuth em nome de outros sellers), não como produto.
- **OLX Brasil** é um **canal de classificados com programa de integrador**, restrito a verticais de negócio (Autos, Imóveis, Peças) e a planos Empresa. Tem chat e leads via API — então **é** um canal evento→ação — mas com gating operacional alto.

> **Por que isso importa para o design:** ML e OLX alimentam o **inbox unificado** e o pipeline evento→ação; MP alimenta o **eixo de conversão/métricas**. São integrações com objetivos diferentes no mesmo grafo.

---

## 3. Mercado Livre

**Plataforma:** DevCenter em `developers.mercadolivre.com.br` (BR usa `mercado**livre**` com "v"; países hispânicos usam `mercado**libre**`). Host de API uniforme: `api.mercadolibre.com`. Site ID do Brasil: **MLB**.

### 3.1. Acesso & OAuth

| Item | Valor | Conf. |
|---|---|---|
| App → `client_id` (App ID) + `client_secret` | DevCenter → "Criar uma aplicação" | alta |
| OAuth 2.0 Authorization Code | Auth BR: `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=…&redirect_uri=…` | alta |
| Token endpoint (global) | `POST https://api.mercadolibre.com/oauth/token` | alta |
| **Access token TTL** | **6 horas** (`expires_in: 21600`) | alta |
| **Refresh token TTL** | **6 meses**, **single-use/rotativo** (cada troca devolve um novo; só o último vale) — requer `scope=offline_access` | alta |
| **Invalidação por inatividade** | Sem nenhuma chamada em **4 meses** → credenciais invalidadas | alta |
| PKCE | Opcional (toggle por app), S256 | alta |
| Escopos | `read`, `write`, `offline_access` (grosso; gating fino via "Permissões funcionais") | alta |
| Limite de app por conta (BR) | **1 app por conta** após validação de dados do titular | alta |
| Sem gate de aprovação pré-lançamento | Nenhum gate documentado entre criar app e chamar API; usuário precisa autenticar como **admin/owner** da conta (operadores → `invalid_operator_user_id`) | média (ausência) |

> **Para o multi-tenant:** o limite de "1 app por conta" **não** obriga 1 app por seller — você opera **um** app e cada seller **autoriza-o via OAuth**, gerando um refresh token por seller. O `refresh_token` rotativo exige **persistir sempre o novo** (mesmo cuidado já anotado para o TikTok em [tiktok.md](tiktok.md)).

### 3.2. Webhooks/Notificações — o backbone ⭐

A fonte de eventos mais forte do ML. Callback URL por app + assinatura de tópicos no DevCenter; ML faz POST e espera **ACK 200**.

| Aspecto | Valor | Conf. |
|---|---|---|
| **SLA de ACK** | responder **200 em ≤500 ms** ou o tópico é desativado | alta |
| Retry | até **8 tentativas em ~1h**, backoff exponencial; depois "perdido" | alta |
| **Recuperação de feed perdido** | `GET /missed_feeds?app_id=$APP_ID` (+ `topic`,`limit`,`offset`); também `/myfeeds` | alta |
| Payload | `{_id, resource, user_id, topic, application_id, attempts, sent, received}` (só o `resource`, sem o objeto) | alta |

**Tópicos confirmados:** `orders_v2`, `items`, `questions`, `messages`, `payments`, `shipments`, `claims`, variantes marketplace/CBT (`marketplace_orders`, `marketplace_messages`…), e especializados (`flex`, `invoices`, `public_offers`…). ⚠️ `quotations` em **depreciação (2026-06-15)**. Strings exatas de `stock_locations`/`price_suggestion` não verbatim-confirmadas — conferir no seletor de tópicos do app.

> **Constraint de design crítico:** o SLA de **500 ms** força **ack-first / process-async** — persistir o `resource`, devolver 200, e **hidratar** o objeto fora de banda (GET autenticado). Rodar uma varredura periódica de `/missed_feeds` como rede de segurança.

### 3.3. Perguntas (pré-venda) — melhor superfície de automação ⭐

Q&A público nos anúncios. **A superfície conversacional mais limpa do ML para o loop classificar→responder.**

| Capacidade | Endpoint | Conf. |
|---|---|---|
| Buscar perguntas | `GET /questions/search?item_id=` ou `?seller_id=` (`api_version=4`) | alta |
| Perguntas recebidas | `GET /my/received_questions/search` | alta |
| Pergunta única (retorna **email/telefone/nome** do comprador) | `GET /questions/{id}` | alta |
| **Responder** | `POST /answers` `{question_id, text}` | alta |
| Blacklist de comprador | `GET/POST /users/{seller_id}/questions_blacklist`, `DELETE …/{user_id}` | alta |
| Webhook | tópico **`questions`** (perguntada ou respondida) | alta |
| Moderação da resposta | status `BANNED`/`UNDER_REVIEW`/`DISABLED` existe, mas blocklist **não** publicada explicitamente (ao contrário de Mensagens) | baixa ⚠️ |
| SLA de tempo de resposta | **não confirmado** (existe status `CLOSED_UNANSWERED`) | baixa ⚠️ |

**Veredito:** fértil e limpo. Read + answer via API, webhook dedicado e até um primitivo de **blacklist** (auto-tag/bloqueio de abusivos). É onde o loop AI classify→reply é **mais defensável**, por ser genuinamente pré-venda e menos gated que o pós-venda. Assumir as normas de "sem dados de contato/link externo" mesmo sem blocklist publicada, e tratar status `BANNED`.

### 3.4. Mensagens (pós-venda) — viável, mas adversarial à automação ⚠️

Mensageria comprador↔seller atrelada a um pedido (`pack`).

| Capacidade | Endpoint / regra | Conf. |
|---|---|---|
| Ler conversa | `GET /messages/packs/{pack_id}/sellers/{user_id}` | alta |
| Enviar | `POST /messages/packs/{pack_id}/sellers/{user_id}?tag=post_sale` | alta |
| Anexos | `POST /messages/attachments` — 25 MB, JPG/PNG/PDF/TXT, 25/msg | alta |
| **Seller-initiated exige "motivo"** | `GET /messages/action_guide/packs/{pack_id}` → opções fixas (`REQUEST_VARIANTS`, `SEND_INVOICE_LINK`, `DELIVERY_PROMISE`, `OTHER`…). Comprador inicia livremente | alta |
| Cota de envio restante | `GET …/action_guide/packs/{pack_id}/caps_available` (`cap_available: 0` = bloqueado) | alta |
| Webhook | tópico **`messages`** (`created`, `read`) | alta |
| Limite de tamanho (seller) | **350 chars** (comprador 3500) | alta |
| Janela de resposta | só **< 30 dias** desde a última mensagem; expiração dura aos **18 meses** | alta |
| Gates de bloqueio | `blocked_by_fulfillment` (Full só após `delivered`), `blocked_by_payment`, `blocked_by_mediation`, `blocked_by_claim_*` | alta |
| **Rate limit** | **500 rpm GET / 500 rpm POST-PUT** (pools separados) — *único número oficial confirmado do ML* | alta |

**⚠️ Dois riscos estruturais para um inbox de IA no pós-venda:**

1. **Flag de moderação `AUTOMATIC_MESSAGE`** — o ML modera/bloqueia explicitamente "mensagem automática de integrador". Respostas automáticas no pós-venda podem ser **silenciosamente rejeitadas** (`moderation_status: rejected`). É a maior restrição ao loop evento→ação em Mensagens. (Outras reasons: `SOCIAL_NETWORK_LINK`, `PERSONAL_DATA`, `EVASION_CLAIM_SELLER`.)
2. **Intermediação por IA do próprio ML (desde 2 fev 2026, MLB+MLC, Full primeiro)** — o ML está inserindo **seu próprio agente de IA** na mensageria seller↔comprador, com novos substatus (`blocked_by_ai_assistant`, `blocked_by_ai_assistant_expired`). Sem novos endpoints públicos, mas a mensageria real em MLB Full pode passar a ser conduzida pelo agente do ML, **não** pelo seu. (Conf. média — changelog + substatus visíveis.) **Ameaça direta à proposta de valor de mensageria pós-venda no MLB Full — rastrear.**

**Veredito:** canal real de read/send com webhook, mas **funil de motivo/template fixo, cap de 350 chars, gates pesados e moderação anti-automação**. Modelar como **resposta sugerida com humano no loop**, não envio autônomo — sobretudo no MLB Full.

### 3.5. Pedidos / Itens / Estoque / Reputação — leitura para o grafo

| Capacidade | Endpoint | Conf. |
|---|---|---|
| Buscar/ler pedidos | `GET /orders/search?seller=$ID&order.status=paid` · `GET /orders/{id}` (buyer, order_items, payments, total_amount, status) | alta |
| Status de pedido | `confirmed`, `payment_in_process`, `partially_paid`, `paid`, `cancelled` | alta |
| Itens/catálogo | `POST/GET/PUT /items/{id}`; variações (resend `id`s ou são apagadas); `catalog_product_id` | alta |
| Estoque | `available_quantity` (PUT) · `GET /user-products/{id}/stock` · `GET /inventories/{id}/stock/fulfillment` | alta |
| Reputação + métricas | `GET /users/{id}` → `seller_reputation` (`level_id` ex. `5_green`, `power_seller_status`) e `metrics` (`sales` 60d, `claims`, `cancellations`) | alta |
| **Endpoint de analytics de vendas agregado** | **não existe** — derive de `/orders/search` + `metrics.sales` (contador rolante de 60d) | baixa ⚠️ |

**Veredito (grafo):** leitura forte de pedidos/itens/estoque/reputação. **Gap:** sem endpoint de analytics agregado — o Marketero **computa as métricas** a partir dos pedidos crus.

### 3.6. Envios (Mercado Envios) & Claims/Devoluções — muito férteis para classificar ⭐

| Capacidade | Endpoint / tópico | Conf. |
|---|---|---|
| Envio | `GET /shipments/{id}` (status `ready_to_ship`→`shipped`→`delivered`/`not_delivered`); `/history`; webhook `shipments`; Flex = `self_service` | alta |
| Claims (base atual; legado `/v1/claims/` depreciado 2024) | `GET /post-purchase/v1/claims/search` · `/claims/{id}` | alta |
| Mensagens de claim | `GET/POST /post-purchase/v1/claims/{id}/messages` (anexos 5 MB) | alta |
| Escalar p/ mediação | `PUT …/claims/{id}` `{stage: "dispute"}` → depois só `receiver_role: mediator` | alta |
| Resoluções esperadas / reembolso parcial | `GET …/{id}/expected_resolutions` | alta |
| **Label de impacto na reputação** | `labels: [{name: reputation, value: avoid}]` (machine-readable) | alta |
| Webhook | tópico **`claims`** (AR/BR/MX — BR ✓); `resource` aponta legado, mas consulte `/post-purchase/v1/…` | alta |

**Veredito:** terreno **muito fértil** para classify→route/escalate — `not_delivered` → escalar; novo `claims` → triar + resposta sugerida; `delayed_handling_time` subindo → alerta. O claims expõe **label de impacto na reputação** e **lista de ações** (`send_message_to_*`, `refund`, `allow_return`, `allow_partial_refund`), ideal para a IA mapear classificação → ação concreta.

### 3.7. Rate limits, política de automação & PII

- **Rate limits — cético:** `429`/`local_rate_limited` existe (por **Client ID + endpoint**), mas **não há cap numérico global publicado** (FAQ oficial declina; recomenda backoff + pedir aumento via canal comercial). O "**1500 req/min por seller**" e "**100 req/min em order search**" amplamente citados **não são confirmados** — tratar como **mito** (ver §8). Único número oficial: mensageria **500 rpm**.
- **Política (T&C do desenvolvedor):** proíbe scraping/robôs (§7.6), exceder volume "razoável" (§7.8), burlar rate-limit (§7.5). **Sem proibição contratual explícita de "resposta automatizada"** e **sem exigência de disclosure bot/humano** — o governo real é **técnico** (a flag `AUTOMATIC_MESSAGE`).
- **PII/LGPD:** developer é **operador** sob instruções do seller (controlador); vinculado à LGPD (§1.8); **proibido armazenar** dados de cartão/CVV/RG/CPF (§7.9, PCI-DSS); dados não-públicos só com autorização expressa (§5.2). `GET /questions/{id}` retorna email/telefone do comprador — exceção a verificar para o caminho de pré-venda.

---

## 4. Mercado Pago

**Enquadramento (ler primeiro):** para o Marketero, **MP = integração de processador de pagamentos / evento de conversão, NÃO marketplace**. O valor é o **feed de webhooks** (`payment.approved`/`refunded`/`charged_back`, assinatura cobrada, `merchant_order` fechada). A maquinaria "marketplace/split-payments" (OAuth em nome de outros sellers) é o **mecanismo de conexão** multi-tenant, não o produto — split de comissão só importaria se o Marketero tomasse um corte das transações (fora de escopo).

### 4.1. Acesso & OAuth multi-seller

| Item | Valor | Conf. |
|---|---|---|
| App no painel MP | "Suas integrações" → 1 app por solução | alta |
| Credenciais | **Public Key** (frontend, tokeniza cartão) + **Access Token** (backend, cria pagamento) + Client ID/Secret (OAuth) | alta |
| OAuth em nome de outros sellers | Auth Code: `https://auth.mercadopago.com/authorization?client_id=…&response_type=code&platform_id=mp&state=…&redirect_uri=…` (code vale **10 min**) | alta |
| Troca de token | `POST https://api.mercadopago.com/oauth/token` `{grant_type, client_id, client_secret, code, redirect_uri}` → `access_token`, `refresh_token`, `public_key`, `user_id`, `expires_in` | alta |
| **Token TTL** | **180 dias (6 meses)**; refresh via `grant_type=refresh_token` antes de expirar | alta |
| Lifecycle de conexão | tópico de webhook **`mp-connect`** (link/unlink de conta) | alta |

> **Para o grafo:** o `user_id` do OAuth é a **chave natural de tenant/merchant**. Um seller revogando acesso (`mp-connect`) é, ele mesmo, um sinal.

### 4.2. Pagamentos & Checkout (superfície de captura)

| Capacidade | Detalhe | Conf. |
|---|---|---|
| Checkout Pro (hospedado) | UI do MP; emite webhooks `payment` + `merchant_order` | alta |
| Checkout Transparente / **Bricks** (embutido) | UI custom; cartão via iframe MP (PCI-light); agora via "Orders" API | alta |
| Payment API direta | `POST /v1/payments` · `GET /v1/payments/{id}` | alta |
| **Pix** (Brasil) | suportado (QR/copia-e-cola) — método dominante no BR, **sinal de aprovação quase em tempo real** | alta |
| Cartão / Boleto | suportados em todos os checkouts | alta |
| Status de pagamento | `approved`, `pending`, `rejected`, `in_process`, `refunded`, `cancelled`, `charged_back` (webhook dispara em criação + mudança) | média |

> **Lente de conversão:** `payment.created → approved` é o **evento de conversão** central. Campos dignos do grafo: `status` + `status_detail` + `payment_method_id` (pix/card/boleto) + `transaction_amount`.

### 4.3. Webhooks/Notificações — o feed de conversão ⭐ (capacidade mais forte)

| Aspecto | Detalhe | Conf. |
|---|---|---|
| Mecanismo | POST p/ URLs Test + Prod; tópicos selecionados no painel; opcional `?cliente=` p/ taguear seller | alta |
| **Tópicos** | `payment`, `orders`, `merchant_order`, `subscription_preapproval`, `subscription_authorized_payment`, `mp-connect`, `wallet_connect`, `topic_chargebacks_wh`, `topic_claims_integration_wh` (reembolsos/disputas), `point_integration_wh` | alta |
| Payload | `{id, live_mode, type, action, date_created, user_id, data:{id}}` — **só o id do recurso** → exige GET p/ hidratar | alta |
| **Validação de assinatura** | header `x-signature` = `ts=…,v1=…`; manifesto de `data.id` + header `x-request-id` + `ts`; **HMAC-SHA256** com o secret do app; comparar a `v1`. SDKs oficiais implementam | alta |
| **Retry** | responder **200/201 em ~22 s**; falhas re-tentadas em escala (~imediato, 15min, 30min, 6h, 48h, 96h… até ~8) | alta |
| IPN (legado) | **em descontinuação** (não valida secret) → migrar p/ Webhooks | alta |

> **Constraint de design:** webhooks são **id-only** → o pipeline faz um **GET autenticado** (token do seller) para hidratar antes de ingerir. **Idempotência obrigatória** (at-least-once → dedupe por id+status).

### 4.4. Assinaturas & Merchant Orders

| Capacidade | Endpoint | Conf. |
|---|---|---|
| Planos/assinaturas | `preapproval_plan` (`auto_recurring`) · `POST /preapproval` (`status=authorized`) | alta |
| Eventos de assinatura | tópicos `subscription_preapproval`, `subscription_authorized_payment` (cada cobrança recorrente) | alta |
| Merchant Orders | `GET /merchant_orders/{id}` · `/search` (**só 90 dias**); status `opened`→`closed`→`expired` | alta |

> **Lente:** assinaturas = **eventos de receita recorrente** (sinal de MRR; churn quando `subscription_authorized_payment` falha). Merchant Order amarra múltiplos pagamentos a uma intenção comercial — útil para atribuição conteúdo→conversa→conversão. **Gotcha:** busca de merchant_order é janelada em 90 dias — para histórico, use relatórios.

### 4.5. Relatórios (reconciliação de métricas)

`POST /v1/account/settlement_report` (Account Money, CSV/XLSX, datas em **UTC**) e **Releases report** (dinheiro liberado: transferências, disputas, reembolsos, chargebacks). São **verdade financeira batch**, complementares aos webhooks em tempo real — bons para **reconciliação periódica** (conversões brutas vs. líquido liquidado), prioridade de MVP menor.

### 4.6. Relação com o Mercado Livre

- **Sistema de conta compartilhado: sim** — login do ML acessa "Suas integrações" do MP com o mesmo usuário/senha (alta).
- **Apps/registro: efetivamente separados, mesmo paradigma OAuth 2.0** — um app **não** está documentado como autorizando simultaneamente o marketplace ML *e* os pagamentos MP. Para venda no ML + pagamentos MP, são **dois apps OAuth distintos** apesar do login compartilhado (média — página do ML retornou 403 ao fetch; verificar criando app de teste).

### 4.7. Rate limits, PCI & LGPD

- **Rate limit numérico: NÃO publicado.** Relatos de `429` em campo, sem número oficial → backoff exponencial + jitter + idempotência + respeitar `Retry-After` (baixa conf.).
- **PCI:** iframe/Bricks tokeniza cartão/CVV direto nos servidores do MP — não toca seu backend (território SAQ-A).
- **LGPD:** webhooks são id-only (PII mínima no transporte), mas o objeto hidratado tem dados do pagador → **PII financeira**. Minimizar: guardar status/valor/método/timestamps/ids; tokens (180d) criptografados por tenant.

---

## 5. OLX Brasil

> **Correção da hipótese inicial:** a suposição de "plataforma fechada, só feed" estava **errada**. O OLX Brasil opera um programa de integrador oficial em **`developers.olx.com.br`** com **autoupload de anúncios, Leads API e Chat bidirecional**. **Mas** é gated: verticais de negócio (Autos/Imóveis/Peças), homologação por e-mail, planos Empresa.

### 5.1. Existe API? Sim, com gating

| Achado | Suportado | Conf. |
|---|---|---|
| Portal de integrador `developers.olx.com.br` (Anúncios, Leads, Chat, Destaque, Webhooks, histórico veicular) | **Sim** | alta |
| Acesso = app **OAuth 2.0** + **homologação por e-mail** (`suporteintegrador@olxbr.com`) → OLX emite `client_id`/`client_secret` | **Sim** | alta |
| Escopos | `basic_user_info`, `autoupload` (anúncio), `autoservice` (leads/webhook), `chat` | alta |
| Endpoints auth | `https://auth.olx.com.br/oauth` + `/oauth/token`; host de recurso `https://apps.olx.com.br` | alta |
| Prazos/contrato/custo publicados | **Não** (contatar comercial OLX) | alta (ausência) |

⚠️ **Não confundir três portais distintos:** `developers.olx.com.br` = **OLX Brasil** (classificados + autos — **o relevante**); `developers.grupozap.com` = stack imóveis Grupo OLX/Zap (Zap/Viva Real — separado); `developer.olxgroup.com`/`olx.pt` = OLX Group internacional (**não** é Brasil — não citar para BR).

### 5.2. Verticais / autoupload de anúncios

| Achado | Suportado | Conf. |
|---|---|---|
| Importação de anúncio via API (insert/edit/delete) | **Sim** | alta |
| **XML autoupload** — restrito a **Imóveis** (URL XML pública) | **Sim (só Imóveis)** | alta |
| **Autos** usa integração via API (manual "Autos 360"), não XML | **Sim** | média-alta |
| Gated a **planos Empresa** (Essencial/Plus/Premium); vendedor autônomo **não** integra | **Sim** | alta |
| Público: imobiliárias, concessionárias, estabelecimentos (precisam de site/CRM) | **Sim** | alta |

### 5.3. Chat bidirecional — o achado-chave para evento→ação ⭐

**O headline e é positivo:** OLX Brasil expõe chat bidirecional.

| Achado | Suportado / endpoint | Conf. |
|---|---|---|
| **Ler** mensagens do comprador via **webhook push** (não polling) | **Sim** — `chat/receive_message` | alta |
| Payload inbound | `message`, `listId` (anúncio), `name`/`email`/`phone` do comprador, `chatId`, `messageId`, `messageTimestamp`, `senderType`, `origin` | alta |
| **Enviar** resposta | `POST https://apps.olx.com.br/autoservice/v1/chat/send` (Bearer) `{textMessage, messageId, chatId}` | alta |
| Segurança do webhook | Bearer + IP de egresso OLX `54.162.151.93` (allowlist) | alta |

> **Loop core do Marketero é alcançável no OLX:** mensagem chega (webhook) → IA classifica → responde/sugere/escala (`chat/send`). **Caveat:** o seller é configurado para receber **leads por e-mail OU notificações de chat — não ambos** (mutuamente exclusivos); automação por chat exige a conta em modo "chat".

### 5.4. Leads, OLX Pay/Entrega, limites

| Achado | Suportado | Conf. |
|---|---|---|
| Leads API (contato com nome/email/telefone) — todas as categorias | **Sim** | alta |
| Leads **enriquecidos** (info detalhada) — **só Autos** | **Sim** | alta |
| Mecanismo exato de entrega de leads (webhook vs poll) | **Desconhecido** (`receive_lead` retornou 403) | média ⚠️ |
| API/webhook de **OLX Pay / Entrega OLX** (pagamento/entrega) | **Não / desconhecido** (portal lista só anúncios/leads/chat/destaque/webhooks) | média |
| **Rate limit** | **5.000 req/min por IP**; excedeu → **429 + bloqueio de 10 min** | alta |

> **Multi-tenant:** rate limit é **por IP** — relevante para o desenho de IPs de egresso/fila num SaaS multi-tenant.

**Veredito:** OLX Brasil = **canal completo evento→ação** (chat webhook + leads como eventos; `chat/send` + autoupload como ações) **para o segmento Autos/Imóveis/Peças**. Requisitos duros: virar integrador homologado, OAuth por seller, sellers em plano Empresa, lidar com o modo e-mail-vs-chat, respeitar 5k req/min por IP. **Sem** API de pagamento/entrega.

---

## 6. Como encaixa no modelo evento→classificação→ação

Mapa cross-platform dos eventos que alimentam o pipeline `evento → classificação (IA/GraphRAG) → ação`:

| Evento (origem) | Plataforma | Classificação típica | Ação possível |
|---|---|---|---|
| Pergunta no anúncio (`questions`) | ML | dúvida / intenção de compra / spam | responder · sugerir produto · blacklist · escalar |
| Mensagem pós-venda (`messages`) | ML | dúvida logística / reclamação | **sugerir resposta a humano** (cuidado `AUTOMATIC_MESSAGE`) |
| Mensagem de chat | OLX | lead quente / dúvida | responder (`chat/send`) · escalar |
| Novo lead | OLX | qualificação | rotear ao CRM · distribuir |
| Pedido pago (`orders_v2`) | ML | conversão | ingerir no grafo · métricas · pós-venda |
| **Pagamento aprovado** (`payment`) | **MP** | **conversão** (fecha conteúdo→conversa→venda) | ingerir no grafo · atribuição · métricas |
| Assinatura cobrada/falhou | MP | receita recorrente / churn | alertar · reativar |
| Envio `not_delivered` (`shipments`) | ML | problema de entrega | escalar · notificar comprador |
| Reclamação (`claims`) | ML | disputa (com label de reputação) | triar · resposta sugerida · oferecer reembolso |

**Arquitetura comum (os três compartilham o mesmo esqueleto):**

1. **OAuth por seller** — um app, N sellers autorizam; `user_id`/seller_id como chave de tenant no grafo; **persistir refresh tokens rotativos** (ML single-use; MP/OLX 180d/homologado).
2. **Webhooks ack-first / process-async** — ML exige ACK em **500 ms**, MP em **~22 s**; em todos, **devolver 200 e hidratar o recurso fora de banda** (ML/MP entregam só o id). Fila interna entre o ACK e o processamento.
3. **Idempotência + recuperação** — entrega at-least-once → **dedupe por id**; ML tem `/missed_feeds`, MP/OLX exigem reconciliação por relatório/poll.
4. **Validação de origem** — MP: HMAC-SHA256 `x-signature`; OLX: Bearer + allowlist de IP `54.162.151.93`; ML: por app/callback.
5. **Rate limits defensivos** — nenhum dos três publica cap global confiável (exceto ML messaging 500 rpm e OLX 5k/min/IP) → **backoff + jitter + fila**, não orçamento fixo.

---

## 7. Recomendação para o Marketero

**Prioridade de MVP (ordem):**

1. **Mercado Pago — feed de conversão** ⭐ (alto valor, esforço médio). OAuth multi-seller + webhooks (`payment`, `merchant_order`, `subscription_authorized_payment`) + GET de hidratação + validação `x-signature` + ingestão idempotente. É o que **fecha o ciclo conteúdo→conversa→conversão** e dá métricas reais — o diferencial de "cruzar venda + social + atendimento" da [visao-geral.md](../produto/visao-geral.md). Adiar relatórios (reconciliação) e split-payments.

2. **Mercado Livre — Perguntas + eventos** ⭐ (alto valor, esforço alto). Começar pela superfície **menos adversarial**: **Perguntas** (read/answer autônomo defensável) + ingestão de **pedidos/itens** + webhooks de **claims/shipments** (classify→escalate). **Mensagens pós-venda como resposta sugerida (humano no loop)**, nunca envio autônomo — pela flag `AUTOMATIC_MESSAGE` e pela intermediação por IA do próprio ML no MLB Full.

3. **OLX Brasil — Fase 2** ⚠️ (gated, vertical). Só vale se houver tração no segmento **Autos/Imóveis/Peças**. Exige virar **integrador homologado** (e-mail + contrato), sellers em **plano Empresa**, e tratar o modo **e-mail-vs-chat**. Quando entrar, o **Chat bidirecional** encaixa direto no inbox unificado.

**Fora de escopo aqui:** Facebook Marketplace ([facebook.md](facebook.md)) e TikTok Shop ([tiktok.md](tiktok.md)) já investigados; lojas próprias (Nuvemshop/VTEX/Shopify) são "e-commerce próprio", não marketplace — investigação separada.

---

## 8. Mitos refutados

A verificação adversarial **derrubou** estas afirmações — **não usar**:

- ❌ **"OLX Brasil é uma plataforma fechada, sem API (só feed XML)"** — **refutado.** Existe `developers.olx.com.br` com autoupload + Leads + **Chat bidirecional** (webhook de recebimento + REST de envio). O loop evento→ação **é** alcançável (gated por homologação/plano Empresa/verticais).
- ❌ **"Mercado Livre permite 1500 req/min por seller / 100 req/min em order search"** — **não confirmado** (forum/snippet de terceiros). O ML **não publica cap global**; o único número oficial é mensageria **500 rpm GET / 500 rpm POST-PUT**. Projetar para `429` com backoff, não para um orçamento conhecido.
- ❌ **"Um app único do Mercado autoriza ML (marketplace) e MP (pagamentos) ao mesmo tempo"** — **provavelmente falso** (conta compartilhada, mas apps OAuth separados; conf. média — confirmar com app de teste).
- ⚠️ **"Mensageria pós-venda do ML é canal de automação total"** — **parcialmente refutado.** Moderação `AUTOMATIC_MESSAGE` + intermediação por IA do próprio ML (MLB Full, fev/2026) tornam o envio autônomo arriscado; tratar como resposta sugerida.

---

## 9. Perguntas em aberto

1. **MP × ML — fronteira de app/OAuth:** um app autoriza ambos ou são dois? (página do ML deu 403 ao fetch — confirmar criando app de teste).
2. **ML — intermediação por IA no MLB Full:** quanto da mensageria pós-venda real será conduzida pelo agente do ML e não pelo integrador? Acompanhar o changelog (impacto direto na proposta de valor de atendimento no ML).
3. **ML — moderação de Perguntas:** existe blocklist/SLA de resposta? (subespecificado nas docs). Testar com respostas contendo link/telefone.
4. **OLX — contrato de integrador:** custo, SLA de homologação, e se o **Chat é realmente todas-as-categorias** ou gated a Autos/Imóveis; mecanismo exato de entrega de leads (webhook vs poll).
5. **OLX — multi-tenant por IP:** o rate limit de 5k/min **por IP** exige desenho de IPs de egresso/fila para escala — validar com OLX se há limite por app/seller.
6. **Rate limits reais (todos):** nenhum publica cap global confiável — instrumentar e medir 429 em produção/sandbox antes de prometer throughput.
7. **LGPD — PII de comprador no grafo:** ML/OLX entregam email/telefone do comprador (Perguntas, Chat). Definir política de minimização/retenção antes de ingerir no grafo (developer = operador do seller).

---

## 10. Fontes

> Preços, limites e versões mudam; reconfirmar nos portais logados. Vários domínios oficiais bloqueiam fetch automatizado (403) — conteúdo canônico extraído via render/busca.

**Mercado Livre**
- Autenticação/OAuth — <https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao> · <https://developers.mercadolivre.com.br/pt_br/crie-uma-aplicacao-no-mercado-livre>
- Perguntas — <https://developers.mercadolivre.com.br/pt_br/perguntas-e-respostas> · <https://developers.mercadolibre.com/en_us/questions>
- Mensagens pós-venda — <https://developers.mercadolivre.com.br/en_us/messaging-after-sale> · <https://developers.mercadolivre.com.br/pt_br/mensagens-bloqueadas> · <https://developers.mercadolivre.com.br/pt_br/motivos-para-se-comunicar>
- Notificações/webhooks — <https://developers.mercadolibre.com/en_us/products-receive-notifications>
- Pedidos/itens — <https://developers.mercadolibre.com/en_us/order-management> · <https://developers.mercadolibre.com.ar/en_us/manage-sales> · <https://developers.mercadolibre.com.ar/en_us/products-sync-listings>
- Reputação — <https://developers.mercadolibre.com/track-users-reputation/> · <https://developers.mercadolibre.com.ar/en_us/queries-about-the-user>
- Envios — <https://developers.mercadolibre.com/en_us/manage-shipping-mercado-envios> · <https://developers.mercadolibre.com/shipping-status-substatus/>
- Claims — <https://developers.mercadolibre.com.ar/en_us/working-with-claims> · <https://developers.mercadolibre.com.ar/en_us/ml-returns>
- Rate limit / T&C — <https://developers.mercadolibre.com.ar/en_us/rate-limit-429-error> · <https://developers.mercadolibre.com.ar/en_us/mercado-libre-developer-terms-and-conditions>

**Mercado Pago**
- Credenciais — <https://www.mercadopago.com.br/developers/en/docs/your-integrations/credentials>
- OAuth (split-payments) — <https://www.mercadopago.com.br/developers/en/docs/split-payments/additional-content/security/oauth/creation> · <https://www.mercadopago.com.br/developers/en/reference/authentication/oauth/_oauth_token/post>
- Webhooks — <https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks> · <https://www.mercadopago.com.br/developers/en/docs/checkout-pro/payment-notifications> · <https://www.mercadopago.com.pe/developers/en/news/2024/01/11/Webhooks-Notifications-Simulator-and-Secret-Signature>
- Checkout/Bricks/Pix — <https://www.mercadopago.com.br/developers/en/docs/checkout-bricks/overview> · <https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix> · <https://www.mercadopago.com.ar/developers/en/reference/payments/_payments/post>
- Assinaturas/Orders — <https://www.mercadopago.com.co/developers/en/docs/subscriptions/overview> · <https://www.mercadopago.com.ar/developers/en/reference/merchant_orders/_merchant_orders_id/get>
- Relatórios — <https://www.mercadopago.com.co/developers/en/reference/settlements-report/download-report/get> · <https://www.mercadopago.com.br/developers/en/docs/checkout-api-payments/additional-content/reports/released-money>
- PCI — <https://www.mercadopago.com.br/developers/en/docs/security/pci>

**OLX Brasil**
- Portal — <https://developers.olx.com.br/> · OAuth <https://developers.olx.com.br/anuncio/api/oauth.html>
- Anúncios/autoupload — <https://developers.olx.com.br/anuncio/api/import.html> · XML imóveis <https://developers.olx.com.br/anuncio/xml/real_estate/home.html>
- Chat — <https://developers.olx.com.br/chat/receive_message.html> · <https://developers.olx.com.br/chat/send_message.html>
- Leads/webhooks — <https://developers.olx.com.br/lead/home.html> · <https://developers.olx.com.br/webhooks/home.html>
- Rate limit — <https://developers.olx.com.br/faq/rate_limit.html>
- Integradores (ajuda) — <https://ajuda.olx.com.br/s/article/integradores-e-importacao-de-anuncios>
- Disambiguação (não-BR / imóveis) — <https://developers.grupozap.com/> · <https://developer.olxgroup.com/>
