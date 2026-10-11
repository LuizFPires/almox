# PRD — Almox

**Controle de ferramentas e equipamentos do almoxarifado de obra**

| | |
|---|---|
| Versão | 1.0 |
| Data | 11/10/2026 |
| Status | Aprovado para implementação |
| Referência visual | Protótipo navegável "Almox — Protótipo" (canvas Claude) |
| Ecossistema | Sistema conectável ao **ioo** (Brain) |

---

## 1. Problema

Todo dia de manhã, trabalhadores da construtora e das empreiteiras passam no almoxarifado da obra para pegar as ferramentas do dia (pás, carrinhos, colheres, furadeiras, marteletes…) e devolvem no fim do expediente. Hoje esse controle é feito no papel ou de memória, e o resultado é conhecido:

- não se sabe, na hora, **quem está com o quê**;
- ferramentas somem e ninguém assume a responsabilidade ("deixei com o encarregado");
- ferramentas de alto valor (martelete, serra circular) ficam fora dias sem ninguém perceber;
- avarias aparecem sem registro de quando e com quem aconteceram;
- não existe base objetiva para cobrar a reposição da empreiteira na medição.

## 2. Solução

Um sistema com três partes:

1. **App no celular** (almoxarife e engenheiro), que lança retiradas e devoluções em tempo real. O trabalhador é identificado pela leitura do **QR Code colado no capacete**, com o nome impresso logo abaixo.
2. **Painel na TV do almoxarifado**, ligado 24h, que mostra em loop quem está com cada ferramenta.
3. **Avisos automáticos** (no app e por e-mail) ao dono e ao encarregado da empreiteira quando um funcionário não devolve uma ferramenta, com o valor que será descontado na próxima medição.

## 3. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta no piloto |
|---|---|---|
| Lançamento rápido na fila da manhã | Tempo do QR lido até a retirada registrada | ≤ 15 s (até 3 tipos de ferramenta) |
| Rastreabilidade total | % de movimentos com pessoa, almoxarife, hora e via (QR/manual) | 100% |
| Pouco lançamento manual | % de retiradas sem QR | < 10% |
| Menos perdas | Ferramentas não devolvidas por semana | Queda de 50% em 60 dias |
| Painel confiável | Atraso entre o lançamento e a TV | ≤ 3 s |
| Cobrança objetiva | Pendências de empreiteira com aviso enviado | 100% |

## 4. Escopo

### 4.1 Na versão 1

- Cadastros (só o engenheiro): obras, empresas (construtora e empreiteiras, com dono e encarregado), pessoas, tipos de ferramenta com quantidade e valor de reposição.
- Impressão do adesivo do capacete (QR + nome) numa impressora de etiquetas ligada ao Wi-Fi da obra.
- Identificação por QR do capacete, com conferência visual da pessoa.
- Retirada e devolução por quantidade (toques no ícone), registro de avaria com foto obrigatória.
- Lançamento manual sem QR, com regras próprias.
- Lista "quem está com o quê", ficha da pessoa, estoque (total, livres, no canteiro, em manutenção) e busca.
- Fechamento do dia (relatório, sem baixa).
- Avisos às empreiteiras (notificação no app + e-mail) com o valor de reposição.
- Painel da TV em loop (cartões por pessoa + colunas por empresa).
- Perfis e permissões (engenheiro, almoxarife, consulta).
- Histórico e auditoria de todos os movimentos.

### 4.2 Fora da versão 1

- QR Code nas ferramentas: decidido **não fazer por ora**. A identificação é só por pessoa, e as unidades são controladas por quantidade.
- Biometria (digital) e foto do rosto: **descartadas** por LGPD e pela resistência dos trabalhadores.
- Materiais de consumo (cimento, areia, parafusos).
- Integração automática com o sistema de medição. Na v1 o desconto é informado no aviso e entra num relatório para o engenheiro aplicar na medição.
- Compra, manutenção e baixa patrimonial completas. Esse é o escopo do sistema **Controle de Equipamentos**, uma integração futura.

## 5. Perfis e permissões

| Ação | Engenheiro | Almoxarife | Consulta¹ |
|---|:---:|:---:|:---:|
| Ler QR do capacete | ✅ lançar | ✅ lançar | ✅ só ver a ficha |
| Registrar retirada / devolução | ✅ | ✅ | ❌ |
| Lançamento manual (sem QR) | ✅ | ✅ | ❌ |
| Ver lista, ficha, estoque | ✅ | ✅ | ✅ |
| Fechamento do dia | ✅ | ✅ | ❌ |
| Cadastros (obra, empresa, pessoa, ferramenta, valores) | ✅ | ❌ | ❌ |
| Imprimir / reimprimir adesivo | ✅ | ❌ | ❌ |
| Configurar impressora | ✅ | ❌ | ❌ |
| Receber avisos de não devolução | ✅ (pendências da construtora) | ❌ | ✅ dono e encarregado da própria empreiteira |

¹ Consulta: encarregados, mestres de obra, donos de empreiteira e qualquer outro login. Dono e encarregado de empreiteira veem apenas os dados da própria empresa; os demais veem a obra inteira.

## 6. Regras de negócio

Estas regras são invariantes: nenhuma tela ou API pode violá-las.

| Código | Regra |
|---|---|
| **RN-01** | **Quem pegou, devolve.** A ferramenta fica no nome de quem retirou até essa mesma pessoa devolver. Não existe transferência entre pessoas nem baixa por empresa. |
| **RN-02** | A **devolução exige a leitura do QR do capacete de quem retirou**. Exceção: ver RN-06. |
| **RN-03** | Ao ler um QR para lançar, o app mostra o nome em destaque e pergunta **"É o Fulano que está na sua frente?"**. O almoxarife confere a pessoa (não o capacete). |
| **RN-04** | Se a resposta for "Não é ele", **nada é registrado**. É criada uma **ocorrência** "capacete usado por outra pessoa" e o encarregado da empresa é avisado. |
| **RN-05** | **Retirada sem QR** (capacete esquecido, QR ilegível) é permitida para engenheiro e almoxarife e fica marcada como **manual** no histórico, no fechamento e na ficha. |
| **RN-06** | O que foi retirado **sem QR** pode ser devolvido **sem QR**. O que foi retirado **com QR** só volta **com QR**. A marca de origem fica em cada unidade. |
| **RN-07** | A quantidade é informada por **toques no ícone** (cada toque soma 1, com botão − para corrigir), limitada às unidades livres. |
| **RN-08** | Como as ferramentas não têm QR, o sistema **escolhe as unidades automaticamente**: na retirada, as livres em ordem de código; na devolução, as mais antigas com a pessoa primeiro. |
| **RN-09** | Na devolução, o almoxarife informa **quantas voltaram avariadas**. Cada avaria exige **foto + motivo** (quebrada, cabo rompido, não liga, desgaste, peça faltando). A unidade avariada vai para **manutenção** e sai do estoque livre. |
| **RN-10** | Tipos marcados como **alto valor** exigem atenção extra na retirada (aviso visual na revisão). |
| **RN-11** | Toda retirada exige a confirmação "Conferi pessoalmente: é o Fulano que está pegando" antes de concluir. |
| **RN-12** | O **fechamento do dia** é um relatório: quem devolveu tudo e quem ainda está com ferramenta. **Não dá baixa em nada.** O que não voltou vira pendência e aparece em vermelho ("desde ontem") no app e na TV. |
| **RN-13** | Ao encerrar o dia, para cada empreiteira com pendência, o sistema envia **notificação no app + e-mail** ao **dono** e ao **encarregado**, com pessoa, ferramentas, valor de cada item e total, informando que **o valor será descontado na próxima medição** para reposição. |
| **RN-14** | Se a ferramenta for **devolvida antes do fechamento da medição**, o desconto é **cancelado** automaticamente e os destinatários são avisados. |
| **RN-15** | Pendências de **funcionários próprios da construtora** não geram desconto: vão só para o engenheiro. |
| **RN-16** | O valor de reposição é cadastrado **por tipo de ferramenta, por unidade**, apenas pelo engenheiro. O aviso usa o valor vigente no momento do encerramento do dia. |
| **RN-17** | O QR do capacete contém **apenas um token opaco** (sem nome, CPF ou dados). Lido fora do app, não revela nada. |
| **RN-18** | Todo movimento registra: pessoa, usuário que lançou, data/hora, via (QR/manual), itens e quantidades. **Movimentos não são apagados nem editados**; correções são feitas por novo movimento de estorno, com motivo. |

## 7. Funcionalidades

### 7.1 App (PWA, celular)

**F-01 — Início**
- Seletor de perfil pelo login (sem troca manual em produção).
- Ação principal: **Ler QR do capacete**. Para almoxarife e engenheiro, serve para lançar; para os demais, só consulta.
- Atalhos: *Ver quem está com o quê*, *Ferramentas na obra (estoque)*, *Sem capacete? escolher na lista*.
- Resumo: no canteiro, no almoxarifado, em manutenção, pendências.
- Pendências (desde ontem) e últimos lançamentos.
- Barra inferior: Início · Lista · Estoque · Fechamento² · Cadastros² (² só para quem lança).

**F-02 — Leitura do QR**
- Câmera do celular, com leitura automática e sem botão.
- Token desconhecido: mensagem "Capacete não cadastrado".
- Para quem lança: segue para a conferência (F-03). Para consulta: abre a ficha (F-04).

**F-03 — Conferência da pessoa**
- Nome do capacete em destaque, nome completo, função e empresa.
- "É o {nome} que está na sua frente?" → **Sim** (segue para F-04) ou **Não é ele** (bloqueio, RN-04).

**F-04 — Ficha da pessoa**
- Nome, função, empresa e como foi identificada (QR conferido / lista / manual).
- "Com ele agora": cada ferramenta com hora e marca "sem QR" quando for o caso.
- Para quem lança: botões **Retirada** e **Devolução** (devolução desabilitada conforme RN-02/RN-06, com explicação e atalho "Ler capacete do {nome}").
- Equipe da mesma empresa, com a quantidade de itens de cada um.

**F-05 — Retirada**
1. Grade de ícones dos tipos de ferramenta com unidades livres. Cada toque soma 1, há o botão −, e o selo mostra a quantidade.
2. Revisão: tipos × quantidade, unidades alocadas, selo **ALTO VALOR**, confirmação obrigatória (RN-11), aviso de lançamento manual quando for o caso.
3. Concluir → tela de sucesso → TV atualizada.

**F-06 — Devolução**
- Peças agrupadas por tipo ("Com ele: 2").
- Contador "Devolvendo" (toque no ícone soma 1; botão −; "Devolveu tudo").
- Contador "Avariadas", de 0 até a quantidade devolvida.
- Havendo avariada: **foto obrigatória** (câmera) + motivo.
- Rodapé: "Fica com ele: Pá ×1".
- Sem QR: lista só os itens retirados sem QR (RN-06).

**F-07 — Lista "quem está com o quê"**
- Agrupada por empresa, com as pessoas que têm ferramenta e chips de cada item. Pendência em vermelho.
- Busca por nome ou código, sem diferenciar acentos.
- Toque na pessoa → ficha. A partir da lista, a identificação conta como manual.

**F-08 — Lista manual (sem QR)**
- Todas as pessoas, com busca por nome ou apelido e o número de itens.
- Aviso das regras RN-05/RN-06.

**F-09 — Estoque**
- Totais: na obra, livres, no canteiro, manutenção.
- Por tipo: livres/total, barra colorida (verde livre, amarelo canteiro, vermelho manutenção); um toque mostra com quem está cada unidade.

**F-10 — Fechamento do dia**
- Contadores: pessoas ainda com ferramenta / pessoas que devolveram tudo hoje.
- Lista de pendências por pessoa: empresa, itens, valor, "desde ontem" e o botão "{nome} chegou: ler capacete e devolver".
- Lista de quem devolveu tudo, com o horário.
- **Encerrar o dia e enviar relatório** → gera os avisos (RN-13/RN-15) e a tela "Ver aviso enviado".
- Encerramento automático às 23:59, caso ninguém tenha encerrado.

**F-11 — Cadastros (só o engenheiro)**
- **Pessoas:** nome completo, nome no capacete (sugere o primeiro nome, editável), função, empresa e matrícula automática. Ao salvar, gera o token e **imprime o adesivo**. Reimprimir com 1 a 5 cópias. Inativar (sem apagar).
- **Ferramentas:** tipo, quantidade (adiciona unidades), **valor de reposição (R$/un)**, alto valor. Lista com unidades e valor.
- **Empresas:** nome, tipo (própria/empreiteira), **dono (nome + e-mail)**, **encarregado (pessoa da empresa + e-mail)**, data da próxima medição. Alerta de e-mail faltando.
- **Impressora:** escolher a impressora de etiquetas da rede da obra, ver o rolo e imprimir teste.

**F-12 — Aviso de não devolução**
- Notificação no app: "{Empresa}: ferramentas não devolvidas hoje somam R$ X. O valor será descontado na próxima medição."
- E-mail: destinatários (dono + encarregado), assunto "Ferramentas não devolvidas · {Empresa} · {data}", tabela pessoa/itens/valor, total, texto do desconto e da regra de cancelamento (RN-14), assinatura automática.
- Status do aviso: enviado → cancelado (devolvido) ou confirmado para desconto (no fechamento da medição).
- Relatório para o engenheiro: valores a descontar por empresa por medição.

### 7.2 Painel da TV

**F-13 — Painel em loop** (rota `/tv`, tela cheia, sem login interativo: dispositivo autorizado por token)

| Parâmetro | Valor padrão | Configurável |
|---|---|---|
| Resolução de referência | 1920 × 1080 | — |
| Tema | Escuro | — |
| Cartões por página | 12 (grade 4 × 3) | ✅ |
| Ordem dos cartões | Alfabética pelo nome | — |
| Tempo por página | 8 s | ✅ (3–30 s) |
| Transição | Esmaecimento de 0,6 s | — |
| Velocidade das colunas por empresa | 45 px/s | ✅ (15–150) |
| Pausa antes / depois da rolagem | 2,5 s / 3 s | ✅ |

Sequência: páginas de cartões por pessoa (1–12, 13–24, …) → colunas por empresa rolando para a esquerda (empresa com mais de 6 pessoas ocupa coluna dupla) → volta ao início, em loop infinito.

- **Cartão por pessoa:** nome, função, empresa (cor + nome), ferramentas (ícone grande + nome, ×N quando houver mais de uma) e "Retirou às 07:05", ou faixa vermelha "Não devolvido · desde ontem".
- **Cabeçalho fino:** ALMOX, obra, título da tela ("Pessoas 13–24 de 30"), pontos de página e hora atual.
- **Rodapé:** barra de progresso até a próxima troca.
- **Sem** totais e **sem** lista de estoque: esses números ficam só no app.
- Dados ao vivo (realtime). Reconecta sozinho, e sem conexão mostra o último estado com o aviso "sem conexão desde HH:MM".

## 8. Modelo de dados (entidades)

| Entidade | Campos principais |
|---|---|
| `obra` | id, nome, endereço, ativa |
| `empresa` | id, obra_id, nome, tipo (`propria`/`empreiteira`), cor, dono_nome, dono_email, encarregado_pessoa_id, encarregado_email, proxima_medicao |
| `pessoa` | id, obra_id, empresa_id, nome, nome_capacete, funcao, matricula, qr_token (único, opaco), ativa |
| `usuario` | id (auth), nome, email |
| `usuario_obra` | usuario_id, obra_id, perfil (`engenheiro`/`almoxarife`/`consulta`), empresa_id (opcional: consulta de empreiteira) — perfil vale por obra |
| `tipo_ferramenta` | id, obra_id, nome, icone, valor_reposicao (centavos), alto_valor |
| `unidade` | id, tipo_id, codigo (interno, ex. `PA-05`), status (`livre`/`em_uso`/`manutencao`/`baixada`) |
| `posse` | unidade_id, pessoa_id, desde, via (`qr`/`manual`), movimento_retirada_id (registro vivo do que está com quem) |
| `movimento` | id, tipo (`retirada`/`devolucao`/`estorno`), pessoa_id, usuario_id, via, criado_em, conferido (bool), obs |
| `movimento_item` | movimento_id, unidade_id, avariada (bool) |
| `avaria` | id, unidade_id, movimento_id, motivo, foto_path, criado_em |
| `ocorrencia` | id, tipo (`capacete_trocado`), pessoa_id (dono do capacete), usuario_id, criado_em |
| `fechamento_dia` | id, obra_id, data, encerrado_por, encerrado_em, automatico |
| `aviso` | id, fechamento_id, empresa_id, total, status (`enviado`/`cancelado`/`confirmado`), itens (json), enviado_em |
| `impressora` | id, obra_id, nome, ip, porta, linguagem (`ZPL`/`TSPL`), rolo |
| `trabalho_impressao` | id, impressora_id, payload, copias, status (`pendente`/`enviado`/`erro`), criado_em |
| `dispositivo_tv` | id, obra_id, token, ultimo_ping |

Valores monetários são guardados em **centavos (inteiro)** e exibidos no padrão brasileiro: `R$ 1.234,56`.

## 9. Requisitos não funcionais

- **Desempenho:** a leitura do QR abre a conferência em menos de 1 s; a retirada é registrada em menos de 1 s depois de confirmar; a TV atualiza em até 3 s.
- **Conectividade:** a internet da obra é instável. O app guarda lançamentos numa **fila local** quando está offline e sincroniza quando a conexão volta. Lançamento offline aparece como "aguardando envio".
- **Usabilidade no canteiro:** alvos de toque com pelo menos 44 px, alto contraste (legível no sol), poucas palavras, ícones com nome escrito embaixo.
- **Segurança:** RLS no banco por obra e perfil; o token do QR não identifica a pessoa fora do sistema; a TV usa token de dispositivo, só leitura.
- **LGPD:** nenhum dado biométrico; dados pessoais mínimos (nome, função, empresa); fotos só de ferramentas avariadas; política de retenção definida.
- **Auditoria:** movimentos imutáveis (RN-18); log de quem cadastrou e alterou valores.
- **Idioma e formatos:** pt-BR; datas no fuso de São Paulo; moeda em BRL.

## 10. Hardware da obra

| Item | Especificação |
|---|---|
| Celular do almoxarife | Android ou iPhone recente, com câmera boa e capinha robusta |
| Impressora de etiquetas | Térmica de **transferência**, com Wi-Fi/rede, linguagem **ZPL ou TSPL** |
| Etiqueta | Poliéster/vinil 60 × 80 mm + **ribbon de resina** (resiste a sol e chuva); papel térmico direto não serve |
| TV | 43" ou mais, Full HD |
| Mini PC / TV box | Roda o painel em tela cheia **e o agente de impressão local** |
| Rede | Wi-Fi da obra cobrindo o almoxarifado |

A impressora fica na rede local da obra, então o servidor na nuvem não alcança ela diretamente. Um **agente de impressão** leve, rodando no mini PC da TV, busca os trabalhos de impressão no banco e os envia para a impressora pela rede local.

## 11. Integração com o ioo

O Almox segue o **contrato único de conector** do ecossistema:
- **Consulta (somente leitura):** quem está com o quê, estoque, pendências, histórico por pessoa, empresa ou ferramenta.
- **Eventos/alertas:** retirada, devolução, avaria, capacete trocado, pendência criada, aviso enviado ou cancelado.
- **Catálogo de intenções:** "o que o Joaquim pegou hoje?", "quem está com o martelete?", "quanto a Fôrmas Ribeiro deve de reposição?".
- **Mapa de domínios:** ferramentas de obra / almoxarifado. Os valores de reposição entram no ioo como informação operacional; o custo financeiro continua pelo Grana/Orca.

## 12. Questões em aberto

1. **Prazo do desconto:** o aviso sai no mesmo dia do não retorno ou depois de X dias de pendência? (Padrão adotado: no encerramento do dia, com cancelamento se voltar até o fechamento da medição.)
2. **Cláusula contratual:** o desconto precisa estar previsto no contrato com cada empreiteira. Redação a validar com o jurídico.
3. **Avaria por mau uso:** também é cobrada da empreiteira? Com qual critério?
4. **Turnos noturnos / fim de semana:** o encerramento automático das 23:59 atende?
5. **Multi-obra:** o engenheiro de várias obras alterna pelo seletor de obra (o modelo já prevê isso).
6. **Termo de responsabilidade** assinado na integração do trabalhador, tornando válidos os lançamentos com o QR dele. Modelo a criar com o jurídico.
