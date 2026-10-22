# PLAN — Almox

Plano de implementação em **milestones**. Cada milestone entrega algo que funciona de ponta a ponta e pode ser testado sozinho.
Fonte da verdade do produto: `PRD.md`. Regras para quem codifica: `CLAUDE.md`.

## Como usar este plano

- Trabalhe **um milestone por vez**, na ordem. Só comece o próximo quando todos os critérios de aceite do atual estiverem ✅.
- Marque cada entrega `[x]` assim que concluída, no mesmo commit.
- Ao fechar um milestone: atualize a tabela de status abaixo, registre o que foi feito em `CHANGELOG.md` e anote decisões novas em "Decisões" no fim deste arquivo.
- Se algo do PRD se mostrar inviável, **pare e registre** em "Decisões" antes de mudar o escopo.

## Status

| # | Milestone | Status | Concluído em |
|---|---|---|---|
| M0 | Fundação do projeto | ✅ Concluído | 11/10/2026 |
| M1 | Banco, autenticação e perfis | ✅ Concluído | 11/10/2026 |
| M2 | Cadastros do engenheiro | ✅ Concluído | 11/10/2026 |
| M3 | Adesivo do capacete e impressão | ✅ Concluído (critério de 10 s conferido no simulador; falta a impressora real) | 11/10/2026 |
| M4 | Identificação por QR e ficha da pessoa | ✅ Concluído (câmera conferida no Chromium; falta testar no Android e no iPhone reais) | 11/10/2026 |
| M5 | Retirada | ✅ Concluído | 11/10/2026 |
| M6 | Devolução e avaria | ✅ Concluído | 11/10/2026 |
| M7 | Lista, estoque e busca | ✅ Concluído | 11/10/2026 |
| M8 | Painel da TV | ✅ Concluído (soak acelerado no build de produção; falta conferir 60 fps e 72 h no mini PC real) | 12/10/2026 |
| M9 | Fechamento do dia e avisos às empreiteiras | ✅ Concluído (e-mail real depende da conta no Resend; notificação conferida até a inscrição) | 12/10/2026 |
| M10 | Offline, auditoria e endurecimento | ✅ Concluído (Sentry liga com o DSN; leitor jsQR e política de dados a validar no piloto e com o jurídico) | 12/10/2026 |
| M11 | Piloto em obra | 🟨 Preparado: código e documentos prontos (13/10/2026); falta o piloto em campo (30 dias) | — |
| M12 | Conector ioo | ⬜ A fazer | |

Legenda: ⬜ A fazer · 🟨 Em andamento · ✅ Concluído · ⛔ Bloqueado

---

## M0 — Fundação do projeto

**Objetivo:** repositório pronto, app vazio publicado e instalável no celular, com a identidade visual do protótipo.

**Entregas**
- [x] Repositório com Next.js (App Router) + TypeScript estrito + Tailwind
- [x] Projeto Supabase (dev e prod) criado e variáveis de ambiente documentadas em `.env.example` — `almox-dev` e `almox-prod` (São Paulo)
- [x] Deploy contínuo (Vercel) a partir da branch `main`; preview por PR — produção em https://almox-controle.vercel.app (Production → almox-prod, Preview → almox-dev)
- [x] PWA: manifest, ícones, service worker básico, instalável em Android e iPhone
- [x] Design tokens do protótipo no tema do Tailwind (`@theme` em `globals.css`, Tailwind v4) (cores, fontes Barlow / Barlow Condensed / JetBrains Mono, raios, espaçamentos)
- [x] Componentes base: `Botao`, `Cartao`, `Contador`, `IconeFerramenta` (biblioteca de ícones SVG do protótipo), `Cabecalho`, `BarraInferior`, `Rodape de ação`
- [x] Utilitários: `formatarBRL` (centavos → `R$ 1.234,56`), datas no fuso `America/Sao_Paulo`, normalização de texto para busca (sem acento)
- [x] Lint, formatação, testes unitários (Vitest) e e2e (Playwright) rodando no CI
- [x] `CHANGELOG.md` criado

**Critérios de aceite**
- App abre no celular, pode ser instalado na tela inicial e mostra a tela inicial vazia com o visual do protótipo.
- `formatarBRL(123456)` retorna `R$ 1.234,56` (teste).
- CI verde.

**Depende de:** —

---

## M1 — Banco, autenticação e perfis

**Objetivo:** modelo de dados completo, login e permissões por perfil garantidas no banco.

**Entregas**
- [x] Migrations SQL com todas as entidades do PRD §8 (`obra`, `empresa`, `pessoa`, `usuario`, `tipo_ferramenta`, `unidade`, `posse`, `movimento`, `movimento_item`, `avaria`, `ocorrencia`, `fechamento_dia`, `aviso`, `impressora`, `trabalho_impressao`, `dispositivo_tv`)
- [x] Valores monetários em centavos (`integer`); timestamps `timestamptz`
- [x] **RLS** em todas as tabelas: por obra e por perfil (engenheiro / almoxarife / consulta; consulta de empreiteira vê só a própria empresa)
- [x] `movimento` e `movimento_item` **somente inserção** (sem update/delete) — RN-18
- [x] Funções no banco (RPC) transacionais: `registrar_retirada`, `registrar_devolucao`, `registrar_ocorrencia` (esqueleto, implementadas em M5/M6)
- [x] Login por e-mail (senha + link mágico); tela de login no visual do app
- [x] Seletor de obra (quando o usuário tem mais de uma)
- [x] Seed de desenvolvimento com os dados do protótipo (30 pessoas, 6 empresas, 13 tipos, valores de exemplo)
- [x] Tipos TypeScript gerados a partir do schema

**Critérios de aceite**
- Testes de RLS: almoxarife não consegue inserir em `tipo_ferramenta`; consulta não consegue inserir em `movimento`; consulta de empreiteira não lê pessoas de outra empresa.
- Tentativa de `UPDATE`/`DELETE` em `movimento` falha.
- Login funciona e o app mostra o perfil correto.

**Depende de:** M0

---

## M2 — Cadastros do engenheiro

**Objetivo:** o engenheiro cadastra tudo o que a obra precisa para operar.

**Entregas**
- [x] Área "Cadastros" visível só para engenheiro; demais perfis veem a tela "Só o engenheiro cadastra"
- [x] **Empresas:** criar/editar; tipo própria/empreiteira; cor; dono (nome + e-mail); encarregado (escolhido entre pessoas da empresa) + e-mail; data da próxima medição; alerta "falta e-mail"
- [x] **Pessoas:** nome completo, nome no capacete (sugere primeiro nome, editável, maiúsculas), função, empresa; matrícula automática; `qr_token` aleatório e único gerado no servidor; inativar (não apaga)
- [x] **Ferramentas:** tipo com ícone, **valor de reposição R$/un** (entrada no formato brasileiro), alto valor; adicionar N unidades (códigos internos sequenciais); quantidade 0 = só atualiza valor
- [x] Validações de formulário (nome completo com sobrenome, e-mail válido, valor > 0)
- [x] Log de alterações de valor (quem, quando, de/para)
- [x] Usuários: engenheiro dá acesso (e-mail, nome, perfil, empresa da consulta restrita) com **senha provisória** mostrada uma vez; troca obrigatória no primeiro login; remover acesso
- [x] Conta: trocar a própria senha

**Critérios de aceite**
- Cadastrar empresa → pessoa → ferramenta com 5 unidades a R$ 2.890,00 e ver tudo listado corretamente.
- Almoxarife logado não acessa cadastros (UI e API).
- Valor digitado `2.890,00` é salvo como `289000` centavos.

**Depende de:** M1

---

## M3 — Adesivo do capacete e impressão

**Objetivo:** ao cadastrar uma pessoa, o adesivo sai na impressora da obra.

**Entregas**
- [x] QR Code com **apenas o token** (RN-17)
- [x] Layout do adesivo 60 × 80 mm: QR, nome no capacete grande, nome completo, função · empresa, rodapé "ALMOX · obra · matrícula" (igual ao protótipo)
- [x] Geração do adesivo em **ZPL** e **TSPL** (escolha pela impressora cadastrada) + prévia na tela
- [x] Tabela `trabalho_impressao` como fila (pendente → enviado / erro)
- [x] **Agente de impressão local** (Node, pasta `agente-impressao/`): roda no mini PC da TV, autentica por token de dispositivo, consulta a fila a cada 2 s, envia para `ip:9100` da impressora, atualiza status; instalável como serviço (Windows e Linux)
- [x] Tela "Impressora": escolher impressora da obra, rolo, imprimir teste, ver status do agente (online/offline)
- [x] "Salvar e imprimir adesivo" no cadastro de pessoa; "Reimprimir" com 1–5 cópias
- [x] Mensagens de erro claras: agente offline, impressora sem resposta

**Critérios de aceite**
- Com o agente rodando na mesma rede, cadastrar uma pessoa imprime o adesivo em até 10 s.
- QR impresso lido por uma câmera comum mostra só o token, sem nome.
- Com o agente desligado, o app avisa e o trabalho fica pendente até o agente voltar.

**Depende de:** M2

---

## M4 — Identificação por QR e ficha da pessoa

**Objetivo:** ler o capacete, conferir a pessoa e abrir a ficha, respeitando o perfil.

**Entregas**
- [x] Leitor de QR pela câmera (PWA), leitura automática, lanterna, funciona em Android e iPhone
- [x] Token desconhecido → "Capacete não cadastrado"
- [x] **Conferência** (RN-03): nome do capacete grande, nome completo, função/empresa; "Sim, é o {nome}" / "Não é ele"
- [x] **Bloqueio** (RN-04): "Nada foi registrado", grava `ocorrencia` (aviso ao encarregado no M9, ver Decisões); opções "Ler o capacete certo" / "Escolher na lista (manual)"
- [x] **Ficha da pessoa** (F-04): o que está com ela (com hora e marca "sem QR"), equipe da empresa, identificação usada
- [x] Perfil consulta: QR abre direto a ficha, sem botões de lançamento
- [x] Lista manual (F-08) com busca por nome/apelido sem acento
- [x] Tela inicial (F-01) com resumo e últimos lançamentos (dados reais)

**Critérios de aceite**
- Almoxarife lê QR → conferência → ficha com botões Retirada/Devolução.
- Consulta lê o mesmo QR → ficha sem botões.
- "Não é ele" cria ocorrência e não altera nenhuma posse.

**Depende de:** M3

---

## M5 — Retirada

**Objetivo:** registrar retiradas por quantidade, com QR ou manual.

**Entregas**
- [x] Grade de tipos com unidades livres; **toque no ícone soma 1**, botão −, selo com quantidade; limite = livres (RN-07)
- [x] Revisão: tipo × quantidade, unidades alocadas automaticamente (RN-08), selo ALTO VALOR (RN-10), confirmação obrigatória (RN-11), aviso de lançamento manual (RN-05)
- [x] RPC `registrar_retirada` transacional: cria `movimento` + `movimento_item`, cria `posse` com `via`, muda `unidade.status` para `em_uso`; falha se alguma unidade deixou de estar livre (concorrência)
- [x] Tela de sucesso e retorno para "Ler outro capacete"
- [x] Aparece em tempo real em "últimos lançamentos"

**Critérios de aceite**
- Pegar 2 pás + 1 furadeira com QR: 3 unidades em uso, posse com `via = qr`, movimento registrado com almoxarife e hora.
- Dois celulares tentando retirar a última furadeira ao mesmo tempo: só um consegue; o outro recebe "acabou de sair".
- Retirada pela lista grava `via = manual`.

**Depende de:** M4

---

## M6 — Devolução e avaria

**Objetivo:** devolver por quantidade, registrar avarias com foto, cumprir "quem pegou, devolve".

**Entregas**
- [x] Devolução agrupada por tipo; contador "Devolvendo" (toque no ícone +1, −, "Devolveu tudo"); contador "Avariadas" ≤ devolvendo
- [x] Avaria: **foto obrigatória** (câmera, compressão no celular, upload para Storage) + motivo; sem foto não conclui (RN-09)
- [x] Unidades devolvidas escolhidas pelas mais antigas (RN-08); avariadas vão para `manutencao`
- [x] **RN-02/RN-06** aplicadas no servidor: devolução de item com `via = qr` exige identificação por QR na sessão; sem QR, só itens `via = manual`
- [x] Ficha: botão Devolução desabilitado com explicação quando não permitido + atalho "Ler capacete do {nome}"
- [x] RPC `registrar_devolucao` transacional
- [x] Estorno: engenheiro pode estornar um movimento com motivo (novo movimento `estorno`), nunca editar
- [x] Manutenção: lista das peças em manutenção (com foto e motivo); "Voltou do conserto" (volta a livre, engenheiro ou almoxarife) e "Dar baixa" (sai do estoque, só engenheiro)

**Critérios de aceite**
- Joaquim devolve 1 de 2 pás, 1 avariada com foto: 1 unidade em manutenção, 1 pá continua com ele.
- Tentar devolver pela lista um item retirado com QR é bloqueado pela API (não só pela tela).
- Item retirado sem QR é devolvido sem QR com sucesso.

**Depende de:** M5

---

## M7 — Lista, estoque e busca

**Objetivo:** qualquer perfil vê quem está com o quê e quanto tem livre.

**Entregas**
- [x] Lista "quem está com o quê" (F-07) agrupada por empresa, chips por item, pendência em vermelho
- [x] Busca por nome ou código, sem acento
- [x] Estoque (F-09): totais (na obra, livres, canteiro, manutenção), barra por tipo, toque mostra com quem está cada unidade
- [x] Consulta de empreiteira vê só a própria empresa
- [x] Atualização em tempo real

**Critérios de aceite**
- Após uma retirada em outro celular, lista e estoque atualizam sem recarregar.
- Busca "joao" encontra "João"; busca "MT-02" encontra quem está com ele.

**Depende de:** M6

---

## M8 — Painel da TV

**Objetivo:** painel em loop na TV do almoxarifado, igual ao protótipo "versão escolhida".

**Entregas**
- [x] Rota `/tv` em tela cheia, autenticada por **token de dispositivo** (cadastro do dispositivo pelo engenheiro, só leitura)
- [x] **Cartões por pessoa**: 12 por página (4 × 3), ordem alfabética, 8 s por página, esmaecimento 0,6 s
- [x] Cartão: nome, função, empresa (cor), ferramentas (ícone + nome, ×N), "Retirou às", faixa vermelha de pendência
- [x] **Colunas por empresa** rolando para a esquerda a 45 px/s, pausa 2,5 s antes e 3 s depois; coluna dupla se a empresa tiver mais de 6 pessoas
- [x] Loop infinito; cabeçalho fino (título, faixa "Pessoas 13–24 de 30", pontos de página, hora); barra de progresso
- [x] Parâmetros configuráveis pelo engenheiro (tempo por página, velocidade, pausas)
- [x] Realtime; reconexão automática; aviso "sem conexão desde HH:MM" mantendo o último estado
- [x] Animação suave a 60 fps no mini PC (usar `requestAnimationFrame` e `transform`)
- [x] Prevenção de suspensão de tela (Wake Lock) e recarga automática diária de madrugada

**Critérios de aceite**
- Com 30 pessoas com ferramenta: 3 páginas (12, 12, 6) → colunas por empresa → volta à página 1.
- Retirada feita no celular aparece na TV em até 3 s, sem quebrar a animação em curso.
- Rodando 72 h seguidas sem travar nem vazar memória.

**Depende de:** M7

---

## M9 — Fechamento do dia e avisos às empreiteiras

**Objetivo:** relatório diário e cobrança automática de reposição.

**Entregas**
- [x] Tela de fechamento (F-10): pendentes por pessoa (empresa, itens, valor, "desde ontem"), quem devolveu tudo hoje, atalho "chegou: ler capacete e devolver"
- [x] **Sem baixa geral** (RN-12): encerrar só gera relatório e avisos
- [x] Encerramento manual + automático às 23:59 (job agendado)
- [x] Cálculo por empreiteira: soma dos valores vigentes das unidades pendentes (RN-16); construtora própria → só engenheiro (RN-15)
- [x] **Notificação no app** (Web Push, VAPID) para dono e encarregado, que precisam ter login de consulta
- [x] **E-mail** transacional (Resend ou SMTP) com o modelo do protótipo: destinatários, assunto, tabela pessoa/itens/valor, total, texto do desconto e do cancelamento
- [x] Tabela `aviso` com status `enviado` → `cancelado` (ferramenta devolvida antes do fechamento da medição — RN-14, com novo e-mail avisando o cancelamento) ou `confirmado` (no fechamento da medição)
- [x] Data da medição por empresa; relatório "valores a descontar por empresa" para o engenheiro
- [x] Tela "Ver aviso enviado" (prévia da notificação e do e-mail)

**Critérios de aceite**
- Encerrar o dia com pendências de 2 empreiteiras gera 2 avisos, cada um com o total correto e e-mail entregue ao dono e ao encarregado.
- Devolver a ferramenta antes da data da medição muda o aviso para `cancelado` e envia o e-mail de cancelamento.
- Pendência de funcionário próprio não gera aviso para empreiteira.

**Depende de:** M8

---

## M10 — Offline, auditoria e endurecimento

**Objetivo:** aguentar a internet ruim da obra e ficar pronto para produção.

**Entregas**
- [x] Fila local (IndexedDB) para retiradas e devoluções sem conexão; envio automático ao reconectar; selo "aguardando envio"
- [x] Resolução de conflito: se a unidade não está mais livre ao sincronizar, o servidor aloca outra do mesmo tipo ou devolve erro claro ao almoxarife
- [x] Cache local de pessoas e tokens para ler QR offline
- [x] Tela de histórico/auditoria (engenheiro): filtros por pessoa, empresa, ferramenta, período, via, ocorrências
- [x] Exportação do histórico e dos avisos em planilha (.xlsx), com valores no padrão brasileiro
- [x] Revisão de RLS e testes de segurança (token da TV não escreve; QR não vaza dados)
- [x] Monitoramento de erros (Sentry ou similar) e logs do agente de impressão
- [x] Testes e2e do fluxo completo: cadastro → adesivo → retirada → devolução com avaria → fechamento → aviso
- [x] Política de dados (LGPD): retenção de fotos e histórico, texto do termo de responsabilidade (a validar com o jurídico)
- [x] Pendências do M9: e-mail sem provedor configurado não gasta tentativas (fica aguardando); e2e de câmera estável no CI

**Critérios de aceite**
- Celular em modo avião registra 3 retiradas; ao voltar a rede, as 3 aparecem no servidor e na TV.
- Suite e2e completa verde no CI.

**Depende de:** M9

---

## M11 — Piloto em obra

**Objetivo:** validar em uso real por 30 dias numa obra.

**Entregas**
- [ ] Checklist de implantação (pronto em `docs/IMPLANTACAO.md`; falta executar na obra): TV + mini PC, agente de impressão como serviço, impressora configurada, Wi-Fi testado no almoxarifado
- [ ] Cadastro inicial de empresas, pessoas e ferramentas; impressão e colagem dos adesivos (importação por planilha e adesivos em lote prontos; cadastro real e colagem na obra)
- [ ] Treinamento de 30 min: almoxarife, engenheiro, encarregados (roteiro pronto em `docs/TREINAMENTO.md`; falta dar na obra)
- [ ] Termo de responsabilidade assinado pelos trabalhadores e cláusula de desconto nos contratos das empreiteiras (jurídico)
- [x] Coleta das métricas do PRD §3 (tempo de lançamento, % manual, pendências/semana)
- [ ] Rodada de ajustes a partir do uso real

**Critérios de aceite**
- 30 dias de operação com ≥ 90% das retiradas por QR e tempo médio ≤ 15 s.
- Relatório do piloto com métricas e lista de melhorias priorizadas.

**Depende de:** M10

---

## M12 — Conector ioo

**Objetivo:** o Almox conversa com o ioo pelo contrato único de conector.

**Entregas**
- [ ] Endpoint de consulta somente leitura (quem está com o quê, estoque, pendências, histórico)
- [ ] Publicação de eventos: retirada, devolução, avaria, capacete trocado, pendência, aviso enviado/cancelado
- [ ] Catálogo de intenções (ex.: "quem está com o martelete?", "o que o Joaquim pegou hoje?", "quanto a Fôrmas Ribeiro deve de reposição?")
- [ ] Mapa de domínios declarado no catálogo; permissões herdadas do perfil do usuário no Almox

**Critérios de aceite**
- Pelo ioo, a pergunta "quem está com o martelete?" retorna a mesma resposta da tela de estoque.

**Depende de:** M11

---

## Decisões

| Data | Decisão |
|---|---|
| 11/10/2026 | Identificação só por QR no capacete (token opaco + nome impresso). Sem biometria, sem foto de rosto, sem QR nas ferramentas. |
| 11/10/2026 | Quem pegou, devolve. Devolução exige QR de quem retirou; item retirado sem QR pode voltar sem QR. |
| 11/10/2026 | Fechamento do dia é relatório, sem baixa geral. |
| 11/10/2026 | Impressora de etiquetas no Wi-Fi da obra + agente de impressão local no mini PC da TV. |
| 11/10/2026 | Aviso de não devolução no encerramento do dia; desconto cancelado se devolvido antes do fechamento da medição. |
| 11/10/2026 | Painel da TV: opção A (cartões por pessoa, 12/página) alternando com colunas por empresa rolando; números de estoque só no app. |
| 11/10/2026 | Stack: Next.js + TypeScript + Supabase (Postgres, Auth, Realtime, Storage) + PWA; e-mail transacional; Web Push. |
| 11/10/2026 | M0: branch principal renomeada de `master` para `main`; repositório `LuizFPires/almox` no GitHub, **público** (Actions bloqueado por cobrança no privado). Nada de segredo no repo: só `.env.example`. |
| 11/10/2026 | M0: Tailwind v4, tokens do protótipo em `@theme` no `globals.css` (em vez de `tailwind.config`). |
| 11/10/2026 | M0: Supabase local pela CLI no repo; projetos dev e prod na nuvem criados pelo dono no painel (região São Paulo), chaves só em `.env.local` e nas variáveis da Vercel. |
| 11/10/2026 | M0: deploy pela integração Git da Vercel (importação do repo no painel); produção = `main`, preview por PR. |
| 11/10/2026 | Referência visual: canvas "Almox — Protótipo" (https://claude.ai/artifact/QeWf3im87JvGZXpuHZCDCf). |
| 11/10/2026 | M0: componente extra `Indicador` (número grande + rótulo do resumo); abas sem tela ainda mostram "Em breve" em vez de 404. |
| 11/10/2026 | M0 (revisão): tela inicial segue o protótipo navegável e o PRD F-01 (ação principal "Ler QR do capacete", resumo com manutenção, barra Início · Lista · Estoque · Fechamento · Cadastros). Moeda segue o literal `R$ 1.234,56` com espaço comum; fontes via `next/font/google` (baixadas no build). |
| 11/10/2026 | Identidade visual passa a ser o **Almox Design System v1.0** (`design-system/`): marca, Inter, cores e ícones de interface. Fluxos e regras seguem o PRD e o protótipo; telas do DS de transferência, reserva, prazo de devolução e "movimentação só online" não se aplicam (contrariam RN-01, o QR no capacete e o M10). Ícones de ferramenta continuam os do protótipo. |
| 11/10/2026 | M1: **perfil por obra** — tabela `usuario_obra` (usuario_id, obra_id, perfil, empresa_id) no lugar de `usuario.perfil` + `obras[]`. O mesmo login pode ter perfis diferentes em obras diferentes; a RLS filtra pela obra. |
| 11/10/2026 | M1: logins **só por convite**; cadastro público desligado no Supabase Auth. No M1 os usuários de teste vêm do seed; a tela de convite do engenheiro entra no M2 (Cadastros). |
| 11/10/2026 | M1: migrations aplicadas no `almox-dev` durante o milestone (com seed, para as prévias da Vercel); no `almox-prod` só após o merge e com OK do dono, **sem seed**. |
| 11/10/2026 | M1: testes de banco (pgTAP, `supabase test db`) rodam no CI em todo PR, com Supabase local no GitHub Actions. |
| 11/10/2026 | M1: `tipo_ferramenta.prefixo` (PA, MT, FUR…) para os códigos sequenciais das unidades; `dispositivo_tv` guarda só o **hash** do token (o token aparece uma vez, no M8). |
| 11/10/2026 | M1: `qr_token` não é legível pelo cliente (privilégio por coluna); a busca por token será uma RPC no M4. Escritas de negócio (movimento, posse, avaria, ocorrência, fechamento, aviso) só por RPC. |
| 11/10/2026 | M1: Supabase local nas portas 544xx para conviver com outros projetos da máquina. Configurações de Auth na nuvem aplicadas só no que foi decidido (cadastro desligado e URLs de retorno), com `config push` mínimo, sem copiar os padrões de desenvolvimento. |
| 11/10/2026 | M1 (revisão): privilégios padrão revogados (objeto novo exige `grant` explícito); posse ⇔ unidade em uso (gatilho adiado); posse/avaria ligadas ao item do movimento; encarregado da própria empresa; estorno só na mesma obra; consulta restrita só de empreiteira; engenheiro não altera o próprio vínculo; nomes de usuários visíveis na obra (e-mail não); avisos só para engenheiro e a própria empreiteira. |
| 11/10/2026 | M1 (revisão): URLs de retorno do Auth sem curinga (`*-luiz-fp-ires.vercel.app` permitiria roubo de sessão por link mágico); `emailRedirectTo` usa `NEXT_PUBLIC_SITE_URL`. Prévias da Vercel entram por senha. |
| 11/10/2026 | M1 (revisão): senhas dos usuários de teste no `almox-dev` trocadas por senhas aleatórias fora do git (o repositório é público); o seed recusa banco que já tem obras. |
| 11/10/2026 | M1 (revisão, aceito sem mudança): consulta de empreiteira vê o estoque total da obra (PRD §5 permite estoque); e-mails de dono/encarregado das empresas legíveis por quem é da obra (contato comercial, não dado de trabalhador); link mágico em outro aparelho falha (PKCE) — trocar o modelo de e-mail para `token_hash` fica para o M9 junto com o SMTP; mudança de empresa/tipo com ferramenta em posse entra no log de alterações do M2. |
| 11/10/2026 | M1: `almox-prod` com as migrations (sem seed) e Auth fechado (cadastro desligado, URL exata, `site_url` do domínio oficial). Primeira obra "SL Betim" e o login do engenheiro criados pelo administrador, já confirmado e com senha aleatória entregue fora do git — o e-mail padrão do Supabase só entrega para membros da organização até o SMTP próprio (M9). |
| 11/10/2026 | M2: acesso novo com **senha provisória** mostrada uma vez ao engenheiro e troca obrigatória no primeiro login (o e-mail padrão do Supabase só entrega para membros da organização; convite por e-mail quando o SMTP entrar no M9). |
| 11/10/2026 | M2: log de alterações cobre tudo que afeta cobrança e avisos: valor de reposição e alto valor; empresa e situação da pessoa; tipo, e-mails, encarregado e medição da empresa; acessos de usuários. |
| 11/10/2026 | M2: função da pessoa com sugestões + texto livre; nome no capacete repetido na obra só gera aviso (com sugestão, ex.: "JOÃO S."). |
| 11/10/2026 | M2: engenheiro cria tipos de ferramenta além dos 13 do protótipo, escolhendo um dos 13 ícones; prefixo do código sugerido e editável. |
| 11/10/2026 | M2: unidade nova só pela RPC `adicionar_unidades` (códigos sequenciais com trava do tipo); prefixo do tipo fixo depois de criado; empresa não troca de obra. Lista de acessos por RPC `listar_acessos` (e-mail só para o engenheiro). |
| 11/10/2026 | M2: formulários devolvem o que foi digitado quando há erro (o React limpa os campos após Server Action); `Campo` usa `useId` (o Next mantém telas anteriores escondidas no DOM). Nome no capacete vazio é preenchido no servidor com o primeiro nome. |
| 11/10/2026 | M2 (revisão): código da 100ª unidade (lpad cortava para 2 dígitos) e ordenação numérica; vínculo de acesso só muda perfil/empresa; **senha provisória pendente bloqueia também no banco** (RLS lê `app_metadata.trocar_senha`); empreiteira com consulta restrita não vira própria; log guarda o nome de quem alterou; mínimo de 10 caracteres de senha também no Auth. |
| 11/10/2026 | M2 (revisão): formulários de criação recomeçam a cada visita (`NovaVisita` com `useRouter().bfcacheId`), sem trazer a senha mostrada antes; encarregado inativo continua na lista da empresa; erros de acesso viram mensagem na tela. |
| 11/10/2026 | M2 (revisão, aceito sem mudança): dar acesso a e-mail que já tem login em outra obra vincula sem pedir confirmação da pessoa (o engenheiro é responsável pelo acesso da obra); senha provisória não expira sozinha (some na primeira troca); `secure_password_change` fica desligado (pediria reautenticação para trocar a senha). Remover acesso já exige abrir a seção e confirmar. |
| 11/10/2026 | M2 (segurança): dar acesso a e-mail que já tem login **nunca** troca nem mostra a senha dele (seria tomar a conta de quem é de outra obra). Senha provisória perdida antes do primeiro acesso: redefinir pelo e-mail quando o SMTP entrar (M9). |
| 11/10/2026 | M2 (comparação com o protótipo): empreiteira **exige dono com e-mail** (sem ele o aviso da RN-13 não chega a ninguém); encarregado segue opcional com o alerta "Falta e-mail". Botão "Nova …" de largura total abaixo das abas. |
| 11/10/2026 | M2 (comparação, diferenças aceitas): categoria de ferramenta (elétrica/manual/acesso) do protótipo **não entra** (fora do PRD §8; reavaliar no M7); botão de salvar sempre ativo com erros ao enviar (botão desligado sem explicação atrapalha leitor de tela); pessoas em ordem alfabética (achar alguém entre 100+); seed com 84 unidades em vez de 70 (cada pessoa do painel da TV tem a ferramenta); até 200 unidades por vez em vez de 20. |
| 11/10/2026 | M2: `almox-prod` com as migrations do M2 e senha mínima de 10 no Auth; Cadastros conferidos na produção com o login do engenheiro (obra SL Betim). |
| 11/10/2026 | M3: impressora ainda não comprada — o Almox gera **ZPL e TSPL** e é testado com impressora simulada; o critério "imprime em até 10 s" é conferido quando a impressora real chegar (térmica de transferência com rede, 60 × 80 mm, ribbon de resina). |
| 11/10/2026 | M3: o agente **consulta a fila a cada 2 s** por RPC (só conexões de saída, sem sessão para renovar) em vez de Realtime. |
| 11/10/2026 | M3: **um token por mini PC** (cadastro "dispositivo da obra") para TV e agente; o banco guarda só o hash; revogar desliga os dois. |
| 11/10/2026 | M3: agente roda com **Node 24 + script que instala como serviço** (Windows e Linux). |
| 11/10/2026 | M3: agente de impressão em **TypeScript rodado direto pelo Node** (sem build, sem dependências); no Windows roda como *Serviço Local* com a pasta gravável só por administradores, no Linux como unidade systemd. Log só de eventos, sem token nem conteúdo das etiquetas. |
| 11/10/2026 | M3 (comparação, decidido pelo dono): **fluxo de impressão do protótipo**. "Salvar e imprimir adesivo" salva e abre a tela **Imprimir** (prévia, impressora verde/vermelha, cópias 1–5 com "Uma reserva ajuda se descolar", botão "Imprimir N etiquetas"). **Nada imprime antes de confirmar.** A tela acompanha o trabalho até "Impresso no almoxarifado. Cole na frente do capacete." e "Concluir". Reimprimir abre a mesma tela, pela ficha ou pelo **ícone de impressora em cada pessoa** da lista de Cadastros. Isso substitui a versão anterior (fila direta ao salvar), que tinha sido decidida na implementação sem consulta. |
| 11/10/2026 | M3: agente "online" = deu sinal nos últimos 30 s; sem impressora escolhida, Cadastros mostra o cartão da impressora com borda vermelha. Trabalho parado em "enviando" por mais de 1 minuto volta para a fila. |
| 11/10/2026 | M3 (revisão): impressora só com **IPv4 da rede da obra** (10.x, 172.16–31.x, 192.168.x; 127.x para o simulador) e **porta 9100–9199**, conferido no banco, na tela e no agente; fila só aceita conteúdo ZPL/TSPL; texto da etiqueta sem caracteres de controle. |
| 11/10/2026 | M3 (revisão): fila sem impressão dupla. O trabalho guarda **quem pegou**, só esse mini PC conclui, "enviando" volta para a fila depois de 3 min e vira erro depois de 3 tentativas. O agente tenta confirmar de novo e não reimprime o que já saiu. O conteúdo da etiqueta (com o token) é apagado depois de impresso. |
| 11/10/2026 | M3 (revisão): funções de gatilho voltam a ficar fora do alcance do cliente (o grant geral do M3 tinha devolvido); log do agente sem nome nem matrícula (só o id do trabalho); telas param de se atualizar sozinhas depois de 10 min; "offline desde" mostra a data quando não é hoje; instalador Linux não roda o serviço como root. |
| 11/10/2026 | M3 (revisão, aceito sem mudança): aviso de dev do Next "uncached data outside `<Suspense>`" (navegação instantânea) vale para todas as rotas desde o M1; fica para um milestone de polimento com `loading.tsx`/`<Suspense>` por segmento. Instalador do Windows conferido por análise; execução real no mini PC na instalação. |
| 11/10/2026 | M3 (comparação com o protótipo): rodapé do adesivo com **"ALMOX · obra" à esquerda e matrícula à direita** (obra comprida cortada com reticências); **nome no capacete comprido encolhe** para caber numa linha (até 16 letras). Prévia na tela desenhada com as mesmas posições e tamanhos do impresso (`layoutAdesivo`); QR com ampliação 9 e margem silenciosa de 4 módulos. |
| 11/10/2026 | M4: "Não é ele" grava a **ocorrência** e ela aparece no app (em vermelho nos últimos lançamentos, para quem lança e para a consulta da empresa). Notificação e e-mail ao encarregado entram no M9, junto com o envio dos avisos. |
| 11/10/2026 | M4: a conferência ("Sim, é o …") **vale 10 minutos** para lançar com QR. O servidor guarda a identificação com validade; retirada e devolução com `via = qr` (M5/M6) exigem uma identificação válida da mesma pessoa. |
| 11/10/2026 | M4: consulta restrita de empreiteira que lê o capacete de outra empresa vê **"Pessoa de outra empresa"**, sem nome nem ferramentas. |
| 11/10/2026 | M4: **pendência** = ferramenta com alguém desde antes de hoje (dia da obra, fuso de São Paulo), em vermelho com "desde ontem" ou "desde dd/MM", já no Início e na ficha. O fechamento do dia (M9) só passa a gerar os avisos. |
| 11/10/2026 | M4: botões Retirada/Devolução aparecem na ficha desde já, desligados com aviso até o M5/M6. Abrir a pessoa pela lista geral conta como "sem QR" (como no protótipo). |
| 11/10/2026 | M4 (revisão): a conferência fica **presa à leitura**. "Sim, é o …" devolve o id da identificação, a ficha o carrega (`?ident=`) e o servidor confere dono, pessoa, obra e validade. Abrir a mesma pessoa pela lista manual não conta como QR. M5/M6 recebem esse id. Falha de rede na leitura vira mensagem na tela (e há `error.tsx`). O bloqueio não promete aviso ao encarregado até o M9. |
| 11/10/2026 | M4 (revisão, aceito sem mudança): para a consulta, `?via=qr` só muda o texto "QR do capacete lido" (cosmético: consulta não lança). "Não é ele" derruba as conferências vigentes da pessoa de todos os usuários (capacete com outra pessoa). A limpeza das identificações vencidas fica para o M10. |
| 11/10/2026 | M4 (comparação, decidido pelo dono): no Início da **consulta de empreiteira** só aparecem números da própria empresa ("com a {empresa}" e pendências). "No almox" e "manutenção" (da obra toda) ficam para o Estoque. |
| 11/10/2026 | M4 (comparação, aceito sem mudança): barra inferior também na ficha; selo ALTO VALOR e ponto da cor da empresa na ficha; várias pendências listadas, com plural; selo do perfil no cabeçalho do Início (a lista geral tem atalho próprio); nome da ferramenta embaixo do ícone (regra do CLAUDE.md); "Ler capacete do …" e "Receber" abrem a leitura sem alvo (a câmera lê o capacete que estiver na frente); link "Sem capacete?" também na tela de leitura; apelido na lista manual; botões no rodapé. |
| 11/10/2026 | M5: quem tem **pendência** (ferramenta desde antes de hoje) **pode retirar**; a revisão mostra o aviso em destaque ("Está com Martelete MT-01 desde ontem") antes da confirmação, e o almoxarife decide. |
| 11/10/2026 | M5: `registrar_retirada` recebe o id da conferência (M4). É QR só com identificação válida da mesma pessoa; sem ela, é manual. Unidades livres em ordem de código (PA-100 depois de PA-99), travadas na transação: quem perder a corrida recebe "acabou de sair". A confirmação "Conferi pessoalmente…" (RN-11) é exigida no servidor. |
| 11/10/2026 | M5: o aviso de retirada sem QR segue o PRD (RN-06: o que sai sem QR pode voltar sem QR), não o texto do protótipo. A grade mostra todos os tipos (o protótipo cortava em 12). Últimos lançamentos atualizam em tempo real (Supabase Realtime). A frase "Já atualizado no painel da TV" só entra com o M8. |
| 11/10/2026 | M5 (revisão): retirada **idempotente**. O celular gera uma chave ao entrar na revisão; repetir "Concluir" depois de a rede cair devolve o mesmo movimento, sem duplicar. Cada item da lista é validado no servidor. O Início ao vivo usa um canal novo a cada abertura. O rodapé fixo deixa espaço para o campo em foco. |
| 11/10/2026 | M5 (revisão, aceito sem mudança): com `skip locked`, se outro celular segura a unidade e desiste, este pode receber um "acabou de sair" falso e resolve tentando de novo. Esperar a trava evitaria isso, mas abriria risco de deadlock entre pedidos com vários tipos. O e2e de dois celulares testa o comportamento (um leva, o outro é avisado), não a simultaneidade exata no banco. |
| 11/10/2026 | M5 (comparação com o protótipo): selo SAÍDA, "−" com "toque no ícone: +1", ícone em fundo branco quando escolhido, confirmação marcada em grafite com check amarelo, botão desligado em cinza (em todo o app) e botões lado a lado no sucesso. Aceito sem mudança: nome da ferramenta embaixo do ícone (regra do CLAUDE.md) em vez de ao lado; "todas escolhidas" no limite, porque avisa por que o toque não soma. |
| 11/10/2026 | M6 (decidido pelo dono): **uma foto e um motivo por peça avariada** (2 pás avariadas = 2 fotos). O **sistema escolhe** quais códigos ficam como avariados, entre os que voltam, como no protótipo. Fotos em Storage privado, comprimidas no celular, vistas só por URL assinada. |
| 11/10/2026 | M6 (decidido pelo dono): **estorno** de retirada e de devolução, só pelo engenheiro e com motivo, a partir do lançamento. Não deixa se as peças já tiveram outro movimento depois (corrige do mais novo para o mais velho). O movimento original fica como está (RN-18). |
| 11/10/2026 | M6 (decidido pelo dono): **manutenção** entra no M6. "Voltou do conserto" (volta a livre; engenheiro ou almoxarife) e "Dar baixa" (sai do estoque; só engenheiro). Antes nenhum milestone previa a peça voltar. |
| 11/10/2026 | M6: devolução com QR exige a conferência do M4 (mesma regra da retirada); sem ela, só os itens que saíram sem QR (RN-02/RN-06), conferido no servidor. Devolução idempotente (chave do celular), como a retirada. |
| 11/10/2026 | M6 (revisão): compressão da foto com plano B para celulares mais antigos (sem `imageOrientation` ou sem `createImageBitmap`, usa `<img>`). Quem enviou apaga a **própria foto ainda não usada** ("Refazer" ou menos avariadas), pela API do Storage; foto que prova avaria ninguém apaga nem troca. Mesma foto duas vezes no pedido é recusada. Manutenção pede confirmação (com Cancelar) e grava o nome de quem fez no log. |
| 11/10/2026 | M6 (revisão, para depois): **limpeza automática** das fotos órfãs (enviadas e nunca ligadas a avaria, ex.: devolução abandonada) depois de 24 h entra junto com os jobs agendados do M9. Relatórios e avisos (M9) precisam ignorar avarias de devoluções estornadas. O campo da foto aceita a galeria do celular (`accept=image/*`): foto errada pode ser refeita antes de concluir. |
| 11/10/2026 | M6 (revisão, achado no e2e): **QR do capacete sempre em um segmento só de bytes**. O modo automático mistura segmento numérico e de bytes quando o token começa com dígitos, e o leitor do app (zxing) não lê. ZPL vai em modo manual `MM,B0036…`, TSPL em `M` com `B0036…`, e a prévia e o teste usam o mesmo. **Conferir com a impressora real** (principalmente o modo manual no TSPL), junto com o critério de 10 s do M3. |
| 11/10/2026 | M6 (comparação, decidido pelo dono): **carimbo gravado na foto** da avaria ("Pá · 11/10/2026 14:32 · Ana (almoxarife)", faixa escura no pé da imagem), para valer como prova fora do app (ex.: medição da empreiteira). |
| 11/10/2026 | M6 (comparação): contadores grandes com " de N", painéis Devolvendo/Avariadas, ícone maior, câmera no botão, "· foto HH:MM" e ícone por linha no sucesso, como no protótipo. Aceito sem mudança: "Fica com ele" lista **tudo** o que fica com a pessoa (sem QR também mostra o que saiu com QR, mais fiel); visor da câmera é o do próprio celular (sem cantoneiras no app). |
| 11/10/2026 | M7: a lista mostra só quem está com ferramenta, por empresa, mais "+ N pessoas sem ferramenta". A busca ignora acentos e acha nome, **apelido do capacete** e **código da peça**. Tocar na pessoa abre a ficha como "Aberto pela lista" (sem QR). |
| 11/10/2026 | M7: no Estoque, a consulta de empreiteira vê os totais da obra (PRD §5) e os nomes só da própria empresa; o resto aparece como "N com outras empresas". Unidades com baixa não contam. O detalhe mostra o código de cada peça com quem está ("MT-01 · Raimundo · desde ontem"). |
| 11/10/2026 | M7 (revisão): inativar pessoa que ainda está com ferramenta **continua permitido**; ela segue na lista "quem está com o quê" (e como pendência) até devolver. "+ N pessoas sem ferramenta" conta só as ativas e não aparece durante a busca. O estoque também atualiza ao vivo quando uma unidade muda (empreiteira não recebe movimentos de outras empresas; conserto e baixa não geram movimento). |
| 11/10/2026 | M7 (comparação com o protótipo): chips da lista e linhas do estoque usam o **ícone com o nome escrito ao lado** (pílula do protótipo), exceção à regra "nome embaixo" onde o nome já está na mesma linha (`CirculoFerramenta`). Tipos do estoque e pessoas da lista em ordem alfabética; empresa sem ninguém com ferramenta não aparece. Barra do estoque com um bloco por peça (até 40; acima, proporcional). Barra inferior também na Lista e no Estoque (PRD F-01). |
| 11/10/2026 | M8: a TV **pergunta ao servidor a cada 2 s** (RPC só de leitura com o token do dispositivo, sem login) em vez de Realtime: atende ao ≤ 3 s, reconecta sozinha e é o mais robusto para rodar dias seguidos. |
| 11/10/2026 | M8: a TV é conectada pelo link **"Abrir painel nesta TV"** (`/tv/entrar?t=…`), mostrado uma vez ao criar o dispositivo; o token vai para um cookie httpOnly e sai da URL. |
| 11/10/2026 | M8: configuração do painel por obra em **Cadastros › "Painel da TV"**, nos limites do PRD (página 3–30 s, velocidade 15–150 px/s, pausas, cartões por página 8, 12 ou 16). |
| 11/10/2026 | M8: recarga automática diária da TV às **04:00** (fuso da obra). |
| 11/10/2026 | M8: **sem contagens na TV** (CLAUDE.md): a coluna da empresa mostra só o nome, sem o "N itens · M pessoas" do protótipo; a fase de colunas não diz quantas empresas são. |
| 11/10/2026 | M8: no cartão, ferramentas **agrupadas por tipo com ×N**; se passar de 3 tipos, aparecem 2 e um "+N" com as peças que sobraram (a lista completa fica no app). Nas colunas por empresa aparecem todas (a linha quebra). A pendência mostra o "desde" real ("desde ontem 16:40", "desde 09/10"), como no app. |
| 12/10/2026 | M8 (revisão): a TV tem **credencial própria, só de leitura do painel**. O engenheiro toca em "Conectar uma TV" no mini PC (Cadastros › Impressora) e recebe um endereço com **código de uso único que vale 10 minutos**, só em texto (sem link, para não conectar o celular); a TV troca o código pela credencial. O cadastro do mini PC continua um só e revogar desliga TV e agente (ajuste da decisão do M3). O token do agente não abre mais o painel. |
| 12/10/2026 | M8 (revisão): só "dispositivo não autorizado" (erro AL008) desliga a TV; qualquer outra falha é passageira. Mesmo sem autorização, a TV segue perguntando a cada 60 s e recarrega a cada 5 min. Quando nada mudou, o servidor responde só a hora (versão dos dados). O sinal da TV fica separado do sinal do agente. Coluna de empresa ganha uma subcoluna a cada 6 pessoas (dupla, tripla…), para ninguém ficar cortado. |
| 12/10/2026 | M8 (comparação com o protótipo): a tela da TV é montada sempre em **1920 × 1080 e escalada** para a TV (qualquer resolução ou zoom do sistema), como no protótipo. Nas colunas por empresa, a tela **mede a altura de cada pessoa** e abre outra subcoluna quando ela não cabe (começa com 6 por subcoluna; subcolunas de 436 px com 28 px entre elas). Borda da pendência no vermelho forte do protótipo; nome de ferramenta longo quebra com hífen em até 2 linhas; o relógio do cabeçalho usa a hora do servidor. Mantidos do DS: fundo do círculo do ícone (sutil) e raio de 18 px do protótipo nos cartões. |
| 12/10/2026 | M9: e-mail em produção pelo **Resend com o domínio da construtora** (o usuário cria a conta e confirma o domínio no DNS). Local e CI enviam para a caixa de teste do Supabase (Mailpit), que prova a entrega nos e2e. O mesmo envio resolve o login por link do Supabase (pendência do M1). |
| 12/10/2026 | M9: peça pendente por vários dias gera **lembrete a cada encerramento**, com o mesmo valor (não acumula): o aviso do dia lista as peças ainda pendentes; cada peça é cobrada uma vez na medição. |
| 12/10/2026 | M9: devolução antes da medição **cancela peça a peça** (RN-14): o aviso fica com o total novo e o dono/encarregado recebem e-mail de atualização; quando todas voltam, o aviso vira `cancelado`. |
| 12/10/2026 | M9: o **engenheiro fecha a medição** da empresa no relatório "valores a descontar": confirma os avisos em aberto (`confirmado`) e informa a data da próxima medição. |
| 12/10/2026 | M9: "Não é ele" avisa o **encarregado na hora, por notificação** (sem e-mail). Pendências de funcionários próprios: **notificação de resumo ao engenheiro** no encerramento (sem e-mail). Encerramento automático das 23:59 agendado no Supabase (pg_cron), com fila de envios e nova tentativa. |
| 12/10/2026 | M9 (revisão): **estorno de uma devolução** reabre o desconto, volta o aviso para "a descontar" e manda e-mail de correção à empreiteira. **Estorno de retirada** antes da medição cancela o desconto com o texto "lançamento corrigido pelo engenheiro"; depois de confirmado na medição, é recusado. |
| 12/10/2026 | M9 (revisão): **trocar a empresa da pessoa, ou o tipo da empresa, com desconto em aberto é recusado** (feche a medição ou espere a devolução); o desconto fica com a empresa em que a pessoa estava quando virou pendência. |
| 12/10/2026 | M9 (revisão): o **almoxarife vê só o resultado do encerramento de hoje** (exceção à decisão do M1, só para o dia que acabou de encerrar); o histórico de avisos e valores é do engenheiro e da própria empreiteira. "Encerrar o dia" pede confirmação com o número de empreiteiras e o total. Na lista de avisos, cada peça conta no aviso que a cobrou primeiro; os dos dias seguintes aparecem como lembrete, sem valor novo. Relatórios do M9 não usam avarias (a pendência do M6 sobre avarias estornadas não se aplica). |
| 12/10/2026 | M9 (comparação com o protótipo): o dia continua com **um encerramento**, mas se ele foi encerrado à mão o sistema faz um **complemento automático às 23:59**: avisa só as peças de empreiteira que saíram depois e não voltaram, uma vez. Saudação do e-mail com **nomes completos** (como no protótipo); itens sempre com "×n"; pendência com o "desde" real ("desde ontem 16:40", "desde 09/10"). |
| 12/10/2026 | M10: QR offline com **impressão irreversível (hash) do token** guardada no celular, junto de nome, apelido, função e empresa das pessoas ativas da obra; o token em si continua sem sair do servidor. Ao sincronizar, o servidor confere o lançamento de novo (RN-02/RN-03 no servidor). O cache é apagado ao sair. |
| 12/10/2026 | M10: lançamento offline vale pela **hora em que foi feito no celular**, com limite: o servidor recusa hora no futuro ou com mais de 24 h e guarda também a hora de chegada (auditoria). |
| 12/10/2026 | M10: monitoramento de erros com **Sentry** (plano grátis, alerta por e-mail) no app e no agente de impressão, sem dado pessoal nos relatórios; sem a chave configurada, o app funciona sem ele. |
| 12/10/2026 | M10: proposta de retenção (LGPD, a validar com o jurídico): **fotos de avaria apagadas 12 meses** após o conserto/baixa; movimentos e avisos guardados **até 5 anos após o fim da obra**; pessoas inativas sem movimento há 5 anos são anonimizadas. Prazos configuráveis. |
| 12/10/2026 | M10: a tela **Lançar sem internet** (`/campo`) fica guardada no celular de quem lança; retirada e devolução vão para a fila e o servidor escolhe as unidades quando chegam (se não houver livres, o item fica "não enviado" com o motivo e o almoxarife descarta). **Avaria não é lançada sem internet** (a foto precisa subir): a peça é separada e devolvida quando a rede voltar. "Não é ele" sem internet entra no histórico com a hora em que chegou. Sair do app apaga os dados e a fila do celular (com aviso se houver item não enviado). |
| 12/10/2026 | M10: leitor de QR trocado do zxing-js para o **jsQR**: o zxing-js 0.23 não lia ~7% dos QR (mesmo perfeitos, em qualquer nível de correção), e cerca de 1 capacete em 14 ficaria ilegível; era também a causa do e2e de câmera instável do M9. Teste unitário lê 100 tokens aleatórios. Lanterna pela restrição `torch` da câmera. |
| 12/10/2026 | M10 (revisão): a **hora do celular** só vale com o QR lido sem internet ou na lista, nunca com a conferência do lançamento com internet; e **não fica antes** do último lançamento das peças escolhidas (retirada) nem da retirada delas (devolução). "Não é ele" sem internet com chave do celular e hora do celular. A tela sem internet só abre para quem está logado no celular (sessão lida do cookie) e com os dados desse login; outro login apaga os dados do anterior. Fila: resposta 4xx do item vira "não enviado" com o motivo; erro do servidor, depois de 5 vezes. Aceito sem mudar: lançamento com internet pode informar a hora até 24 h para trás (decisão do M10; `recebido_em` mostra a chegada); anonimização nos itens de aviso é pelo nome (homônimo na mesma obra também fica anônimo); sem CSP completa (exige nonce do Next; fica para o piloto). |
| 12/10/2026 | M11: cadastro inicial do piloto por **planilha modelo (.xlsx)** com prévia e erros linha a linha; grava tudo numa transação no servidor (só o engenheiro). |
| 12/10/2026 | M11: o tempo "QR lido → retirada registrada" é medido gravando **a conferência usada em cada retirada** (vale daqui para frente). |
| 12/10/2026 | M11: a obra do piloto é criada **por script no almox-prod, com OK do dono**, com o vínculo do engenheiro; sem tela nem perfil de administrador. |
| 12/10/2026 | M11: **adesivos em lote** — "Imprimir N adesivos" na empresa e no fim da importação, um trabalho por pessoa na fila do agente. |
| 13/10/2026 | M11 (revisão): o tempo do piloto conta **da leitura do QR** (o celular informa os segundos entre ler e tocar em "Sim", com o cronômetro dele) até a retirada gravada; a meta usa a **média** do período (critério do M11), com a mediana ao lado, calculadas no banco. "Não devolvidas" compara só **semanas inteiras**. Rastreabilidade aparece como "garantido" (o banco não aceita movimento incompleto). |
| 13/10/2026 | M11 (revisão): **adesivos em lote = quem ainda não tem adesivo** (da obra ou da empresa), 100 por toque; repetir continua de onde parou e nunca imprime duas vezes; reimpressão continua pela ficha. Importação: até 1000 pessoas e 150 ferramentas por planilha (cabe no tempo da requisição), arquivo até 5 MB, empresa pelo nome exato. Aceito sem mudar: conferência reaproveitada (voltar no navegador) poderia contar o tempo da primeira leitura; a tela não reaproveita. |
| 13/10/2026 | Funções da Vercel em **São Paulo (`gru1`)**, junto do Supabase (`sa-east-1`): no padrão (`iad1`, Washington) cada consulta ao banco cruzava o continente e as telas ficavam lentas (`vercel.json`). |
| 13/10/2026 | Avaria: além do **motivo da lista** (que agrupa no histórico), um campo **"Detalhes (opcional)"** de texto livre, até 300 caracteres, validado no servidor; aparece na devolução, no lançamento e na manutenção. |
| 13/10/2026 | Lista com abas **Agora · Não devolvidas · Avarias** (opção A do protótipo), por pessoa; em Cadastros, passo a passo para ligar a impressora e a TV. |
| 13/10/2026 | Cadastros (opção A + busca da C): impressora, TV, planilha e passo a passo numa **gaveta na engrenagem** do cabeçalho; **busca geral** em pessoas, ferramentas e empresas (nome, capacete, matrícula, código da peça), filtrada no celular. |
| 13/10/2026 | Ferramentas: **sem campo de prefixo** — o código das peças (ex.: BET-01) continua existindo para identificar cada peça, mas sai do nome, sem colidir na obra. Biblioteca de **69 ícones** (manuais, elétricas e máquinas, acesso e apoio) e **ícone próprio**: o engenheiro envia uma imagem (PNG, JPG, WebP ou SVG), que vira PNG 128 px no bucket público `icones` (desenho de ferramenta, sem dado pessoal; a TV lê sem login); o banco só aceita arquivo da própria obra. |
| 13/10/2026 | **Avaria tem indenização** (responde o PRD §12.3): vale para **qualquer pessoa** (própria ou empreiteira); o valor sugerido é o de **reposição** e o **engenheiro ajusta** (ex.: custo do conserto; zero dispensa), com registro de quem mudou e quando. A avaria abre numa tela com foto, data e hora, quem devolveu, motivo, detalhes e valor, e **envia foto e dados pelo compartilhar do celular** (WhatsApp etc.), sem link público. A indenização de avaria ainda **não entra** nos avisos nem no "A descontar" da medição. |
| 13/10/2026 | **Início (opção A do protótipo):** "Ler QR" no topo; os números viram blocos que abrem a tela de cada um (canteiro → Lista, livres → Estoque, manutenção, pendências → Não devolvidas); avisos, a descontar, histórico e métricas numa **gaveta de gestão** no cabeçalho (só o que o perfil pode ver). A lista de pendências sai do Início (o bloco vermelho leva a ela). |
| 13/10/2026 | **Sem mini PC** (custo e trabalho na obra): o painel roda num **aparelho Google TV** com navegador de quiosque (Fully Kiosk) em `/tv`. A TV mostra um **código de 6 dígitos + QR** e **o engenheiro ou o almoxarife** aprova no celular (*Conectar TV*); a TV recebe a credencial só de leitura, fica lembrada e, desconectada, volta a mostrar o código. Quem lança vê e desconecta as TVs; o mini PC continua só do engenheiro. |
| 13/10/2026 | **Adesivos em folha A4** na impressora comum da obra (9 por folha, 60 × 80 mm, linha de corte, escala 100%), a partir da ficha ou do lote; o QR continua só com o token. Imprimir marca a pessoa (`adesivo_impresso_em`) para o lote não repetir. Impressora de etiquetas + mini PC ficam **opcionais** (só aparecem quando a obra tem uma). Só o engenheiro imprime adesivos. |
| 13/10/2026 | **Registro de movimentações no Início:** as 10 últimas movimentações com o funcionário, dia e hora, todas as ferramentas, o login que lançou e se a pessoa foi identificada pelo QR ou pela lista (sem QR, em destaque); "Não é ele" mostra quem leu o QR. O histórico completo continua só do engenheiro. |
| 13/10/2026 | **Montar a folha de adesivos** (opção B do protótipo): tamanho **Grande** 6 × 8 cm (9 por folha), **Médio** 5 × 6,5 cm (12, **padrão**) ou **Pequeno** 4,5 × 6 cm (16, só apelido e nome); a primeira folha pula os **espaços já usados** (folha aproveitada) e as seguintes vêm cheias; "Todos sem adesivo", "Todos da obra" ou um por um, até 96 por vez. A ficha da pessoa abre a montagem já com ela. QR do Pequeno (2,5 cm) conferido com o leitor do app. |
| 13/10/2026 | **Ferramenta própria ou alugada** (opção B do protótipo): no cadastro, a **quantidade vem logo após o nome**; depois do valor de reposição, "De quem é": **Própria** ou **Alugada**. Alugada exige a **locadora**, escolhida com **busca** entre as já usadas na obra ou adicionada na hora; a locadora fica salva por obra (o nome não se repete com outra grafia). A lista de ferramentas mostra "ALUGADA · locadora". Só o engenheiro cadastra. |
| 13/10/2026 | **Métricas do piloto saem do app** (pedido do dono): sem a tela, o item do menu e a planilha do relatório. O banco continua gravando o tempo de leitura do QR e a função `metricas_piloto` fica (sem uso), para não precisar de migration. |
| 13/10/2026 | **Plano de correção dos 18 pontos** (análise externa, `docs/PLANO-DE-CORRECAO-18-PONTOS.md`): conferidos no código (13 confirmados, 5 parciais) e feitos em 3 blocos. **Bloco 1:** encerramento e devolução simultâneos não deixam desconto de ferramenta devolvida (trava consultiva por obra + desconto sem posse cancelado antes de aviso e medição); não troca a empresa de quem está com ferramenta (o histórico por empresa fica para o bloco 2); pessoa inativa com ferramenta devolve pelo QR, sem retirada; push na fila só para quem ainda tem vínculo; toque duplo sem internet não duplica; confirmação A4 não trava; relógio da TV se acerta sem mudança no painel. |
| 13/10/2026 | **Plano de correção · bloco 2:** listas, medição e planilhas buscam em páginas (sem corte em 1000 linhas); cadastro de ferramenta numa RPC transacional com chave de operação (repetir não duplica; a chave guarda a impressão dos dados) e prefixo escolhido no banco, sempre livre (ponto 15 adiantado); sem internet o celular recebe as peças uma a uma e simula a devolução do servidor (mais antigas primeiro); itens do aviso guardam o id da pessoa (homônimos e anonimização); quem vê um lançamento é decidido pela **empresa da pessoa na data** (períodos montados do registro de alterações, sem tocar em `movimento`), e lançamento de quem mudou de empresa aparece como "Pessoa transferida" para a empresa antiga; no máximo um adesivo pendente por pessoa na fila da etiquetadora, lote numa chamada, e o agente grava o que já imprimiu. |
| 13/10/2026 | **Plano de correção · bloco 3 (fecha os 18 pontos):** prévias de foto liberadas da memória ao sair da devolução e quando a imagem falha (13); log do agente no Windows sem crescer para sempre: só o log diário de 14 dias e os erros da execução atual (14); painel da TV com contador de versão por obra, mudado por gatilho — "nada mudou" sem remontar (de ~15 ms para 0,05 ms por consulta com 1500 peças fora) (16); `BotaoNovo` sem uso removido e comentário do prefixo corrigido (18). O ponto 15 foi feito no bloco 2. **Não feito, por decisão:** separar o fluxo offline em módulos e centralizar validações (18) — sem ganho que justifique mexer agora num fluxo coberto por e2e. |
| 13/10/2026 | **Performance · bloco 1** (análise externa, `docs/ANALISE-DE-PERFORMANCE-E-FLUIDEZ.md`): ficha aparece sem esperar a equipe (1); lista só gera links de fotos na aba Avarias (2); sinal fraco abre a tela sem internet guardada em 3 s (8); atualização ao vivo com prazo máximo de 3 s e espera da aba escondida (7); "Preparando a foto…" e "Conferindo…" (13); acompanhar impressão consulta só a situação (15). A versão do cache do service worker não muda nesta entrega (trocar apagaria a cópia de /campo nos celulares). Leitor de QR (9) e animação da TV (18) só depois de medir no aparelho real; o resto vai no bloco 2. |
| 13/10/2026 | **Performance · bloco 2:** início com contagens no banco (3); estoque monta só o grupo aberto (4); buscas com índice preparado e termo adiado (5); escolha manual monta 60 pessoas por vez (6); modo sem internet com avisos agrupados, leitura pela chave e download compartilhado (10, 11); miniaturas com carregamento tardio (12) — miniatura menor no Storage depende do recurso de transformação de imagem do plano do Supabase; editar ferramenta busca o tipo pelo id e uma lista leve (14); colunas da TV lineares e memorizadas (17). Validado pelo CI (o Docker local travou). Leitor de QR (9) e animação da TV (18) só com medição no aparelho. |
| 13/10/2026 | **Auditoria de segurança e onda 1** (`docs/seguranca/auditoria-2026-10-13.md`): acesso no formato do revel — e-mail + senha com o olho, **sem link mágico**; criar, recuperar e **trocar a senha sempre pelo código de 8 dígitos no e-mail** (15 min), conferido no servidor pelo `amr` do token (método `otp`); salvar a senha derruba as outras sessões; `/trocar-senha` só para a senha provisória do convite; `secure_password_change` ligado e URLs de retorno exatas. Banco: engenheiro só edita nome e endereço da obra (`ativa`/`encerrada_em` são do administrador) e a obra entra no histórico; o nome do login não é editável pelo próprio usuário; consulta restrita não vê os logins de consulta de outras empresas; até 10 aparelhos de notificação por login; limites de tamanho nos textos. CSP em Report-Only até conferir os relatórios. |
| 16/10/2026 | **Criar conta, por enquanto sem e-mail** (dono, comparando com o revel): o padrão do revel (a própria pessoa cria a conta e a senha por código no e-mail) fica para quando o e-mail próprio (Resend com domínio) entrar. Até lá: continua o convite do engenheiro, que agora pode **escolher a senha do primeiro acesso** (mínimo 10) ou deixar o app gerar, e pode **gerar nova senha provisória** para quem ainda não criou a própria (quem já criou não pode ter a senha trocada pelo engenheiro). Do revel não entram autocadastro aberto, convite por qualquer membro, foto de perfil (proibida no Almox) nem excluir a própria conta (RN-18). |
| 17/10/2026 | **Acesso sem e-mail, simples** (o Carlos tentou "criar conta" pelo "Esqueci ou ainda não tenho senha" e esperou um código que nunca chega: ele nem tinha login, e sem SMTP o código não sai). Enquanto `CODIGO_POR_EMAIL` não estiver ligado na Vercel: o link do login vira "Primeiro acesso ou esqueceu a senha?" e explica que é o engenheiro quem libera; trocar a senha na Conta pede a **senha atual**; o engenheiro gera senha nova também para almoxarife e consulta **só desta obra** que esqueceram a própria (outro engenheiro ou login de outra obra: administrador), com troca obrigatória no próximo login e registro no histórico. Com o e-mail próprio configurado, ligar `CODIGO_POR_EMAIL=1` volta o fluxo por código (padrão revel). |
| 17/10/2026 | **Senha com no mínimo 8 caracteres** (dono: 10 era exagero), igual ao revel. App e `config.toml`; em produção, ajustar *Minimum password length* no painel do Supabase. |
| 17/10/2026 | **Administrador (multi-obra)** (dono). Perfil acima das obras, em `public.administrador` (nomeado só por `scripts/tornar-administrador.mjs`). Na tela **Administração** (Conta): cria obra, edita nome e endereço, desativa, encerra e reativa; liga o engenheiro da obra (login novo ou de outra obra); gera senha nova para qualquer pessoa da obra, menos outro administrador. Não vê dados das obras: para lançar ou ver relatórios, liga-se como engenheiro. Perfil e remoção dos demais acessos seguem com o engenheiro. Substitui a criação de obra por script (M11). |
| 17/10/2026 | **Login de outra obra liga normalmente** (dono): o engenheiro dá acesso a um e-mail que já entra em outra obra, sem mexer na senha. Senha de quem está em várias obras ou de outro engenheiro: o administrador. |
| 17/10/2026 | **Trabalhador que muda de obra ganha cadastro e adesivo novos** (dono): pessoa, empresa e QR continuam por obra; o histórico de cada obra fica separado. |
| 17/10/2026 | **Toda obra fica com pelo menos um engenheiro**: o banco recusa rebaixar ou remover o último. **Obra desativada ou encerrada some do app** (escolha de obra); os dados ficam, e o administrador reativa. |
| 17/10/2026 | **Desativar é para obra parada** (revisão): o banco não recusa lançamento em obra desativada (fila offline e aparelhos abertos ainda enviam). O administrador desativa ou encerra quando o almoxarifado já fechou; se precisar, reativa para conferir. Senha de administrador nunca passa pelo engenheiro, e administrador com senha pendente não alcança as funções do banco. |
| 22/10/2026 | **Domínio de produção: `almox-controle.vercel.app`** (dono). `almox-chi.vercel.app` redireciona (307). O endereço só aparece em textos (passo a passo da TV, Ajuda) e na lista de retorno do Auth; nenhuma variável de ambiente depende dele. Login, PWA e TV ficam por domínio: quem usava o antigo entra de novo, reinstala o app e reconecta a TV. |
