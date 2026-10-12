-- Revisão do M7: o estoque precisa saber quando uma unidade muda de situação mesmo sem
-- lançamento visível (consulta de empreiteira não recebe movimentos de outras empresas;
-- "Voltou do conserto" e "Dar baixa" mudam a unidade sem movimento). A RLS de unidade
-- deixa todo vínculo da obra ver as unidades, então o aviso chega a todos os perfis.
alter publication supabase_realtime add table public.unidade;
