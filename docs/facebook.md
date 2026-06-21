# Facebook / Meta — Investigação Completa da API para o Marketero (2025/2026)

> Investigação técnica de como o **Marketero** pode usar as APIs da Meta para **automatizar respostas a comentários, interações em posts, Messenger, remarketing e atendimento com IA**.
>
> Baseado na documentação oficial (`developers.facebook.com/docs`, `transparency.meta.com`) refletindo o estado da plataforma em **2025/2026 — Graph API / Marketing API v25.0** (lançada em 18/02/2026). Texto em PT-BR; nomes de API, campos, permissões e endpoints mantidos em inglês conforme a convenção da plataforma.
>
> **Nota metodológica:** as páginas `developers.facebook.com/docs` são renderizadas via JS e nem sempre devolvem corpo completo a fetchers automatizados. Os dados abaixo foram triangulados entre múltiplas fontes oficiais e secundárias. Pontos marcados com **(validar)** devem ser confirmados no **Graph API Explorer** / changelog oficial antes do go-live.

---

## Índice

1. [Resumo executivo & decisões-chave](#1-resumo-executivo--decisões-chave)
2. [Fundamentos da Graph API](#2-fundamentos-da-graph-api)
3. [Autenticação & tokens](#3-autenticação--tokens)
4. [Permissões, App Review & Business Verification](#4-permissões-app-review--business-verification)
5. [🔑 Webhooks — guia completo](#5--webhooks--guia-completo)
6. [Automação de comentários e posts (Pages API)](#6-automação-de-comentários-e-posts-pages-api)
7. [Messenger Platform (atendimento + IA)](#7-messenger-platform-atendimento--ia)
8. [Remarketing & Marketing API](#8-remarketing--marketing-api)
9. [Onboarding multi-tenant & arquitetura](#9-onboarding-multi-tenant--arquitetura)
10. [Compliance (LGPD, políticas, mensageria)](#10-compliance-lgpd-políticas-mensageria)
11. [Mapa evento → classificação → ação (núcleo do Marketero)](#11-mapa-evento--classificação--ação-núcleo-do-marketero)
12. [Checklist & deprecações importantes](#12-checklist--deprecações-importantes)

---

## 1. Resumo executivo & decisões-chave

O Marketero precisa de **quatro superfícies** da plataforma Meta, todas sobre a mesma Graph API:

| Capacidade do produto | API / Mecanismo | Permissões-chave |
|---|---|---|
| **Receber eventos** (comentário novo, mensagem, lead) em tempo real | **Webhooks** (objeto `page`) | `pages_manage_metadata` (+ a do field) |
| **Responder comentários / publicar / moderar** | **Pages API** (Graph) | `pages_manage_engagement`, `pages_manage_posts`, `pages_read_user_content` |
| **Atender no Messenger** (IA + handover p/ humano) | **Messenger Platform** (Send API + Handover) | `pages_messaging`, `human_agent` |
| **Remarketing / campanhas / leads** | **Marketing API** (Custom Audiences, CAPI, Lead Ads) | `ads_management`, `leads_retrieval`, `business_management` |

**Decisões arquiteturais load-bearing:**

1. **Modelo de negócio = Tech Provider.** Onboarding via **Facebook Login for Business (FLB)** com `config_id`, emitindo **System User (BISU) token por cliente** (não expira, isolado por portfólio). Não usar Facebook Login clássico.
2. **Bloqueantes de produção:** **App Review + Business Verification + Advanced Access** para cada permissão, **+ Data Deletion Callback** para ir *live*. Planejar cedo (no Brasil exige CNPJ/contrato social para a verificação).
3. **O fluxo central do produto é orientado a webhook:** `evento (webhook) → classificação pela IA → ação (responder/ignorar/sugerir/escalar)`. A confiabilidade da ingestão de webhooks é o alicerce — por isso a [seção 5](#5--webhooks--guia-completo) é a mais detalhada.
4. **Re-engajamento fora das 24h no Messenger** deve usar a nova **Marketing Messages API com opt-in** — **não** Recurring Notifications/OTN/Sponsored Messages (todas descontinuadas, ver [§12](#12-checklist--deprecações-importantes)).

---

## 2. Fundamentos da Graph API

- **Versão atual: `v25.0`** (lançada 18/02/2026). **Fixe a versão explicitamente em toda chamada** — chamadas sem versão resolvem para a mais antiga ainda suportada e podem quebrar sem aviso.
- **Base URL:** `https://graph.facebook.com/v25.0/...`. Upload de vídeo usa `https://graph-video.facebook.com`.
- **Política de versionamento:** ~2–3 versões/ano; cada uma é suportada por **~2 anos** após o release, depois é deprecada.

| Versão | Release | Expiração |
|---|---|---|
| **v25.0** | 18/02/2026 | TBD (atual) |
| v24.0 | 08/10/2025 | TBD |
| v23.0 | 29/05/2025 | **09/06/2026** (Marketing API) |
| v20.0 | 21/05/2024 | **24/09/2026** |
| v19.0 | 23/01/2024 | **21/05/2026** |
| v18.0 | 12/09/2023 | **26/01/2026** |

> **Ação:** mantenha uma constante única `GRAPH_API_VERSION` e um plano de *bump* trimestral, bem antes da data de expiração. **Marketing API < v24.0 é deprecada em 09/06/2026** — migrar direto para v25.0.

**Mudanças recentes a observar:**
- **Webhooks mTLS:** o certificado de client cert migrou para uma **CA própria da Meta** (`meta-outbound-api-ca-2025-12.pem`, common name `client.webhooks.fbclientcerts.com`). **Atualize a trust store dos seus endpoints até 31/03/2026** se usar mTLS.
- **Page reach/viewer metrics legados** se aposentam até junho/2026 (substituídos por *Media Views* / *Page Viewer Metric*).
- **Advantage+ via Marketing API:** a partir de v25.0 **não é possível criar/editar** Advantage+ Shopping/App campaigns via API.

---

## 3. Autenticação & tokens

Quatro tipos de access token:

| Tipo | Representa | Como obter | Expiração |
|---|---|---|---|
| **User access token** | Permissões dadas por um usuário via login | OAuth | Short-lived ~1–2h |
| **Page access token** | Age "em nome" de uma Page | Derivado de user token (`/me/accounts`) | **Não expira** se vier de long-lived user token |
| **App access token** | A própria app | `app_id\|app_secret` | Não expira; **nunca client-side** |
| **System User token (BISU)** | Usuário programático do Business Portfolio | Endpoint do System User / FLB | **Não expira** (ou 60 dias opt-in) — **recomendado p/ SaaS** |

### Fluxo de troca (recomendado para SaaS)

**1. Short-lived → long-lived user token (~60 dias):**
```
GET /v25.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={app-id}&client_secret={app-secret}
  &fb_exchange_token={short-lived-user-token}
```

**2. Long-lived user token → Page tokens (não expiram):**
```
GET /v25.0/me/accounts?access_token={LONG_LIVED_USER_TOKEN}
# cada item de data[] traz id, name, access_token (token da Page)
```
Page token derivado de long-lived user token **não expira** (só é invalidado por troca de senha, revogação de permissão, app em dev mode etc.).

### System User token (caminho ideal multi-tenant)

```
POST /{SYSTEM-USER-ID}/applications          # instala o app no system user (admin token)
  business_app={app-id}

POST /{SYSTEM-USER-ID}/access_tokens
  business_app={app-id}
  scope=ads_management,pages_read_engagement,pages_manage_posts,...
  appsecret_proof={HMAC-SHA256(app-secret, access-token)}
  set_token_expires_in_60_days=false          # false/omitido = never-expiring
```
- Use **regular System User** (não Admin) no fluxo de cliente — princípio de menor privilégio.
- Envie **`appsecret_proof`** (HMAC-SHA256 do token com o App Secret) em chamadas server-side sensíveis.

### Detecção de invalidação (essencial em multi-tenant)

- **`GET /debug_token?input_token={t}&access_token={app-token}`** → `is_valid`, `expires_at`, `data_access_expires_at`, `scopes` e **`granular_scopes`** (`{scope, target_ids[]}` — *quais Pages/ad accounts* aquele token cobre).
- **Deauthorize Callback URL** (App Dashboard → Advanced) → `POST` com `signed_request` quando o usuário remove o app.
- **Webhook `permissions`** (`granted`/`revoked`) → atualiza o store em tempo real.
- **Erro `190` (OAuthException)** e subcodes: `458` app removido, `460` senha trocada, `463` token expirou, `467` token inválido → disparar fluxo de re-auth (`auth_type=rerequest`).

---

## 4. Permissões, App Review & Business Verification

### Stack de permissões do Marketero

| Permissão | Habilita | Dependências |
|---|---|---|
| `pages_show_list` | Listar Pages que a pessoa administra | — |
| `pages_read_engagement` | Ler conteúdo, followers, metadata, insights da Page | `pages_show_list` |
| `pages_read_user_content` | Ler posts/comentários **de terceiros**; excluir comentários de usuários | `pages_show_list` |
| `pages_manage_posts` | Criar/editar/excluir posts, fotos, vídeos | `pages_read_engagement` |
| `pages_manage_engagement` | Criar/editar/excluir comentários; like/unlike | `pages_read_user_content` |
| `pages_manage_metadata` | **Assinar webhooks** e atualizar settings da Page | — |
| `pages_messaging` | Acessar conversas/Messenger; private replies | `pages_manage_metadata` |
| `human_agent` (feature) | Janela de **7 dias** p/ resposta de agente humano | processo especial de review |
| `business_management` | Business Management API; gerenciar assets; claim de ad accounts | — |
| `ads_management` | Criar/editar campanhas; ler métricas | `pages_read_engagement` |
| `ads_read` | Ads Insights API (read-only) | — |
| `leads_retrieval` | Ler dados de leads de Lead Ads | — |
| `read_insights` | Insights de Pages/apps próprios | `pages_read_engagement` |
| `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `instagram_content_publish` | Equivalentes para Instagram (mesma Graph API) | `pages_show_list` |

### Standard Access vs Advanced Access

| | Standard Access | Advanced Access |
|---|---|---|
| Funciona com | **Só** usuários com Role no app (Admin/Dev/Tester) | **Qualquer** usuário (clientes reais) |
| Como obter | Auto-concedido a apps Business | **App Review + Business Verification** por permissão |

> **Implicação prática:** enquanto você testa com contas próprias e clientes adicionados como **Testers**, **Standard Access basta (sem review)**. No momento em que clientes reais conectam Pages/ad accounts, **Advanced Access é obrigatório**.

### App Review — o que a submissão exige

1. **API call recente** usando a permissão (últimos 30 dias).
2. **Test User credentials** para o reviewer logar (conta fake = rejeição automática).
3. **Screencast por permissão** (um vídeo separado por permissão, mostrando concessão + uso real; sem screencast → não aprova).
4. **Use-case notes únicas** por permissão (não copiar/colar).
5. **Privacy Policy URL** pública, app em **Live mode**.
   - Timeline típica: 2–3 dias, até ~1 semana.

### Business Verification & Data Use Checkup

- **Business Verification** é pré-requisito para Advanced Access (obrigatória desde 01/02/2023). No Brasil: **CNPJ / contrato social**; a *legal name* deve bater entre documento, Business Portfolio e site.
- **Data Use Checkup (DUC):** auto-certificação **anual** exigida de todo app live com Advanced Access (notificação 60 dias antes; não concluir → perda de acesso à API).

---

## 5. 🔑 Webhooks — guia completo

> Esta é a peça central do Marketero: é o webhook que entrega *"comentário novo"*, *"mensagem nova"*, *"lead novo"* para o seu motor `evento → classificação → ação`. Abaixo, do conceito ao código de produção.

### 5.1. O que é um webhook da Meta (modelo mental)

Em vez de você **perguntar** à API "tem comentário novo?" (polling, caro e lento), a Meta **avisa você**: quando algo muda num objeto que você assinou (ex.: o field `feed` do objeto `page`), ela faz um `POST` HTTP no **seu** servidor com o evento. Você responde `200 OK` e processa.

```
  Usuário comenta no post da Page
            │
            ▼
   ┌─────────────────┐   POST (evento)   ┌──────────────────────┐
   │   Servidores    │ ────────────────► │  SEU endpoint HTTPS  │
   │     da Meta     │                   │  (webhook receiver)  │
   └─────────────────┘ ◄──────────────── └──────────────────────┘
                          200 OK (< 2s)
```

### 5.2. Os DOIS níveis de assinatura (a maior fonte de confusão)

⚠️ Para receber eventos de uma Page, **ambos** precisam existir:

**Nível 1 — App-level (objeto + fields), feito UMA vez:**
No **App Dashboard → Webhooks** (ou via `POST /{app-id}/subscriptions`), você:
- escolhe o **object type** (`page`, `instagram`, `permissions`, `application`…);
- informa o **Callback URL** e o **Verify Token**;
- marca os **fields** que quer (`feed`, `messages`, `leadgen`…).

**Nível 2 — Page-level (`subscribed_apps`), feito POR PAGE no onboarding:**
```
POST /v25.0/{page-id}/subscribed_apps
  ?subscribed_fields=feed,messages,messaging_postbacks,mention,leadgen
  &access_token={PAGE_ACCESS_TOKEN}
# → { "success": true }
```
- Requer **`pages_manage_metadata`** e um **Page access token**.
- `GET /{page-id}/subscribed_apps` confirma; `DELETE` remove.
- **Sem o nível 2, nenhum evento daquela Page chega — sem erro algum.** É o bug nº1 de integração: o onboarding de cada novo cliente **tem que** disparar esse `POST`.

### 5.3. Configuração passo a passo (do zero)

1. **Suba um endpoint HTTPS público** com certificado TLS **válido** (self-signed **não** é aceito). Em dev, use um túnel (ngrok/cloudflared) com HTTPS.
2. **Implemente o handshake de verificação (GET)** — ver §5.4.
3. No **App Dashboard → Webhooks → objeto `Page`**, informe `Callback URL` + `Verify Token` (uma string secreta sua). A Meta faz um GET de verificação imediatamente; seu endpoint precisa devolver o `hub.challenge`.
4. **Assine os fields** desejados no Dashboard (`feed`, `messages`, `leadgen`, …).
5. **Implemente o recebimento (POST)** + validação de assinatura — ver §5.5.
6. **No onboarding de cada cliente**, chame `POST /{page-id}/subscribed_apps` (§5.2 nível 2).
7. **Teste** pelo botão "Test" do Dashboard e por uma ação real (comentar no post).

### 5.4. Handshake de verificação (GET) — código

A Meta envia `GET` no Callback URL com `hub.mode=subscribe`, `hub.verify_token` e `hub.challenge`. Você valida o token e **ecoa o challenge**:

```ts
// GET /webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    return res.status(200).send(challenge); // ecoa o challenge em texto puro
  }
  return res.sendStatus(403);
});
```

### 5.5. Recebimento (POST) + assinatura `X-Hub-Signature-256`

Todo POST de evento traz o header `X-Hub-Signature-256: sha256={hex}` — um **HMAC-SHA256 do corpo bruto** usando o **App Secret** como chave. **Validar sempre**, sobre o **raw body**:

```ts
import crypto from "node:crypto";

// IMPORTANTE: capturar o raw body ANTES de qualquer JSON.parse
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

function verifyFbSignature(rawBody: Buffer, header = "", appSecret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /webhook
app.post("/webhook", (req, res) => {
  const ok = verifyFbSignature((req as any).rawBody, req.get("X-Hub-Signature-256") ?? "", process.env.FB_APP_SECRET!);
  if (!ok) return res.sendStatus(401);

  // ACK rápido: enfileira e responde já (< 2s)
  enqueue((req as any).rawBody);
  res.sendStatus(200);
});
```

> **Gotchas nº1 e nº2 (juntos respondem pela maioria das falhas):**
> 1. **Raw body**: frameworks que fazem `JSON.parse → JSON.stringify` reordenam bytes e **quebram a assinatura**. Use os bytes exatos recebidos. No Next.js App Router, leia `await req.text()` e desabilite o body parser.
> 2. O prefixo literal **`sha256=`** faz parte do header; o digest é **hex minúsculo**. (Existe um `X-Hub-Signature` SHA-1 legado — **use o SHA-256**.)

### 5.6. Estrutura do payload

```json
{
  "object": "page",
  "entry": [
    {
      "id": "PAGE_ID",
      "time": 1718900000,
      "changes": [
        { "field": "feed", "value": { "item": "comment", "verb": "add", "...": "..." } }
      ]
      // eventos de mensageria vêm em "messaging": [ ... ] em vez de "changes"
    }
  ]
}
```
- `object` indica o tipo (`page`, `instagram`…). `entry[].id` é o **Page ID** → use para resolver o **tenant**.
- Mudanças de conteúdo (posts/comentários/leads) vêm em **`changes[]`** (`field` + `value`).
- Eventos de Messenger vêm em **`messaging[]`** (um objeto de evento por item).

### 5.7. Fields de webhook do objeto `page` (catálogo para o Marketero)

| Field | Entrega | Permissão p/ subscrever |
|---|---|---|
| `feed` | Posts, **comentários**, reactions, shares, edições, remoções no feed | `pages_read_user_content` (ler conteúdo) |
| `mention` | A Page foi **marcada** em post/comentário de terceiros | `pages_read_user_content` |
| `messages` | Mensagens recebidas no Messenger | `pages_messaging` |
| `messaging_postbacks` | Cliques em botões/Get Started/persistent menu | `pages_messaging` |
| `message_reactions` | Reações a mensagens | `pages_messaging` |
| `messaging_referrals` | Entrada via m.me / CTM ads em thread existente | `pages_messaging` |
| `messaging_handovers` | Eventos do Handover Protocol (bot ↔ humano) | `pages_messaging` |
| `leadgen` | **Novo lead** de Lead Ad (entrega só o `leadgen_id`) | `leads_retrieval` |
| `ratings` | Avaliações/recomendações da Page | `pages_read_user_content` |
| `standby` | Mensagens quando o app **não** detém thread control (Handover) | `pages_messaging` |

A nível de **app** (não de page): `permissions` (`granted`/`revoked`) e `application` (deauthorize) — críticos para gestão de tokens (§3).

### 5.8. Payload do field `feed` (gatilho de auto-resposta a comentário)

```json
{
  "field": "feed",
  "value": {
    "item": "comment",            // album|comment|post|reaction|status|share|photo|video|like|mention
    "verb": "add",                // add|edit|edited|remove|hide|unhide|update|...
    "comment_id": "{post}_{cmt}",
    "post_id": "{page}_{post}",
    "parent_id": "{post}_{cmt}",  // post ou comentário pai
    "from": { "id": "...", "name": "..." },
    "message": "texto do comentário",
    "created_time": 1700000000,
    "reaction_type": "love"       // presente quando item=reaction
  }
}
```
**Roteamento por `item` + `verb`:**
- `item=comment, verb=add` → **novo comentário** → gatilho de classificação/auto-reply.
- `item=reaction, verb=add` → nova reação.
- `verb=remove` → comentário/post deletado → atualizar estado.

> ⚠️ O webhook **não traz sempre todos os dados sensíveis**. Frequentemente é preciso re-buscar: `GET /{comment-id}?fields=message,from,created_time,parent` (exige `pages_read_user_content`). Prefira re-fetch a confiar 100% no payload.

### 5.9. Escala: batching, retries, ordenação, dedup

- **Batching:** até **1000 updates** por POST, mas não garantido — sempre itere `entry[]` → `changes[]`/`messaging[]`.
- **Retries:** falha / não-200 / timeout → a Meta **reentrega** com frequência decrescente por **~36h**, depois **dropa**. Por isso o ACK precisa ser rápido e o processamento, assíncrono.
- **Ordenação:** **não** garantida — ordene por `created_time`/`timestamp` do payload, não pela ordem de chegada.
- **Dedup obrigatório:** retries reentregam o mesmo evento. Deduplique por id idempotente (`mid` de mensagem, `comment_id`+`verb`, ou hash do payload).
- **Responsividade:** endpoint deve responder em **single-digit seconds** (idealmente < 2s). Falhas continuadas **desativam** a subscription.

**Padrão de produção (ack-fast + async):**
```
verificar assinatura  →  enfileirar raw event  →  responder 200 (<2s)
        │
        └─► workers consomem → deduplicam → resolvem tenant pelo page-id
                              → re-fetch se necessário → classificam (IA) → agem
```

### 5.10. Troubleshooting — checklist quando "não chega nada"

1. **`subscribed_apps` foi chamado para essa Page?** (`GET /{page-id}/subscribed_apps`). — causa nº1.
2. **TLS válido?** Self-signed não funciona.
3. **GET de verificação** devolve o `hub.challenge` com `200`?
4. **App em Live mode** e com Advanced Access nas permissões dos fields?
5. **Assinatura** validada sobre o **raw body** (não o JSON reserializado)?
6. **Field certo?** Comentário vem em `feed`, não num field "comments" (isso é Instagram).
7. **Page tem ≥ permissões/tasks** para o field (ex.: `pages_messaging` para `messages`).
8. **Endpoint respondendo 200 rápido?** Timeouts viram retries e, depois, desativação.

---

## 6. Automação de comentários e posts (Pages API)

> Base: Graph API v25.0, com **Page Access Token** e Advanced Access. Modelo de **tasks** do New Page Experience (`CREATE_CONTENT`, `MODERATE`, `MESSAGING`, `MANAGE`) define o que o token pode fazer além do scope OAuth.

### 6.1. Publicar posts

```
# Texto / link
POST /v25.0/{page-id}/feed
  message={texto}            # aceita menção a outra Page via @[{page-id}]
  link={url}                 # ao menos message OU link
  access_token={page-token}
# → { "id": "{page-id}_{post-id}" }
```
**Agendado / rascunho:**
```
POST /{page-id}/feed
  published=false
  scheduled_publish_time={unix}   # janela válida: 10 minutos a 75 dias
  message=...
```
**Fotos** (`POST /{page-id}/photos`, com `url` ou `source` multipart, `caption`, `published`, `temporary`) e **vídeos** (`POST /{page-id}/videos`, vídeos grandes via Resumable Upload em `graph-video.facebook.com`). **Post multi-foto:** suba cada foto com `published=false` e publique via `/feed` com `attached_media=[{"media_fbid":"{photo-id}"}, ...]`.
**Permissão:** `pages_manage_posts` (+ `pages_read_engagement`, `pages_show_list`).

### 6.2. Ler posts & engajamento

```
GET /{page-id}/feed     # posts da Page + de visitantes + onde a Page foi marcada
GET /{page-id}/posts    # só posts criados pela própria Page
```
Fields úteis: `id, message, created_time, permalink_url, is_published, is_hidden, from, attachments, shares, status_type`. Insights: `GET /{post-id}/insights/{metric}` (`post_impressions`, `post_clicks`, `post_reactions_by_type_total`) — exige `read_insights`.
**Limites de leitura:** `limit` máx **100**; a API retorna ~**600 posts** publicados rankeados por ano (posts muito antigos ficam inacessíveis).

### 6.3. Comentários — ler, responder, moderar (núcleo do produto)

**Ler comentários:**
```
GET /{object-id}/comments
  ?filter=toplevel|stream            # toplevel (default) ou todos os níveis
  &order=chronological|reverse_chronological
  &summary=true                      # retorna {total_count, can_comment}
  &live_filter=filter_low_quality    # útil em Live Video
  &fields=id,message,from,created_time,like_count,comment_count,parent,is_hidden,user_likes,attachment
```

**Criar / responder comentário:**
```
POST /{post-id}/comments?message=...      # comentar num post
POST /{comment-id}/comments?message=...   # responder a um comentário (aninhado)
```
Parâmetros: `message` (aceita `@[{page-id}]`), `attachment_url` (imagem por URL), `attachment_id` (foto não publicada), `attachment_share_url` (GIF). **Permissão:** `pages_manage_engagement` + task `CREATE_CONTENT`.

**Private reply (DM via Messenger em resposta a comentário público) — recurso-chave de atendimento:**
```
POST /v25.0/{page-id}/messages
{
  "recipient": { "comment_id": "{comment-id}" },
  "message":   { "text": "{texto}" }
}
```
**Regras:** permissão **`pages_messaging`**; **janela de 7 dias** após o comentário; **uma única private reply por comentário**; abre a janela padrão de 24h para continuar a conversa.
> ⚠️ A página de referência *legada* de `private_replies` ainda cita `read_page_mailboxes` (deprecado) — o caminho atual é `pages_messaging`. **Validar no Graph API Explorer.**

**Moderar:**
```
POST /{comment-id}?is_hidden=true     # esconder (mostrar: is_hidden=false)
DELETE /{comment-id}                   # excluir → { "success": true }
POST /{comment-id}/likes               # curtir como Page
POST /{comment-id}?message=...         # editar texto
```
Campos de decisão: `can_hide, can_remove, can_comment, can_like, is_hidden, user_likes`. **Permissão:** `pages_manage_engagement` (+ `pages_read_user_content` para ler antes); `DELETE`/unlike exigem task `MODERATE`.

### 6.4. Reactions & likes

- **Ler reações:** `GET /{object-id}/reactions?type=LIKE|LOVE|WOW|HAHA|SORRY|ANGRY&summary=total_count`.
- **Curtir como Page:** `POST /{object-id}/likes` (Album, Comment, Photo, PagePost) / `DELETE` para descurtir.
- ⚠️ **Não existe `POST /reactions`** — não dá para reagir com LOVE/WOW programaticamente, só `like` via `/likes`.

### 6.5. Limitações & políticas anti-spam (crítico para automação)

- As **Community Standards (Spam)** proíbem postar/comentar/engajar em **frequência muito alta**, manual ou automática. Respostas automáticas genéricas em escala que pareçam spam podem gerar restrição.
- **Private reply:** uma por comentário; sem conteúdo **promocional** fora da janela de 24h.
- **Rate limits (BUC):** Pages API usa Business Use Case limits com token de Page/System User → `4800 × Engaged Users` em janela de 24h. Monitore `X-Business-Use-Case-Usage` (inclui `estimated_time_to_regain_access`).
- **Error codes:** `4` app rate limit, `17` user rate limit, `32` pages rate limit, `368` ação abusiva (sinal de spam), `80001` BUC excedido, `190` token inválido, `200` permissão ausente.
- **Boas práticas:** throttle por Page, backoff exponencial em 4/17/32/368, **idempotência** (não duplicar comentário em retry), re-fetch via webhook em vez de polling agressivo.

---

## 7. Messenger Platform (atendimento + IA)

> Para a IA do Marketero que auto-responde conversas e escala para humano. Use sempre versão explícita no endpoint (`/v25.0/...`).

### 7.1. Arquitetura e setup

| Peça | Papel |
|---|---|
| **Facebook Page** | Identidade pública. `recipient.id` nos webhooks = **Page ID**. |
| **Meta App** | Conecta Page ao webhook, gera tokens, define eventos. |
| **Webhook server** | Endpoint HTTPS público, responde POST em **≤ 5s**. |

Conectar a Page (nível 2 do webhook): `POST /{page-id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_referrals,messaging_handovers,message_deliveries,message_reads,...`

### 7.2. Webhook de mensagem recebida

```json
{
  "sender":    { "id": "USER_PSID" },     // PSID = Page-Scoped ID do usuário
  "recipient": { "id": "PAGE_ID" },
  "timestamp": 1748000000000,
  "message": {
    "mid": "m_AbCd...",
    "text": "Olá, vocês têm em estoque?",
    "quick_reply": { "payload": "PAYLOAD" },     // só se tocou num quick reply
    "reply_to":    { "mid": "m_Original..." },    // se respondeu a outra msg
    "attachments": [ { "type": "image", "payload": { "url": "https://cdn..." } } ]
  }
}
```
Outros eventos: `messaging_postbacks` (cliques em botões/Get Started), `message_deliveries`/`message_reads` (watermarks), `messaging_referrals` (m.me/CTM — reseta a janela de 24h), `message_echoes` (**`is_echo:true`** — eco das mensagens da própria Page; **ignore** para não criar loop).

### 7.3. Send API

```
POST /v25.0/{PAGE_ID}/messages?access_token={PAGE_ACCESS_TOKEN}
```
**Recipient:** `{"id":"<PSID>"}` (padrão) ou `{"comment_id":"..."}` / `{"post_id":"..."}` (private replies).
**`messaging_type`:** `RESPONSE` (default, ≤24h, pode promocional), `UPDATE` (≤24h, proativo não-promo), `MESSAGE_TAG` (>24h, exige `tag`).

Tipos de mensagem:
```jsonc
// Texto
{ "recipient": {"id":"<PSID>"}, "messaging_type": "RESPONSE", "message": {"text":"Olá!"} }

// Quick replies (até 13)
{ "message": { "text": "Escolha:", "quick_replies": [
  { "content_type": "text", "title": "Produtos", "payload": "VER_PRODUTOS" },
  { "content_type": "user_phone_number" }
] } }

// Generic template (carrossel, até 10 elements, 3 buttons cada)
{ "message": { "attachment": { "type":"template", "payload": {
  "template_type":"generic",
  "elements":[{ "title":"Tênis X", "image_url":"https://...", "buttons":[
    { "type":"web_url", "url":"https://...", "title":"Detalhes" },
    { "type":"postback", "title":"Comprar", "payload":"BUY_X" }
] }] } } } }
```
**`sender_action`** (request separado): `typing_on`, `typing_off`, `mark_seen`.
**Upload reutilizável:** `POST /me/message_attachments` → `attachment_id`.

### 7.4. Janela de 24h & message tags (⚠️ mudança crítica 2026)

- A **janela padrão de 24h** abre/reseta a cada **mensagem do usuário** (delivery/read **não** abrem). Dentro: conteúdo livre. Fora: só tags aprovadas / `HUMAN_AGENT` / Marketing Messages.

| Tag | Status (2026) |
|---|---|
| `CONFIRMED_EVENT_UPDATE`, `POST_PURCHASE_UPDATE`, `ACCOUNT_UPDATE` | **DEPRECATED — error 100 a partir de ~27/04/2026 (validar)** → migrar p/ Utility Templates / Marketing Messages |
| `HUMAN_AGENT` | **VÁLIDA** — janela de **7 dias**, exige permissão `human_agent`, só resposta de **agente humano** |

```json
{ "recipient": {"id":"<PSID>"}, "messaging_type":"MESSAGE_TAG", "tag":"HUMAN_AGENT", "message": {"text":"..."} }
```

### 7.5. Handover Protocol (IA ↔ humano)

Permite que o bot (Primary Receiver) passe a conversa para o **Page Inbox** (humano) e a retome.

```
POST /{page-id}/pass_thread_control    { recipient:{id}, target_app_id, metadata }
POST /{page-id}/take_thread_control    { recipient:{id}, metadata }
POST /{page-id}/request_thread_control  { recipient:{id}, metadata }
GET  /me/thread_owner?recipient=<PSID>  # quem detém a thread
```
- **Page Inbox** = app especial, **app id `263902037430900`** (alvo do handover para humano).
- Quando não detém o controle, o app ouve pelo canal **`standby`** (mantém contexto).
- **Fluxo do Marketero:** bot responde → detecta intenção de escalonamento → `pass_thread_control` p/ `263902037430900` → humano atende pela Inbox → ao concluir, devolve via `take_thread_control`/`pass_thread_control`.

### 7.6. Conversations API (histórico, read-only)

```
GET /{page-id}/conversations?platform=messenger&fields=participants,updated_time,message_count,unread_count,snippet,link
GET /{conversation-id}?fields=messages
GET /{message-id}?fields=message,from,to,created_time,attachments
```
Permissões: `pages_messaging`, `pages_read_engagement`, `pages_manage_metadata`. **Limite:** o thread lista todos os IDs, mas só dá detalhes das **20 mensagens mais recentes**.

### 7.7. Profile, personas, atribuição

- **Messenger Profile API** (`POST /{page-id}/messenger_profile`): `persistent_menu`, `get_started`, `greeting` (com `{{user_first_name}}`), `ice_breakers`, `whitelisted_domains`.
- **Personas API** (`POST /{page-id}/personas`): separar identidade da IA vs atendentes humanos sem trocar token (incluir `persona_id` no send).
- **Click-to-Messenger ads & m.me:** `https://m.me/{page}?ref={param}`. Atribuição de CTM vem **embutida na 1ª mensagem** (`message.referral` com `ad_id`, `ref`, `ads_context_data`) → roteamento campaign-aware. Requer subscrição em `messages` + `messaging_referrals`.

### 7.8. Políticas de mensageria

- Promocional fora das 24h via tags = **proibido**.
- **Bot disclosure** quando exigido por lei (revelar que é experiência automatizada).
- Bot deve responder **≤ 30s**. Spam/excesso → enforcement (webhook `messaging_policy_enforcement`).
- **Produtos descontinuados (não construir sobre):** Sponsored Messages (removido), One-Time Notification (deprecated), **Recurring Notifications (desligada globalmente em 10/02/2026)**, Customer Chat Plugin (descontinuado 09/05/2024). Substituto para re-engajamento: **Marketing Messages on Messenger API** (com opt-in, disponibilidade **por país** — validar para o Brasil).

---

## 8. Remarketing & Marketing API

### 8.1. Hierarquia

`Ad Account (act_{id})` → `Campaign` (define `objective`) → `Ad Set` (define `targeting`, budget, `optimization_goal`) → `Ad` → `Ad Creative`.
**Access:** Development Access (dev) vs **Standard Access / "Marketing API Access Tier"** (App Review → Advanced Access, necessário para produção e contas de terceiros).

### 8.2. Custom Audiences (núcleo do remarketing)

**Customer File (lista de clientes do CRM):**
```
POST /v25.0/act_{ad-account-id}/customaudiences
  name=..., subtype=CUSTOM, customer_file_source=USER_PROVIDED_ONLY
# → { "id": "<CA_ID>" }

POST /{CA_ID}/users          # adicionar
POST /{CA_ID}/usersreplace   # substituir tudo (sem resetar learning phase)
```
Payload com `schema` + `data` + `session`:
- **`schema`** (ordem dos identificadores): `EMAIL`, `PHONE`, `FN`, `LN`, `ZIP`, `CT`, `ST`, `COUNTRY`, `DOBY/M/D`, `GEN`, `MADID`, `EXTERN_ID`. **Multikey** (`["FN","LN","EMAIL","PHONE"]`) eleva muito o match rate.
- **Hashing PII obrigatório (SHA-256 hex lowercase)** após normalizar: EMAIL trim+lowercase; PHONE só dígitos com country code (E.164 sem `+`); nomes/cidade lowercase sem pontuação; COUNTRY ISO alpha-2 (`br`). **NÃO** hashear `MADID`/`EXTERN_ID`.
- **`session`**: `session_id`, `batch_seq` (de 1), `last_batch_flag`. Até **10.000 usuários/request**.

**Outros subtypes:** **Website Custom Audiences** (via Meta Pixel, com objeto `rule`/`event_sources type=pixel`, `retention_days` 1–180); **Engagement Custom Audiences** (Page, IG, vídeo, **Lead Form**, eventos).

### 8.3. Lookalike Audiences

```
POST /act_{id}/customaudiences
  subtype=LOOKALIKE, origin_audience_id=<seed>,
  lookalike_spec={"type":"similarity","ratio":0.01,"country":"BR"}
```
Seed mín. **100 membros** (ideal 1k–50k). **Value-Based Lookalike:** seed com coluna numérica de `value`/LTV prioriza clientes de maior valor.
> A Meta vem empurrando **Advantage+ Audience** como substituto do lookalike/targeting manual.

### 8.4. Meta Pixel & Conversions API (CAPI)

Pós-iOS14/ATT/LGPD, o **Pixel client-side perde sinal** (cookies, ad-blockers). A **CAPI envia eventos server-side** → mais resiliente, melhor **Event Match Quality (EMQ)** e atribuição. **Recomendação oficial: híbrido redundante** (mesmo evento via Pixel **e** CAPI, com deduplicação).

```
POST /v25.0/{PIXEL_ID}/events?access_token={TOKEN}
{
  "data": [{
    "event_name": "Purchase", "event_time": 1718972400,
    "action_source": "website", "event_id": "order_9876",
    "user_data": { "em":["<sha256>"], "ph":["<sha256>"],
                   "fbp":"fb.1...", "fbc":"fb.1...",
                   "client_ip_address":"...", "client_user_agent":"..." },
    "custom_data": { "value": 149.90, "currency": "BRL", "content_ids":["SKU-123"] }
  }]
}
```
- **Hashear (SHA-256):** `em, ph, fn, ln, ct, st, zp, country, db, ge, external_id`. **NÃO hashear:** `fbp`, `fbc`, `client_ip_address`, `client_user_agent`.
- **Standard events:** `PageView, ViewContent, AddToCart, InitiateCheckout, Purchase` (value+currency obrigatórios), `Lead, CompleteRegistration`.
- **Dedup Pixel↔CAPI:** mesmo par **`event_id` + `event_name`** dentro de 48h → descarta duplicado. Use **um único `event_id`** no `fbq('track', ..., {eventID})` e no CAPI.
- **EMQ 0–10:** mire ≥6-7 enviando o máximo de `user_data`. Use `test_event_code` em dev (remover em produção). **CAPI Gateway** é alternativa self-hosted low-code.

### 8.5. Campanhas de retargeting

```jsonc
// Campaign
POST /act_{id}/campaigns
{ "name":"Retargeting carrinho", "objective":"OUTCOME_SALES", "status":"PAUSED", "special_ad_categories":[] }

// Ad Set com targeting de remarketing
POST /act_{id}/adsets
{ "campaign_id":"...", "daily_budget":5000, "billing_event":"IMPRESSIONS",
  "optimization_goal":"OFFSITE_CONVERSIONS",
  "promoted_object": { "pixel_id":"...", "custom_event_type":"PURCHASE" },
  "targeting": {
    "geo_locations": { "countries":["BR"] },
    "custom_audiences":          [ { "id":"<visitantes_30d>" } ],  // INCLUIR
    "excluded_custom_audiences": [ { "id":"<compradores>" } ],     // EXCLUIR
    "targeting_automation": { "advantage_audience": 1 }
  } }
```
Padrão clássico: **incluir** quem visitou/abandonou, **excluir** quem comprou. **Objetivos ODAX:** `OUTCOME_SALES` (e-commerce), `OUTCOME_LEADS`, `OUTCOME_ENGAGEMENT`, `OUTCOME_TRAFFIC`, `OUTCOME_AWARENESS`, `OUTCOME_APP_PROMOTION`. **Advantage+ Audience/Placements** é o default recomendado.

### 8.6. Lead Ads (sync de leads → CRM)

```
# 1. Webhook leadgen (recomendado) entrega só o ID:
{ "field":"leadgen", "value": { "leadgen_id":123, "form_id":12, "ad_id":12, ... } }

# 2. Buscar o lead:
GET /v25.0/{leadgen-id}?fields=id,created_time,ad_id,campaign_id,form_id,field_data&access_token={page-token}

# 3. Bulk / backfill:
GET /{form-id}/leads?filtering=[{"field":"time_created","operator":"GREATER_THAN","value":<unix>}]
```
Permissão **`leads_retrieval`** + Page token + Page com Lead Ads ToS aceito. **Janela de acesso ~90 dias** → sincronize via webhook + backfill de 90 dias no onboarding.

### 8.7. Insights & reporting

```
GET /v25.0/act_{id}/insights?level=campaign
  &fields=campaign_name,impressions,reach,spend,cpc,cpm,ctr,actions,action_values,cost_per_action_type,purchase_roas
  &date_preset=last_30d&time_increment=1
```
`level`: `account|campaign|adset|ad`. Conversões vêm em arrays (`actions`, `action_values`). Use `date_preset` **ou** `time_range` (nunca os dois). Para relatórios grandes use **async jobs** (`POST` → `report_run_id` → poll → `GET /{report_run_id}/insights`).

---

## 9. Onboarding multi-tenant & arquitetura

### 9.1. Facebook Login for Business (FLB) — caminho oficial p/ SaaS

FLB é o método recomendado para Tech Providers acessarem assets dos clientes. Usa **`config_id`** (uma *configuration* no App Dashboard que pré-define token type + assets + permissões) em vez de `scope`.

**Fluxo OAuth server-side:**
```
# 1. Dialog
GET https://www.facebook.com/v25.0/dialog/oauth
  ?client_id=<APP_ID>&redirect_uri=<URI>&state=<CSRF>&response_type=code&config_id=<CONFIG_ID>

# 2. Retorno: <URI>?code=<CODE>&state=<CSRF>   (valide o state)

# 3. Troca server-to-server (usa app secret)
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?client_id=<APP_ID>&client_secret=<APP_SECRET>&redirect_uri=<URI>&code=<CODE>
```
Se a configuration for do tipo **System-User**, o token retornado é um **BISU token que não expira por tempo**, escopado àquele cliente.

### 9.2. Business Portfolio & asset sharing

- **Business Manager → Business Portfolio** (renomeação; mesmo `business-id` e mesmas edges).
- **Partner sharing (recomendado):** o cliente mantém ownership e concede acesso ao Portfolio do Marketero via Business ID de 16 dígitos. Na Graph API: `client_pages` / `client_ad_accounts`.
- **Business Asset Groups** para isolar **por cliente** (`/{group-id}/contained_pages`, `/contained_adaccounts`, …).
- **Tasks** (least-privilege): Page → `CREATE_CONTENT`/`MODERATE`/`MESSAGING`/`ANALYZE`; Ad Account → `ADVERTISE`/`ANALYZE`. Reserve `MANAGE` só quando necessário; **nunca** exponha Admin system user ao fluxo de cliente.

### 9.3. SDK & versionamento

- **SDK oficial:** [`facebook-nodejs-business-sdk`](https://www.npmjs.com/package/facebook-nodejs-business-sdk) (v24.x) + `@types/facebook-nodejs-business-sdk`. Bom para **Marketing API** (objetos tipados, batching).
- **Graph API HTTP direto** (fetch nativo do Bun) para webhooks, `debug_token`, `subscribed_apps`, troca de tokens — mais controle de versão/retry/rate-limit.
- **Recomendação:** cliente HTTP fino próprio como base + SDK oficial apenas para Marketing API.

### 9.4. Estrutura sugerida no monorepo (Bun + Turbo)

```
packages/
  meta-core/        # HTTP client tipado: versão, retry/backoff, rate-limit headers,
                    # appsecret_proof, parsing de erros (190/subcodes, 4/17/613)
  meta-auth/        # FLB OAuth (config_id), System User tokens, debug_token, rerequest
  meta-tokens/      # token store criptografado, validação proativa, mapa tenant→assets
  meta-webhooks/    # verificação GET (hub.challenge), HMAC X-Hub-Signature-256,
                    # normalização entry[]/changes[]/messaging[] → eventos internos
  channel-adapters/ # facebook-page, instagram, ads, messenger (interface comum)
apps/
  web/              # Next.js: onboarding FLB, dashboards, callbacks OAuth
  webhook-ingest/   # endpoint HTTPS dedicado de ingestão (raw body!)
  workers/          # consumidores da fila: dedup, classificação (IA), ação
```

### 9.5. Pipeline de webhook ingestion (crítico)

1. Endpoint dedicado (`apps/webhook-ingest`), **lendo o raw body** (no Next.js App Router: `await req.text()`, body parser off).
2. Verificar `X-Hub-Signature-256` sobre o raw body → 401 se inválido.
3. Enfileirar o evento cru (SQS / Cloudflare Queues / Upstash QStash / Redis Streams).
4. Responder `200` imediatamente (< 2s).
5. Workers consomem → deduplicam (`mid`/hash) → resolvem `tenant` pelo `page-id` → re-fetch se necessário → classificam (IA GraphRAG) → despacham para o adapter.

### 9.6. Resiliência

- Respeitar `X-Business-Use-Case-Usage`, `X-App-Usage`, `X-Ad-Account-Usage` → throttle/backoff por business e ad account.
- Retry com backoff exponencial + jitter para transitórios (1/2, 4/17/613). **Não** retry em 190 (vai para re-auth).
- **Idempotência** em toda escrita; **circuit breaker** por tenant.
- App Secret e tokens em **secret manager**; criptografia em repouso; nunca logar tokens.

---

## 10. Compliance (LGPD, políticas, mensageria)

### 10.1. Meta Platform Terms

- **Proibido vender/licenciar Platform Data** (mesmo declarando na privacy policy).
- Não usar dados para discriminação ou decisões de elegibilidade (moradia/emprego/crédito).
- Excluir dados quando não houver propósito legítimo / app parar / usuário pedir.
- Sub-processadores só processam **sob direção escrita** do desenvolvedor; audit rights da Meta sobrevivem 1 ano.

### 10.2. Data Deletion (bloqueante para ir live com Facebook Login)

Fornecer **uma** das opções (App Dashboard → Facebook Login → Settings):
1. **Data Deletion Request Callback URL** — webhook com `signed_request` (extrair `user_id`, iniciar exclusão, retornar JSON com `url` + `confirmation_code`).
2. **Data Deletion Instructions URL** — página de instruções manuais.

### 10.3. LGPD (Lei 13.709/2018) — Marketero (Brasil)

- **Papéis:** Marketero = **operador**; cliente = **controlador** → firmar **DPA** com cada cliente.
- **Bases legais (Art. 7):** consentimento (marketing/tracking), legítimo interesse (com LIA), execução de contrato.
- **Direitos do titular (Art. 18):** acesso, eliminação, portabilidade, revogação — mecanismo operacional integrado (ex.: remover hash da Custom Audience, parar eventos CAPI).
- **Encarregado/DPO (Art. 41):** obrigatório, contato público.
- **Transferência internacional (Art. 33):** Meta sediada nos EUA → usar **Cláusulas-Padrão Contratuais (Resolução CD/ANPD nº 19/2022)**.
- **Consentimento antes de enviar PII** (Custom Audiences/CAPI), com prova (timestamp, finalidade). **Hashing SHA-256** é minimização + exigência técnica.
- ⚠️ **`data_processing_options` / LDU é específico para leis dos EUA (CCPA/CPRA)** — **não** há flag equivalente para LGPD; a conformidade recai sobre o Marketero/cliente.

### 10.4. Advertising Standards & mensageria

- Cada ad criado via Marketing API passa por revisão (criativo + targeting). **Special Ad Categories** (moradia/emprego/crédito/política) têm targeting limitado e Custom Audiences restritas.
- Mensageria: janela 24h, `HUMAN_AGENT` 7 dias, **opt-in explícito** para marketing, **bot disclosure** quando exigido por lei.

---

## 11. Mapa evento → classificação → ação (núcleo do Marketero)

Como o modelo `evento → classificação (IA) → ação` da [visão-geral](./visao-geral.md) se materializa nas APIs:

| Evento (origem) | Webhook field | Re-fetch | Ação possível | API da ação |
|---|---|---|---|---|
| Comentário novo no post | `feed` (`item=comment, verb=add`) | `GET /{comment-id}` | Responder | `POST /{comment-id}/comments` |
| | | | Responder no privado (DM) | `POST /{page-id}/messages` (`recipient.comment_id`) |
| | | | Ignorar (spam) | esconder: `POST /{comment-id}?is_hidden=true` |
| | | | Moderar | `DELETE /{comment-id}` |
| | | | Curtir | `POST /{comment-id}/likes` |
| Reação nova | `feed` (`item=reaction`) | — | Métrica / trigger | (engajamento) |
| Page mencionada | `mention` | `GET /{post_id}` | Responder/engajar | `POST /{object-id}/comments` |
| Mensagem nova (Messenger) | `messages` | Conversations API | Responder com IA | `POST /{page-id}/messages` |
| | | | Escalar p/ humano | `pass_thread_control` |
| | | | Sugerir produto | template genérico (carrossel) |
| Lead novo (Lead Ad) | `leadgen` | `GET /{leadgen-id}` | Sync CRM / nutrir | grafo + campanha |
| Visitante site / compra | (Pixel + CAPI) | — | Remarketing | Custom Audience + Ad Set |

> **Classificação (dúvida/elogio/reclamação/intenção de compra/spam)** roda no worker com a IA GraphRAG; a ação escolhida vira uma chamada na coluna "API da ação". A janela de 24h (Messenger) e os 7 dias (private reply / `HUMAN_AGENT`) são restrições temporais que o motor de regras precisa respeitar.

---

## 12. Checklist & deprecações importantes

### Pontos de maior risco (checklist)

1. **`X-Hub-Signature-256` sobre o raw body** — erro nº1 de integração.
2. **`POST /{page-id}/subscribed_apps`** no onboarding de cada cliente — esquecer = silêncio total de eventos.
3. **Ack-fast** (200 < 2s) + fila — senão retries por 36h e desativação da subscription.
4. **App Review + Business Verification + Advanced Access** são bloqueantes para clientes reais; **Data Deletion Callback** é bloqueante para ir live.
5. **System User (BISU) tokens** > tokens de usuário individual (resiliência multi-tenant).
6. **Fixar e versionar a Graph API** (`v25.0`) com plano de bump antes das deprecações.
7. **LGPD:** Encarregado público, DPAs, SCCs (Res. 19/2022), fluxo de direitos do titular.

### Deprecações / mudanças (cheat sheet)

| Item | Status / Data |
|---|---|
| Graph API v18.0 | expira 26/01/2026 |
| Graph API v19.0 / v20.0 | expira 21/05/2026 / 24/09/2026 |
| Marketing API < v24.0 | deprecada **09/06/2026** → ir p/ v25.0 |
| Page token via `/{page-id}` | removido desde v7.0 → usar `/me/accounts` |
| `X-Hub-Signature` (SHA-1) | legado → usar `X-Hub-Signature-256` |
| Webhooks mTLS (nova CA da Meta) | atualizar trust store até **31/03/2026** |
| Message Tags `CONFIRMED_EVENT_UPDATE`/`POST_PURCHASE_UPDATE`/`ACCOUNT_UPDATE` | error 100 a partir de ~27/04/2026 **(validar)** |
| Recurring Notifications (Messenger) | **desligada globalmente 10/02/2026** → Marketing Messages |
| One-Time Notification / Sponsored Messages | deprecated / removido |
| Customer Chat Plugin | descontinuado 09/05/2024 |
| `read_page_mailboxes`, `manage_pages`, `publish_pages` | deprecados → permissões granulares |
| Advantage+ via Marketing API | criação/edição desabilitada a partir de v25.0 |
| Business Verification p/ Advanced Access | obrigatória desde 01/02/2023 |

### Pontos a validar no Graph API Explorer antes do go-live

1. Data/erro exatos da deprecação dos 3 Message Tags (~27/04/2026).
2. Disponibilidade da **Marketing Messages on Messenger API** no Brasil.
3. Caminho atual de `private_replies` (`pages_messaging`, 7 dias, 1/comentário).
4. Schema exato de Website Custom Audiences em v25.0 (`rule`+`event_sources type=pixel`).
5. Campos do Data Deletion Callback e params do Embedded Signup.

---

## Documentos relacionados

- [visao-geral.md](./visao-geral.md) — visão geral do produto Marketero.
- [concorrentes.md](./concorrentes.md) — análise de mercado.

## Fontes principais

- [Graph API Changelog / Versions](https://developers.facebook.com/docs/graph-api/changelog/versions/) · [Introducing Graph API v25.0 (fev/2026)](https://developers.facebook.com/blog/post/2026/02/18/introducing-graph-api-v25-and-marketing-api-v25/)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/) · [Access Levels](https://developers.facebook.com/docs/graph-api/overview/access-levels/) · [App Review](https://developers.facebook.com/docs/app-review)
- [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/) · [Page Webhooks Reference](https://developers.facebook.com/docs/graph-api/webhooks/reference/page) · [Page subscribed_apps](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/)
- [Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed) · [Comments edge](https://developers.facebook.com/docs/graph-api/reference/object/comments) · [private_replies](https://developers.facebook.com/docs/messenger-platform/discovery/private-replies)
- [Messenger Platform](https://developers.facebook.com/docs/messenger-platform) · [Send API](https://developers.facebook.com/docs/messenger-platform/reference/send-api/) · [Handover Protocol](https://developers.facebook.com/docs/messenger-platform/handover-protocol/)
- [Marketing API](https://developers.facebook.com/docs/marketing-api) · [Custom Audiences](https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences/) · [Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api/) · [Lead Ads](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/)
- [Facebook Login for Business](https://developers.facebook.com/docs/facebook-login/facebook-login-for-business) · [System Users](https://developers.facebook.com/docs/business-management-apis/system-users/) · [Platform Terms](https://developers.facebook.com/terms)
- [Rate Limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/) · [debug_token](https://developers.facebook.com/docs/graph-api/reference/debug_token/) · [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/)
</content>
</invoke>
