# Almox

Controle de ferramentas do almoxarifado de obra pelo QR do capacete.

- Produto: [`PRD.md`](PRD.md) · Plano: [`PLAN.md`](PLAN.md) · Regras para quem codifica: [`CLAUDE.md`](CLAUDE.md) · Histórico: [`CHANGELOG.md`](CHANGELOG.md)

## Rodar localmente

Requer Node 24 e Docker (para o Supabase local).

```bash
npm install
cp .env.example .env.local   # preencha com as chaves de `npx supabase start`
npm run dev                  # http://localhost:3000
```

## Verificação

```bash
npm run format:check   # Prettier
npm run lint           # ESLint + tipos
npm test               # Vitest
npm run e2e            # Playwright (faz o build e sobe o app na porta 3200)
```
