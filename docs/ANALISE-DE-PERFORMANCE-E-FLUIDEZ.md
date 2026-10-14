# Almox — Análise de performance e fluidez

Data: 13/10/2026  
Prioridade definida pelo usuário: uso diário no celular — telas, QR e lançamentos.  
Escopo: análise e recomendações. Nenhuma correção de código foi implementada nesta revisão.

## Avaliação geral

Há oportunidades concretas para deixar o Almox mais fluido, principalmente reduzindo consultas desnecessárias, trabalho repetido no celular e espera por informações secundárias.

A análise combinou leitura do código com testes isolados em memória. Esses testes demonstram comportamentos da implementação, mas não medem a experiência real no celular da obra. Tempos obtidos no Node local não devem ser interpretados como tempos de carregamento, resposta ou leitura de QR em produção.

As prioridades abaixo consideram a frequência do uso no celular, o impacto potencial e a evidência disponível. Não representam uma estimativa de ganho percentual. Os achados de TV e impressão aparecem depois dos fluxos de uso diário.

## 1. Alta — A ficha da pessoa espera informações secundárias para aparecer

### Comportamento encontrado

A ficha carrega a pessoa e a identificação e, depois, consulta a equipe da empresa. Só então entrega a tela. Assim, a lista de colegas fica no caminho entre confirmar o capacete e acessar retirada ou devolução.

### Melhoria recomendada

Mostrar a ficha assim que os dados essenciais estiverem prontos e carregar a equipe separadamente. As verificações de identificação e autorização continuam fazendo parte dos dados essenciais.

### Validação

- Simular lentidão na consulta da equipe.
- Verificar se a ficha e suas ações ficam disponíveis antes da equipe.
- Conferir os estados de identificação válida, vencida e acesso restrito.

Referência: [ficha da pessoa](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/pessoa/[id]/page.tsx:45>).

## 2. Alta — A lista consulta todas as abas, mesmo quando apenas uma está aberta

### Comportamento encontrado

Ao abrir “Agora”, a página também busca manutenção, histórico de avarias associado às peças e URLs assinadas das fotos. Esses dados participam da espera inicial, embora aquela aba não exiba as fotos. A consulta de manutenção carrega as avarias e seleciona a mais recente na aplicação.

### Melhoria recomendada

Buscar os detalhes apenas da aba ativa e obter os números das outras abas por consultas resumidas. A consulta de manutenção pode trazer somente a avaria mais recente de cada peça.

### Validação

- Conferir as requisições ao abrir cada aba.
- Garantir que a aba “Agora” não dependa da preparação das fotos de avarias.
- Comparar os contadores antes e depois, inclusive para usuários com acesso restrito.
- Confirmar que a avaria apresentada é a mais recente.

Referências: [carregamento da lista](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/lista/page.tsx:34>) e [consulta de manutenção](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dados/lancamento.ts:119>).

## 3. Alta — A tela inicial busca detalhes que não utiliza

### Comportamento encontrado

Para montar os indicadores, `resumoDoDia` busca registros individuais de posse com nomes de pessoas, ferramentas e códigos. Também prepara detalhes de pendências que a tela inicial descarta.

### Melhoria recomendada

Usar uma consulta de agregação que devolva diretamente os totais necessários. Isso reduz transferência entre banco e aplicação, processamento e exposição ao limite de linhas das consultas.

### Validação

- Comparar os totais atuais com os agregados usando uma base controlada.
- Incluir obras grandes, pessoas com várias peças e pendências de dias anteriores.
- Verificar usuários com acesso restrito a uma empresa.
- Conferir os resultados na mudança do dia da obra.

Referência: [resumo da tela inicial](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dados/inicio.ts:35>).

## 4. Alta — O estoque monta os detalhes de todos os grupos fechados

### Comportamento encontrado

O atributo `hidden` esconde o conteúdo, mas o React continua criando as linhas e calculando os textos de data. Abrir ou fechar um grupo também faz o componente percorrer novamente todos os tipos.

No teste isolado, com 100 tipos e 5.000 linhas de detalhes, todos fechados, foram executadas 5.000 chamadas de formatação e gerado HTML contendo essas linhas.

Também há arrays de blocos sendo criados para estoques que usam a barra proporcional e não aproveitam esses arrays.

### Melhoria recomendada

Montar os detalhes somente quando necessários e criar os arrays de blocos apenas para o modo de exibição que os utiliza. Se o volume justificar, carregar os detalhes do tipo sob demanda.

### Validação

- Medir abertura da tela e expansão de grupos com estoque grande.
- Verificar que apenas os detalhes necessários são montados.
- Confirmar que barras, quantidades, pendências e manutenção continuam corretas.
- Preservar a acessibilidade dos controles de expansão.

Referência: [TiposEstoque](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/estoque/TiposEstoque.tsx:33>).

## 5. Alta — As buscas repetem processamento a cada letra digitada

### Comportamento encontrado

A busca dos cadastros junta textos, remove acentos, filtra e ordena os resultados novamente a cada tecla. Na lista operacional, a digitação também refaz agrupamentos por empresa, ordenações e cálculos de pendência.

Em um cenário sintético com 1.000 pessoas, 150 tipos e 30.000 códigos de peças, uma busca executou 1.151 normalizações e percorreu aproximadamente 294 mil caracteres. Isso ocorreu antes da renderização dos resultados.

### Melhoria recomendada

Preparar os textos normalizados e os agrupamentos estáveis quando os dados mudarem. Manter a digitação independente da atualização da lista, usando atualização adiada dos resultados quando apropriado.

### Validação

- Digitar rapidamente em um celular mais simples, com muitos registros.
- Medir o atraso entre a tecla e sua exibição.
- Preservar a busca por nome, apelido e código, com e sem acentos.
- Confirmar a atualização dos resultados quando os dados mudarem.

Referências: [busca dos cadastros](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dominio/busca-cadastros.ts:37>) e [agrupamento da lista](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dominio/lista.ts:49>).

## 6. Alta em obras maiores — Listas extensas montam todos os resultados de uma vez

### Comportamento encontrado

A escolha manual de pessoas renderiza todos os encontrados. A lista operacional também monta todos os grupos e pessoas correspondentes. Mesmo com uma consulta rápida, uma grande quantidade de elementos pode aumentar o custo da renderização e da rolagem.

### Melhoria recomendada

Adotar carregamento progressivo, paginação ou renderização apenas da parte visível, conforme a tela. A busca precisa continuar alcançando todos os registros, inclusive aqueles que ainda não foram montados na interface.

### Validação

- Testar abertura, digitação e rolagem com centenas ou milhares de pessoas.
- Verificar navegação por teclado e tecnologias assistivas.
- Preservar o retorno à posição anterior ao voltar da ficha.
- Garantir que a busca não fique limitada à página carregada.

Referência: [lista de escolha manual](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/pessoas/BuscaPessoas.tsx:29>).

## 7. Alta — A atualização em tempo real pode esperar indefinidamente durante atividade contínua

### Comportamento encontrado

Cada evento cancela a atualização agendada e reinicia uma espera de 400 ms. Se os eventos continuarem chegando antes desse intervalo, a atualização fica sendo adiada.

No teste com relógio simulado, 100 eventos, separados por 100 ms, produziram zero atualizações durante os primeiros 10 segundos. A atualização aconteceu somente 400 ms depois do último evento.

Além disso, a atualização usa `router.refresh()`, refazendo as consultas da página. Isso não recarrega o navegador inteiro, mas pode repetir trabalho considerável.

### Melhoria recomendada

Estabelecer um prazo máximo para atualizar, agrupar eventos e reduzir o alcance das consultas refeitas. Coordenar atualizações em andamento e considerar a visibilidade da aba.

### Validação

- Simular rajadas e fluxo contínuo de eventos.
- Garantir atualização dentro de um prazo definido.
- Verificar a quantidade de consultas e evitar sobreposição desnecessária.
- Conferir a atualização ao retornar para uma aba que estava em segundo plano.

Referência: [AoVivo](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/components/AoVivo.tsx:31>).

## 8. Alta — Internet ruim pode atrasar a entrada no modo offline

### Comportamento encontrado

Na navegação para `/campo`, o service worker tenta a rede e só consulta a cópia local quando a requisição falha. Não existe um prazo definido pela aplicação para abandonar essa espera.

Na simulação, enquanto a requisição permaneceu pendente, o cache não foi consultado, apesar de existir uma resposta local disponível.

### Melhoria recomendada

Estabelecer uma espera limitada para essa navegação e usar a versão local quando necessário, preservando as verificações de sessão e a compatibilidade dos arquivos.

### Validação

- Testar sinal instável e conexão que permanece aberta sem responder.
- Testar modo avião com a preparação offline concluída.
- Testar ausência de cache, troca de versão e sessão inválida.
- Medir o tempo até a tela de campo ficar utilizável.

Referência: [navegação offline](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/public/sw.js:106>).

## 9. Prioridade de medição no celular — O leitor de QR disputa processamento com a interface

### Comportamento encontrado

O leitor já tem boas proteções: intervalo entre tentativas, limite de largura, reutilização do canvas e encerramento da câmera. Porém, a leitura dos pixels e a decodificação acontecem na mesma linha de execução da interface.

O limite de 720 pixels é aplicado somente à largura. Uma imagem vertical pode ter muito mais pixels para analisar.

Em testes sintéticos locais, a decodificação teve mediana de aproximadamente 16,5 ms em 720 × 405 e 31,1 ms em 720 × 1280. Os testes usaram o `jsQR` com imagens geradas em memória, sem incluir câmera e canvas. Esses tempos não representam o celular.

### Melhoria recomendada

Medir primeiro no aparelho real. As opções incluem analisar uma região menor, adaptar a resolução ou mover a decodificação para um worker. A escolha precisa preservar a taxa de leitura dos adesivos e o funcionamento offline.

### Validação

- Medir fluidez e tempo de leitura no aparelho utilizado na obra.
- Testar pouca luz, diferentes distâncias e etiquetas desgastadas.
- Comparar a taxa de sucesso antes e depois.
- Verificar câmera, lanterna, encerramento da captura e uso offline.

Referência: [LeitorQr](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/components/LeitorQr.tsx:77>).

## 10. Média — A sincronização offline pode provocar muitas releituras locais

### Comportamento encontrado

A leitura dos dados usa `getAll()` e depois filtra o resultado. Cada item removido da fila emite uma notificação; a tela de campo responde relendo os dados e a fila. Durante um envio grande, isso pode repetir cópias e processamento do mesmo conteúdo.

### Melhoria recomendada

Separar alterações da fila de alterações do cadastro, agrupar notificações e usar consultas locais direcionadas quando a obra for conhecida.

A ordem e a idempotência dos lançamentos precisam ser preservadas. Paralelizar indiscriminadamente retiradas e devoluções não é uma correção adequada para esse problema.

### Validação

- Sincronizar filas grandes, com mais de uma aba aberta.
- Contar transações e releituras no banco local.
- Verificar responsividade durante o envio.
- Confirmar ordem, ausência de duplicidade e tratamento de itens recusados.

Referências: [banco local](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/offline/banco.ts:65>) e [releitura no campo](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/campo/FluxoCampo.tsx:68>).

## 11. Média — A preparação offline pode competir com a abertura do aplicativo

### Comportamento encontrado

Na montagem, o sincronizador inicia envio da fila, download dos dados offline e preparação da página de campo. Ao recuperar a conexão, o download periódico também pode coincidir com a atualização feita ao terminar o envio da fila.

### Melhoria recomendada

Coordenar essas tarefas e evitar downloads simultâneos equivalentes. A preparação offline deve continuar acontecendo cedo, com um estado confiável de “pronto para usar sem internet”.

### Validação

- Medir a primeira abertura em conexão limitada.
- Comparar uso de rede durante a abertura e após a reconexão.
- Testar duas abas abertas para a mesma obra.
- Confirmar que a preparação offline continua completa.

Referência: [Sincronizador](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/components/Sincronizador.tsx:21>).

## 12. Média — Fotos pequenas na tela usam a imagem completa

### Comportamento encontrado

As fotos já são comprimidas antes do envio, o que é positivo. Contudo, nas listas, miniaturas pequenas utilizam a imagem completa e não têm carregamento tardio explícito.

### Melhoria recomendada

Usar miniaturas apropriadas e carregar imagens fora da área visível quando necessário. A imagem completa continua disponível na visualização detalhada, mantendo o acesso privado.

### Validação

- Comparar bytes transferidos numa lista com muitas avarias.
- Medir fluidez da rolagem e tempo para as primeiras fotos aparecerem.
- Conferir orientação, proporção e qualidade das miniaturas.
- Preservar as regras de acesso e o tratamento de fotos indisponíveis.

Referências: [fotos na lista](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/lista/ListaAvarias.tsx:41>) e [manutenção](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/manutencao/page.tsx:54>).

## 13. Média, com ganho perceptível — Algumas esperas precisam de feedback mais claro

### Comportamento encontrado

Ao preparar uma foto de avaria, a tela aguarda a compressão sem um estado específico de “Preparando foto…”. Na confirmação da pessoa, o botão fica desabilitado, mas mantém o mesmo texto enquanto aguarda.

Também há telas importantes que dependem do “Carregando…” geral, porque os componentes da página só aparecem depois das consultas.

Retirada e devolução já apresentam “Registrando…”, um comportamento que pode servir de referência.

### Melhoria recomendada

Mostrar imediatamente o andamento de cada operação e manter a estrutura da tela visível durante carregamentos. A confirmação de sucesso de um lançamento deve continuar dependendo da confirmação do servidor.

### Validação

- Introduzir atrasos controlados nas operações.
- Verificar se o usuário entende o que está acontecendo sem precisar tocar novamente.
- Conferir estados de erro e possibilidade de tentar novamente.
- Garantir feedback acessível e ausência de confirmação prematura de sucesso.

Referências: [preparação da foto](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/pessoa/[id]/devolucao/FotoAvaria.tsx:48>) e [carregamento geral](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/layout.tsx:27>).

## 14. Média — Cadastros carregam conjuntos grandes para tarefas pequenas

### Comportamento encontrado

A entrada nas listas de cadastro prepara uma busca global consultando pessoas, ferramentas e empresas. Para ferramentas, o índice inclui todos os códigos das unidades.

Há também um caso direto: `buscarTipo(id)` carrega todos os tipos e suas unidades para encontrar apenas um. A página de edição ainda solicita a listagem geral.

### Melhoria recomendada

Criar consultas menores para cada finalidade, buscar o tipo diretamente pelo ID e reaproveitar resultados dentro da mesma requisição.

A deduplicação de rede pelo framework deve ser medida; ela não elimina automaticamente todo o processamento duplicado. O reaproveitamento de dados deve respeitar obra, usuário e permissões.

### Validação

- Comparar consultas, volume de dados e tempo de abertura dos cadastros.
- Verificar edição de um tipo em obras com muitas ferramentas e unidades.
- Preservar a busca por código de peça.
- Confirmar isolamento entre obras e perfis de acesso.

Referências: [índice global](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dados/busca-cadastros.ts:17>) e [buscarTipo](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dados/ferramentas.ts:48>).

## 15. Média — A impressão repete consultas em dois pontos

### Comportamento encontrado

Enquanto uma impressão está pendente, o cadastro da pessoa atualiza os dados da página a cada três segundos. Isso pode repetir consultas de pessoas, empresas e adesivo apenas para acompanhar o status.

No lote térmico, cada pessoa passa por três chamadas sequenciais: buscar impressora, buscar dados do adesivo e enfileirar. Um lote de 100 pessoas pode chegar a 300 chamadas, além da preparação inicial.

### Melhoria recomendada

Consultar somente o status durante o acompanhamento e preparar ou enfileirar o lote com operações agrupadas, preservando o controle de duplicidade.

### Validação

- Contar chamadas e medir lotes de 1, 10 e 100 pessoas.
- Verificar falhas parciais e tentativas repetidas.
- Confirmar que o acompanhamento do status não refaz consultas desnecessárias do formulário.
- Preservar a ordem de impressão e a prevenção de duplicidades.

Referências: [acompanhamento da impressão](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/(app)/cadastros/pessoa/[id]/page.tsx:28>) e [enfileiramento](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dados/adesivo.ts:64>).

## 16. Média — A TV reconstrói os dados no banco mesmo quando nada mudou

### Comportamento encontrado

O painel consulta periodicamente a versão. Entretanto, a função SQL monta o JSON completo e calcula seu hash antes de descobrir que pode responder “sem alteração”.

Este ponto aprofunda um achado da análise anterior.

### Melhoria recomendada

Ter uma revisão barata de consultar e reconstruir o conteúdo quando dados relevantes mudarem. A revisão precisa contemplar todos os dados que alteram o painel.

### Validação

- Medir tempo de banco e leituras com uma ou várias TVs.
- Dar atenção a períodos sem movimentação.
- Verificar atualização após mudanças de posses, nomes, empresas e configuração.
- Preservar autorização do dispositivo e atualização de seu sinal de atividade.

Referência: [função do painel](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/supabase/migrations/20261012020000_revisao_m8.sql:94>).

## 17. Média — A TV repete cálculos e tem um agrupamento que cresce de forma quadrática

### Comportamento encontrado

Para cada pessoa, `montarColunas` procura seu cartão percorrendo o array. Também copia o grupo existente a cada inclusão. Esses cálculos são refeitos em renderizações causadas pela troca de fase, mesmo sem alteração dos dados.

No teste, 1.000 pessoas produziram 500.500 comparações; 5.000 produziram 12.502.500. O segundo cenário é um teste de crescimento, não uma afirmação sobre o volume atual da obra.

### Melhoria recomendada

Indexar os cartões por ID e reaproveitar os resultados enquanto os dados relevantes não mudarem.

### Validação

- Comparar o processamento em diferentes volumes de pessoas.
- Manter exatamente a mesma ordenação e distribuição por empresa.
- Verificar a virada de pendências no dia da obra.
- Confirmar que novas informações não reiniciam indevidamente o ciclo de animação.

Referências: [agrupamento](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/dominio/tv.ts:168>) e [renderização do painel](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/tv/PainelTv.tsx:44>).

## 18. Média, dependente de medição — A animação da TV pode fazer trabalho de layout desnecessário

### Comportamento encontrado

Durante a rolagem, o código lê dimensões a cada quadro e altera a largura da barra de progresso. Essa combinação merece investigação por poder exigir trabalho repetido de layout.

Não foi medido travamento causado por isso no navegador. Trata-se de um candidato para perfilamento.

### Melhoria recomendada

Atualizar as dimensões quando elas mudarem e avaliar a animação do progresso por transformação.

### Validação

- Medir duração dos quadros e trabalho de layout no dispositivo da TV.
- Incluir mudanças de conteúdo durante a animação.
- Conferir o ponto final da rolagem, a barra de progresso e as transições.
- Verificar comportamento após alterações nas dimensões da tela.

Referência: [motor da animação](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/app/tv/useLoopTv.ts:59>).

## Medições necessárias para orientar as correções

Falta uma medição contínua dos tempos importantes para o uso diário. O monitoramento atual registra erros, com rastreamento de desempenho desativado. O teste prolongado da TV verifica crescimento de memória e elementos, mas não estabelece a fluidez das interações no celular.

Medir separadamente:

| Fluxo | Início da medição | Fim da medição |
| --- | --- | --- |
| Navegação | Toque na navegação | Conteúdo principal utilizável |
| Reconhecimento do QR | QR reconhecido | Pessoa apresentada |
| Confirmação da pessoa | Toque na confirmação | Ficha utilizável |
| Lançamento | Toque para concluir | Confirmação do servidor exibida |
| Busca | Digitação | Resultados atualizados |
| Rede degradada | Queda ou degradação detectável | Modo offline utilizável |

Comparar os resultados usando o mesmo aparelho, volumes de dados equivalentes e condições de rede controladas. Registrar a primeira abertura e os acessos seguintes separadamente. A coleta de desempenho deve evitar tokens de QR e dados pessoais.

Referências: [opções de monitoramento](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/lib/monitoramento/opcoes.ts:14>) e [teste prolongado da TV](<C:/Users/Luiz Felipe/Desktop/Claude/10 ALMOX/scripts/soak-tv.mjs>).

## Ordem inicial recomendada

1. Ficha da pessoa: retirar a equipe do caminho de carregamento principal.
2. Lista: carregar os detalhes da aba ativa e separar os contadores.
3. Início: devolver indicadores agregados, com as mesmas regras de acesso.
4. Estoque: evitar a montagem dos detalhes fechados.
5. Buscas e listas: reduzir processamento por tecla e quantidade de elementos montados.
6. Rede ruim e atualização em tempo real: limitar esperas e garantir atualização durante atividade contínua.

O leitor de QR deve entrar cedo na medição com o celular real. Os resultados dessa medição determinam qual otimização do leitor vale implementar primeiro.

Há trabalho suficiente nesses caminhos para buscar ganhos concretos antes de considerar troca de tecnologia ou infraestrutura.

## Cuidados existentes que devem ser preservados

- Consultas independentes executadas em paralelo.
- Sessão reaproveitada dentro da mesma requisição.
- Fotos comprimidas antes do envio.
- Frequência e resolução da leitura de QR limitadas.
- Encerramento da câmera quando a leitura termina ou a tela é desmontada.
- Lançamentos transacionais e proteção contra duplicidade.
- Notificações processadas depois da resposta.
- Preparação e funcionamento do modo offline.
- Regras de acesso por usuário, obra e empresa.

As otimizações precisam manter essas garantias. O objetivo é reduzir trabalho e espera sem comprometer a correção dos lançamentos ou a disponibilidade no campo.
