# CLAUDE.md — Almox

Guia para o Claude Code trabalhar neste repositório. Leia inteiro antes de qualquer tarefa.

## O que é o Almox

Sistema de controle de ferramentas do almoxarifado de obra. Cada trabalhador é identificado pelo **QR Code no capacete**. O almoxarife lança **retiradas e devoluções** pelo celular, e uma **TV no almoxarifado** mostra em loop quem está com o quê. Quando um funcionário de empreiteira não devolve uma ferramenta, o sistema avisa o dono e o encarregado da empreiteira com o valor de reposição, que será descontado na medição.

- Produto completo: `PRD.md`
- Ordem de implementação: `PLAN.md` (milestones M0–M12)
- Histórico do que foi feito: `CHANGELOG.md`

## Como trabalhar neste repo

1. Antes de começar, abra `PLAN.md` e identifique o **milestone em andamento**. Trabalhe só nele.
2. Ao terminar uma entrega, marque `[x]` no `PLAN.md` no mesmo commit.
3. Ao fechar um milestone: atualize a tabela de status, escreva a entrada no `CHANGELOG.md` e registre decisões novas na seção "Decisões" do `PLAN.md`.
4. Se uma tarefa exigir contrariar o PRD ou uma regra de negócio abaixo, **pare e pergunte**. Não contorne.
5. Prefira mudanças pequenas e testáveis. Rode lint e testes antes de considerar algo pronto.

## Stack

| Camada | Tecnologia |
|---|---|
| App e painel | Next.js (App Router) + React + TypeScript (strict) |
| Estilo | Tailwind CSS com os tokens do protótipo |
| Banco, auth, realtime, arquivos | Supabase (Postgres + RLS, Auth, Realtime, Storage) |
| Funções agendadas | Supabase Edge Functions / cron (encerramento automático 23:59) |
| Mobile | PWA instalável (service worker, IndexedDB para fila offline) |
| Leitura de QR | Câmera via biblioteca de leitura no navegador (ex.: `@zxing/browser`) |
| Notificações | Web Push (VAPID) + e-mail transacional (Resend ou SMTP) |
| Impressão | Agente Node local (`agente-impressao/`) → impressora ZPL/TSPL na porta 9100 |
| Testes | Vitest (unidade), Playwright (e2e) |
| Deploy | Vercel (app) + Supabase (dados) |

## Estrutura de pastas

```
/app
  /(app)            telas do celular (inicio, leitura, ficha, retirada, devolucao, lista, estoque, fechamento, cadastros)
  /tv               painel da TV (rota em tela cheia, token de dispositivo)
  /api              rotas de servidor (impressão, e-mail, push)
/components         componentes de UI (Botao, Cartao, IconeFerramenta, Contador…)
/lib
  /dominio          regras de negócio puras e testáveis (alocação de unidades, cálculo de avisos, permissões)
  /supabase         clientes e tipos gerados
  /formatos         formatarBRL, datas, normalizarTexto
/supabase
  /migrations       SQL versionado (nunca editar migration já aplicada; criar nova)
  /functions        edge functions (encerramento, avisos)
  seed.sql          dados de desenvolvimento do protótipo
/agente-impressao   serviço Node que roda no mini PC da TV
/e2e                testes Playwright
```

## Comandos

```bash
npm run dev            # app local
npm run lint           # lint + typecheck
npm test               # Vitest
npm run e2e            # Playwright
npx supabase start     # Supabase local
npx supabase db reset  # recria o banco local com migrations + seed
npm run gen:types      # gera tipos TS a partir do schema
```

## Glossário do domínio

| Termo | Significado |
|---|---|
| Obra | Canteiro onde o almoxarifado opera. Quase tudo é filtrado por obra. |
| Empresa | Construtora (própria) ou empreiteira (subcontratada). |
| Pessoa | Trabalhador com capacete. Não é usuário do sistema. |
| Usuário | Quem faz login: engenheiro, almoxarife ou consulta (encarregado, dono de empreiteira etc.). |
| Nome no capacete | Apelido impresso no adesivo (ex.: "ZÉ CARLOS"). |
| Token do QR | Código opaco e aleatório no QR do capacete. |
| Tipo de ferramenta | Ex.: Pá, Martelete. Tem valor de reposição e flag de alto valor. |
| Unidade | Cada peça física de um tipo, com código interno (ex.: `PA-05`). Não tem QR. |
| Posse | Registro vivo de qual unidade está com qual pessoa, desde quando e por qual via. |
| Via | `qr` (capacete lido e pessoa conferida) ou `manual` (escolhida na lista). |
| Pendência | Unidade que não voltou até o fim do dia. |
| Aviso | Notificação + e-mail à empreiteira com o valor a descontar na medição. |
| Medição | Fechamento periódico de pagamento da empreiteira. |

## Regras de negócio que nunca podem ser quebradas

Estas regras são validadas **no servidor** (RPC/RLS), não só na tela. Detalhes no `PRD.md §6`.

1. **Quem pegou, devolve.** A posse só muda por devolução da própria pessoa. Não existe transferência nem baixa por empresa.
2. **Devolução exige QR** de quem retirou. Exceção: unidades com `via = manual` podem voltar sem QR.
3. **Conferência obrigatória:** ao ler QR para lançar, o almoxarife confirma que é a pessoa. "Não é ele" grava ocorrência e **não registra nada**.
4. **Retirada exige confirmação explícita** ("Conferi pessoalmente…").
5. **Quantidade limitada às unidades livres.** A alocação é automática: na retirada, livres em ordem de código; na devolução, as mais antigas da pessoa.
6. **Avaria exige foto e motivo.** A unidade vai para `manutencao`.
7. **Fechamento do dia não dá baixa.** Só relatório e avisos.
8. **Aviso só para empreiteira.** Funcionário próprio → só engenheiro. O desconto é cancelado se a ferramenta voltar antes do fechamento da medição.
9. **Movimentos são imutáveis.** Nada de `UPDATE`/`DELETE` em `movimento` e `movimento_item`. Correção = movimento de `estorno` com motivo, só pelo engenheiro.
10. **Cadastros e valores só pelo engenheiro.**
11. **O QR contém só o token.** Nunca coloque nome, CPF, matrícula ou URL com dados pessoais no QR.

## Convenções de código

- **Idioma:** domínio e UI em português (nomes de tabelas, colunas, funções de domínio e textos). Termos técnicos genéricos (`useEffect`, `fetch`) seguem em inglês.
- **Banco:** `snake_case`, singular (`pessoa`, `movimento_item`). Toda tabela tem RLS ativa. Escritas de negócio passam por **RPC transacional** (`registrar_retirada`, `registrar_devolucao`…), nunca por insert direto do cliente.
- **Dinheiro:** sempre inteiro em **centavos**. Exibição só via `formatarBRL` → `R$ 1.234,56`. Entrada aceita `2.890,00` e `2890,00`. Nunca use float para dinheiro.
- **Datas:** `timestamptz` no banco; exibição no fuso `America/Sao_Paulo`, formato `dd/MM/yyyy` e `HH:mm`.
- **Busca:** sempre normalizar (minúsculas, sem acento) dos dois lados.
- **Regras puras** ficam em `/lib/dominio` com testes unitários. Componentes não decidem regra de negócio.
- **TypeScript strict**, sem `any`. Tipos do banco gerados (`npm run gen:types`).
- **Acessibilidade e campo:** alvos de toque ≥ 44 px; `<button>` de verdade; `aria-label` em botões só com ícone; contraste alto (uso sob sol).
- **Textos curtos**, linguagem de obra ("Retirada", "Devolveu tudo", "Não é ele").

## Identidade visual (Almox Design System v1.0)

Fonte da verdade visual: `design-system/` (marca, 32 ícones de interface, tokens). Tokens no `@theme` de `app/globals.css`, com nomes em português.
**Fluxos, telas e regras continuam vindo do PRD e do protótipo navegável**; as telas de referência do DS (transferências, reserva, prazo de devolução, "responsável") **não** se aplicam ao Almox.

| Token (DS) | Valor |
|---|---|
| Fundo app — canvas | `#F6F7F9` |
| Cartão — surface / sutil | `#FFFFFF` / `#F0F2F5` |
| Texto / secundário | `#1F2937` / `#586474` |
| Borda | `#E5E7EB` |
| Amarelo (primária) / hover | `#F4B400` / `#D99F00` |
| Grafite (ações, entrada) | `#1F2937` |
| Engenheiro / cadastros (info) | `#1E40AF` sobre `#DBEAFE` |
| Sucesso | `#166534` sobre `#DCFCE7` |
| Aviso | `#854D0E` sobre `#FEF3C7` |
| Erro / pendência | `#991B1B` sobre `#FEE2E2` |
| Foco | contorno 3 px `#1D4ED8`, afastado 3 px |
| TV (tema escuro do DS) — fundo / cartão / texto | `#101720` / `#1F2937` / `#F9FAFB` |
| Raios | botão 10 px, cartão 16 px |
| Fontes | Inter Variable (local, `app/fontes/`), JetBrains Mono só para códigos de unidade |

- Marca: componente `Marca` (nunca escreva "almox" como texto no lugar do wordmark). `tom="reversa"` em fundo escuro.
- Ícones de interface: `IconeInterface` (gerado por `scripts/gerar-icones-interface.mjs`).
- Ícones de ferramenta: SVGs de traço do protótipo (pá, enxada, carrinho, colher, régua, linha, furadeira, martelete, esmerilhadeira, serra circular, martelo, escada, extensão), sempre com o **nome escrito embaixo**.

## Painel da TV

- Rota `/tv`, autenticação por **token de dispositivo** (somente leitura).
- Loop: páginas de 12 cartões por pessoa (ordem alfabética, 8 s, esmaecimento 0,6 s) → colunas por empresa rolando a 45 px/s (pausas 2,5 s / 3 s) → recomeça.
- Sem totais nem estoque na TV: esses números ficam só no app.
- Animar com `transform` + `requestAnimationFrame`; atualizações de dados não podem reiniciar a animação em curso.
- Tem que rodar dias seguidos: limpar timers e listeners, sem vazamento de memória.

## Agente de impressão

- Fica em `/agente-impressao`, roda no mini PC da TV, **na rede da obra**.
- Autentica com token de dispositivo; escuta `trabalho_impressao` pendentes da sua obra; envia o payload ZPL/TSPL para `ip:9100`; atualiza o status.
- Nunca exponha a impressora à internet. O agente só faz conexões de saída.

## Segurança e LGPD

- Sem biometria, sem foto de pessoas. Fotos só de ferramentas avariadas (Storage privado, URLs assinadas).
- Consulta de empreiteira só vê a própria empresa (RLS).
- Segredos só em variáveis de ambiente (`.env.example` lista todas, sem valores reais).
- Não registre e-mails ou tokens em logs.

## O que não fazer

- Não criar QR para ferramentas, leitura biométrica ou foto de rosto (decisões do PRD).
- Não criar "baixa geral" ou devolução em nome de outra pessoa.
- Não editar nem apagar movimentos.
- Não usar `float` para dinheiro nem formatar moeda à mão.
- Não colocar regra de negócio só no front-end.
- Não pular milestones nem marcar entrega como concluída sem os critérios de aceite.
