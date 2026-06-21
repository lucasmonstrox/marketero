# Marketero — Automação no X (Twitter): Investigação da API

> Como o Marketero pode automatizar **respostas a comentários, interações em posts, remarketing e mensagens privadas (DM)** usando a X API. Estado verificado em **junho de 2026** — a plataforma mudou de preço e de regras várias vezes em 2025–2026; cada fato volátil abaixo traz a fonte e foi checado de forma independente.

Este documento mapeia a API do X (antigo Twitter) contra os pilares do Marketero descritos em [visao-geral.md](./visao-geral.md): gestão de comentários, inbox unificado, atendimento por IA e o modelo **evento → classificação pela IA → ação**. A conclusão de negócio mais importante vem primeiro, porque ela redefine o que é viável.

---

## ⚠️ Resumo executivo (leia antes de planejar)

O X **não é mais uma plataforma barata nem aberta para automação** como foi até 2023. Três mudanças de 2026 redesenham o que dá para construir:

1. **Modelo pay-per-use é o padrão desde 6/fev/2026.** Não há mais tier Free para novos desenvolvedores, e **Basic ($200/mês) e Pro ($5.000/mês) estão fechados para novas contas** (só seguem para quem já assinava; assinantes Basic legados começaram a ser migrados para pay-per-use em 1/jun/2026). Acima do teto do pay-per-use, a única porta é **Enterprise (~$42.000/mês+, "Contact sales")**. ([docs.x.com – Pricing](https://docs.x.com/x-api/getting-started/pricing), [Postproxy 2026](https://postproxy.dev/blog/x-api-pricing-2026/))

2. **Várias ações de engajamento foram removidas dos tiers self-serve em 20/abr/2026.** **Curtir (like), Seguir (follow) e Quote-post via API agora exigem contrato Enterprise.** Os endpoints de **block/unblock** também são **Enterprise-only**. Ou seja: a automação de "curtir/seguir quem interagiu" deixou de ser viável no pay-per-use. ([docs.x.com – Changelog](https://docs.x.com/changelog))

3. **DMs migraram para XChat com criptografia E2EE por padrão (nov/2025).** A API v2 **só lê/envia DMs legadas não criptografadas**; quando uma conversa é promovida a criptografada, ela **some** de `/2/dm_events` e dos webhooks, e não há SDK público de descriptografia. ([devcommunity](https://devcommunity.x.com/t/x-api-stops-returning-new-direct-messages-in-the-dm-events-endpoint/259751), [TechCrunch](https://techcrunch.com/2025/09/04/xs-encrypted-dm-feature-xchat-is-rolling-out-more-broadly/))

**O que ainda é viável e barato (pay-per-use):** publicar posts, **responder comentários/menções** (`POST /2/tweets` com `reply`), **ocultar respostas** (moderação), **ler menções por polling**, e **repost/bookmark/mute**. **O que exige Enterprise:** webhooks em tempo real (Account Activity API), filtered stream, e — agora — curtir/seguir/quote/block via API.

| Pilar do Marketero | Viável no pay-per-use? | Mecanismo | Tier mínimo real |
|---|---|---|---|
| Responder comentários/menções | ✅ Sim | `POST /2/tweets` (reply) + polling de menções | Pay-per-use |
| Moderar comentários (ocultar) | ✅ Sim | `PUT /2/tweets/:id/hidden` | Pay-per-use |
| Repost / bookmark / mute | ✅ Sim | endpoints v2 de engajamento | Pay-per-use |
| **Curtir / Seguir / Quote-post** | ❌ Não | endpoints removidos do self-serve em abr/2026 | **Enterprise** |
| Receber DM em tempo real | ⚠️ Limitado | Account Activity API (webhook) | **Enterprise** (ver contradição na seção de webhooks) |
| Enviar/ler DM (não-cripto) | ✅ Sim | `POST/GET /2/dm_*` | Pay-per-use |
| Social listening (menção pública em tempo real) | ❌ Não | Filtered Stream v2 | **Pro (fechado) / Enterprise** |
| Remarketing (audiências, retargeting) | ✅ Sim (acesso à parte) | **X Ads API** (allowlist) | Ads API Standard Access |

> **Recomendação de produto:** construa o MVP do conector X sobre **polling + endpoints de escrita do pay-per-use** (responder, ocultar, repost). Trate webhooks/stream e curtir/seguir como **funcionalidades premium dependentes de Enterprise**, atrás de uma camada de abstração de "fonte de eventos" e "ações", para o produto degradar com elegância quando o cliente não tiver Enterprise.

---

## Acesso à X API, Tiers e Autenticação

> Estado em **junho de 2026**. Desde **6 de fevereiro de 2026** o X tornou o modelo **pay-per-use (pré-pago por crédito)** o padrão para novos desenvolvedores. Os tiers fixos legados (Free, Basic, Pro) **não estão mais disponíveis para novas contratações** — só permanecem para quem já era assinante. Para volume acima do teto do pay-per-use, a única alternativa é **Enterprise**. ([Postproxy – X API Pricing 2026](https://postproxy.dev/blog/x-api-pricing-2026/), [docs.x.com – Pricing](https://docs.x.com/x-api/getting-started/pricing))

### Modelo de cobrança atual (2026): Pay-per-use

Cobrança por crédito pré-pago, debitada por requisição bem-sucedida ([docs.x.com – Pricing](https://docs.x.com/x-api/getting-started/pricing)):

- **$0,015 por post criado** (texto/mídia sem link). Subiu de $0,010 em **20/abr/2026**.
- **$0,20 por post criado que contenha um link/URL** (o X penaliza fortemente posts com link).
- **$0,005 por post lido (read)**, com **teto de 2 milhões de reads/mês**. Acima disso, exige Enterprise.
- **$0,001 por "owned read"** (leitura de conteúdo próprio) — reduzido em abr/2026.
- **DM Interaction: Create = $0,015/request**; **leitura de DM event = $0,010/recurso**.
- **Deduplicação por janela de 24h (UTC)**: o mesmo recurso solicitado duas vezes em 24h é cobrado uma vez.
- **Requisições que falham não são cobradas.** Sem caps mensais embutidos; você define limites de gasto e auto-recarga no Console.

### Tabela comparativa de tiers (USD, 2026)

| Tier | Status p/ novas contas | Preço | Reads/mês | Observações |
|---|---|---|---|---|
| **Free** | Descontinuado | $0 | Mínimo | Só apps de utilidade pública, caso a caso |
| **Pay-per-use** | **Disponível (padrão)** | Pré-pago ($0,015/post, $0,005/read…) | Cap **2M reads/mês** | Modelo padrão desde fev/2026 |
| **Basic** (legado) | Só assinantes existentes | $200/mês | ~15.000 | Não contratável; em migração p/ pay-per-use |
| **Pro** (legado) | Só assinantes existentes | $5.000/mês | ~1.000.000 | Não contratável; necessário p/ filtered stream |
| **Enterprise** | Disponível (negociado) | ~$42.000/mês+ ("Contact sales") | 50M+ | Webhooks (AAA), stream, likes/follows/block via API |

> **Fato volátil:** preços e caps mudaram pelo menos duas vezes em 2026 (fev e abr). Confirme valores correntes no [Developer Console](https://console.x.com) antes de orçar — os preços por endpoint ficam no Console, não na doc pública.

### Como obter acesso

1. Acesse o **Developer Console** em [console.x.com](https://console.x.com) (substituiu o developer portal). ([docs.x.com – About X API](https://docs.x.com/x-api/getting-started/about-x-api))
2. Crie um **Project** e, dentro dele, um **App** (o App gera credenciais e fala com a v2).
3. Gere credenciais conforme o fluxo de auth: **API Key + API Secret** (consumer keys, p/ OAuth 1.0a), **Bearer Token** (App-only), **OAuth 2.0 Client ID** (+ secret p/ apps confidenciais).
4. Configure **Callback/Redirect URI** (match exato) e o tipo do app (SPA/nativo = PKCE sem secret; server-side = com secret).
5. Ative o tier (pay-per-use por padrão) e configure limite de gasto.

### Modelos de autenticação

| Modelo | Contexto | Quando usar |
|---|---|---|
| **OAuth 2.0 Authorization Code + PKCE** | Usuário | **Recomendado** para qualquer ação em nome do usuário (postar, DM, repost, ler dados privados) |
| **App-only Bearer Token (OAuth 2.0)** | Aplicação | Leitura de dados públicos e **filtered stream**. Não escreve nem lê dados privados |
| **OAuth 1.0a (User Context)** | Usuário (legado) | Compatibilidade; **obrigatório** para a Ads API e para registro de webhooks (AAA) |

**Regra prática de contexto por ação:**
- **Escrever post, DM, repost, bookmark, mute** → **user context** (OAuth 2.0 PKCE recomendado). Bearer **não** escreve.
- **Ler dados públicos** (search recent, lookup) → **App-only Bearer** basta.
- **Ler dados privados** (DMs, e-mail) → **user context** obrigatório.
- **Ads API e gestão de webhooks** → **OAuth 1.0a**.

### Fluxo OAuth 2.0 Authorization Code + PKCE

```
1) GET https://x.com/i/oauth2/authorize
     ?response_type=code&client_id=...&redirect_uri=<match exato>
     &scope=tweet.read tweet.write users.read offline.access
     &state=<anti-CSRF>&code_challenge=<PKCE>&code_challenge_method=S256

2) POST https://api.x.com/2/oauth2/token   (x-www-form-urlencoded)
     grant_type=authorization_code&code=...&redirect_uri=...&code_verifier=...&client_id=...

3) POST https://api.x.com/2/oauth2/token   (refresh)
     grant_type=refresh_token&refresh_token=...&client_id=...
```

**Ciclo de vida dos tokens:** authorization code expira em ~30s; **access token vale 2 horas**; **refresh token só é emitido com o escopo `offline.access`**. ([docs.x.com – OAuth 2.0 PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code))

### Escopos OAuth 2.0 principais

| Escopo | Concede | Escopo | Concede |
|---|---|---|---|
| `tweet.read` | ler posts | `dm.read` / `dm.write` | ler / enviar DMs |
| `tweet.write` | criar posts/repost | `like.read` / `like.write` | ler / curtir¹ |
| `tweet.moderate.write` | ocultar/reexibir respostas | `follows.read` / `follows.write` | ver / seguir¹ |
| `users.read` | ler perfis | `mute.read` / `mute.write` | gerenciar silenciados |
| `media.write` | upload de mídia (v2) | `bookmark.read` / `bookmark.write` | gerenciar bookmarks |
| `offline.access` | **emite refresh token** | `block.read` / `block.write` | gerenciar bloqueios¹ |

¹ O escopo existe, mas o **endpoint** correspondente (like/follow/quote/block) virou **Enterprise-only** em abr/2026 — ter o escopo não dá acesso no pay-per-use.

**Combinação típica de publicação/atendimento:** `tweet.read tweet.write users.read offline.access` + `dm.read dm.write` para o inbox + `media.write` para anexos.

### X API v2 vs v1.1 e deprecações

- **v2 é a versão recomendada**; v1.1 é legado.
- **Upload de mídia v1.1 (`media/upload`) foi descontinuado em 9/jun/2025.** Use os endpoints v2: `POST /2/media/upload` (simples) e o fluxo chunked `initialize → append → finalize`. ([devcommunity – Deprecating v1.1 media](https://devcommunity.x.com/t/deprecating-the-v1-1-media-upload-endpoints/238196))
- **OAuth 1.0a User Context permanece suportado** (e é obrigatório para Ads API e webhooks), mas use OAuth 2.0 PKCE em projetos novos.

---

## Publicação de Posts e Respostas a Comentários e Menções

Base `https://api.x.com`. Escrita (criar/deletar post, ocultar resposta, upload de mídia) exige **user context**. Leitura de menções/busca aceita também **App-only Bearer**.

| Operação | Endpoint | Método | Escopos OAuth 2.0 |
|---|---|---|---|
| Criar post / responder / quote² / thread | `/2/tweets` | POST | `tweet.read tweet.write users.read offline.access` |
| Deletar post | `/2/tweets/:id` | DELETE | `tweet.read tweet.write users.read` |
| Ocultar/exibir resposta | `/2/tweets/:id/hidden` | PUT | `tweet.moderate.write tweet.read users.read` |
| Ler menções | `/2/users/:id/mentions` | GET | `tweet.read users.read` (ou App-Only) |
| Busca recente (conversa/replies) | `/2/tweets/search/recent` | GET | `tweet.read users.read` (ou App-Only) |
| Upload de mídia | `/2/media/upload*` | POST | `media.write tweet.read users.read` |

² **Quote-post via API é Enterprise-only desde abr/2026** — apesar de o campo `quote_tweet_id` existir no payload.

### Criar post e responder a um comentário (caso central do Marketero)

Campos principais do corpo JSON de `POST /2/tweets`: `text`, `reply.in_reply_to_tweet_id`, `reply.exclude_reply_user_ids`, `quote_tweet_id`², `media.media_ids` (1–4 imagens ou 1 vídeo/GIF), `poll.options`, `reply_settings` (`following` | `mentionedUsers` | `subscribers`). ([docs.x.com – Manage Posts](https://docs.x.com/x-api/posts/manage-tweets/introduction))

```bash
# Responder a um comentário
curl -X POST "https://api.x.com/2/tweets" \
  -H "Authorization: Bearer $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{ "text": "Obrigado pelo feedback! Já encaminhamos ao time.",
        "reply": { "in_reply_to_tweet_id": "1234567890" } }'
```

**Threads:** crie o primeiro post, capture o `id` retornado e encadeie cada seguinte com `reply.in_reply_to_tweet_id` apontando para o `id` anterior.

> **Restrição importante:** uma resposta via API só é permitida se o autor do post original "convocou" a conta respondente (via @menção ou citando um post dela); caso contrário pode retornar **403**. ([devcommunity – 403 in_reply_to](https://devcommunity.x.com/t/post-tweet-with-in-reply-to-tweet-id-returns-response-error-403/165306))

### Ler comentários/respostas a um post

Não há endpoint "listar replies" direto — usa-se o operador **`conversation_id`** na busca recente. Todas as respostas de uma thread compartilham o `conversation_id` = ID do post original. ([docs.x.com – Conversation ID](https://docs.x.com/x-api/fundamentals/conversation-id))

```bash
curl "https://api.x.com/2/tweets/search/recent?query=conversation_id:1234567890\
&tweet.fields=author_id,created_at,in_reply_to_user_id,referenced_tweets&expansions=author_id" \
  -H "Authorization: Bearer $TOKEN"
```

- `referenced_tweets` traz `type:"replied_to"` + ID do pai → distingue resposta direta de aninhada.
- **`/2/tweets/search/recent` cobre só os últimos 7 dias** ([docs.x.com – Search recent](https://docs.x.com/x-api/posts/search-recent-posts)). Histórico maior exige `search/all` (Enterprise).

### Detectar menções: `GET /2/users/:id/mentions`

Retorna posts que mencionam o usuário (incluindo replies a posts dele). Parâmetros-chave: **`since_id`** (polling incremental), `until_id`, `pagination_token` (`meta.next_token`), `max_results` (5–100), `start_time`/`end_time`, `expansions`, `tweet.fields`. ([docs.x.com – explore a user's posts](https://docs.x.com/tutorials/explore-a-users-posts))

**Padrão de polling:** armazene o `id` mais recente processado e passe-o como `since_id` na chamada seguinte; pagine com `next_token` em backlog. A timeline retorna no máximo os ~800 posts mais recentes.

### Hidden replies (moderação de comentários): `PUT /2/tweets/:id/hidden`

Oculta/reexibe uma resposta numa conversa do usuário autenticado (continua acessível em página separada). Escopo `tweet.moderate.write`. **Limite: 725 respostas ocultadas por conversa.** ([X – Hide Replies](https://developer.x.com/en/docs/x-api/tweets/hide-replies))

```bash
curl -X PUT "https://api.x.com/2/tweets/1234567890/hidden" \
  -H "Authorization: Bearer $USER_TOKEN" -H "Content-Type: application/json" \
  -d '{"hidden": true}'   # false para reexibir
```

### Rate limits relevantes (por contexto de auth)

| Endpoint | Per App | Per User |
|---|---|---|
| `POST /2/tweets` | 10.000 / 24h | **100 / 15min** |
| `DELETE /2/tweets/:id` | — | 50 / 15min |
| `PUT /2/tweets/:id/hidden` | — | 50 / 15min |
| `GET /2/users/:id/mentions` | 450 / 15min | 300 / 15min |
| `GET /2/tweets/search/recent` | 450 / 15min | 300 / 15min |
| `POST /2/media/upload` | 50.000 / 24h | 500 / 15min |

Fonte: [docs.x.com – Rate limits](https://docs.x.com/x-api/fundamentals/rate-limits). Para automação de respostas em escala, o gargalo é **100 replies/15min por conta** → enfileire e distribua.

### Mapeamento para o Marketero (classificar → responder/ocultar/escalar)

1. **Ingestão:** polling de `GET /2/users/:id/mentions` com `since_id`; para cada post monitorado, `search/recent?query=conversation_id:<id>` para colher comentários (7 dias).
2. **Classificação:** IA roda sobre `text` + contexto (`referenced_tweets`, `author_id`) → dúvida/elogio/reclamação/intenção de compra/spam.
3. **Ação:** **Responder** (`POST /2/tweets` com `reply`, atenção ao 403 de convocação e ao 100/15min); **Ocultar** (`PUT .../hidden`) para spam/tóxico; **Escalar** para humano.
4. **Resiliência:** respeitar `x-rate-limit-*`, enfileirar, persistir `since_id`/`next_token` por conta gerenciada.

---

## Engajamento (repost, bookmark, mute — e o que virou Enterprise)

> **Correção crítica (abr/2026):** **Curtir (`/2/users/:id/likes`), Seguir (`/2/users/:id/following`) e Quote-post foram removidos de todos os tiers self-serve** e agora exigem **Enterprise**. **Block/unblock também é Enterprise-only.** Os escopos `like.write`/`follows.write`/`block.write` continuam existindo, mas o endpoint nega acesso no pay-per-use. ([docs.x.com – Changelog](https://docs.x.com/changelog), [devcommunity – block Enterprise-only](https://devcommunity.x.com/t/block-endpoint-post-2-users-id-blocking-inaccessible-on-pay-per-use-tier-documentation-contradictions/257366))

Todos os endpoints de escrita operam sobre o usuário autenticado e exigem **user context**.

| Ação | Método + Path | Corpo | Escopo | Disponível no self-serve? |
|---|---|---|---|---|
| Repost (retweet) | `POST /2/users/:id/retweets` | `{"tweet_id":"…"}` | `tweet.write` | ✅ Sim |
| Desfazer repost | `DELETE /2/users/:id/retweets/:source_tweet_id` | — | `tweet.write` | ✅ Sim |
| Salvar bookmark | `POST /2/users/:id/bookmarks` | `{"tweet_id":"…"}` | `bookmark.write` | ✅ Sim (só OAuth 2.0 PKCE) |
| Silenciar (mute) | `POST /2/users/:id/muting` | `{"target_user_id":"…"}` | `mute.write` | ✅ Sim (só OAuth 2.0 PKCE) |
| **Curtir** | `POST /2/users/:id/likes` | `{"tweet_id":"…"}` | `like.write` | ❌ **Enterprise-only** |
| **Seguir** | `POST /2/users/:id/following` | `{"target_user_id":"…"}` | `follows.write` | ❌ **Enterprise-only** |
| **Bloquear** | `POST /2/users/:id/blocking` | `{"target_user_id":"…"}` | `block.write` | ❌ **Enterprise-only** |

Fontes: [Likes](https://docs.x.com/x-api/posts/likes/introduction), [Bookmarks](https://docs.x.com/x-api/posts/bookmarks/introduction), [v2 auth mapping](https://docs.x.com/resources/fundamentals/authentication/guides/v2-authentication-mapping).

### Métricas de engajamento (leitura)

Via `tweet.fields` em endpoints de leitura ([docs.x.com – Metrics](https://docs.x.com/x-api/fundamentals/metrics)):

| Grupo | Campos | Auth | Restrição |
|---|---|---|---|
| `public_metrics` | retweet/quote/like/reply/impression/bookmark_count | Bearer basta | qualquer post |
| `non_public_metrics` | url_link_clicks, user_profile_clicks, engagements | user context | só posts próprios, **últimos 30 dias** |
| `organic_metrics` | impressions, likes, replies, retweets, clicks | user context | só posts próprios, últimos 30 dias |
| `promoted_metrics` | equivalentes de impressões pagas | user context | só posts próprios promovidos, 30 dias |

### Rate limits (por usuário, 15min) e risco de automação

`POST retweets` 50/15min · `POST bookmarks` 50/15min · `POST muting` 50/15min · `GET bookmarks` 180/15min. Relatos da comunidade indicam que no Basic o retweet pode dar **429 com ~5 chamadas/15min** — limites efetivos abaixo do documentado. ([devcommunity – 429 retweets Basic](https://devcommunity.x.com/t/error-429-on-basic-plan-endpoint-post-2-users-id-retweets/197004))

> **Política (vale independente do rate limit):** seguir/curtir/repostar **em massa, agressivo ou para inflar engajamento é proibido** e leva a suspensão — não só 429. Aja sempre a partir de ação iniciada pelo usuário, nunca em loops autônomos de like/follow. ([X automation rules](https://help.x.com/en/rules-and-policies/x-automation), [Developer Policy](https://docs.x.com/developer-terms/policy)) Combinado com o gating de Enterprise, **a recomendação é não construir automação de like/follow** no Marketero.

---

## Mensagens Diretas (DM)

> **Alerta de criptografia:** desde nov/2025 o X substituiu DMs por **XChat com E2EE por padrão**. A API v2 **só lê/envia DMs legadas não criptografadas**; após um "Conversation Upgraded" para E2EE o endpoint para de retornar novas mensagens, e **não há SDK público de descriptografia** (`chat-xdk` não lançado). Exiba aviso no inbox quando uma thread não puder ser sincronizada. ([devcommunity](https://devcommunity.x.com/t/x-api-stops-returning-new-direct-messages-in-the-dm-events-endpoint/259751))

### Envio (Manage DMs)

| Ação | Método | Path |
|---|---|---|
| Enviar DM 1:1 (cria conversa) | POST | `/2/dm_conversations/with/:participant_id/messages` |
| Responder conversa existente | POST | `/2/dm_conversations/:dm_conversation_id/messages` |
| Criar conversa de grupo | POST | `/2/dm_conversations` |

Payload: obrigatório **pelo menos um** entre `text` e `attachments`; **apenas um anexo (`media_id`) por mensagem** (upload prévio via `/2/media/upload`). **Quick replies / botões / welcome messages do v1.1 não existem no v2** — só texto + mídia. ([docs.x.com – Manage DMs](https://docs.x.com/x-api/direct-messages/manage/integrate))

```http
POST /2/dm_conversations/with/783214/messages
Authorization: Bearer <user-access-token>
Content-Type: application/json

{ "text": "Olá! Aqui está o comprovante.", "attachments": [{ "media_id": "1583157113245011970" }] }
```

### Leitura (DM Events lookup)

`GET /2/dm_events` (todos) · `GET /2/dm_conversations/:id/dm_events` · `GET /2/dm_conversations/with/:participant_id/dm_events` · `GET /2/dm_events/:event_id`. **Janela de 30 dias.** Params: `max_results` (1–100), `pagination_token`, `event_types` (`MessageCreate`/`ParticipantsJoin`/`ParticipantsLeave`), `dm_event.fields`, `expansions`. **Não há `since_id`** — deduplicar guardando o último `event_id`. ([docs.x.com – Get DM events](https://docs.x.com/x-api/direct-messages/get-dm-events-for-a-dm-conversation))

### Escopos e contexto

DM **exige user context** (sem App-Only). Ler: `dm.read tweet.read users.read`. Enviar: `dm.write dm.read tweet.read users.read`.

### Limites, anti-spam e disponibilidade por tier

| Endpoint | Per User |
|---|---|
| `POST` de DM (qualquer variante) | **15 / 15min e 1.440 / 24h** |
| `GET /2/dm_events` (qualquer variante) | **15 / 15min** |

- Você só envia DM a quem permite mensagens de qualquer pessoa, **ou** com quem há relação de follow / opt-in implícito (já te mandou DM). Bulk/cold DM é proibido.
- **Webhooks de DM em tempo real exigem Enterprise** (a seção de DM do levantamento menciona um possível allotment mínimo no pay-per-use — *3 subscriptions / 1 webhook* — mas isso **contradiz** a doc de Account Activity, que posiciona o recurso como Enterprise; **confirme no Console** antes de depender disso).
- Polling de `/2/dm_events` é o fallback universal (15/15min, 30 dias, sem typing/read receipts).

### Mapeamento para o Marketero (inbox + atendimento)

- **Ingestão:** AAA por conta de cliente quando houver Enterprise (`for_user_id` roteia o tenant); senão polling de `/2/dm_events`, sinalizando "near real-time degradado".
- **Envio do agente:** abrir com `…/with/:participant_id/messages`, responder com `…/:dm_conversation_id/messages`; persistir `dm_conversation_id` como chave da conversa.
- **Mídia:** pipeline `upload → media_id → anexar` (1 por mensagem; UI deve impedir múltiplos).
- **Guard-rails:** enfileirar respeitando 15/15min e 1.440/24h, ler headers `x-user-limit-24hour-*`, capturar erro de "destinatário não aceita DM" e marcar como "requer follow/opt-in".

---

## Webhooks no X: Account Activity API (guia completo)

Esta é a peça que mais importa para o pipeline **evento → classificação por IA → ação** do Marketero. O caminho canônico é a **Account Activity API (AAA)**; quando indisponível, há fallback via **filtered stream** e **polling** (próxima seção).

### Aviso crítico de disponibilidade e tier (2026)

A AAA **não é self-serve**: o X precisa habilitar (allowlist) o acesso ao seu App, e na prática o recurso está atrelado ao **Enterprise** (linhagem Gnip 2.0). ([docs.x.com – Account Activity Enterprise](https://docs.x.com/x-api/enterprise-gnip-2.0/fundamentals/account-activity), [devcommunity – sem AAA no Pro](https://devcommunity.x.com/t/pro-tier-access-to-webhooks-account-activity-api/254495))

> **Implicação para o Marketero:** trate AAA como recurso de **tier alto/Enterprise**. Projete a arquitetura com uma camada de abstração de "fonte de eventos" para cair para filtered stream/polling quando o cliente não tiver AAA.

### 1. O que a AAA entrega

| Categoria | Eventos | Chave do payload |
|---|---|---|
| Posts | criação, delete, edição | `tweet_create_events`, `tweet_delete_events` |
| Engajamento | @menções, replies, retweets, quotes | `tweet_create_events` |
| Social | follow/unfollow, block, mute | `follow_events`, `block_events`, `mute_events` |
| Likes | favorites | `favorite_events` |
| Mensagens | DM enviada/recebida, typing, read | `direct_message_events`, `direct_message_indicate_typing_events`, `direct_message_mark_read_events` |
| Conta | revogação de subscription | `user_event` |

Não cobre home timeline. DM em grupo não trafega pela AAA. Lembre da limitação de **XChat E2EE** (DMs criptografadas não chegam).

### 2. Pré-requisitos

1. Conta de desenvolvedor aprovada em [developer.x.com](https://developer.x.com).
2. **Project + App** (a AAA opera por App).
3. Permissões do App: **Read and write and Direct Messages** (DM exige isso).
4. Chaves: **API Key/Secret** (consumer, OAuth 1.0a) + **Access Token/Secret** de cada conta a inscrever.
5. **Acesso à AAA habilitado** pelo X (allowlist / contrato Enterprise).
6. **Dev environment / label** (`:env_name`) quando o caminho exigir environment.

### 3. CRC (Challenge-Response Check)

O X dispara **GET** no seu endpoint com `crc_token` no registro e **a cada ~24h** (revalidação a cada ~30min se falhar). Responda em **< 3 segundos** com `{"response_token":"sha256=<base64>"}`, onde `<base64> = HMAC-SHA256(message=crc_token, key=consumer_secret)`. ([X – Securing webhooks](https://developer.x.com/en/docs/x-api/enterprise/account-activity-api/guides/securing-webhooks))

```ts
import crypto from "node:crypto";
import express, { Request, Response } from "express";

const CONSUMER_SECRET = process.env.X_API_SECRET!; // "API Secret" (não é o bearer/access token!)

function buildCrcResponse(crcToken: string): string {
  return "sha256=" + crypto.createHmac("sha256", CONSUMER_SECRET).update(crcToken).digest("base64");
}

const app = express();

// GET /webhook/x — disparado no registro e a cada ~24h. Nada de I/O lento aqui.
app.get("/webhook/x", (req: Request, res: Response) => {
  const crcToken = req.query.crc_token as string | undefined;
  if (!crcToken) return res.status(400).json({ error: "crc_token ausente" });
  return res.status(200).json({ response_token: buildCrcResponse(crcToken) });
});
```

### 4. Registrar, listar, revalidar e deletar o webhook

Use OAuth 1.0a user context. A forma com `:env_name` é a Premium-style; a Enterprise usa webhook ID.

| Operação | Com `:env_name` |
|---|---|
| Registrar | `POST /1.1/account_activity/all/:env_name/webhooks.json?url=<URL_ENCODED>` |
| Listar | `GET /1.1/account_activity/all/:env_name/webhooks.json` |
| Revalidar / re-enable (dispara CRC) | `PUT /1.1/account_activity/all/:env_name/webhooks/:webhook_id.json` |
| Deletar | `DELETE /1.1/account_activity/all/:env_name/webhooks/:webhook_id.json` |

A URL precisa ser **HTTPS pública** e já passar no CRC (o registro **falha** se o CRC não passar). Base host atual: `https://api.x.com`.

```ts
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.X_API_KEY!,    appSecret: process.env.X_API_SECRET!,
  accessToken: process.env.X_ACCESS_TOKEN!, accessSecret: process.env.X_ACCESS_SECRET!,
});

const ENV = process.env.X_ENV_NAME!;
const res = await client.v1.post(`account_activity/all/${ENV}/webhooks.json`,
  { url: "https://api.marketero.app/webhook/x" });
// res.id => webhook_id; guarde no banco
```

### 5. Subscriptions (inscrever contas)

Uma subscription liga uma **conta de usuário** ao webhook, e exige o **OAuth 1.0a daquela conta** (ela precisa ter autorizado seu App). A conta inscrita é sempre a dona do token usado.

| Operação | Com `:env_name` |
|---|---|
| Inscrever conta atual | `POST /1.1/account_activity/all/:env_name/subscriptions.json` |
| Verificar (204 = inscrita) | `GET /1.1/account_activity/all/:env_name/subscriptions.json` |
| Listar todas | `GET /1.1/account_activity/all/:env_name/subscriptions/list.json` |
| Remover | `DELETE /1.1/account_activity/all/:env_name/subscriptions/:user_id.json` |

Enterprise suporta **milhares de subscriptions** por webhook (confirme o número no contrato).

```ts
async function subscribe(userClient: TwitterApi, env: string) {
  await userClient.v1.post(`account_activity/all/${env}/subscriptions.json`);
}
```

### 6. Estrutura dos payloads

Todo POST traz `for_user_id` (conta inscrita) + exatamente uma chave de array. Distinga pela presença da chave.

```json
// tweet_create_events (menção)
{ "for_user_id": "4337869213",
  "tweet_create_events": [{ "id_str": "1455...", "text": "@marketero_bot atendem por aqui?",
    "user": { "id_str": "12345", "screen_name": "cliente_x" } }] }
```
```json
// direct_message_events
{ "for_user_id": "4337869213",
  "direct_message_events": [{ "type": "message_create",
    "message_create": { "target": { "recipient_id": "4337869213" }, "sender_id": "12345",
      "message_data": { "text": "Qual o preço do plano?" } } }],
  "users": { "12345": { "screen_name": "cliente_x" } } }
```

```ts
function classifyEnvelope(body: Record<string, unknown>) {
  if ("direct_message_events" in body) return "dm";
  if ("tweet_create_events" in body) return "tweet";   // menção/reply
  if ("favorite_events" in body) return "like";
  if ("follow_events" in body) return "follow";
  return "unknown";
}
```

### 7. Segurança: validar `x-twitter-webhooks-signature`

Cada POST traz o header `x-twitter-webhooks-signature = sha256=<base64>` = HMAC-SHA256 do **raw body** com o `consumer_secret`. Valide **antes** de processar, com comparação em tempo constante, capturando o **raw body** (não o JSON já parseado). Responda rápido (CRC tem 3s; eventos esperam 200 em até 10s). ([docs.x.com – V2 Webhooks](https://docs.x.com/x-api/webhooks/introduction))

```ts
function isValidSignature(rawBody: Buffer, header?: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", CONSUMER_SECRET).update(rawBody).digest("base64");
  const a = Buffer.from(header), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

app.post("/webhook/x", express.raw({ type: "application/json" }), (req, res) => {
  const raw = req.body as Buffer;
  if (!isValidSignature(raw, req.header("x-twitter-webhooks-signature"))) return res.status(403).end();
  enqueue(JSON.parse(raw.toString("utf8")));  // processa async
  return res.status(200).end();               // responde rápido
});
```

**Anti-replay / idempotência:** derive chave idempotente (`tweet_create_events[].id_str`, `direct_message_events[].id`, ou hash do raw body + `for_user_id`) e descarte duplicatas via Redis `SET key NX EX <ttl>`. O X reentrega eventos (retry no Enterprise).

### 8. Operação em produção

- **Responda rápido, processe async.** Só: validar assinatura → enfileirar → `200`. IA/chamadas de API rodam em workers.
- **Re-enable após falha.** Endpoint fora do ar ou CRC falho **desabilita** o webhook → recupere com `PUT .../webhooks/:webhook_id.json`. Monitore e automatize. Enterprise oferece retry/replay.
- **CRC diário:** mantenha uptime do handler GET — falha de 24h derruba o webhook.
- **Dev local:** `ngrok http 3000` gera HTTPS público; cada novo túnel muda a URL → re-registre.

### 9. Mapeamento para o Marketero

Modelo "evento → classificação → ação" desacoplado da fonte por um adaptador que normaliza tudo para `MarketeroEvent`:

```ts
type Channel = "dm" | "mention" | "reply" | "like" | "follow";
interface MarketeroEvent {
  accountId: string;   // for_user_id (conta do cliente / tenant)
  channel: Channel;
  authorId: string; authorHandle: string; text?: string;
  sourceId: string;    // idempotência
  raw: unknown;
}

type Action =
  | { kind: "reply"; text: string }
  | { kind: "dm"; text: string }
  | { kind: "hide" }                       // ocultar reply
  | { kind: "escalate"; reason: string };  // humano

async function handle(ev: MarketeroEvent) {
  const intent = await classifyWithAI(ev);  // sentimento, intenção, urgência, spam
  switch (intent.label) {
    case "duvida_simples": return reply(ev, await draftAnswer(ev, intent));
    case "lead":           return dm(ev, await draftDmOutreach(ev, intent));
    case "ofensa_spam":    return hideReply(ev);
    case "reclamacao":     return escalate(ev, "atendimento humano");
    default:               return escalate(ev, "baixa confiança");
  }
}
```

Fluxo: **webhook/stream/polling → validar assinatura → enfileirar → worker normaliza → classificação IA → política de ação**, com idempotência por `sourceId` e auditoria de cada decisão. Mantenha o adaptador de fonte plugável para o mesmo pipeline servir contas Enterprise (AAA) e contas em fallback de polling.

---

## Streaming e Polling (alternativas em tempo real)

Quando não há AAA, estas são as opções para capturar interações.

### Filtered Stream v2 (conexão persistente) — social listening

Captura menções/keywords/hashtags da **rede pública** via HTTP persistente. **Disponível só em Pro (fechado a novos) ou Enterprise** — não está no pay-per-use. Auth: **App-only Bearer**. ([Postproxy 2026](https://postproxy.dev/blog/x-api-pricing-2026/))

| Endpoint | Limite (per App/15min) | Notas |
|---|---|---|
| `GET /2/tweets/search/stream` | 50/15min | **1 conexão simultânea**; teto 250 posts/s |
| `POST /2/tweets/search/stream/rules` | 100/15min | até **1.000 regras**, 1.024 chars/regra |
| `GET .../rules` | 450/15min | — |

Operadores de regra: `@usuario`, `from:`, `is:reply`, `-is:retweet`. Use `backfill_minutes` na reconexão para não perder posts. ([docs.x.com – Build a rule](https://docs.x.com/x-api/posts/filtered-stream/integrate/build-a-rule))

### Filtered Stream Webhooks API & Powerstream (Enterprise)

- **Filtered Stream Webhooks** (Enterprise): entrega posts que casam com regras via **push** (sem conexão persistente). **25.000+ regras**, 2.048 chars/regra. ([docs.x.com](https://docs.x.com/x-api/webhooks/stream/introduction))
- **Powerstream** (Enterprise select): firehose filtrado de **menor latência** (substitui PowerTrack/Gnip), até 1.000 regras de 2.048 chars, `?localDcOnly=true` para reduzir latência. ([docs.x.com – Powerstream](https://docs.x.com/x-api/powerstream/introduction))

### Polling (fallback universal — funciona no pay-per-use)

| Endpoint | Limite | `since_id`? |
|---|---|---|
| `GET /2/users/:id/mentions` | 450/15min (App), 300/15min (User) | ✅ Sim |
| `GET /2/dm_events` | 15/15min (User) | ❌ Não (dedupe por `event_id`) |

### Comparativo

| Critério | AAA Webhook (Ent) | Filtered Stream v2 (Pro/Ent) | Powerstream (Ent) | Polling (qualquer) |
|---|---|---|---|---|
| Latência | Baixa (push) | ~6–7s P99 | **Menor** | Alta (intervalo) |
| Cobertura | atividade da própria conta (DM, menção, like, follow) | rede pública por regra | firehose filtrado | menções + DMs da conta |
| DM/follow/like | **Sim** | Não (só posts) | Não | DM sim; like/follow não |
| Custo | ~$42k+/mês | $5k/mês (fechado) ou Ent | Ent premium | **Baixo** ($0,005/read) |
| Complexidade | Alta (CRC, infra) | Média | Média-alta | **Baixa** |

> **Recomendação:** **MVP em polling** (`mentions` com `since_id` a cada 1–2min + `dm_events` no limite). Social listening → **Filtered Stream v2** quando houver Enterprise. DM/follow/like em tempo real → **só AAA Enterprise**.

---

## Remarketing e X Ads API

A **X Ads API** é o canal para automatizar remarketing: audiências a partir de CRM, retargeting de site/app, segmentar quem engajou e medir conversões.

### É uma API separada da v2

| Item | Valor |
|---|---|
| Base URL | `https://ads-api.x.com/12/` (versão atual **v12**) |
| Autenticação | **OAuth 1.0a** (HMAC-SHA1) — **não** usa OAuth 2.0 da v2 |
| Acesso | **Allowlist própria** via [Ads API Access Form](https://docs.x.com/x-ads-api/getting-started/step-by-step-guide); níveis **Conversion Only** ou **Standard Access** |

Para remarketing completo é preciso **Standard Access**. O custo da Ads API em si não é tarifado — você paga a **mídia/spend** das campanhas (leilão CPC/CPM/CPE) via funding instrument. ([docs.x.com – Accessing Ads accounts](https://docs.x.com/x-ads-api/fundamentals/accessing-ads-accounts))

> Use **3-legged OAuth** para operar contas de múltiplos anunciantes a partir da UI do Marketero; o token estático do app só opera a conta dona.

### Custom Audiences (Tailored Audiences) — listas de CRM

Fluxo em duas etapas: criar a "shell" e subir membros.

| Operação | Path (sob `/12/`) |
|---|---|
| Criar audiência | `POST accounts/:account_id/custom_audiences` |
| Adicionar/remover membros | `POST accounts/:account_id/custom_audiences/:id/users` |

**Identificadores:** email, telefone (E.164), Device ID (IDFA/AdID), X User ID, @handle, Partner User ID. **Hashing obrigatório: SHA-256, sem salt, lowercase** (email com trim; handle sem `@`).

| Limite | Valor |
|---|---|
| Operações por request | 2.500 |
| Payload máximo | 5.000.000 bytes |
| Rate limit | ~1.500 req/min por conta |
| Processamento | ~6–8h (batch) |
| **Tamanho mínimo para targeting** | **100 usuários** (90 dias) |

> Recomendação do X: no máximo **uma atualização de adições e uma de remoções por audiência por ciclo**. Para opt-out há a **Do Not Reach List**. ([docs.x.com – Audiences](https://docs.x.com/x-ads-api/audiences))

### Website/App remarketing — X Pixel + Conversion API (CAPI)

- **X Pixel:** tag client-side.
- **CAPI:** server-to-server, sem código no site.

`POST /12/measurement/conversions/:pixel_id` — campos: `conversion_time` (ISO 8601), `event_id`, `identifiers[]` (≥1), `conversion_id` (chave de **dedupe Pixel↔CAPI**), `value`/`contents[]` opcionais. Identificadores: `twclid`, `ip_address`+`user_agent` (sem hash, mas precisam de um secundário) ou `hashed_email`/`hashed_phone_number` (SHA-256). Rate limit: **~60.000 eventos/conta a cada 15min**. ([docs.x.com – Web conversions](https://docs.x.com/x-ads-api/measurement/web-conversions))

### Audiências de engajamento e lookalike (sem upload)

Via `targeting_criteria` na line item:

| `targeting_type` | Uso |
|---|---|
| `CUSTOM_AUDIENCE` | retargetear lista / Web/App Activity |
| `USER_ENGAGEMENT` | quem engajou com conteúdo orgânico do perfil |
| `CAMPAIGN_ENGAGEMENT` / `ENGAGEMENT_TYPE` | quem engajou com campanhas |
| `VIDEO_VIEW*` | retargeting por visualização de vídeo |
| `FOLLOWERS_OF_USER` | seguidores de um usuário |
| `SIMILAR_TO_FOLLOWERS_OF_USER` | **lookalike** |

Restrição: não dá para excluir lookalike de custom audience nem segmentar a custom audience + seu lookalike na mesma line item. ([X Business – Lookalike](https://business.x.com/en/help/campaign-setup/campaign-targeting/lookalike-audiences))

### Fluxo de campanha automatizada

Hierarquia **Account → Funding Instrument → Campaign → Line Item → Promoted Tweet/Targeting**. Passos: (1) criar audiência + subir membros hasheados; (2) criar campaign; (3) line item; (4) `targeting_criteria` com `targeting_type=CUSTOM_AUDIENCE` + ID da audiência; (5) associar criativo; (6) medir via CAPI + Analytics. ([docs.x.com – Campaign Management](https://docs.x.com/x-ads-api/campaign-management))

### Compliance de remarketing

Audiência mínima 100 usuários; hashing SHA-256 obrigatório; consentimento/base legal do anunciante + opt-out via Do Not Reach List; dedupe Pixel↔CAPI por `conversion_id`.

---

## Regras de Automação, Compliance e Bibliotecas

Compliance é **requisito de arquitetura** — violação leva a suspensão de app/conta, não só erro HTTP. Regras: [X Developer Policy](https://docs.x.com/developer-terms/policy), [Automation Rules](https://help.x.com/en/rules-and-policies/x-automation), [Platform Manipulation & Spam](https://help.x.com/en/rules-and-policies/authenticity).

| Comportamento | Status |
|---|---|
| Auto-reply a quem te mencionou/respondeu (consentido) | ✅ Permitido |
| Auto-reply em massa por busca de keyword (não solicitado) | ❌ Proibido |
| Auto-DM **só com opt-in prévio + opt-out claro** | ✅ Permitido |
| Bulk/cold DM, DM de marketing programático | ❌ Proibido |
| Conteúdo duplicado/substancialmente similar | ❌ Proibido |
| Follow/unfollow em massa ou agressivo | ❌ Proibido |
| Likes automatizados / hide replies automatizado em massa | ❌ Proibido |
| Múltiplas contas para o mesmo caso de uso | ❌ Proibido |
| Bot que não se identifica como bot | ❌ Proibido (use o rótulo "automated") |
| Usar X API/dados para **treinar/fine-tune modelos de IA** | ❌ Proibido (reforçado jun/2025) |
| Coordenação inautêntica / inflar engajamento | ❌ Suspensão permanente |

**Regras específicas de DM/reply:** auto-DM exige consentimento prévio ("requested in advance") + opt-out honrado **imediatamente**; auto-reply só para interações direcionadas a você (não keyword-spam); **disclosure de bot obrigatório** na bio/rótulo. ([Developer Policy](https://docs.x.com/developer-terms/policy))

> **Nota para o Marketero:** a proibição de **usar X API/dados para treinar/fine-tune modelos** é relevante para o GraphRAG. Posts e interações do X podem alimentar **respostas em tempo de inferência** (RAG/contexto), mas **não** treinar/fine-tune de modelo. Mantenha essa fronteira clara no design do NodeRAG.

### Bibliotecas/SDKs

| Lib | Linguagem | Cobertura | Auth |
|---|---|---|---|
| **[twitter-api-v2](https://www.npmjs.com/package/twitter-api-v2)** | Node/TS | v1.1+v2, streams, DMs, upload chunked, paginação | OAuth 1.0a / 2.0 PKCE / Bearer |
| [tweepy](https://docs.tweepy.org/en/stable/) | Python | v1.1+v2, media, streaming | OAuth 1.0a / 2.0 |

**Recomendação para o backend do Marketero (Node/TS): `twitter-api-v2`** — tipagem forte, três modos de auth, helpers de paginação/upload e wrappers de stream. **Nenhuma lib cobre a Ads API** robustamente (cliente OAuth 1.0a próprio) e **nenhuma resolve compliance** — opt-in, throttle e disclosure são responsabilidade do seu código.

### Rate limits, backoff e idempotência

Toda resposta traz `x-rate-limit-limit` / `-remaining` / `-reset`. Ao estourar: **HTTP 429 (error 88)** → ler `x-rate-limit-reset` e esperar até o reset (não retry cego; exponential backoff só para 5xx). A X **não tem idempotency-key nativa** → deduplique por `(conta, ação, hash-conteúdo, janela)` antes de `POST` (retry duplicado também é violação de política). Fila com rate-limiter **por par (app, user)**. ([docs.x.com – Rate limits](https://docs.x.com/x-api/fundamentals/rate-limits))

---

## Arquitetura recomendada para o Marketero

```
                 ┌────────── Fontes de evento (plugáveis por tier) ──────────┐
   Enterprise →  │  AAA Webhook ──┐                                          │
   Pro/Ent    →  │  Filtered Stream │                                        │
   Pay-per-use → │  Polling (mentions since_id + dm_events) ──┐              │
                 └──────────────────┴───────────────────────────┴───────────┘
                                     │
                       validar assinatura / dedupe (sourceId)
                                     │
                              Fila durável (Redis/SQS)
                                     │
                       Normalizador → MarketeroEvent
                                     │
                    Classificador IA (GraphRAG/NodeRAG)
                                     │
            Política de ação ──► responder (POST /2/tweets reply)
                              ──► DM (POST /2/dm_conversations/...)
                              ──► ocultar (PUT /2/tweets/:id/hidden)
                              ──► escalar para humano
                              ──► (remarketing) Ads API: add à Custom Audience
```

**Decisões-chave:**
1. **Abstrair a fonte de evento** — o mesmo pipeline serve AAA (Enterprise) e polling (pay-per-use); o tier do cliente só troca o adaptador de entrada.
2. **Responder rápido nos webhooks** — validar + enfileirar + `200`; classificação/IA fora do caminho do CRC (3s).
3. **Tratar Enterprise como premium** — likes/follows/quote/block e tempo-real real exigem Enterprise; precifique isso no produto.
4. **Remarketing como módulo separado** — Ads API tem OAuth 1.0a e allowlist próprios; o evento "interagiu com a marca" do pipeline alimenta `POST .../custom_audiences/:id/users`.
5. **Compliance embutido** — opt-in auditável para DM, disclosure de bot, throttle abaixo dos limites, dedupe de conteúdo. Sem isso, risco de suspensão.

---

## Fontes principais

**Plataforma / auth / pricing:** [About X API](https://docs.x.com/x-api/getting-started/about-x-api) · [Pricing](https://docs.x.com/x-api/getting-started/pricing) · [Changelog](https://docs.x.com/changelog) · [OAuth 2.0 PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code) · [v2 auth mapping](https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping) · [Rate limits](https://docs.x.com/x-api/fundamentals/rate-limits)

**Posts / engajamento / DM:** [Manage Posts](https://docs.x.com/x-api/posts/manage-tweets/introduction) · [Conversation ID](https://docs.x.com/x-api/fundamentals/conversation-id) · [Search recent](https://docs.x.com/x-api/posts/search-recent-posts) · [Hide Replies](https://developer.x.com/en/docs/x-api/tweets/hide-replies) · [Likes](https://docs.x.com/x-api/posts/likes/introduction) · [Bookmarks](https://docs.x.com/x-api/posts/bookmarks/introduction) · [Metrics](https://docs.x.com/x-api/fundamentals/metrics) · [Manage DMs](https://docs.x.com/x-api/direct-messages/manage/integrate) · [Get DM events](https://docs.x.com/x-api/direct-messages/get-dm-events-for-a-dm-conversation)

**Tempo real / webhooks:** [Account Activity (Enterprise)](https://docs.x.com/x-api/enterprise-gnip-2.0/fundamentals/account-activity) · [Securing webhooks](https://developer.x.com/en/docs/x-api/enterprise/account-activity-api/guides/securing-webhooks) · [V2 Webhooks](https://docs.x.com/x-api/webhooks/introduction) · [Filtered Stream Webhooks](https://docs.x.com/x-api/webhooks/stream/introduction) · [Build a rule](https://docs.x.com/x-api/posts/filtered-stream/integrate/build-a-rule) · [Powerstream](https://docs.x.com/x-api/powerstream/introduction)

**Ads / remarketing:** [Audiences](https://docs.x.com/x-ads-api/audiences) · [Web conversions / CAPI](https://docs.x.com/x-ads-api/measurement/web-conversions) · [Campaign Management](https://docs.x.com/x-ads-api/campaign-management) · [Accessing Ads accounts](https://docs.x.com/x-ads-api/fundamentals/accessing-ads-accounts)

**Compliance / libs:** [Developer Policy](https://docs.x.com/developer-terms/policy) · [Automation Rules](https://help.x.com/en/rules-and-policies/x-automation) · [Platform Manipulation](https://help.x.com/en/rules-and-policies/authenticity) · [twitter-api-v2](https://www.npmjs.com/package/twitter-api-v2) · [tweepy](https://docs.tweepy.org/en/stable/)

**Mudanças 2025–2026 (contexto):** [Pricing 2026 (Postproxy)](https://postproxy.dev/blog/x-api-pricing-2026/) · [XChat E2EE rollout (TechCrunch)](https://techcrunch.com/2025/09/04/xs-encrypted-dm-feature-xchat-is-rolling-out-more-broadly/) · [v1.1 media deprecation](https://devcommunity.x.com/t/deprecating-the-v1-1-media-upload-endpoints/238196) · [DM events deixaram de retornar (E2EE)](https://devcommunity.x.com/t/x-api-stops-returning-new-direct-messages-in-the-dm-events-endpoint/259751)

## Documentos relacionados

- [visao-geral.md](./visao-geral.md) — visão geral do produto e pilares.
- [concorrentes.md](./concorrentes.md) — análise de mercado e concorrentes.
