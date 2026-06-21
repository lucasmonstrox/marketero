---
tipo: investigacao
status: estável
updated: 2026-06-21
description: Build vs buy de page/form builders embedáveis, multi-tenant e white-label; recomendação Puck + SurveyJS/Formbricks pela posse total dos dados.
---

# Editores de UI — Page Builders & Form Builders

> Investigação sobre editores/construtores visuais de UI para criar **landing pages** e **formulários web** no contexto do Marketero, que pretende oferecer aos seus usuários um construtor **hosted (via URL)** e **embedável (iframe/script)**, **multi-tenant** e **white-label** (ver [visao-geral.md](../produto/visao-geral.md) §"Web forms próprios integráveis com o Meta").
>
> Pesquisa multi-fonte com verificação adversarial (23 fontes, 109 claims extraídos, 25 verificados por votação 3-votos — 2 refutados e descartados). Preços e métricas de repositório são de **2025-2026** e mudam com frequência: **reconfirme nas páginas oficiais antes de decidir**.
>
> **Resumo da decisão**: o espaço divide-se em **"build"** (bibliotecas open-source que você embute e cujos dados você possui) vs **"buy"** (SDKs/serviços embedáveis, com white-label atrás de planos pagos). Como o Marketero precisa de **controle total dos dados** (leads → mini-CRM → Meta CAPI, com dedup e hashing de PII), a recomendação pende para **build**: **Puck** (páginas) + **SurveyJS Form Library** ou **Formbricks** (formulários). "Buy" (Unlayer/Beefree/GrapesJS Studio) faz sentido se a prioridade for time-to-market e/ou e-mail builder pronto.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Page builders open-source (React/JS)](#2-page-builders-open-source-reactjs)
3. [Form builders (open-source vs SaaS)](#3-form-builders-open-source-vs-saas)
4. [Serviços com SDK embedável (páginas + e-mail)](#4-serviços-com-sdk-embedável-páginas--e-mail)
5. [White-label / multi-tenant para revenda](#5-white-label--multi-tenant-para-revenda)
6. [Build vs Buy — comparação prática](#6-build-vs-buy--comparação-prática)
7. [Recomendação para o Marketero](#7-recomendação-para-o-marketero)
8. [Mitos refutados](#8-mitos-refutados)
9. [Perguntas em aberto](#9-perguntas-em-aberto)
10. [Fontes](#10-fontes)

---

## 1. Sumário executivo

| Categoria | Opção | Licença | White-label / custo | Veredito p/ Marketero |
|---|---|---|---|---|
| **Page builder** | **Puck** | MIT | Grátis, dados seus, sem lock-in | ⭐ **Recomendação primária** |
| Page builder | Craft.js | MIT | Grátis (você constrói o editor) | Alternativa de baixo nível |
| Page builder | Plasmic | Dual (MIT + AGPL em `platform/`) | Headless API / Codegen | Híbrido; atenção à AGPL |
| **Form builder** | **SurveyJS Form Library** | MIT (rendering) | Grátis p/ renderizar; **Creator pago** | ⭐ Renderização grátis |
| Form builder | Formbricks | AGPLv3 (open-core) | **White-label grátis no self-host** | Boa relação custo/controle |
| Form builder | Form.io | OSL-3.0 (copyleft) | Licença comercial p/ SaaS | ⚠️ "servir como serviço" = distribuição |
| Form builder | OpenSurvey | MIT | Grátis | ⚠️ Imaturo demais (não usar) |
| **SDK páginas + e-mail** | Unlayer | Proprietário | Free tier; **US$250+/mês** p/ white-label+API | "Buy", cobre e-mail |
| SDK páginas + e-mail | GrapesJS Studio | Proprietário | Free 1k sessões; **US$200+/mês** | "Buy", pricing por sessão |
| SDK páginas + e-mail | Beefree SDK | Proprietário | Free tier; **US$400+/mês** | "Buy", cobre e-mail |

---

## 2. Page builders open-source (React/JS)

Bibliotecas que você **embute no próprio app Next.js** — você é dono do JSON gerado e o guarda no seu banco.

### Puck ⭐ (recomendação primária)

- **Licença**: MIT — "suitable for both internal systems and **commercial applications**".
- **O que é**: "a modular, open-source visual editor for React.js" — editor drag-and-drop pronto para usar.
- **Dados**: ao publicar, devolve **JSON limpo/migrável** que você armazena no seu backend (Postgres etc.). README é explícito: **"You own your data and there's no vendor lock-in"**.
- **Next.js**: recipes oficiais (`next` com App Router + static generation, `react-router`) via `create-puck-app`. "Plays well with all React.js environments, including Next.js".
- **Maturidade**: ~12.6k★, ~400k downloads/mês de `@puckeditor/core`, ativamente mantido.
- **Por que encaixa**: melhor opção para **multi-tenant + white-label + self-host sem custo recorrente** e com controle total do pipeline de dados.

### Craft.js

- **Licença**: MIT.
- **O que é**: "A React Framework for **building** extensible drag and drop page editors" — não é solução pronta, é o framework com que **você constrói o seu editor** (mais trabalho, controle máximo).
- **Dados**: `query.serialize()` → JSON (recomendam compressão lzutf8 + base64); persistência agnóstica (você guarda no DB e recarrega no `<Frame>`).
- **Maturidade**: maduro e mantido.

### Plasmic

- **Licença**: **dual** — MIT fora do diretório `platform/`, **AGPLv3 dentro de `platform/`** (ponto de atenção se for auto-hospedar/modificar a plataforma).
- **Integração Next.js (first-class)**: dois modelos —
  - **Headless API** (`@plasmicapp/loader-nextjs`, recomendado): fetch/render dinâmico, mais portável; requer Next.js 14+.
  - **Codegen**: gera código React no seu repositório.
- **Maturidade**: pacote ativo no npm, quickstart e guia App Router oficiais.

---

## 3. Form builders (open-source vs SaaS)

> **Padrão do mercado**: *renderizar* o formulário costuma ser grátis; o **construtor visual** (a UI de montar campos) é a parte comercial.

### SurveyJS — rendering grátis, builder pago

- **Form Library**: **MIT, grátis** — parseia JSON de formulário e renderiza formulários dinâmicos interativos.
- **Survey Creator / Dashboard / PDF Generator**: **licença paga por desenvolvedor** para uso em produção — Basic ~US$589, PRO ~US$1.059, Enterprise a partir de ~US$2.359. (Prototipagem/POC não exige licença.)
- **Implicação**: você pode renderizar formulários de graça; oferecer o **editor visual** aos seus usuários é um custo licenciado por dev.

### Formbricks

- **Licença**: **AGPLv3** (open-core).
- **White-label**: "Self-host with one click and **remove the branding from all forms for free**" — o "Remove Branding" foi movido do Enterprise para a Community Edition. (No Cloud, remover branding é pago ~US$74/mês.)
- ⚠️ **Confiança média (verificação 2-1)**: uma fonte secundária contesta o white-label grátis no self-host. **Valide na Community Edition atual antes de prometer white-label aos clientes.**

### Form.io

- **O que é**: plataforma combinada **Form + API** para apps serverless; builder drag-and-drop embedável em React/Vue/Angular/JS vanilla.
- **Licença**: **OSL-3.0** (copyleft recíproco, OSI). Trata **"oferecer a obra como serviço a usuários externos" como distribuição** → impacta diretamente SaaS que estendam a biblioteca. Há licenciamento comercial/enterprise para evitar essas obrigações.

### OpenSurvey ⚠️ (não usar em produção hoje)

- **Atraente no papel**: MIT, **multi-tenancy nativa** (schema-per-tenant via django-tenants, roteamento por path `/<org-slug>/...`), entrega hosted (links) + embed (iframe + widget JS).
- **Inviável na prática**: repo hobby de <1 mês (≈6 commits, 0 releases, 2★) e em **Django/Python (não Next.js)**. Alto risco; só com fork e investimento próprio significativo.

---

## 4. Serviços com SDK embedável (páginas + e-mail)

Cobrem **landing pages E e-mail**, mas colocam white-label/API atrás de planos pagos.

| Serviço | Free tier | Custo p/ white-label + embed real | Modelo de cobrança |
|---|---|---|---|
| **Unlayer** | Sim (Email/Page/Popup/Document builders, features básicas) | **Launch US$250/mês** (white-label, font mgmt, custom storage, AI, Cloud API) → Scale US$750 → Optimize US$2.000 | Por plano |
| **GrapesJS Studio SDK** | 1.000 sessões/mês (com branding Studio; +US$50/1.000) | Startup **US$200/mês** (20k sessões) → Business US$2.000 (50k) → Enterprise custom | **Por sessão** (difícil prever em escala) |
| **Beefree SDK** | Sim (Email + Page + Popup + File Manager em **todos** os tiers) | Essentials **US$400/mês** → Core US$1.200 → Superpowers US$3.000 → Enterprise US$5.000 | Por features (AI, colaboração, API, storage) |

**Nota**: no Unlayer e no GrapesJS, o **white-label e o acesso à Cloud API/branding customizado** — justamente o que você precisa para embutir no SaaS — só liberam a partir do primeiro plano pago. No Beefree, os builders estão em todos os tiers; a diferença é por features avançadas.

---

## 5. White-label / multi-tenant para revenda

- **Build (Puck / Craft.js)**: white-label é "de graça" por definição — é o seu próprio app, sem branding de terceiros, e o multi-tenant é resolvido na sua camada (cada tenant guarda seu JSON). **Melhor controle, zero custo recorrente.**
- **Buy (Unlayer / GrapesJS Studio / Beefree)**: white-label existe e é maduro, mas **pago** e atrelado a planos a partir de ~US$200-400/mês.
- ⚠️ **Copyleft e SaaS** (revisão jurídica recomendada): **Form.io (OSL-3.0)**, **Plasmic (`platform/` AGPLv3)** e **Formbricks (AGPLv3)** tratam "servir como serviço"/distribuição de formas que podem disparar obrigações de divulgação de código. Puck e Craft.js (MIT) não têm essa restrição.

---

## 6. Build vs Buy — comparação prática

| Critério | Build (Puck/Craft.js + SurveyJS/Formbricks) | Buy (Unlayer/Beefree/GrapesJS Studio) |
|---|---|---|
| **Custo recorrente** | ~Zero (licenças MIT) | US$200-5.000+/mês |
| **Controle dos dados** | Total (JSON no seu DB) | Depende do SDK; menos direto |
| **Lock-in** | Nenhum (MIT) | Alto |
| **White-label** | Nativo, grátis | Pago |
| **Time-to-market** | Mais lento (você integra) | Rápido |
| **E-mail builder** | Não incluso (construir à parte) | Incluso |
| **Integração CRM + Meta CAPI** | Fácil (você controla o payload) | Requer ponte sobre o SDK |
| **Risco jurídico** | Baixo (MIT) | Contratual (vendor) |

---

## 7. Recomendação para o Marketero

Dado o perfil — **Next.js, multi-tenant, white-label, leads alimentando mini-CRM + Meta CAPI** — o **controle do payload de submissão** (para deduplicar, hashear PII e enviar via CAPI) é decisivo. Isso pende fortemente para **build**.

**Stack recomendada:**

1. **Landing pages → Puck** (MIT, Next.js nativo, JSON seu, sem custo/lock-in).
2. **Formulários → SurveyJS Form Library** (MIT, renderização grátis) **ou Formbricks** (AGPLv3, white-label grátis no self-host). Se quiser também oferecer o *editor visual* de formulários da SurveyJS aos usuários, entra o custo de licença por dev.

**Quando reconsiderar "buy"** (Unlayer / Beefree / GrapesJS Studio): se **time-to-market** for prioridade absoluta e/ou houver necessidade real de **e-mail builder pronto** — assumindo US$200-2.000+/mês e white-label/API atrás de planos pagos.

**Antes de fechar**: revisão jurídica das licenças copyleft (Form.io OSL-3.0, Plasmic `platform/` AGPL, Formbricks AGPLv3) para o cenário SaaS/white-label.

---

## 8. Mitos refutados

A verificação adversarial **derrubou** estas duas afirmações — **não usar**:

- ❌ "A licença da SurveyJS proíbe construir ferramentas concorrentes / redistribuir" — **refutado (1-2)**.
- ❌ "Formbricks tem plugin WordPress oficial da comunidade para embed" — **refutado (0-3)**.

---

## 9. Perguntas em aberto

1. Stack confirmada do Marketero (Next.js App Router vs Pages, banco, infra de hosting) — restringe escolha entre componente embutido (Puck/Craft.js) vs SDK externo (Unlayer/Beefree).
2. Requisitos de **anti-spam/captcha** (Turnstile/reCAPTCHA), lógica condicional, validação e webhooks — diferenciam SurveyJS/Form.io/Formbricks.
3. Formato exato do payload de lead → **mini-CRM → Meta CAPI** (dedup, hashing de PII) e qual builder expõe melhor os eventos de submissão.
4. **E-mail builder** é necessidade real do MVP? Muda o cálculo build-vs-buy (e o volume de sessões impacta o pricing do GrapesJS Studio).

---

## 10. Fontes

**Page builders**
- Puck — <https://github.com/puckeditor/puck> · <https://puckeditor.com>
- Craft.js — <https://craft.js.org/> · <https://craft.js.org/docs/guides/save-load-state>
- Plasmic — <https://github.com/plasmicapp/plasmic> · <https://docs.plasmic.app/learn/loader-vs-codegen/> · <https://www.npmjs.com/package/@plasmicapp/loader-nextjs>

**Form builders**
- SurveyJS — <https://surveyjs.io/licensing> · <https://github.com/surveyjs/survey-library> · <https://github.com/surveyjs/survey-creator>
- Form.io — <https://github.com/formio/formio> · <https://form.io/pricing> · <https://opensource.org/license/osl-3-0-php>
- Formbricks — <https://formbricks.com/open-source-form-builder> · <https://formbricks.com/blog/remove-branding-for-free>
- OpenSurvey — <https://github.com/mohitbadwal/opensurvey>

**Serviços / SDKs embedáveis**
- Unlayer — <https://unlayer.com/pricing> · <https://unlayer.com/page-builder>
- GrapesJS Studio SDK — <https://grapesjs.com/sdk/pricing> · <https://grapesjs.com/blog/meet-studio-sdk>
- Beefree SDK — <https://developers.beefree.io/pricing-plans> · <https://github.com/BeefreeSDK>
- Plasmic (white-label / vs Builder.io) — <https://docs.plasmic.app/learn/white-label/> · <https://www.plasmic.app/vs-builder-io>
