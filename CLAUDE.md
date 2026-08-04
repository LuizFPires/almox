# CLAUDE.md

Guia deste projeto para sessões futuras do Claude Code.

## O que é
**ALMOX** — App para controle de fluxo de entrega / devolução de ferramentas de almoxarifado em uma obra

Hoje o controle de entrega e devolução de ferramentas entre o almoxarifado e os trabalhadores no campo é feito de forma manual, controle em caderno, muitas vezes com um madeirite pregado no fundo da sala com uma lista das pessoas e quais ferramentas estão dispostas com elas naquele momento. E isso é um processo muito lento e que costuma falhar muito, principalmente no controle das devoluções e de quem pegou o que. Então ao final da obra, invariavelmente, existe muita perda de ferramentas, pela perda do controle no dia a dia. Fica difícil cobrar de determinado funcionário a devolução de uma ferramenta, se não temos absoluta certeza que está com ele.

## Como rodar
**Stack:** Next.js (App Router) · Supabase (Postgres + Auth + Storage) · deploy na Vercel.

**Pré-requisitos:** Node LTS, conta Supabase, conta Vercel.

**Variáveis de ambiente** (`.env.local`, nunca commitado):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (apenas server-side)

**Dev:** `npm install` → `npm run dev` (http://localhost:3000).

> Comandos exatos a confirmar quando o projeto for scaffoldado no M0.

## Como editar
Consulte `SPEC.md` (arquitetura e modelo de dados) e `PLAN.md` (faseamento). Priorize os itens **Must** do `PRD.md`.

## Convenções
- **Idioma:** Português (Brasil)
- **Tom:** Simples e direto
- **Tema:** Escuro

## Pontos de atenção

**Decisões de arquitetura (não violar)**
- **Rastreio por unidade individual**, não por saldo. O saldo é sempre **derivado** (contagem de unidades por estado) — nunca um campo editável.
- **Estado da unidade só muda via `movimentacao`** (entrega/devolução) ou baixa/perda explícita. Máquina de estados: DISPONIVEL → EM_POSSE → DISPONIVEL/EM_MANUTENCAO/PERDIDA/BAIXADA (ver `SPEC.md`).
- **Multi-obra por RLS:** toda tabela tem `obra_id`; policies filtram por `perfil_obra`. Um almoxarife nunca vê outra obra.
- **Fotos/assinaturas** no Supabase Storage privado (signed URLs) — sem URLs públicas.

**Premissas assumidas**
- Device único do almoxarife; trabalhador não tem login (só assina na tela).
- Só online no MVP (offline é Fase 2). Devolução parcial suportada.

**Incógnitas a resolver** (ver `PRD.md`)
- Identificação física da unidade (etiqueta/QR/nº manual); regra de PERDIDA (manual × N dias); foto na devolução sempre × só em avaria; cadastro do inventário inicial; prazo de retenção LGPD; papel/UX do engenheiro.

**Non-goals (não implementar agora)**
- Material de consumo; patrimônio/financeiro; manutenção/OS; app do trabalhador; WhatsApp e offline (fases futuras); multi-idioma.
