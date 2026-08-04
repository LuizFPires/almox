# ALMOX — PRD

> App para controle de fluxo de entrega / devolução de ferramentas de almoxarifado em uma obra

## Visão
Hoje o controle de entrega e devolução de ferramentas entre o almoxarifado e os trabalhadores no campo é feito de forma manual, controle em caderno, muitas vezes com um madeirite pregado no fundo da sala com uma lista das pessoas e quais ferramentas estão dispostas com elas naquele momento. E isso é um processo muito lento e que costuma falhar muito, principalmente no controle das devoluções e de quem pegou o que. Então ao final da obra, invariavelmente, existe muita perda de ferramentas, pela perda do controle no dia a dia. Fica difícil cobrar de determinado funcionário a devolução de uma ferramenta, se não temos absoluta certeza que está com ele.

**Problema.** Aumento do controle do fluxo de entregas e devoluções de ferramentas entre o almoxarifado e os trabalhadores da construção civil com registro just in time de cada evento desse de entrega e devolução. App precisa registrar os eventos principalmente com fotos das ferramentas sendo retiradas e foto das ferramentas sendo devolvidas e todos os eventos com assinatura (escrita simples na tela).

**Visão de longo prazo.** Ser o app presente em todo almoxarifado de obra para garantia de controle.

## Usuários
**Personas**
- Almoxarifado (funcionários de baixíssima qualificação técnica)
- Engenheiro da obra (relatórios diários dos fluxos de entrega e devoluções de ferramentas)

**Jobs-to-be-done**
- - Saber onde cada ferramenta da obra está e com quem está;
- - Ter documento para cobrar uma perda ou extravio de um ferramenta que sumiu;
- - Monitorar o dia de obra desse tópico

**Casos de uso**
- - Pedreiro João da empreiteira XYZ precisa pegar um carrinho de mão e uma extensão elétrica no almoxarifado para iniciar o seu dia de trabalho;
- - Ele vai até o almoxarifado e solicita ao almoxarife Joaquim essas ferramentas de trabalho;
- - Joaquim verifica no almoxarifado se tem essas ferramentas solicitadas e constata que tem 3 carrinhos de mão e 2 extensões elétricas
- - Joaquim entrega um carrinho de mão e uma extensão elétrica para João
- - João precisa assinar que recebeu as ferramentas (controle manual)
- - Joaquim dá baixa no sistema que agora ele tem disponível 2 carrinhos de mão e 1 extensão elétrica disponível no almoxarifado. E registra que essas ferramentas estão em posse do João da empreiteira XYZ
- - No final do dia o João deve retornar com as ferramentas para o almoxarifado
- - Joaquim verifica se está tudo em conformidade, se não tem nenhuma avaria ou outro problema. Se sim, recebe as ferramentas e retira a posse dessas ferramentas que estavam em nome do João da empreiteira XYZ e o Joaquim volta a registrar manualmente em seu controle que constam agora 3 carrinhos de mão e 2 extensões elétricas no almoxarifado
- Todo esse processo é feito de forma manual.

## Funcionalidades (MoSCoW)
### Must
- Cadastrar ferramentas
- Cadastrar funcionários
- Controle de fluxo de entrega e devoluções
### Should
_(nenhum)_
### Could
_(nenhum)_
### Won't (agora)
- Integração com WhatsApp (consulta/relatório via mensagem) → **Fase 2**. No MVP, o engenheiro consulta por tela web de relatório.

## Fluxos principais
- - Pedreiro João da empreiteira XYZ precisa pegar um carrinho de mão e uma extensão elétrica no almoxarifado para iniciar o seu dia de trabalho;
- - Ele vai até o almoxarifado e solicita ao almoxarife Joaquim essas ferramentas de trabalho;
- - Joaquim consulta pelo ALMOX se tem essas ferramentas solicitadas e constata que tem 3 carrinhos de mão e 2 extensões elétricas
- - Joaquim indica no ALMOX que está passando um carrinho de mão e uma extensão elétrica para João, às 07:25h da manhã do dia 01/08/2026. Registra foto das ferramentas sendo entregues e registra a foto do João recebendo as ferramentas
- - Joaquim entrega um carrinho de mão e uma extensão elétrica para João
- - João assina na tela do ALMOX o resumo do recebimento, com as fotos e etc. Report básico e simples ali na tela.
- - Joaquim automaticamente vê pelo ALMOX que agora ele tem disponível 2 carrinhos de mão e 1 extensão elétrica disponível no almoxarifado. E sabe automaticamente pelo ALMOX que essas ferramentas estão em posse do João da empreiteira XYZ
- - No final do dia o João deve retornar com as ferramentas para o almoxarifado
- - Joaquim verifica se está tudo em conformidade, se não tem nenhuma avaria ou outro problema. Se sim, recebe as ferramentas e retira a posse dessas ferramentas no ALMOX que estavam registados em nome do João da empreiteira XYZ e o ALMOXdo Joaquim volta a constar que tem 3 carrinhos de mão e 2 extensões elétricas no almoxarifado
- - Se o engenheiro quiser saber onde estão as ferramentas da obra, ele consulta a **tela web de relatório** do ALMOX (posse por trabalhador, saldo por ferramenta, avarias/perdas). _Consulta/resposta via WhatsApp fica para a Fase 2._

## Non-goals
- **Não controla material de consumo** (cimento, prego, argamassa etc.) — apenas **ferramentas retornáveis**. Item que sai e não volta está fora do escopo.
- **Não é sistema de compras, patrimônio contábil ou financeiro** — não trata NF, depreciação, custo ou fornecedores.
- **Não gerencia manutenção/ordem de serviço** — a unidade só é marcada como `EM_MANUTENCAO`; o fluxo de reparo em si fica fora.
- **Sem app/login para o trabalhador** — ele apenas assina na tela do almoxarife (ver Premissas).
- **Sem integração WhatsApp no MVP** → Fase 2.
- **Sem funcionamento offline no MVP** → Fase 2.
- **Sem multi-idioma** — apenas Português (Brasil).

## Métricas de sucesso
**KPIs**
- Quando a quantidade de ferramentas no começo da obra for a mesma do término da obra. Sem extravios porque os trabalhadores sabem que estão monitorados de forma eficiente.

**Critérios de aceite**
- 1. Logar
- 2. Cadastrar as ferramentas da obra com suas quantidades
- 3. Cadastrar o trabalhador que vai pegar a ferramenta para o dia de trabalho
- 4. Registrar o evento de entrega de ferramenta
- 5. Verificar instantaneamente o saldo de cada ferramenta no almoxarifado x saldo de ferramentas em uso no campo
- 6. Registrar o evento de devolução da ferramenta
- 7. Verificar instantaneamente o saldo de cada ferramenta no almoxarifado x saldo de ferramentas em uso no campo

## Riscos & questões abertas
**Premissas**
- **Device único do almoxarife:** o almoxarife opera de um device com login; o trabalhador **não tem conta**, apenas assina na tela desse device.
- **Só online no MVP:** assume-se conexão razoável (Wi-Fi/4G) no almoxarifado; offline é Fase 2.
- **Rastreio por unidade individual:** cada ferramenta física é uma peça com identidade e estado próprios; o **saldo é derivado** (contagem por estado), nunca editado à mão.
- **Multi-obra desde o início:** dados isolados por obra via RLS; um almoxarife só vê a(s) obra(s) a que tem acesso.
- **Devolução parcial suportada:** cada unidade tem ciclo próprio, então é possível devolver 1 de 2 ferramentas e manter a outra em posse.
- **Uma assinatura por evento:** um único ato de entrega/devolução (com uma assinatura) pode cobrir várias unidades.

**Incógnitas**
- **Identificação física da unidade:** como etiquetar cada peça? (código sequencial impresso, QR/etiqueta, ou só número manual) — impacta a agilidade do cadastro e da entrega.
- **Regra de "PERDIDA":** a passagem para `PERDIDA` é manual (o almoxarife declara) ou automática após N dias sem devolução? Definir N.
- **Foto na devolução:** exigir foto sempre, ou só quando há avaria? (afeta a velocidade do fluxo de fim de dia)
- **Cadastro do inventário inicial:** quem cadastra e com que volume de ferramentas na largada da obra? Precisa de importação em massa ou cadastro 1 a 1 basta?
- **Prazo de retenção LGPD** de fotos/assinaturas após o fim da obra (definir valor concreto).
- **Papel do engenheiro:** ele tem login (`papel = engenheiro`) só para ler relatórios? Confirmar a UX de acesso.
