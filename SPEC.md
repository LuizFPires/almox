# ALMOX — SPEC técnico

## Arquitetura & stack
- **Frontend:** Next.js
- **Backend:** Supabase
- **Banco:** Supabase
- **Auth:** E-mail e senha
- **Hosting:** Vercel
- **Uso de IA:** Não

**Integrações / APIs externas**
- WhatsApp — **fora do MVP** (Fase 2). No MVP, o engenheiro consulta posse/saldo por uma tela web de relatório.

## Modelo de dados

**Decisões que moldam o esquema**
- **Rastreio por unidade individual:** cada ferramenta física é uma peça com identidade própria (ex.: Carrinho #001), com foto de referência e histórico de avaria. O "saldo" é **derivado** (contagem de unidades por estado), não um campo editável.
- **Multi-obra desde o início:** toda tabela de domínio carrega `obra_id`. O acesso é isolado por obra via RLS no Supabase.
- **Só o almoxarife tem login:** o trabalhador é um cadastro (nome + empreiteira) e apenas assina na tela do device do almoxarife. Não há conta/auth para o trabalhador.

**Entidades**

| Entidade | Descrição | Campos principais |
|---|---|---|
| `perfil` | Almoxarife/usuário logado (1:1 com `auth.users` do Supabase). | `id` (=auth.uid), `nome`, `email` |
| `perfil_obra` | Quais obras cada perfil pode acessar (N:N — base da RLS multi-obra). | `perfil_id`, `obra_id`, `papel` (almoxarife \| engenheiro) |
| `obra` | A obra onde o almoxarifado opera. | `id`, `nome`, `criado_por`, `criado_em` |
| `empreiteira` | Empresa terceirizada à qual o trabalhador pertence. | `id`, `obra_id`, `nome` |
| `trabalhador` | Quem retira/devolve ferramentas. **Sem login.** | `id`, `obra_id`, `nome`, `empreiteira_id` |
| `ferramenta` | O **tipo/modelo** de ferramenta (ex.: "Carrinho de mão"). | `id`, `obra_id`, `nome`, `descricao`, `categoria` |
| `unidade` | A **peça física** individual, com estado e identidade. | `id`, `obra_id`, `ferramenta_id`, `etiqueta`, `estado`, `foto_ref_url` |
| `movimentacao` | O **evento** de entrega ou devolução (o coração do sistema). | `id`, `obra_id`, `tipo` (ENTREGA \| DEVOLUCAO), `trabalhador_id`, `almoxarife_id`, `criado_em`, `assinatura_url`, `observacao` |
| `movimentacao_item` | Cada unidade envolvida num evento + sua prova fotográfica. | `id`, `movimentacao_id`, `unidade_id`, `foto_url`, `avaria` (bool), `observacao` |

Notas:
- Uma `movimentacao` de ENTREGA pode conter vários `movimentacao_item` (João pega 1 carrinho + 1 extensão num único ato, com uma só assinatura).
- **Fotos e assinaturas** (`foto_ref_url`, `foto_url`, `assinatura_url`) são armazenadas no **Supabase Storage**; a tabela guarda apenas a URL/caminho.
- **Saldo disponível** de uma ferramenta = `COUNT(unidade WHERE estado='DISPONIVEL')`. **Em campo** = `COUNT(estado='EM_POSSE')`. Isso alimenta os passos 5 e 7 do Definition of Done e o KPI de "sem extravios" (basta contar unidades em `PERDIDA`).

**Relações (exemplo real)**
No dia 01/08 às 07:25h, o almoxarife Joaquim (`perfil`/`almoxarife_id`), na obra do Supermercado ABC (`obra`), registrou uma `movimentacao` do tipo ENTREGA para o trabalhador João (`trabalhador`, empreiteira XYZ). O evento contém um `movimentacao_item` apontando para a `unidade` Carrinho #001 (`ferramenta` = "Carrinho de mão"), com `foto_url` do momento. A unidade passou de `DISPONIVEL` → `EM_POSSE`. Joaquim recolheu a `assinatura_url` do João para comprovação. Ao devolver no fim do dia, uma nova `movimentacao` do tipo DEVOLUCAO devolve a unidade a `DISPONIVEL` (ou `EM_MANUTENCAO`, se `avaria = true`).

**Estados / ciclos de vida da `unidade`**

Máquina de estados de uma peça física (o que garante o controle de posse):

```
                    ┌────────────── entrega ──────────────┐
                    ▼                                      │
   [DISPONIVEL] ───────────────► [EM_POSSE] ──────────────┘
        ▲   │                        │
        │   │                        ├── devolução OK ─────────► [DISPONIVEL]
        │   │                        ├── devolução c/ avaria ──► [EM_MANUTENCAO]
        │   │                        └── não devolvida/declarada ─► [PERDIDA]
        │   │
        │   └── descarte/baixa ─────────────────────────────► [BAIXADA]
        │
   [EM_MANUTENCAO] ── reparada ──► [DISPONIVEL]   |   ── irreparável ──► [BAIXADA]
```

- **DISPONIVEL** — no almoxarifado, pronta para entrega.
- **EM_POSSE** — entregue a um trabalhador (posse ativa). Toda unidade nesse estado tem uma `movimentacao` de ENTREGA sem DEVOLUCAO correspondente.
- **EM_MANUTENCAO** — devolvida com avaria; fora de circulação até reparo/baixa.
- **PERDIDA** — extraviada (não devolvida). Estado que alimenta o KPI de perdas.
- **BAIXADA** — descartada/aposentada; sai do inventário ativo.

> **Regra de integridade:** o estado da `unidade` só muda através de uma `movimentacao`/`movimentacao_item` (ou de uma ação explícita de baixa/perda registrada). Nunca por edição direta do saldo — o saldo é sempre derivado das unidades.

## Requisitos não-funcionais
- **Performance:** Bem rápido
- **Escala:** Poucas (até 100)
- **Segurança:** Auth por e-mail/senha (Supabase Auth). **Isolamento multi-obra via RLS:** toda tabela de domínio é filtrada por `obra_id`, e as policies só liberam linhas cujo `obra_id` conste em `perfil_obra` do usuário logado — um almoxarife nunca enxerga o estoque/movimentações de outra obra. Buckets do Storage (fotos/assinaturas) com acesso restrito por obra; sem URLs públicas — servir por signed URLs. Segredos só em variáveis de ambiente na Vercel (nunca no cliente).
- **Privacidade / LGPD:** O app coleta **dados pessoais** de trabalhadores (nome, empreiteira, **fotos** e **assinatura**). Diretrizes mínimas:
  - **Base legal / consentimento:** aviso claro no primeiro cadastro do trabalhador e no ato da assinatura de que fotos e assinatura são coletadas para controle de posse de ferramentas; registrar o aceite.
  - **Finalidade e minimização:** usar as fotos só para comprovar entrega/devolução; não coletar dado além do necessário (sem CPF/documento no MVP, salvo se exigido).
  - **Retenção e exclusão:** definir prazo de guarda (sugestão: até o encerramento da obra + período de contestação) e permitir exclusão/anonimização de um trabalhador a pedido.
  - **Acesso restrito:** fotos/assinaturas só acessíveis a usuários da própria obra (ver Segurança/RLS); armazenamento privado com signed URLs.
  - **Titular:** canal para o trabalhador solicitar acesso/remoção dos próprios dados.
- **Acessibilidade:** Sim, boas práticas
- **i18n:** Não, só um
- **Offline:** **Só online no MVP.** Captura offline com sync fica para a Fase 2 (sem edição concorrente do mesmo item). Requer conexão razoável (Wi-Fi/4G) no almoxarifado.

## Restrições
- **Orçamento:** Baixo/enxuto
- **Prazo:** O quanto antes
- **Equipe:** Sozinho(a)
- **Compliance:** Não/não sei
