# Política de dados do Almox (LGPD)

> **Rascunho para validação do jurídico.** Os prazos abaixo já estão implementados no sistema
> e podem ser ajustados sem mudar o código (tabela `privado.retencao`).

## 1. Quem é quem

- **Controladora:** a construtora que usa o Almox na obra.
- **Titulares:** os trabalhadores identificados pelo capacete (próprios e de empreiteiras) e os
  usuários que fazem login: engenheiro, almoxarife e consulta (encarregado, dono de empreiteira).
- **Operadores:** os fornecedores de infraestrutura:
  - Supabase (banco e arquivos, região São Paulo);
  - Vercel (aplicação);
  - Resend (e-mail);
  - Sentry (registro de erros, sem dado pessoal).

## 2. Que dados o Almox trata e para quê

| Dado | Para quê | Onde aparece |
|---|---|---|
| Nome completo, apelido do capacete, função, empresa, matrícula interna | Saber quem está com cada ferramenta | App e TV do almoxarifado (na TV, só nome e ferramenta) |
| Código aleatório do QR do capacete | Identificar o capacete na leitura. Não contém nenhum dado pessoal | Adesivo do capacete; nunca sai do servidor (o celular guarda só uma impressão irreversível) |
| Retiradas, devoluções, estornos e ocorrências ("não é ele"), com data, hora e quem lançou | Controle do patrimônio e desconto de ferramenta não devolvida | Histórico do engenheiro |
| Foto da ferramenta avariada | Comprovar a avaria | Só para quem lança na obra |
| Nome e e-mail do dono e do encarregado da empreiteira | Enviar o aviso de ferramenta não devolvida | E-mail do aviso |
| E-mail e nome dos usuários do app | Login e avisos | Só o próprio usuário e o engenheiro |

**O Almox não trata:**

- biometria;
- foto de pessoas;
- CPF;
- localização;
- dados de saúde.

O QR do capacete leva só o código aleatório: não traz nome, CPF nem link com dados.

**Base legal sugerida (a confirmar pelo jurídico):**

- **Execução do contrato** (de trabalho e de empreitada) e **legítimo interesse** da construtora: guarda do patrimônio e cobrança de ferramenta não devolvida, prevista no contrato da empreiteira.
- **Exercício regular de direito**: defesa em disputa sobre a medição.

## 3. Por quanto tempo

| Dado | Prazo | O que acontece |
|---|---|---|
| Foto de avaria | **12 meses** depois do conserto ou da baixa da peça | A foto é apagada; o registro da avaria fica, marcado "foto apagada" |
| Fila de e-mails e notificações (tem endereços) | **12 meses** | Apagada |
| Conferências de capacete (registro técnico da leitura) | **12 meses** | Apagadas |
| Pessoas e contatos de empresas de obra encerrada | **5 anos após o fim da obra** | Pessoas **anonimizadas**: o nome vira "Pessoa anonimizada" e o QR deixa de valer. E-mails e nomes do dono e do encarregado são apagados, inclusive do registro de alterações |
| Pessoa inativa, em obra em andamento, sem lançamento | **5 anos** sem lançamento | Anonimizada |
| Retiradas, devoluções, avisos e descontos | Ficam (são imutáveis, RN-16) | Depois da anonimização, não identificam mais ninguém |

- **Quando roda:** a rotina roda todo dia 1º do mês, às 04:00. As fotos vencidas são apagadas na limpeza diária.
- **Exceção:** quem ainda está com ferramenta nunca é anonimizado (a devolução precisa de quem pegou).
- **Por que 5 anos:** é o prazo de prescrição trabalhista e de cobrança entre as empresas.
- **Por que 12 meses para as fotos:** cobre a medição e eventual contestação da empreiteira.

## 4. Segurança

- **Acesso por empresa:** cada login vê só a própria obra. A consulta de empreiteira vê só a própria empresa; essa regra está no banco (RLS), não só na tela.
- **TV do almoxarifado:** usa uma credencial só de leitura e não mostra valores, e-mails nem códigos de capacete.
- **Fotos:** em armazenamento privado, abertas por links que expiram em 10 minutos.
- **Celular sem internet:**
  - guarda pessoas e ferramentas da obra, com o código do capacete só em forma irreversível;
  - sair do app apaga esses dados e a fila do aparelho.
- **Registro de erros (Sentry):** sai sem usuário, cookies, e-mails nem códigos.
- **Agente de impressão:** os registros (logs) ficam 14 dias no mini PC da obra.
- **Movimentos:** não podem ser alterados nem apagados. Correção só por estorno com motivo, feito pelo engenheiro.

## 5. Direitos do titular

Pedidos de acesso, correção ou anonimização antecipada vão ao **encarregado de dados da construtora** (definir o contato).

- **Acesso:** o engenheiro gera a planilha do histórico da pessoa (Histórico › Pessoa › Baixar planilha).
- **Correção:** cadastro de pessoas.
- **Anonimização antes do prazo:** é feita pelo administrador do banco, se a pessoa não tiver ferramenta nem desconto em aberto (`privado.anonimizar_pessoa`).

## 6. Termo de responsabilidade (texto proposto)

> **Termo de responsabilidade pelo uso de ferramentas**
>
> Eu, ______________________________, função ______________________, da empresa
> ______________________________, declaro que:
>
> 1. Recebi o adesivo de identificação do meu capacete. Ele é pessoal e intransferível, e não
>    vou emprestá-lo nem usar o de outra pessoa.
> 2. Cada ferramenta que eu retirar do almoxarifado fica sob minha responsabilidade até eu
>    mesmo devolvê-la. A devolução só vale quando registrada no almoxarifado.
> 3. Ferramenta que voltar avariada será fotografada e registrada com o motivo.
> 4. Sei que, se eu for funcionário de empreiteira e uma ferramenta não for devolvida até o fim
>    do dia, a construtora avisa a minha empresa, e o valor de reposição pode ser descontado na
>    medição da empreiteira, conforme o contrato. O desconto é cancelado se a ferramenta voltar
>    antes do fechamento da medição.
> 5. Fui informado de que o Almox registra meu nome, apelido, função, empresa e as retiradas e
>    devoluções que eu fizer, para controle das ferramentas da obra. Esses dados são guardados
>    pelos prazos da política de dados da construtora (até 5 anos após o fim da obra, depois
>    anonimizados) e não incluem foto do meu rosto, biometria nem CPF.
>
> Local e data: ____________________  Assinatura: ______________________________

## 7. Pendências para o jurídico

1. Confirmar a base legal e os prazos (5 anos, 12 meses).
2. Definir o encarregado de dados (DPO) e o canal de pedidos.
3. Validar o termo, e se ele vai em papel (na entrega do adesivo) ou no contrato da empreiteira.
4. Incluir no contrato com as empreiteiras:
   - a cláusula de desconto;
   - o envio de e-mail ao dono e ao encarregado.
5. Avaliar se é preciso um aviso de privacidade afixado no almoxarifado (a TV mostra nomes).
