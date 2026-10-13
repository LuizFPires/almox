# Auditoria de segurança do Almox — 13/10/2026

Varredura geral pedida pelo dono, no mesmo formato da auditoria do revel. Três frentes independentes, só de leitura:
**banco** (38 migrations, RLS, funções, Storage, cron), **aplicação e acesso** (Server Actions, rotas, sessão,
cabeçalhos, TV, uploads, offline) e **infraestrutura** (git, GitHub, Supabase de produção, Vercel, agente de
impressão, backups). Os achados mais graves foram conferidos de novo à mão (ex.: DB-01 no banco local).

## Resumo executivo

- **Nenhuma falha que permita a alguém de fora ler ou alterar dados.** RLS em todas as tabelas, nenhum segredo no
  histórico do git, `npm audit` zerado, regras de negócio (posse, devolução com QR, imutabilidade) presas no banco.
- **Os riscos reais estão em três lugares:**
  1. **Configuração ao redor do código**: repositório público sem proteção da `main`, banco de produção aceitando
     conexão direta de qualquer IP sem SSL obrigatório, senhas de produção em arquivos soltos no notebook.
  2. **Acesso (login)**: trocar a senha não exige nada além da sessão aberta; não há "Esqueci minha senha"; não há
     CSP, e o cookie de sessão (400 dias) é legível por script.
  3. **Permissões finas no banco**: o engenheiro consegue mudar `ativa`/`encerrada_em` da obra direto pela API, sem
     registro — isso desliga o fechamento das 23:59 ou dispara a anonimização da LGPD (DB-01).

## Achados

Legenda da origem: **DB** banco · **APP** aplicação e acesso · **INF** infraestrutura.

### Alta

| ID | Achado | Correção | Onda |
|---|---|---|---|
| INF-01 | Repositório **público**, `main` sem proteção (push direto vira produção), sem secret scanning/push protection e sem Dependabot. | Ruleset na `main` (PR + CI verde, sem force-push), secret scanning + push protection, Dependabot. `permissions: contents: read` no CI. | 1 (painel) |
| INF-02 | `.env.prod-acesso` (senha inicial do engenheiro em prod) e `.env.prod-envios` (`ENVIOS_SEGREDO`, chave VAPID privada) em texto puro na pasta do projeto. Fora do git. | Conferir que estão na Vercel/gerenciador de senhas e **apagar**; trocar a senha do engenheiro se ainda for a inicial. | 1 (manual) |

### Média

| ID | Achado | Correção | Onda |
|---|---|---|---|
| DB-01 | Engenheiro faz `UPDATE` em **todas** as colunas de `obra` (inclusive `ativa`, `encerrada_em`), sem log. `ativa=false` desliga o encerramento e os avisos; `encerrada_em` antigo dispara a anonimização irreversível no dia 1º. Confirmado no banco local. | Só `nome` e `endereco` editáveis; gatilho de alterações em `obra`; teste pgTAP. | **1 (feito)** |
| APP-02 / INF-06 | Trocar a senha só pede a sessão (celular desbloqueado na obra ⇒ conta tomada); `secure_password_change = false`; não derruba outras sessões. | Troca e recuperação **pelo código de 8 dígitos no e-mail** (como o revel), `secure_password_change = true`, salvar a senha encerra as outras sessões. | **1 (feito)** |
| APP-01 / INF-10 | Sem Content-Security-Policy nas páginas; cookie de sessão legível por JS (exigência do `@supabase/ssr` e do modo offline). Um XSS futuro levaria a sessão. | Já aplicada: `frame-ancestors`, `object-src`, `base-uri`, `form-action`. Em **Report-Only**: scripts, conexões, imagens e fontes só do site, do Supabase e do Sentry (0 violações em 10 telas). Nonce descartado: com o pré-render parcial só 6 de 18 scripts o recebiam. Cookie `Secure` na Vercel. | **1 (feito)** · 2 (aplicar) |
| APP-03 | Login e link mágico sem CAPTCHA; o limite do Supabase enxerga o IP da Vercel (todos os usuários juntos). Link mágico repetido esgota a cota de e-mails. | Sai o link mágico (o código substitui); CAPTCHA (Turnstile) e regra no Vercel Firewall para `POST /login`. | **1 (link sai)** · 2 (CAPTCHA) |
| APP-04 / DB-02 | Aprovar TV por código de 6 dígitos: phishing ("aprova essa TV: link") ou erro de digitação aprovam o aparelho de outra pessoa, que passa a ver o painel (nomes) por tempo indeterminado. Limite por IP contornável com IPv6. | Mostrar há quanto tempo o pedido foi feito e recusar pedido velho; push ao engenheiro quando uma TV entra; limite por /64; credencial "só painel" com validade. | 2 |
| INF-03 | Banco de produção: SSL **não** obrigatório e conexões diretas liberadas para `0.0.0.0/0`. A senha do Postgres é a única barreira (ignora RLS). | Ligar "Enforce SSL" e restringir as redes (o app usa só a API). | 1 (painel) |
| INF-04 | Falha nos envios (e-mail/push de aviso) e no cron fica invisível: ninguém confere a resposta do processador nem os jobs. | Registro do último processamento e alerta; Sentry configurado em prod. | 2 |
| INF-05 | Só backup diário, sem PITR, restauração nunca testada, fotos de avaria fora do backup. | Testar restauração no dev; decidir PITR antes de várias obras; registrar o RPO. | 2 (manual) |
| INF-07 | Configuração do Auth de produção não está versionada. | Conferir no painel: URLs exatas, OTP 8 dígitos/15 min, `secure_password_change`, senha vazada (HIBP), SMTP próprio. | 1 (painel) |

### Baixa

| ID | Achado | Correção | Onda |
|---|---|---|---|
| DB-03 | `usuario.nome` editável pelo próprio usuário, sem limite; o histórico mostra o nome atual (o almoxarife pode se renomear como a engenheira). | Nome só pelo engenheiro (o usuário não edita), 2 a 80 caracteres. | **1 (feito)** |
| DB-04 | Consulta restrita de empreiteira vê os nomes de todos os logins da obra. | Restringir à própria empresa. | **1 (feito)** |
| DB-05 | `inscricao_push` sem limite de tamanho nem de quantidade (amplificação de envios). | Tamanhos e no máximo 10 por usuário. | **1 (feito)** |
| DB-06 | Visibilidade e desconto seguem a empresa **atual** da pessoa (troca no meio do dia com ferramenta na mão). | Barrar a troca de empresa com posse aberta. | 2 |
| DB-07 | Sem como revogar um adesivo de QR perdido/copiado. | RPC do engenheiro "trocar QR" + reimpressão. | 2 |
| DB-08 | Lacunas de retenção (LGPD): `avaria.detalhes`, IP do pareamento, logins sem vínculo. | Completar a anonimização. | 2 |
| DB-09 | Sem limite de tamanho em alguns textos e listas (DoS por quem tem login). | Limites nos nomes e na lista de itens. | **1 (feito)** |
| APP-07 | Sessão sem limite de inatividade; JWT vale até 1 h após banir. | `inactivity_timeout`/`timebox` (Pro); considerar JWT de 15 min. | 2 (painel) |
| APP-08 | Enumeração de contas por tempo de resposta (a confirmar). | Tempo mínimo constante + CAPTCHA. | 2 |
| APP-09 | "Dar acesso" vincula login de outra obra sem aceite e revela se a senha ainda é provisória. | Não mostrar o estado da senha a outra obra; convite com aceite. | 2 |
| APP-10 | Senha provisória sem validade. | Validade de 72 h. | 2 |
| APP-11 | `p_quando` aceita hora retroativa (24 h) mesmo online. | Relatórios pela hora de recebimento. | 3 |
| APP-12 | Uploads validados só pelo tipo declarado e pela conversão no navegador. | Aceito (só perfis internos); reprocessar no servidor se virar problema. | aceito |
| APP-13 | Dados offline continuam no celular depois de perder o acesso. | Apagar ao receber 401/42501; validade de 48 h. | 2 |
| APP-14 / DB-13 | URLs de retorno com curinga `/**` (contraria o CLAUDE.md). | URLs exatas. | **1 (feito no local)** · painel |
| APP-15 | Código OTP de 6 dígitos válido por 1 h. | 8 dígitos, 15 min. | **1 (feito no local)** · painel |
| INF-08 | Usuários do `almox-dev` com a mesma senha fraca. | Senha aleatória por usuário. | 1 (manual) |
| INF-09 | Mini PC roubado: o `.env` do agente dá acesso à fila (tokens dos QR a imprimir). | BitLocker/LUKS; procedimento "mini PC sumiu → revogar". | 2 |
| INF-11 | Actions do CI fixadas por tag, sem `permissions:`. | `permissions: contents: read`. | **1 (feito)** |
| INF-12 | O agente aceita `http://` na URL do Supabase. | Exigir `https://` (exceto localhost). | **1 (feito)** |
| INF-13 | Serviço do agente no Linux pouco isolado. | Usuário dedicado + `ProtectSystem=strict`. | 2 |
| INF-14 | URL assinada da foto de avaria dura 1 h; a política diz 10 min. | 600 s. | **1 (feito)** |

### Informativas

- **Funções abertas ao `anon`** (`agente_*`, `painel_tv`, `trocar_codigo_tv`, `consultar_pareamento_tv`): todas exigem
  segredo de 128–256 bits; força bruta inviável. `pedir_pareamento_tv` só `service_role`.
- **E-mail dos avisos** (INF-15): enviar pelo Resend a partir de um **subdomínio** (ex.: `avisos.<domínio>`); o SPF do
  domínio raiz termina em `-all` e o DMARC está em `p=none` (qualquer um pode forjar e-mail em nome da construtora).
- **Organização do Supabase compartilhada** com outros projetos (INF-16): considerar organização própria e MFA
  obrigatório nas contas Supabase, Vercel e GitHub.
- **Política de dados** (INF-17): citar IP do pareamento, backups (~7 dias), logs de Auth/Vercel e a tabela `alteracao`.
- **Obra inativa continua operante** (DB-14): desenho a confirmar com o dono.
- **Compartilhar avaria por WhatsApp** leva nome, empresa e valor: decisão de política de dados, não falha técnica.

## O que está sólido

- **RLS em todas as 29 tabelas**, nenhuma política `using (true)`, `anon` sem privilégio de tabela, privilégios padrão
  revogados, grants por coluna escondendo `qr_token`, hashes de token, `usuario.email` e payload de impressão.
- **Funções `security definer`** com `search_path = ''`, sem SQL dinâmico; cada RPC confere o perfil.
- **Regras de negócio no banco**: movimentos imutáveis (gatilhos), devolução sem QR só de posse manual, conferência de
  10 min presa a usuário/obra/pessoa, alocação com `for update skip locked`, estorno só do engenheiro, chaves
  estrangeiras compostas impedindo misturar obras.
- **Segredos**: nenhum no histórico do git (228 commits varridos); `.env*` ignorado; chave secreta só em
  `lib/supabase/admin.ts` com `server-only`; `/api/envios` com comparação em tempo constante.
- **Sem XSS, IDOR ou open redirect encontrados** (`destinoSeguro` cobre todos os retornos).
- **Token do QR** de 144 bits, nunca em URL nem no cliente; tokens de TV e do agente guardados só como hash.
- **Agente de impressão**: só conexões de saída, só IP privado e portas 9100–9199, payload apagado após imprimir.
- **Sentry** sem dado pessoal; **service worker** não guarda páginas autenticadas; **Sair** apaga o IndexedDB.
- **Prévias da Vercel** atrás do login da Vercel; produção com HSTS de 2 anos, nosniff, `X-Frame-Options DENY`.

## Plano de ação

### Onda 1 — agora

**No código (PR `feat/seguranca-onda-1`):**
1. Banco: colunas da obra travadas + log (DB-01); nome do login só pelo engenheiro (DB-03); consulta restrita só vê
   logins da própria empresa (DB-04); limites em inscrições de push (DB-05) e em textos/listas (DB-09).
2. Acesso no formato do revel: e-mail + senha com "olho"; **"Esqueci ou ainda não tenho senha"** com código de 8 dígitos
   no e-mail (15 min); **trocar a senha também pelo código**; salvar a senha encerra as outras sessões; mensagens claras
   para muitas tentativas e senha fraca; sai o link mágico.
3. CSP (parte aplicada + Report-Only, relatórios em `/api/csp`) e cookie `Secure`; CI com `permissions: contents: read`; agente só `https://`; URL da foto 10 min.

**No painel (dono, com o passo a passo no PR):**
1. GitHub: ruleset na `main`, secret scanning + push protection, Dependabot (INF-01).
2. Apagar `.env.prod-acesso` e `.env.prod-envios` depois de conferir que os valores estão guardados (INF-02).
3. Supabase › Database: **Enforce SSL** e restringir redes (INF-03).
4. Supabase › Authentication: URLs exatas, OTP 8 dígitos / 900 s, Secure password change, proteção de senha vazada,
   modelos de e-mail com o código (`{{ .Token }}`), **SMTP próprio (Resend)** — sem ele o código só chega aos membros
   da organização do Supabase (INF-07).

### Onda 2 — antes de abrir para várias obras

CSP aplicada (sai do Report-Only), CAPTCHA no login, TV com pedido recente + aviso ao engenheiro, monitor de envios e
Sentry, teste de restauração e decisão de PITR, trocar QR perdido, retenção completa, limite de inatividade da sessão,
dados offline com validade, senha provisória com validade, troca de empresa com posse aberta barrada, isolamento do
agente no Linux.

### Onda 3 — quando houver escala

PITR, organização própria no Supabase, relatórios pela hora de recebimento (APP-11), reprocessar uploads no servidor.

## Critérios para fechar a onda 1

- pgTAP cobrindo DB-01, DB-03, DB-04, DB-05, DB-09; e2e do login, da recuperação e da troca de senha.
- Lint, Vitest, pgTAP e e2e verdes; CI verde no PR.
- Itens de painel conferidos pelo dono e marcados no PR.
