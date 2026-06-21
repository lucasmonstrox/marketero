# TikTok — Investigacao de API para Automacao

> Pesquisa baseada exclusivamente na documentacao oficial do TikTok (`developers.tiktok.com`, `business-api.tiktok.com`, `partner.tiktokshop.com` e paginas legais em `tiktok.com/legal`) e em verificacoes adversariais sobre os pontos mais sensiveis (comentarios organicos, DMs, automacao de engajamento, restricao de postagem publica). Termos tecnicos mantidos em ingles conforme convencao da plataforma.
>
> **Resumo da decisao arquitetural**: o ecossistema TikTok e fragmentado em **tres portais e tres OAuth distintos** (Developers/open platform, API for Business/Ads, TikTok Shop Partner Center). Para o Marketero, o terreno fertil e (1) **publicacao organica** via Content Posting API (apos audit), (2) **remarketing pago completo** via Marketing API (Custom Audiences, Events API, Lead Gen), (3) **atendimento transacional** via TikTok Shop Customer Service API. As lacunas estruturais — **sem API para responder comentarios organicos, sem API de DM social, sem automacao de likes/follows/shares, e webhooks sociais minimos** — limitam fortemente o modelo evento->classificacao->acao no organico social puro.

---

## Indice

1. [Sumario executivo](#1-sumario-executivo)
2. [Ecossistema de APIs + Autenticacao](#2-ecossistema-de-apis--autenticacao)
3. [Content Posting API](#3-content-posting-api)
4. [Gestao de comentarios](#4-gestao-de-comentarios)
5. [Interacoes e metricas](#5-interacoes-e-metricas)
6. [Mensagens privadas / DMs](#6-mensagens-privadas--dms)
7. [TikTok Shop (commerce + mensageria)](#7-tiktok-shop-commerce--mensageria)
8. [Remarketing & Ads](#8-remarketing--ads)
9. [Webhooks & eventos](#9-webhooks--eventos)
10. [Rate limits / ToS / compliance / riscos](#10-rate-limits--tos--compliance--riscos)
11. [Mapeamento para o Marketero](#11-mapeamento-para-o-marketero)
12. [Riscos e recomendacoes](#12-riscos-e-recomendacoes)
13. [Fontes](#13-fontes)

---

## 1. Sumario executivo

| Capacidade | Suporte oficial | Produto/API | Scope/Acesso | Observacao |
|---|---|---|---|---|
| **Postar conteudo** (video/foto) | **Parcial** | Content Posting API (open platform) | `video.publish` (Direct Post) / `video.upload` (draft); OAuth do criador | Funciona, mas **clientes nao auditados so postam `SELF_ONLY`** (privado). Publico exige **audit** do app (2–4 semanas). |
| **Responder comentarios organicos** | **Nao** | — | Inexistente | Nenhum endpoint oficial de escrita de comentario (organico ou ad). Verificacao adversarial confirmou: nao ha doc oficial que suporte. |
| **Responder comentarios de anuncios** | **Sim** | Marketing API (`/comment/*`) | Token de Advertiser (OAuth Business) + allowlist do app | Listar, responder, ocultar (hide/unhide), deletar, blocked words. **PIN nao tem API** (so na UI do Ads Manager). |
| **Ler metricas/insights** | **Sim** | Display API; Organic/Accounts API (Business) | `video.list`, `user.info.basic`, `user.info.stats`; onboarding Business p/ insights ricos | So do **usuario que autorizou** (nao de terceiros). FYP/algoritmo nao exposto. |
| **Interacoes / likes / follows / shares** | **Nao** | — | Inexistente / contra ToS | Nenhum scope `like`/`follow`/`share`. Verificacao adversarial confirmou. Automacao = violacao de ToS. |
| **DMs criador / pessoal** | **Nao** | — (Data Portability so exporta) | `portability.directmessages.*` (so export, read-only, EEA/UK) | Sem API de envio/recebimento de DM social. Business Messaging existe so atrelado a Ads/IM, fora de US/UK/EU (reportado). |
| **Mensageria TikTok Shop** | **Sim** | TikTok Shop Customer Service / IM API | Modulo "Customer Service" no app + OAuth da loja | Comprador<->loja apenas. **Outbound restrito** (regra 30/60 dias ou historico de retorno). |
| **Remarketing / Custom Audiences** | **Sim** | Marketing API (Audience Management, Events API, Lead Gen) | Audience Management + allowlist por feature + OAuth do anunciante | Customer File, Engagement, App, Website, Lookalike. PII hasheada SHA-256; leads retidos so 90 dias. |
| **Webhooks** | **Parcial** | Developer Webhooks (open platform) + TikTok Shop Webhooks | Por produto/modulo habilitado | Open platform: so 4 eventos (sem comentario/like/follow/DM). Shop: pedidos, produtos, devolucoes, mensagens. |

---

## 2. Ecossistema de APIs + Autenticacao

Existem **tres portais de desenvolvedor distintos e separados**, com cadastros, apps e OAuth diferentes. Confundi-los e o erro mais comum de arquitetura.

| Portal | Dominio | Cobre |
|---|---|---|
| **TikTok for Developers** (open platform) | `developers.tiktok.com` | Login Kit, Display API, Content Posting API, Webhooks, Research API, Commercial Content API, Data Portability |
| **TikTok API for Business** | `business-api.tiktok.com` | Marketing API (Ads), Organic/Accounts API, Business Messaging API |
| **TikTok Shop Partner Center** | `partner.tiktokshop.com` | TikTok Shop Open API (commerce + Customer Service), ecossistema proprio de e-commerce |

### 2.1. OAuth da open platform (Login Kit)

- **Login Kit** e a porta de entrada OAuth 2.0; emite os tokens usados por Display API e Content Posting API. Web, Desktop, iOS, Android e QR Code.
- `client_key`/`client_secret` gerados ao criar o app. Authorization code flow com `redirect_uri`; **PKCE (`code_verifier`) obrigatorio apenas para mobile e desktop**.
- Token endpoint: `https://open.tiktokapis.com/v2/oauth/token/` (`grant_type=authorization_code`; refresh via `grant_type=refresh_token`). **O `refresh_token` retornado pode mudar — sempre persistir o novo se diferente.**
- Revogacao: `https://open.tiktokapis.com/v2/oauth/revoke/`.
- **Validade**: access token **24h (86400s)**; refresh token **365 dias (31.536.000s)**. Tokens devem ser geridos **server-side**.
- O scope `user.info.basic` e adicionado por padrao a todo app com Login Kit.

### 2.2. OAuth da API for Business (diferente da open platform)

- Token endpoint: `https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/`.
- Fluxo de "advertiser authorization URL" -> redirect com `auth_code` -> troca por access/refresh token vinculado a `advertiser_id`(s). **Nao ha API keys estaticas** para uso geral.
- Requer app no Business portal + onboarding no **Business Center**; verificacao de negocio e auditoria de seguranca para maior volume. Aprovacao reportada em ~2–3 dias uteis.
- SDK oficial: `github.com/tiktok/tiktok-business-api-sdk`.

### 2.3. OAuth do TikTok Shop (terceiro fluxo)

- OAuth 2.0 proprio; credenciais `app_key`/`app_secret`; troca de `auth_code` por `access_token`/`refresh_token` da loja autorizada. Namespace atual: **202309**.
- Apps **Public** (App Store, varios sellers) ou **Custom** (loja propria); ambos com mesmo OAuth e mesmo nivel de acesso. Permissoes concedidas **por modulo de API** selecionado no app (Order, Product, Customer Service, etc.), nao por lista granular de strings.

### 2.4. Criacao de app, Sandbox e Review (open platform)

- Cadastro em `developers.tiktok.com` -> registrar app -> `client_key`/`client_secret`.
- **Sandbox**: opcao "Add a Sandbox" para testar antes de producao.
- **App Review/Audit**: processo formal (funcionalidade, design, content-sharing guidelines, compliance). Necessario para liberar scopes sensiveis e remover restricoes (ex.: postagem publica na Content Posting API).

### 2.5. Produtos restritos (allowlist/parceria)

- **Research API**: read-only de dados publicos (videos, user info, comentarios, seguidores), so para **academicos/non-profit aprovados** em paises elegiveis (inclui Brasil, foco em seguranca de menores). Criadores/anunciantes **nao** elegiveis. Scopes `research.data.*`, `research.adlib.basic`.
- **Commercial Content API**: ad library da UE, allowlist de pesquisa, dados so de paises UE/EEA. Auth por **client access token** (client credentials).
- **Data Portability API**: export dos proprios dados do usuario (DSA/GDPR), aprovacao especial. Scopes `portability.*`. **Unico caminho oficial relacionado a DMs — e mesmo assim so export.**

---

## 3. Content Posting API

**API oficial: SIM. Na pratica PARCIAL** — exige aplicacao e audit para postagem publica. `open.tiktokapis.com`, OpenAPI v2. Suporta video e photo mode.

### 3.1. Direct Post vs Upload (draft) — endpoints e scopes

| Modo | Endpoint (video) | Scope | Comportamento |
|---|---|---|---|
| **Direct Post** | `POST /v2/post/publish/video/init/` | `video.publish` | Publica direto no perfil; app define caption, privacidade, toggles. Automacao completa. |
| **Upload (Inbox/Draft)** | `POST /v2/post/publish/inbox/video/init/` | `video.upload` | Envia ao inbox/rascunho; **o usuario precisa clicar na notificacao e finalizar dentro do app**. Nao publica sozinho — passo manual **nao contornavel**. |

- **Photo mode**: endpoint unificado `POST /v2/post/publish/content/init/` com `media_type: "PHOTO"` e `post_mode: "DIRECT_POST"` ou `"MEDIA_UPLOAD"`. Scope `video.publish` (direct) ou `video.upload` (draft), apesar do nome "video.*".
- **Status**: `POST /v2/post/publish/status/fetch/`. Estados: `PROCESSING_UPLOAD`, `PROCESSING_DOWNLOAD`, `SEND_TO_USER_INBOX`, `PUBLISH_COMPLETE`, `FAILED`. Posts publicos passam por moderacao antes de retornar `post_id`.

### 3.2. Restricao "self-only" / unaudited (CRITICO)

Verificacao adversarial confirmada: **clientes nao auditados sao forcados a `SELF_ONLY`** (privado). Tentar postar publico retorna `unaudited_client_can_only_post_to_private_accounts`.

- Pre-audit: ate **5 usuarios postando numa janela de 24h**; todas as contas usadas devem estar **privadas no momento do post**.
- `privacy_level` aceita `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `FOLLOWER_OF_CREATOR`, `SELF_ONLY` — mas **so `SELF_ONLY` funciona enquanto unaudited**.
- **Apos a auditoria** (audit/allowlisting, ~2–4 semanas, varias rodadas): a restricao de visibilidade e levantada e libera-se `PUBLIC_TO_EVERYONE`.
- Requisitos verificados na auditoria: exibir **username + avatar do criador antes de cada post**; permitir selecao de nivel de privacidade; **proibido** injetar logo/marca d'agua/texto promocional via app.

### 3.3. Fontes de midia e verificacao de dominio

- `FILE_UPLOAD`: upload binario em chunks via `PUT` no `upload_url` (valido ~1h). Nao precisa de dominio verificado.
- `PULL_FROM_URL`: TikTok puxa de uma URL sua — **exige verificacao de dominio/URL-prefix** antes; URLs HTTPS, publicas, **sem redirects**. **Fotos so suportam PULL_FROM_URL** (sem FILE_UPLOAD).

### 3.4. Limites de midia (Media Transfer Guide — reconfirmar antes de implementar)

- **Video**: max **4 GB**, ate **10 min** via endpoint; MP4 (rec.)/MOV/WebM; H.264 (rec.)/H.265/VP8/VP9; 360–4096px; 23–60 FPS. Chunk min 5 MB / max 64 MB (ultimo ate 128 MB), 1–1000 chunks; `total_chunk_count = floor(video_size / chunk_size)`.
- **Foto**: JPEG/WebP, max **20 MB/imagem**, ate 1080p, ate **35 imagens**/post; `photo_cover_index` (base-0).
- **Caption**: video ate 2200 runes UTF-16; foto title 90 runes, description 4000 runes. Toggles: `disable_duet`, `disable_stitch`, `disable_comment`, `brand_content_toggle`, `brand_organic_toggle`, `is_aigc`.

### 3.5. Rate limits

- `init` (Direct Post / Upload / Photo): **6 req/min por user access_token**.
- `status/fetch`: **30 req/min por user access_token**.

### 3.6. O que NAO e possivel

- Publicar publico sem passar pelo audit. Bypass do passo manual no modo Upload/Inbox. FILE_UPLOAD para fotos. A API **nao cobre** likes, follows, comentarios ou DMs.

---

## 4. Gestao de comentarios

### 4.1. Comentarios em ANUNCIOS (Marketing/Business API) — OFICIAL e CONFIRMADO

Cobertura oficial completa, restrita a comentarios gerados em **anuncios** (inclui Spark Ads que promovem posts organicos). Base `https://business-api.tiktok.com/open_api/v1.3`:

- `GET /comment/list/` — listar comentarios dos seus ads
- `POST /comment/post/` — responder
- `POST /comment/status/update/` — hide/unhide
- `POST /comment/delete/` — deletar
- `GET /comment/reference/` — comentarios relacionados
- `POST /comment/task/create/` + `GET /comment/task/check/` — exportacao assincrona
- 7 endpoints `blockedword/*` — palavras bloqueadas

- **Acesso**: app aprovado na Marketing API + autorizacao do anunciante (token de Advertiser via OAuth Business). Nao ha scope granular nomeado publicamente para comentarios — o acesso vem da autorizacao de anunciante (**verificar / nao confirmado** a granularidade exata).
- **PIN**: NAO ha endpoint de API. Fixar/like/block de comentario so manualmente no **TikTok Ads Manager**.
- **Sem webhook de novo comentario** — exige **polling** de `/comment/list/`.

### 4.2. Comentarios em POSTS ORGANICOS — sem API publica de moderacao

**Veredito da verificacao adversarial: NAO existe API oficial publica para responder/criar comentarios em posts organicos.** Nenhum produto da open platform expoe endpoint de escrita de comentario.

- Login Kit / Display API: **nenhum** scope nem endpoint de comentarios (`comment.list`/`comment.create` nao existem).
- Content Posting API: unico controle e o flag `disable_comment`/`allow_comment` **no momento da publicacao** — sem moderacao posterior.
- **Excecao (so leitura, allowlist):** Research API `POST https://open.tiktokapis.com/v2/research/video/comment/list/` retorna comentarios (read-only). Scope `research.data.basic`. So pesquisadores academicos aprovados, paises elegiveis. A propria doc confirma: *"no capabilities to reply to or create comments"*. **Nao serve para gestao de marca/automacao comercial.**

> **Zona cinzenta / nao confirmado**: fontes nao-oficiais citam uma "Organic API" (Accounts, Mentions, TikTok One, Discovery, Spark Ads) cuja **Accounts API** permitiria "gerenciar comentarios" de Business Accounts sobre o **conteudo proprio**. Isso **nao foi confirmado** na doc oficial (portal renderizado em JS) e outras fontes contradizem. **Acao decisiva**: validar logado em `business-api.tiktok.com/portal/docs` se a Accounts/Organic API expoe `comment/*` para posts organicos de Business Accounts e quais scopes/allowlist exige. E o item de maior impacto e maior incerteza.

---

## 5. Interacoes e metricas

### 5.1. Interacoes ativas (like/follow/share/comment em terceiros) — NAO

**Veredito da verificacao adversarial: NAO existe API oficial.** Nenhum scope `like`, `follow`, `share` ou `comment` em nome do usuario. A lista oficial de scopes so contem leitura de perfil/estatisticas/lista de videos e publicacao do proprio conteudo.

- Automatizar engajamento (bots de like/follow/comment) e **expressamente proibido** pelas Community Guidelines e ToS ("engajamento falso/inautentico"). Qualquer implementacao dependeria de UI automation/scraping — violacao direta, risco de ban. **Nao incluir no produto.**

### 5.2. Leitura de metricas — Display API (read-only, do usuario que autorizou)

- `POST /v2/video/query/` (ate **20 video IDs**/request), `POST /v2/video/list/`, `GET/POST /v2/user/info/`.
- Campos: `id, create_time, cover_image_url, share_url, video_description, duration, height, width, title, embed_html, embed_link, like_count, comment_count, share_count, view_count`.
- Scopes: `video.list`, `user.info.basic`; `user.info.stats` (likes/follower/following/video counts); `user.info.profile` (bio, `is_verified`). Scopes sensiveis exigem review.
- So funciona para o **usuario que autorizou** — nao da metricas de contas arbitrarias.

### 5.3. Insights ricos — Organic / Accounts API (Business, acesso restrito)

- Suite "Organic API" (componente Accounts API, GA): publicar videos, **relatorios/insights detalhados** (views, impressions, reach, watch time, URLs) e gerenciar comentarios da **propria conta**. **Nao** expoe analytics de FYP/algoritmo.
- Acesso mais restrito que Display API: onboarding/aprovacao no TikTok for Business, frequentemente via **TikTok Marketing Partners**. Nivel exato de allowlisting depende do produto/regiao (**verificar / nao confirmado**).

---

## 6. Mensagens privadas / DMs

**Veredito da verificacao adversarial: NAO ha suporte oficial** para enviar/receber DMs de contas de criador/pessoais fora do TikTok Shop.

- **Login Kit / Display API / Content Posting API**: nenhum scope ou endpoint de mensageria.
- **Data Portability API**: scopes `portability.directmessages.single` / `.ongoing` existem, mas servem **so para o usuario exportar o proprio historico** de DMs (read-only, EEA/UK). Nao enviam nem recebem em tempo real.
- **Business Messaging API**: envio/recebimento existe, mas **atrelado a contas Business e a Instant Messaging Ads / Lead Gen** (a conversa nasce de um anuncio). Nao e canal de DM aberto para criador/pessoal. Reportado em Beta por regiao, indisponivel em EEA/Suica/UK/US (fonte nao-oficial, **verificar / nao confirmado**).
- **Impossivel oficialmente**: bot conversacional generico em DMs de criador/pessoal; auto-DM a novos seguidores; outreach em massa por DM. Qualquer "DM API" de terceiros opera fora das APIs oficiais e viola ToS.

---

## 7. TikTok Shop (commerce + mensageria)

Plataforma oficial: **TikTok Shop Open Platform / Partner Center** (namespace 202309), REST + OAuth 2.0 + JSON. **Este e o terreno mais fertil para o modelo evento->acao.**

### 7.1. Acesso

- **Seller / in-house developer**: conta TikTok Shop ativada; app custom autorizavel so pela propria loja (aprovacao mais simples, as vezes imediata via e-mail admin).
- **ISV / 3rd-party**: apps publicos que multiplos sellers autorizam via App Store. Review (~2–3 dias) + compliance review + listagem de idiomas.
- Permissoes por **modulo de produto** (Order, Product, Customer Service, Fulfillment, Returns) selecionado e aprovado no review.

### 7.2. Commerce

- **Order API**: Get Order List/Detail, fulfillment (shipping labels, tracking, split shipment), returns/refunds. Webhook de "Order status change".
- **Product API**: Get Product List/Detail, criar/atualizar listagens, sincronizar inventario.

### 7.3. Customer Service / IM API (mensageria com comprador)

**API oficial: SIM.** Capacidades documentadas: enviar mensagem ao comprador, listar conversas/sessoes, obter mensagens de uma conversa, marcar como lida, obter/definir status do agente, **event hooks** para novas mensagens. (Paths literais sao JS-rendered no portal — **confirmar no console logado**.)

- **Acesso**: modulo "Customer Service" aprovado. Para parceiros, pode exigir patamar alto de chamadas/dia; pre-requisito de ja ter integrado Order/Fulfillment/After-Sales (**numeros via agregador, verificar / nao confirmado**).
- **Restricoes de outbound (CRITICAS para automacao)** — so e possivel **iniciar** conversa com o comprador se: (1) houve conversa nos ultimos **30 dias**, OU (2) pedido nos ultimos **60 dias**, OU (3) historico de devolucao/reembolso na loja. **Mensagem fria em massa = bloqueada.**
- Janelas: conversa fecha em **6h** se o comprador nao responde; atendimento tem **7 dias** para responder (auto-fecha por nao resposta). Politica de taxa de resposta (~12h) impacta a avaliacao do seller (12h via fonte complementar).
- **Rate limits**: Dynamic QPS Allocation por isolation unit (cresce com numero de lojas autorizadas); sem QPS fixo publicado. Implementar cliente auto-adaptativo + backoff exponencial + tratamento de 429.

---

## 8. Remarketing & Ads

A **TikTok Marketing API** (parte da "TikTok API for Business") cobre **todo o nucleo de remarketing pago** de forma oficial. Pre-requisito comum: registrar developer + **Allowlist Management** (Apply por feature) + OAuth do anunciante.

### 8.1. Allowlisting

- Na pagina do app, secao **Allowlist Management** -> **Apply**, selecionar features e indicar impacto potencial de receita. **Cada feature, scope e rate limit e aprovado individualmente.** Nao se pode submeter mudanca de rate limit/scope com allowlist pendente, e vice-versa.
- Grupos de permissao: Ad Account Management, Campaign Management, Audience Management, Reporting, Creative Management, Business Center, Catalog. (Os identificadores exatos de scope sao JS-rendered no portal — **verificar no painel do app**.)

### 8.2. Campanhas / Ad Groups / Ads

- Endpoints `/campaign/create/`, `/adgroup/create/`, `/ad/create/` (+ `/get/`, `/update/`, `/status/update/`). Scope Campaign/Ads Management.
- **Deprecacao**: a legacy Smart+ Campaign Creation API sera descontinuada apos **31/03/2026**; migra para a Upgraded Smart+ API.

### 8.3. Custom Audiences (Remarketing) — Audience Management

| Tipo | API | Notas |
|---|---|---|
| **Customer File** (email/telefone/MAID) | SIM | Match por identificadores **hasheados SHA-256**; CSV/TXT <1GB, **min 1000 entradas**, geracao 24–48h. |
| **Engagement Audience** (quem interagiu com video/perfil/lead/Instant Form) | SIM | Criada a partir de engajamento com seu conteudo/anuncios. **Caminho-chave para remarketing a partir de engajamento.** |
| **App Activity / Retargeting** | SIM | "Get App Retargeting Events" fornece eventos para regras de audiencia. |
| **Website Traffic** (Pixel) | SIM | Depende de Pixel/Events API. |
| **Lookalike** | SIM | A partir de uma Custom Audience source; ate **400 grupos**/source; geracao 24–48h. |

### 8.4. Events API / TikTok Pixel (S2S)

- Integracao server-to-server para conversoes (web/app/offline/CRM). **Endpoint consolidado (Enhanced Events API)** recebe multiplas fontes.
- Auth por **token do Events API** (gerado no Events Manager), distinto do OAuth de campanhas. PII (email, phone, external_id) **hasheada SHA-256**; suporta Advanced Matching, IP, User-Agent. Parceiros de commerce (Shopify/WooCommerce) tem setup simplificado. Eventos alimentam otimizacao e **criacao de audiencias de remarketing**.

### 8.5. Lead Generation (Instant Forms)

- Leads de Instant Forms/DMs sincronizados ao Leads Center; API + **Webhooks** para CRM em tempo real (use cases "obtain leads as advertiser", "export leads and postback CRM events").
- Scope Lead generation (allowlist especifico) + Audience Management para remarketing.
- **Restricao critica**: Ads Manager retem leads por apenas **90 dias** — puxar via API/webhook dentro da janela.
- Fluxo de remarketing: leads -> Customer File / Engagement Audience -> Lookalike (totalmente suportado via API).

---

## 9. Webhooks & eventos

Dois sistemas distintos, com auth e catalogos separados. **Ponto central para o modelo evento->acao**: o lado social e deliberadamente pobre; o lado Shop e rico.

### 9.1. Developer Webhooks (open platform) — catalogo completo (4 eventos)

| Evento | Disparo | Payload (`content`) |
|---|---|---|
| `authorization.removed` | Usuario desautoriza o app | `reason` (0–5) |
| `video.upload.failed` | Falha no upload (Video Kit / Content Posting) | `share_id` |
| `video.publish.completed` | Video publicado pelo usuario | `share_id` |
| `portability.download.ready` | Export de Data Portability pronto | `request_id` (int64) |

- **NAO existe webhook** para novos comentarios, likes, follows, menções, lives ou DMs.
- Estrutura comum: `client_key`, `event`, `create_time`, `user_openid`, `content` (JSON serializado como string).
- Callback HTTPS configurada no portal; inscrito em todos os eventos por padrao; responder **200** imediatamente.
- **Verificacao de assinatura**: header `TikTok-Signature` (`t=<ts>,s=<assinatura>`); **HMAC-SHA256** com `client_secret`; payload assinado = `timestamp + "." + corpo_bruto`; validar `t` contra replay.
- **Entrega**: "at least once" (processar **idempotente**); retry com backoff por ate **72h**.

### 9.2. TikTok Shop Webhooks

- Categorias: **Pedidos** (novo/mudanca de status), **Logistica** (pacote, endereco), **Produtos** (aprovado/rejeitado, status, estoque), **Devolucoes**, **Mensagens/Atendimento** (Customer Service: novas mensagens, eventos de sessao).
- Configuracao no Partner Center ("Developing") ou via Event API (Update Shop Webhook); HTTPS POST JSON; responder 200.
- Payload: `type`, `shop_id`, `timestamp`, `data`.
- **Assinatura DIFERE**: vem no header `Authorization` (HMAC com `app_secret`; metodo exato **confirmar logado**).
- Exige parceiro aprovado no Partner Center + OAuth do seller. Codigos numericos de event types sao JS-rendered — **confirmar no Partner Center logado**.

---

## 10. Rate limits / ToS / compliance / riscos

### 10.1. Rate limits (consolidado)

| Produto | Limite | Fonte |
|---|---|---|
| Display API (`/user/info/`, `/video/query/`, `/video/list/`) | **600 req/min por endpoint** (janela deslizante) | Oficial |
| Content Posting `init` | 6 req/min/token | Oficial |
| Content Posting `status/fetch` | 30 req/min/token | Oficial |
| Marketing/Business API | Por app/advertiser (QPS); "Advanced API rate limiting" ~20 QPS via aprovacao (**nao-oficial, verificar**) | Portal JS-rendered |
| TikTok Shop | Dynamic QPS Allocation (sem valor fixo) | Oficial |

- Padrao geral: estouro retorna **HTTP 429** + `rate_limit_exceeded`; janela de 1 min; backoff exponencial; aumento via allowlist/support.

### 10.2. ToS e compliance

- **Scraping/crawling**: PROIBIDO sem autorizacao escrita (user ToS e Developer ToS).
- **Automacao de engajamento** (likes/follows/comentarios/DM em massa): PROIBIDA e sem API oficial -> shadowban/suspensao/ban.
- **Content Sharing Guidelines**: sem spam/conteudo enganoso; publicacao sempre por usuario autenticado (sem postagem "headless"); posts publicos passam por moderacao.
- **Uso de dados**: so para desenvolver/manter o seu app autorizado; proibido construir perfis sobre individuos; proibido vender/transferir dados sem autorizacao escrita; disclosure de privacidade (GDPR/LGPD/leis US).
- **App review/audit obrigatorio**; TikTok pode auditar e monitorar uso.

### 10.3. Situacao regulatoria US

- Supremo manteve a PAFACA (sale-or-ban) em **17/01/2025**. Desinvestimento concluido: operacoes US em **TikTok USDS / Joint Venture (Oracle, Silver Lake, MGX)**, deal fechado **22/01/2026**. Entidade US passou a ser TikTok USDS — endpoints, review e termos podem divergir/evoluir para trafego US; monitorar mudancas contratuais/infra e re-submeter app apos mudanca material.

### 10.4. Classificacao seguro / cinzento / proibido

- **Seguro**: publicar via Content Posting (auditado, exibindo criador, sem marca d'agua); ler dados proprios via Display API; campanhas/relatorios via Marketing API; operacoes via Shop API; Login Kit/OAuth.
- **Cinzento**: auto-reply de comentarios/DM (depende de produto oficial e regiao); combinar multiplas APIs (cuidado com clausula de nao criar perfis); limites altos via advanced rate limiting (so com aprovacao).
- **Proibido**: like/follow/comment em massa; scraping; bots/contas falsas; marca d'agua/logo injetado; vender dados.

---

## 11. Mapeamento para o Marketero

Modelo central do produto: **EVENTO -> CLASSIFICACAO (IA/GraphRAG) -> ACAO** (responder, ignorar, sugerir produto, escalar, etiquetar). A seguir, como o TikTok se encaixa.

### 11.1. O que da para automatizar HOJE (oficial)

- **Scheduling/publicacao organica (pilar scheduling + criativos Nano Banana)**: Content Posting API (Direct Post apos audit). O Nano Banana gera o criativo; o Marketero publica via `video.publish`/`video.upload`. **Bloqueador**: ate o audit, so `SELF_ONLY` — priorizar o audit cedo no roadmap.
- **Eventos de ciclo de publicacao -> grafo**: webhooks `video.publish.completed` / `video.upload.failed` / `authorization.removed` alimentam o GraphRAG (estado do post, saude do token). Sao os unicos sinais sociais em tempo real disponiveis.
- **Metricas unificadas**: Display API (`video.list` + `user.info.stats`) por **polling** para popular o no de metricas do post/conta no GraphRAG.
- **Gestao de comentarios em ANUNCIOS (pilar gestao de comentarios)**: Marketing API `/comment/*` -> EVENTO (comentario detectado via polling) -> CLASSIFICACAO (IA decide responder/ignorar/sugerir produto/escalar/etiquetar) -> ACAO (`/comment/post/`, `/comment/status/update/`, blocked words). **PIN nao automatizavel.**
- **Atendimento (pilar inbox unificado)**: TikTok Shop Customer Service API -> EVENTO (webhook de nova mensagem) -> CLASSIFICACAO/GraphRAG (com contexto de pedido/produto) -> ACAO (responder dentro da janela de 7 dias, sugerir produto, escalar a humano). Respeitar regra de outbound 30/60 dias.
- **Remarketing & campanhas (pilares campanhas + remarketing + metricas)**: Marketing API completa — **Engagement Audience** a partir de quem interagiu com videos/perfil/lead; **Customer File** a partir do CRM do Marketero (hash SHA-256); **Lookalike**; **Events API** server-side; **Lead Gen** com webhook (puxar dentro de 90 dias). Engajamento -> audiencia -> campanha e o loop nativo aqui.

### 11.2. Zona cinzenta (verificar antes de prometer)

- **Comentarios/insights ORGANICOS de Business Accounts via Accounts/Organic API**: potencialmente permite ler/gerenciar comentarios do conteudo proprio. **Nao confirmado** — validar logado no portal Business. Se confirmado, abre a porta para o modelo evento->acao no organico social (hoje fechado).
- **Business Messaging API**: util so se a conversa nascer de Instant Messaging Ads e na regiao certa. Nao substitui DM social. **Verificar elegibilidade/regiao.**

### 11.3. Impossivel oficialmente (nao prometer ao cliente)

- **Responder comentarios em posts organicos** (so anuncios). EVENTO de comentario organico nao tem webhook nem API de escrita.
- **DMs sociais** (criador/pessoal): sem envio/recebimento. O "inbox unificado" do Marketero **nao inclui DM organica do TikTok**.
- **Likes/follows/shares automatizados**: inexistente e contra ToS.
- **Webhook de novo comentario/like/follow** no social: inexistente -> tudo via polling.

### 11.4. Workarounds recomendados

- **Foco em comentarios via Spark Ads**: promover posts organicos como Spark Ads traz os comentarios para o escopo da Marketing API `/comment/*` (responder/ocultar). E o caminho oficial mais proximo de "moderar organico".
- **Remarketing a partir de engajamento**: usar Engagement Audience para reativar quem interagiu, contornando a ausencia de DM/comentario organico.
- **Atendimento via TikTok Shop IM** como o canal conversacional oficial do TikTok no Marketero (em vez de DM social).
- **Polling defensivo** para comentarios de ads e metricas (Display), com backoff e idempotencia, ja que nao ha webhooks.
- **GraphRAG**: modelar explicitamente as lacunas — nós de "canal sem ingestao em tempo real" para que a IA nao classifique acoes impossiveis (ex.: nunca sugerir "responder DM TikTok organico").

---

## 12. Riscos e recomendacoes

1. **Tres portais, tres OAuth, tres token stores**: arquitetar adapters separados (open platform / Business / Shop) com gestao de refresh independente. O `refresh_token` da open platform pode rotacionar — sempre persistir o novo.
2. **Audit do Content Posting cedo**: ate la, comunicar ao cliente que posts saem `SELF_ONLY`. Garantir username+avatar antes de cada post, selecao de privacidade e **zero** marca d'agua/logo/texto injetado (reprova o audit).
3. **Nunca implementar engajamento automatizado nem scraping** (like/follow/comment/DM em massa): risco de ban do app e das contas dos clientes. Recusar explicitamente no escopo do produto.
4. **Comentarios organicos e DMs sociais sao lacunas estruturais**: nao vender essas capacidades para TikTok. Reposicionar como "comentarios de ads + atendimento Shop + remarketing".
5. **Validar a Accounts/Organic API logado** antes de qualquer promessa sobre comentarios organicos — e o unico ponto que poderia mudar o veredito.
6. **Rate limiting defensivo**: 600 req/min/endpoint como teto Display; backoff exponencial em 429; filas; processamento idempotente (webhooks "at least once").
7. **Compliance de dados**: hash SHA-256 de PII em Custom Audiences/Events; base legal/consentimento (LGPD); janela de 90 dias para leads; nao construir perfis de individuos.
8. **TikTok Shop outbound**: respeitar a regra 30/60 dias / historico de retorno — a IA nao deve iniciar conversas frias.
9. **Monitorar regulatorio/contratual US (TikTok USDS)** e a deprecacao da Smart+ API (31/03/2026); re-submeter app apos mudancas materiais.
10. **Numeros e paths JS-rendered**: reconfirmar limites de midia, scopes do Business, paths de Customer Service e codigos de webhook do Shop diretamente nos consoles logados antes de implementar.

---

## 13. Fontes

**TikTok for Developers (open platform)**
- https://developers.tiktok.com/doc/overview
- https://developers.tiktok.com/doc/login-kit-overview
- https://developers.tiktok.com/doc/oauth-user-access-token-management
- https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens/
- https://developers.tiktok.com/doc/login-kit-qr-code-authorization
- https://developers.tiktok.com/doc/tiktok-api-scopes
- https://developers.tiktok.com/doc/scopes-overview
- https://developers.tiktok.com/doc/display-api-overview
- https://developers.tiktok.com/doc/tiktok-api-v2-video-query
- https://developers.tiktok.com/doc/tiktok-api-v2-rate-limit
- https://developers.tiktok.com/products/content-posting-api/
- https://developers.tiktok.com/doc/content-posting-api-get-started
- https://developers.tiktok.com/doc/content-posting-api-get-started-upload-content
- https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
- https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- https://developers.tiktok.com/doc/content-sharing-guidelines
- https://developers.tiktok.com/doc/webhooks-overview/
- https://developers.tiktok.com/doc/webhooks-events/
- https://developers.tiktok.com/doc/webhooks-verification
- https://developers.tiktok.com/products/research-api/
- https://developers.tiktok.com/doc/about-research-api
- https://developers.tiktok.com/doc/research-api-specs-query-videos/
- https://developers.tiktok.com/doc/research-api-specs-query-video-comments
- https://developers.tiktok.com/doc/research-api-faq
- https://developers.tiktok.com/products/commercial-content-api
- https://developers.tiktok.com/doc/commercial-content-api-getting-started
- https://developers.tiktok.com/doc/commercial-content-api-supported-countries
- https://developers.tiktok.com/products/data-portability-api/
- https://developers.tiktok.com/doc/data-portability-data-types
- https://developers.tiktok.com/doc/data-portability-api-get-started
- https://developers.tiktok.com/signup

**TikTok API for Business (Ads / Organic / Messaging)**
- https://business-api.tiktok.com/portal/docs
- https://business-api.tiktok.com/portal/docs/marketing-api-authorization-faqs/v1.3
- https://business-api.tiktok.com/portal/docs/rate-limits-for-tto-api/v1.3
- https://business-api.tiktok.com/portal/docs?id=1740859371033601
- https://business-api.tiktok.com/portal/docs?id=1739289524101122
- https://business-api.tiktok.com/portal/docs?id=1738086844585985
- https://business-api.tiktok.com/portal/docs/reply-to-a-comment/v1.3
- https://business-api.tiktok.com/portal/bm-api/education-hub
- https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
- https://github.com/tiktok/tiktok-business-api-sdk
- https://github.com/tiktok/tiktok-business-api-sdk/blob/main/python_sdk/docs/CommentsApi.md
- https://ads.tiktok.com/help/article/marketing-api?lang=en
- https://ads.tiktok.com/help/article/manage-comments-tiktok-ads-manager
- https://ads.tiktok.com/help/article/custom-audiences
- https://ads.tiktok.com/help/article/manage-custom-audience?lang=en
- https://ads.tiktok.com/help/article/customer-file
- https://ads.tiktok.com/help/article/customer-file-faq?lang=en
- https://ads.tiktok.com/help/article/create-lookalike-audience?lang=en
- https://ads.tiktok.com/help/article/events-api
- https://ads.tiktok.com/help/article/getting-started-events-api?lang=en
- https://ads.tiktok.com/help/article/how-to-set-up-matching-events-with-events-api?lang=en
- https://ads.tiktok.com/business/en-US/blog/events-api-consolidated-endpoint
- https://ads.tiktok.com/help/article/set-up-lead-generation-with-instant-form?lang=en
- https://ads.tiktok.com/help/article/available-crm-integrations-tiktok-lead-generation?lang=en
- https://ads.tiktok.com/help/article/access-leads-data-in-leads-center?lang=en
- https://ads.tiktok.com/help/article/how-to-set-up-tiktok-instant-messaging-ads

**TikTok Shop (Partner Center)**
- https://partner.tiktokshop.com/
- https://partner.tiktokshop.com/docv2/page/tts-api-concepts-overview
- https://partner.tiktokshop.com/docv2/page/authorization-overview-202407
- https://partner.tiktokshop.com/docv2/page/authorization-guide-202309
- https://partner.tiktokshop.com/docv2/page/access-scope
- https://partner.tiktokshop.com/docv2/page/developer
- https://partner.tiktokshop.com/docv2/page/tokopedia-shop-isv-seller-developer-onboarding
- https://partner.tiktokshop.com/docv2/page/create-your-app
- https://partner.tiktokshop.com/docv2/page/test-your-app
- https://partner.tiktokshop.com/docv2/page/tts-developer-guide
- https://partner.tiktokshop.com/docv2/page/customer-service-api-overview
- https://partner.tiktokshop.com/docv2/page/send-message-202309
- https://partner.tiktokshop.com/docv2/page/get-conversation-messages-202309
- https://partner.tiktokshop.com/docv2/page/customer-engagement-api-overview
- https://partner.tiktokshop.com/docv2/page/products-api-overview
- https://partner.tiktokshop.com/docv2/page/get-order-detail-202309
- https://partner.tiktokshop.com/docv2/page/tts-webhooks-overview
- https://partner.tiktokshop.com/docv2/page/configuration-guide
- https://partner.tiktokshop.com/docv2/page/update-shop-webhook
- https://partner.tiktokshop.com/docv2/page/1-order-status-change
- https://partner.tiktokshop.com/docv2/page/rate-limits
- https://partner.tiktokshop.com/docv2/page/64f1991d64ed2e0295f3d2c0
- https://partner.tiktokshop.com/docv2/page/seller-api-overview

**Legal / compliance / regulatorio**
- https://www.tiktok.com/legal/page/global/tik-tok-developer-terms-of-service/en
- https://www.tiktok.com/legal/page/us/terms-of-service/en
- https://www.tiktok.com/legal/page/global/terms-of-service-research-api/en
- https://www.tiktok.com/privacy/blog/how-we-combat-scraping/en
- https://www.tiktok.com/community-guidelines/en/integrity-authenticity
- https://www.hklaw.com/en/insights/publications/2025/01/us-supreme-court-upholds-tiktok-sale-or-ban-law
- https://www.congress.gov/crs-product/LSB11261
- https://en.wikipedia.org/wiki/Efforts_to_ban_TikTok_in_the_United_States
