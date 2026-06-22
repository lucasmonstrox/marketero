---
tipo: investigacao
status: estável
updated: 2026-06-22
description: WhatsApp Business Platform (Cloud API) como canal #1 de atendimento — On-Prem morto, multi-tenant via Tech Provider+Embedded Signup, janela 24h grátis, e por que rotas não-oficiais (Z-API/Baileys) não servem de fundação.
---

# WhatsApp / Zap

> Investigação do **WhatsApp** como o **canal #1 de atendimento** ("Zap") da [visao-geral.md](../produto/visao-geral.md) §2 e do inbox unificado §1, na lente **evento → classificação → ação** e do modelo **multi-tenant white-label**. É o único pilar de canal que faltava arquivo — os sociais já estão em [facebook.md](facebook.md), [instagram.md](instagram.md), [tiktok.md](tiktok.md), [twitter.md](twitter.md) e os marketplaces em [marketplaces-venda.md](marketplaces-venda.md).
>
> Pesquisa multi-fonte com verificação adversarial (≈90 fontes; docs oficiais Meta `developers.facebook.com/docs/whatsapp` + `business.whatsapp.com`, páginas de provedores, LGPD). **Ressalva crítica:** as páginas da Meta são JS-rendered (fetch retorna corpo vazio) — fatos de **modelo** (pricing por mensagem, tiers de parceiro, sunset do On-Prem) estão corroborados em múltiplas fontes independentes e são sólidos; **números exatos de tarifa BR (BRL)** vêm de fontes secundárias e são **direcionais — confirmar no rate card / Billing Hub da Meta antes de qualquer modelo de margem**. Confiança marcada por claim.
>
> **Resumo da decisão.**
> 1. **Construir no oficial (Cloud API)** ⭐ — o On-Premises morreu (v2.63 expirou **23/out/2025**); Cloud API é o único caminho. Hospedado pela Meta, webhook de inbound = gatilho de evento limpo.
> 2. **Multi-tenant: Tech Provider + Embedded Signup** ⭐ — onboarda N WABAs de clientes sob seu app, com **token de System User por tenant**, roteado por `phone_number_id`. WABA fica no portfólio do **cliente** (sem lock-in — ótima história white-label). Virar **Solution Partner (BSP)** só se quiser linha de crédito/billing consolidado.
> 3. **Atendimento inbound é GRÁTIS** ⭐ — desde 1/jul/2025, conversa de serviço (free-form dentro da janela de 24h) custa **R$0**; **utility template dentro da janela também é grátis**. Custo só em **outbound fora da janela** (marketing/auth/utility-fora). O caso de uso #1 do Marketero é barato de operar.
> 4. **Automação é permitida** ⭐ — a política da Meta autoriza resposta automatizada na janela **desde que haja caminho de escalação para humano claro e direto**. O branch "escalar" do modelo evento→ação **é requisito de política**, não enfeite.
> 5. **Rotas não-oficiais (Z-API/Evolution/Baileys) NÃO servem de fundação** ❌ — violam o ToS por construção, expõem a **ban permanente e não-apelável**, e o **cascade ban** (uma mudança de protocolo/onda de ban derruba *todos* os tenants atrás da mesma infra) é risco **existencial** para multi-tenant. Falham em ToS **e** LGPD ao mesmo tempo.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — atendimento, e a decisão oficial vs não-oficial](#2-enquadramento--atendimento-e-a-decisão-oficial-vs-não-oficial)
3. [Acesso & modelo (Cloud API; On-Prem morto)](#3-acesso--modelo-cloud-api-on-prem-morto)
4. [Onboarding multi-tenant — Tech Provider vs BSP](#4-onboarding-multi-tenant--tech-provider-vs-bsp)
5. [Webhooks — o "evento"](#5-webhooks--o-evento)
6. [Janela de 24h, opt-in, quality e limites](#6-janela-de-24h-opt-in-quality-e-limites)
7. [Tipos de mensagem e Payments BR](#7-tipos-de-mensagem-e-payments-br)
8. [Templates & pricing 2026 (o input de negócio mais volátil)](#8-templates--pricing-2026-o-input-de-negócio-mais-volátil)
9. [Rate limits & política de automação](#9-rate-limits--política-de-automação)
10. [Provedores/BSPs e as rotas não-oficiais](#10-provedoresbsps-e-as-rotas-não-oficiais)
11. [LGPD / opt-in / residência de dados](#11-lgpd--opt-in--residência-de-dados)
12. [Recomendação para o Marketero](#12-recomendação-para-o-marketero)
13. [Mitos refutados](#13-mitos-refutados)
14. [Perguntas em aberto](#14-perguntas-em-aberto)
15. [Fontes](#15-fontes)

---

## 1. Sumário executivo

| Eixo | Achado | Veredito |
|---|---|---|
| **Plataforma** | On-Prem expirou 23/out/2025; **Cloud API** é o único caminho (Meta-hosted, até 1.000 msg/s) | Sem decisão — Cloud API |
| **Multi-tenant** | Tech Provider + **Embedded Signup** + token de System User por tenant; WABA do cliente (sem lock-in) | ⭐ Tech Provider no MVP; BSP se quiser billing |
| **Evento (inbox)** | Webhook `messages` (inbound) + `statuses`; um endpoint p/ todos os tenants, roteado por `phone_number_id` | ⭐ Fit forte p/ evento→ação |
| **Custo do atendimento** | Conversa de serviço in-window = **grátis**; utility in-window = grátis | ⭐ Inbound barato |
| **Automação** | Permitida na janela **com escalação humana obrigatória** | ⭐ Valida o branch "escalar" |
| **Conexão** | Oficial direto (sem markup) vs BSP (markup/flat) vs não-oficial (ToS+LGPD breach) | ⭐ Oficial; ❌ não-oficial como fundação |
| **Diferencial BR** | **WhatsApp Payments BR** (Pix/Boleto/link in-thread) live | Hook de comércio — aprofundar |

---

## 2. Enquadramento — atendimento, e a decisão oficial vs não-oficial

O WhatsApp é, na prática, **o** canal de atendimento BR. Duas decisões definem tudo:

- **On-Prem vs Cloud API** — resolvida: On-Prem morreu (§3). Cloud API, ponto.
- **Oficial vs não-oficial** — a decisão real e politicamente carregada no mercado BR. O mercado vive de gambiarras (Z-API/Evolution/Baileys) por custo, mas a pesquisa mostra que **o argumento de custo colapsa exatamente no caso de uso #1 do Marketero** (atendimento inbound, hoje grátis no oficial) e que o risco multi-tenant é existencial (§10). Para um produto **white-label vendido com SLA**, a fundação **tem** que ser oficial.

---

## 3. Acesso & modelo (Cloud API; On-Prem morto)

| Item | Valor | Conf. |
|---|---|---|
| Plataforma de build | **Cloud API** (Graph API em `graph.facebook.com`), Meta-hosted, ~99,9% uptime, até **1.000 msg/s** | alta |
| Ativos necessários | Meta App (tipo "Business") → **WABA** → número registrado | alta |
| **On-Prem — sunset** | Jan/2024: features novas só no Cloud; Jul/2024: bloqueio de novos números; **23/out/2025: v2.63 expirou — mensagens de/para números em On-Prem não são entregues** | alta |

**Veredito:** sem decisão a tomar — Cloud API. Você chama a Graph API para enviar e recebe inbound por webhook; nada de infra para rodar.

---

## 4. Onboarding multi-tenant — Tech Provider vs BSP

O ponto make-or-break para o Marketero.

| Capacidade | Suportado | Conf. |
|---|---|---|
| Onboardar N WABAs de clientes sob seu app | **Sim** — **Embedded Signup** (fluxo web) | alta |
| Papel para SaaS | **Tech Provider** (onboarda com/sem Solution Partner) | alta |
| Papel com billing | **Solution Partner (BSP)** — mesmo fluxo + App Review; necessário só p/ compartilhar linha de crédito / ser cobrado pela Meta | alta |
| Acesso programático ao WABA do cliente | **Business Integration System User token** ("business token"), escopado por cliente | alta |
| Permissões | `whatsapp_business_management` + `whatsapp_business_messaging`; **Advanced Access** ao management p/ tocar WABA de clientes (senão erro 200) | alta |

**Mecânica:** Embedded Signup roda com Facebook Login for Business a partir do seu portal; o cliente autoriza e o fluxo cria/seleciona os ativos WhatsApp e concede acesso ao seu app (~"<5 min" ao 1º envio). Você recebe um `code` → troca por **business token** escopado àquele WABA (credencial longeva, sem re-auth — exatamente o que um backend multi-tenant precisa). ⚠️ **Embedded Signup é web-only** (não funciona em browser mobile) — afeta UX de onboarding p/ PMEs mobile-first.

> **Decisão:** **Tech Provider** basta no MVP (mais leve; WABA fica no portfólio do **cliente** = sem lock-in, ótimo p/ white-label). **Solution Partner/BSP** só se o Marketero quiser **ser dono do billing/crédito** dos clientes (Tech Providers **não** têm linha de crédito Meta — cada tenant põe o próprio cartão e a Meta cobra o tenant). Caminho documentado p/ ter os dois: ser Tech Provider e formar **multi-partner solution** com um SP que compartilha a linha de crédito.

---

## 5. Webhooks — o "evento"

| Capacidade | Detalhe | Conf. |
|---|---|---|
| Inbound | campo `messages` (from, id, timestamp, type) | alta |
| Status | array `statuses` (sent/delivered/read/failed) + notificações de pricing/categoria | alta |
| Payload | JSON ≤3 MB; `metadata` traz `display_phone_number` + **`phone_number_id`** | alta |
| Retry | não-200 re-tentado com frequência decrescente até **7 dias** | alta |

> **Design multi-tenant:** **um** endpoint por app recebe eventos de **todos** os tenants — desambiguar por **`phone_number_id` → tenant**. Inbound `messages` é o gatilho: evento → classificador IA → ação (responder na janela / enfileirar template / escalar). `statuses` alimenta analytics e detecção de falha de envio.

---

## 6. Janela de 24h, opt-in, quality e limites

| Item | Detalhe | Conf. |
|---|---|---|
| **Janela de atendimento (CSW)** | Abre quando o usuário envia msg **ou liga**; **reseta para 24h** a cada novo inbound; dentro dela, qualquer mensagem free-form é permitida | alta |
| Fora da janela | só **templates (HSM)** pré-aprovados | alta |
| **Opt-in** | obrigatório antes de mensagem business-initiated; deve declarar nome do negócio + que o usuário opta por receber; pode ser geral se compatível c/ lei local | alta |
| Quality rating | baseado em 7 dias de sinais (blocks, reports, mutes), recency-weighted; High/Medium/Low (Flagged) | alta |
| Messaging limits (tiers) | máx. usuários únicos que você inicia **fora da CSW** por 24h móveis; no nível do **portfólio de negócio** (compartilhado entre números) | alta |
| Escada de tiers | começa em **250**; escala automática (1.000 entregues a únicos em 30d com templates de qualidade → sobe um nível); Flagged 7 dias → cai. Tiers superiores (10K/100K/ilimitado) **citados, confiança média** (escada já mudou e a página renderiza incompleta) | 250 alta / superiores média |

> **Lente atendimento:** a CSW **é** a janela de "resposta free-form" do agente de IA — inbound abre 24h, IA responde de graça. Re-engajamento fora da janela exige template (custo + aprovação). Quality rating é risco operacional: outbound automatizado agressivo que gera blocks degrada o rating → derruba os limites. **Nuance multi-tenant:** limites são por **portfólio** — como você estrutura os portfólios dos clientes afeta o teto de throughput deles.

---

## 7. Tipos de mensagem e Payments BR

| Tipo | Suportado | Conf. |
|---|---|---|
| Texto, mídia, localização, contatos, reações | Sim | alta |
| **Interativos** — reply buttons (até 3), listas (single-select) | Sim | alta |
| **WhatsApp Flows** — formulários, agendamento, captura de lead, feedback | Sim | alta |
| Catálogo / product messages (single + multi-product) | Sim | alta |
| **Payments BR** | **Sim** — `order_details` (Orders API) + `order_status`; **Pix, link de pagamento, Boleto, One-Click** | **alta** |

> **Lente ação:** kit rico para o passo de "ação" da IA — buttons/listas/Flows deixam a IA apresentar escolhas estruturadas (auto-serviço, coletar dados de lead, agendar). **WhatsApp Payments BR está live e é diferencial** — Pix/Boleto/link no thread é um hook de comércio genuíno p/ um produto BR de venda+atendimento; o status de pagamento chega por webhook (fecha o ciclo evento→ação em comércio). Tem onboarding/aprovação próprios — **aprofundar antes de comprometer**.

---

## 8. Templates & pricing 2026 (o input de negócio mais volátil)

**Categorias:** `MARKETING`, `UTILITY`, `AUTHENTICATION`; Meta auto-categoriza/revisa; templates exigem **aprovação** antes do uso. (Conf. alta.)

**Transição 2024→2025 (confirmada):**

| Mudança | Data | Detalhe | Conf. |
|---|---|---|---|
| Conversas de serviço **grátis** | 1/nov/2024 | toda msg de serviço (free-form, in-window) é grátis | alta |
| Pricing **por conversa** depreciado | — | substituído por **por mensagem** | alta |
| **Per-message pricing (PMP)** live | 1/jul/2025 | cobrado por **template entregue**, por categoria × país | alta |
| **Utility template grátis dentro da CSW aberta** | 1/jul/2025 | cobrado só se enviado **fora** da janela | alta |

**Modelo corrente (2026) — grátis vs pago:**
- **Grátis:** toda msg de serviço in-window; **utility template dentro da CSW**; tudo na janela free-entry-point de 72h (click-to-WhatsApp ads).
- **Pago (por msg entregue, categoria × país):** **Marketing** sempre; **Authentication**; **Utility** só **fora** da CSW.

⚠️ **Tarifas BR (BRL) — confiança baixa/média, NÃO verificadas no rate card da Meta** (tabela JS não-fetchável). Números de agregadores terceiros 2026, direcionais — **confirmar no Billing Hub antes de modelar margem:** Marketing ~R$0,31–0,38 · Auth ~R$0,15–0,19 · Utility ~R$0,04–0,05 (e **grátis in-window**) · Serviço R$0. Billing em BRL p/ novos WABAs (Sold-To Brasil) a partir de ~jul/2026 (conf. média) — relevante se o Marketero virar BSP.

> **Veredito (o maior input de modelo de negócio e o dado mais arriscado):** para um produto **atendimento-first**, o loop inbound→IA→resposta é **grátis**. Custo só acumula em **re-engajamento outbound fora da janela**. A unit economics depende do volume de marketing/auth templates, **não** das respostas de suporte. **AÇÃO: puxar o rate card BR ao vivo da Meta — não travar pricing nos números de terceiros.**

---

## 9. Rate limits & política de automação

| Item | Detalhe | Conf. |
|---|---|---|
| Throughput padrão | 80 msg/s por número; upgradável até **1.000 msg/s** | alta |
| Rate por usuário | 1 msg / 6s ao mesmo usuário (~10/min); burst até 45 em 6s; excedeu → erro **131056** | alta |
| Throughput excedido | erro **130429** | alta |
| **Automação na janela** | **Permitida** — "you may use automation… but must also have available **prompt, clear, and direct escalation paths**" | **alta** |
| Enforcement | violações de política/quality podem degradar limites ou restringir o WABA | alta |

> **Lente:** automação por IA é **explicitamente permitida** — sinal verde para o auto-reply do Marketero. A restrição vinculante: **prover caminho de escalação a humano claro e direto**. Isso **valida o design "IA classifica → responder / escalar"** — o branch *escalar* é **requisito de política**, não polimento. Os rate limits (80/s, 1/6s por usuário) são generosos p/ atendimento e impedem loop de IA spammando um usuário.

---

## 10. Provedores/BSPs e as rotas não-oficiais

**Provedores oficiais** (o "fee" é o que somam **sobre** as tarifas Meta):

| Provedor | Modelo de fee | Markup nas msgs Meta? | Multi-tenant / ISV | Presença BR | Nota |
|---|---|---|---|---|---|
| **Cloud API direto (Tech Provider)** | nenhum — paga Meta direto | **sem markup** | você constrói (Embedded Signup) | self-serve global | menor custo, máximo controle, maior carga de ops/compliance |
| **360dialog** ⭐ | **flat €/número/mês**, Meta pass-through | **sem markup ("at actuals")** — verificado | **Partner Platform** explícita, multi-tenant by design, "you own your number, zero lock-in" | EUR, sem entidade BR/PT-BR evidente | mais transparente + mais ISV-nativo; API-first (menos UI turnkey) |
| **Twilio** | **+US$0,005/msg** (cada lado) | sim, flat | subaccounts/ISV | sem billing BR local | maduro, global; markup compõe em escala |
| **Gupshup** | pay-as-you-go, base ~$0,001/msg | base baixa **+ markup 6% em marketing desde 1/jan/2026** | grande programa ISV (3.500+) | global | base mais barata; novo markup erode o pitch |
| **Infobip** | platform fee + por msg (negociado) | ~$0,003–0,010/msg (secundário) | enterprise/omnichannel | **presença BR + PT-BR** | pricing opaco ("contact us") |
| **Zenvia** | markup/platform-fee por conversa | sim (BRL, secundário) | ISV/sub-account **não claro publicamente** | **empresa BR** (NASDAQ), BRL, PT-BR, LGPD-native | melhor fit local; modelo revenda a confirmar |
| **Take Blip** | planos com cota; Enterprise separa fee Meta | ~20–40% premium (secundário) | enterprise, no-code | **presença BR profunda**, BRL, PT-BR | premium; fit de revenda thin-margin fraco; quote-based |

*Conf.: 360dialog (no-markup/zero-lock-in) alta — verificado na página; Twilio $0,005 alta; Gupshup +6% alta; Infobip/Zenvia/Blip baixa-média (quote/secundário).*

**Direto (Tech Provider) vs BSP:** direto = **sem markup Meta** + melhor margem + WABA do cliente (sem lock-in), mas você constrói billing e carrega **toda** a ops por tenant (aprovação de template, registro de número, quality rating, tiers, Business Verification, escalações Meta). BSP absorve isso, com markup/flat por msg. **Híbrido** documentado: ser Tech Provider + parceiro de um SP p/ linha de crédito compartilhada.

**Rotas não-oficiais (Z-API, Evolution, WPPConnect, Baileys, Venom):** todas reverse-engineeram o WhatsApp Web/multi-device e logam via QR como sessão web falsa — **contra o ToS da Meta por construção.**

| Risco | Detalhe | Conf. |
|---|---|---|
| **Violação de ToS** | Meta proíbe bulk/auto-messaging não-autorizado; pode remover acesso e já moveu ação legal | alta |
| **Ban permanente, não-apelável** | número perdido "para sempre"; caso Baileys documentado (status p/ ~2-3k contatos → ban) | alta |
| **Cascade ban** | muitos números de tenant atrás de um IP/servidor = anomalia → Meta pode **banir TODOS os tenants de uma vez** — **risco existencial multi-tenant** | média |
| Sem SLA / quebra de protocolo | mudanças do WhatsApp quebram as libs sem suporte | alta |
| BR = alvo agressivo | BR é 2º maior mercado + líder em spam/usuário → detecção anti-spam especialmente agressiva | média |

**Por que o BR usa:** evitar fee por msg/template (fixo ~R$55–100/mês/instância no Z-API, ou grátis self-host), pular verificação Meta + aprovação de template + onboarding WABA, setup QR instantâneo. **Mas:** só o oficial dá **selo verificado** (Official Business Account), broadcast de template em escala, multi-agente ilimitado e trilha de auditoria — o que torna um SaaS white-label crível p/ negócio BR sério.

---

## 11. LGPD / opt-in / residência de dados

| Achado | Detalhe | Conf. |
|---|---|---|
| Base legal de marketing frio | **consentimento** (Art. 7,I) — livre, informado, inequívoco; **checkbox pré-marcado ≠ consentimento válido** | alta |
| Papéis no SaaS | **cliente = controlador, SaaS = operador**; operador agindo fora das instruções vira controlador + **responsabilidade solidária** (Art. 42) | alta |
| Opt-in da Meta | a política da Meta **independentemente** exige opt-in — requisito contratual separado da LGPD | alta |
| Enforcement ANPD | 1ª multa LGPD (jul/2023, Telekall) foi por venda de listas WhatsApp p/ spam; ANPD ativa | alta |
| Teto LGPD | até **2% do faturamento BR**, ~R$50M/infração | alta |
| Residência de dados | **sem mandato de localização** na LGPD; exterior OK **com mecanismo do Art. 33 (SCCs)**; período de graça das SCCs **acabou 23/ago/2025** | alta |
| **Local Storage do Cloud API NÃO inclui o Brasil** | Cloud API guarda dados nos **EUA** por padrão → transferência transfronteiriça que **exige SCCs**; regiões de local storage são APAC + Europa selecionada — **Brasil não está** (correção: um claim de fonte única dizia que sim — refutado por verificação independente) | média-alta |
| DPAs | deploy oficial compliant precisa dos Business Data Processing Terms da Meta **+** DPA do BSP; o SaaS deve oferecer **seu próprio DPA** a cada tenant (Meta + BSP como sub-operadores) | alta/média |
| Não-oficial = não-compliant em 2 eixos | breach de ToS (perda de conta) **+** sem trilha de consentimento/DPA / processamento fora do pipeline sancionado (breach LGPD) → empurra o SaaS p/ controlador-autônomo solidário | média (síntese jurídica) |

---

## 12. Recomendação para o Marketero

**Construir no WhatsApp Cloud API oficial. Virar Meta Tech Provider e usar Embedded Signup p/ onboarding multi-tenant self-serve. Rotas não-oficiais NÃO são fundação de produto.**

Por quê: (1) o atendimento (caso #1) é **grátis** no oficial desde jul/2025 — a vantagem do não-oficial colapsa onde mora seu valor; (2) o **cascade ban** é existencial e correlacionado — não se vende SLA/white-label sobre isso; (3) só o oficial entrega selo verificado, broadcast em escala, multi-agente e auditoria; (4) só o oficial é compliant em ToS **e** LGPD.

**Plano faseado:**
- **Fase 1 (começar): via BSP** p/ velocidade enquanto constrói. P/ revenda multi-tenant thin-margin, **360dialog é o destaque** — flat fee verificado, sem markup, Partner Platform explícita, "you own your number" (história white-label ideal). *Caveat:* billing EUR, sem entidade BR/PT-BR — validar se aceitável. Se BR-local/BRL/PT-BR/LGPD-native for requisito duro: **Zenvia ou Take Blip** (mas confirmar billing de sub-account/ISV, publicamente fraco, e aceitar premium). Gupshup = base mais barata, mas +6% em marketing desde jan/2026.
- **Fase 2 (escala): migrar p/ Tech Provider + Embedded Signup direto** — zero markup Meta, melhor margem, WABA do cliente (sem lock-in). P/ consolidar billing dos tenants, virar Solution Partner ou multi-partner solution com um SP.
- **Não-oficial (Z-API/Evolution):** no máximo um tier "starter/broadcast barato" **explicitamente disclaimed**, **por-tenant isolado** (números separados, nunca infra compartilhada que cai junta), com caminho de migração p/ oficial embutido. Dada a dupla exposição ToS+LGPD e o cascade ban, a escolha defensável é **pular inteiramente** p/ um produto vendido sob marca/SLA.
- **Baseline de compliance (inegociável):** captura de opt-in válida (Meta + LGPD) com trilha de auditoria; manter Business Data Processing Terms da Meta **e** DPA do BSP; oferecer **seu DPA** a cada tenant; cobrir a transferência p/ EUA com **SCCs** (Brasil **não** é região de local storage — não arquitetar em torno de storage in-country); advogado confirmando o split controlador/operador por fluxo de dado.

---

## 13. Mitos refutados

- ❌ **"O On-Premises API ainda é uma opção"** — **refutado.** Expirou em 23/out/2025; mensagens não são entregues.
- ❌ **"Não-oficial economiza dinheiro"** (no caso do Marketero) — **refutado no essencial.** Atendimento inbound in-window é grátis no oficial desde jul/2025; a economia do não-oficial só sobrevive em marketing outbound frio, ao preço de ToS+LGPD+cascade ban.
- ❌ **"Brasil é uma região de local storage do Cloud API"** — **refutado** (claim de fonte única). Verificação independente: regiões são APAC + Europa selecionada; **Brasil não** — depende de SCCs.
- ❌ **"Auto-reply por IA viola a política da Meta"** — **refutado.** Automação é permitida na janela **desde que** haja caminho de escalação humana claro e direto.
- ⚠️ **"Estatísticas dramáticas de ban (68% banidos)"** — **não verificado** (rastreado a um único blog BSP citando relatório Meta sem link). Tratar como retórica.

---

## 14. Perguntas em aberto

1. **Tarifa BR ao vivo:** puxar o rate card BRL do Billing Hub/página oficial da Meta — não travar pricing/margem nos números de terceiros. Confirmar também a escada completa de tiers (250 confirmado; superiores média).
2. **Tech Provider vs Solution Partner:** o Marketero quer ser dono do billing dos clientes? Decide o papel e o esforço de App Review.
3. **WhatsApp Payments BR:** onboarding/aprovação próprios — investigação dedicada antes de prometer Pix/Boleto in-thread.
4. **BSP de Fase 1:** 360dialog (EUR, sem PT-BR) é aceitável, ou o requisito BR-local força Zenvia/Blip? Confirmar billing de sub-account/ISV deles.
5. **Embedded Signup web-only:** desenhar o fluxo de onboarding p/ PMEs mobile-first (o fluxo não roda em browser mobile).
6. **Arquitetura de inbound:** roteamento `phone_number_id`→tenant, fila ack-first, e o split controlador/operador por fluxo (revisão jurídica).
7. **Custo de IA por conversa** (classificação + geração) entra na investigação de **unit economics** — cruzar com [graphrag-noderag.md](graphrag-noderag.md) §6.

---

## 15. Fontes

> Páginas da Meta são JS-rendered; fatos de modelo corroborados em múltiplas fontes. Tarifas BR são de terceiros — **direcionais, confirmar na Meta**.

**Oficial (Meta)**
- On-Prem sunset — <https://developers.facebook.com/docs/whatsapp/on-premises/sunset>
- Cloud API / get started — <https://developers.facebook.com/docs/whatsapp/cloud-api/overview/> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started>
- Embedded Signup / Tech Provider / Solution Partner — <https://developers.facebook.com/docs/whatsapp/embedded-signup/overview> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/overview> · <https://developers.facebook.com/docs/whatsapp/solution-providers/multi-partner-solutions>
- Access tokens — <https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens/>
- Webhooks — <https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks/> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages>
- Limites/janela/opt-in/quality — <https://developers.facebook.com/docs/whatsapp/messaging-limits/> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality>
- Mensagens/Flows/interativos — <https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/> · <https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-flow-messages/>
- Payments BR — <https://developers.facebook.com/documentation/business-messaging/whatsapp/payments/payments-br/overview/>
- Pricing — <https://developers.facebook.com/docs/whatsapp/pricing/updates-to-pricing/> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing>
- Throughput / política — <https://developers.facebook.com/documentation/business-messaging/whatsapp/throughput/> · <https://business.whatsapp.com/policy> · <https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement>
- Local storage — <https://developers.facebook.com/documentation/business-messaging/whatsapp/local-storage/>

**Provedores / BSPs**
- 360dialog — <https://360dialog.com/pricing> · <https://docs.360dialog.com/docs/waba-basics/architecture-and-security>
- Twilio — <https://www.twilio.com/en-us/whatsapp/pricing> · <https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide>
- Gupshup — <https://www.gupshup.ai/channels/self-serve/whatsapp> · <https://partner-docs.gupshup.io/docs/what-is-sp-tp>
- Infobip — <https://www.infobip.com/whatsapp-business/pricing> · <https://www.infobip.com/docs/whatsapp/compliance/data-privacy>
- Zenvia — <https://zenvia.com/en/prices/> · Take Blip — <https://www.blip.ai/en/pricing/>
- Tech Provider vs BSP — <https://whautomate.com/whatsapp-tech-provider-vs-bsp>

**Rotas não-oficiais & riscos**
- Z-API — <https://z-api.io/> · Evolution — <https://github.com/EvolutionAPI/evolution-api> · Baileys — <https://github.com/WhiskeySockets/Baileys> · WPPConnect — <https://github.com/wppconnect-team/wppconnect> · Venom — <https://github.com/orkestral/venom>
- Riscos — <https://www.socialhub.pro/blog/baileys-wwebjs-venom-bibliotecas-whatsapp-nao-oficial-risco/> · <https://faq.whatsapp.com/5957850900902049> · <https://www.agenciarollin.com/blog/api-oficial-whatsapp-vs-nao-oficial-guia-completo-2026>
- Selo verificado / multi-agente — <https://gallabox.com/blog/whatsapp-green-tick> · <https://respond.io/whatsapp-business-multiple-users>

**LGPD / compliance**
- LGPD Art. 33/42/52 — <https://lgpd-brazil.info/chapter_05/article_33> · <https://www.conjur.com.br/2021-jun-13/opiniao-guia-lgpd-operador-dados-subordinado/>
- SCCs (fim do prazo) — <https://www.mayerbrown.com/en/insights/publications/2025/08/end-of-grace-period-implementation-of-brazils-standard-contractual-clauses-in-international-transfers-of-personal-data>
- ANPD multa — <https://nucleo.jor.br/curtas/2023-07-07-multa-anpd-empresa-spam-eleitoral/>
- Opt-in / política — <https://whatsappbusiness.com/policy/> · <https://www.socialhub.pro/blog/opt-in-whatsapp-business-consentimento-lgpd/>
- Data residency (local storage não-BR) — <https://api.support.vonage.com/hc/en-us/articles/12605491997212-WhatsApp-Local-Data-Storage>
- Business Data Processing Terms — <https://www.whatsapp.com/legal/business-data-processing-terms/>
