# Almox

Controle de ferramentas do almoxarifado de obra pelo QR do capacete.

- Produto: [`PRD.md`](PRD.md) · Plano: [`PLAN.md`](PLAN.md) · Regras para quem codifica: [`CLAUDE.md`](CLAUDE.md) · Histórico: [`CHANGELOG.md`](CHANGELOG.md)

## Rodar localmente

Requer Node 24 e Docker (para o Supabase local).

```bash
npm install
npx supabase start           # Supabase local nas portas 544xx (precisa do Docker)
npx supabase status -o env   # copie URL e PUBLISHABLE_KEY para o .env.local (modelo: .env.example)
npm run dev                  # http://localhost:3000
```

Usuários de teste do seed (só local e `almox-dev`, senha `almox-dev-2026`):

| E-mail | Perfil |
|---|---|
| `engenheiro@almox.exemplo` | Engenheiro na Obra Demonstração, consulta na Obra B |
| `almoxarife@almox.exemplo` | Almoxarife |
| `mestre@almox.exemplo` | Consulta (obra inteira) |
| `formas@almox.exemplo` | Consulta da Fôrmas Ribeiro (só a própria empresa) |

E-mails do link mágico local chegam no Mailpit: http://127.0.0.1:54424

## Verificação

```bash
npm run format:check   # Prettier
npm run lint           # ESLint + tipos
npm test               # Vitest
npx supabase test db   # testes de banco (pgTAP)
npm run e2e            # Playwright (faz o build e sobe o app na porta 3200)
```
