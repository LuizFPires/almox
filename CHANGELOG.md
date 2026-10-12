# Changelog — Almox

Registro do que foi entregue em cada milestone (ver `PLAN.md`).

## M7 — Lista, estoque e busca (concluído em 11/10/2026)

### Adicionado
- **"Quem está com o quê" (F-07):**
  - agrupado por empresa (própria primeiro), só quem está com ferramenta, mais "+ N pessoas sem ferramenta";
  - cada peça aparece em um chip com ícone, nome do tipo e código;
  - pendência em vermelho com o "desde" real;
  - tocar abre a ficha como "Aberto pela lista".
- **Busca** por nome, apelido do capacete ou código da peça, sem acento ("jose" acha José, "mt-02" acha quem está com ela).
- **Estoque (F-09):**
  - totais da obra (na obra, livres, no canteiro, manutenção) e legenda;
  - por tipo, uma barra com um bloco por peça e "livres /total";
  - tocar mostra com quem está cada peça ("MT-01 · Raimundo · desde ontem 16:40") e o que está em manutenção;
  - unidades com baixa não contam.
- **Consulta de empreiteira:** na lista, só a própria empresa (RLS). No estoque, os totais da obra; as peças com outras empresas aparecem só como "N com outras empresas", sem nome.
- **Tempo real:** as duas telas atualizam sozinhas. O estoque também escuta mudanças de unidade (migration nova: `unidade` no Realtime).

### Revisão e comparação com o protótipo
- **Estoque ao vivo para todos:** a empreiteira não recebe movimentos de outras empresas, e "Voltou do conserto" / "Dar baixa" não geram movimento. Por isso o estoque passou a escutar a unidade.
- **Lista:**
  - quem foi inativado com ferramenta continua aparecendo até devolver (decisão: inativar continua permitido);
  - "sem ferramenta" conta só as ativas e some durante a busca.
- **Visual do protótipo:**
  - chip em pílula com o nome ao lado do ícone (exceção registrada à regra "nome embaixo");
  - barra por peça, livres em verde e manutenção em vermelho.
- **Testes:**
  - os e2e criam os próprios dados, devolvem o que retiraram e usam uma pessoa por projeto (também na devolução sem QR, que falhava às vezes);
  - 2 pgTAP novos (224 no total), 151 unitários e 63 e2e.

## M6 — Devolução e avaria (concluído em 11/10/2026)

### Adicionado
- **Devolução** pela ficha, agrupada por tipo:
  - toque no ícone soma 1, com "Devolvendo" (− / x de N / +), "Devolveu tudo" e "Avariadas" (no máximo o que está voltando);
  - rodapé "Fica com ele";
  - com QR devolve tudo; sem QR, só o que saiu sem QR (RN-02/RN-06, conferido no servidor).
- **Avaria com foto por peça** (decisão do dono):
  - a câmera do celular tira a foto, que é comprimida no aparelho e vai para um Storage privado;
  - o motivo é um de: Quebrada, Cabo rompido, Não liga, Desgaste, Peça faltando;
  - sem foto, a devolução não conclui (RN-09);
  - as peças avariadas vão para manutenção.
- **`registrar_devolucao`** transacional:
  - voltam as mais antigas (RN-08);
  - é idempotente: repetir o pedido depois de uma falha de rede não devolve duas vezes;
  - guarda de qual retirada cada peça veio.
- **Estorno** pelo lançamento, só pelo engenheiro e com motivo:
  - na retirada, as peças voltam ao estoque; na devolução, a posse volta como estava;
  - o original fica como está (RN-18);
  - não estorna se as peças já tiveram outro movimento depois.
- **Manutenção:** lista das peças avariadas com foto, com "Voltou do conserto" e "Dar baixa" (só o engenheiro). Isso fica no log de alterações.
- Tela **"Devolução registrada"**. Os últimos lançamentos do Início abrem o detalhe do lançamento.
- 41 testes pgTAP novos (216 no total).
- e2e dos 3 critérios de aceite, com foto de verdade, mais estorno e conserto.

### Revisão e comparação com o protótipo
- **QR do capacete sempre em um segmento só de bytes** (ZPL `MM,B…`, TSPL manual, prévia). Token que começava com dígitos gerava um QR que o leitor do app não lia (achado no e2e). Falta conferir com a impressora real.
- **Foto:**
  - plano B na compressão para celulares mais antigos;
  - quem enviou apaga a própria foto ainda não usada ("Refazer");
  - foto que prova avaria ninguém apaga;
  - carimbo gravado na foto: ferramenta, data e hora, quem fotografou.
- **Manutenção:** confirmação com "Cancelar", erros conforme o motivo e nome de quem fez no log.
- **Telas como o protótipo:** contadores grandes em painéis, ícone de câmera, "· foto HH:MM" e ícones no sucesso.
- **CI:** agora sobe Realtime e Storage.
- **Testes:** 47 pgTAP da devolução (222 no total), 142 unitários e 55 e2e.

## M5 — Retirada (concluído em 11/10/2026)

### Adicionado
- **Retirada** a partir da ficha: grade com todos os tipos da obra. Cada toque no ícone soma 1, há o botão "−" e "N livres", e o limite são as unidades livres (RN-07).
- **Revisão:**
  - os códigos que vão sair (livres em ordem de código, RN-08) e ALTO VALOR (RN-10);
  - aviso de quem ainda tem ferramenta de outro dia;
  - aviso de lançamento sem QR, conforme RN-05/RN-06;
  - "Conferi pessoalmente…" obrigatório (RN-11).
- **`registrar_retirada`** transacional:
  - grava movimento, itens, posse e unidade em uso;
  - é QR só com a conferência do capacete válida; sem ela, é manual;
  - conferência vencida pede nova leitura;
  - dois celulares na mesma unidade: um leva e o outro vê "… acabou de sair".
- Tela **"Retirada registrada"** com "Ler outro capacete" e "Início".
- **Últimos lançamentos ao vivo** (Supabase Realtime, com RLS).
- e2e dos 3 critérios de aceite, incluindo dois celulares concluindo a retirada ao mesmo tempo.

### Revisão e comparação com o protótipo
- A retirada é **idempotente**: o celular gera uma chave ao entrar na revisão. Repetir "Concluir" depois de uma falha de rede devolve o mesmo movimento, sem duplicar.
- Cada item da lista é validado no servidor.
- O Início ao vivo usa um canal novo a cada abertura.
- O rodapé fixo deixa espaço para o campo que está em foco.
- Detalhes de tela do protótipo:
  - selo SAÍDA;
  - "−" com "toque no ícone: +1";
  - confirmação marcada em grafite com check amarelo;
  - botões desligados em cinza;
  - sucesso com os botões lado a lado.
- 31 testes pgTAP da retirada (175 no total), 133 testes unitários e 50 e2e.

## M4 — Identificação por QR e ficha da pessoa (concluído em 11/10/2026)

### Adicionado
- **Ler capacete** pela câmera do celular. A leitura é automática (`@zxing/browser`), há lanterna quando o aparelho permite e mensagens para "Capacete não cadastrado", pessoa inativa, pessoa de outra empresa e câmera bloqueada.
- **Conferência** (RN-03): "É o {nome} que está na sua frente?". "Sim, é o …" grava no servidor uma identificação que vale **10 minutos**. Retirada e devolução com QR (M5/M6) vão exigir essa identificação.
- **"Não é ele"** (RN-04): "Nada foi registrado". A ocorrência fica anotada e aparece em vermelho nos últimos lançamentos. O aviso ao encarregado chega no M9.
- **Ficha da pessoa** (F-04):
  - mostra como a pessoa foi identificada;
  - "Com ele agora", com horário, pendência "desde ontem", "sem QR" e ALTO VALOR;
  - regra de devolução RN-02/RN-06, com "Ler capacete do …";
  - equipe da empresa.
  - A consulta vê a ficha sem botões.
- **Lista manual "Sem QR"** (F-08): busca por nome ou apelido sem acento. Quem é aberto por ela entra na ficha como "Escolhido na lista · sem QR".
- **Início** (F-01) com dados reais: no canteiro, no almox, manutenção e pendências; cartão do fechamento do dia; pendências; últimos lançamentos.
- e2e com QR de verdade: um vídeo com o QR alimenta a câmera falsa do Chromium.

### Revisão e comparação com o protótipo
- A conferência fica presa à leitura: a ficha carrega o id da identificação, e o servidor confere dono, pessoa, obra e validade. Abrir a mesma pessoa pela lista manual não conta como QR.
- Falha de rede na leitura vira mensagem na tela, e foi criada a tela de erro do app. O bloqueio não promete aviso ao encarregado antes do M9.
- A consulta de empreiteira vê no Início só os números da própria empresa.
- Detalhes de tela do protótipo: hora no cabeçalho, ícones, cartão da ficha centralizado, botões com ícone, voltar da conferência para a leitura e da equipe para a ficha anterior, lupa na busca.
- 30 testes pgTAP do M4 (144 no total), 127 unitários e 45 e2e, incluindo leitura sem internet.

### Pendente
- Testar a câmera no Android e no iPhone reais (no CI a leitura é simulada no Chromium).

## M3 — Adesivo do capacete e impressão (concluído em 11/10/2026)

### Adicionado
- Adesivo 60 × 80 mm em **ZPL e TSPL** (QR desenhado pela impressora, **só com o token**), com prévia igual ao protótipo na ficha da pessoa.
- Fila de impressão (`trabalho_impressao`: pendente → enviando → enviado / erro) só por RPC; conteúdo da etiqueta ilegível pelo app.
- Tela **Impressora** (engenheiro): impressora da obra (IP, porta, linguagem, rolo), etiqueta de teste, situação do agente, últimas impressões; cartão da impressora no topo de Cadastros.
- Mini PC da obra com **token mostrado uma vez** (só o hash no banco) e revogação.
- Tela **Imprimir** como no protótipo. "Salvar e imprimir adesivo" abre essa tela, com prévia, impressora verde ou vermelha, cópias 1–5 e "Imprimir N etiquetas". Ela acompanha o trabalho até "Impresso no almoxarifado. Cole na frente do capacete.". Para reimprimir, há um atalho em cada pessoa da lista e na ficha. Mostra os avisos de agente desligado e de impressora sem resposta.
- Adesivo com nome comprido que encolhe para caber, rodapé com obra à esquerda e matrícula à direita, prévia desenhada na mesma escala do impresso.
- **Agente de impressão** (`agente-impressao/`): consulta a fila a cada 2 s, manda para `ip:9100`, informa o resultado; impressora simulada; instaladores de serviço para Windows e Linux; guia `LEIA-ME.md`.
- Revisão: impressora só na rede da obra (IP privado, porta 9100–9199), fila sem impressão dupla (quem pegou conclui; erro após 3 tentativas), conteúdo apagado depois de impresso, texto sem caracteres de controle.
- 41 testes pgTAP do M3 (114 no total), 101 unitários e e2e de ponta a ponta com o agente de verdade (adesivo sai em menos de 1 s com a impressora simulada).

### Pendente
- Critério "imprime em até 10 s" com a **impressora real** (ainda não comprada).

## M2 — Cadastros do engenheiro (concluído em 11/10/2026)

### Adicionado
- Cadastros (só engenheiro; os demais veem "Só o engenheiro cadastra"): abas Pessoas · Ferramentas · Empresas · Acessos, no visual do protótipo.
- Empresas: própria/empreiteira, cor do painel, dono e encarregado com e-mail, próxima medição e alerta "Falta e-mail".
- Pessoas: nome completo validado, nome no capacete sugerido (com aviso de repetido), função com sugestões, matrícula automática, inativar/reativar.
- Ferramentas: tipos com um dos 13 ícones, valor de reposição no formato brasileiro (centavos no banco), alto valor, unidades com código sequencial (`adicionar_unidades`), histórico de valor.
- Log de alterações (`alteracao`) gravado por gatilho: valores, empresa da pessoa, dados de aviso da empresa e acessos.
- Acessos: o engenheiro dá acesso com senha provisória (mostrada uma vez), troca obrigatória no primeiro login, muda perfil e remove; Conta › Trocar senha.
- 17 testes pgTAP novos (64 no total), regras puras com testes e e2e do critério de aceite.

### Revisão e comparação com o protótipo
- Migration de revisão: 100ª unidade (código não corta mais), vínculo de acesso imutável além de perfil/empresa, senha provisória pendente bloqueada também no banco, empreiteira com consulta restrita não vira própria, nome de quem alterou no log.
- Dar acesso nunca troca nem mostra a senha de login existente (achado de segurança).
- Formulários de criação recomeçam a cada visita; nome do capacete aceita espaço; empreiteira exige dono com e-mail; itens fora no cartão da empresa; prévia e botão de ferramenta como no protótipo; botão "Nova …" abaixo das abas.
- 73 testes pgTAP, 56 unitários e 38 e2e.

### Produção
- `almox-prod` com as migrations do M2 e senha mínima de 10 caracteres; Cadastros conferidos com o login do engenheiro.

## M1 — Banco, autenticação e perfis (concluído em 11/10/2026)

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

### Revisão
- Migration de revisão: privilégios padrão revogados, posse ⇔ unidade em uso, encarregado da própria empresa, avisos só para engenheiro e empreiteira, nomes de quem lançou visíveis na obra; 47 testes pgTAP.
- Auth sem curinga nas URLs de retorno; senhas de teste do `almox-dev` fora do repositório.

### Produção
- `almox-prod` com o schema (sem seed) e Auth fechado; obra SL Betim e login do engenheiro criados e testados em https://almox-chi.vercel.app.

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
