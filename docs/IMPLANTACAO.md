# Implantação do Almox numa obra (piloto)

Checklist para deixar a obra pronta antes do primeiro dia. Marque cada item. O que depende
de outra pessoa está indicado.

## 1. Antes de ir para a obra

### Contas e configuração (dono do sistema)
- [ ] **Vercel › Production**: as variáveis do `.env.prod-envios` estão coladas e houve um
      redeploy depois:
  - [ ] `ENVIOS_SEGREDO`
  - [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  - Depois de conferir, **apague o arquivo `.env.prod-envios`** do computador.
- [ ] **Resend**: conta criada e domínio da construtora verificado.
  - [ ] `RESEND_API_KEY` e `EMAIL_REMETENTE` na Vercel (Production).
  - Sem isso, os e-mails de aviso **ficam esperando na fila** e saem quando o Resend entrar.
- [ ] **Sentry**: projeto criado; `NEXT_PUBLIC_SENTRY_DSN` na Vercel. Sem ele o app funciona,
      só não avisa os erros.
- [ ] **Obra no Almox**: o dono do sistema passa o nome, o endereço e o e-mail do engenheiro.
      A obra e o vínculo do engenheiro são criados por script, com OK:
      `node scripts/criar-obra.mjs --env <arquivo com a chave secreta> --obra "…" --endereco "…" --email … --nome "…"`
      (sem `--confirmar` só mostra o que faria; login novo recebe senha provisória, mostrada
      uma vez, e troca no primeiro acesso).

### Compras e rede (obra)
- [ ] TV de 43" ou mais, com entrada HDMI, numa parede visível da fila do almoxarifado.
- [ ] Mini PC (Windows 10/11 ou Linux), com HDMI para a TV e Wi-Fi ou cabo de rede.
- [ ] Impressora de etiquetas de rede (ZPL, Zebra; ou TSPL, TSC/Elgin/Argox).
  - [ ] Rolo 60 × 80 mm de poliéster ou vinil, com ribbon de resina (o adesivo pega chuva e sol).
  - [ ] IP fixo na rede da obra (reserva no roteador).
- [ ] Wi-Fi do almoxarifado (ver o teste da seção 2).
- [ ] Celular do almoxarife (Android 10+ ou iPhone com iOS 16+), com câmera traseira boa.
- [ ] Capacetes limpos e secos na frente (onde vai o adesivo).

### Jurídico
- [ ] `POLITICA-DE-DADOS.md` validado (prazos, base legal).
- [ ] Termo de responsabilidade impresso para cada trabalhador assinar na entrega do adesivo.
- [ ] Cláusula de desconto por ferramenta não devolvida nos contratos das empreiteiras, com o
      envio do aviso por e-mail ao dono e ao encarregado.

## 2. Na obra: rede e equipamentos

### Wi-Fi do almoxarifado
Faça o teste **no ponto onde o almoxarife fica** e **junto da TV**, no horário de pico (7h):
- [ ] Abrir `almox-chi.vercel.app` no celular do almoxarife em até 5 s.
- [ ] Teste de velocidade com pelo menos 2 Mbps.
- [ ] O celular não perde o sinal ao andar até as prateleiras.

Se o sinal cai, o Almox continua funcionando sem internet (veja a seção 4). Mesmo assim, um
repetidor perto do balcão evita fila de lançamentos para mandar depois.

### Impressora
- [ ] Ligada na rede, com o IP fixo anotado: `____.____.____.____`, porta `9100`.
- [ ] No app (engenheiro): *Cadastros › Impressora* → IP, porta e linguagem → **Salvar**.

### Mini PC e agente de impressão
Siga `agente-impressao/LEIA-ME.md`:
- [ ] Node.js 24 instalado no mini PC.
- [ ] *Cadastros › Impressora › Cadastrar mini PC*: copie as três linhas (o token aparece uma vez só).
- [ ] Pasta do agente copiada e `.env` preenchido (e o `SENTRY_DSN`, se houver).
- [ ] Instalado como serviço (`instalar\windows.ps1` ou `sudo sh instalar/linux.sh`).
- [ ] No app aparece **Agente online**.
- [ ] **Imprimir etiqueta de teste**: a etiqueta sai em segundos e o QR lê no celular.
- [ ] Desligue e ligue o mini PC: o agente volta sozinho (Agente online de novo).

### TV
- [ ] No app (engenheiro): *Cadastros › Impressora › Conectar uma TV* → anote o endereço.
- [ ] No navegador do mini PC, abra o endereço (vale uma vez só) → o painel aparece.
- [ ] Navegador em tela cheia (F11) e abrindo sozinho com o Windows/Linux, nesse endereço `/tv`.
- [ ] Desligar a economia de energia da TV e do mini PC (tela não pode apagar).
- [ ] Cronômetro: lance uma retirada no celular e conte até aparecer na TV (meta: até 3 s).
- [ ] Deixe a TV ligada 72 h seguidas antes do piloto e confira que continua passando as páginas.

## 3. Cadastro inicial

- [ ] **Importar planilha** (*Cadastros › Importar planilha*):
  - baixe o modelo;
  - preencha as empresas (com o e-mail do dono e do encarregado), as pessoas e as ferramentas;
  - envie, corrija os erros que a prévia mostrar e importe.
- [ ] **Encarregado** de cada empreiteira escolhido na tela da empresa.
- [ ] **Adesivos**: no fim da importação, **Imprimir N adesivos**, ou depois pela tela de cada
      empresa.
- [ ] Colar o adesivo **na frente do capacete**, limpo e seco. Entregar o termo para assinar.
- [ ] Leitura de prova: ler 10 capacetes no celular do almoxarife, com sol e na sombra.
      Todos devem ler em até 2 s. **Anote o modelo do celular e o resultado** (ver seção 5).
- [ ] **Acessos**: almoxarife e encarregados com login (*Cadastros › Acessos*). O encarregado
      de empreiteira fica restrito à empresa dele.

## 4. Celular do almoxarife

- [ ] App instalado na tela inicial (Android: "Instalar app"; iPhone: Compartilhar → "Adicionar
      à Tela de Início").
- [ ] Permissão de câmera dada ao app.
- [ ] **Notificações** ligadas em *Conta* (engenheiro e encarregados também).
- [ ] **Teste sem internet**:
  1. Com internet, abra o Início uma vez (o celular guarda pessoas e ferramentas).
  2. Ligue o modo avião.
  3. Abra o app: "Sem conexão" → **Lançar sem internet**.
  4. Faça uma retirada lendo um capacete: aparece "aguardando envio".
  5. Desligue o modo avião: em até 30 s o lançamento vai e aparece na TV.

## 5. Durante o piloto (30 dias)

- [ ] Toda sexta: *Início › Métricas do piloto* (engenheiro). Anote no relatório:
  - QR lido → retirada (meta: até 15 s);
  - retiradas sem QR (meta: menos de 10%);
  - pendências com aviso (meta: 100%);
  - ferramentas não devolvidas por semana (meta: queda de 50% em 60 dias).
- [ ] Toda sexta: baixe as planilhas do histórico e dos descontos e guarde com o relatório.
- [ ] Anote cada problema e pedido de melhoria em `docs/RELATORIO-PILOTO.md`, com data e quem pediu.
- [ ] Capacete que não lê: anote o nome no capacete, o celular e a luz do lugar. Reimprima o
      adesivo pela ficha da pessoa.
