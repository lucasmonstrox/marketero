---
tipo: indice
status: estável
updated: 2026-06-21
description: Mapa da documentação do Marketero, organizada por eixo (propósito).
---

# Documentação — Marketero

A `docs/` é organizada por **eixo (o propósito do documento)**, não por tema solto.
Cada pasta responde a uma pergunta diferente:

| Eixo | Pergunta que responde | Natureza |
| --- | --- | --- |
| [`produto/`](produto/) | Por quê · o quê · pra quem | Documentos fundadores e de estado |
| [`investigacoes/`](investigacoes/) | O que estudei pra decidir | Pesquisa com evidência (APIs, mercado, tooling) |
| [`funcionalidades/`](funcionalidades/) | Como cada módulo se comporta | Spec por feature (agentes, kanban, leads/CRM) |
| [`design/`](design/) | Como o produto parece | Cores, tokens, componentes e UI (visual) |
| `negocio/` | Quais são as regras decididas | Regras de domínio (RN-*) — _ainda sem conteúdo_ |
| `planos/` | Como vamos implementar | Planos executáveis — _ainda sem conteúdo_ |
| `referencia/` | Qual é o contrato técnico | Stack, schema — _ainda sem conteúdo_ |

> O fluxo caminha da pesquisa à entrega: **`investigacoes/` → decisão (`produto/` ·
> `funcionalidades/` · `design/`) → `planos/` → `referencia/`**. Os três eixos sem pasta
> existem como reserva — criar a pasta quando o primeiro documento daquele tipo nascer.

---

## produto/ — visão e estado
- [visao-geral.md](produto/visao-geral.md) — documento fundador: cérebro de IA GraphRAG
  cruzando social, venda e atendimento no modelo evento → classificação → ação.

## investigacoes/ — pesquisa antes de decidir
Ver [investigacoes/README.md](investigacoes/README.md).
- [facebook.md](investigacoes/facebook.md) — API da Meta/Facebook (Graph/Marketing v25.0).
- [instagram.md](investigacoes/instagram.md) — Plataforma Instagram (webhooks, DMs, comentários).
- [tiktok.md](investigacoes/tiktok.md) — APIs do TikTok (orgânico, ads, Shop).
- [twitter.md](investigacoes/twitter.md) — X (Twitter) API após as mudanças de 2026.
- [concorrentes.md](investigacoes/concorrentes.md) — benchmark de 22 concorrentes verificados.
- [editores-ui-page-form-builders.md](investigacoes/editores-ui-page-form-builders.md) — page/form builders (build vs buy).
- [workflows-visuais.md](investigacoes/workflows-visuais.md) — packages para editor visual de workflows.

## funcionalidades/ — como cada módulo se comporta
Ver [funcionalidades/README.md](funcionalidades/README.md).
- [agentes.md](funcionalidades/agentes.md) — o Agente que conduz um Form via FSM.
- [kanban.md](funcionalidades/kanban.md) — triggers e robôs do funil Kanban (estilo Bitrix24).
- [leads-crm.md](funcionalidades/leads-crm.md) — fluxo Lead Ads → inscrição → mini-CRM.

## design/ — como o produto parece
Ver [design/README.md](design/README.md).
- [design-system.md](design/design-system.md) — tokens, temas, componentes e padrões de UI (white-label/multi-tenant).

---

### Convenção de frontmatter

Todo `.md` abre com:

```yaml
---
tipo: produto | negocio | design | investigacao | funcionalidade | plano | referencia
status: rascunho | estável | obsoleto
updated: AAAA-MM-DD
description: <uma linha>
---
```

Os índices (`README.md` de cada eixo) usam `tipo: indice`. Com o frontmatter em todos os
documentos, este mapa é **gerável** a partir dos `description:` em vez de mantido à mão.
