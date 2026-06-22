---
tipo: investigacao
status: estável
updated: 2026-06-22
description: Avaliação, guardrails e observabilidade do auto-reply de IA — a banda 0.50–0.79 é infra de compliance (Meta + LGPD Art. 20); compromissos vinculantes (preço/reembolso) só em camada de regras determinística; LLM-as-judge usável mas enviesado.
---

# Avaliação & guardrails de IA

> Investigação de **eval + guardrails + observabilidade** para o **agente de IA que responde clientes reais sozinho** (WhatsApp/social) no Marketero. Alto risco: resposta errada queima a marca do tenant, e a política da Meta **exige** caminho de escalação humana. O produto já tem as **bandas de confiança** (`taxonomy.ts`: ≥0.80 auto-agir / 0.50–0.79 revisar / <0.50 ignorar) e a taxonomia fechada. Stack: Cloudflare Workers + Postgres + Claude via **AI Gateway**.
>
> Pesquisa multi-fonte com verificação adversarial (papers primários de LLM-as-judge, docs Anthropic/Cloudflare verificados, incidentes legais). Confiança por claim: **[A]/[M]/[B]**. Fontes guardadas no §15.
>
> **Resumo da decisão (ler primeiro).**
> 1. **O maior passivo é o bot fazer compromisso vinculante** (reembolso/desconto/preço/política) ⚠️ — **Air Canada** foi responsabilizada por política de reembolso que o bot inventou; o **Chevy "$1 Tahoe"** foi injeção desse tipo. **O LLM NUNCA pode ser autoritativo sobre preço/reembolso/política** — isso vive numa **camada de regras determinística e versionada**; o modelo só *pede* uma ação que o backend *autoriza*.
> 2. **A banda 0.50–0.79 faz tripla função de compliance** ⭐ — controle de qualidade + **escalação obrigatória da Meta** + salvaguarda do **Art. 20 da LGPD** ("decisão não unicamente automatizada"). A fila de revisão é **infra de compliance**, não só UX. A banda ≥0.80 (auto-agir) é a zona de maior risco jurídico.
> 3. **LLM-as-judge é usável, mas não confiável cru** ⚠️ — viés de posição/verbosidade/auto-preferência documentado. Serve p/ *escalar* avaliação e como *guardrail barato*, desde que calibrado contra rótulos humanos, com júri de modelos **diversos** (não Claude julgando Claude sozinho).
> 4. **Duas pegadinhas da API Anthropic** [A] — **Citations ⊕ Structured Outputs são mutuamente exclusivos** (erro 400); e **Structured Outputs garante a *forma* do campo, não o *valor*** (um `price` com schema ainda pode ser alucinado).
> 5. **Peças CF-nativas existem e são fortes** ⭐ — AI Gateway Guardrails (Llama Guard 3-8B, PII/toxicidade, ~500ms, **sem streaming**), Logs+Logpush, Feedback API, Evaluations (sem LLM-judge nativo).

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — a banda 0.50–0.79 é compliance](#2-enquadramento--a-banda-050079-é-compliance)
3. [O maior passivo: compromissos vinculantes](#3-o-maior-passivo-compromissos-vinculantes)
4. [LLM-as-judge: usável, mas enviesado](#4-llm-as-judge-usável-mas-enviesado)
5. [Frameworks de eval](#5-frameworks-de-eval)
6. [Alucinação & grounding](#6-alucinação--grounding)
7. [Guardrails](#7-guardrails)
8. [Fila de revisão humana](#8-fila-de-revisão-humana)
9. [Observabilidade (AI Gateway)](#9-observabilidade-ai-gateway)
10. [Regressão em upgrade de modelo/prompt](#10-regressão-em-upgrade-de-modeloprompt)
11. [Red-teaming](#11-red-teaming)
12. [Arquitetura recomendada](#12-arquitetura-recomendada)
13. [Mitos refutados](#13-mitos-refutados)
14. [Perguntas em aberto](#14-perguntas-em-aberto)
15. [Fontes](#15-fontes)

---

## 1. Sumário executivo

| Eixo | Recomendação |
|---|---|
| **Compromissos (preço/reembolso/política)** | Camada de **regras determinística** autoritativa; LLM só pede, backend autoriza |
| **Eval offline + CI** | **Promptfoo** (TS-nativo, gate de regressão, red-team) apontando p/ AI Gateway |
| **Eval online/tracing** | Braintrust (tracing AI-Gateway nativo) **ou** Langfuse (MIT self-host) **ou** Openlayer |
| **LLM-as-judge** | rubrica + CoT + position-swap + **júri de modelos diversos**; calibrar vs humano |
| **Grounding** | Citations API + gate de groundedness (NLI claim-level); **diff determinístico de preço** |
| **PII (BR)** | **Presidio + CPF/CNPJ custom** (CNPJ alfanumérico jul/2026!); **não** AWS Comprehend (sem PT) |
| **Toxicidade** | **Llama Guard 3-8B** (Perspective API encerra dez/2026) |
| **Injeção** | Lakera Guard ou **Llama Prompt Guard 2 86M** (externo; Workers AI não hospeda) |
| **suggest_product** | handler consulta catálogo + **estoque ao vivo**; `tool_result` = única fonte |
| **refusal** | `stop_reason:"refusal"` é HTTP 200 vazio → ramificar e fazer **fallback de modelo** |
| **Fila de revisão** | banda 0.50–0.79 → humano; edições viram golden-set + trilha de auditoria LGPD |
| **Upgrade de modelo** | **pinar ID datado**; shadow → canary → full com rollback automático |

---

## 2. Enquadramento — a banda 0.50–0.79 é compliance

O produto responde cliente sozinho — então eval e guardrails não são polimento, são o que torna o auto-reply *seguro o bastante* para ser automático. E a banda de revisão já desenhada no `taxonomy.ts` é **infra de compliance load-bearing**:
- **WhatsApp:** automação é permitida na janela de 24h **desde que haja escalação humana clara e direta** (ver [whatsapp.md](whatsapp.md) §9). A fila de revisão **é** esse caminho.
- **LGPD Art. 20:** direito a revisão de decisões *unicamente* automatizadas; **qualquer intervenção humana genuína tira a decisão do escopo do Art. 20**. A banda ≥0.80 (auto-agir) é a zona *unicamente automatizada* — a de maior risco; a 0.50–0.79 humana é postura defensável. (A cláusula explícita de "revisor humano" foi **vetada** — direito contestado; confirmar com jurídico. Norma vinculante da ANPD pendente — Nota Técnica 12/2025.)

---

## 3. O maior passivo: compromissos vinculantes

A maior superfície de risco é o bot **prometer reembolso/desconto/preço/política** [A]:
- **Air Canada** — responsabilizada legalmente por uma política de reembolso **inventada pelo bot**.
- **Chevy "$1 Tahoe"** — injeção que levou o bot a "concordar" com uma oferta vinculante.

**Lição arquitetural (dura):** uma **camada de regras determinística e versionada** é autoritativa sobre reembolso/desconto/preço/compromisso; **o LLM apenas *requisita* uma ação que as regras do backend *autorizam***; escopo por tenant p/ não vazar entre tenants. Reforça o achado de [classificacao-eventos.md](classificacao-eventos.md): structured output **garante a forma, não o valor** — um `price` com schema ainda pode ser alucinado, então o preço **vem do catálogo, nunca do modelo**.

---

## 4. LLM-as-judge: usável, mas enviesado

**Veredito: usável como instrumento calibrado, nunca como oráculo.**

**Vieses documentados [A, papers primários]:** **posição** (reordenar candidatos move ~10–15pt — Wang et al. 2305.17926, MT-Bench 2306.05685); **verbosidade** (resposta mais longa pontua mais, ~15–30pt — 2409.15268); **auto-preferência** (juiz favorece a própria família ~10–25% — argumento direto contra Claude-julga-Claude sozinho); **estilo sobre substância**; **CoBBLEr** acha viés em ~40% das comparações.

**Como torná-lo confiável [A]:** pairwise > pointwise; **CoT antes da nota**; **position-swap** (rodar as duas ordens e mediar); **júri de modelos de famílias diversas** (PoLL, 2404.18796 — bate um juiz grande, menos auto-preferência, >7× mais barato); **calibrar contra subconjunto rotulado por humano** (reportar concordância juiz-humano + ECE do juiz).

> **Receita p/ o Marketero:** juiz com rubrica+CoT+position-swap + júri pequeno diverso (1 Claude + 1 não-Anthropic) p/ scoring offline; p/ o guardrail de saída em tempo real, um juiz Haiku único é aceitável (posição é irrelevante numa só saída) — mas calibrar num set rotulado de should-flag/should-not-flag.

---

## 5. Frameworks de eval

| Framework | TS | Offline | Online | Gate CI | LLM-judge | Self-host | Fit Workers/AI-Gateway | Red-team |
|---|---|---|---|---|---|---|---|---|
| **Promptfoo** ⭐ | ✅ | forte | ❌ | **forte** (GH Action) | ✅ Claude | OSS | aponta p/ Gateway via `apiBaseUrl` | **nativo (melhor)** |
| **Braintrust** | ✅ | forte | ✅ | forte | ✅ | SaaS+VPC | **tracing AI-Gateway nativo (único)** | ❌ |
| **Langfuse** | ✅ | forte | ✅ | forte | ✅ | **MIT/Docker** | edge: flush manual via `waitUntil` | ❌ |
| **Openlayer** | ✅ | sim | ✅ | forte | ✅ | SaaS | **Workers listado** | ❌ |
| **Evidently** | ❌ Py | forte | ✅ | GH Action | ✅ | Apache | **não roda em Worker** | ✅ |
| **DeepEval** | ⚠️ | forte | ✅ | forte | **SOTA G-Eval/DAG** | OSS | fraco (Py) | **DeepTeam (mais forte)** |

**Combo recomendado:** **Promptfoo** como camada TS-nativa de **eval offline + gate de regressão no CI + red-team** (aponta p/ AI Gateway, trava PR em mudança de prompt/modelo via exit code). + **um** online: Braintrust (tracing turnkey) / Langfuse (MIT self-host) / Openlayer. DeepEval/Evidently só se aceitar um **job Python separado** (vale pelo G-Eval/DAG ou DeepTeam). O AI Gateway tem **Evaluations** próprio (datasets + feedback humano) mas **sem LLM-judge nativo** — complementa, não substitui.

---

## 6. Alucinação & grounding

**Métricas [A]:** RAGAS **Faithfulness** (claims inferíveis do contexto ÷ total), **Answer Relevancy**, **Context Precision/Recall**; TruLens **RAG triad**; DeepEval **Faithfulness** (vs `retrieval_context` → **gate ao vivo por resposta**) vs **Hallucination** (vs `context` curado → **eval offline**).

**Detectar produto/preço/política inventados:** **NLI claim-level** (decompor resposta → claims atômicos → entailment/neutro/contradição vs contexto, DeBERTa-v3 MNLI) é o gate barato em tempo real — **preço errado → contradição (mais confiável)**; produto inventado → neutro; política fabricada → neutro/contradição. **FActScore** (decomposição atômica vs corpus do tenant) p/ offline. **SelfCheckGPT** pega nome/política inventados mas é **fraco em preço auto-consistentemente alucinado** — não usar p/ números. **Diff determinístico de preço bate qualquer juiz**: Claude emite `{product_id, price, source_chunk_id}` e o código compara o `price` com o chunk recuperado.

**Anthropic [A]:** **Citations API** (`citations.enabled:true`) devolve ponteiros **garantidamente válidos** (`cited_text` não referencia span inexistente; grátis no output; funciona com caching) — um cliente reduziu alucinação de fonte 10%→0%. **Mas garante o ponteiro, não a entailment completa** → ainda parear com gate de groundedness. **⚠️ Citations ⊕ Structured Outputs = erro 400** — escolher por request: resposta citada em texto livre **OU** extração strict-JSON.

> **Padrão de produção (DoorDash, análogo direto):** guardrail de 2 camadas antes de enviar — L1 similaridade de embedding vs KB; L2 escala flagados p/ avaliador LLM (groundedness + coerência + política). Resultado: −90% alucinação, −99% problemas de compliance.

---

## 7. Guardrails

### Saída
- **PII — duas pegadinhas BR [A]:** (1) **CNPJ alfanumérico entra em jul/2026** (IN RFB 2.229) — os 12 primeiros chars podem ser `[A-Z0-9]`; **regex só-dígitos perde CNPJ real exatamente quando o bot lançar** → usar `[A-Z0-9]{12}\d{2}` + mod-11 atualizado desde o dia 1. (2) **AWS Comprehend PII não tem português nem IDs BR — ferramenta errada.** Usar **Microsoft Presidio + recognizers CPF/CNPJ/RG custom** (regex + checksum mod-11, portável a TS/WASM); a camada NER (nomes/endereços) roda como serviço externo, não no Worker.
- **Toxicidade/brand-safety:** **Perspective API encerra em 31/dez/2026 — não adotar.** Usar **Llama Guard 3-8B** (bate GPT-4/OpenAI-Moderation no ToxicChat; distingue turno user vs assistant).
- **Off-topic:** embeddings de tópico por tenant + threshold cosseno (bge no Workers AI). **Menção a concorrente:** denylist por tenant em KV/D1 + Aho-Corasick (camada determinística barata primeiro).

### Entrada (injeção)
- **Lakera Guard** (100+ idiomas incl. PT; **adquirida pela Check Point ~set/2025, verificar termos**) **ou** self-hosted **Llama Prompt Guard 2 86M** (multilíngue incl. PT). **Evitar o 22M** (PT ruim) e DeBERTa só-inglês. **Workers AI não hospeda Prompt Guard nem aceita pesos custom** → o classificador de injeção é endpoint externo que o Worker chama.

### Refusal (Anthropic [A])
- `stop_reason: "refusal"` é **HTTP 200 com content vazio** → **monitoramento de erro/5xx nunca vê.** Ramificar em `stop_reason === "refusal"` (não em `content`, que pode ser null); emitir evento dedicado e alertar na taxa. **Tratamento = fallback p/ outro modelo** (retry no mesmo modelo geralmente re-recusa). Refusal antes de output é grátis.

### suggest_product (correção [A])
Em camadas: (1) `strict:true` + enum no JSON-Schema constrange o *input* da tool a categorias/SKUs válidos; (2) `tool_choice` força a tool; (3) **o guardrail real — o handler consulta o catálogo do tenant + estoque ao vivo e devolve só SKUs em estoque no `tool_result`.** Como o `tool_result` vem do *seu código*, **o modelo literalmente não pode exibir um produto que o handler não devolveu.** Devolver vazio/`isError` num pedido ruim p/ forçar re-recomendação de dado real.

### Bibliotecas (fit edge)
| Lib | Fit edge (V8) |
|---|---|
| **AI Gateway Guardrails** | **nativo** (sua stack) |
| **Llama Guard 3-8B** | **nativo via Workers AI** (`@cf/meta/llama-guard-3-8b`) |
| NeMo Guardrails / Guardrails AI | ❌ só microsserviço HTTP (Python) |
| Anthropic Constitutional Classifiers | nativo (HTTP); cortou jailbreaks 86%→4.4%, mas **não é API configurável** |

### LLM-judge como guardrail [A]
Anthropic recomenda **Haiku 4.5 como modelo de moderação barato** (e Haiku ainda aceita `temperature=0`, diferente de Opus/Sonnet 4.6+). Usar JSON forçado, `max_tokens` baixo, **risco graduado 0–3 (não binário)**, e **XML-delimitar o conteúdo julgado** (o juiz é injetável — tratar input como não-confiável). **Trade-off:** +~300–800ms (CF Guardrails ~500ms); ~dobra a inferência. **Gate de saída completo tem que ser serial (buffer-then-send) — streaming é incompatível** (CF Guardrails não suporta streaming). **Calibrar num set rotulado é o passo mais importante.**

---

## 8. Fila de revisão humana

A banda **0.50–0.79** roteia p/ humano e é o coração do compliance (§2).
- **Ações:** aprovar / editar-leve / rejeitar-ou-escalar (edições leves dominam). Anexar **raciocínio + confiança** do modelo a cada item; rubricas "aprovar se / rejeitar se".
- **UX de referência:** annotation queues do LangSmith — `Needs Review → Needs Others' Review → Completed`, reserva/lock p/ não dar dupla-revisão, scoring cego, **editar-vira-exemplo-de-referência**, "Add to Dataset". (Sem primitivo de SLA nativo — construir.)
- **Priorização:** proximidade de SLA, tier do cliente, sentimento, impacto — disparar antes do limiar.
- **Flywheel de dados:** **edição do revisor = par ground-truth grátis (input → output corrigido)** → exemplos de SFT + linhas de golden eval; aprovar/rejeitar → dado de preferência. **A fila de revisão É a fonte de mineração de golden-set E a trilha de auditoria LGPD.**
- **WhatsApp [A]:** automação permitida na janela **mas** com escalação clara; opt-out (STOP/PARAR/SAIR) honrado; **ban de chatbot de propósito geral (15/jan/2026)** → posicionar como **"automação de atendimento" (triagem/FAQ/pedido/agendamento), nunca "assistente geral"**, e **não treinar com dado de chat do WhatsApp**.

---

## 9. Observabilidade (AI Gateway)

- **Logs por padrão:** prompt, resposta, provider, tokens, custo, duração, status. `cf-aig-collect-log` por request (**sem % sampling nativo**); `collect-log-payload:false` mantém metadado, dropa corpo. **Retenção por quota, não por tempo** (10M logs/gateway Paid) — **não é warehouse.**
- **Logpush → R2/S3/GCS** é o caminho p/ puxar prompt+resposta p/ eval offline.
- **Metadado custom** (`cf-aig-metadata`, máx 5) — **taguear todo request com `tenant/ticketId/env/agentVersion`** p/ fatiar qualidade por tenant.
- **Feedback API:** cada resposta devolve `cf-aig-log-id`; PATCH com `{feedback: 1|-1}`. **Guardar o `cf-aig-log-id` junto do ticket** p/ resolvido-vs-escalado virar feedback de produção.
- **Guardrails:** Llama Guard 3-8B, block 2016 (prompt)/2017 (resposta), ~500ms, **sem streaming**, fail-closed no block.
- **Lacunas (construir):** sem detector de drift nativo, sem métrica de taxa-de-guardrail — derivar do Logpush. Best practice: checagens determinísticas síncronas em 100%; LLM-judges async em ~5–20% amostrado (nunca no caminho crítico).

---

## 10. Regressão em upgrade de modelo/prompt

- **Pinar o ID datado/snapshot, nunca o alias móvel** [A] — Anthropic nunca atualiza pesos de um ID; deprecação com ≥60 dias. (Ativos jun/2026: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`; `claude-3-*` e snapshots 4 originais **aposentados** → request falha.)
- **Upgrade NÃO é neutro** mesmo dentro do tier (calibração de comprimento, instrução mais literal, menos tool calls; tokenizer do Opus 4.7+ emite ~35% mais tokens → re-tunar `max_tokens`/custo). **Passar prompt + harness de eval inteiro a cada bump.** Atenção a breaking changes (prefill removido, sampling params rejeitados em Opus 4.7+).
- **Sequência [M]:** golden-suite offline → **shadow** (rascunho em tickets replayados, julgado sem enviar) → **canary** (1%→5%→20%→50%→100%, usuário pinado numa versão) → full, com **thresholds de rollback automático escritos antes** (ex.: rollback se refusal +5pp, p99 +40%, custo acima do orçamento) e soak de 24–48h por estágio.

---

## 11. Red-teaming

- **Incidentes-âncora [A]:** Air Canada + Chevy provam que afirmações de reembolso/desconto/política do bot **vinculam você** → camada de regras determinística (§3) + escopo por tenant.
- **Ferramentas [A]:** **Promptfoo red-team** (melhor fit CI; plugins `contracts` [compromissos não-supervisionados — seu risco exato], `policy`, `hijacking` [o modo Chevy], `cross-session-leak`+`bola` [isolamento multi-tenant], multi-turn `crescendo`/`goat`); **PyRIT**; **garak** (manda cada probe 10× p/ pegar bypass 1-em-10); **DeepTeam** (mais forte, Python).
- **P/ o bot de intent fechado:** plugins `policy`/`intent` geram ataques contra o set de intents. Scorers custom: *bot fez compromisso vinculante / citou valor de reembolso-ou-desconto / implicou ação privilegiada / devolveu dado de outro tenant.* Rodar **multi-turn** + encodings, **contínuo no CI**.

---

## 12. Arquitetura recomendada

```
INBOUND (WhatsApp/social) → Worker
  ├─ GUARDRAILS DE ENTRADA (paralelo):
  │    • opt-out (STOP/PARAR/SAIR) → suprime automação            [política WhatsApp]
  │    • classificador de injeção (Lakera / Prompt Guard 2 86M)
  ├─ CLASSIFICA intent (taxonomia fechada) + confiança CALIBRADA
  ├─ <0.50      → IGNORA (log)
  ├─ 0.50–0.79  → FILA DE REVISÃO HUMANA  ◄── escalação Meta + Art. 20 LGPD
  │                 aprovar / editar / rejeitar → edições viram golden-set + SFT
  └─ ≥0.80      → AUTO-AGIR (zona de maior risco LGPD):
        1. RAG dos docs do tenant (Citations p/ texto citado, OU Structured Outputs
           p/ extrair produto/preço — NÃO os dois)
        2. suggest_product = strict enum + handler valida vs catálogo + ESTOQUE AO VIVO
           (tool_result = única fonte de verdade)
        3. CAMADA DE REGRAS DETERMINÍSTICA autoritativa sobre preço/reembolso/desconto/política
        4. tratar stop_reason:"refusal" → fallback de modelo; emitir evento de refusal
        5. GATE DE SAÍDA (serial, sem streaming):
             • regex+mod-11 no Worker: CPF/CNPJ(alfanumérico-ready)/RG       [BR]
             • denylist de concorrente/termo por tenant (KV/D1)
             • Llama Guard 3-8B (toxicidade) via Workers AI / AI Gateway
             • gate de groundedness: NLI claim-level vs docs; diff de preço vs source_chunk_id
             • HARD-BLOCK contradição / preço-política sem suporte → re-gerar ou escalar
        6. ENVIA

TRANSVERSAL:
  • AI Gateway: cf-aig-metadata{tenant,ticketId,env,agentVersion}; guardar cf-aig-log-id
    por ticket → PATCH feedback em resolvido/escalado; Logpush → R2 p/ eval offline
  • CI: Promptfoo golden-suite + red-team gate em toda mudança de prompt/modelo
  • Online: checagens determinísticas 100% sync; LLM-judge async em ~5–20% amostrado
  • Upgrade: pinar ID datado; shadow → canary → full com rollback automático
```

---

## 13. Mitos refutados

- ❌ **"Structured Output impede o bot de inventar preço"** — **refutado.** Garante a *forma*, não o *valor*; preço vem do catálogo via `tool_result`, e há camada de regras determinística sobre compromissos.
- ❌ **"Refusal do Claude aparece como erro no monitoramento"** — **refutado.** É HTTP 200 com content vazio; ramificar em `stop_reason:"refusal"` ou fica invisível.
- ❌ **"AWS Comprehend / Perspective API resolvem PII e toxicidade"** — **refutado p/ BR.** Comprehend não tem PT/IDs BR (usar Presidio+CPF/CNPJ); Perspective encerra dez/2026 (usar Llama Guard 3-8B).
- ❌ **"Dá pra usar Citations + Structured Outputs juntos"** — **refutado** (erro 400; escolher por request).
- ❌ **"LLM-as-judge é confiável o bastante p/ decidir sozinho"** — **refutado.** Vieses de posição/verbosidade/auto-preferência; usar júri diverso + calibração + position-swap.
- ⚠️ **"A banda de revisão é só qualidade/UX"** — é **infra de compliance** (Meta + LGPD Art. 20).

---

## 14. Perguntas em aberto

1. **Camada de regras de compromisso** — onde modelar (preço/reembolso/desconto/política por tenant) e como o LLM "requisita" sem decidir. Liga em [referencia/arquitetura.md](../referencia/arquitetura.md).
2. **Encoder de groundedness/PII** onde roda (Presidio + NER externos; NLI claim-level) na stack serverless.
3. **Júri de eval:** qual modelo não-Anthropic compõe o júri diverso (custo/latência).
4. **Custo do gate de saída** (juiz Haiku + Llama Guard por resposta) — somar ao COGS ([unit-economics.md](unit-economics.md)).
5. **Jurídico LGPD** — confirmar a postura do Art. 20 (cláusula de revisor humano vetada) com advogado BR; acompanhar Nota Técnica ANPD 12/2025.
6. **Fila de revisão** — construir SLA próprio (LangSmith não tem nativo) e o flywheel golden-set→SFT.
7. **Posicionamento anti-ban** (15/jan/2026): garantir "automação de atendimento", não "assistente geral".

---

## 15. Fontes

> Papers primários e docs Anthropic/Cloudflare = [A] (vários re-verificados). Magnitudes de viés [A-direção/M-exato]. LGPD "revisão humana" é contestado (cláusula vetada) — postura defensável, confirmar com jurídico.

**Anthropic / Claude**
- stop_reason / refusal — <https://platform.claude.com/docs/en/api/handling-stop-reasons> · <https://platform.claude.com/docs/en/docs/build-with-claude/refusals-and-fallback>
- Citations — <https://platform.claude.com/docs/en/build-with-claude/citations> · <https://claude.com/blog/introducing-citations-api>
- Structured Outputs / tool use — <https://platform.claude.com/docs/en/build-with-claude/structured-outputs> · <https://platform.claude.com/docs/en/docs/agents-and-tools/tool-use/strict-tool-use>
- Moderação / evals / modelos — <https://platform.claude.com/docs/en/about-claude/use-case-guides/content-moderation> · <https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents> · <https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions>

**LLM-as-judge (papers)**
- MT-Bench <https://arxiv.org/abs/2306.05685> · Fair Evaluators <https://arxiv.org/abs/2305.17926> · G-Eval <https://arxiv.org/abs/2303.16634> · PoLL/juries <https://arxiv.org/abs/2404.18796> · CoBBLEr <https://arxiv.org/abs/2309.17012> · Style>Substance <https://arxiv.org/pdf/2409.15268>

**Frameworks de eval**
- Promptfoo <https://www.promptfoo.dev/docs/red-team/> · Braintrust <https://braintrust.dev/docs/integrations/sdk-integrations/cloudflare> · Langfuse <https://langfuse.com/self-hosting> · Openlayer <https://openlayer.com/products/llm-evaluation> · DeepEval <https://deepeval.com/docs/metrics-faithfulness>

**Grounding / alucinação**
- RAGAS <https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/> · FActScore <https://arxiv.org/abs/2305.14251> · SelfCheckGPT <https://arxiv.org/abs/2303.08896> · DoorDash <https://www.zenml.io/llmops-database/rag-based-dasher-support-automation-with-llm-guardrails-and-quality-monitoring>

**Guardrails**
- Presidio <https://microsoft.github.io/presidio/supported_entities/> · CPF/CNPJ <https://github.com/fnando/cpf_cnpj> · Llama Guard 3-8B <https://developers.cloudflare.com/workers-ai/models/llama-guard-3-8b/> · Prompt Guard 2 <https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M> · Lakera <https://www.lakera.ai/lakera-guard>

**Cloudflare AI Gateway**
- Guardrails <https://developers.cloudflare.com/ai-gateway/features/guardrails/> · Logging/Logpush <https://developers.cloudflare.com/ai-gateway/observability/logging/logpush/> · Feedback <https://developers.cloudflare.com/ai-gateway/evaluations/add-human-feedback-api/> · metadata <https://developers.cloudflare.com/ai-gateway/observability/custom-metadata/>

**HITL / WhatsApp / LGPD**
- LangSmith queues <https://docs.langchain.com/langsmith/annotation-queues> · WhatsApp policy <https://whatsappbusiness.com/policy/> · ban chatbot <https://respond.io/blog/whatsapp-general-purpose-chatbots-ban> · LGPD Art. 20 <https://lgpd-brasil.info/capitulo_03/artigo_20>

**Incidentes / red-team**
- Air Canada <https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot> · Chevy <https://incidentdatabase.ai/cite/622/> · Promptfoo red-team plugins <https://www.promptfoo.dev/docs/red-team/plugins/> · garak <https://github.com/NVIDIA/garak> · PyRIT <https://github.com/microsoft/PyRIT>
