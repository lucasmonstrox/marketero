# Marketero — Visão Geral

> Automação de marketing e atendimento inteligente para redes sociais, com uma IA de GraphRAG no centro de tudo.

## O que é

O **Marketero** é uma plataforma que unifica **marketing**, **vendas** e **atendimento** em um único cérebro de IA. Em vez de tratar cada canal (Instagram, Facebook, WhatsApp, marketplaces, loja) como uma ilha isolada, o Marketero cruza esses canais para que o conteúdo, as conversas e os dados de venda se retroalimentem.

A ideia central: **cruzar canais de venda, social e atendimento** em um só lugar, com uma IA que entende o contexto completo do negócio.

## Criadores

Produto criado por:

- **monstrox89**
- **bgzin**
- **jgbriel**

## Objetivo

Entregar **automação de marketing inteligente** e **atendimento automatizado**, eliminando o trabalho manual repetitivo e dando ao time de marketing/vendas uma visão única de todos os canais — sustentada por métricas completas e por uma IA que atende, responde e sugere.

## Pilares do produto

### 1. Automação de marketing para redes sociais

- **Inbox unificado** — todas as DMs e mensagens de redes sociais em um só lugar.
- **Gestão de comentários** — responder, moderar e engajar comentários automaticamente.
- **Agendamento de posts (scheduling)** — programar publicações para Instagram, Facebook e demais canais.
- **Criação de criativos com IA** — uso do **Nano Banana** (modelo de geração de imagem do Google, Gemini) para gerar criativos sob demanda.
- **Campanhas** — campanhas no WhatsApp, posts no Instagram, posts no Facebook, e cruzamento entre elas.

#### Automação de fluxos (rules + IA)

O coração da automação é reagir a **eventos dos canais** de forma autônoma. Cada evento que chega é **classificado pela IA** e disparado em uma ação. Exemplos:

- **Comentário novo no Facebook/Instagram** → a IA **classifica** (dúvida, elogio, reclamação, intenção de compra, spam) e decide a ação:
  - **Responder** automaticamente.
  - **Ignorar** (ruído/spam).
  - **Sugerir um produto** relevante na resposta.
  - **Escalar** para um humano quando necessário.
- **Mensagem nova no Inbox/WhatsApp** → classificar intenção, responder com a base de conhecimento (GraphRAG) ou abrir um atendimento.
- **Gatilhos de campanha** → disparar mensagem/post conforme regra e horário.

O modelo é **evento → classificação → ação**, onde as ações possíveis são configuráveis (responder, ignorar, sugerir produto, escalar, etiquetar, etc.) e a IA escolhe — ou sugere — a melhor com base no contexto do grafo de conhecimento.

### 2. Atendimento inteligente

- **WhatsApp (Zap)** — atendimento automatizado, respostas a clientes.
- **FAQ automatizado** — respostas a perguntas frequentes.
- **Triagem e sugestão** — a IA sugere respostas e próximos passos para o time.

### 3. IA com GraphRAG (NodeRAG)

O diferencial do Marketero é uma **IA potente baseada em GraphRAG**, usando **[NodeRAG](https://github.com/Terry-Xu-666/NodeRAG)** como abordagem de recuperação sobre grafo de conhecimento. Essa IA:

- **Atende** clientes nos canais.
- **Responde comentários** nas redes sociais.
- **Sugere** ações, conteúdos e respostas ao time.

O grafo de conhecimento conecta clientes, produtos, conversas, campanhas e histórico de venda — permitindo respostas contextualizadas que um RAG vetorial tradicional não alcança.

### 4. Integrações de venda

- **Lojas** (e-commerce próprio).
- **Marketplaces** — Facebook (Marketplace), TikTok (Shop), Mercado Livre, Mercado Pago, OLX, entre outros.

O objetivo é trazer os dados de venda para dentro do mesmo grafo, fechando o ciclo entre **conteúdo → conversa → conversão**.

### 5. Métricas

Visão completa e unificada de métricas de todos os canais — social, atendimento e venda — para medir o impacto real de cada campanha e interação.

## Proposta de valor

| Dor atual | Como o Marketero resolve |
|-----------|--------------------------|
| Canais isolados (social, zap, loja) | Cruzamento de canais em um cérebro único |
| Atendimento manual e lento | IA atende, responde e sugere |
| Criação de criativos custosa | Geração com Nano Banana sob demanda |
| Falta de visão de métricas | Métricas unificadas de ponta a ponta |
| RAG raso, sem contexto | GraphRAG (NodeRAG) com grafo de conhecimento |

## Glossário

- **GraphRAG** — Retrieval-Augmented Generation sobre um grafo de conhecimento, em vez de apenas busca vetorial.
- **NodeRAG** — abordagem de GraphRAG baseada em uma estrutura heterogênea de nós, usada como motor de recuperação do Marketero.
- **Nano Banana** — modelo de geração/edição de imagem do Google (Gemini) usado para criar criativos.
- **Zap** — WhatsApp.

## Documentos relacionados

- [concorrentes.md](./concorrentes.md) — análise de mercado e concorrentes.
