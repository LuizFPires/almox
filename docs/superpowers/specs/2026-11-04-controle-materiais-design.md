# Controle de materiais de consumo — design

**Data:** 04/11/2026 · **Milestone proposto:** M13 · Controle de materiais
**Protótipos aprovados:** [prototipo-materiais.html](prototipos-materiais/prototipo-materiais.html) (celular, clicável) e [tv-materiais.html](prototipos-materiais/tv-materiais.html) (TV)

## 1. Por que

Hoje o material de consumo (cimento, areia, brita, bloco, arame…) só entra na obra pela ordem de compra, e nada é anotado depois disso. Não se sabe quanto foi consumido nem quanto sobra no almoxarifado. Por isso o pedido de reposição sai tarde, quando o material já acabou.

O Almox já está no celular do almoxarife e na TV do almoxarifado. A ideia é usar o mesmo app para manter o **saldo atual de cada material**, como um extrato de débito e crédito, e **avisar todos da obra** quando um material chegar a um limite definido pelo gestor.

**O que mais importa ao dono:** o fluxo de entradas e saídas e o **saldo atual**. Não importa quem levou o material.

## 2. Objetivos

- Lançar **entradas** (chegou carga) e **saídas** (foi para a obra) em poucos toques.
- Permitir **dois jeitos de controlar o consumo**, que podem ser combinados:
  - **saídas parciais** ao longo do dia (−100, −20…);
  - **contagem** no fim do dia: conta o que sobrou e o sistema calcula a diferença.
- Mostrar **saldo atual** e **extrato** de cada material.
- **Aviso de limite por material**, configurado pelo engenheiro, por quantidade fixa ou por % do estoque cheio (saldo logo depois da última entrada), com notificação no celular para **todos da obra**.
- Mostrar os saldos **na TV**, com destaque evidente quando houver alerta.
- **Não mexer** no fluxo de ferramentas.

## 3. Fora do escopo (não fazer)

- Registrar **quem levou** o material, ler capacete ou ligar a saída a pessoa ou empresa.
- **Destino** da saída (torre, pavimento). Foi pedido e depois retirado pelo dono.
- **Ordem de compra**, nota fiscal ou fornecedor na entrada. Também retirado pelo dono.
- Cobrança de desperdício de empreiteira, valor em R$ do material, custo médio.
- Devolução de material ao estoque (material consumido não volta). Se voltar sobra, entra como **entrada**.
- Compra e pedido de reposição automáticos. O aviso só avisa.

**Anti-objetivos.** Seria um fracasso, mesmo funcionando, se:
- a saída levasse mais de ~5 toques;
- o modo Materiais atrapalhasse ou escondesse o fluxo de ferramentas;
- o saldo ficasse negativo;
- um lançamento pudesse ser apagado ou editado.

## 4. Mudanças de escopo e de regra (aprovadas pelo dono em 04/11/2026)

1. **PRD §4.2** lista "Materiais de consumo (cimento, areia, parafusos)" como **fora da versão 1**. Agora passa a fazer parte do produto. O PRD precisa ganhar uma seção de materiais, e a linha sai do §4.2.
2. **Edição de lançamentos de material pelo engenheiro**, em vez de estorno (regra 9 do CLAUDE.md / RN-18), sem deixar saldo negativo e com histórico de versões (§5.10). Para ferramentas, nada muda.
3. **Regra da TV** ("Sem totais nem estoque na TV", CLAUDE.md e Decisões de 11/10/2026): passa a valer **só para ferramentas**. A TV ganha uma **terceira tela no loop**, com o saldo de materiais. Atualizar CLAUDE.md (seção "Painel da TV") e registrar em PLAN.md › Decisões.

As demais regras invioláveis continuam valendo e se estendem aos materiais quando aplicável:
- cadastros só pelo engenheiro (regra 10);
- escrita só por RPC;
- RLS em toda tabela.

## 5. Como o app fica organizado

### 5.1 Chave Ferramentas | Materiais

- No topo do app aparece uma **chave segmentada "Ferramentas | Materiais"**.
- A chave troca o **modo do app inteiro**: tela inicial, barra inferior e telas.
- O app **lembra o último modo** usado no aparelho.
- **Modo Ferramentas:** exatamente o app de hoje, sem nenhuma mudança de fluxo.
- **Modo Materiais:** a barra inferior vira **Início · Saldos · Extrato · Fechamento · Cadastros**.
  - "Fechamento" abre a contagem do dia.
  - "Cadastros" abre a aba Materiais dos cadastros; só o engenheiro edita.

### 5.2 Início (modo Materiais)

- **Três botões lado a lado:** Entrada, Saída e Contagem.
  - Estilo discreto: fundo branco e **borda cinza fina** nos três.
  - **Entrada:** ícone e texto em **verde escuro** (`#14532D`).
  - **Saída:** ícone e texto em **vermelho escuro** (`#7F1D1D`).
  - **Contagem:** ícone e texto em **preto** (`#111827`).
  - Ao passar o dedo ou o mouse, a borda ganha a cor do botão.
- **Ícones:** traço grosso, mesma família.
  - **Entrada:** seta para baixo entrando numa bandeja.
  - **Saída:** seta para cima saindo da bandeja.
  - **Contagem:** ✓ sobre a bandeja.
  - Os SVGs estão no protótipo e devem entrar no conjunto do `IconeInterface`, gerado por `scripts/gerar-icones-interface.mjs`.
- Abaixo dos botões:
  - **faixa de aviso**, se houver material abaixo do limite;
  - **lista "Saldo agora"**, com os materiais abaixo do limite primeiro, em vermelho, e depois os demais em ordem alfabética.
- Selos de cada material: "limite N" em vermelho, "perto do limite" em amarelo, "ok" em verde. Sem aviso configurado, o material fica sem selo.
  - "Perto do limite" = saldo até 1,5 × o limite. O fator 1,5 foi escolha minha (ver §11).

### 5.3 Entrada

1. Toca em **Entrada** → lista de materiais com busca normalizada (sem acento, minúsculas) e saldo de cada um.
2. Toca no material → sobe uma **gaveta de baixo para cima** por cima da lista. A gaveta tem:
   - nome do material;
   - **quantidade:** número grande **digitável** ("toque no número para digitar", seleciona tudo ao focar), com **− e +** de 1 em 1 dos lados;
   - **botões rápidos +10, +50, +100, +500** (somam);
   - prévia "Saldo: 18 → 518 sc";
   - botão **Continuar**.
3. **Conferência na mesma gaveta:** "+500 sc · Cimento CP-II · hoje 08:07 · Marcos", "O saldo vai ficar em 518 sc", botões **Confirmar entrada** e **Corrigir**.
4. Tela de **pronto** com o novo saldo e os botões "Outra entrada" (volta à lista, para cargas com vários materiais) e "Voltar ao início".

- Se o material não estiver na lista, o almoxarife vê "Só o engenheiro cadastra material novo" e o botão **Pedir cadastro** (§5.8). O engenheiro vê "＋ Cadastrar material novo".
- **Entrada de quantidade:** aceita "1.500", "1500" e "2,5", sempre exibidos como "1.500". Unidades contínuas (m³, kg, m) aceitam decimais.

### 5.4 Saída

1. Toca em **Saída** → lista com os **mais usados primeiro**. Material sem saldo aparece apagado e não pode ser tocado.
2. Toca no material → **a mesma gaveta**, com:
   - prévia "Saldo: 118 → 18 sc";
   - se for cruzar o limite: "⚠ Fica abaixo do limite de 20. Todos da obra serão avisados.";
   - se passar do saldo: "Só tem 118 sc no almox", com o botão desligado;
   - botão **Registrar saída**, que grava direto, **sem tela de conferência**.
3. Tela de **pronto** com o saldo, o selo "Aviso enviado a todos da obra" (se disparou) e os botões:
   - "Outra saída";
   - **"Desfazer (60 s)"** com contagem regressiva;
   - "Voltar ao início".

- **Não pede** quem levou, capacete nem destino.
- **Desfazer:** dentro de 60 s, apaga o lançamento pela mesma via da edição (§5.10). Ele fica no extrato, riscado, com a marca "desfeito". Pode ser feito por quem lançou, sem motivo. Se a saída tinha disparado o aviso, o aviso volta a ficar armado; a notificação já enviada não é recolhida.
- Depois de 60 s, só o engenheiro corrige, **editando** o lançamento (§5.10).

### 5.5 Contagem (almoxarife **ou** engenheiro)

1. Tela com todos os materiais em linhas de três colunas: **Material · Sistema (saldo atual) · Contei** (campo).
   - Campo em branco = não contado hoje, saldo não muda.
   - O rascunho fica salvo no aparelho e dá para parar e continuar.
2. **Revisar contagem:**
   - **Diferenças encontradas** (contou menos que o sistema), por exemplo "Cimento · sistema 118 · contei 96 · −22 sc".
   - **Contou a mais** (ex.: sistema 12, contei 15): aparece junto das diferenças, com "+3 m³".
     - Decisão do dono: a entrada é difícil de errar, então o erro costuma estar nas **saídas** (lançou saída a mais).
     - A contagem **ajusta nos dois sentidos**. Contou a menos = consumo a mais; contou a mais = saída lançada em excesso, devolvida ao saldo.
     - O ajuste vira um **lançamento próprio, do tipo "Ajuste"**, positivo ou negativo (−22 ou +3). Não é entrada nem saída.
     - Não há botão "Lançar entrada" na contagem.
   - **Bateu certo:** lista curta com ✓.
   - **Escolha de quem conta, a cada contagem:**
     - **Ajustar o saldo pela contagem:** o contado passa a valer, e a diferença entra no extrato como "**Ajuste**" (−22 ou +3).
     - **Só conferir:** o saldo fica como está, e a diferença entra no extrato como "Conferência · divergência" (destaque amarelo, "não altera o saldo"). Para quem bateu certo, entra "Conferência ok".
3. Tela de pronto com o resumo e o botão "Ver extrato".

- Uma contagem que ajusta o saldo pode **disparar o aviso de limite**, como uma saída.
- A contagem fica no Início (botão) e em "Fechamento" na barra.
- A contagem de materiais **não faz parte** do fechamento do dia de ferramentas, que continua como está.

### 5.6 Saldos, ficha e extrato

- **Saldos:** a mesma lista do Início, separada em "Abaixo do limite" e "Normais".
- **Ficha do material:**
  - saldo grande, vermelho se abaixo do limite;
  - "aviso em N" (e, se for por %, "50% do estoque cheio");
  - barra do saldo até o estoque cheio, com um traço no limite;
  - selo da última divergência de conferência, se houver;
  - extrato do material.
  - O engenheiro vê também "Configurar aviso de limite".
- **Extrato:** todos os movimentos de todos os materiais, do mais novo para o mais antigo.
  - Cada linha: material, tipo, data e hora, **quem lançou** (usuário, não quem levou) e quantidade com sinal.
  - Tipos: Entrada, Saída, **Ajuste** (+ ou −, vindo da contagem), Conferência · divergência, Conferência ok. Lançamentos editados ou apagados aparecem com a marca da edição.

### 5.7 Cadastros e aviso de limite (só engenheiro)

- A aba **Materiais** em Cadastros lista os materiais com a unidade e o resumo do aviso, mais o botão "＋ Novo material".
- **Material:** nome e **unidade**, escolhida numa lista (sc, m³, kg, un, m, m², l, barra, rolo, lata).
  - O nome é único na obra, comparando de forma normalizada.
  - O material nasce com saldo 0. O saldo só muda por movimento.
- **Aviso de limite** (opcional, um por material):
  - **"Chegar a uma quantidade":** avisa quando o saldo ficar ≤ N.
  - **"Chegar a uma %":** avisa quando o saldo ficar ≤ X% do **saldo logo depois da última entrada** (o "estoque cheio"). Decidido pelo dono. Exemplo: sobravam 2 m³ de areia e chegaram 12, então o estoque cheio é 14 m³ e 50% avisa em 7 m³. Uma entrada pequena quase não mexe no limite. A tela mostra o número real: "50% de 14 m³ → avisa ao chegar em 7 m³". **O limite por % é sempre inteiro, arredondado para cima** (decidido pelo dono em 05/11/2026): 25% de 55 sc = 13,75 → avisa em 14 sc; 13,01 → 14. Conta única no banco (`privado.limite_aviso_material`), espelhada em `limiteDoAviso`. Rótulo da opção: "Chegar a um %".
  - Mostra quem recebe: **todos da obra** (engenheiro, almoxarifes e consulta).
  - Botão "Remover aviso".
- **Disparo:**
  - Acontece quando um movimento faz o saldo **cruzar** o limite (antes > limite, depois ≤ limite).
  - Dispara **uma vez**. Volta a ficar armado depois de uma **entrada** que deixe o saldo acima do limite, ou de uma edição que faça o mesmo.
  - Notificação: "**Cimento CP-II abaixo do limite** · Obra Betim: restam 18 sc (limite 20). Hora de pedir mais." Ao tocar, abre a ficha do material.
- Cadastro, alteração de material e alteração de aviso entram no **log de alterações** que já existe (M2).

### 5.8 Pedir cadastro

- Quando o almoxarife não acha um material na entrada, toca em **Pedir cadastro** e digita o nome (ex.: "Cal hidratada 20 kg").
- O engenheiro (ou engenheiros) da obra recebem uma **notificação** ("Marcos pediu o cadastro de: Cal hidratada 20 kg").
- O pedido aparece no topo de Cadastros › Materiais com dois botões:
  - **Cadastrar:** abre o formulário já com o nome preenchido;
  - **Dispensar.**
- O almoxarife é notificado quando o material for cadastrado.

### 5.10 Edição pelo engenheiro (decidido pelo dono em 04/11/2026)

- O engenheiro pode **editar qualquer lançamento de material**: entrada, saída e cada linha de contagem.
  - Muda a quantidade ou **apaga** o lançamento, com motivo opcional.
  - Não existe estorno manual para materiais.
- **Nunca deixa saldo negativo.** A edição é recusada se o saldo atual do material ficasse abaixo de zero, e a mensagem explica o motivo.
- **Histórico automático por trás da tela:**
  - Cada edição grava a versão anterior (quem, quando, de quanto para quanto).
  - O extrato mostra a linha corrigida com a marca "editado por Eng. Paula às 16:20 (era −100)".
  - Um lançamento apagado continua visível no extrato, riscado, com "apagado por… às…", e não conta no saldo.
- O saldo é recalculado na mesma transação.
- Uma edição que faça o saldo cruzar o limite dispara o aviso, e uma que faça o saldo voltar acima do limite rearma o aviso, como qualquer movimento.
- **Exceção à regra 9 do CLAUDE.md, só para materiais.** Para ferramentas, movimentos continuam imutáveis, com correção por estorno.
  - No banco, a exceção é cumprida assim: o cliente nunca faz `UPDATE`/`DELETE`. A RPC `editar_movimento_material` (só engenheiro) grava a nova versão numa tabela de versões imutável, e o extrato lê a versão vigente.
- O "Desfazer (60 s)" da saída continua existindo para quem lançou. Ele é uma edição que apaga o lançamento, feita sem ser engenheiro, só dentro dos 60 s.

### 5.9 Perfis

| Ação | Engenheiro | Almoxarife | Consulta |
|---|:---:|:---:|:---:|
| Ver saldos, ficha e extrato | ✅ | ✅ | ✅ (da obra inteira) |
| Entrada / saída / contagem | ✅ | ✅ | ❌ |
| Desfazer a própria saída em 60 s | ✅ | ✅ | ❌ |
| Editar ou apagar lançamento | ✅ | ❌ (só Desfazer em 60 s) | ❌ |
| Cadastrar material e aviso | ✅ | ❌ (só pede) | ❌ |
| Receber aviso de limite | ✅ | ✅ | ✅ |

A consulta de empreiteira também vê os saldos de materiais da obra inteira: material não é de nenhuma empresa.

## 6. TV — terceira tela do loop

- **Loop:** cartões por pessoa → colunas por empresa → **Materiais na obra** → recomeça. A tela de materiais aparece **sempre**.
- Mesmo tema escuro (`#101720` / `#1F2937` / `#F9FAFB`).
- **Cartões:** nome, **saldo em letra grande** com a unidade, barra até o estoque cheio, traço no limite e linha de estado.
  - Ordem: abaixo do limite → perto do limite → demais, em ordem alfabética.
  - Sem alerta: até 12 cartões por página.
  - **Com alerta:** 8 por página, para caber a faixa.
  - Páginas de 8 s, com o mesmo esmaecimento das páginas de pessoas.
- **Com alerta, o destaque é evidente:**
  - **faixa vermelha pulsando** no topo: "! 2 materiais abaixo do limite · Cimento CP-II (18 sc) · Areia média (6 m³). Pedir reposição.";
  - cartões em alerta em vermelho, com **borda pulsando**;
  - nas **outras duas telas** do loop, uma **faixa fina no rodapé** "! N materiais abaixo do limite · nomes".
- Requisitos que já valem para a TV:
  - animar só com `transform`/`opacity` e `requestAnimationFrame`;
  - atualização de dados não reinicia a fase em curso;
  - limpar timers e listeners;
  - rodar dias seguidos.
- O pulso deve ser animação CSS de `opacity`/`box-shadow` leve, ou equivalente que não pese no mini PC.
- Obra **sem nenhum material cadastrado:** a TV pula a terceira tela.

## 7. Modelo de dados (proposta; o detalhe é do construtor)

Seguir as convenções do CLAUDE.md: `snake_case` singular, RLS em tudo, `grant` explícito e `revoke … from anon`, RPC transacional para toda escrita.

- **`material`:** `id`, `obra_id`, `nome`, `unidade`, `saldo` (numeric, ≥ 0, `check`), `estoque_cheio` (numeric: saldo logo depois da última entrada), `aviso_tipo` (`quantidade` | `percentual` | null), `aviso_valor` (numeric), `aviso_disparado` (bool), `ativo`, `criado_em`.
  - O `saldo` é mantido pelas RPCs na mesma transação do movimento. Deve haver um teste que confira que `saldo` = soma do extrato.
- **`movimento_material`:** `id`, `obra_id`, `material_id`, `tipo` (`entrada` | `saida` | `ajuste` | `conferencia`), `quantidade` (com sinal; 0 para "conferência ok"), `saldo_depois`, `contagem_id` (null), `motivo` (null), `registrado_no_aparelho_em`, `usuario_id`, `criado_em`, `chave_idempotencia`.
  - Sem `UPDATE`/`DELETE` pelo cliente. Edições do engenheiro viram versões em `movimento_material_versao` (imutável), pela RPC (§5.10).
- **`contagem_material`:** `id`, `obra_id`, `modo` (`ajustar` | `conferir`), `usuario_id`, `criado_em`. Agrupa as linhas de uma contagem.
- **`pedido_cadastro_material`:** `id`, `obra_id`, `nome`, `pedido_por`, `status` (`aberto` | `cadastrado` | `dispensado`), `material_id`, datas.
- **RPCs:**
  - `registrar_entrada_material`, `registrar_saida_material`, `desfazer_saida_material`, `registrar_contagem_material` (lista de {material, saldo visto, contado} + modo), `editar_movimento_material`, `salvar_material`, `salvar_aviso_material`, `pedir_cadastro_material`.
  - Todas validam perfil e obra **no servidor**.
  - Travam a linha do material (`for update`) para o saldo não ficar negativo com dois celulares ao mesmo tempo.
  - Todas são idempotentes pela chave do celular, como retirada e devolução.
- **Avisos:** reaproveitar a fila `envio` (novos valores em `tipo_envio`: `limite_material`, `pedido_cadastro_material`, `material_cadastrado`; canal `push`, um envio por usuário da obra) e o envio por Web Push que já existe (`lib/envios`).
  - O disparo nasce dentro da RPC que cruzou o limite.
- **Realtime:** Início, Saldos e TV atualizam ao vivo, como hoje com `movimento`.
- **TV:** a leitura dos saldos pelo token do dispositivo segue o padrão de `app/tv/dados`.
- Testes pgTAP em `supabase/tests` para:
  - RLS por perfil e obra;
  - imutabilidade;
  - saldo nunca negativo;
  - disparo único do aviso e rearme;
  - contagem nos dois modos;
  - ajuste nos dois sentidos (contou a menos e contou a mais), sempre como lançamento do tipo "Ajuste", nunca como entrada ou saída.

## 8. Offline

- Entradas, saídas e contagens feitas **sem sinal** entram na **fila offline** do aparelho (IndexedDB, `lib/offline`), como as retiradas e devoluções, e sobem quando a conexão volta. Essa escolha foi minha; o dono não se opôs.
- A tela mostra que o lançamento está "na fila".
- Ao sincronizar, o servidor **confere de novo** o saldo. Se uma saída não couber mais (outro celular lançou antes), ela é recusada, e o app avisa o almoxarife com o motivo. Ela não entra com saldo negativo.
- Offline, a prévia de saldo usa o último saldo conhecido no aparelho.

## 9. Critérios de aceite

0. O engenheiro edita e apaga lançamentos de material. A edição que deixaria o saldo negativo é recusada, e toda edição aparece no extrato com quem, quando e o valor anterior.

1. Com a chave em Ferramentas, o app funciona exatamente como antes (e2e existentes passam sem mudança).
2. Uma saída de material leva no máximo **5 toques** a partir do Início: Saída → material → +50 → +50 → Registrar.
3. Digitar "1.500" na gaveta registra 1500. Os botões rápidos são +10/+50/+100/+500.
4. Não existe forma (tela, RPC ou concorrência entre dois celulares) de deixar o saldo negativo.
5. Saldo = soma do extrato, sempre.
6. A saída que cruza o limite gera **uma** notificação para cada usuário da obra com inscrição de push. Novas saídas abaixo do limite não repetem a notificação. Depois de uma entrada acima do limite, volta a avisar.
7. A contagem com "Só conferir" não altera o saldo e deixa a divergência visível no extrato e na ficha. Com "Ajustar", o saldo passa a ser o contado.
8. O consulta vê os saldos e não consegue lançar (tela e RPC).
9. A TV mostra a terceira tela em loop. Com alerta, a faixa vermelha e os cartões destacados aparecem, e a faixa de rodapé aparece nas outras telas. Atualizar o saldo não reinicia a animação em curso.
10. Lint, typecheck, Vitest, pgTAP e Playwright verdes.

## 10. Ordem no plano (decidido pelo dono em 04/11/2026)

- O **M13 entra na frente do M12** (conector ioo).
- O trabalho do M12 que ainda não está no git é salvo como está, numa branch própria e sem merge, e fica pausado. Volta depois do M13.
- O M13 vira o milestone em andamento no `PLAN.md`, com a decisão registrada.
- As migrations do M13 recebem timestamps **depois** de `20261104120000_ioo_periodos_empresa.sql`, e os testes pgTAP vêm depois do `041`. Assim a ordem continua válida quando o M12 voltar.

## 10.1 Documentos a atualizar no milestone

- `PRD.md`: nova seção de materiais; tirar "Materiais de consumo" do §4.2; perfis (§5); TV (§7.2); modelo de dados (§8).
- `PLAN.md`: novo **M13 · Controle de materiais** com entregas e critérios; linha na tabela de status; Decisões de 04/11/2026 (escopo de materiais; regra da TV; edição de materiais pelo engenheiro; contagem com escolha por contagem; pedido de cadastro).
- `CLAUDE.md`: glossário (Material, Saldo, Contagem, Aviso de limite); seção "Painel da TV" (estoque de materiais pode aparecer); estrutura de telas.
- `CHANGELOG.md` ao fechar.

## 11. Escolhas minhas (o dono pode rever na leitura)

- **"Perto do limite"** = saldo até 1,5 × o limite (selo amarelo no app, barra amarela na TV).
- **Desfazer em 60 s** sem motivo, só para quem lançou a saída. Depois disso, só o engenheiro corrige, editando o lançamento.
- **Entrada com tela de conferência; saída sem.** Saída é repetida; o Desfazer cobre o erro de toque.
- **Lista de saída** ordenada pelos mais usados (contagem de saídas nos últimos 30 dias); a lista de entrada vai em ordem alfabética.
- **Unidades:** lista fechada de 10, que o construtor pode ampliar.
- **Fila offline** vale para materiais.
- **Material inativo** (não usado mais): o engenheiro pode inativar quando o saldo for 0. Ele some das listas e da TV, mas o extrato continua.
- **Contagem aplica a diferença, não o número:**
  - O celular envia, para cada material, o **saldo que viu** na hora de contar e o **contado**. "Ajustar" lança `contado − saldo visto`.
  - Assim, saídas lançadas durante a contagem, ou antes de a fila offline subir, não são canceladas nem contadas duas vezes.
  - O ajuste também é recusado se deixaria o saldo negativo. Nesse caso o app pede para recontar.
- **Horário dos lançamentos offline:** o extrato e o saldo seguem a **ordem de chegada ao servidor** (`criado_em`), o que mantém saldo = soma do extrato. A hora em que o celular registrou fica guardada num segundo campo (`registrado_no_aparelho_em`) e aparece no extrato como "lançado às 10:15, sincronizado às 11:02".
- **Aviso criado ou alterado com o saldo já no limite ou abaixo dele:** notifica todos **na hora, uma vez**, e marca o aviso como disparado. Se o aviso já estava disparado, salvar de novo não reenvia.

## 12. Deixado para o construtor

- Nomes finais de tabelas, colunas, enums e RPCs; índices.
- Como guardar o modo Ferramentas/Materiais (`localStorage` ou cookie) e como a rota reflete o modo (ex.: `/materiais/...`).
- Componentização da gaveta (a mesma para entrada e saída), acessível: foco preso na gaveta, Esc fecha, `aria-modal`.
- Divisão do M13 em entregas e a ordem delas.
