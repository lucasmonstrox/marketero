---
tipo: indice
status: estável
updated: 2026-06-21
description: O eixo funcionalidades — como cada módulo do produto se comporta. Uma spec por feature.
---

# Funcionalidades

Responde **como cada módulo se comporta**. Uma spec por feature do Marketero: o que faz,
em que ordem e com que invariantes. Organizado por **feature**, não por propósito.

**Entra aqui** a especificação de comportamento de um módulo (agentes, kanban, leads/CRM…).

**Não entra** o design visual do módulo (vai pra [`design/`](../design/)), a pesquisa que o
embasou (vai pra [`investigacoes/`](../investigacoes/)) nem a visão de produto (vai pra
[`produto/`](../produto/)).

## Documentos
- [agentes.md](agentes.md) — o **Agente** como IA conversacional que conduz um **Form** via
  FSM (LLM no roteamento); como amarra Forms e Campanhas e estende o mini-CRM.
- [kanban.md](kanban.md) — **triggers e automações** do funil Kanban estilo Bitrix24;
  invariante **trigger move o card / robô age na etapa**, com GraphRAG roteando a transição.
- [leads-crm.md](leads-crm.md) — fluxo **Lead Ads → inscrição → mini-CRM**: Instant Forms,
  webhook `leadgen`, modelo de dados, lead access e consentimento (LGPD). É o contrato de
  dados que `agentes.md` e `kanban.md` estendem.
