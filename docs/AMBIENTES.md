# Ambientes do Almox

| Ambiente | Banco | Para quê |
|---|---|---|
| Local | Supabase no Docker (`npx supabase start`) | Desenvolver e rodar testes (pgTAP e e2e). |
| Prévia de cada PR | **Banco temporário do PR (Supabase Branching)** | Testar o PR com migrations e `seed.sql` limpos, sem mexer em produção. |
| Produção | `almox-prod` | A obra. |

O antigo `almox-dev` (banco fixo de testes) é substituído pelo Branching e pode ser apagado depois
que o primeiro PR com banco temporário funcionar (ver o fim deste documento).

## Como funciona o Branching

- Ao abrir um PR, o Supabase cria um banco só dele, aplica as migrations de `supabase/migrations` e
  o `supabase/seed.sql` (usuários e dados de teste, nunca dados da obra) e comenta no PR quando está
  pronto. Novos commits aplicam só as migrations novas.
- A integração com a Vercel grava na prévia do PR o endereço e as chaves desse banco. O app aceita
  os nomes novos e os antigos das chaves (`PUBLISHABLE_KEY`/`ANON_KEY`,
  `SECRET_KEY`/`SERVICE_ROLE_KEY`).
- Ao fechar ou fazer o merge do PR, o banco temporário é apagado. Custo: só enquanto o PR está
  aberto (cobrado por hora).
- **"Deploy to production" fica desligado.** Migration em produção continua manual e antes do merge
  (`npx supabase link --project-ref <prod>` → `npx supabase db push` → voltar o link), com o OK do
  dono: assim o código novo nunca roda com o banco antigo.
- O banco do PR não tem os segredos do Vault: o agendamento dos envios (avisos por e-mail/push) não
  roda lá. Isso é esperado.

## Ligar (dono do sistema, uma vez)

1. **Supabase › projeto `almox-prod` › Project Settings › Integrations › GitHub Integration**
   - *Authorize GitHub* e escolher o repositório `LuizFPires/almox`.
   - *Working directory*: `.`
   - *Automatic branching*: **ligado**.
   - *Supabase changes only*: **desligado** (todo PR precisa de banco para a prévia funcionar).
   - *Deploy to production*: **desligado**.
   - *Enable integration*.
2. **Vercel › Integrations › Marketplace › Supabase**: instalar e conectar o projeto `almox-prod` ao
   projeto `almox` da Vercel (é o que grava as variáveis do banco de cada PR na prévia).
3. Abrir um PR qualquer e conferir: comentário do Supabase no PR com o banco pronto, e a prévia da
   Vercel entrando com `engenheiro@almox.exemplo` (senha do seed).

## Depois do primeiro PR com banco temporário funcionando

1. **Vercel › almox › Settings › Environment Variables (Preview)**: apagar as variáveis que
   apontam para o `almox-dev` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY` só em *Preview*), se a integração não as substituiu.
2. **Supabase › `almox-dev` › Settings › General › Delete project.**
3. Avisar o Claude: o CLI deixa de ficar ligado ao `almox-dev` (fica sem link e só liga em
   produção na hora de publicar).
