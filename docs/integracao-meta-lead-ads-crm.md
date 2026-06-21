# Facebook / Instagram Lead Ads → Inscrições → Mini-CRM — Guia de Implementação (2025/2026)

> Documento **companheiro** de [`integracao-meta-facebook.md`](./integracao-meta-facebook.md) (a "investigação geral da API da Meta"). Aqui o escopo é **estritamente** o fluxo **Lead Ads → inscrição → mini-CRM** do **Marketero**: anatomia dos Instant Forms, o webhook `leadgen`, retrieval da inscrição, permissões/lead access, modelo de dados do CRM, consentimento (LGPD) e confiabilidade operacional.
>
> Baseado na documentação oficial (`developers.facebook.com/docs`, `developers.facebook.com/blog`, `transparency.meta.com`, `facebook.com/business/help`) refletindo **Graph API / Marketing API v25.0** (18/02/2026). Texto em PT-BR; nomes de API, campos, enums, permissões e endpoints mantidos em inglês conforme a convenção da plataforma.
>
> **Não repetimos aqui** o que já está no doc geral: onboarding **FLB/`config_id`** (ver geral §1), **gestão de tokens / System User / `debug_token`** (geral §6), **App Review / Business Verification genéricos** (geral §3), **webhooks — fundamentos, handshake, `X-Hub-Signature-256`, ack-fast** (geral §5) e **LGPD genérica / Data Deletion** (geral §7). Referenciamos essas seções quando relevante e focamos no que é **específico de leads**.
>
> **Nota metodológica:** as páginas `developers.facebook.com/docs` são renderizadas via JS e nem sempre devolvem corpo completo a fetchers automatizados; os dados abaixo foram triangulados entre múltiplas fontes oficiais e secundárias. Pontos marcados com **(validar no App Dashboard / Graph API Explorer)** devem ser confirmados antes do go-live.

---

## Índice

1. [Visão geral do fluxo](#1-visão-geral-do-fluxo)
2. [Instant Forms: anatomia & criação via API](#2-instant-forms-anatomia--criação-via-api)
3. [Webhook `leadgen`: subscription, payload, teste, dedup](#3-webhook-leadgen-subscription-payload-teste-dedup)
4. [Retrieval da inscrição (GET do lead, bulk read, 90 dias)](#4-retrieval-da-inscrição-get-do-lead-bulk-read-90-dias)
5. [Permissões & Lead Access (o caminho mínimo)](#5-permissões--lead-access-o-caminho-mínimo)
6. [Arquitetura do mini-CRM (modelo de dados, dedup, lifecycle, atribuição, conversion leads)](#6-arquitetura-do-mini-crm)
7. [Consentimento & compliance de leads](#7-consentimento--compliance-de-leads)
8. [Confiabilidade & troubleshooting (testing, reconciliação, erros, Instagram)](#8-confiabilidade--troubleshooting)
9. [Checklist de pontos de maior risco](#9-checklist-de-pontos-de-maior-risco)

---

## 1. Visão geral do fluxo

O fluxo Lead Ads → CRM tem uma forma canônica e bem suportada na v25.0. A regra que define toda a arquitetura: **a Meta NÃO entrega os dados da inscrição no webhook** — o field `leadgen` (objeto `page`) entrega apenas **identificadores**. O conteúdo real (PII + respostas) exige uma **chamada GET autenticada** subsequente usando o `leadgen_id`.

```
  ┌─────────────┐    cria/publica    ┌──────────────────────┐
  │  Instant    │ ◄───────────────── │  POST /{page_id}/     │  (§2)
  │   Form      │                    │  leadgen_forms        │
  └─────┬───────┘                    └──────────────────────┘
        │ veiculado em Ad (FB/IG) ou orgânico
        ▼
  ┌─────────────┐  usuário preenche  ┌──────────────────────┐
  │  Inscrição  │ ─────────────────► │  Meta armazena lead  │  (retenção ~90d, §4/§7)
  └─────┬───────┘                    └──────────┬───────────┘
        │                                        │ dispara
        │                                        ▼
        │                          ┌──────────────────────────┐
        │   webhook leadgen (SÓ IDs)│  object=page →           │
        │ ◄────────────────────────│  entry[].changes[]       │  (§3)
        │                          │  field=leadgen, value={…}│
        ▼                          └──────────┬───────────────┘
  ┌──────────────┐  ack 200 <2s + fila        │ worker resolve tenant pelo page_id
  │ webhook-ingest│ ───────────────────────────┘
  └──────┬───────┘
         │ GET /{leadgen_id}?fields=field_data,custom_disclaimer_responses,…
         ▼
  ┌──────────────┐   re-fetch (Page token do tenant)   ┌──────────────────┐  (§4)
  │   workers    │ ──────────────────────────────────► │  Graph API v25.0 │
  └──────┬───────┘                                      └──────────────────┘
         │ persiste (idempotente por leadgen_id) + dedup de Contact
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Mini-CRM:  Lead (snapshot) → Contact (dedup) → Pipeline  │  (§6)
  │  + Consent record imutável (§7) + speed-to-lead/SLA       │
  └──────┬───────────────────────────────────────────────────┘
         │ ao mudar de estágio (qualified/won)
         ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Conversion Leads (CAPI): POST /{DATASET_ID}/events       │  (§6.6)
  │  lead_id = leadgen_id, action_source=system_generated     │
  └──────────────────────────────────────────────────────────┘
```

Pilares de confiabilidade (detalhados nas seções seguintes, alinhados ao pipeline do doc geral §8.3):

- **Ack-fast + fila**: responder `200` em <2s e processar o re-fetch de forma assíncrona (ver geral §5.9).
- **Idempotência por `leadgen_id`**: o webhook reentrega e reordena; `leadgen_id` é a chave natural única.
- **Backfill + polling de fallback**: a janela de retrieval é **~90 dias**; o webhook pode ser perdido. Backfill no onboarding + cron de reconciliação fecham o gap.
- **Fan-out multi-tenant pelo `page_id`** (= `entry[].id`) para resolver o token correto.

### Fontes

- [Webhooks for Leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/)
- [Lead Ads — Retrieving](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)
- [Webhooks for Lead Ads / CRM integration](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration)

---

## 2. Instant Forms: anatomia & criação via API

Um **Instant Form** (lead gen form) é o formulário nativo do Facebook/Instagram. Estrutura visual: **welcome/context card → questions → privacy policy + custom disclaimer (checkboxes de consentimento) → completion/thank-you screen**.

### 2.1. Tipos de form (volume vs intenção)

| Form type (UI) | Parâmetro de API | Comportamento |
|---|---|---|
| **More volume** | `is_optimized_for_quality=false` | Submissão rápida; otimizado para número de leads. |
| **Higher intent** | `is_optimized_for_quality=true` | Adiciona **review step** (tela de revisão/confirmação antes do submit) → leads mais qualificados, menor volume. |
| **Rich creative** | (não há booleano dedicado) | **Tipo de form distinto** (story/product cards/benefits) — afeta estrutura/conteúdo (`questions`, `context_card`), **não** é mapeado por um único campo. |

> Correções verificadas: `is_optimized_for_quality` é boolean (default `false`). O termo "slide-to-confirm" é UI legado, **não** é contrato de API — trate apenas como o gesto da review screen. O performance goal **Conversion leads** só existe para Instant Forms (conversion location = Instant forms) — ver §6.6.

### 2.2. Criação via API

```http
POST /v25.0/{page_id}/leadgen_forms
  name={string}                       # obrigatório
  questions=[...]                     # obrigatório (array de Question objects)
  privacy_policy={url, link_text}     # privacy_policy OU legal_content_id é obrigatório
  context_card={...}                  # welcome/intro screen
  thank_you_page={...}                # completion screen
  custom_disclaimer={...}             # consentimentos (LGPD) — §7
  tracking_parameters={string:string} # hidden fields (atribuição) — §2.5
  follow_up_action_url={uri}          # legado (sobrepõe thank_you_page.website_url)
  locale={enum}                       # idioma do disclaimer/UI da Meta
  block_display_for_non_targeted_viewer={bool}
  is_optimized_for_quality={bool}
  is_phone_sms_verify_enabled={bool}
  cover_photo={file} | cover_photo_id={numeric string}
  question_page_custom_headline={string}
# → { "id": "<form_id>" }   (numeric string)
```

Parâmetros adicionais existentes (verificados): `cover_photo_id`, `is_lead_capture_ai_agent_enabled`, `question_page_custom_headline`, `upload_gated_file`. **`allow_organic_lead_retrieval` está deprecated.**

Permissão para **criar** o form: **Page access token** com **`pages_manage_ads`** (NÃO `leads_retrieval` — esta é para *ler* leads, ver §5). Use `set_token`/System User do tenant conforme onboarding (geral §3/§9).

> **(validar no Graph API Explorer)** o valor exato de `locale` para PT-BR (`PT_BR`); o enum tem ~31 combinações `LANGUAGE_REGION` (ex.: `EN_US`, `DE_DE`, `JA_JP`).

### 2.3. Question object e enum de `type`

Cada item de `questions[]`:

```jsonc
{
  "key": "buyer_bedrooms",         // chave do campo (casa com field_data.name no retrieval)
  "label": "Quantos quartos?",
  "type": "SLIDER",                // enum (obrigatório)
  "inline_context": "Opcional",
  "options": [ /* ... */ ],         // multiple-choice ou parâmetros do SLIDER
  "dependent_conditional_questions": [ /* ... */ ],
  "conditional_questions_group_id": "<numeric string>"
}
```

O enum `type` cobre 40+ valores. **Prefill questions** (a Meta autopreenche com dados do perfil) e **custom** (`type=CUSTOM`):

| Categoria | Valores (amostra verificada) |
|---|---|
| Contato/nome | `FULL_NAME`, `FIRST_NAME`, `LAST_NAME`, `EMAIL`, `WORK_EMAIL`, `EMAIL_ALIAS`, `PHONE`, `PHONE_OTP`, `USER_PROVIDED_PHONE_NUMBER`, `WORK_PHONE_NUMBER`, `WHATSAPP_NUMBER` |
| Localização | `CITY`, `STATE`, `PROVINCE`, `COUNTRY`, `ZIP`, `POST_CODE`, `STREET_ADDRESS`, `ADDRESS_LINE_TWO` |
| Demográfico | `DOB`, `GENDER`, `EDUCATION_LEVEL`, `MILITARY_STATUS` |
| Trabalho/empresa | `COMPANY_NAME`, `JOB_TITLE`, `WEBSITE` |
| IDs nacionais | **`ID_CPF` (Brasil)**, `ID_AR_DNI`, `ID_CL_RUT`, `ID_CO_CC`, `ID_EC_CI`, `ID_PE_DNI`, `ID_MX_RFC` |
| Especiais | `CUSTOM`, `SLIDER`, `DATE_TIME` (agendamento/appointment), `STORE_LOOKUP`, `STORE_LOOKUP_WITH_TYPEAHEAD`, `VIN`, `LICENSE_PLATE`, `JOIN_CODE`, `FACEBOOK_LEAD_ID`, `MESSENGER`, `THREAD_LINK` |

Para o Brasil, o CPF é prefill `ID_CPF` (não custom question). **SLIDER** usa `options` no formato `[{"left":"1","right":"6","step":"1","value":"1"}]`.

### 2.4. Conditional **answers** (não "branching de perguntas")

> **Correção importante de nomenclatura:** o recurso oficial é **conditional answers**, não conditional questions. As **perguntas são sempre as mesmas**; o que muda são as **opções de resposta** exibidas, com base nas respostas anteriores. Não é branching de perguntas filhas.

- Campos no Question object: `dependent_conditional_questions` (array) + `conditional_questions_group_id` (numeric string, retornado após o upload do CSV).
- Na UI do Ads Manager, configura-se por **upload de CSV (UTF-8)**: linha 1 = perguntas (uma por coluna), **linha 2 obrigatoriamente em branco**, linha 3+ = opções de resposta. Só custom questions tipo "Conditional" suportam.

### 2.5. Hidden fields (tracking parameters) — atribuição

`tracking_parameters` é um JSON `{string:string}` de **hidden fields** não exibidos ao usuário, retornados junto a cada lead (em `field_data`, pela respectiva `key`). É a forma confiável de carregar `utm_*`/canal/segmento para dentro do lead.

> O limite "20 hidden fields / 250 chars" que aparece em buscas é do **LinkedIn, NÃO do Meta** — o limite real do Meta não está claro na doc. **(validar empiricamente.)**

### 2.6. Outros objetos do form

```jsonc
// context_card (Welcome Screen / intro)
{ "title": "...", "style": "LIST_STYLE" | "PARAGRAPH_STYLE",
  "content": ["paragrafo 1", "..."], "button_text": "...",
  "cover_photo": "<file>" /* ou */ "cover_photo_id": "<numeric>" }

// thank_you_page (completion). title E button_type são exigidos na prática.
{ "title": "...", "body": "...", "button_type": "VIEW_WEBSITE",
  "button_text": "...", "website_url": "...", "business_phone_number": "...",
  "country_code": "...", "short_message": "...", "button_description": "..." }
```

`thank_you_page.button_type` (enum completo): `VIEW_WEBSITE`, `CALL_BUSINESS`, `MESSAGE_BUSINESS`, `DOWNLOAD`, `SCHEDULE_APPOINTMENT`, `VIEW_ON_FACEBOOK`, `PROMO_CODE`, `NONE`, `WHATSAPP`, `P2B_MESSENGER`, `BOOK_ON_WEBSITE`. Os tipos de mensageria (`MESSAGE_BUSINESS`/`WHATSAPP`/`P2B_MESSENGER`) **não** usam `website_url`/`business_phone_number`. Defina o destino preferencialmente via `thank_you_page.website_url`; trate `follow_up_action_url` como compatibilidade legada.

### 2.7. Draft, organic, leitura e contagens

- **Draft:** `POST /{page_id}/leadgen_draft_forms` para iterar antes de publicar. **Forms publicados com leads são imutáveis** — para mudar perguntas, crie um novo form (planeje **versionamento de form** no CRM).
- **Leads orgânicos:** só chegam se `Form Configuration > Sharing = Open` (default `Restricted`). Eles **não** aparecem nos Results do Ads Manager (por isso `leads_count` via API pode ser > relatório); `organic_leads_count` os separa. `block_display_for_non_targeted_viewer=true` esconde o post orgânico fora do contexto do ad.
- **Leitura do form:** `GET /{form_id}` e `GET /{page_id}/leadgen_forms` retornam (entre outros) `id, name, status, locale, leads_count, organic_leads_count, expired_leads_count, questions, context_card, thank_you_page, privacy_policy, tracking_parameters, created_time`. `status` enum típico: `ACTIVE, ARCHIVED, DELETED, DRAFT, PAUSED`.

> **(validar no Graph API Explorer)** a referência do edge `page/leadgen_forms` é ambígua (em alguns blocos consta "You can't perform this operation on this endpoint"). Confirme `fields=...` no Explorer antes de codar o sync de forms.

### Endpoints (resumo §2)

| Método | Path | Notas |
|---|---|---|
| `POST` | `/{page_id}/leadgen_forms` | Cria form publicado. Retorna `{id}`. Requer `pages_manage_ads`. |
| `POST` | `/{page_id}/leadgen_draft_forms` | Cria rascunho. |
| `GET` | `/{form_id}` / `/{page_id}/leadgen_forms` | Lê form e schema (`questions{key,label,type}`). Cachear por `form_id`. |
| `GET` | `/{ad_account_id}/leadgen_forms` | Lista no contexto do ad account (Marketing API). |

### Fontes

- [Page › leadgen_forms (reference)](https://developers.facebook.com/docs/graph-api/reference/page/leadgen_forms/)
- [Lead Ads — Create](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/) · [Conditional questions](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/conditional-questions) · [blog 2017 conditional](https://developers.facebook.com/ads/blog/post/v2/2017/06/29/lead-ads-conditional-questions/)
- [leadgen_draft_forms](https://developers.facebook.com/docs/graph-api/reference/page/leadgen_draft_forms) · [SDK leadgenform.py](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/leadgenform.py) · [leadgencontextcard.py](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/leadgencontextcard.py)
- Help: [form types](https://www.facebook.com/business/help/1131888990173231) · [conditional](https://www.facebook.com/business/help/154286325106161) · [hidden fields](https://www.facebook.com/business/help/357992214682464)

---

## 3. Webhook `leadgen`: subscription, payload, teste, dedup

> **Fundamentos de webhooks** (handshake GET `hub.challenge`, validação `X-Hub-Signature-256` sobre raw body, ack-fast, retries, batching) estão no doc geral **§5** — não repetimos. Aqui está o que é **específico de `leadgen`**.

### 3.1. Assinatura em dois níveis (relembrando, específico de leads)

- **Nível 1 (app):** App Dashboard → Webhooks → objeto `page`, callback URL + verify token, marcar o field **`leadgen`** (geral §5.2 nível 1).
- **Nível 2 (por Page/tenant):**
  ```http
  POST /v25.0/{page_id}/subscribed_apps
    ?subscribed_fields=leadgen
    &access_token={PAGE_ACCESS_TOKEN}
  # → { "success": true }
  ```
  Requer **`pages_manage_metadata`** + Page token de alguém com a task **ADVERTISE**. **Sem o nível 2, nenhum `leadgen` chega — sem erro.** É o bug nº1.

> **Correção:** o disparo (delivery) do webhook NÃO é controlado pelo Lead Access Manager. A doc condiciona o envio apenas a: (a) a Page ter o app configurado instalado (`subscribed_apps`) e (b) a Page não ter desabilitado a App platform. O Lead Access (§5) controla a **recuperação** do dado, não o disparo. Apps em **Dev Mode não recebem** leads reais (só de teste) — enforcement desde 01/02/2019.

### 3.2. Payload exato

O `value` contém **exatamente 6 campos** (apenas IDs/metadados — nunca PII):

```json
{
  "object": "page",
  "entry": [
    {
      "id": "PAGE_ID",
      "time": 1447342026,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": 55459717045641545,
            "page_id": 153277781749,
            "form_id": 12312312312,
            "adgroup_id": 12312312312,
            "ad_id": 12312312312,
            "created_time": 1440120384
          }
        }
      ]
    }
  ]
}
```

- `created_time` = Unix timestamp (segundos). `entry[].id` = `page_id` = **chave de tenant**.
- **IDs grandes (`leadgen_id`) estouram precisão de float em JS** — trate como **string/BigInt** no parsing.
- **`ad_id` e `adgroup_id` são OPCIONAIS:** leads da Lead Ads Testing Tool e de shareable links/orgânicos **não os trazem** (vêm **ausentes** — não como `0`). Comportamento **observado pela comunidade**, não garantido pela doc. No schema/parsing, trate-os como opcionais e **sanitize `0`/string vazia como "sem ad_id"**. Use `is_organic` (no retrieval) como sinal complementar.

### 3.3. Dedup, ordenação, retries (específico de leads)

- **Idempotência por `leadgen_id`** (UNIQUE na tabela `lead`): `INSERT … ON CONFLICT (leadgen_id) DO NOTHING`.
- Ordene por **`created_time`** do payload, não pela ordem de chegada.
- O re-fetch (GET do lead) é idempotente — seguro repetir.
- ⚠️ Dedup técnico de webhook (`leadgen_id`) **≠** dedup de re-submissão real: a Meta **não** deduplica o mesmo usuário submetendo o form duas vezes — isso é dedup de **Contact** por email/telefone no CRM (§6.3).

### 3.4. Teste end-to-end

Use o **Lead Ads Testing Tool** (`developers.facebook.com/tools/lead-ads-testing`): selecione Page + form publicado, gere um test lead com dados de amostra. Ele percorre o **mesmo caminho de API** e dispara o webhook `leadgen` de forma indistinguível de um lead real (a aba *Track Status* mostra entrega + erro). Requisitos: conta com acesso **admin ou advertiser** na Page e app associado à Page.

> Caveats: (1) test leads **não trazem `ad_id`/`adgroup_id`** (campos ausentes); (2) **apenas 1 test lead por (Page+form) por vez** — clique **Delete Lead** até "You do not have a lead submitted…" antes de gerar outro; (3) test leads criados na **UI** só podem ser deletados na UI por quem os criou (um Tech Provider **não** consegue deletá-los via API). Programaticamente: `POST /{form_id}/test_leads` com `field_data` + `custom_disclaimer_responses` (ver §4/§8).

### Endpoints (resumo §3)

| Método | Path | Notas |
|---|---|---|
| `POST` | `/v25.0/{page_id}/subscribed_apps?subscribed_fields=leadgen` | Nível 2 por Page. Requer `pages_manage_metadata` + task ADVERTISE. |
| `GET` | `/v25.0/{page_id}/subscribed_apps` | Debug "não chega nada": confirmar `leadgen` em `subscribed_fields`. |
| `POST` | `/v25.0/{form_id}/test_leads` | Cria test lead; dispara webhook. Edge não suporta read/update/delete. |

### Fontes

- [Webhooks for Leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/) · [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/)
- [Page › subscribed_apps](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/) · [Webhooks for Lead Ads / CRM](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration)
- [test_leads (reference)](https://developers.facebook.com/docs/graph-api/reference/lead-gen-data/test_leads/) · [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing) · [thread: webhook sem ad_id/adgroup_id](https://developers.facebook.com/community/threads/222388786990554/)
- Exemplo de payload (gist): [tixastronauta](https://gist.github.com/tixastronauta/0b9c3b409a7ba96edffc)

---

## 4. Retrieval da inscrição (GET do lead, bulk read, 90 dias)

### 4.1. GET do lead individual

```http
GET /v25.0/{leadgen_id}
  ?fields=id,created_time,field_data,custom_disclaimer_responses,
          ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,
          form_id,is_organic,platform,partner_name,retailer_item_id
  &access_token={PAGE_ACCESS_TOKEN}
  &appsecret_proof={HMAC-SHA256(token, app_secret)}
```

Exemplo de resposta:

```json
{
  "id": "1023456789012345",
  "created_time": "2026-06-21T13:45:02+0000",
  "form_id": "12312312312",
  "ad_id": "12312312312",
  "campaign_id": "98765432100",
  "is_organic": false,
  "platform": "ig",
  "field_data": [
    { "name": "full_name",    "values": ["Maria Silva"] },
    { "name": "email",        "values": ["maria@example.com"] },
    { "name": "phone_number", "values": ["+5511999998888"] },
    { "name": "id_cpf",       "values": ["123.456.789-00"] },
    { "name": "utm_source",   "values": ["ig_stories_jun"] }
  ],
  "custom_disclaimer_responses": [
    { "checkbox_key": "optional_1", "is_checked": "1" },
    { "checkbox_key": "optional_2", "is_checked": "" }
  ]
}
```

Pontos verificados e críticos para o parser:

- **`field_data`** = array de `{ name, values[] }`. `name` é a **`key`/field_key do form** (mapear por `name`, **nunca por posição**). `values` é **SEMPRE array** (campos single → `values[0]`; multi-select → vários).
- Sem `?fields=`, a resposta é **mínima** (`id`, `created_time`, `field_data`). Peça os fields explicitamente.
- **`custom_disclaimer_responses` NÃO está em `field_data`** — precisa ser pedido explicitamente (consentimento, §7). `is_checked` é **STRING** (`"1"` marcado / `""` não marcado) — parse defensivo (`is_checked === "1"`).
- **`adgroup_id` NÃO existe** no node Lead em v25.0 — o node moderno expõe `adset_id`. `adgroup_id` é nomenclatura legada e só aparece no **payload do webhook**, não na resposta do GET.
- **`is_organic`** (boolean): `true` quando o lead chega por **compartilhamento/marcação** (exige `Sharing=Open`). Leads orgânicos **não** têm `ad_id`/`adset_id`/`campaign_id` populados. ⚠️ "Testes do anunciante" **não** são is_organic (test leads são conceito à parte). Campos de ad (`ad_id`, `campaign_id`, …) exigem **`ads_management`** + token de quem pode anunciar na conta e na Page.
- **`platform`** (string): existe no node Lead (não no webhook). Valores empíricos `fb`/`ig` **não estão documentados normativamente** → **(validar no Explorer)** antes de hardcodar.
- Campos de nicho: **`retailer_item_id`** (Dynamic/Automotive Lead Ads; no automotivo ≈ VIN), `partner_name` (semântica não confirmada oficialmente — validar). ⚠️ **NÃO** existe struct `vehicle` no node do lead — o `vehicle` documentado pertence ao **catálogo de produtos**, não ao lead.

### 4.2. Bulk read / backfill / polling de fallback

```http
GET /v25.0/{form_id}/leads
  ?fields=id,created_time,field_data,custom_disclaimer_responses,ad_id,form_id
  &filtering=[{"field":"time_created","operator":"GREATER_THAN","value":1761945743}]
  &limit=100
  &after={cursor}
  &access_token={PAGE_ACCESS_TOKEN}
```

- Edges: `GET /{form_id}/leads` (varredura completa, inclui orgânicos) e `GET /{ad_id}/leads` (só leads pagos daquele ad).
- **`filtering`** por `time_created` (atenção: o **filtro** chama-se `time_created`, mas o campo **retornado** é `created_time`). Operadores: `GREATER_THAN`, `LESS_THAN`, `GREATER_THAN_OR_EQUAL` (janela exata = `GREATER_THAN_OR_EQUAL` + `LESS_THAN`).
- Paginação **cursor-based** (`paging.cursors.after/before` + `limit`).
- ⚠️ Há **bug conhecido** do `filtering` no edge `/leads` (às vezes ignora o filtro e retorna tudo) — **não confie cegamente**: faça **dedup por lead id** e guarde um **watermark** (`created_time` do último visto).

### 4.3. Retenção de ~90 dias (regra crítica)

> **Confirmado oficialmente:** os dados do lead ficam disponíveis (Ads Manager, Business Suite **e API**) por **90 dias a partir da SUBMISSÃO** de cada lead (`created_time`). Após isso a Meta **exclui permanentemente** o dado — irrecuperável por qualquer via. Contam como `expired_leads_count` no form.

Implicações de design:

1. **Onboarding de cada Page:** backfill de até 90 dias via `GET /{form_id}/leads`.
2. **Fallback de resiliência:** cron de polling por form (watermark + dedup) para fechar gaps quando o webhook falhar.
3. **A Meta NÃO é fonte de verdade de longo prazo** — persista tudo no próprio CRM.

### 4.4. Rate limit de leitura de leads

> **Confirmado (texto oficial):** o rate limit de leitura é **`200 × 24 × (nº de leads criados nos últimos 90 dias)`** para uma Page, por janela de 24h.

- Pages novas/com poucos leads têm **teto baixíssimo** → backfill inicial deve **paginar devagar** com backoff.
- Camada adicional independente: rate limiting por app/tier (Development vs **Standard Tier**) e por Page. Inspecione headers `X-Business-Use-Case-Usage` (e `X-App-Usage`/`X-Ad-Account-Usage`).
- Códigos de erro relevantes: `4` (app), `17` (user/BUC), **`32` (Page-level — central aqui)**, `613` (custom-level Marketing API). Backoff exponencial + throttle por Page.
- Use **`appsecret_proof`** em todas as chamadas server-side (se "Require proof on graph API calls" estiver ativo, chamadas sem proof falham).
- **Page access token** é fortemente recomendado (melhor rate limit que User token); em multi-tenant, **System User token** com a Page atribuída (ver §5).

### Endpoints (resumo §4)

| Método | Path | Notas |
|---|---|---|
| `GET` | `/v25.0/{leadgen_id}?fields=…` | Re-fetch após webhook. `field_data`=[{name,values[]}]; pedir `custom_disclaimer_responses` explicitamente. |
| `GET` | `/v25.0/{form_id}/leads?filtering=…` | Bulk/backfill/polling. Janela ~90d. Cursor pagination. Dedup por id. |
| `GET` | `/v25.0/{ad_id}/leads` | Só leads pagos do ad. |
| `POST` | `/v25.0/{form_id}/test_leads` | Cria test lead (`field_data`, `custom_disclaimer_responses`). |

### Fontes

- [Lead Ads — Retrieving](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/) · [Lead Gen Data › leads](https://developers.facebook.com/docs/graph-api/reference/lead-gen-data/leads/)
- [Adgroup › leads (Ad Leads)](https://developers.facebook.com/docs/marketing-api/reference/adgroup/leads/) · [SDK lead.py](https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/main/facebook_business/adobjects/lead.py)
- [Rate Limiting (Graph API)](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/) · [Marketing API Rate Limiting](https://developers.facebook.com/docs/marketing-api/overview/rate-limiting/)
- Help: [retenção 90 dias](https://www.facebook.com/business/help/1526849577619206) · [expired leads](https://www.facebook.com/business/help/734933888443065)

---

## 5. Permissões & Lead Access (o caminho mínimo)

> O **App Review genérico / Business Verification** estão no doc geral §3. Aqui foca-se nas **DUAS camadas independentes** específicas de leads que precisam estar **ambas** satisfeitas.

### 5.1. Camada 1 — permissão do app (App Review)

**`leads_retrieval`** permite "retrieve and read all information captured by a lead ads form associated with an ad created in Ads Manager or the Marketing API". Dependências obrigatórias (enum atual): **`ads_management`, `ads_read`, `business_management`, `pages_manage_ads`, `pages_read_engagement`, `pages_show_list`** + feature **Ads Management Standard Access**. Exige **Advanced Access + Business Verification + Supplemental Terms**.

> Não existe permissão de OAuth `pages_manage_leads`. **`manage_pages` está DEPRECADA** — não usar. O controle granular fica nas **tasks de Page** e no **Leads Access Manager**.

### 5.2. Camada 2 — lead access no nível Page/Business (concedido pelo cliente)

Aprovar `leads_retrieval` **NÃO basta**: o admin do cliente precisa conceder lead access ao app/CRM/System User. Caminhos:

- **Leads Access Manager** (Business Settings → Integrations → Leads Access): 3 categorias — **people, CRM systems, partners**. Só quem tem **full control do business portfolio** pode atribuir. **Default** (sem customização): todos os Page admins têm acesso. **Ao customizar**, novos admins/CRMs ficam **sem** acesso até atribuição manual.
- **Via System User (padrão de produção multi-tenant):** atribuir a Page ao System User com a task **`MANAGE_LEADS`** (granular, princípio de menor privilégio) ou **`MANAGE`** (controle total).
  ```http
  POST /v25.0/{page_id}/assigned_users
    user={system_user_id}
    tasks=["MANAGE_LEADS"]      # ou ["MANAGE"]
    access_token={admin_token}
  ```

> **Correção:** `MANAGE_LEADS` e `MANAGE` são valores **separados e independentes** do enum `tasks` (não "MANAGE engloba MANAGE_LEADS", embora MANAGE = controle total na prática também leia leads). O enum inclui ainda `CREATE_CONTENT`, `MODERATE`, `MESSAGING`, `ADVERTISE`, `ANALYZE`, `PROFILE_PLUS_MANAGE_LEADS` (New Pages Experience), etc.

### 5.3. Diagnóstico: `has_lead_access` (health check por tenant)

```http
GET /v25.0/{page_id}?fields=has_lead_access.user_id({user_id}).app_id({app_id})
```

Retorna: `app_has_leads_permission` (o app tem `leads_retrieval`), `user_has_leads_permission` (o user/System User tem lead access na Page), **`can_access_lead`** (combinação final), `enabled_lead_access_manager`, `is_page_admin`, **`failure_reason`**, **`failure_resolution`** (como resolver), `page_id`, `user_id`. Read-only; requer `leads_retrieval`.

**Use como passo de health check no onboarding:** se `can_access_lead=false`, leia `failure_resolution` e instrua o cliente. Capture `enabled_lead_access_manager` para detectar quando o cliente customizou o manager.

### 5.4. Caminho MÍNIMO para o Marketero ler leads de um cliente

1. App com **Advanced Access em `leads_retrieval`** (+ dependências) aprovado.
2. **Business Verification + Ads Management Standard Access** concluídos.
3. Cliente concede lead access ao Marketero **OU** atribui a Page ao System User com task `MANAGE_LEADS`.
4. App **subscribed** no field `leadgen` da Page (`pages_manage_metadata`) — §3.
5. Validar com **`has_lead_access`** (`can_access_lead=true`).
6. Ler via `GET /{leadgen_id}` ou `GET /{form_id}/leads` com **System User / long-lived Page token** do tenant.

### 5.5. Erros comuns de acesso

| Erro | Causa provável | Resolução |
|---|---|---|
| `#100` "Unsupported get request" / "nonexisting field" (subcode 33) | Lead access faltante, token sem `leads_retrieval`, App Review incompleto, ou campos de ad sem `ads_management` | Chamar `has_lead_access`; revisar Lead Access Manager / task. |
| `#190` (OAuthException) | Page token expirado/revogado (admin saiu, senha trocada, app removido) | Re-auth do tenant (geral §3). |
| `#200` "Requires pages_manage_metadata permission to manage the object" | Falta `pages_manage_metadata` ao criar a subscription | Conceder permissão; reassinar `subscribed_apps`. |
| `#10` | Sem `leads_retrieval` aprovado | App Review. |

> Se o Page admin que concedeu lead access sair, a permissão fica **órfã** e o CRM para. **Prefira System User token estável** a token de humano. Apenas o business **dono** da Page pode conceder lead access a partner businesses/agências.

### Endpoints (resumo §5)

| Método | Path | Notas |
|---|---|---|
| `GET` | `/v25.0/{page_id}?fields=has_lead_access.user_id(…).app_id(…)` | Health check de acesso. Requer `leads_retrieval`. |
| `POST` | `/v25.0/{page_id}/assigned_users` | Atribui System User com `tasks=["MANAGE_LEADS"]`. Provisionamento via API. |

### Fontes

- [Permissions: leads_retrieval](https://developers.facebook.com/docs/permissions/reference/leads_retrieval/) · [Has Lead Access (reference)](https://developers.facebook.com/docs/graph-api/reference/has-lead-access/)
- [Page › assigned_users](https://developers.facebook.com/docs/graph-api/reference/page/assigned_users/) · [Lead Ads — Retrieving](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)
- Help: [Leads Access Manager](https://www.facebook.com/business/help/1440176552713521) · [acesso a leads](https://www.facebook.com/business/help/540596413257598) · [partner access](https://www.facebook.com/business/help/618808448980683)

---

## 6. Arquitetura do mini-CRM

### 6.1. Pipeline de ingestão

Reaproveita o pipeline ack-fast + fila do doc geral §8.3, especializado para leads:

```
webhook-ingest:  verificar HMAC (raw body) → enfileirar {page_id, leadgen_id, created_time} → 200 <2s
                                   │
workers:                           ▼
  1. resolver tenant pelo page_id  (mapa page_id → tenant_id + page_access_token cifrado)
  2. GET /{leadgen_id} (re-fetch)  com o Page token do tenant + appsecret_proof
  3. cache do form metadata        (GET /{page_id}/leadgen_forms → questions{key,type})
  4. INSERT lead ON CONFLICT (leadgen_id) DO NOTHING   (idempotência)
  5. upsert Contact                (dedup por email/phone normalizado+hash)
  6. consent record imutável       (custom_disclaimer_responses + snapshot do texto, §7)
  7. notificação realtime          (SSE/WebSocket + push/email) — speed-to-lead (§6.5)
backfill/cron:  GET /{form_id}/leads (watermark + dedup) — onboarding + fallback (§4.2/§4.3)
```

Se o `page_id` não estiver mapeado (Page ainda não onboardada), enfileire em **dead-letter** para reconciliação — **não descarte**.

### 6.2. Modelo de dados (DDL resumido)

> Princípio: **Lead = snapshot imutável** da submissão (1 por `leadgen_id`); **Contact = entidade deduplicada** (1 pessoa, N leads). Form/Question metadata para mapear `field_data.name`. Consent imutável separado. Isolamento rígido por `tenant_id` (exigência de ToS — §7).

```sql
-- Tenant (cliente do Marketero) e a Page conectada
CREATE TABLE crm_tenant (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL
);

CREATE TABLE meta_page (
  page_id             TEXT PRIMARY KEY,         -- = entry[].id do webhook (chave de fan-out)
  tenant_id           UUID NOT NULL REFERENCES crm_tenant(id),
  page_access_token   BYTEA NOT NULL,           -- cifrado em repouso (secret manager)
  lead_access_ok      BOOLEAN DEFAULT FALSE,    -- cache de has_lead_access.can_access_lead
  subscribed_leadgen  BOOLEAN DEFAULT FALSE
);

-- Snapshot do form no momento da captura (forms são editáveis/versionáveis)
CREATE TABLE lead_form (
  form_id          TEXT NOT NULL,
  tenant_id        UUID NOT NULL REFERENCES crm_tenant(id),
  page_id          TEXT NOT NULL REFERENCES meta_page(page_id),
  name             TEXT,
  status           TEXT,                         -- ACTIVE|PAUSED|ARCHIVED|DRAFT|DELETED
  locale           TEXT,
  questions        JSONB,                        -- [{key,label,type}]
  privacy_policy   JSONB,                        -- {url, link_text}
  custom_disclaimer JSONB,                       -- {title, body, checkboxes[{key,text,is_required,...}]}
  snapshot_at      TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (form_id, snapshot_at)             -- versionamento por snapshot
);

-- Contact deduplicado (a "pessoa")
CREATE TABLE contact (
  id               UUID PRIMARY KEY,
  tenant_id        UUID NOT NULL REFERENCES crm_tenant(id),
  email_norm       TEXT,                         -- trim+lowercase
  phone_e164       TEXT,                         -- E.164 só dígitos, +55 Brasil
  email_hash       TEXT,                         -- sha256(email_norm)
  phone_hash       TEXT,                         -- sha256(phone_e164)
  full_name        TEXT,
  cpf              TEXT,                          -- id_cpf (PII sensível — cifrar/escopo)
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, email_hash),
  UNIQUE (tenant_id, phone_hash)
);

-- Lead: snapshot imutável de UMA submissão (idempotência por leadgen_id)
CREATE TABLE lead (
  leadgen_id       TEXT PRIMARY KEY,             -- string/BigInt (não int)
  tenant_id        UUID NOT NULL REFERENCES crm_tenant(id),
  contact_id       UUID REFERENCES contact(id),
  page_id          TEXT NOT NULL,
  form_id          TEXT NOT NULL,
  form_snapshot_at TIMESTAMPTZ,                  -- liga à versão do form
  created_time     TIMESTAMPTZ NOT NULL,         -- submissão (verdade do lead)
  received_at      TIMESTAMPTZ NOT NULL,         -- chegada do webhook (latência)
  field_data       JSONB NOT NULL,               -- [{name, values[]}] cru
  -- atribuição
  ad_id            TEXT,                          -- OPCIONAL (ausente em teste/orgânico)
  adset_id         TEXT,
  campaign_id      TEXT,
  ad_name          TEXT,
  adset_name       TEXT,
  campaign_name    TEXT,
  is_organic       BOOLEAN,
  platform         TEXT,                          -- 'fb'|'ig' (validar enum)
  tracking_params  JSONB,                         -- hidden fields (utm_*) extraídos do field_data
  retailer_item_id TEXT,                          -- nicho (dynamic/automotive)
  is_test          BOOLEAN DEFAULT FALSE          -- marcação out-of-band (NÃO existe campo Meta)
);

-- Pipeline / lifecycle (separado do snapshot imutável do lead)
CREATE TABLE lead_pipeline (
  lead_id          TEXT PRIMARY KEY REFERENCES lead(leadgen_id),
  stage            TEXT NOT NULL DEFAULT 'new',  -- new|contacted|qualified|won|lost
  assigned_to      UUID,
  first_contacted_at TIMESTAMPTZ,
  time_to_first_response_s INT,                  -- speed-to-lead (§6.5)
  conversion_synced_at TIMESTAMPTZ,              -- envio Conversion Leads (§6.6)
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Custom fields (perguntas CUSTOM que não mapeiam para colunas padrão)
CREATE TABLE lead_custom_field (
  lead_id          TEXT NOT NULL REFERENCES lead(leadgen_id),
  field_key        TEXT NOT NULL,                -- question.key
  field_label      TEXT,                          -- question.label (exibição)
  values           JSONB NOT NULL,                -- array de strings
  PRIMARY KEY (lead_id, field_key)
);

-- Consent record IMUTÁVEL (prova de opt-in — §7)
CREATE TABLE lead_consent (
  lead_id          TEXT NOT NULL REFERENCES lead(leadgen_id),
  checkbox_key     TEXT NOT NULL,                -- custom_disclaimer_responses.checkbox_key
  is_checked       BOOLEAN NOT NULL,             -- parse de "1"/"" 
  is_required      BOOLEAN,                       -- do snapshot do form
  disclaimer_text  TEXT,                          -- SNAPSHOT do texto exibido (prova)
  privacy_policy_url TEXT,
  consented_at     TIMESTAMPTZ NOT NULL,         -- = lead.created_time
  PRIMARY KEY (lead_id, checkbox_key)
);
```

### 6.3. Mapeamento `field_data` → CRM

Use o metadata do form (`GET /{page_id}/leadgen_forms` → `questions[].{key,type}`, cacheado por `form_id`) para decidir:

- Se `field_data.name` casa com um **`type` padrão** conhecido (`FULL_NAME`, `EMAIL`, `PHONE`, `CITY`, `ID_CPF`, …) → coluna padrão de `contact`/`lead`.
- Se casa com a **`key` de uma pergunta `CUSTOM`** → `lead_custom_field` (preserve `label` para exibição).
- **Hidden fields** (`tracking_parameters`) chegam como entradas de `field_data` → extrair para `tracking_params`.
- **Ressincronize** o metadata quando `questions` mudar para nunca perder uma pergunta nova.

### 6.4. Dedup & normalização

- **Lead** é único por `leadgen_id` (idempotência de webhook). **Contact** é deduplicado por **email/phone normalizado+hash** — um mesmo Contact pode ter N Leads.
- **Normalização antes de hash/dedup:** `email` → trim + lowercase; `phone` → **E.164** só dígitos com country code (Brasil `+55`). Sem isso, dedup e match rate falham.
- A Meta **não** deduplica re-submissões reais (§3.3) — a dedup de pessoa é responsabilidade do CRM.

### 6.5. Lifecycle, assignment & speed-to-lead

- Estágios: `new → contacted → qualified → won/lost` (`lead_pipeline.stage`), com `assigned_to`.
- **Speed-to-lead** (instrumentar como métrica de primeira classe): gravar `received_at` (chegada do webhook) e `first_contacted_at`; calcular `time_to_first_response_s`. Ancore idealmente em **`created_time`** (verdade da submissão), e use `received_at − created_time` para medir latência de entrega da Meta.
- Disparar notificação realtime + push/email **no instante da persistência** (não em batch) — o gargalo real é a notificação ao vendedor.

> O benchmark "<5 min" é **heurística de mercado**, não requisito Meta. A Meta caracteriza o webhook como "real time" mas documenta **delay de até alguns minutos** e **não garante SLA** de latência — daí a necessidade de monitoramento próprio. Motivo técnico-oficial extra para ingerir rápido: a retenção de **~90 dias** (§4.3).

### 6.6. Conversion Leads (CAPI) — fechar o loop de volta à Meta

A **Conversions API for CRM Integration** otimiza o anúncio por **qualidade** do lead (não volume). O CRM envia eventos de estágio de funil de volta:

```http
POST /v25.0/{DATASET_ID}/events?access_token={CAPI_TOKEN}
```
```json
{
  "data": [{
    "event_name": "qualified_lead",
    "event_time": 1718972400,
    "action_source": "system_generated",
    "lead_event_source": "Marketero CRM",
    "lead_id": "1023456789012345",
    "user_data": { "lead_id": "1023456789012345" }
  }]
}
```

- **`lead_id` = o `leadgen_id`** (Meta Lead ID, 15-16 dígitos) — é o que amarra o evento ao lead original. **Só leads com Facebook Lead ID entram na otimização.** Trate como **string opaca**.
- **`action_source: "system_generated"`** (eventos gerados pelo CRM, sem interação direta) — **não** `website` (confundir com o Pixel `Lead` gera atribuição errada).
- **`event_name`** pode ser custom (`Lead`, `qualified_lead`, `closed_won`), desde que **consistente** no Events Manager.
- **Quando disparar:** ao mudar para um estágio com taxa de conversão "significativa" (~1/3 a 1/2 dos leads). Disparar **só** em `closed_won` pode ser raro demais para o algoritmo aprender.
- Pré-requisitos do programa: ~250 leads/mês, upload ≥1x/dia. `DATASET_ID` é o termo atual (antigo `PIXEL_ID`). Permissão: System User com `ads_management`.

### Endpoints (resumo §6)

| Método | Path | Notas |
|---|---|---|
| `GET` | `/v25.0/{page_id}/leadgen_forms?fields=questions{key,label,type}` | Metadata para mapear `field_data` e snapshotar form. |
| `POST` | `/v25.0/{DATASET_ID}/events` | Conversion Leads: `lead_id`=`leadgen_id`, `action_source='system_generated'`. |

### Fontes

- [Conversion Leads Integration](https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/) · [Payload spec](https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/payload-specification/) · [How to find the Lead ID](https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/how-to-find-the-lead-id/)
- [Lead Ads — Retrieving](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/) · [Webhooks for Leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/)
- [Which fields are available (Driftrock)](https://www.driftrock.com/blog/facebook-lead-ads-which-fields-are-available)

---

## 7. Consentimento & compliance de leads

> A **LGPD genérica** (papéis operador/controlador, DPA, SCCs Res. 19/2022, Encarregado, ausência de flag LDU para LGPD) está no doc geral §7. Aqui foca-se no **consentimento específico do Instant Form** e nos **Lead Ads Terms**.

### 7.1. Onde vive a prova de consentimento (3 fontes, 3 lugares)

A prova **defensável** exige juntar três coisas que vivem em endpoints diferentes:

1. **A resposta do usuário** — `custom_disclaimer_responses` do **lead** (`GET /{leadgen_id}`), array de `{ checkbox_key, is_checked }` (`is_checked` é STRING `"1"`/`""`). Pedir explicitamente — **não vem em `field_data`** nem por padrão.
2. **O TEXTO exato exibido** — vive no **form**, não no lead: `custom_disclaimer.checkboxes[].text` + `custom_disclaimer.body.text` + `privacy_policy.url/link_text`. Como forms são **editáveis**, **snapshot no momento da captura** (`lead_form.custom_disclaimer`, §6.2).
3. **O timestamp** — `created_time` do lead.

```jsonc
// custom_disclaimer (CRIAÇÃO, no form):
{
  "title": "Consentimento",
  "body": { "text": "Ao enviar, você concorda…", "url_entities": [{ "offset": 30, "length": 8, "url": "https://…" }] },
  "checkboxes": [
    { "key": "optional_1", "text": "Aceito receber comunicações de marketing",
      "is_required": false, "is_checked_by_default": false }
  ]
}
```

- A correspondência é **`checkbox_key` (retrieval) == `key` (criação)** → **defina `key` explícito** em cada checkbox, senão o mapeamento do consent fica frágil.
- `custom_disclaimer_responses` cobre **apenas os checkboxes OPCIONAIS**. Consentimentos **obrigatórios** (`is_required=true`) são implícitos na existência do lead (o usuário não submeteria sem aceitar) — **não** trate a ausência de um `checkbox_key` como "negou" sem saber se era opcional.
- **`is_checked_by_default=true` (pré-marcado) é juridicamente fraco** como consentimento (opt-in deve ser ação afirmativa) — evite para consent record defensável.
- ⚠️ `legal_content_id` é um **parâmetro de criação** (alternativa a `privacy_policy`) que referencia conteúdo legal pré-registrado — **não** é o texto do checkbox nem vem em `custom_disclaimer_responses`. Para criar o form, **`privacy_policy` OU `legal_content_id` é obrigatório** (`privacy_policy = {url, link_text ≤70 chars}`).

### 7.2. Lead Ads Terms (obrigações jurídicas específicas)

| Obrigação | Detalhe |
|---|---|
| **Proibição absoluta de venda** | "You may not sell Lead Generation Data under any circumstances" — independe de consentimento. Um SaaS que revenda leads viola os ToS (risco de ban). |
| **Uso restrito à finalidade do CTA** | Usar lead de "pedir orçamento" para newsletter exige **novo consentimento**. |
| **Proibição de commingle/augment** | Recebendo dados em nome de um anunciante, **não** pode `augment, commingle, or supplement` com dados de **outro** anunciante → **isolamento de tenant rígido**, sem enriquecimento cruzado entre clientes. |
| **Medidas técnicas e organizacionais** | Segurança proporcional ao risco; cifrar PII em repouso. |
| **Direitos do titular** | Responder a pedidos. **Não há endpoint Graph API para deletar um lead** — o direito de exclusão (LGPD art. 18) é operacionalizado **no próprio CRM** (o Marketero como operador deve construir essa função). |

### 7.3. Categorias proibidas no Instant Form

Sem permissão prévia **por escrito** da Meta, **NÃO** peça: dados financeiros (conta bancária, routing, cartão, credit score, renda, patrimônio, dívida); IDs governamentais (SSN, passaporte, CNH); números de conta (milhas, fidelidade, telefone/TV); histórico criminal; religião/crenças filosóficas; orientação/vida sexual; filiação sindical; usuários/senhas; informação de **saúde**. A Meta também aplica **filtro automático de keywords** em campos custom — termos restritos reprovam o form.

> **Special Ad Category** (classificação de **campanha**, campo `special_ad_categories`) não altera o schema do lead, mas restringe o targeting da campanha que gera o lead. Enum atual (v25.0): `NONE`, `EMPLOYMENT`, `HOUSING`, **`FINANCIAL_PRODUCTS_SERVICES`** (substituiu `CREDIT` em jan/2025), `ISSUES_ELECTIONS_POLITICS`, `ONLINE_GAMBLING_AND_GAMING`. Restrições: sem idade/gênero/CEP, raio mínimo ~15 milhas, sem Lookalike. `FINANCIAL_PRODUCTS_SERVICES` também restringe eventos de Pixel/CAPI — relevante para tracking de conversão (§6.6) desses tenants.

### Fontes

- [Lead Gen Data › leads](https://developers.facebook.com/docs/graph-api/reference/lead-gen-data/leads/) · [Retrieving (custom_disclaimer_responses)](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)
- [Lead Ads Terms of Service](https://www.facebook.com/legal/leadgen/tos) · Help: [boas práticas de dados de lead](https://www.facebook.com/business/help/829597887147190)
- Help: [categorias proibidas](https://www.facebook.com/business/help/219356599612120) · [custom disclaimer](https://www.facebook.com/business/help/1550411888622740)
- [Special Ad Category (reference)](https://developers.facebook.com/docs/marketing-api/audiences/special-ad-category/) · [transparency: privacy violations](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/)

---

## 8. Confiabilidade & troubleshooting

### 8.1. Entrega NÃO é exactly-once

- Retries com frequência decrescente; o endpoint **DEVE** responder `200 OK` (geral §5.9). ⚠️ **A janela "36h" amplamente citada é imprecisa para leadgen:** o modelo documentado de Webhooks é alerta após **~15 min** de falha contínua e **desinscrição da app** (Webhooks Disabled) após **~1h** de indisponibilidade contínua (janela de tentativas ~48h). Ou seja, o risco real não é "perder após 36h" e sim a **app ser desinscrita** — o que reforça polling/backfill.
- **A Meta não permite consultar histórico de webhooks** — persistência idempotente é obrigatória.
- Dedup por `leadgen_id`; ordenar por `created_time`.

### 8.2. Reconciliação (job de polling)

Roda `GET /{form_id}/leads` com `filtering` por `time_created` (watermark + dedup por id, contornando o bug de filtering, §4.2). Janela **< 90 dias**. Para tenants pequenos, respeitar o rate limit baixo (§4.4) — backoff.

### 8.3. Test leads e o problema do `is_test`

> **Não existe campo `is_test` no payload do lead.** Test leads aparecem como `is_organic=1` (como orgânicos reais) e **sem `ad_id`/`adgroup_id`**. ⚠️ Mas a ausência de `ad_id` **não** é garantia (um test lead contra um ad real pode carregá-lo). Distinção segura no CRM: **(a)** `field_data` com valores fictícios conhecidos da ferramenta, **(b)** **marcação out-of-band** do ambiente de teste (`lead.is_test` setado pelo pipeline). Não confie só em `is_organic` nem na ausência de `ad_id`.

`POST /{form_id}/test_leads` aceita `field_data=[{name,values[]}]` e `custom_disclaimer_responses=[{checkbox_key,is_checked}]`; retorna `{id}`; dispara o webhook real. Limpeza: 1 test lead por (Page+form) por vez (§3.4).

### 8.4. Instagram Lead Ads

> **Pipeline unificada:** Instagram usa o **MESMO** field `leadgen` no **objeto `page`** (mesma subscription `subscribed_apps`, mesmo endpoint de retrieval). O lead **pertence à Page do Facebook** mesmo quando veiculado no Instagram. **Não há** webhook nem permissão separada para IG lead forms.

- O campo **`platform`** distingue a superfície — mas vive **no node do lead** (GET de hidratação), **não no webhook**. Valores empíricos `fb`/`ig` **não documentados normativamente** → **(validar no Explorer)** antes de hardcodar; mapeie em runtime.

### 8.5. Tabela de erros (referência rápida)

| Código | Significado | Ação |
|---|---|---|
| `#100` (subcode 33) | Campo/objeto inexistente ou sem permissão (lead access faltante; campos de ad sem `ads_management`) | `has_lead_access`; revisar token/task. |
| `#190` | Token expirado/inválido | Re-auth do tenant (geral §3). |
| `#200` / `#10` | Permissão/lead access ausente (`pages_manage_metadata`, `leads_retrieval`) | Conceder permissão; reassinar `subscribed_apps`. |
| `#4` / `#17` / `#32` / `#613` | Rate limit (app / user / **Page** / custom) | Backoff exponencial + throttle por Page; ler `X-Business-Use-Case-Usage`. |

### Fontes

- [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/) · [Webhooks for Leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/)
- [Lead Ads — Testing & Troubleshooting](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/testing-troubleshooting/) · [test_leads](https://developers.facebook.com/docs/graph-api/reference/lead-gen-data/test_leads/)
- [Lead Ads — Retrieving (Instagram/platform)](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/) · [SDK LeadFields.php](https://github.com/facebook/facebook-php-business-sdk/blob/main/src/FacebookAds/Object/Fields/LeadFields.php)

---

## 9. Checklist de pontos de maior risco

1. **O webhook só traz IDs — esquecer o re-fetch `GET /{leadgen_id}` = CRM vazio.** Fluxo é sempre em duas etapas.
2. **`POST /{page_id}/subscribed_apps?subscribed_fields=leadgen`** no onboarding de cada Page — esquecer = **silêncio total**, sem erro. Confirmar via `GET /{page_id}/subscribed_apps`.
3. **DUAS camadas de acesso:** `leads_retrieval` (app) **E** lead access na Page (Leads Access Manager / task `MANAGE_LEADS`). Validar com **`has_lead_access`** (`can_access_lead=true`) por tenant antes de ler.
4. **`leadgen_id` como string/BigInt** (estoura float em JS) e **idempotência** por `leadgen_id` (UNIQUE). Ordenar por `created_time`.
5. **`field_data.values` é SEMPRE array**; mapear por `name` (nunca por posição); nomes custom usam a `key` do form.
6. **`ad_id`/`adgroup_id` OPCIONAIS** (ausentes em teste/orgânico; sanitizar `0`/vazio como ausência). **`adgroup_id` não existe no node do lead** (só no webhook) — use `adset_id`.
7. **`custom_disclaimer_responses` separado de `field_data`, pedir explícito; `is_checked` é STRING `"1"`/`""`.** Snapshotar o **texto** do disclaimer do form (prova LGPD). Persistir consent imutável.
8. **Retenção ~90 dias = exclusão permanente.** Backfill no onboarding + cron de reconciliação (watermark+dedup, contornando bug de filtering). A Meta **não** é fonte de verdade.
9. **Rate limit de leitura baixo** para Pages novas (`200×24×leads_90d`); polling devagar + backoff; código `#32` (Page-level).
10. **Validar `X-Hub-Signature-256` sobre o raw body** (geral §5.5) — em Next.js/Bun, capturar o corpo cru antes do parse.
11. **System User token estável** por tenant (não token de humano, que quebra quando o admin sai); resolver token pelo `page_id` antes do GET.
12. **ToS de leads:** proibição absoluta de **venda**; **isolamento rígido por tenant** (sem commingle/augment entre clientes); uso restrito à finalidade do CTA; ferramenta de exclusão no CRM (não há endpoint Meta de delete).
13. **Conversion Leads:** `lead_id` = `leadgen_id` exato; `action_source='system_generated'`; disparar em estágio com conversão significativa.
14. **Instagram = mesma pipeline** (`leadgen`/objeto `page`); `platform` vem no GET, não no webhook — validar enum `fb`/`ig` em runtime.

### Pontos a validar no App Dashboard / Graph API Explorer antes do go-live

1. Valor exato de `locale` PT-BR e lista completa de `fields` de `GET /{form_id}` em v25.0.
2. Enum literal de `platform` (`fb`/`ig`/`instagram`?) com um lead real de cada superfície.
3. Formato exato de `dependent_conditional_questions` via API (sem o CSV da UI) e limite real de `tracking_parameters`.
4. Se, com System User + task `MANAGE_LEADS`, ainda é exigido toggle manual no Leads Access Manager para o CRM aparecer na lista.
5. Se `custom_disclaimer_responses` é retornável também no bulk `/{form_id}/leads` (e não só em `GET /{leadgen_id}`).
6. Limites de paginação/`limit` e BUC do bulk read para dimensionar backfill de 90 dias em tenants de alto volume.

---

## Documentos relacionados

- [integracao-meta-facebook.md](./integracao-meta-facebook.md) — investigação geral da API da Meta (webhooks, tokens, permissões, FLB, Messenger, Marketing API, LGPD).
- [visao-geral.md](./visao-geral.md) — visão geral do produto Marketero.
- [instagram.md](./instagram.md) — investigação específica do Instagram.

## Fontes principais

- [Webhooks for Leadgen](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-for-leadgen/) · [Webhooks Getting Started](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/) · [Webhooks for Lead Ads / CRM](https://developers.facebook.com/documentation/ads-commerce/marketing-api/guides/lead-ads/quickstart/webhooks-integration)
- [Lead Ads — Create](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create/) · [Retrieving](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/) · [Testing & Troubleshooting](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/testing-troubleshooting/)
- [Page › leadgen_forms](https://developers.facebook.com/docs/graph-api/reference/page/leadgen_forms/) · [Lead Gen Data › leads](https://developers.facebook.com/docs/graph-api/reference/lead-gen-data/leads/) · [test_leads](https://developers.facebook.com/docs/graph-api/reference/lead-gen-data/test_leads/) · [Adgroup › leads](https://developers.facebook.com/docs/marketing-api/reference/adgroup/leads/)
- [Permissions: leads_retrieval](https://developers.facebook.com/docs/permissions/reference/leads_retrieval/) · [Has Lead Access](https://developers.facebook.com/docs/graph-api/reference/has-lead-access/) · [Page › assigned_users](https://developers.facebook.com/docs/graph-api/reference/page/assigned_users/) · [Page › subscribed_apps](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/)
- [Conversion Leads Integration](https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/) · [Payload spec](https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/payload-specification/)
- [Rate Limiting (Graph API)](https://developers.facebook.com/docs/graph-api/overview/rate-limiting/) · [Lead Ads Terms](https://www.facebook.com/legal/leadgen/tos) · [Special Ad Category](https://developers.facebook.com/docs/marketing-api/audiences/special-ad-category/)
- Help Center: [form types](https://www.facebook.com/business/help/1131888990173231) · [Leads Access Manager](https://www.facebook.com/business/help/1440176552713521) · [retenção 90 dias](https://www.facebook.com/business/help/1526849577619206) · [categorias proibidas](https://www.facebook.com/business/help/219356599612120)
- SDKs: [facebook-python-business-sdk](https://github.com/facebook/facebook-python-business-sdk) · [facebook-php-business-sdk LeadFields](https://github.com/facebook/facebook-php-business-sdk/blob/main/src/FacebookAds/Object/Fields/LeadFields.php)
