---
tipo: investigacao
status: estável
updated: 2026-06-22
description: O "cérebro" GraphRAG do Marketero — avaliação adversarial do NodeRAG (research-grade, não usar como dependência) e caminho faseado vector→graph-lite sobre Postgres/pgvector+AGE.
---

# GraphRAG / NodeRAG — o "cérebro" do Marketero

> Investigação técnica do núcleo de IA descrito na [visao-geral.md](../produto/visao-geral.md) §3 — a "IA potente baseada em GraphRAG, usando **NodeRAG** como motor de recuperação". É o **diferencial defensável** declarado e o **maior risco técnico** do produto, até aqui sem chão de engenharia. A pergunta central: o NodeRAG dá como dependência de produção? E, se não, qual o caminho pragmático para um produto **multi-tenant, white-label, sensível a custo**, que ingere **eventos num fluxo contínuo** e roda em stack **serverless/Postgres** (Cloudflare Workers + Postgres em jogo — ver [marketero-web-cloudflare-deploy] na memória).
>
> Pesquisa multi-fonte com verificação adversarial (≈55 fontes; o paper do NodeRAG arXiv 2504.11544 + **leitura do código-fonte** do repo, survey arXiv 2506.05690 "When to use Graphs in RAG", docs de Cloudflare Hyperdrive, FalkorDB, Apache AGE). **Ressalva:** números de benchmark/custo/latência de fornecedores são **direcionais** (vendor/author-sourced) — validar na própria carga antes de decidir. Confiança marcada por claim.
>
> **Resumo da decisão.** Três conclusões duras:
> 1. **NodeRAG não é produção** ❌ — artefato de pesquisa de 1 autor, release única v0.1.0, **zero commits em ~15 meses**, sem testes/CI, com bug aberto no core (PPR), single-process/single-folder, **sem multi-tenancy**, e cujo "incremental update" é, na verdade, **recomputo global de comunidades (Leiden) + sumários por LLM a cada inserção** — fatal para um stream de eventos. **Reposicionar como inspiração de design, não como implementação.** (Licença MIT — pode-se roubar as ideias livremente.)
> 2. **"GraphRAG completo agora" é cilada** ⚠️ — o survey de 2026 é explícito: para a maioria das queries (single-hop) o **vector RAG híbrido iguala ou supera** o GraphRAG, a um custo muito menor. Grafo só compensa em **multi-hop / síntese / hierarquia**.
> ⚠️ **Correção (2026-06-22, ver [referencia/arquitetura.md](../referencia/arquitetura.md) §4):** a recomendação de **Apache AGE** abaixo **não se sustenta** — o **Neon não suporta AGE** (nem RDS; só Azure Flexible Server), e o AGE é projeto Apache *Incubator* que perdeu o time de dev em out/2024. **A Fase 2 "graph-lite" passa a ser closure/adjacency tables + CTEs recursivas em Postgres puro**, não AGE. O resto deste doc (faseamento, NodeRAG research-grade, pgvector, custo) permanece válido; onde se lê "AGE", leia "grafo via CTEs/closure tables".
>
> 3. **Caminho recomendado: faseado** ⭐ — **Fase 1** vector + rerank sobre **Postgres/pgvector** (relações conhecidas como FKs + CTEs recursivas = já é um grafo, custo zero de extração); **Fase 2** "graph-lite" com **Apache AGE no mesmo Postgres**, incremental e com extração *debounced*; **Fase 3** migrar workload quente de grafo p/ **FalkorDB** só se medir gargalo. **Postgres single-store** vence pela isolação multi-tenant via **RLS** e fit serverless.

---

## Índice

1. [Sumário executivo](#1-sumário-executivo)
2. [Enquadramento — o cérebro é o diferencial, mas o caminho importa](#2-enquadramento--o-cérebro-é-o-diferencial-mas-o-caminho-importa)
3. [NodeRAG — o motor nomeado, avaliado de perto](#3-noderag--o-motor-nomeado-avaliado-de-perto)
4. [Landscape de GraphRAG e a dimensão incremental](#4-landscape-de-graphrag-e-a-dimensão-incremental)
5. [Graph stores & fit serverless](#5-graph-stores--fit-serverless)
6. [Custo & latência](#6-custo--latência)
7. [Multi-tenant no grafo](#7-multi-tenant-no-grafo)
8. [Recomendação faseada para o Marketero](#8-recomendação-faseada-para-o-marketero)
9. [Mitos refutados](#9-mitos-refutados)
10. [Perguntas em aberto](#10-perguntas-em-aberto)
11. [Fontes](#11-fontes)

---

## 1. Sumário executivo

| Abordagem | Ideia | Atualização incremental / streaming | Custo de índice | Veredito p/ Marketero |
|---|---|---|---|---|
| **Vector + rerank (sem grafo)** | BM25/vetor → cross-encoder rerank | Trivial (upsert de embedding) | Mais baixo (sem extração LLM) | ⭐ **Fase 1 (MVP)** — cobre o single-hop dominante |
| **Apache AGE (grafo no Postgres)** | openCypher + vetor + relacional num só engine | Incremental (você controla); extração *debounced* | Baixo-médio | ⭐ **Fase 2 (graph-lite)** |
| **LightRAG** | Retrieval dual-level, índice graph-enhanced | **Incremental por design** (set-merge de subgrafo) | ~baixo (claim de autor) | Referência de incremental viável |
| **NodeRAG** | Grafo heterogêneo (7 tipos de nó) + PPR raso | **Falso-incremental**: recomputo global de Leiden + sumários por inserção | Baixo (paper) | ❌ **Não usar como dependência** — roubar o design |
| **Microsoft GraphRAG** | Extração LLM + comunidades Leiden + sumários | **Batch** — inserir ≈ reconstruir | Mais alto (~$20–50/1M tok GPT-4o) | ❌ **Eliminar** (incompatível c/ stream) |
| **HippoRAG / 2** | PPR sobre KG, "memória" associativa | Inserção contínua; sem sumarização de alto nível | Médio | Inspiração p/ "memória de agente" |

**Constraint arquitetural transversal:** a maioria dos **graph DBs não é serverless-friendly** (conexões longevas, memória residente) — apontar um Worker para Neo4j/Memgraph é anti-padrão (esgota o pool do Hyperdrive). Postgres (via Hyperdrive) é o caminho edge-compatível. (Conf. alta.)

---

## 2. Enquadramento — o cérebro é o diferencial, mas o caminho importa

A `visao-geral` aposta o diferencial defensável na IA GraphRAG cruzando social + venda + atendimento (cliente → conversa → campanha → venda). O dado de CRM/social é **semi-estruturado e rico em relações** — exatamente o caso *favorável* a grafo. **Mas** a maioria das queries reais do usuário ("o que esse cliente comprou por último", "resuma essa conversa") é **single-hop** e não precisa de grafo.

O achado load-bearing (survey arXiv 2506.05690, conf. alta): GraphRAG é um *"solution-seeking-problem"* para muitas aplicações — **basic/hybrid RAG iguala ou supera** o GraphRAG em recuperação factual simples; grafo só paga o custo em **multi-hop, síntese/sumarização e domínios de hierarquia forte**. Tradução para o Marketero: o grafo é uma **feature em que se cresce**, não uma fundação que se despeja primeiro. O risco do plano atual não é "grafo errado" — é **grafo cedo demais e via um motor morto**.

---

## 3. NodeRAG — o motor nomeado, avaliado de perto

### 3.1. O que é (vale roubar as ideias)

Paper *NodeRAG: Structuring Graph-based RAG with Heterogeneous Nodes* (arXiv 2504.11544, abr/2025). Grafo **heterogêneo com 7 tipos de nó** (Entity, Relationship, Semantic Unit, Attribute, High-Level Element, High-Level Overview, Text), com retrieval por **dual search** (match exato em N/O + HNSW em S/A/H) seguido de **Personalized PageRank raso** (t=2, α=0.5) para expandir sem difundir. Vence em **eficiência de tokens** (recupera ~metade dos tokens do GraphRAG com acurácia comparável). **As ideias são boas e reaproveitáveis.** (Conf. alta — paper.)

> ⚠️ **Benchmarks são author-run** em amostras pequenas (175–375 perguntas), não reproduzidos de forma independente; a margem de acurácia sobre o GraphRAG é fina (~0,5 pp no HotpotQA) — o ganho real é **eficiência**, não qualidade. (Conf. média.)

### 3.2. Por que NÃO dá como dependência (avaliação adversarial)

| Sinal | Achado (lido do repo, GitHub API 2026-06) | Conf. |
|---|---|---|
| **Manutenção** | 1 contribuidor, 6 commits; `created` 2025-03-18, **último push 2025-03-19** — sem commits de código em ~15 meses | alta |
| **Releases** | Exatamente uma, **v0.1.0** (mesma do PyPI), nunca iterada | alta |
| **Testes/CI** | Nenhum diretório de teste / sinal de CI | alta |
| **Bug no core** | Issue aberta "The code of PPR seemed is wrong" (ago/2025) — no **algoritmo central de retrieval** — mais crashes não resolvidos | média |
| **Arquitetura** | `networkx`/`igraph` em memória, **pickle em disco local**; faiss/HNSW em arquivos; **sem DB, sem serviço, single-process**, dirigido por CLI/Streamlit sobre uma pasta | alta |
| **Multi-tenancy** | **Nenhuma** — estado é uma pasta única, sem isolamento/namespacing/concorrência | alta |
| **Uso em produção** | **Nenhuma evidência** — só blogs e o paper | alta |
| **Licença** | **MIT** — uso comercial liberado (o único sinal verde) | alta |

### 3.3. O "incremental update" é falso para streaming (o achado decisivo)

O README afirma suportar "incremental updates within heterogeneous graphs". **Lendo o código** (`build/Node.py`, `pipeline/INIT_pipeline.py`, `summary_generation.py`):

- A mudança é detectada por **hash SHA-256 dos paths dos documentos**; se o conjunto mudou, a state machine **reseta para `DOCUMENT_PIPELINE` e roda o pipeline inteiro de novo** — e **bloqueia num prompt interativo de console** ("enter 'y'"), não automatizável num backend.
- Há cache *parcial*: chunks já `processed` são pulados; o HNSW só adiciona nós novos. Documentos antigos **não** são re-extraídos. **Porém** —
- **O killer:** `summary_generation.py` roda `leidenalg.find_partition()` sobre **o grafo inteiro do zero a cada inserção** e regenera os sumários de comunidade (chamadas LLM). **Detecção de comunidade + sumarização de alto nível são recomputadas globalmente a cada insert** — custo O(corpus inteiro) por evento.

O paper **não menciona incremental** — o pipeline descrito é batch. Para o stream de eventos do Marketero, adicionar um evento dispara Leiden global + sumarização LLM global. **Bloqueador duro como está.** (Conf. alta — leitura de fonte.)

### 3.4. Veredito NodeRAG

❌ **Promissor mas research-grade. Não adotar como o "cérebro".** As *ideias* (nós tipados, PPR raso + dual entry, retrieval barato em tokens) valem ser **reimplementadas** sobre infra de verdade. **Nomear o NodeRAG como *o* motor na visão de produto é um passivo** — reposicionar como **inspiração**, não implementação. (MIT permite reaproveitar código e design.) **Ação recomendada:** atualizar a [visao-geral.md](../produto/visao-geral.md) §3 trocando "usando NodeRAG como motor" por "inspirado no design heterogêneo do NodeRAG".

---

## 4. Landscape de GraphRAG e a dimensão incremental

A dimensão que decide tudo para um produto de **stream** é a atualização incremental:

- **Microsoft GraphRAG — efetivamente batch.** Inserir num stream contínuo = re-indexação repetida → espiral de custo. Suporte incremental existe mas é parcial/doloroso (discussions #354, #511). **Eliminar.** (Conf. alta.)
- **LightRAG — genuinamente incremental** (set-merge de subgrafos; sem rebuild global). Melhor história de streaming documentada — boa **referência de arquitetura**. (Claims de custo "1/100" são marketing; direção é real.) (Conf. média.)
- **NodeRAG — falso-incremental** (§3.3). Melhor eficiência de retrieval, mas recompute global por insert. (Conf. alta.)
- **HippoRAG/2 — inserção contínua** estilo "memória", PPR sobre KG, mas **sem sumarização de alto nível**; bom enquadramento de "memória de agente". (Conf. média.)
- **Hybrid vector + rerank — o baseline honesto.** Incremental trivial (upsert), sem custo de extração LLM. A maioria do "GraphRAG em produção" é, na real, isto + expansão leve de grafo. (Conf. alta.)

> **Nota de custo de stream:** mesmo frameworks "incrementais" pagam **extração LLM por evento**. O design mais barato e correto é **debounce/batch dos eventos** (janela por conversa ou por hora) antes de extrair — **nunca extrair por mensagem**.

---

## 5. Graph stores & fit serverless

### Constraint (conf. alta)
**A maioria dos graph DBs não é serverless/edge-friendly** — assumem conexões stateful longevas e memória residente. Workers mantêm conexão viva só por invocação; conexões longas **esgotam o pool de origem do Hyperdrive**. Apontar Worker → Neo4j/Memgraph como se fosse um Node server longevo é anti-padrão.

### Achado adversarial — Kùzu morreu (conf. alta)
**Kùzu** (o graph DB *embedded*, que seria o melhor fit serverless) foi **adquirido pela Apple (~out/2025); repo arquivado, site fora do ar.** Construir nele hoje = depender de projeto abandonado/fork. **Não adotar Kùzu em greenfield.**

| Store | Modelo | Fit serverless/edge | Multi-tenant | Nota p/ Marketero |
|---|---|---|---|---|
| **Postgres + pgvector + Apache AGE** | Relacional + vetor + grafo openCypher **num só engine** | **Melhor fit** (via Hyperdrive, como qualquer PG) | Nativo: RLS + `tenant_id`; grafos por schema | ⭐ **Vencedor pragmático single-store** — um DB para relacional+vetor+grafo mata o lag de sync. Caveats: AGE devolve `agtype` (cast→jsonb); HNSW+AGE não paralelizam bem no mesmo plano; AGE menos battle-tested que Neo4j |
| **pgvector sozinho** | Vetor + relacional | Melhor fit | RLS / `tenant_id` | O store real do MVP; "arestas" como FK/junction + CTE recursiva antes de qualquer AGE |
| **Neo4j (Aura)** | Property graph | Ruim (stateful, conn longeva) | DB-por-tenant (limpo, pesado) ou `tenant_id` compartilhado (**footgun: query sem WHERE de tenant vaza dados entre tenants sem erro**) | Ecossistema mais maduro, mas 2º datastore p/ sincronizar + footgun multi-tenant |
| **FalkorDB** | Property graph (Redis) | **Melhor fit graph-nativo** (cold start ~1.1ms, p99 sub-140ms *vendor*) | First-class: muitos grafos isolados/instância | Melhor opção dedicada se sair do AGE; AWS/GCP. Latências **vendor — validar** |
| **Memgraph** | In-memory property graph | Ruim (in-memory, stateful) | Compartilhado/multi-instância | Rápido p/ analytics real-time, mas in-memory ≠ serverless |
| **Amazon Neptune** | Property/RDF | Gerenciado, não edge; VPC | Conta/grafo | Lock-in AWS pesado; overkill cedo |

---

## 6. Custo & latência

**Construção do grafo (extração LLM de entidade/relação):** ~17,6k tokens/doc; ~**$0,0055/doc** (GPT-4o-mini); **$5–6 por 1.000 docs** (classe mini); **$20–50/1M tokens** (classe GPT-4o). Extração ≈ **75%** do custo de indexação; indexar grafo é **3–5× o custo** de indexar vetor. (Conf. média-alta.)

> **Implicação p/ stream:** o custo é **extração LLM por evento, recorrente para sempre** — não um índice único. Usar **modelos pequenos** (mini/Haiku) para extração e **debouncar** eventos por janela de conversa. É aqui que GraphRAG ingênuo quebra a unit economics.

**Latência de retrieval:** hops de grafo/SQL somam só **~5–40 ms** (barato, vale se podam o candidate set). O custo real é **prompt bloat**: contexto de grafo pode inchar para 10⁴–4×10⁴ tokens/query (vs ~900 do vector vanilla) → mais custo/latência na **geração**, não no retrieval. (Conf. alta.)

---

## 7. Multi-tenant no grafo

Dois padrões: **grafo/DB por tenant** (isolamento duro, mas pesado/caro em escala — inviável p/ N tenants pequenos) vs **grafo compartilhado + `tenant_id`** (barato, mas em Neo4j-like **uma query sem o WHERE de tenant vaza dados entre tenants silenciosamente** — footgun grave p/ white-label).

**Melhor p/ Marketero:** Postgres torna isso o mais seguro — **Row-Level Security (RLS)** força isolamento no nível do engine (defense-in-depth, não só WHERE na aplicação), e grafos AGE podem ser escopados por schema de tenant. **Argumento forte a favor do Postgres single-store** sobre um graph DB dedicado. (FalkorDB também oferece grafos isolados por tenant se for a rota dedicada.) (Conf. alta.)

---

## 8. Recomendação faseada para o Marketero

**Caminho (c)→(b), nunca (a).** O grafo é destino, não ponto de partida.

**Fase 1 — MVP: vector + rerank no Postgres/pgvector** ⭐
- Store único: Postgres (Neon-style serverless) + pgvector + **RLS** p/ isolamento; edge-compatível via Hyperdrive.
- As relações que você **já conhece** (cliente↔conversa↔campanha↔venda) vivem como **FK + CTEs recursivas** — *isso já é um grafo*, consultável hoje, **custo zero de extração LLM**.
- Retrieval híbrido (vetor + BM25 + cross-encoder rerank) cobre as queries single-hop dominantes, barato e explicável.

**Fase 2 — graph-lite incremental: Apache AGE no mesmo Postgres** ⭐
- Adicionar quando houver casos multi-hop concretos ("clientes parecidos com X cruzando campanhas e sentimento de suporte").
- Extração **debounced/batched** por janela de conversa, em **modelo pequeno**. Continua um store, um modelo de conexão, um mecanismo de isolamento.
- Roubar o **design do NodeRAG** aqui: nós tipados + PPR raso, **sem** re-clustering global de comunidade (usar sumarização incremental/local).

**Fase 3 — só se escala/perf exigir: FalkorDB** para o workload quente de grafo (melhor fit serverless dedicado + multi-tenancy nativa) — apenas se a latência de traversal do AGE virar gargalo **medido**.

**Avisos explícitos:** não adotar **Microsoft GraphRAG** (batch incompatível c/ stream); não adotar **Kùzu** (morto out/2025); tratar **NodeRAG** como design de referência, não dependência; tratar todo número vendor (FalkorDB/Memgraph/LightRAG) como **direcional — validar na própria carga**.

---

## 9. Mitos refutados

- ❌ **"NodeRAG suporta atualização incremental para streaming"** — **refutado por leitura de código.** É re-run do pipeline por hash, com **Leiden global + sumários LLM globais a cada insert**, atrás de prompt interativo. (Blogs secundários superestimam isso.)
- ❌ **"GraphRAG completo é o caminho certo desde o MVP"** — **refutado.** Survey 2026: vector híbrido iguala/supera grafo no single-hop a fração do custo; grafo só paga em multi-hop/síntese.
- ❌ **"Kùzu é o graph DB embedded ideal p/ serverless"** — **refutado.** Adquirido pela Apple, repo arquivado out/2025; risco de abandono.
- ⚠️ **"Basta apontar o Worker para o Neo4j"** — **anti-padrão.** Conexões longevas esgotam o pool do Hyperdrive; graph DBs stateful não são edge-native.

---

## 10. Perguntas em aberto

1. **Stack confirmada:** Postgres (Neon?) + pgvector + AGE sobre Workers via Hyperdrive — validar contra a investigação de **arquitetura de referência** (ainda por fazer; `referencia/` vazio).
2. **Modelo de extração:** qual LLM pequeno (Haiku-class/local) para extração por evento, e qual a política de **debounce** (janela por conversa vs por hora) que segura a unit economics.
3. **O que realmente precisa de grafo:** mapear as queries multi-hop reais do produto antes de ligar o AGE — senão é grafo cedo demais.
4. **Validar o design NodeRAG na própria carga** se for reimplementado (eficiência de tokens é real?).
5. **Atualizar [visao-geral.md](../produto/visao-geral.md) §3 e glossário** — reposicionar NodeRAG de "motor" para "inspiração de design".
6. **Custo de IA fim-a-fim** (classificação por evento + extração + geração) merece investigação própria de **unit economics**.

---

## 11. Fontes

> Números de benchmark/custo/latência são direcionais (author/vendor-sourced) — validar na própria carga.

**NodeRAG (paper + código)**
- Paper — <https://arxiv.org/abs/2504.11544> · <https://arxiv.org/html/2504.11544v1>
- Repo + código lido — <https://github.com/Terry-Xu-666/NodeRAG> · `build/Node.py`, `pipeline/INIT_pipeline.py`, `summary_generation.py`, `HNSW_graph.py` (via GitHub API) · <https://api.github.com/repos/Terry-Xu-666/NodeRAG>
- Releases/issues/PyPI — <https://github.com/Terry-Xu-666/NodeRAG/releases> · <https://github.com/Terry-Xu-666/NodeRAG/issues> · <https://pypi.org/project/NodeRAG/>
- Site — <https://terry-xu-666.github.io/NodeRAG_web/>

**Landscape GraphRAG**
- Survey "When to use Graphs in RAG" — <https://arxiv.org/html/2506.05690v3>
- LightRAG — <https://github.com/HKUDS/LightRAG>
- Microsoft GraphRAG (incremental) — <https://microsoft.github.io/graphrag/index/methods/> · <https://github.com/microsoft/graphrag/discussions/354> · <https://github.com/microsoft/graphrag/discussions/511>
- HippoRAG / comparativos — <https://medium.com/graph-praxis/graphrag-vs-hipporag-vs-pathrag-vs-og-rag-choosing-the-right-architecture-for-your-knowledge-graph-a4745e8b125f>

**Graph stores & serverless**
- Postgres + AGE + pgvector — <https://yonk.dev/blog/graphrag-part2-postgres-age-pgvector/> · <https://datascientists.info/index.php/2026/05/13/postgres-unified-graph-rag/> · <https://age.apache.org/>
- Cloudflare Hyperdrive (conexões) — <https://developers.cloudflare.com/hyperdrive/concepts/connection-lifecycle/> · <https://developers.cloudflare.com/hyperdrive/concepts/connection-pooling/>
- Kùzu (aquisição) — <https://betakit.com/apple-strikes-deal-to-acquire-canadian-database-software-startup-kuzu/> · <https://uwaterloo.ca/computer-science/news/waterloo-based-graph-database-start-up-kuzu-acquired-apple>
- FalkorDB — <https://www.falkordb.com/blog/graph-database-performance-benchmarks-falkordb-vs-neo4j/> · <https://www.falkordb.com/blog/graph-database-multi-tenant-cloud-security/>
- Neo4j multi-tenant — <https://www.experoinc.com/insights/blog/multi-tenant-applications-in-neo4j>

**Custo & latência**
- Custo de extração/indexação — <https://blog.premai.io/graphrag-implementation-guide-entity-extraction-query-routing-when-it-beats-vector-rag-2026/> · <https://medium.com/graph-praxis/five-papers-quietly-killing-the-llm-tax-in-graphrag-5ff2e75923f9>
- Latência híbrida — <https://community.netapp.com/t5/Tech-ONTAP-Blogs/Hybrid-RAG-in-the-Real-World-Graphs-BM25-and-the-End-of-Black-Box-Retrieval/ba-p/464834>
