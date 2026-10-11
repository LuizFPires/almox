# Agente de impressão do Almox

Programa pequeno que roda no **mini PC da TV**, na rede da obra. A cada 2 s ele pergunta ao
Almox se há adesivo para imprimir e manda para a impressora de etiquetas (porta 9100).

- Só faz **conexões de saída**: a impressora nunca fica exposta à internet.
- Entra com um **token de dispositivo** (um por mini PC), mostrado uma única vez no app.
- Não grava token, chave nem o conteúdo das etiquetas no log.

## O que precisa

- Mini PC com Windows 10/11 ou Linux, ligado na mesma rede da impressora.
- [Node.js 24 LTS](https://nodejs.org) (mínimo 22.18).
- Impressora de etiquetas de rede com ZPL (Zebra) ou TSPL (TSC, Elgin, Argox), rolo
  60 × 80 mm de poliéster ou vinil com ribbon de resina, com **IP fixo** na rede.

## Instalação

1. **No app** (login do engenheiro), abra *Cadastros › Impressora*:
   - preencha o IP e a porta da impressora (normalmente 9100) e a linguagem; salve;
   - em *Agente de impressão*, toque em **Cadastrar mini PC**. Aparecem três linhas
     (`ALMOX_SUPABASE_URL`, `ALMOX_CHAVE_PUBLICA`, `ALMOX_TOKEN_DISPOSITIVO`).
     **O token aparece só dessa vez**: copie antes de sair da tela.
2. **No mini PC**, copie a pasta `agente-impressao` para um lugar fixo
   (`C:\Program Files\Almox\agente-impressao` ou `/opt/almox/agente-impressao`).
3. Copie `.env.example` para `.env` e cole as três linhas do passo 1.
4. Instale como serviço, para ligar sozinho com o PC e voltar se cair:
   - **Windows** (PowerShell como administrador, dentro da pasta):
     `powershell -ExecutionPolicy Bypass -File instalar\windows.ps1`
   - **Linux** (dentro da pasta): `sudo sh instalar/linux.sh`
5. Volte à tela *Impressora* do app: deve aparecer **Agente online**. Toque em
   **Imprimir etiqueta de teste** e confira a etiqueta.

O `.env` guarda o token: quem tem o token consegue ver a fila de impressão da obra. Os
instaladores já protegem a pasta. No Windows o agente roda como *Serviço Local* (sem
privilégio de administrador), só administradores alteram a pasta e outros usuários não
leem o `.env`. No Linux o `.env` fica com permissão 600.

## Dia a dia

| Situação | O que aparece no app | O que fazer |
|---|---|---|
| Tudo certo | "Agente online", adesivo "Impresso no almoxarifado" | — |
| Mini PC desligado ou sem internet | "Agente offline desde HH:mm"; adesivos ficam "Na fila" | Ligar o mini PC. A fila imprime sozinha quando ele volta. |
| Impressora desligada, sem papel ou IP errado | "Impressora sem resposta: …" | Conferir a impressora e o IP; tocar em **Reimprimir** na ficha da pessoa. |
| Token revogado ou mini PC trocado | "Agente nunca conectou" ou offline | Cadastrar o mini PC de novo e trocar o token no `.env`. |

Log do agente:
- Windows: `logs\agente.log` dentro da pasta;
- Linux: `journalctl -u almox-agente -f`.

Para remover o serviço: `instalar\windows.ps1 -Remover` ou `sudo sh instalar/linux.sh remover`.

## Testar sem impressora

A impressora simulada recebe as etiquetas na porta 9101 e grava cada uma em
`etiquetas-recebidas/`:

```sh
node src/simulador.ts 9101     # num terminal
node src/agente.ts             # em outro (com o .env preenchido)
```

No app, cadastre a impressora com IP `127.0.0.1` e porta `9101`.

## Desenvolvimento

Código em TypeScript rodado direto pelo Node (sem build, sem dependências). Os testes
ficam em `src/agente.test.ts` e rodam com o `npm test` da raiz; o `npm run lint` da raiz
confere os tipos (`tsc -p agente-impressao`).
