# Plano de correção dos 18 pontos da análise do Almox

Data: 13/10/2026  
Base da análise original: commit `f9b3819`  
Situação: planejamento; as correções deste documento ainda precisam ser confrontadas com a versão atual e executadas.

Este plano cobre os 18 pontos do relatório de análise, priorizando risco de cobrança incorreta, duplicação de operações e controle de acesso. A criação deste documento não implica execução das correções nem alteração do código ou do banco de dados.

Cada correção deve seguir esta sequência:

1. Reproduzir o problema.
2. Implementar a correção.
3. Executar os testes de aceite.
4. Verificar os fluxos relacionados.
5. Registrar a evidência da validação e eventuais limitações.

## Preparação — estabelecer a base de comparação

Antes de implementar:

- Conferir a versão atual e as alterações de segurança feitas em paralelo, evitando correções conflitantes.
- Registrar os resultados atuais dos testes.
- Preparar um banco isolado para testes de volume e concorrência.
- Usar novas migrations para mudanças no banco, preservando as migrations já aplicadas.
- Tratar o ponto 3 como hipótese a confirmar com transações concorrentes antes de escolher a solução.

## Etapa 1 — proteger lançamentos, estoque e valores

**Prioridade: máxima.**

O ponto 5 entra nesta etapa porque está diretamente ligado à confiabilidade da fila offline.

### Ponto 1 — consultas truncadas e totais incorretos

**Correção planejada**

- Calcular totais no banco.
- Paginar listagens e exportações, usando ordenação estável.
- Verificar se o conjunto de descontos mudou entre a apresentação e a confirmação da medição.
- Aplicar a revisão também às contagens e listas operacionais afetadas pelo limite de registros da API.

**Testes de aceite**

- Testar 999, 1.000, 1.001 e mais de 5.000 registros, distribuídos entre empresas.
- Comparar os valores da tela, da planilha e do banco.
- Validar ausência de omissões e duplicações entre páginas.
- Alterar descontos antes da confirmação e exigir atualização explícita quando necessário.

### Ponto 2 — duplicação offline por dois cliques

**Correção planejada**

- Bloquear imediatamente o acionamento repetido.
- Manter uma chave de operação durante a gravação e as novas tentativas.
- Tratar falhas do IndexedDB, permitindo recuperação e apresentando o erro ao usuário.

**Testes de aceite**

- Dois cliques rápidos devem gerar um item na fila e um movimento.
- Simular gravação lenta, falha local, reconexão e repetição da sincronização.
- Duas operações intencionalmente diferentes devem continuar gerando dois movimentos.

### Ponto 3 — concorrência entre fechamento e devolução

**Correção planejada**

- Reproduzir a disputa em banco isolado.
- Estabelecer bloqueios e verificações compatíveis entre fechamento, complemento, devolução e estorno.

**Testes de aceite**

- Usar duas conexões com execução coordenada, nas duas ordens possíveis.
- Testar fechamento normal e complemento.
- Uma devolução concluída antes da consolidação não pode deixar cobrança aberta por ferramenta não devolvida.
- Preservar as regras de medições já confirmadas.
- Verificar bloqueios prolongados e deadlocks.

### Ponto 5 — saldo offline diferente da regra do servidor

**Correção planejada**

- Ajustar a representação das posses para considerar a ordem de consumo e a origem manual/QR.
- Definir tratamento explícito para conflitos após sincronização.

**Testes de aceite**

- Testar retirada manual antiga com retirada por QR recente, e a ordem inversa.
- Testar devoluções parciais, várias operações na fila, empates de horário e operação anterior recusada.
- O saldo calculado deve coincidir com a regra do servidor para o mesmo conjunto de dados.

**Critério para encerrar a etapa:** nenhuma duplicação nos cenários reproduzidos, totais completos e consistência comprovada nos testes concorrentes.

## Etapa 2 — corrigir identificação, histórico e permissões

**Prioridade: alta.**

### Ponto 4 — pessoa inativa não consegue devolver por QR

**Correção planejada**

- Permitir identificação para devolução de ferramentas pendentes.
- Manter o bloqueio de novas retiradas.

**Testes de aceite**

- Inativar uma pessoa com retirada por QR e concluir a devolução.
- Confirmar que uma nova retirada continua proibida, inclusive por chamada direta à RPC.
- Testar também retirada manual e pessoa de outra obra.

### Ponto 7 — troca de empresa altera histórico e acesso

**Correção planejada**

- Preservar a empresa responsável no momento do movimento.
- Ajustar consultas e permissões.
- Definir a regra para transferência com ferramentas pendentes.
- Planejar o preenchimento dos registros antigos usando evidências disponíveis.

**Testes de aceite**

- Transferir uma pessoa da empresa A para a empresa B e verificar atribuição histórica, filtros, exportações e acesso dos usuários das duas empresas.
- Conferir a visão do engenheiro.
- Validar separadamente registros antigos cuja empresa original não possa ser determinada.

### Ponto 8 — homônimos e anonimização por nome

**Correção planejada**

- Incluir identificadores estáveis nos registros dos avisos.
- Usar os identificadores no agrupamento e na anonimização.
- Preparar tratamento dos avisos antigos.

**Testes de aceite**

- Criar duas pessoas com nomes iguais, inclusive na mesma empresa: elas devem permanecer separadas.
- Renomear uma delas e depois anonimizar: seus registros históricos devem ser alcançados, sem atingir o homônimo.
- Os valores dos avisos devem permanecer corretos.

### Ponto 9 — push após remoção do acesso

**Correção planejada**

- Revalidar o vínculo com obra e empresa antes do envio.
- Registrar o cancelamento de notificações sem autorização.

**Testes de aceite**

- Enfileirar uma notificação, remover o acesso e processar: nenhuma chamada ao provedor deve ocorrer.
- Repetir com troca de empresa e alteração de perfil.
- Confirmar que os acessos válidos em outras obras continuam funcionando.

**Cuidado na migração:** não atribuir automaticamente movimentos antigos à empresa atual quando não houver evidência de que ela era a responsável.

**Critério para encerrar a etapa:** permissões testadas no banco/API, além da interface, e histórico preservado nas mudanças de cadastro.

## Etapa 3 — tornar cadastros e impressão recuperáveis

**Prioridade: média, com impacto operacional.**

### Ponto 6 — cadastro de ferramenta parcialmente salvo

**Correção planejada**

- Preferir uma operação transacional para tipo, locadora e unidades.
- Garantir recuperação e idempotência nas tentativas repetidas.

**Testes de aceite**

- Forçar falha em cada passo: não pode restar cadastro parcial apresentado como concluído.
- Simular resposta perdida após sucesso e repetir: nenhuma unidade adicional deve ser criada.
- Testar locadora existente, nova e cadastro simultâneo.

### Ponto 11 — impressões duplicadas

**Correção planejada**

- Tornar o enfileiramento do lote idempotente.
- Persistir o estado necessário à recuperação do agente.
- Tratar impressão com resultado incerto sem reimpressão automática indiscriminada.

**Testes de aceite**

- Dois operadores solicitam o mesmo lote simultaneamente.
- Reiniciar o agente após envio à impressora e antes da confirmação ao servidor.
- Simular perda de resposta e retomada da fila.
- Reimpressões e cópias solicitadas intencionalmente devem continuar permitidas.

O aceite deve reconhecer a limitação da impressão física: quando não for possível saber se a etiqueta saiu, o sistema precisa apresentar essa incerteza e permitir conferência.

### Ponto 12 — confirmação A4 travada

**Correção planejada**

- Tratar rejeições da Server Action.
- Apresentar erro e permitir nova tentativa.
- Preservar o tratamento de sessão expirada.

**Testes de aceite**

- Simular falha de rede, erro do servidor e sessão expirada.
- O botão deve sair de “Marcando…”.
- Repetir após resposta perdida não pode produzir efeitos duplicados.

### Ponto 15 — prefixo já ocupado

**Correção planejada**

- Garantir que o gerador encontre um prefixo livre ou retorne erro específico.
- Tratar colisões concorrentes.
- Distinguir conflito de nome de conflito de prefixo.

**Testes de aceite**

- Reproduzir os 27 prefixos ocupados.
- Testar nomes semelhantes, acentos, candidatos de quatro letras e dois cadastros simultâneos.
- Nunca retornar um prefixo conhecido como ocupado.

**Critério para encerrar a etapa:** falhas intermediárias deixam o sistema recuperável, com mensagens corretas e sem repetição involuntária.

## Etapa 4 — corrigir a TV e reduzir consumo de recursos

**Prioridade: média; otimizações após a correção funcional.**

### Ponto 10 — correção de horário ignorada na TV

**Correção planejada**

- Inicializar e atualizar a diferença de horário independentemente de mudanças no conteúdo.

**Testes de aceite**

- Simular mini PC adiantado e atrasado, respostas com a mesma versão e virada do dia em São Paulo.
- Verificar horário, pendências, reconexão e renderização inicial.

### Ponto 13 — prévias de fotos retidas na memória

**Correção planejada**

- Controlar o ciclo de vida das URLs `blob:`.
- Liberar as URLs ao substituir, abandonar ou concluir o fluxo.
- Separar essa limpeza da exclusão de arquivos no Storage.

**Testes de aceite**

- Instrumentar criação e revogação das URLs.
- Repetir captura, troca, conclusão e abandono.
- As URLs devem ser liberadas sem apagar fotos vinculadas a devoluções concluídas.
- Complementar com observação de memória no navegador.

### Ponto 14 — log ilimitado no Windows

**Correção planejada**

- Remover a duplicação de logs ou aplicar rotação e retenção ao arquivo da saída do serviço.

**Testes de aceite**

- Gerar logs em pasta temporária, simular passagem dos dias e atingir o limite escolhido.
- Confirmar retenção, continuidade após reinício e comportamento do instalador no Windows.

### Ponto 16 — reconstrução completa do painel a cada consulta

**Correção planejada**

- Medir o custo atual.
- Adotar uma verificação barata de versão antes da reconstrução do painel, se confirmada a vantagem.

**Testes de aceite**

- Comparar consultas, tempo e consumo do banco antes/depois com dados representativos e várias TVs.
- Sem mudanças, evitar a agregação completa.
- Retirada, devolução, edição de pessoa, empresa, ícone e configuração devem atualizar o painel corretamente.

### Ponto 17 — centenas de chamadas no lote de adesivos

**Correção planejada**

- Consultar a impressora uma vez.
- Buscar e enfileirar dados em lote, aproveitando a proteção contra duplicação do ponto 11.

**Testes de aceite**

- Testar lotes de 0, 1 e 100 pessoas.
- Contabilizar chamadas ao banco e comparar duração.
- Simular falha parcial e retomada.
- Preservar pessoas selecionadas, conteúdo, quantidade de cópias e ausência de duplicações.

**Dependências:** corrigir o horário antes de otimizar a TV e resolver a duplicação antes de acelerar a impressão em lote.

**Critério para encerrar a etapa:** correção funcional preservada e ganhos de desempenho medidos, sem estabelecer percentuais arbitrários antecipadamente.

## Etapa 5 — limpeza e manutenção

**Prioridade: baixa.**

### Ponto 18 — código sem uso, comentários imprecisos e organização

A limpeza deve ocorrer depois das correções, quando os testes já protegerem os comportamentos importantes.

**Correção planejada**

- Confirmar novamente a ausência de consumidores de `BotaoNovo` e removê-lo se continuar sem uso.
- Atualizar comentários que prometem garantias inexistentes.
- Separar responsabilidades do fluxo offline quando isso facilitar manutenção e testes.
- Centralizar apenas validações realmente equivalentes.
- Preservar migrations históricas e arquivos gerados necessários.

**Testes de aceite**

- Executar lint, checagem de tipos e testes existentes.
- Executar regressão dos fluxos offline.
- Preservar o comportamento funcional obtido nas etapas anteriores.

## Validação final do conjunto

Antes de considerar o plano concluído:

- Executar formatação, lint, geração de tipos, checagem de tipos e build.
- Executar testes unitários, de componentes, banco, permissões e concorrência.
- Executar os fluxos completos de retirada, devolução, avaria, fechamento, medição, transferência de empresa, sincronização offline e impressão.
- Validar as migrations tanto em uma instalação nova quanto na atualização de uma base existente.
- Fazer conferência física da impressão e uma sessão prolongada da TV e do fluxo de fotos.
- Registrar, para cada um dos 18 pontos, a correção aplicada, o teste que a comprova e qualquer limitação restante.

A execução deve avançar uma etapa por vez, com correções pequenas e revisáveis. Os três problemas de prioridade máxima devem ser resolvidos antes das otimizações e da limpeza.
