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
- [ ] **Segurança (auditoria de 13/10/2026, `docs/seguranca/auditoria-2026-10-13.md`)**:
  - [ ] **GitHub**: ruleset na `main` (PR com o CI verde, sem force-push nem apagar), secret
        scanning com push protection e Dependabot ligados.
  - [ ] **Supabase › Database › Settings**: *Enforce SSL* ligado e redes restritas (o app usa só
        a API; a conexão direta é para manutenção).
  - [ ] **Supabase › Authentication**: *Secure password change* ligado; código do e-mail com
        **8 dígitos** e validade de **900 s**; intervalo entre e-mails de **60 s**; proteção de
        senha vazada ligada; URL de retorno só `https://almox-controle.vercel.app/auth/confirmar`.
  - [ ] **Supabase › Authentication › Emails**: modelo *Reset password* com o texto de
        `supabase/templates/codigo-senha.html` (usa `{{ .Token }}`, não o link) e aviso de
        *Password changed* ligado com `senha-trocada.html`.
  - [ ] **SMTP próprio (Resend)** no Auth: sem ele o código de senha só chega para quem é membro
        da organização do Supabase.
  - [ ] Apagar `.env.prod-acesso` e `.env.prod-envios` depois de guardar os valores.
- [ ] **Sentry**: projeto criado; `NEXT_PUBLIC_SENTRY_DSN` na Vercel. Sem ele o app funciona,
      só não avisa os erros.
- [ ] **Obra no Almox**: o dono do sistema passa o nome, o endereço e o e-mail do engenheiro.
      A obra e o vínculo do engenheiro são criados por script, com OK:
      `node scripts/criar-obra.mjs --env <arquivo com a chave secreta> --obra "…" --endereco "…" --email … --nome "…"`
      (sem `--confirmar` só mostra o que faria; login novo recebe senha provisória, mostrada
      uma vez, e troca no primeiro acesso).

### Compras e rede (obra)
- [ ] TV de 43" ou mais, com entrada HDMI, numa parede visível da fila do almoxarifado.
- [ ] TV com **Google TV**, ou um aparelho Google TV ligado nela (ex.: Xiaomi TV Box S, cerca
      de R$ 350). Sem mini PC (decisão de 13/10/2026).
- [ ] Folhas **A4 adesivas** (vinil ou papel) para a impressora comum da obra: os adesivos dos
      capacetes saem 9 por folha.
- [ ] *Opcional, obras grandes:* impressora de etiquetas de rede (ZPL ou TSPL) com mini PC e o
      agente de impressão (seção "Opcional" abaixo).
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
- [ ] Abrir `almox-controle.vercel.app` no celular do almoxarife em até 5 s.
- [ ] Teste de velocidade com pelo menos 2 Mbps.
- [ ] O celular não perde o sinal ao andar até as prateleiras.

Se o sinal cai, o Almox continua funcionando sem internet (veja a seção 4). Mesmo assim, um
repetidor perto do balcão evita fila de lançamentos para mandar depois.

### TV (aparelho Google TV)
- [ ] Aparelho ligado na TV pelo HDMI, no Wi-Fi da obra, com o HDMI-CEC ligado na TV
      (Anynet+ na Samsung, SimpLink na LG).
- [ ] **Fully Kiosk Browser** instalado pelo Google Play, com endereço inicial
      `almox-controle.vercel.app/tv`, "abrir ao iniciar" e "manter a tela ligada".
- [ ] A TV mostra um código de 6 números e um QR: no celular do engenheiro ou do almoxarife,
      leia o QR (ou *Início › ícone de grade › Conectar TV*) e toque em **Conectar TV**.
- [ ] O painel aparece sozinho em poucos segundos.
- [ ] Desligue a TV da tomada e ligue de novo: volta direto no painel, sem novo código.
- [ ] Cronômetro: lance uma retirada no celular e conte até aparecer na TV (meta: até 3 s).
- [ ] Deixe a TV ligada 72 h seguidas antes do piloto e confira que continua passando as páginas.

### Adesivos (folha A4)
- [ ] *Imprimir adesivos* (pela empresa, pela importação ou pela ficha): tamanho **Médio** (12 por
      folha), **Todos sem adesivo** e escala **100%** na impressão.
- [ ] Meça um adesivo: 5 × 6,5 cm no Médio (6 × 8 no Grande; 4,5 × 6 no Pequeno). Recorte na
      linha tracejada. Sobrou espaço? Na próxima vez, marque os espaços já usados e aproveite a folha.
- [ ] Leia o adesivo com *Ler QR do capacete*: abre a pessoa certa.

### Opcional: impressora de etiquetas com mini PC
Para obras que cadastram muita gente. Siga `agente-impressao/LEIA-ME.md`:
- [ ] Impressora de rede com IP fixo (porta `9100`); rolo 60 × 80 mm de poliéster ou vinil com
      ribbon de resina.
- [ ] *Cadastros › ⚙ › Impressora*: IP, porta e linguagem → **Salvar**; **Cadastrar mini PC** e
      copie as três linhas (o token aparece uma vez só).
- [ ] Node.js 24 no mini PC, agente instalado como serviço; no app aparece **Agente online**.
- [ ] **Imprimir etiqueta de teste**: sai em segundos e o QR lê no celular.

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

- [ ] Toda sexta (engenheiro): anote no relatório, a partir do *Histórico* e do *A descontar*:
  - QR lido → retirada (meta: até 15 s);
  - retiradas sem QR (meta: menos de 10%);
  - pendências com aviso (meta: 100%);
  - ferramentas não devolvidas por semana (meta: queda de 50% em 60 dias).
- [ ] Toda sexta: baixe as planilhas do histórico e dos descontos e guarde com o relatório.
- [ ] Anote cada problema e pedido de melhoria em `docs/RELATORIO-PILOTO.md`, com data e quem pediu.
- [ ] Capacete que não lê: anote o nome no capacete, o celular e a luz do lugar. Reimprima o
      adesivo pela ficha da pessoa.
