# ALMOX — PLAN

## Escopo do MVP
Login do almoxarife (multi-obra, isolado por RLS) + cadastro de ferramentas rastreadas **por unidade individual**, trabalhadores e empreiteiras + registro de eventos de **entrega e devolução** (com foto e assinatura na tela, devolução parcial e marcação de avaria) + **relatório** de fluxo e posse de ferramentas por trabalhador, com saldo derivado (disponível × em campo). **Só online** no MVP.

## Marcos / milestones

Estratégia: **fatias verticais** (cada milestone entrega algo funcional de ponta a ponta), não camadas horizontais (front inteiro → back depois). No Supabase o schema + RLS já é o backend, então subimos o esquema cedo e construímos as telas contra dados reais — validando cedo a parte de maior risco (RLS multi-obra e a máquina de estados de posse).

- **M0 — Fundação + spike de UX:** projeto Next.js + Supabase + deploy na Vercel; Auth e-mail/senha; schema base com RLS por obra. Inclui um **protótipo clicável** do fluxo de entrega/devolução (dados fake) para validar a tela do almoxarife (usuário de baixa qualificação técnica, fluxo rápido) **antes** de cravar o resto.
- **M1 — Cadastros:** CRUD de obra, ferramenta (tipo) + unidades individuais, trabalhador/empreiteira. Inventário exibido com **saldo derivado** (contagem por estado). → cobre passos 2-3 do DoD.
- **M2 — Entrega:** registrar `movimentacao` de ENTREGA (seleção de unidades, foto, assinatura na tela) → unidade vai para `EM_POSSE`; saldo atualiza. → passos 4-5 do DoD.
- **M3 — Devolução:** registrar DEVOLUCAO (**parcial**, com marcação de avaria) → unidade volta a `DISPONIVEL` ou `EM_MANUTENCAO`. Fecha o ciclo. → passos 6-7 do DoD.
- **M4 — Relatório:** tela de posse por trabalhador, saldo por ferramenta, avarias/perdas (consulta do engenheiro).
- **M5 — Ajuste fino:** estado `PERDIDA`, consentimento LGPD no cadastro/assinatura, polimento de UX (telas grandes, mínimo de digitação, câmera em 1 toque).

> Ordem amarrada ao Definition of Done: M0 = passo 1 (logar), M1 = passos 2-3, M2/M3 = passos 4-7. Ao fim do M3 o produto já cumpre o núcleo do DoD; M4/M5 consolidam.

## Faseamento sugerido
### Fase 1 — MVP
Entregar o núcleo descrito no MVP acima. Cobrir os itens **Must**:
- Cadastrar ferramentas
- Cadastrar funcionários
- Controle de fluxo de entrega e devoluções

### Fase 2 — Consolidação
- **Offline** — captura de eventos e fotos offline com sync ao reconectar (sem edição concorrente do mesmo item). Maior ganho de confiabilidade, dado que obra costuma ter sinal ruim.
- **Relatórios avançados** — exportação (CSV/PDF), filtros por período/empreiteira, histórico de avarias por unidade.

### Fase 3 — Evolução
- **Integração WhatsApp** — engenheiro consulta posse/saldo por mensagem e recebe o detalhamento de volta.
- **Escala / evolução** — dashboards gerenciais, múltiplas obras em escala, e demais itens conforme a operação amadurecer.

> Priorização Fase 2 vs 3: Offline foi colocado à frente do WhatsApp por ser o maior ganho de confiabilidade em campo. Se a consulta via WhatsApp se mostrar o pedido mais forte, os dois trocam de fase sem impacto no MVP.

## Dependências & restrições
- **Prazo:** O quanto antes
- **Equipe:** Sozinho(a)
- **Orçamento:** Baixo/enxuto

## Definition of Done
- 1. Logar
- 2. Cadastrar as ferramentas da obra com suas quantidades
- 3. Cadastrar o trabalhador que vai pegar a ferramenta para o dia de trabalho
- 4. Registrar o evento de entrega de ferramenta
- 5. Verificar instantaneamente o saldo de cada ferramenta no almoxarifado x saldo de ferramentas em uso no campo
- 6. Registrar o evento de devolução da ferramenta
- 7. Verificar instantaneamente o saldo de cada ferramenta no almoxarifado x saldo de ferramentas em uso no campo
