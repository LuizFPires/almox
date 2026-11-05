# Controle de materiais (M13) — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** dar ao Almox um modo "Materiais" com entrada, saída, contagem, saldo, extrato, aviso de limite por push, edição pelo engenheiro e uma terceira tela na TV, sem mudar o fluxo de ferramentas.

**Arquitetura:**
- Banco: tabelas novas `material`, `movimento_material`, `movimento_material_versao`, `contagem_material` e `pedido_cadastro_material`. Toda escrita passa por RPC `security definer` que trava a linha do material (`for update`) e mantém `material.saldo` na mesma transação.
- Edição do engenheiro: gera uma versão imutável. A view `extrato_material` lê sempre a versão vigente.
- Avisos: usam a fila `envio` e o processador de push que já existem.
- Telas: ficam em `/materiais/*`, com a chave Ferramentas | Materiais guardada em cookie.
- TV: ganha a fase `materiais` no loop.

**Stack:** Next.js App Router + React + TypeScript strict, Tailwind v4 (tokens em `app/globals.css`), Supabase (Postgres/RLS/Realtime), Web Push (VAPID), IndexedDB (fila offline), Vitest, pgTAP, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-controle-materiais-design.md`. Os protótipos aprovados estão em `docs/superpowers/specs/prototipos-materiais/` e são a referência visual de todas as telas.

## Global Constraints

Leia `CLAUDE.md` antes de começar. As regras abaixo valem para todas as tarefas.

**Repositório e ordem**
- Trabalhe na worktree `C:\Users\Luiz Felipe\Desktop\Claude\10 ALMOX-m13`, branch `feat/m13-materiais`.
- **Migrations:** timestamps a partir de `20261104130000`, em passos de 10 min. Na pasta principal há migrations não commitadas até `20261104120000` (convites e ioo), e a ordem precisa continuar válida quando elas entrarem.
- **Testes pgTAP:** numeração a partir de `042`. Os números `039`–`041` estão reservados para o trabalho pausado.
- **Nunca** toque na pasta `C:\Users\Luiz Felipe\Desktop\Claude\10 ALMOX`. Ela tem trabalho não commitado do dono.

**Idioma e textos**
- Domínio e UI em português: tabelas, colunas, funções e textos. Textos curtos, em linguagem de obra.

**Banco**
- `snake_case`, nomes no singular, RLS ativa em toda tabela.
- `grant` explícito e `revoke … from public, anon` para toda tabela, função e view nova.
- Funções `security definer` com `set search_path = ''` e todos os objetos qualificados pelo schema (`public.`, `privado.`, `(select auth.uid())`).
- Views com `security_invoker = true`.
- Escrita só por RPC. O cliente não tem `insert`/`update`/`delete` em nenhuma tabela de materiais.

**Erros das RPCs**
- `42501` = sem permissão; `22023` = entrada inválida; `P0002` = não encontrado.
- Erros de negócio de materiais na faixa **`AL101`–`AL109`**:
  - `AL101` saldo insuficiente;
  - `AL102` desfazer expirado ou não permitido;
  - `AL103` material inativo;
  - `AL104` nome de material repetido na obra;
  - `AL105` inativar com saldo diferente de zero;
  - `AL106` lançamento não editável;
  - `AL107` hora do aparelho fora da janela de 24 h.
  - Antes de usar, confira com `grep -rn "AL10[1-9]" supabase/` que a faixa está livre.

**Quantidades**
- Tipo `numeric(12,2)`, sempre maior que 0 e no máximo `999999`.
- **Unidades inteiras:** `sc`, `un`, `barra`, `rolo`, `lata`. **Unidades com decimal:** `m³`, `kg`, `m`, `m²`, `l`. Valide no servidor e no cliente.
- **Exibição:** `formatarQuantidade` (ex.: `1.500`, `2,5`). Nunca use `toLocaleString`.

**Saldo**
- `material.saldo >= 0`, garantido por `check` e pelas RPCs.
- O saldo é a soma das quantidades vigentes dos movimentos `entrada`, `saida` e `ajuste` não apagados. `conferencia` nunca conta.

**Avisos**
- **Estoque cheio** = saldo logo depois da última entrada.
- **Limite:**
  - aviso por `quantidade` → limite = `aviso_valor`;
  - aviso por `percentual` → limite = `round(estoque_cheio * aviso_valor / 100, 2)`.
- **"Perto do limite"** = saldo `<= limite * 1.5` e `> limite`.
- **Disparo:** quando o saldo cruza o limite para baixo ou para ele (antes `> limite`, depois `<= limite`) e o aviso não está disparado. Envia **push para todo usuário de `usuario_obra` da obra** e marca o aviso como disparado.
- **Rearme:** o aviso volta a ficar armado quando o saldo fica `> limite`.
- **Salvar o aviso** com o saldo já `<= limite`, estando não disparado, também dispara na hora.

**Datas, busca e acessibilidade**
- Datas exibidas no fuso `America/Sao_Paulo` (`lib/formatos/datas.ts`).
- Busca normalizada dos dois lados com `normalizarTexto`.
- Alvos de toque ≥ 44 px; `<button>` de verdade; `aria-label` em botão só com ícone.

**Ferramentas**
- O fluxo de ferramentas não muda. A regra 9 (movimentos de ferramenta imutáveis) continua valendo. A edição vale **só** para materiais.

**Verificação**
- `npm run lint`, `npm test` e `npx supabase test db` verdes ao fim de cada tarefa.
- `npm run e2e` verde na Tarefa 17.

## Review Focus

Cinco situações que o spec implica e que nenhum fluxo feliz cobre, da mais provável para a menos:

1. **Dois celulares pegam a última quantidade ao mesmo tempo.** Um grava e o outro recebe `AL101`. O saldo nunca fica negativo. Teste: Tarefa 4, `043_material_lancamentos`, com duas saídas seguidas maiores que o saldo restante.
2. **Quantidade digitada de jeitos diferentes.** "1.500" vira 1500; "1,5" em `sc` é recusado; "1,5" em `m³` vira 1,5; "abc" ou vazio desliga o botão. Teste: Tarefa 1 (`lerQuantidade`) e Tarefa 4 (RPC recusa decimal em `sc` com `22023`).
3. **Saída offline que sincroniza depois de o saldo ter caído.** O item vira "recusado", com a mensagem "Saldo insuficiente…", e fica visível na fila. Não grava nada. Teste: Tarefa 15 (`destinoDoEnvio` com `AL101` → recusado).
4. **Material editado, inativado ou com saldo mexido no meio de uma contagem.** O ajuste usa o `saldo_visto` e não sobrescreve as saídas lançadas no meio. Material inativo é recusado com `AL103`. Teste: Tarefa 5, com saída entre o rascunho e o envio da contagem.
5. **Desfazer depois de 60 s, ou por outra pessoa.** Recebe `AL102` e o saldo não muda. Teste: Tarefa 4.

---

### Tarefa 1: Formatar e ler quantidades

**Arquivos:**
- Criar: `lib/formatos/quantidade.ts`
- Teste: `lib/formatos/quantidade.test.ts`

**Interfaces:**
- Produz:
  - `formatarQuantidade(n: number): string`
  - `lerQuantidade(texto: string): number | null`
  - `UNIDADES_MATERIAL: readonly ['sc','m³','kg','un','m','m²','l','barra','rolo','lata']`
  - `type UnidadeMaterial = (typeof UNIDADES_MATERIAL)[number]`
  - `unidadeAceitaDecimal(u: UnidadeMaterial): boolean`
  - `quantidadeValida(n: number, u: UnidadeMaterial): boolean`

- [ ] **Passo 1: escrever os testes que falham**

```ts
describe('formatarQuantidade', () => {
  it('milhar com ponto', () => expect(formatarQuantidade(1500)).toBe('1.500'))
  it('decimal com vírgula, sem zeros sobrando', () => {
    expect(formatarQuantidade(2.5)).toBe('2,5')
    expect(formatarQuantidade(1234567.25)).toBe('1.234.567,25')
    expect(formatarQuantidade(-22)).toBe('-22')
  })
})
describe('lerQuantidade', () => {
  it.each([['1.500',1500],['1500',1500],['2,5',2.5],['1.234,75',1234.75],[' 10 ',10]])('%s', (t, n) => expect(lerQuantidade(t)).toBe(n))
  it.each(['', 'abc', '1,234', '-3', '1.5.0'])('recusa %s', (t) => expect(lerQuantidade(t)).toBeNull())
})
describe('quantidadeValida', () => {
  it('inteira em sc', () => { expect(quantidadeValida(3,'sc')).toBe(true); expect(quantidadeValida(1.5,'sc')).toBe(false) })
  it('decimal em m³ até 2 casas', () => { expect(quantidadeValida(1.25,'m³')).toBe(true); expect(quantidadeValida(1.255,'m³')).toBe(false) })
  it('faixa', () => { expect(quantidadeValida(0,'kg')).toBe(false); expect(quantidadeValida(1_000_000,'kg')).toBe(false) })
})
```

- [ ] **Passo 2:** rodar `npx vitest run lib/formatos/quantidade.test.ts`. Esperado: FALHA (módulo inexistente).
- [ ] **Passo 3: implementar em `lib/formatos/quantidade.ts`.**
  - Copie o padrão `MILHAR`/`COM_MILHAR`/`SEM_MILHAR` de `lib/formatos/moeda.ts`.
  - "1.5" sem vírgula **não** é decimal. Ponto só aparece como separador de milhar em grupos de 3, então `lerQuantidade('1.5')` devolve `null`.
- [ ] **Passo 4:** rodar o mesmo comando. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): formatar e ler quantidades de material`.

---

### Tarefa 2: Regras puras de materiais

**Arquivos:**
- Criar: `lib/dominio/materiais.ts`
- Teste: `lib/dominio/materiais.test.ts`

**Interfaces:**
- Consome: `UnidadeMaterial` (Tarefa 1).
- Produz:
  - `type Aviso = { tipo: 'quantidade' | 'percentual'; valor: number } | null`
  - `type SaldoMaterial = { id: string; nome: string; unidade: UnidadeMaterial; saldo: number; estoqueCheio: number; aviso: Aviso }`
  - `limiteDoAviso(m: Pick<SaldoMaterial,'aviso'|'estoqueCheio'>): number | null`
  - `type EstadoSaldo = 'abaixo' | 'perto' | 'ok' | 'sem_aviso'`
  - `estadoSaldo(m: SaldoMaterial): EstadoSaldo`
  - `ordenarSaldos(lista: SaldoMaterial[]): SaldoMaterial[]` (ordem: abaixo → perto → resto, alfabético dentro de cada grupo)
  - `type ItemContagem = { materialId: string; saldoVisto: number; contado: number }`
  - `type DiferencaContagem = ItemContagem & { diferenca: number }`
  - `diferencasContagem(itens: ItemContagem[]): { menos: DiferencaContagem[]; mais: DiferencaContagem[]; bateu: DiferencaContagem[] }`

- [ ] **Passo 1: escrever os testes que falham.** Valores do spec:

```ts
const cimento = { id:'1', nome:'Cimento CP-II 50 kg', unidade:'sc', saldo:18, estoqueCheio:500, aviso:{tipo:'quantidade',valor:20} } as const
const areia = { id:'2', nome:'Areia média', unidade:'m³', saldo:7, estoqueCheio:14, aviso:{tipo:'percentual',valor:50} } as const
it('limite por quantidade', () => expect(limiteDoAviso(cimento)).toBe(20))
it('limite por % do estoque cheio', () => expect(limiteDoAviso(areia)).toBe(7))
it('sem aviso', () => expect(limiteDoAviso({ aviso:null, estoqueCheio:10 })).toBeNull())
it('estados', () => {
  expect(estadoSaldo(cimento)).toBe('abaixo')
  expect(estadoSaldo({ ...cimento, saldo:30 })).toBe('perto')   // 30 <= 20*1.5
  expect(estadoSaldo({ ...cimento, saldo:31 })).toBe('ok')
  expect(estadoSaldo({ ...cimento, aviso:null })).toBe('sem_aviso')
})
it('ordena abaixo, perto, resto; alfabético dentro', () => { /* monta 4 materiais e confere a ordem dos ids */ })
it('contagem separa menos/mais/bateu pela diferença contado − saldoVisto', () => {
  const r = diferencasContagem([{materialId:'1',saldoVisto:118,contado:96},{materialId:'2',saldoVisto:12,contado:15},{materialId:'3',saldoVisto:14,contado:14}])
  expect(r.menos[0].diferenca).toBe(-22); expect(r.mais[0].diferenca).toBe(3); expect(r.bateu).toHaveLength(1)
})
```

- [ ] **Passo 2:** `npx vitest run lib/dominio/materiais.test.ts`. Esperado: FALHA.
- [ ] **Passo 3:** implementar as funções. Arredonde diferenças com `Math.round(x * 100) / 100`.
- [ ] **Passo 4:** rodar de novo. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): regras puras de saldo, aviso e contagem`.

---

### Tarefa 3: Tabelas, RLS e extrato

**Arquivos:**
- Criar: `supabase/migrations/20261104130000_materiais.sql`
- Teste: `supabase/tests/042_materiais_tabelas.test.sql`

**Interfaces:**
- Produz (tabelas e colunas que as tarefas seguintes usam):
  - **`public.material`:**
    - colunas: `id uuid pk`, `obra_id uuid fk obra`, `nome text not null`, `unidade text check (unidade in (…10…))`, `saldo numeric(12,2) not null default 0 check (saldo >= 0)`, `estoque_cheio numeric(12,2) not null default 0`, `aviso_tipo text check (aviso_tipo in ('quantidade','percentual'))`, `aviso_valor numeric(12,2)`, `aviso_disparado boolean not null default false`, `ativo boolean not null default true`, `criado_em timestamptz default now()`;
    - `check ((aviso_tipo is null) = (aviso_valor is null))`;
    - `aviso_valor` entre 1 e 100 quando o tipo é percentual;
    - índice único `(obra_id, privado.normalizar(nome))`. Crie `privado.normalizar(text)` como `immutable` (`lower` + `unaccent` ou `translate`) se ainda não existir.
  - **`public.contagem_material`:** `id`, `obra_id`, `modo text check (modo in ('ajustar','conferir'))`, `usuario_id`, `criado_em`, `chave_cliente uuid`, com índice único `(obra_id, chave_cliente)`.
  - **`public.movimento_material`:**
    - colunas: `id`, `obra_id`, `material_id fk`, `tipo text check (tipo in ('entrada','saida','ajuste','conferencia'))`, `quantidade numeric(12,2) not null`, `contagem_id uuid null fk`, `usuario_id uuid not null`, `criado_em timestamptz not null default now()` (hora de chegada ao servidor), `registrado_no_aparelho_em timestamptz null`, `chave_cliente uuid null`;
    - quantidade com sinal: `check` de sinal por tipo (`entrada > 0`, `saida < 0`, `ajuste <> 0`);
    - índice único `(obra_id, chave_cliente) where chave_cliente is not null`.
  - **`public.movimento_material_versao`:** `id`, `movimento_id fk`, `quantidade numeric(12,2) not null` (0 = apagado), `motivo text null`, `desfeito boolean not null default false`, `usuario_id`, `criado_em`.
  - **`public.pedido_cadastro_material`:** `id`, `obra_id`, `nome text not null`, `pedido_por uuid`, `status text check (status in ('aberto','cadastrado','dispensado')) default 'aberto'`, `material_id uuid null`, `criado_em`, `resolvido_em`.
  - **View `public.extrato_material`** (`security_invoker = true`):
    - colunas: `id, obra_id, material_id, tipo, quantidade_original, quantidade` (vigente = última versão, ou a original se não houver versão), `apagado` (vigente = 0 e tipo ≠ conferencia), `desfeito`, `editado_por_nome`, `editado_em`, `usuario_nome` (de quem lançou), `criado_em`, `registrado_no_aparelho_em`;
    - nomes vindos de `public.usuario`.
  - **Imutabilidade:** `movimento_material`, `movimento_material_versao` e `contagem_material` recebem os gatilhos `privado.bloquear_alteracao()` (update/delete e truncate), como em `20261011120200_imutabilidade_rpc.sql`.
  - **Privilégios:**
    - `select` para `authenticated` em todas as tabelas e na view, com política `using (privado.tem_acesso(obra_id))`;
    - `movimento_material_versao` usa política por `exists` em `movimento_material`;
    - nenhuma escrita para `authenticated`;
    - `revoke all … from public, anon`.
  - **Realtime:** `alter publication supabase_realtime add table public.material, public.movimento_material`.
  - **Log de alterações:** `create trigger material_log after insert or update on public.material for each row execute function privado.registrar_alteracoes('id','nome','unidade','aviso_tipo','aviso_valor','ativo')`.
  - **TV:** o gatilho `privado.mudou_painel('obra_id')` em `material`, igual ao das tabelas da TV em `20261013160000_painel_versao.sql`.

- [ ] **Passo 1: escrever `042_materiais_tabelas.test.sql`.** Use os IDs do seed (obra `a0000000-0000-4000-8000-000000000001`; engenheiro `b…0001`, almoxarife `b…0002`, consulta `b…0003`, consulta restrita `b…0004`) e cubra:
  - `has_table` para as 5 tabelas e `has_view` para `extrato_material`;
  - como `authenticated` (almoxarife), `insert into public.material` falha com `42501`;
  - um `update` em `movimento_material` (linha inserida como `postgres`) falha com `P0001`;
  - a consulta restrita (`b…0004`) **lê** os materiais da obra 1;
  - um usuário sem vínculo com a obra 2 lê 0 linhas dela;
  - `saldo = -1` falha no `check`.
- [ ] **Passo 2:** `npx supabase db reset && npx supabase test db`. Esperado: o `042` FALHA.
- [ ] **Passo 3:** escrever a migration conforme as Interfaces.
- [ ] **Passo 4:** `npx supabase db reset && npx supabase test db`. Esperado: tudo PASSA. Depois `npm run gen:types`.
- [ ] **Passo 5:** commit `feat(m13): tabelas, RLS e extrato de materiais`.

---

### Tarefa 4: Entrada, saída, desfazer e disparo do aviso

**Arquivos:**
- Criar: `supabase/migrations/20261104140000_materiais_lancamentos.sql`
- Teste: `supabase/tests/043_material_lancamentos.test.sql`

**Interfaces:**
- Consome: as tabelas da Tarefa 3.
- Produz:
  - **`privado.aplicar_movimento_material(p_material uuid, p_delta numeric, p_referencia uuid) returns void`.** Uso interno, só a partir de outras funções.
    - Recebe o material já travado `for update` por quem chama e aplica `saldo + p_delta`. Se ficar `< 0`, levanta `AL101` com a mensagem `'Saldo insuficiente: só tem <saldo> <unidade> de <nome>.'`.
    - Depois chama `privado.avaliar_aviso_material(p_material, v_antes, p_referencia)`.
  - **`privado.avaliar_aviso_material(p_material uuid, p_saldo_antes numeric, p_referencia uuid) returns void`.**
    - Calcula o limite como em Global Constraints.
    - Se **cruzou para baixo** e o aviso não estava disparado: marca disparado e insere em `public.envio` uma linha `(obra_id, 'limite_material', 'push', uo.usuario_id::text, p_referencia, jsonb_build_object('material', id))` para **cada** `usuario_obra` da obra, com `on conflict do nothing`.
    - Se o saldo ficou `> limite` e o aviso estava disparado: desarma.
  - **`public.registrar_entrada_material(p_obra uuid, p_material uuid, p_quantidade numeric, p_chave uuid default null, p_quando timestamptz default null) returns uuid`.**
    - Atualiza `estoque_cheio := saldo depois`.
  - **`public.registrar_saida_material(p_obra uuid, p_material uuid, p_quantidade numeric, p_chave uuid default null, p_quando timestamptz default null) returns jsonb`**, que devolve `{ "id": uuid, "aviso": boolean }`.
    - `aviso` = esta saída disparou o aviso.
  - **`public.desfazer_saida_material(p_obra uuid, p_movimento uuid) returns void`.**
    - Só o mesmo `usuario_id`, só para tipo `saida`, só até `criado_em + interval '60 seconds'`, e só se ainda não tiver versão. Senão, `AL102`.
    - Insere uma versão com `quantidade 0, desfeito true` e aplica o delta inverso.
  - **Regras comuns às RPCs:**
    - `privado.pode_lancar(p_obra)` primeiro, senão `42501`;
    - idempotência pela `chave_cliente`, como em `registrar_retirada` (`20261013000000_metricas_piloto.sql`);
    - material de outra obra → `P0002`; material inativo → `AL103`;
    - `p_quantidade` validada pela regra de unidade, senão `22023`;
    - `p_quando` fora de `now()-24h … now()+5min` → `AL107`; dentro da janela, é gravado em `registrado_no_aparelho_em` (o `criado_em` é sempre `now()`);
    - `security definer`, `set search_path = ''`, `revoke … from public, anon`, `grant execute … to authenticated`.

- [ ] **Passo 1: escrever `043`.**
  - Prepare como `postgres`: o material "Cimento" (`sc`) com aviso de quantidade 20 e saldo 0.
  - Cubra:
    - a consulta chama `registrar_entrada_material` → `42501`;
    - o almoxarife lança entrada de 118 → saldo 118 e `estoque_cheio` 118;
    - a mesma chave repetida devolve o mesmo id e o saldo continua 118;
    - entrada de `1.5` em `sc` → `22023`;
    - saída de 100 → saldo 18, `aviso: true` e uma linha em `envio` com tipo `limite_material` **para cada linha de `usuario_obra` da obra 1** (compare as contagens no próprio teste, sem número fixo);
    - outra saída de 1 → `aviso: false` e nenhuma linha nova em `envio`;
    - saída de 50 com saldo 17 → `AL101`, e o saldo continua 17;
    - entrada de 10 (saldo 27 > 20) → `aviso_disparado = false`;
    - desfazer a saída de 1 pelo próprio almoxarife → saldo + 1;
    - desfazer pelo engenheiro → `AL102`;
    - desfazer com `criado_em` forçado para 2 minutos atrás → `AL102`;
    - `p_quando` de 25 h atrás → `AL107`;
    - `material.saldo` = soma de `extrato_material.quantidade` (sem conferência).
- [ ] **Passo 2:** `npx supabase db reset && npx supabase test db`. Esperado: o `043` FALHA.
- [ ] **Passo 3:** escrever a migration. Insira `'limite_material'` em `public.tipo_envio` com `alter type … add value if not exists`, numa migration separada **antes** desta (`20261104135000_tipo_envio_materiais.sql`), porque um valor novo de enum não pode ser usado na mesma transação. Ponha no mesmo arquivo `'pedido_cadastro_material'` e `'material_cadastrado'`.
- [ ] **Passo 4:** rodar de novo. Esperado: PASSA. Depois `npm run gen:types`.
- [ ] **Passo 5:** commit `feat(m13): entrada, saída, desfazer e aviso de limite`.

---

### Tarefa 5: Contagem

**Arquivos:**
- Criar: `supabase/migrations/20261104150000_materiais_contagem.sql`
- Teste: `supabase/tests/044_material_contagem.test.sql`

**Interfaces:**
- Consome: `privado.aplicar_movimento_material` (Tarefa 4).
- Produz: **`public.registrar_contagem_material(p_obra uuid, p_modo text, p_itens jsonb, p_chave uuid default null, p_quando timestamptz default null) returns uuid`**, que devolve o `contagem_material.id`.
  - `p_itens` = `[{ "material": uuid, "saldo_visto": number, "contado": number }]`, com 1 a 500 itens.
  - Para cada item, `dif = contado − saldo_visto`:
    - modo `ajustar` com `dif ≠ 0`: insere um movimento `ajuste` com `quantidade = dif` e aplica o delta (pode dar `AL101` se o saldo atual + dif < 0, e nesse caso a contagem inteira volta);
    - `dif = 0`: insere `conferencia` com quantidade 0;
    - modo `conferir` com `dif ≠ 0`: insere `conferencia` com `quantidade = dif`, sem mexer no saldo.
  - Permissão: `pode_lancar`. Idempotência em `contagem_material.chave_cliente`. Material inativo → `AL103`.

- [ ] **Passo 1: escrever `044`:**
  - ajustar: saldo 118, `saldo_visto` 118, contado 96 → saldo 96, e o extrato tem um `ajuste` de −22;
  - ajustar para cima: saldo 12, contado 15 → saldo 15, com `ajuste` +3 (nunca `entrada`);
  - conferir: saldo 118, contado 96 → saldo 118, com `conferencia` de −22;
  - item que bateu → `conferencia` com quantidade 0;
  - **saída no meio:** `saldo_visto` 118, uma saída de 10 lançada antes do envio (saldo 108) e contado 96 → ajuste de −22 e saldo **86**;
  - ajuste que deixaria o saldo negativo → `AL101`, e nenhum item da contagem gravado;
  - a consulta → `42501`;
  - um ajuste que cruza o limite gera `envio`.
- [ ] **Passo 2:** rodar `npx supabase db reset && npx supabase test db`. Esperado: FALHA.
- [ ] **Passo 3:** escrever a migration.
- [ ] **Passo 4:** rodar de novo. Esperado: PASSA. `npm run gen:types`.
- [ ] **Passo 5:** commit `feat(m13): contagem com ajustar ou só conferir`.

---

### Tarefa 6: Edição pelo engenheiro

**Arquivos:**
- Criar: `supabase/migrations/20261104160000_materiais_edicao.sql`
- Teste: `supabase/tests/045_material_edicao.test.sql`

**Interfaces:**
- Produz: **`public.editar_movimento_material(p_obra uuid, p_movimento uuid, p_quantidade numeric, p_motivo text default null) returns void`.**
  - Só `privado.eh_engenheiro(p_obra)`, senão `42501`.
  - Tipos editáveis: `entrada`, `saida`, `ajuste`. `conferencia` → `AL106`.
  - `p_quantidade` é a nova quantidade **com sinal**, e `0` apaga o lançamento. O sinal precisa bater com o tipo (`entrada >= 0`, `saida <= 0`); se não bater, `22023`.
  - `delta = nova − vigente`, aplicado com `privado.aplicar_movimento_material`. Se o saldo ficasse negativo, `AL101`. Grava a versão com o motivo.
  - Se o movimento é a entrada mais recente não apagada do material, `estoque_cheio += delta`.

- [ ] **Passo 1: escrever `045`:**
  - o engenheiro muda a saída de −100 para −90 → saldo + 10; o extrato mostra `quantidade` −90, `quantidade_original` −100 e `editado_por_nome` preenchido;
  - o engenheiro apaga uma entrada de 500 com saldo 118 → `AL101`;
  - o engenheiro apaga uma saída → `apagado = true` e o saldo é recomposto;
  - o almoxarife edita → `42501`;
  - editar uma conferência → `AL106`;
  - uma entrada positiva editada para valor negativo → `22023`;
  - uma edição que faz o saldo voltar acima do limite rearma o aviso.
- [ ] **Passo 2:** rodar `npx supabase db reset && npx supabase test db`. Esperado: FALHA.
- [ ] **Passo 3:** escrever a migration.
- [ ] **Passo 4:** rodar de novo. Esperado: PASSA. `npm run gen:types`.
- [ ] **Passo 5:** commit `feat(m13): edição de lançamentos de material pelo engenheiro`.

---

### Tarefa 7: Cadastro de material, aviso e pedido de cadastro

**Arquivos:**
- Criar: `supabase/migrations/20261104170000_materiais_cadastro.sql`
- Teste: `supabase/tests/046_material_cadastro.test.sql`

**Interfaces:**
- Produz:
  - **`public.salvar_material(p_obra uuid, p_id uuid, p_nome text, p_unidade text, p_pedido uuid default null) returns uuid`.**
    - `p_id null` cria o material.
    - Só engenheiro.
    - Nome repetido (normalizado) → `AL104`.
    - Trocar a unidade de um material com movimentos → `22023`.
    - Com `p_pedido`, marca o pedido como `cadastrado` e enfileira `material_cadastrado` (push) para `pedido_por`.
  - **`public.salvar_aviso_material(p_obra uuid, p_material uuid, p_tipo text, p_valor numeric) returns void`.**
    - `p_tipo null` remove o aviso.
    - Só engenheiro.
    - Depois de salvar: se o saldo já está `<= limite` e o aviso não estava disparado, dispara (enfileira `limite_material` com `referencia = gen_random_uuid()`) e marca disparado. Se o saldo está `> limite`, desarma.
  - **`public.inativar_material(p_obra uuid, p_material uuid) returns void`.** Só engenheiro. Saldo ≠ 0 → `AL105`.
  - **`public.pedir_cadastro_material(p_obra uuid, p_nome text) returns uuid`.**
    - Permissão `pode_lancar`.
    - Nome com 2 a 80 caracteres.
    - Enfileira `pedido_cadastro_material` (push) para cada engenheiro da obra.
  - **`public.dispensar_pedido_material(p_obra uuid, p_pedido uuid) returns void`.** Só engenheiro.

- [ ] **Passo 1: escrever `046`:**
  - o engenheiro cria "Cimento CP-II 50 kg" `sc`;
  - criar "cimento cp-ii 50 KG" → `AL104`;
  - o almoxarife cria → `42501`;
  - aviso de 20 com saldo 18 → 1 envio por usuário da obra, e `aviso_disparado = true`;
  - salvar de novo com 20 → nenhum envio novo;
  - aviso de 10 (saldo 18 > 10) → desarmado;
  - percentual de 150 → `22023`;
  - inativar com saldo 18 → `AL105`;
  - o almoxarife pede "Cal hidratada" → envio para o engenheiro;
  - `salvar_material(…, p_pedido)` → pedido `cadastrado` e envio `material_cadastrado` para o almoxarife;
  - o log de alterações recebe linha para nome e aviso.
- [ ] **Passo 2:** rodar `npx supabase db reset && npx supabase test db`. Esperado: FALHA.
- [ ] **Passo 3:** escrever a migration.
- [ ] **Passo 4:** rodar de novo. Esperado: PASSA. `npm run gen:types`.
- [ ] **Passo 5:** commit `feat(m13): cadastro de material, aviso e pedido de cadastro`.

---

### Tarefa 8: Mensagens de push dos materiais

**Arquivos:**
- Criar: `supabase/migrations/20261104180000_materiais_envio.sql` (redefine `public.dados_envio`)
- Modificar:
  - `lib/envios/mensagens.ts`
  - `lib/envios/processar.ts` (`type Dados` l.19-41 e `montar` l.44)
- Teste:
  - `lib/envios/mensagens.test.ts`
  - `supabase/tests/047_material_envio.test.sql`

**Interfaces:**
- Produz:
  - `notificacaoLimiteMaterial(d: { material: string; saldo: string; limite: string; unidade: string; obra: string; materialId: string }): Notificacao`
  - `notificacaoPedidoCadastro(d: { quem: string; nome: string }): Notificacao`
  - `notificacaoMaterialCadastrado(d: { nome: string; materialId: string }): Notificacao`
  - Em `dados_envio`, um `elsif` para cada um dos 3 tipos, **antes** do `else` final, que hoje assume `ocorrencia`. Cada um devolve os campos acima. Os números já saem formatados no TS com `formatarQuantidade`, a partir dos números crus.

- [ ] **Passo 1: testes (textos exatos do spec):**

```ts
expect(notificacaoLimiteMaterial({ material:'Cimento CP-II', saldo:'18', limite:'20', unidade:'sc', obra:'Obra Betim', materialId:'m1' }))
  .toEqual({ titulo:'Cimento CP-II abaixo do limite', corpo:'Obra Betim: restam 18 sc (limite 20). Hora de pedir mais.', url:'/materiais/m1' })
expect(notificacaoPedidoCadastro({ quem:'Marcos', nome:'Cal hidratada 20 kg' }))
  .toEqual({ titulo:'Pedido de cadastro de material', corpo:'Marcos pediu o cadastro de: Cal hidratada 20 kg', url:'/cadastros/materiais' })
expect(notificacaoMaterialCadastrado({ nome:'Cal hidratada 20 kg', materialId:'m9' }))
  .toEqual({ titulo:'Material cadastrado', corpo:'Cal hidratada 20 kg já pode ser lançado.', url:'/materiais/m9' })
```

  Em `047`: como `service_role`, `dados_envio(<envio limite_material>)` devolve `tipo`, `material`, `saldo`, `limite`, `unidade` e `inscricoes`.
- [ ] **Passo 2:** rodar `npx vitest run lib/envios` e `npx supabase test db`. Esperado: FALHA.
- [ ] **Passo 3:** implementar. Some os 3 tipos ao union `Dados.tipo` e aos `case` de `montar`, só com `notificacao` (sem e-mail).
- [ ] **Passo 4:** rodar de novo. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): notificações de limite e de cadastro de material`.

---

### Tarefa 9: Camada de dados e ações do servidor

**Arquivos:**
- Criar:
  - `lib/dados/materiais.ts` (`import 'server-only'`)
  - `app/(app)/materiais/acoes.ts`
- Teste: `lib/dominio/materiais-erros.test.ts` (mapeamento de erros, função pura em `lib/dominio/materiais.ts`)

**Interfaces:**
- Consome: as RPCs das Tarefas 4–7 e `SaldoMaterial` (Tarefa 2).
- Produz:
  - **Leitura (`lib/dados/materiais.ts`):**
    - `listarSaldos(obraId: string): Promise<SaldoMaterial[]>` (só materiais ativos)
    - `maisUsados(obraId: string): Promise<string[]>` (ids por número de saídas nos últimos 30 dias)
    - `type LinhaExtrato` = linha de `extrato_material` em camelCase, mais `materialNome` e `unidade`
    - `extrato(obraId: string, materialId?: string, limite = 100): Promise<LinhaExtrato[]>`
    - `fichaMaterial(obraId: string, id: string): Promise<{ material: SaldoMaterial; ultimaDivergencia: LinhaExtrato | null; extrato: LinhaExtrato[] } | null>`
    - `pedidosAbertos(obraId: string): Promise<{ id: string; nome: string; pedidoPor: string; criadoEm: string }[]>`
  - **Erros (`lib/dominio/materiais.ts`):** `mensagemErroMaterial(codigo: string | undefined, mensagem?: string): string`
    - `AL101` → repassa a mensagem do servidor;
    - `AL102` → `'Não dá mais para desfazer. Peça ao engenheiro para corrigir.'`;
    - `AL103` → `'Este material foi desativado.'`;
    - `AL104` → `'Já existe um material com esse nome.'`;
    - `AL105` → `'Só dá para desativar com saldo zero.'`;
    - `AL106` → `'Conferência não se edita.'`;
    - `AL107` → `'Hora do celular errada. Acerte o relógio e tente de novo.'`;
    - `22023` → repassa a mensagem;
    - qualquer outro → `'Não deu certo. Tente de novo.'`.
  - **Ações do servidor (`app/(app)/materiais/acoes.ts`):** cada uma chama `obterSessao()`, confere a permissão com `podeLancar`/`podeCadastrar`, chama a RPC e, no sucesso, faz `revalidatePath('/materiais')` e `enviarDepois()`. Todas devolvem `{ ok: true, ... } | { ok: false; erro: string }`.
    - `registrarEntrada(p: { materialId: string; quantidade: number; chave: string }): Promise<{ ok: true; id: string } | { ok: false; erro: string }>`
    - `registrarSaida(p: { materialId; quantidade; chave }): Promise<{ ok: true; id: string; aviso: boolean } | { ok: false; erro: string }>`
    - `desfazerSaida(movimentoId: string)`
    - `registrarContagem(p: { modo: 'ajustar'|'conferir'; itens: ItemContagem[]; chave: string })`
    - `editarMovimento(p: { movimentoId; quantidade; motivo?: string })`
    - `salvarMaterial(p: { id?: string; nome; unidade: UnidadeMaterial; pedidoId?: string })`
    - `salvarAviso(p: { materialId; tipo: 'quantidade'|'percentual'|null; valor: number|null })`
    - `inativarMaterial(id: string)`
    - `pedirCadastro(nome: string)`
    - `dispensarPedido(id: string)`

- [ ] **Passo 1:** testes de `mensagemErroMaterial`, um por código da lista acima.
- [ ] **Passo 2:** `npx vitest run lib/dominio/materiais-erros.test.ts`. Esperado: FALHA.
- [ ] **Passo 3:** implementar. Siga o padrão de `app/(app)/pessoa/[id]/retirada/acoes.ts`: argumentos `null` passados como `x as string`, e `p_chave` só se for UUID.
- [ ] **Passo 4:** `npx vitest run` e `npm run lint`. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): dados e ações do servidor de materiais`.

---

### Tarefa 10: Chave de modo, barra inferior, ícones e Início de materiais

**Arquivos:**
- Criar:
  - `design-system/icones/entrada.svg`, `saida.svg` e `contagem.svg` (copiar os paths do protótipo: traço 2.4, viewBox 24)
  - `components/ChaveModo.tsx`
  - `app/(app)/materiais/page.tsx`
  - `components/AcoesMateriais.tsx`
  - `components/ListaSaldos.tsx`
- Modificar:
  - `design-system/icones/catalogo.json`
  - `components/IconeInterface.tsx` (gerado com `node scripts/gerar-icones-interface.mjs`)
  - `components/BarraInferior.tsx`
  - `app/(app)/inicio/page.tsx` (incluir `<ChaveModo modo="ferramentas"/>` abaixo do cabeçalho)
  - `components/AoVivo.tsx` (`EVENTOS` ganha `material: '*'` e `movimento_material: 'INSERT'`)
  - a rota raiz que hoje redireciona para `/inicio`: passa a ler o cookie
- Teste: `components/componentes.test.tsx` (acrescentar casos)

**Interfaces:**
- Produz:
  - **`ChaveModo({ modo }: { modo: 'ferramentas' | 'materiais' })`:**
    - dois `<button>` segmentados ("Ferramentas" e "Materiais"), alvo ≥ 44 px;
    - ao tocar, grava o cookie `almox_modo` (1 ano, `path=/`) e faz `router.push` para `/inicio` ou `/materiais`.
  - **`BarraInferior`:**
    - ganha a prop `modo?: 'ferramentas' | 'materiais'` (padrão `'ferramentas'`);
    - `ITENS_MATERIAIS`: `inicio-materiais` (`/materiais`, ícone `dashboard`), `saldos` (`/materiais/saldos`, `box`), `extrato` (`/materiais/extrato`, `history`), `contagem` (rótulo "Fechamento", `/materiais/contagem`, `contagem`, `lanca: true`), `cadastros-materiais` (`/cadastros/materiais`, `menu`, `lanca: true`);
    - `AbaInferior` passa a ser a união das chaves das duas listas.
  - **`AcoesMateriais({ podeLancar }: { podeLancar: boolean })`:**
    - três links (Entrada → `/materiais/entrada`, Saída → `/materiais/saida`, Contagem → `/materiais/contagem`) em `grid-cols-3`;
    - fundo branco, borda `1.5px #D1D5DB` e raio de cartão;
    - cor do texto e do ícone: Entrada `#14532D`, Saída `#7F1D1D`, Contagem `#111827`;
    - no hover ou foco, a borda fica da cor do texto;
    - para a consulta, não renderiza nada.
  - **`ListaSaldos({ materiais, destaque }: { materiais: SaldoMaterial[]; destaque?: boolean })`:**
    - itens ordenados por `ordenarSaldos`, cada um link para `/materiais/[id]`;
    - selo conforme `estadoSaldo`: `abaixo` → "limite N" (erro); `perto` → "perto do limite" (aviso); `ok` → "ok" (sucesso); `sem_aviso` → sem selo;
    - o item `abaixo` tem fundo `erro-claro`.
  - **`/materiais`:**
    - cabeçalho igual ao do Início, mais `ChaveModo modo="materiais"`, `AcoesMateriais`, a faixa de aviso "N materiais abaixo do limite. Todos da obra foram avisados." (se houver) e o rótulo "Saldo agora" com `ListaSaldos`;
    - `AoVivo tabelas={['material','movimento_material']}`;
    - `<BarraInferior modo="materiais" ativa="inicio-materiais" …/>`.
  - **Rota raiz:** com cookie `almox_modo=materiais`, redireciona para `/materiais`; senão, para `/inicio`.

- [ ] **Passo 1: testes de componente:**
  - `ChaveModo` marca o botão ativo com `aria-pressed="true"`;
  - `BarraInferior modo="materiais"` mostra "Saldos" e "Extrato" e esconde "Fechamento" e "Cadastros" para quem não lança;
  - `AcoesMateriais podeLancar={false}` não renderiza nada;
  - `ListaSaldos` põe o material abaixo do limite em primeiro.
- [ ] **Passo 2:** `npx vitest run components`. Esperado: FALHA.
- [ ] **Passo 3:** implementar. Rode o gerador de ícones e confira que `NomeIconeInterface` inclui `entrada`, `saida` e `contagem`.
- [ ] **Passo 4:** `npx vitest run` e `npm run lint`. Esperado: PASSA. Abra `/materiais` no `npm run dev` e compare com o protótipo.
- [ ] **Passo 5:** commit `feat(m13): modo Materiais, barra, ícones e Início`.

---

### Tarefa 11: Gaveta de quantidade, entrada e saída

**Arquivos:**
- Criar:
  - `components/GavetaQuantidade.tsx`
  - `app/(app)/materiais/entrada/page.tsx` e `app/(app)/materiais/saida/page.tsx` (server: lista e dados)
  - `app/(app)/materiais/FluxoLancamento.tsx` (cliente, compartilhado)
  - `app/(app)/materiais/pronto/page.tsx`
- Teste: `components/GavetaQuantidade.test.tsx`

**Interfaces:**
- Consome:
  - `registrarEntrada`, `registrarSaida` e `desfazerSaida` (Tarefa 9);
  - `formatarQuantidade`, `lerQuantidade` e `quantidadeValida` (Tarefa 1);
  - `limiteDoAviso` (Tarefa 2).
- Produz:
  - **`GavetaQuantidade(props: { tipo: 'entrada'|'saida'; material: SaldoMaterial; aberta: boolean; ocupado: boolean; onFechar(): void; onConfirmar(quantidade: number): void })`.**
    - Bottom sheet com alça, título (rótulo do tipo e nome), botão ✕ (`aria-label="Fechar"`), `role="dialog"`, `aria-modal="true"`, foco preso, Esc e toque no fundo fecham.
    - Animação de subida com `transform` (0,26 s).
    - Campo numérico grande, digitável: `inputMode="decimal"`, seleciona tudo no foco, reformata com `formatarQuantidade` ao sair. Abaixo dele, a dica "Toque no número para digitar".
    - Botões − e + de 1 em 1. Botões rápidos **+10, +50, +100, +500**.
    - **Prévia:**
      - padrão: "Saldo: X → Y un";
      - saída que cruza o limite: acrescenta "⚠ Fica abaixo do limite de N. Todos da obra serão avisados.";
      - saída maior que o saldo: troca a prévia por "Só tem X un no almox. Não dá para sair mais que o saldo." e desliga o botão.
    - **Botão principal:**
      - entrada: "Continuar" troca a gaveta para a conferência (+X un em verde, nome, hora e quem lança, "O saldo vai ficar em Y", "Confirmar entrada" e "Corrigir");
      - saída: "Registrar saída" chama `onConfirmar` direto.
  - **`FluxoLancamento({ tipo, materiais, ordemMaisUsados, podeCadastrar })`:**
    - busca normalizada e lista. Na saída, ordem por `ordemMaisUsados` e material com saldo 0 desabilitado ("sem saldo"); na entrada, ordem alfabética;
    - gera a `chave` com `crypto.randomUUID()` ao abrir a gaveta;
    - no sucesso, `router.push('/materiais/pronto?tipo=…&id=…&material=…&q=…&aviso=0|1')`;
    - no rodapé da entrada:
      - para o almoxarife: "Não achou? Só o engenheiro cadastra material novo." e o botão "Pedir cadastro", que abre um campo de nome e chama `pedirCadastro`;
      - para o engenheiro: link "＋ Cadastrar material novo" para `/cadastros/materiais/novo`.
  - **`/materiais/pronto`:**
    - check, título ("Entrada registrada" ou "Saída registrada"), "±X un · nome" e "Saldo: Y";
    - selo "Aviso enviado a todos da obra" se `aviso=1`;
    - botões "Outra entrada/saída" e "Voltar ao início";
    - na saída, também "Desfazer (60 s)", com contagem regressiva calculada a partir do `criado_em` do movimento (lido no servidor). Ao expirar, o botão é desligado com o texto "Desfazer expirou".

- [ ] **Passo 1: testes da gaveta (Testing Library):**
  - digitar "1.500" e tocar em +500 → o campo mostra "2.000";
  - saída de material com saldo 118 e quantidade 119 → botão desligado e o texto "Só tem 118";
  - saída de 100 com limite 20 e saldo 118 → mostra "Fica abaixo do limite de 20";
  - entrada: "Continuar" mostra "Confirmar entrada", e `onConfirmar(500)` só é chamado depois dela;
  - Esc chama `onFechar`.
- [ ] **Passo 2:** `npx vitest run components/GavetaQuantidade.test.tsx`. Esperado: FALHA.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** `npx vitest run`, `npm run lint` e conferência manual no `npm run dev` contra o protótipo. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): gaveta de quantidade, entrada e saída`.

---

### Tarefa 12: Tela de contagem

**Arquivos:**
- Criar:
  - `app/(app)/materiais/contagem/page.tsx`
  - `app/(app)/materiais/contagem/FluxoContagem.tsx`
- Teste: `app/(app)/materiais/contagem/rascunho.test.ts` (funções puras do rascunho, em `lib/dominio/materiais.ts`)

**Interfaces:**
- Consome:
  - `registrarContagem` (Tarefa 9);
  - `diferencasContagem` (Tarefa 2);
  - `lerQuantidade` e `quantidadeValida` (Tarefa 1).
- Produz:
  - `chaveRascunhoContagem(obraId: string, dia: string): string` (chave do `localStorage`, com try/catch)
  - `itensDoRascunho(rascunho: Record<string,string>, saldos: SaldoMaterial[]): ItemContagem[]`
    - Ignora campos vazios ou inválidos.
    - O `saldoVisto` é o saldo do material **quando o campo foi preenchido pela primeira vez**. O rascunho guarda `{ valor, saldoVisto }` por material.
  - **Tela 1:**
    - linhas com Material e unidade, "Sistema" e "Contei" (`inputMode="decimal"`, placeholder "—");
    - o texto "Em branco = não contei hoje.";
    - o botão "Revisar contagem".
  - **Tela 2 (revisão):**
    - "Diferenças encontradas" (contou a menos e contou a mais, com sinal);
    - "✓ Bateu certo: …";
    - os dois rádios grandes "Ajustar o saldo pela contagem" e "Só conferir", com os textos do protótipo;
    - o botão "Confirmar contagem".
  - **Pronto:** "Contagem salva", "N materiais com diferença", o texto conforme o modo, "Ver extrato" e "Voltar ao início".

- [ ] **Passo 1:** testes de `itensDoRascunho`:
  - campo vazio é ignorado;
  - "1.500" vira 1500;
  - "1,5" em `sc` é ignorado;
  - `saldoVisto` é preservado mesmo quando o saldo atual muda.
- [ ] **Passo 2:** rodar `npx vitest run` no teste. Esperado: FALHA.
- [ ] **Passo 3:** implementar. O rascunho é apagado ao confirmar.
- [ ] **Passo 4:** `npx vitest run` e `npm run lint`. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): contagem com revisão e escolha de modo`.

---

### Tarefa 13: Saldos, ficha, extrato e edição

**Arquivos:**
- Criar:
  - `app/(app)/materiais/saldos/page.tsx`
  - `app/(app)/materiais/extrato/page.tsx`
  - `app/(app)/materiais/[id]/page.tsx`
  - `components/LinhaExtrato.tsx`
  - `app/(app)/materiais/[id]/EditarLancamento.tsx`
- Teste: `components/componentes.test.tsx` (casos de `LinhaExtrato`)

**Interfaces:**
- Consome: `listarSaldos`, `extrato`, `fichaMaterial` e `editarMovimento` (Tarefa 9).
- Produz:
  - **`LinhaExtrato({ linha, comNome, editavel, onEditar? })`.**
    - Rótulos: `entrada` → "Entrada"; `saida` → "Saída"; `ajuste` → "Ajuste"; `conferencia` com quantidade ≠ 0 → "Conferência · divergência" (fundo `aviso-claro`, "não altera o saldo"); `conferencia` com quantidade 0 → "Conferência ok" ✓.
    - Subtítulo: "hoje HH:mm · Nome". Se houver `registradoNoAparelhoEm`: "lançado às HH:mm, sincronizado às HH:mm".
    - Editado: "editado por Nome às HH:mm (era −100)".
    - Apagado ou desfeito: texto riscado, com "apagado por… às…" ou "desfeito".
    - Quantidade com sinal; positivo em `sucesso`.
  - **Saldos:** grupos "Abaixo do limite" e "Normais" (ou "Todos os materiais"), com `ChaveModo` e `BarraInferior ativa="saldos"`.
  - **Ficha:**
    - saldo grande (vermelho se abaixo);
    - "aviso em N un" ou "aviso em N un (50% do estoque cheio)" ou "sem aviso de limite";
    - barra do saldo até `estoqueCheio`, com um traço no limite;
    - selo "última conferência: −22 un de diferença", se houver;
    - para o engenheiro, o botão "Configurar aviso de limite" (para `/cadastros/materiais/[id]/aviso`);
    - o extrato do material.
  - **Extrato:** todos os materiais, `comNome`, os 100 mais recentes.
  - **`EditarLancamento`** (só engenheiro, linhas não-conferência):
    - abre a `GavetaQuantidade` em modo edição, com a quantidade vigente (valor absoluto), o campo de motivo opcional e os botões "Salvar" e "Apagar lançamento";
    - "Apagar lançamento" pede confirmação na própria gaveta, sem `confirm()`;
    - o erro `AL101` mostra a mensagem do servidor.
    - Para isso, a `GavetaQuantidade` ganha `tipo: 'edicao'` e `quantidadeInicial?: number`.

- [ ] **Passo 1:** testes de `LinhaExtrato`:
  - divergência mostra "não altera o saldo";
  - editada mostra "(era −100)";
  - apagada tem `line-through`;
  - offline mostra "sincronizado às".
- [ ] **Passo 2:** rodar `npx vitest run components`. Esperado: FALHA.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** `npx vitest run` e `npm run lint`. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): saldos, ficha, extrato e edição`.

---

### Tarefa 14: Cadastros › Materiais

**Arquivos:**
- Modificar:
  - `components/AbasCadastros.tsx` (incluir `{ href:'/cadastros/materiais', rotulo:'Materiais' }`; a grade passa a ter 5 colunas, ou rolagem horizontal se não couber em 360 px)
  - `lib/dados/busca-cadastros.ts` (indexar materiais)
- Criar:
  - `app/(app)/cadastros/(listas)/materiais/page.tsx`
  - `app/(app)/cadastros/materiais/novo/page.tsx`
  - `app/(app)/cadastros/materiais/[id]/page.tsx`
  - `app/(app)/cadastros/materiais/FormMaterial.tsx`
  - `app/(app)/cadastros/materiais/[id]/aviso/page.tsx`
  - `app/(app)/cadastros/materiais/[id]/aviso/FormAviso.tsx`
- Teste: `lib/dominio/busca-cadastros.test.ts` (acrescentar o caso de material)

**Interfaces:**
- Consome: `salvarMaterial`, `salvarAviso`, `inativarMaterial`, `pedidosAbertos`, `dispensarPedido` (Tarefa 9) e `limiteDoAviso` (Tarefa 2).
- Produz:
  - **Lista:**
    - no topo, "Pedidos de cadastro" (se houver), com nome, quem pediu e quando, e os botões "Cadastrar" (para `/cadastros/materiais/novo?pedido=<id>&nome=<nome>`) e "Dispensar";
    - os materiais com "unidade · aviso em N un" / "aviso em N%" / "sem aviso";
    - o botão "＋ Novo material".
  - **Material:**
    - nome, unidade (`<select>` com `UNIDADES_MATERIAL`, bloqueado se já houver movimentos), linha "Aviso de limite" (link) e "Salvar";
    - "Desativar material" quando o saldo for 0.
  - **Aviso:**
    - duas opções "Chegar a uma quantidade" e "Chegar a uma %";
    - campo com − e + (passo 1 na quantidade, 5 na %);
    - para %, a prévia "X% de <estoque cheio> un = avisa ao chegar em N un";
    - a caixa "Quem recebe: todos da obra <nome> (engenheiro, almoxarifes e consulta), com notificação no celular. Avisa uma vez ao cruzar o limite e volta a valer depois de uma nova entrada.";
    - os botões "Salvar aviso" e "Remover aviso".
  - O `layout.tsx` de cadastros já bloqueia quem não é engenheiro. A aba aparece só para o engenheiro.

- [ ] **Passo 1:** teste da busca de cadastros: "cimento" acha "Cimento CP-II 50 kg" com destino `/cadastros/materiais/<id>`.
- [ ] **Passo 2:** `npx vitest run lib/dominio/busca-cadastros.test.ts`. Esperado: FALHA.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** `npx vitest run` e `npm run lint`. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): cadastros de materiais e aviso de limite`.

---

### Tarefa 15: Fila offline para materiais

**Arquivos:**
- Modificar:
  - `lib/dominio/offline.ts`
  - `lib/offline/sincronizar.ts` (cadeia de RPC, l.70-97)
  - a migration nova `supabase/migrations/20261104190000_materiais_offline.sql` (redefine `dados_offline` para incluir `materiais: [{id,nome,unidade,saldo,estoque_cheio,aviso_tipo,aviso_valor}]`)
  - `app/(app)/materiais/FluxoLancamento.tsx` e `FluxoContagem.tsx`
- Teste: `lib/dominio/offline.test.ts`

**Interfaces:**
- Produz:
  - **`ItemFila`** vira a união `ItemFilaFerramenta | ItemFilaMaterial`, discriminada por `tipo`.
    - `ItemFilaMaterial = { chave; obra; usuario; tipo: 'material_entrada'|'material_saida'|'material_contagem'; material?: string; materialNome?: string; quantidade?: number; modo?: 'ajustar'|'conferir'; itens?: ItemContagem[]; quando: string; situacao; erro?; tentativas? }`.
    - `ItemFilaFerramenta` é o tipo atual, renomeado.
  - **`saldoComFila(saldo: number, fila: ItemFila[], materialId: string): number`.** Aplica as entradas e saídas da fila em situação `aguardando`.
  - **`enviarFila`** chama as RPCs com `p_quando = item.quando`:
    - `material_entrada` → `registrar_entrada_material`;
    - `material_saida` → `registrar_saida_material`;
    - `material_contagem` → `registrar_contagem_material`.
  - **`mensagemRecusa`:** `AL101` → "Saldo insuficiente quando sincronizou. A saída não foi registrada."; `AL103` → "Material desativado."; `AL107` → como o `AL012` de hoje.
  - **No fluxo:** se a ação do servidor falhar por rede (`TypeError` no fetch, ou `navigator.onLine === false`), o item é guardado com `guardarNaFila`, o app vai para a tela de pronto com `?fila=1` e mostra "Guardado no celular. Envia quando tiver sinal.". A prévia de saldo usa `saldoComFila`.
  - `livresComFila` e `possesComFila` ignoram itens de material.

- [ ] **Passo 1: testes:**
  - `saldoComFila(118, [saida 100 aguardando, entrada 10 recusado], 'm1')` → 18;
  - `destinoDoEnvio({ code: 'AL101' }, 0)` → recusado;
  - `livresComFila` com um item de material na fila não quebra e não muda o resultado.
- [ ] **Passo 2:** `npx vitest run lib/dominio/offline.test.ts`. Esperado: FALHA.
- [ ] **Passo 3:** implementar e rodar `npm run gen:types`.
- [ ] **Passo 4:** `npx vitest run`, `npm run lint` e `npx supabase test db`. Esperado: PASSA.
- [ ] **Passo 5:** commit `feat(m13): lançamentos de material na fila offline`.

---

### Tarefa 16: TV — terceira tela e alerta

**Arquivos:**
- Criar: `supabase/migrations/20261104200000_materiais_tv.sql` (redefine `public.painel_tv` de `20261013160000_painel_versao.sql:45`, incluindo `materiais` = ativos da obra com `id, nome, unidade, saldo, estoque_cheio, aviso_tipo, aviso_valor`)
- Modificar:
  - `lib/dominio/tv.ts`
  - `lib/dados/tv.ts`
  - `app/tv/useLoopTv.ts`
  - `app/tv/PainelTv.tsx`
- Criar: `app/tv/CartaoMaterial.tsx` e `app/tv/AlertaMateriais.tsx`
- Teste:
  - `lib/dominio/tv.test.ts`
  - `supabase/tests/048_tv_materiais.test.sql`

**Interfaces:**
- Consome: `SaldoMaterial`, `estadoSaldo`, `ordenarSaldos` e `limiteDoAviso` (Tarefa 2).
- Produz:
  - `type Fase = … | { tipo: 'materiais'; indice: number }`
  - `proximaFase(fase: Fase, nPaginas: number, temColunas: boolean, nPaginasMateriais: number): Fase`
    - Ordem: páginas → empresas → materiais 0…n−1 → página 0.
    - Pula materiais se `nPaginasMateriais === 0`.
    - Com `nPaginas === 0`, alterna entre página 0 e materiais.
  - `paginasMateriais(lista: SaldoMaterial[]): SaldoMaterial[][]`
    - Ordena com `ordenarSaldos`.
    - 12 por página sem alerta; **8 por página** se algum material estiver `abaixo`.
  - `alertasMateriais(lista: SaldoMaterial[]): SaldoMaterial[]` (os que estão `abaixo`)
  - **`AlertaMateriais({ alertas, variante })`:**
    - `variante: 'faixa' | 'rodape'`;
    - **faixa:** fundo `#DC2626`, círculo "!", texto "N material(is) abaixo do limite · Nome (saldo un) · … Pedir reposição.", com o fundo pulsando entre `#DC2626` e `#B91C1C` a cada 1,6 s (só CSS);
    - **rodapé:** selo "! N materiais abaixo do limite" e os nomes.
  - **`CartaoMaterial`:**
    - nome, saldo grande com a unidade, barra até `estoqueCheio`, traço no limite e a linha de estado ("⚠ abaixo do limite (N)" / "⚠ chegou a X% (N)" / "perto do limite (N)" / "limite N" / "sem aviso" / "sem saldo");
    - `abaixo` em `#7F1D1D`, com borda pulsando por `box-shadow` (CSS);
    - `perto` com a barra `#F4B400`.
  - **`PainelTv`:**
    - título "Materiais na obra" na fase `materiais`;
    - `pontos.total` soma as páginas de materiais;
    - nas fases `pagina` e `empresas`, com alertas, mostra `<AlertaMateriais variante="rodape"/>` no rodapé.
  - **`useLoopTv`:**
    - `Entrada` ganha `nPaginasMateriais`;
    - a fase `materiais` dura `config.tempoPaginaS`;
    - o ramo do painel vazio (l.73-82) deixa de forçar a página 0 quando existe material.
  - **Banco:** o gatilho `privado.mudou_painel` em `material` (Tarefa 3) já sobe a versão a cada saldo novo. Confira que a TV atualiza sem reiniciar a fase.

- [ ] **Passo 1: testes em `tv.test.ts`:**
  - `proximaFase({tipo:'empresas'}, 2, true, 1)` → `{tipo:'materiais', indice:0}`;
  - `proximaFase({tipo:'materiais', indice:0}, 2, true, 1)` → `{tipo:'pagina', indice:0}`;
  - com `nPaginasMateriais` 0, `empresas` → página 0;
  - `paginasMateriais` com 10 materiais e 1 abaixo → páginas de 8 e 2, com o abaixo em primeiro;
  - com 10 materiais e nenhum abaixo → 1 página de 10.

  Em `048`: `painel_tv(<token do seed>)` devolve a chave `materiais` só com os materiais ativos da obra do dispositivo.
- [ ] **Passo 2:** rodar `npx vitest run lib/dominio/tv.test.ts` e `npx supabase test db`. Esperado: FALHA.
- [ ] **Passo 3:** implementar. Anime só com `transform`/`opacity`/`box-shadow` em CSS, sem timers novos.
- [ ] **Passo 4:** `npx vitest run`, `npm run lint` e `npx supabase test db`. Esperado: PASSA. Abra `/tv` no `npm run dev` e compare com `tv-materiais.html`.
- [ ] **Passo 5:** commit `feat(m13): terceira tela da TV com saldo e alerta de materiais`.

---

### Tarefa 17: E2E, documentos e fechamento do milestone

**Arquivos:**
- Criar: `e2e/materiais.spec.ts`
- Modificar:
  - `supabase/seed.sql` (3 materiais na obra 1: Cimento CP-II 50 kg `sc` com saldo 118 e aviso de quantidade 20; Areia média `m³` com saldo 12, estoque cheio 12 e aviso de 50%; Brita 1 `m³` com saldo 14 e sem aviso. Os saldos entram por movimentos de entrada inseridos no seed, para que o saldo bata com o extrato.)
  - `PLAN.md`:
    - linha do M13 na tabela de status;
    - seção `## M13 — Controle de materiais` com as entregas 1–16 marcadas `[x]` e os critérios de aceite do spec §9;
    - M12 "pausado" na tabela;
    - em Decisões (04/11/2026): materiais entram no produto; TV mostra estoque de materiais; edição de materiais pelo engenheiro; contagem com escolha por contagem, gerando "Ajuste"; aviso por % sobre o estoque cheio; M13 antes do M12; pedido de cadastro.
  - `PRD.md`: tirar "Materiais de consumo" do §4.2; criar a seção de materiais (resumo do spec §5); acrescentar as linhas de materiais em §5 (perfis), §7.2 (TV) e §8 (modelo de dados).
  - `CLAUDE.md`:
    - glossário com Material, Saldo, Estoque cheio, Contagem, Ajuste e Aviso de limite;
    - em "Painel da TV", trocar "Sem totais nem estoque na TV" por "Sem totais nem estoque **de ferramentas** na TV; a terceira tela mostra o saldo de materiais";
    - na regra 9, acrescentar "(materiais: edição só pelo engenheiro, com versão)";
    - na estrutura, incluir `/materiais`.
  - `CHANGELOG.md`: entrada do M13.

- [ ] **Passo 1: escrever `e2e/materiais.spec.ts`** com `entrarComo` de `e2e/apoio.ts`. Os casos:
  - **almoxarife:** chave Materiais → Saída → Cimento → +50 duas vezes → "Registrar saída" → "Saldo: 18" e "Aviso enviado a todos da obra" visíveis. Contar os toques a partir de `/materiais` (≤ 5, critério 2 do spec);
  - **almoxarife, entrada:** Entrada → Brita → digitar "1.500" → Continuar → Confirmar → "Saldo: 1.514";
  - **almoxarife, contagem:** Cimento contado 15, "Só conferir" → no extrato, "Conferência · divergência" e o saldo continua 18;
  - **engenheiro:** edita a saída de −100 para −90 → o extrato mostra "(era −100)" e o saldo é 28;
  - **mestre (consulta):** vê `/materiais/saldos` e não vê os botões Entrada, Saída e Contagem;
  - **chave de volta para Ferramentas:** `/inicio` com "Ler QR do capacete";
  - **projeto `tv`:** `/tv` chega à fase "Materiais na obra" e mostra a faixa "abaixo do limite". Use a configuração de tempo curta que os testes de TV já usam.
- [ ] **Passo 2:** `npx supabase db reset && npm run e2e -- materiais`. Esperado: PASSA depois dos ajustes. Rode `npm run e2e` inteiro para confirmar que os testes de ferramentas não mudaram (critério 1).
- [ ] **Passo 3:** atualizar os documentos listados.
- [ ] **Passo 4:** `npm run lint && npm test && npx supabase test db && npm run e2e`. Esperado: tudo verde.
- [ ] **Passo 5:** commit `docs(m13): fecha o M13 — controle de materiais`.
