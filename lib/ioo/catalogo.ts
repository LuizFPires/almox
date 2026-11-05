/** Data catalog, not a list of canned questions. Fields and relationships remain source-owned. */
export const datasets = {
  obras:
    'Lista de obras acessíveis, somente nomes e IDs. Use para listar obras. Para dados de uma obra nomeada, consulte diretamente o conjunto desejado com project_id igual ao nome; não exige consulta prévia.',
  estoque:
    'Unidades físicas por ferramenta: código, status livre/em_uso/manutencao/baixada, própria/alugada, locadora e valor de reposição em centavos. Quantidades atuais, não utilização histórica.',
  posses:
    'Posse atual: ferramenta, código, trabalhador, empresa, desde e via. Quem está com o quê agora. Data filtra início da posse, não histórico de devoluções.',
  pendencias:
    'Posses ainda abertas iniciadas antes do dia atual em São Paulo: ferramentas não devolvidas de dias anteriores. Não confundir toda ferramenta em uso com atraso.',
  historico:
    'Movimentações imutáveis: retirada, devolucao e estorno, data, trabalhador, unidades e avarias. Período inclusivo em São Paulo. Estorno não apaga o movimento original.',
  pessoas:
    'Trabalhadores, nome do capacete, função, matrícula, empresa e situação ativa. Trabalhador não é usuário de login; não inclui token QR.',
  empresas:
    'Empresas próprias/empreiteiras, responsável e próxima medição. Não representa orçamento nem contrato de contratação.',
  ferramentas:
    'Tipos de ferramenta, valor de reposição em centavos, alto valor, própria/alugada, locadora. Tipo não é quantidade de unidades físicas.',
  locadoras:
    'Locadoras de ferramentas cadastradas na obra. Consulte estoque/ferramentas para relacionar unidades alugadas.',
  avarias:
    'Avarias registradas, ferramenta/unidade, motivo, trabalhador da devolução e data. Não gera ou altera manutenção.',
  ocorrencias:
    'Ocorrências de identificação no canteiro, trabalhador e data. Não são movimentos de retirada ou devolução.',
  avisos:
    'Avisos às empreiteiras por não devolução, status, data e total em centavos. Não equivale a pagamento efetivado.',
  descontos:
    'Descontos de reposição por empresa, pessoa e unidade, valor em centavos, status aberto/cancelado/confirmado e medição. Não somar cancelados como dívida.',
  medicoes:
    'Fechamentos de medição de reposição de ferramentas, empresa, data e total em centavos. Não são medições físicas do cronograma nem contratos.',
  fechamentos:
    'Encerramentos diários do almoxarifado: data, horário e automático/manual. Fechamento não devolve ferramentas nem baixa posses.',
} as const;
export type Dataset = keyof typeof datasets;
export function filtrosPermitidos(dataset: string) {
  const p = ['project_id', 'search'];
  if (dataset === 'obras') return p;
  if (dataset !== 'estoque') p.push('from', 'to');
  if (
    [
      'estoque',
      'posses',
      'pendencias',
      'historico',
      'ferramentas',
      'avarias',
      'descontos',
    ].includes(dataset)
  )
    p.push('tool');
  if (
    [
      'posses',
      'pendencias',
      'historico',
      'pessoas',
      'avarias',
      'ocorrencias',
      'descontos',
    ].includes(dataset)
  )
    p.push('person');
  if (
    [
      'posses',
      'pendencias',
      'historico',
      'pessoas',
      'empresas',
      'avarias',
      'ocorrencias',
      'avisos',
      'descontos',
      'medicoes',
    ].includes(dataset)
  )
    p.push('company');
  if (['estoque', 'historico', 'avisos', 'descontos', 'ferramentas'].includes(dataset))
    p.push('status');
  return p;
}
export const manifest = {
  connector: 'almox',
  version: '1.0.0',
  domains: [
    {
      name: 'site_tools',
      authority: 'primary',
      description:
        'Ferramentas do canteiro, uso, estoque, custódia, devoluções, avarias e reposição',
    },
  ],
  exclusions: ['schedule', 'physical_progress', 'design_documents', 'budget'],
  intents: Object.entries(datasets).map(([dataset, description]) => ({
    name: `read_almox_${dataset}`,
    domain: 'site_tools',
    mode: 'read',
    description,
    parameters: [
      { name: 'project_id', type: 'string', required: false },
      { name: 'search', type: 'string', required: false },
      { name: 'tool', type: 'string', required: false },
      { name: 'person', type: 'string', required: false },
      { name: 'company', type: 'string', required: false },
      { name: 'status', type: 'string', required: false },
      { name: 'from', type: 'date', required: false },
      { name: 'to', type: 'date', required: false },
    ].filter((p) => filtrosPermitidos(dataset).includes(p.name)),
  })),
  events: [],
};

