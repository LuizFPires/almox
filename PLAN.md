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
| M2 | Cadastros do engenheiro | 🟨 Em andamento | |
| M3 | Adesivo do capacete e impressão | ⬜ A fazer | |
| M4 | Identificação por QR e ficha da pessoa | ⬜ A fazer | |
| M5 | Retirada | ⬜ A fazer | |
| M6 | Devolução e avaria | ⬜ A fazer | |
| M7 | Lista, estoque e busca | ⬜ A fazer | |
| M8 | Painel da TV | ⬜ A fazer | |
| M9 | Fechamento do dia e avisos às empreiteiras | ⬜ A fazer | |
| M10 | Offline, auditoria e endurecimento | ⬜ A fazer | |
| M11 | Piloto em obra | ⬜ A fazer | |
| M12 | Conector ioo | ⬜ A fazer | |

Legenda: ⬜ A fazer · 🟨 Em andamento · ✅ Concluído · ⛔ Bloqueado

---

## M0 — Fundação do projeto

**Objetivo:** repositório pronto, app vazio publicado e instalável no celular, com a identidade visual do protótipo.

**Entregas**
- [x] Repositório com Next.js (App Router) + TypeScript estrito + Tailwind
- [x] Projeto Supabase (dev e prod) criado e variáveis de ambiente documentadas em `.env.example` — `almox-dev` e `almox-prod` (São Paulo)
- [x] Deploy contínuo (Vercel) a partir da branch `main`; preview por PR — produção em https://almox-chi.vercel.app (Production → almox-prod, Preview → almox-dev)
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
- [ ] QR Code com **apenas o token** (RN-17)
- [ ] Layout do adesivo 60 × 80 mm: QR, nome no capacete grande, nome completo, função · empresa, rodapé "ALMOX · obra · matrícula" (igual ao protótipo)
- [ ] Geração do adesivo em **ZPL** e **TSPL** (escolha pela impressora cadastrada) + prévia na tela
- [ ] Tabela `trabalho_impressao` como fila (pendente → enviado / erro)
- [ ] **Agente de impressão local** (Node, pasta `agente-impressao/`): roda no mini PC da TV, autentica por token de dispositivo, escuta a fila (realtime), envia para `ip:9100` da impressora, atualiza status; instalável como serviço (Windows e Linux)
- [ ] Tela "Impressora": escolher impressora da obra, rolo, imprimir teste, ver status do agente (online/offline)
- [ ] "Salvar e imprimir adesivo" no cadastro de pessoa; "Reimprimir" com 1–5 cópias
- [ ] Mensagens de erro claras: agente offline, impressora sem resposta

**Critérios de aceite**
- Com o agente rodando na mesma rede, cadastrar uma pessoa imprime o adesivo em até 10 s.
- QR impresso lido por uma câmera comum mostra só o token, sem nome.
- Com o agente desligado, o app avisa e o trabalho fica pendente até o agente voltar.

**Depende de:** M2

---

## M4 — Identificação por QR e ficha da pessoa

**Objetivo:** ler o capacete, conferir a pessoa e abrir a ficha, respeitando o perfil.

**Entregas**
- [ ] Leitor de QR pela câmera (PWA), leitura automática, lanterna, funciona em Android e iPhone
- [ ] Token desconhecido → "Capacete não cadastrado"
- [ ] **Conferência** (RN-03): nome do capacete grande, nome completo, função/empresa; "Sim, é o {nome}" / "Não é ele"
- [ ] **Bloqueio** (RN-04): "Nada foi registrado", grava `ocorrencia`, notifica encarregado; opções "Ler o capacete certo" / "Escolher na lista (manual)"
- [ ] **Ficha da pessoa** (F-04): o que está com ela (com hora e marca "sem QR"), equipe da empresa, identificação usada
- [ ] Perfil consulta: QR abre direto a ficha, sem botões de lançamento
- [ ] Lista manual (F-08) com busca por nome/apelido sem acento
- [ ] Tela inicial (F-01) com resumo e últimos lançamentos (dados reais)

**Critérios de aceite**
- Almoxarife lê QR → conferência → ficha com botões Retirada/Devolução.
- Consulta lê o mesmo QR → ficha sem botões.
- "Não é ele" cria ocorrência e não altera nenhuma posse.

**Depende de:** M3

---

## M5 — Retirada

**Objetivo:** registrar retiradas por quantidade, com QR ou manual.

**Entregas**
- [ ] Grade de tipos com unidades livres; **toque no ícone soma 1**, botão −, selo com quantidade; limite = livres (RN-07)
- [ ] Revisão: tipo × quantidade, unidades alocadas automaticamente (RN-08), selo ALTO VALOR (RN-10), confirmação obrigatória (RN-11), aviso de lançamento manual (RN-05)
- [ ] RPC `registrar_retirada` transacional: cria `movimento` + `movimento_item`, cria `posse` com `via`, muda `unidade.status` para `em_uso`; falha se alguma unidade deixou de estar livre (concorrência)
- [ ] Tela de sucesso e retorno para "Ler outro capacete"
- [ ] Aparece em tempo real em "últimos lançamentos"

**Critérios de aceite**
- Pegar 2 pás + 1 furadeira com QR: 3 unidades em uso, posse com `via = qr`, movimento registrado com almoxarife e hora.
- Dois celulares tentando retirar a última furadeira ao mesmo tempo: só um consegue; o outro recebe "acabou de sair".
- Retirada pela lista grava `via = manual`.

**Depende de:** M4

---

## M6 — Devolução e avaria

**Objetivo:** devolver por quantidade, registrar avarias com foto, cumprir "quem pegou, devolve".

**Entregas**
- [ ] Devolução agrupada por tipo; contador "Devolvendo" (toque no ícone +1, −, "Devolveu tudo"); contador "Avariadas" ≤ devolvendo
- [ ] Avaria: **foto obrigatória** (câmera, compressão no celular, upload para Storage) + motivo; sem foto não conclui (RN-09)
- [ ] Unidades devolvidas escolhidas pelas mais antigas (RN-08); avariadas vão para `manutencao`
- [ ] **RN-02/RN-06** aplicadas no servidor: devolução de item com `via = qr` exige identificação por QR na sessão; sem QR, só itens `via = manual`
- [ ] Ficha: botão Devolução desabilitado com explicação quando não permitido + atalho "Ler capacete do {nome}"
- [ ] RPC `registrar_devolucao` transacional
- [ ] Estorno: engenheiro pode estornar um movimento com motivo (novo movimento `estorno`), nunca editar

**Critérios de aceite**
- Joaquim devolve 1 de 2 pás, 1 avariada com foto: 1 unidade em manutenção, 1 pá continua com ele.
- Tentar devolver pela lista um item retirado com QR é bloqueado pela API (não só pela tela).
- Item retirado sem QR é devolvido sem QR com sucesso.

**Depende de:** M5

---

## M7 — Lista, estoque e busca

**Objetivo:** qualquer perfil vê quem está com o quê e quanto tem livre.

**Entregas**
- [ ] Lista "quem está com o quê" (F-07) agrupada por empresa, chips por item, pendência em vermelho
- [ ] Busca por nome ou código, sem acento
- [ ] Estoque (F-09): totais (na obra, livres, canteiro, manutenção), barra por tipo, toque mostra com quem está cada unidade
- [ ] Consulta de empreiteira vê só a própria empresa
- [ ] Atualização em tempo real

**Critérios de aceite**
- Após uma retirada em outro celular, lista e estoque atualizam sem recarregar.
- Busca "joao" encontra "João"; busca "MT-02" encontra quem está com ele.

**Depende de:** M6

---

## M8 — Painel da TV

**Objetivo:** painel em loop na TV do almoxarifado, igual ao protótipo "versão escolhida".

**Entregas**
- [ ] Rota `/tv` em tela cheia, autenticada por **token de dispositivo** (cadastro do dispositivo pelo engenheiro, só leitura)
- [ ] **Cartões por pessoa**: 12 por página (4 × 3), ordem alfabética, 8 s por página, esmaecimento 0,6 s
- [ ] Cartão: nome, função, empresa (cor), ferramentas (ícone + nome, ×N), "Retirou às", faixa vermelha de pendência
- [ ] **Colunas por empresa** rolando para a esquerda a 45 px/s, pausa 2,5 s antes e 3 s depois; coluna dupla se a empresa tiver mais de 6 pessoas
- [ ] Loop infinito; cabeçalho fino (título, faixa "Pessoas 13–24 de 30", pontos de página, hora); barra de progresso
- [ ] Parâmetros configuráveis pelo engenheiro (tempo por página, velocidade, pausas)
- [ ] Realtime; reconexão automática; aviso "sem conexão desde HH:MM" mantendo o último estado
- [ ] Animação suave a 60 fps no mini PC (usar `requestAnimationFrame` e `transform`)
- [ ] Prevenção de suspensão de tela (Wake Lock) e recarga automática diária de madrugada

**Critérios de aceite**
- Com 30 pessoas com ferramenta: 3 páginas (12, 12, 6) → colunas por empresa → volta à página 1.
- Retirada feita no celular aparece na TV em até 3 s, sem quebrar a animação em curso.
- Rodando 72 h seguidas sem travar nem vazar memória.

**Depende de:** M7

---

## M9 — Fechamento do dia e avisos às empreiteiras

**Objetivo:** relatório diário e cobrança automática de reposição.

**Entregas**
- [ ] Tela de fechamento (F-10): pendentes por pessoa (empresa, itens, valor, "desde ontem"), quem devolveu tudo hoje, atalho "chegou: ler capacete e devolver"
- [ ] **Sem baixa geral** (RN-12): encerrar só gera relatório e avisos
- [ ] Encerramento manual + automático às 23:59 (job agendado)
- [ ] Cálculo por empreiteira: soma dos valores vigentes das unidades pendentes (RN-16); construtora própria → só engenheiro (RN-15)
- [ ] **Notificação no app** (Web Push, VAPID) para dono e encarregado, que precisam ter login de consulta
- [ ] **E-mail** transacional (Resend ou SMTP) com o modelo do protótipo: destinatários, assunto, tabela pessoa/itens/valor, total, texto do desconto e do cancelamento
- [ ] Tabela `aviso` com status `enviado` → `cancelado` (ferramenta devolvida antes do fechamento da medição — RN-14, com novo e-mail avisando o cancelamento) ou `confirmado` (no fechamento da medição)
- [ ] Data da medição por empresa; relatório "valores a descontar por empresa" para o engenheiro
- [ ] Tela "Ver aviso enviado" (prévia da notificação e do e-mail)

**Critérios de aceite**
- Encerrar o dia com pendências de 2 empreiteiras gera 2 avisos, cada um com o total correto e e-mail entregue ao dono e ao encarregado.
- Devolver a ferramenta antes da data da medição muda o aviso para `cancelado` e envia o e-mail de cancelamento.
- Pendência de funcionário próprio não gera aviso para empreiteira.

**Depende de:** M8

---

## M10 — Offline, auditoria e endurecimento

**Objetivo:** aguentar a internet ruim da obra e ficar pronto para produção.

**Entregas**
- [ ] Fila local (IndexedDB) para retiradas e devoluções sem conexão; envio automático ao reconectar; selo "aguardando envio"
- [ ] Resolução de conflito: se a unidade não está mais livre ao sincronizar, o servidor aloca outra do mesmo tipo ou devolve erro claro ao almoxarife
- [ ] Cache local de pessoas e tokens para ler QR offline
- [ ] Tela de histórico/auditoria (engenheiro): filtros por pessoa, empresa, ferramenta, período, via, ocorrências
- [ ] Exportação do histórico e dos avisos em planilha (.xlsx), com valores no padrão brasileiro
- [ ] Revisão de RLS e testes de segurança (token da TV não escreve; QR não vaza dados)
- [ ] Monitoramento de erros (Sentry ou similar) e logs do agente de impressão
- [ ] Testes e2e do fluxo completo: cadastro → adesivo → retirada → devolução com avaria → fechamento → aviso
- [ ] Política de dados (LGPD): retenção de fotos e histórico, texto do termo de responsabilidade (a validar com o jurídico)

**Critérios de aceite**
- Celular em modo avião registra 3 retiradas; ao voltar a rede, as 3 aparecem no servidor e na TV.
- Suite e2e completa verde no CI.

**Depende de:** M9

---

## M11 — Piloto em obra

**Objetivo:** validar em uso real por 30 dias numa obra.

**Entregas**
- [ ] Checklist de implantação: TV + mini PC, agente de impressão como serviço, impressora configurada, Wi-Fi testado no almoxarifado
- [ ] Cadastro inicial de empresas, pessoas e ferramentas; impressão e colagem dos adesivos
- [ ] Treinamento de 30 min: almoxarife, engenheiro, encarregados
- [ ] Termo de responsabilidade assinado pelos trabalhadores e cláusula de desconto nos contratos das empreiteiras (jurídico)
- [ ] Coleta das métricas do PRD §3 (tempo de lançamento, % manual, pendências/semana)
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
