# Changelog — Almox

Registro do que foi entregue em cada milestone (ver `PLAN.md`).

## M0 — Fundação do projeto (em andamento)

### Adicionado
- App Next.js 16 (App Router) com TypeScript estrito, ESLint, Prettier e Tailwind v4.
- Tokens visuais do protótipo em `app/globals.css` (`@theme`) e fontes Barlow, Barlow Condensed e JetBrains Mono.
- Utilitários em `lib/formatos`: `formatarBRL`/`lerBRL` (sempre em centavos), datas no fuso `America/Sao_Paulo` e `normalizarTexto` para busca sem acento.
- Componentes base: `IconeFerramenta` (13 ícones do protótipo, sempre com o nome embaixo), `Botao`, `Cartao`, `Contador`, `Indicador`, `Cabecalho`, `BarraInferior`, `RodapeAcao`.
- Tela inicial vazia (`/inicio`) no visual do protótipo; abas da barra inferior com "Em breve"; esqueleto do painel `/tv`.
- PWA: manifest, ícones (incluindo maskable e apple-touch-icon), service worker com tela offline e meta tags para iPhone.
- Supabase local (`supabase/`), clientes de navegador e servidor em `lib/supabase` e `.env.example` com todas as variáveis previstas.
- Testes: Vitest (unidade e componentes) e Playwright (Android, iPhone e TV); CI no GitHub Actions.

### Pendente para fechar o M0
- Projetos Supabase dev e prod na nuvem (criados pelo dono no painel).
- Importar o repositório na Vercel (produção = `main`, preview por PR) e testar a instalação num celular real.
