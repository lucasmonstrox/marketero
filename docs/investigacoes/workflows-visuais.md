---
tipo: investigacao
status: estável
updated: 2026-06-21
description: Comparativo de packages para o editor visual de workflows; recomendação React Flow (@xyflow/react) no frontend + Inngest como motor de execução.
---

# Investigação: Packages para Editor Visual de Workflows

> Pesquisa comparativa de packages para construir um editor visual de automações/campanhas
> estilo workflow builder (drag-and-drop de nós, fluxos condicionais, triggers de redes sociais
> → ações) para o Marketero.
>
> Stack do projeto: monorepo Turborepo, Next.js (App Router), React, TypeScript, TailwindCSS,
> shadcn/ui, bun. Pesquisa com verificação adversarial de licenças e manutenção (jun/2026).

## 1. TL;DR / Recomendação

**Stack recomendado: React Flow (`@xyflow/react`, MIT) no frontend + Inngest como motor de
execução durável, com XState (MIT) opcional para modelar a lógica de fluxo.**

Esse combo casa nativamente com a stack do Marketero: cada nó é um componente React que se
estiliza com shadcn, e o Inngest deploya junto com o app no Vercel sem worker fleet — com flow
control (concurrency/throttle/rate-limit) crucial para respeitar os limites das APIs de
Twitter/Meta/TikTok. Evite n8n embed e BPMN puro para o MVP: o primeiro tem licença cara e
iframe Vue (sem controle de UX), o segundo é overkill conceitual para "trigger → ação" de
marketing. Para acelerar o MVP, considere o **Workflow Builder SDK da Synergy Codes** (licença
one-time, React+Tailwind) como atalho sobre o mesmo paradigma do React Flow.

## 2. Editor Visual (Frontend)

Datas/licenças marcadas com ✅ foram confirmadas na verificação adversarial; ⚠️ indica onde a
verificação corrigiu os dados de pesquisa.

| Biblioteca | Paradigma | Licença | Manutenção | Fit React/Next | Quando usar |
|---|---|---|---|---|---|
| **React Flow (`@xyflow/react`)** | Node-based custom | **MIT** ✅ (Pro é opcional; **remover atribuição é GRÁTIS** ⚠️) | Excelente: ~37k stars, v12.11.0 (jun/2026), empresa dedicada | **O melhor.** Nós = componentes React → Tailwind/shadcn direto. App Router: `'use client'` + `dynamic(ssr:false)` | **Recomendado.** Builder de automação sob medida, white-label total |
| **Rete.js (v2)** | Node editor + motor de grafo | MIT no core, mas **`rete-structures` e `rete-scopes-plugin` são CC-BY-NC-SA (não-comercial)** ⚠️ | Saudável: ~12.1k stars ⚠️, v2.0.6 (jun/2025) ⚠️ | Bom mas indireto: React via plugin, mais boilerplate | Se quiser motor de dataflow embutido e evitar os 2 plugins NC |
| **Reaflow** | Node-based React + auto-layout ELK | Apache-2.0 | Mais fraca: ~2.5k stars, sem release em 2026 | React-first, auto-layout ELK pronto | Se auto-layout automático for prioridade e aceitar risco de manutenção |
| **Sequential Workflow Designer** | Step-based sequencial | **MIT** ✅ | Ativo: v0.38.2 (jun/2026) ✅ | Wrapper React oficial, render SVG próprio (Tailwind/shadcn limitado) | Automações lineares simples (trigger → passos → condições) |
| **Workflow Builder SDK (Synergy Codes)** | SDK de builder pronto | Community Apache-2.0 / Enterprise one-time €6.990 | Comercial, novo, comunidade pequena | Muito bom: React nativo + Tailwind design tokens | **Atalho de MVP:** já traz nós, props panel, auto-save, runner |
| **react-diagrams** | Node-based React | MIT | **Estagnada:** última release fev/2024 | React-first | Evitar para projeto novo (risco de abandono) |
| **Flume / Litegraph / Mermaid** | Logic graphs / Canvas2D / texto | MIT | Variável | Fracos para este caso | Não recomendados (escopo estreito, não-React, ou read-only) |
| **bpmn-js (BPMN puro)** | BPMN 2.0 padrão | **bpmn.io License** (MIT + watermark; **NÃO existe licença comercial p/ remover** ⚠️⚠️) | Excelente: ~9.6k stars, v18.18.0 (jun/2026), Camunda | Vanilla JS via wrapper; sem SSR; sem Tailwind | Só se precisar interoperar com motor BPMN externo (Camunda 8) |
| **GoJS** | Diagramação comercial (canvas) | Proprietária, ~US$3.995/app/domínio | Maduro, 20+ anos | Canvas → não reaproveita shadcn/Tailwind | Diagramas enormes com orçamento; custo escala mal em multi-tenant |
| **JointJS+** | Diagramação SVG | Core MPL-2.0; JointJS+ ~US$2.990/dev + renovação ~$1.490/ano | Saudável | SVG inspecionável, integração React manual | Se quiser UI pronta (stencil/inspector) e aceitar paywall + renovação |
| **maxGraph** | Diagramação genérica TS (sucessor mxGraph) | Apache-2.0 | mxGraph **EOL**; maxGraph ativo, comunidade pequena | Vanilla TS, sem React-first | Só se precisar de compatibilidade XML draw.io |

### O ponto-chave: BPMN puro vs node-based custom vs comercial

- **BPMN puro (bpmn-js):** padrão da indústria, XML portável, modeler completo grátis — mas
  **rígido e conceitualmente errado** para marketing. Usuários de campanha não entendem notação
  BPMN. ⚠️ **Correção crítica:** o watermark "powered by bpmn.io" é **obrigatório e NÃO pode ser
  removido com licença comercial** — a cláusula da LICENSE diz "MUST NOT be removed or changed".
- **Node-based custom (React Flow):** você modela exatamente "trigger de rede social → ação", com
  nós ricos em shadcn/Tailwind, controle 100% do modelo de dados, white-label nativo. É a stack
  que n8n/Make/Zapier-likes usam. Custo: você constrói o motor de execução separado.
- **Comercial (GoJS/JointJS+):** layout/roteamento de ponta e suporte pago, mas renderizam em
  canvas/SVG **sem reaproveitar shadcn**, têm custo por dev/app/domínio (ruim em SaaS multi-tenant)
  e lock-in. Só compensam para diagramas gigantes ou layouts muito sofisticados.

## 3. Motor de Execução (Backend)

| Motor | Modelo | Licença | Fit Next.js serverless | Editor visual? |
|---|---|---|---|---|
| **Inngest** ⭐ | Orquestração durável event-driven | SDK Apache-2.0; servidor SSPL→Apache em 3 anos | **Melhor fit:** funções deployam com o Next.js no Vercel, sem worker fleet; steps contornam timeout serverless | Não (só observabilidade) |
| **Trigger.dev** | Tasks duráveis checkpoint-resume | Apache-2.0 / MIT ✅; self-host ilimitado grátis | Bom, mas roda em **compute dedicado** | Não |
| **Temporal** | Orquestração durável enterprise | **MIT** ✅; Cloud ~$100/mês piso | **Anti-serverless:** worker fleet always-on + cluster + DB | Não |
| **n8n / Windmill** | Plataforma completa c/ UI | n8n: fair-code (embed pago); Windmill: AGPLv3 | Apps self-hosted (iframe), não serverless-friendly | **Sim** (iframe, não React) |
| **BullMQ** | Fila de jobs Redis | MIT | Exige Redis + workers always-on | Não |
| **XState (v5)** | State machine (lib) | **MIT** ✅ (v5 estável; v6 em alpha ⚠️) | **Excelente:** `@xstate/react` nativo. Não é durável sozinho | Stately (cloud, não embutível) |

### Qual combina com Next.js serverless

**Inngest** é o claro vencedor: zero infra extra (deploya junto do app no Vercel), **flow control**
(concurrency, throttling, rate limiting — essencial para os rate limits das APIs sociais), crons e
triggers por evento/webhook nativos. ⚠️ **Correção:** "Hobby" é o free tier ($0, ~50k execuções/
mês); o pago mais barato é **Pro a partir de ~$75/mês**.

**XState** entra como camada de modelagem da lógica (definição serializável → perfeita para salvar
o JSON do editor). Mas **não é durável**: precisa de Inngest/Trigger.dev por baixo para retries/
schedule/recuperação após crash.

**Temporal** é o motor mais robusto, mas operacionalmente pesado e anti-serverless — overkill no
estágio inicial.

## 4. Comprar vs Construir (Soluções Embutíveis/White-label)

| Opção | O que entrega | Bloqueio |
|---|---|---|
| **Workflow Builder SDK (Synergy Codes)** | Builder React pronto (nós, props panel, auto-save, Flow Runner), Tailwind tokens | Licença Enterprise one-time **€6.990**; comunidade pequena → fazer PoC antes |
| **Activepieces (Embed)** | Motor MIT + 600+ integrações + embed white-label | Frontend **Angular** (iframe, não React); Embed gerenciado ~**$30k/ano** |
| **n8n (Embed)** | UI + motor + 400+ integrações | Frontend **Vue** (iframe); Embed **~$50k/ano** (relato não-oficial) ⚠️; fair-code proíbe white-label sem contrato |
| **Windmill** | Flow editor + motor open-source | **AGPLv3** (copyleft — risco jurídico) ou Enterprise pago; poucas integrações sociais |
| **Flowise** | Builder visual LLM/agentes | **Mismatch de domínio** (foco IA/RAG, não trigger→ação) |

**Resumo:** as plataformas completas economizam o backend mas custam caro para white-label e
prendem a um **iframe Vue/Angular** — perde-se controle de UX e não dá para usar shadcn/Tailwind
dentro do builder. **Construir sobre React Flow** (ou comprar o SDK Synergy) bate qualquer iframe
se o objetivo é identidade visual própria com nós custom de Twitter/TikTok/Meta.

## 5. Armadilhas

1. **Licença React Flow (mito corrigido) ⚠️:** o core é **MIT puro**, e **remover a atribuição é
   gratuito**. O Pro é assinatura opcional (~$169–289/mês) só para exemplos/templates/suporte.
2. **Watermark do bpmn-js é inegociável ⚠️⚠️:** o "powered by bpmn.io" fica visível para sempre —
   não há licença que o remova.
3. **GoJS/JointJS+ custo multi-tenant:** licenças por app/domínio ou por dev + renovação anual
   encarecem rápido num SaaS.
4. **n8n fair-code:** a Sustainable Use License **proíbe** white-label/revenda/usar como backend
   de SaaS com credenciais dos usuários sem contrato Embed pago.
5. **Rete.js plugins não-comerciais ⚠️:** `rete-structures` e `rete-scopes-plugin` são CC-BY-NC-SA
   — não usar em produto comercial. O core é MIT.
6. **Windmill AGPLv3:** copyleft forte — embutir num SaaS proprietário exige análise jurídica.
7. **SSR no App Router:** todos os editores de canvas dependem de `window`/DOM e **quebram no SSR**.
   Padrão obrigatório: componente `'use client'` + `next/dynamic` com `ssr: false`.
8. **Performance:** React Flow renderiza nós como DOM React — em grafos com milhares de nós precisa
   de virtualização. Para automações de marketing (dezenas de nós), é irrelevante.
9. **Custo Inngest:** o free tier conta **execuções** (run + cada step), não function runs.
10. **Lógica em código vs dados:** Inngest/Trigger.dev/Temporal expressam workflows **em código
    TS**, não em dados. É preciso uma **camada de interpretação** que traduza o JSON do editor
    visual em execução do motor.

## 6. Plano Sugerido (MVP → Escala)

**Fase 0 — Fundação (semanas 1–2)**
- Editor: **React Flow** (`@xyflow/react`), nós como componentes shadcn/Tailwind. Wrapper
  `'use client'` + `dynamic(ssr:false)`.
- Defina um **schema JSON do fluxo** como fonte da verdade (nós, edges, configs de cada
  trigger/ação). Esse JSON é o que persiste e o que o motor interpreta.
- Use **XState** para validar/modelar as transições no client.
- *Atalho opcional:* avaliar o **Workflow Builder SDK (Synergy Codes)** numa PoC se o prazo
  apertar — mesmo paradigma React+Tailwind.

**Fase 1 — Motor (semanas 3–6)**
- **Inngest** como orquestrador. Construa um **interpretador** que lê o JSON do fluxo e dispara
  steps Inngest (cada nó = um step durável).
- Aproveite **flow control** do Inngest para rate limiting por conta/rede social.
- Crons/webhooks do Inngest para triggers (post agendado, `lead.created` via Meta Lead Ads).
- Comece no **free tier**; suba para Pro (~$75/mês) conforme volume.

**Fase 2 — Riqueza do produto (mês 2–3)**
- Auto-layout com **dagre/elk** sobre o React Flow.
- Nós custom por rede social (cards ricos), validação de conexões, sub-flows.
- Read-only/preview mode; histórico/undo-redo.

**Fase 3 — Escala (6+ meses, condicional)**
- Se as campanhas virarem missão crítica de longa duração, avalie migrar o motor para
  **Trigger.dev** ou **Temporal** — **sem trocar o editor React Flow**.
- Mantenha o **schema JSON desacoplado** do motor desde a Fase 0: é o que torna a troca de backend
  barata.

**Por que não comprar a plataforma inteira (n8n/Activepieces) agora:** o iframe Vue/Angular impede
a UX/branding próprios que diferenciam o Marketero, e o custo de embed (~$30–50k/ano) não se
justifica num MVP. A combinação React Flow + Inngest dá controle total a custo quase-zero de
licença, com caminho claro de escala.
