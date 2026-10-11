# Changelog — Almox

Registro do que foi entregue em cada milestone (ver `PLAN.md`).

## M1 — Banco, autenticação e perfis (em andamento)

### Adicionado
- Schema completo do PRD §8 em `supabase/migrations`, com **perfil por obra** (`usuario_obra`), dinheiro em centavos, `timestamptz` e chaves compostas que impedem misturar obras. Matrícula automática (`P-0001`) e `qr_token` opaco gerados no banco.
- RLS em todas as tabelas: acesso por obra e perfil; cadastros só pelo engenheiro; consulta de empreiteira vê só a própria empresa; `qr_token` ilegível pelo cliente; anônimo sem acesso.
- Movimentos imutáveis (RN-18) por gatilho, até para o administrador; esqueletos das RPCs `registrar_retirada`, `registrar_devolucao` e `registrar_ocorrencia` com checagem de perfil.
- 30 testes de banco (pgTAP) rodando no CI.
- Seed de desenvolvimento: 2 obras, 6 empresas, 30 pessoas, 13 tipos (84 unidades), retiradas do dia e usuários de teste por perfil.
- Login com senha e link mágico, `proxy.ts` renovando a sessão, rotas protegidas, retorno seguro (`destinoSeguro`).
- Perfil e obra no app: selo de perfil, tela "Conta e obra" (trocar obra e sair), abas e telas conforme `lib/dominio/permissoes`.
- e2e de login por perfil; CI sobe o Supabase local, roda pgTAP e confere os tipos gerados.
- `almox-dev` com as migrations e o seed; cadastro público desligado no Auth.

## M0 — Fundação do projeto (concluído em 11/10/2026)

### Adicionado
- App Next.js 16 (App Router) com TypeScript estrito, ESLint, Prettier e Tailwind v4.
- Identidade do Almox Design System v1.0 (`design-system/`): marca (`Marca`), Inter Variable local, tokens claro/escuro em `app/globals.css`, 32 ícones de interface (`IconeInterface`) e ícones do app gerados da marca.
- Utilitários em `lib/formatos`: `formatarBRL`/`lerBRL` (sempre em centavos), datas no fuso `America/Sao_Paulo` e `normalizarTexto` para busca sem acento.
- Componentes base: `IconeFerramenta` (13 ícones do protótipo, sempre com o nome embaixo), `Botao`, `Cartao`, `Contador`, `Indicador`, `Cabecalho`, `BarraInferior`, `RodapeAcao`.
- Tela inicial vazia (`/inicio`) com a estrutura do protótipo navegável e do PRD F-01 ("Ler QR do capacete"); abas da barra inferior com "Em breve"; esqueleto do painel `/tv`.
- PWA: manifest, ícones (incluindo maskable e apple-touch-icon), service worker com tela offline e meta tags para iPhone.
- Supabase local (`supabase/`), clientes de navegador e servidor em `lib/supabase` e `.env.example` com todas as variáveis previstas.
- Testes: Vitest (unidade e componentes) e Playwright (Android, iPhone e TV); CI no GitHub Actions (verde).

### Infraestrutura
- Repositório público `LuizFPires/almox`; CI no GitHub Actions.
- Supabase na nuvem: `almox-dev` e `almox-prod` (São Paulo).
- Vercel: produção em https://almox-chi.vercel.app a partir da `main` (variáveis do `almox-prod`); prévia por PR com o `almox-dev`.
- App instalado e testado em celular (Android e iPhone) a partir da produção.
- Playwright aceita `E2E_BASE_URL` para testar um deploy (suíte verde contra a produção).
