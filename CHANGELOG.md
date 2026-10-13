# Changelog — Almox

Registro do que foi entregue em cada milestone (ver `PLAN.md`).

## Performance · bloco 2 (13/10/2026)

O que pesa em obras grandes.

### Mudado
- **Início:** os números são contados no banco, sem trazer peça por peça.
- **Estoque:** só monta o detalhe do grupo aberto.
- **Buscas** (Cadastros e lista): não refazem tudo a cada letra; a digitação não trava.
- **Escolher na lista:** mostra 60 pessoas por vez ("Mostrar mais"); a busca acha todas.
- **Sem internet:** menos releituras e downloads repetidos; a preparação não disputa com a abertura do app.
- **Fotos de avaria:** miniaturas só baixam quando aparecem na tela.
- **Editar ferramenta:** carrega só o necessário.
- **TV:** organizar as colunas ficou leve mesmo com muitas pessoas.

## Performance · bloco 1 (13/10/2026)

O que o almoxarife sente todo dia (análise em `docs/ANALISE-DE-PERFORMANCE-E-FLUIDEZ.md`).

### Mudado
- **Ficha da pessoa** aparece logo; a equipe da empresa carrega depois.
- **Lista** abre mais rápido: as fotos das avarias só são preparadas na aba Avarias.
- **Sinal fraco:** a tela sem internet abre pela cópia do celular em 3 s, em vez de ficar carregando.
- **Ao vivo:** com movimento sem parar, a lista e o início atualizam pelo menos a cada 3 s.
- **Avisos de espera:** "Preparando a foto…" e "Conferindo…".
- **Impressão:** acompanhar o adesivo não recarrega a página inteira a cada poucos segundos.

## Plano de correção · bloco 3 (13/10/2026)

Limpeza e consumo de recursos; com este bloco, os 18 pontos da análise externa estão tratados.

### Corrigido
- **Fotos de avaria:** as prévias saem da memória do celular ao sair da devolução.
- **Agente no Windows:** o log da tarefa não cresce mais para sempre.
- **TV:** "nada mudou" responde sem remontar o painel (bem menos trabalho do banco com várias TVs).
- Código sem uso removido.

## Plano de correção · bloco 2 (13/10/2026)

Dívidas da análise externa que pesam em obras longas e na impressora de etiquetas.

### Corrigido
- **Listas, medição e planilhas** não cortam mais em 1000 linhas (obra com anos de cadastro).
- **Cadastro de ferramenta** salvo de uma vez: falha no meio não deixa cadastro pela metade, e salvar de novo não
  cria unidades a mais. O código das peças nunca repete.
- **Sem internet:** o celular calcula o que pode voltar sem QR igual ao servidor (peças mais antigas primeiro).
- **Avisos:** homônimos ficam em linhas separadas e a anonimização (LGPD) não atinge outra pessoa.
- **Troca de empresa:** a empreiteira antiga continua vendo o histórico do tempo em que a pessoa era dela; a nova
  não vê o passado.
- **Etiquetadora:** pedido repetido não imprime dois adesivos; lote de 100 em uma chamada; o agente não reimprime
  depois de reiniciar.

## Plano de correção · bloco 1 (13/10/2026)

Pontos da análise externa (`docs/PLANO-DE-CORRECAO-18-PONTOS.md`) que afetam cobrança e o balcão.

### Corrigido
- **Encerramento × devolução ao mesmo tempo:** a empreiteira não é mais cobrada por ferramenta devolvida no
  instante do encerramento (corrida reproduzida com duas conexões e fechada).
- **Troca de empresa com ferramenta na mão** é recusada: a cobrança iria para a empresa nova.
- **Pessoa inativa que ainda tem ferramenta** devolve pelo QR (com e sem internet); retirada continua bloqueada.
- **Notificação** na fila não vai para quem perdeu o acesso.
- **Sem internet:** toque duplo em "Guardar" não duplica o lançamento.
- **Folha A4:** "Sim, saíram certas" não fica preso em "Marcando…".
- **TV:** o relógio se acerta pelo servidor mesmo sem mudança no painel.

## Ajustes do piloto (após o M11, 13/10/2026)

### Adicionado
- **Lista com abas** Agora · Não devolvidas · Avarias, agrupadas por pessoa.
- **Avaria:** campo "Detalhes (opcional)" além do motivo.
- **Cadastros:**
  - engrenagem no cabeçalho com impressora, painel da TV, importar planilha e passo a passo (a lista ganha a tela);
  - busca geral em pessoas, ferramentas e empresas, sem acento.
- **Ferramentas:**
  - 69 ícones prontos, por grupo e com busca;
  - envio de ícone próprio quando nenhum serve.

- **Avaria:** tela com foto inteira, data e hora, quem devolveu, motivo, detalhes e valor da indenização (o engenheiro ajusta); botão para enviar foto e dados pelo WhatsApp.

- **TV sem mini PC:** a TV mostra um código e um QR; o engenheiro ou o almoxarife conecta pelo celular (*Conectar TV*), e dá para desconectar.
- **Adesivos em folha A4** na impressora comum da obra, da ficha ou em lote.

- **Registro de movimentações no Início:** quem lançou, funcionário, dia e hora, ferramentas e QR ou lista.

- **Montar a folha de adesivos:** 3 tamanhos (9, 12 ou 16 por folha, Médio por padrão), aproveitar folha já usada, todos ou um por um.

- **Ferramenta própria ou alugada:** locadora com busca, salva para os próximos cadastros; quantidade logo após o nome.

### Mudado
- **Métricas do piloto removidas do app** (tela, menu e planilha).
- **Início mais limpo:** números que abrem cada tela e gestão (avisos, a descontar, histórico, métricas) num ícone no cabeçalho.
- **Código das peças:** sai do nome da ferramenta, sem o campo de prefixo.
- **Desempenho:** funções da Vercel em São Paulo e resposta imediata ao toque na barra inferior.

## M11 — Piloto em obra: preparação (código e documentos em 13/10/2026; piloto em campo pendente)

### Adicionado
- **Métricas do piloto (PRD §3)**, só para o engenheiro: tela *Métricas do piloto* e planilha do relatório.
  - Tempo do QR lido até a retirada registrada (média e mediana; meta até 15 s).
  - Retiradas sem QR (meta abaixo de 10%).
  - Ferramentas não devolvidas por semana, comparando semanas inteiras (meta: queda de 50%).
  - Pendências de empreiteira com aviso (meta: 100%).
  - O tempo conta da leitura do QR: o celular informa quanto levou até a confirmação.
- **Cadastro inicial por planilha modelo (.xlsx):**
  - empresas, pessoas e ferramentas de uma vez;
  - prévia com os erros linha a linha antes de gravar;
  - tudo numa transação, com as permissões do engenheiro.
- **Adesivos em lote:** quem ainda não tem adesivo, da obra ou de uma empresa, 100 por toque. Repetir continua de onde parou e não imprime duas vezes.
- **Documentos do piloto:**
  - checklist de implantação (`docs/IMPLANTACAO.md`);
  - roteiro de treinamento de 30 minutos (`docs/TREINAMENTO.md`);
  - modelo do relatório (`docs/RELATORIO-PILOTO.md`).
- **Script `scripts/criar-obra.mjs`:** cria a obra do piloto com o engenheiro (por OK do dono). Pode rodar de novo sem duplicar.

### Corrigido
- **Lista de pessoas:** passa de 1000 (a API devolvia no máximo 1000).

### Falta (campo)
- Termo assinado e cláusula nos contratos (jurídico).
- Implantação na obra e cadastro real.
- Treinamento.
- 30 dias de uso e o relatório com as melhorias priorizadas.

## M10 — Offline, auditoria e endurecimento (concluído em 12/10/2026)

### Adicionado
- **Lançar sem internet** (tela "Lançar sem internet", `/campo`):
  - a tela fica guardada no celular de quem lança;
  - lê o QR do capacete contra uma impressão irreversível (SHA-256) do código; o código em si nunca vai para o celular;
  - retirada, devolução e "Não é ele" ficam numa fila com o selo "aguardando envio" e vão sozinhos quando a rede volta;
  - no envio, o servidor confere o capacete de novo e escolhe as peças livres;
  - vale a hora do lançamento no celular (até 24 h, nada no futuro), e o movimento guarda também a hora em que chegou;
  - sem peça livre ou outro motivo: o item fica "não enviado", com o motivo, para o almoxarife descartar;
  - avaria não é lançada sem internet (a foto precisa subir).
- **Histórico e auditoria (engenheiro):** filtros por período, pessoa, empresa, ferramenta, via e tipo de lançamento, com quem lançou e a hora de chegada dos lançados sem internet.
- **Planilhas (.xlsx):**
  - o histórico, com os filtros da tela;
  - os avisos e descontos, uma linha por peça, com o total a descontar.
  - Datas e valores no padrão brasileiro.
- **Monitoramento:** erros do app e do agente de impressão vão para o Sentry sem dado pessoal (liga com o DSN). O agente também guarda logs diários por 14 dias.
- **Política de dados (LGPD)**, rascunho para o jurídico em `POLITICA-DE-DADOS.md`:
  - fotos de avaria apagadas 12 meses depois do conserto;
  - fila de e-mails, conferências e impressões apagadas depois de 12 meses;
  - pessoas anonimizadas 5 anos depois do fim da obra, ou depois de 5 anos inativas sem lançamento; os movimentos ficam, sem nome.
  - Inclui o texto do termo de responsabilidade.
- **Segurança:**
  - testes do banco sobre o catálogo inteiro;
  - a credencial da TV só lê, e o painel não leva código, e-mail nem valores;
  - cabeçalhos Permissions-Policy e HSTS.
- **e2e do fluxo completo:** cadastro → adesivo → retirada → devolução com avaria → fechamento → aviso por e-mail.

### Corrigido
- **Leitor de QR:**
  - trocado do zxing-js para o jsQR: o zxing-js não lia cerca de 7% dos capacetes, mesmo com a imagem perfeita;
  - era a causa do teste de câmera instável desde o M9.
- **E-mail sem provedor configurado:** fica esperando na fila, sem gastar as tentativas.
- **Encerramento automático:** ignora obra inativa ou encerrada.

### Revisão
- **Conferência e hora do celular:**
  - a conferência do capacete vale só na hora (a hora do celular não a faz voltar a valer);
  - a hora do celular não fica antes do último lançamento das peças.
- **Tela sem internet:** abre só para quem está logado no celular, com os dados desse login.
- **Fila:** um item com erro não trava os outros.
- **Sentry:** só inicia com o DSN (antes, mesmo desligado, deixava o servidor mais lento).

## M9 — Fechamento do dia e avisos às empreiteiras (concluído em 12/10/2026)

### Adicionado
- **Fechamento do dia (F-10):**
  - peças no canteiro;
  - quem ainda está com ferramenta (itens, valor, "desde ontem 16:40", "{nome} chegou: ler capacete e devolver");
  - quem devolveu tudo hoje;
  - "Encerrar o dia e enviar relatório", com confirmação.
- **Encerrar não dá baixa em nada (RN-12).** Um encerramento por dia, automático às 23:59 pelo agendamento do Supabase quando ninguém encerrou. Se o dia foi encerrado à mão, às 23:59 sai um complemento só com as peças que saíram depois.
- **Desconto peça a peça:**
  - cada peça de empreiteira que não voltou vira um desconto uma vez só, com o valor vigente no primeiro encerramento (RN-16);
  - o aviso dos dias seguintes lembra as peças pendentes, sem somar de novo;
  - funcionário próprio não gera aviso, só uma notificação de resumo ao engenheiro (RN-15).
- **Aviso por empreiteira:**
  - e-mail ao dono e ao encarregado com pessoa, ferramentas, valor, total e a regra do desconto e do cancelamento;
  - notificação no celular (Web Push) para quem ativou em Conta.
  - Telas "Dia encerrado" e "Aviso enviado", com a prévia da notificação e do e-mail.
- **Devolução antes da medição (RN-14):** cancela o desconto daquela peça, e a empreiteira recebe e-mail de atualização. Quando todas voltam, o aviso fica "cancelado".
- **Medição:**
  - "Valores a descontar" por empreiteira;
  - o engenheiro fecha a medição, os descontos em aberto viram "descontado" e ele informa a data da próxima.
- **Avisos:** a tela mostra a situação de cada peça, para a empreiteira (só a dela) e para o engenheiro.
- **"Não é ele":** notificação na hora ao encarregado da empresa da pessoa.
- **Fila de envios no banco:**
  - nova tentativa com espera crescente (1, 4, 16 e 64 min);
  - "sem destino" quando ninguém ativou notificação;
  - o engenheiro vê os envios com problema;
  - e-mail pelo Resend em produção e pela caixa de teste (Mailpit) localmente e no CI.
- **Limpeza diária** das fotos de avaria que nenhuma devolução usou (pendência do M6).

### Revisão e comparação com o protótipo
- **Estornos:**
  - o estorno de uma devolução reabre o desconto e o aviso, com e-mail de correção;
  - o estorno de retirada cancela o desconto com "lançamento corrigido pelo engenheiro", e é recusado depois da medição.
- **E-mail de cancelamento:** lista exatamente as peças daquele movimento. A mesma peça em semanas anteriores não soma mais.
- **Troca de empresa da pessoa, ou de tipo da empresa, com desconto em aberto:** recusada.
- **Almoxarife:** vê só o encerramento de hoje.
- **Encerramento automático:** acerta o dia mesmo com atraso; uma obra com erro não desfaz as outras.
- **Segurança:**
  - endereço de notificação só de serviços de push conhecidos (SSRF);
  - processador de envios só com segredo longo;
  - "Sair" desliga a notificação do aparelho;
  - o clique na notificação só abre o próprio app.
- **E-mail como o protótipo:** nomes completos na saudação, itens com ×n e frase de lembrete.
- **Teste do QR do adesivo com mais tempo:** era a falha intermitente dos unitários, por causa da importação lenta do zxing com a máquina ocupada.
- **Testes:**
  - 346 de banco (+82 no M9), 184 unitários e 73 e2e;
  - inclui os critérios: 2 empreiteiras geram 2 avisos com o total certo e e-mail entregue ao dono e ao encarregado; funcionário próprio sem aviso; devolução antes da medição cancela e manda o e-mail.

## M8 — Painel da TV (concluído em 12/10/2026)

### Adicionado
- **Painel em loop (F-13)** na rota `/tv`:
  - páginas de cartões por pessoa, em ordem alfabética, depois as colunas por empresa rolando para a esquerda, e recomeça;
  - cabeçalho fino com marca, obra, título, "Pessoas 13–24 de 30", pontos de página e hora, mais a barra de progresso;
  - tema escuro do Design System, montado em 1920×1080 e escalado para qualquer TV.
- **Cartão:**
  - nome, função e empresa (cor e nome);
  - ferramentas com ícone e nome, agrupadas com ×N; quando passa de 3 tipos, "+N mais";
  - "Retirou às 07:05" ou faixa vermelha "Não devolvido · desde ontem 16:40", com borda vermelha.
- **Colunas por empresa:** uma subcoluna a mais sempre que alguém não cabe na altura (medida na tela). **Sem contagens na TV.**
- **Conectar a TV sem login:**
  - em Cadastros › Impressora, "Conectar uma TV" gera um código que vale 10 minutos e uma vez;
  - a TV troca o código por uma credencial própria, que só lê o painel e nunca a fila de impressão;
  - revogar o mini PC desliga TV e agente.
- **Atualização a cada 2 s:**
  - quando nada mudou, o servidor responde só a hora;
  - dados novos entram sem reiniciar a animação;
  - "Sem conexão desde HH:MM" mantendo o último estado, e a TV se recupera sozinha.
- **Cadastros › Painel da TV:** tempo por página (3–30 s), cartões por página (8, 12 ou 16), velocidade (15–150 px/s) e pausas, só o engenheiro, com log de alterações.
- **Para rodar dias seguidos:**
  - tela sem descanso (Wake Lock) e recarga diária às 04:00;
  - animação por `requestAnimationFrame` e `transform`;
  - pendência que vira à meia-noite sem lançamento novo.
- `scripts/soak-tv.mjs`: teste de resistência de memória.

### Revisão e comparação com o protótipo
- **Segurança:** o token do agente de impressão, que lê a fila com o QR dos capacetes, não abre mais o painel nem passa por URL.
- **Recuperação:** só "dispositivo não autorizado" (AL008) desliga a TV; falha de permissão ou de rede é passageira.
- **Sinal da TV separado do sinal do agente:** a impressora não parece mais online por causa da TV.
- **Igual ao protótipo:**
  - escala para 1920×1080;
  - colunas medidas;
  - borda vermelha forte;
  - nomes longos com hífen;
  - relógio na hora do servidor.
- **Seed:** retiradas "de hoje" nunca no futuro. Antes das 07:45 elas escondiam lançamentos novos.
- **e2e mais robustos:**
  - conferem pelas ferramentas criadas no próprio teste, não pela "última retirada da pessoa";
  - espera de 30 s para a câmera falsa ler o QR.
- **Testes:**
  - 40 pgTAP do painel (264 no total), 167 unitários e 71 e2e;
  - inclui os critérios: loop 12/12/6 → colunas → página 1 e retirada na TV em até 3 s;
  - soak de 12 min com dados mudando a cada 20 s: memória estável em 3,6–4,2 MB e listeners fixos.

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
