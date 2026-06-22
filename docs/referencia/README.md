---
tipo: indice
status: estável
updated: 2026-06-22
description: O eixo referência — o contrato técnico. Stack, schema e decisões de arquitetura consolidadas.
---

# Referência

Responde **qual é o contrato técnico**. Consolida as decisões que saíram das
[`investigacoes/`](../investigacoes/) numa stack coerente e **valida as suposições
load-bearing** antes de virarem `planos/` e código.

**Entra aqui** o contrato durável: stack, modelo de dados, fronteiras (o que roda onde),
isolamento multi-tenant. **Não entra** a pesquisa que embasou (vai pra `investigacoes/`)
nem o passo-a-passo de implementação (vai pra `planos/`).

- [arquitetura.md](arquitetura.md) — stack convergente (Cloudflare Workers + Postgres único
  + Claude): topologia, camada de dados (corrige a suposição AGE-no-Neon → grafo via CTEs),
  multi-tenancy, vault de credenciais OAuth, pipeline de eventos, runtime do agente, RAG
  faseado, classificação e modelo de dados consolidado.
