-- M10 · Retenção (LGPD): anonimização, contatos, dados operacionais e fotos vencidas.
begin;
select plan(16);

-- Obra encerrada há 6 anos, com empreiteira (contatos) e duas pessoas: uma ainda com ferramenta.
insert into public.obra (id, nome, encerrada_em)
values ('a0000000-0000-4000-8000-0000000000f1', 'Obra antiga', current_date - interval '6 years');
insert into public.empresa (id, obra_id, nome, tipo, dono_nome, dono_email, encarregado_email)
values ('e0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000f1', 'Antiga Ltda',
        'empreiteira', 'Dono Antigo', 'dono@antiga.exemplo', 'enc@antiga.exemplo');
update public.empresa set dono_email = 'dono2@antiga.exemplo' where id = 'e0000000-0000-4000-8000-0000000000f1';
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao) values
  ('c0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000f1',
   'e0000000-0000-4000-8000-0000000000f1', 'Antônio Antigo', 'TONHO', 'Pedreiro'),
  ('c0000000-0000-4000-8000-0000000000f2', 'a0000000-0000-4000-8000-0000000000f1',
   'e0000000-0000-4000-8000-0000000000f1', 'Bento Comferramenta', 'BENTO', 'Servente');
insert into public.tipo_ferramenta (id, obra_id, nome, icone, prefixo, valor_reposicao)
values ('f0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000f1', 'Pá', 'pa', 'PA', 5000);
insert into public.unidade (id, obra_id, tipo_id, codigo)
values ('10000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000f1',
        'f0000000-0000-4000-8000-0000000000f1', 'PA-01');
insert into public.usuario_obra (usuario_id, obra_id, perfil)
values ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-0000000000f1', 'almoxarife');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.registrar_retirada('a0000000-0000-4000-8000-0000000000f1', 'c0000000-0000-4000-8000-0000000000f2',
  null, '[{"tipo":"f0000000-0000-4000-8000-0000000000f1","quantidade":1}]', true);
reset role;

-- Obra ativa: pessoa inativa sem lançamento há 6 anos.
insert into public.pessoa (id, obra_id, empresa_id, nome, nome_capacete, funcao, ativa, criado_em)
select 'c0000000-0000-4000-8000-0000000000f3', 'a0000000-0000-4000-8000-000000000001', e.id,
       'Carlos Sumido', 'CARLÃO', 'Ajudante', false, now() - interval '6 years'
  from public.empresa e where e.obra_id = 'a0000000-0000-4000-8000-000000000001' limit 1;

-- Dados operacionais velhos.
insert into public.envio (obra_id, tipo, canal, destino, referencia, criado_em)
values ('a0000000-0000-4000-8000-000000000001', 'aviso', 'email', 'velho@exemplo.com', gen_random_uuid(),
        now() - interval '13 months');
insert into public.identificacao (obra_id, pessoa_id, usuario_id, criado_em, expira_em)
select 'a0000000-0000-4000-8000-000000000001', p.id, 'b0000000-0000-4000-8000-000000000002',
       now() - interval '13 months', now() - interval '13 months'
  from public.pessoa p where p.nome = 'Joaquim Silva';

-- Permissões: só o agendamento e o processador.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select throws_ok($$select privado.aplicar_retencao()$$, '42501', null, 'engenheiro não dispara a retenção');
select throws_ok($$select * from public.fotos_vencidas()$$, '42501', null, 'logado não lista fotos vencidas');
select throws_ok($$select * from privado.retencao$$, '42501', null, 'prazos não são legíveis pelo cliente');
reset role;

create temp table t_r on commit drop as select privado.aplicar_retencao() as r;

select is(
  (select nome || '|' || nome_capacete || '|' || (anonimizada_em is not null)::text
     from public.pessoa where id = 'c0000000-0000-4000-8000-0000000000f1'),
  'Pessoa anonimizada|ANONIMIZADA|true', 'obra encerrada há mais de 5 anos: pessoa anonimizada'
);
select is(
  (select nome from public.pessoa where id = 'c0000000-0000-4000-8000-0000000000f2'),
  'Bento Comferramenta', 'quem ainda está com ferramenta não é anonimizado'
);
select is(
  (select nome from public.pessoa where id = 'c0000000-0000-4000-8000-0000000000f3'),
  'Pessoa anonimizada', 'inativa sem lançamento há mais de 5 anos: anonimizada'
);
select is(
  (select nome from public.pessoa where nome = 'Joaquim Silva'), 'Joaquim Silva',
  'pessoa ativa da obra em andamento continua'
);
select is(
  (select coalesce(dono_nome, '') || coalesce(dono_email, '') || coalesce(encarregado_email, '')
     from public.empresa where id = 'e0000000-0000-4000-8000-0000000000f1'),
  '', 'contatos da empresa da obra antiga apagados'
);
select is(
  (select count(*)::int from public.alteracao
    where registro_id = 'e0000000-0000-4000-8000-0000000000f1' and campo like '%email%'),
  0, 'e-mails antigos também saem do log de alterações'
);
select is((select count(*)::int from public.envio where destino = 'velho@exemplo.com'), 0,
  'envio com mais de 12 meses apagado');
select is(
  (select count(*)::int from public.identificacao where criado_em < now() - interval '12 months'),
  0, 'conferências com mais de 12 meses apagadas'
);
select is((select (r ->> 'pessoas')::int from t_r), 2, 'resumo do que foi feito');
select is(
  (select count(*)::int from public.movimento where pessoa_id = 'c0000000-0000-4000-8000-0000000000f2'),
  1, 'movimentos ficam (RN-16)'
);

-- Foto vencida: avaria de 14 meses atrás, peça consertada há 13 meses.
insert into public.avaria (obra_id, unidade_id, movimento_id, motivo, foto_path, criado_em)
select 'a0000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-0000000000f1', m.id, 'quebrada',
       'a0000000-0000-4000-8000-0000000000f1/00000000-0000-4000-8000-0000000000f1.jpg',
       now() - interval '14 months'
  from public.movimento m where m.pessoa_id = 'c0000000-0000-4000-8000-0000000000f2';
insert into public.alteracao (obra_id, tabela, registro_id, campo, de, para, criado_em)
values ('a0000000-0000-4000-8000-0000000000f1', 'unidade', '10000000-0000-4000-8000-0000000000f1',
        'status', 'manutencao', 'livre', now() - interval '13 months');
set local role service_role;
create temp table t_f on commit drop as select * from public.fotos_vencidas(10) f;
select ok(
  'a0000000-0000-4000-8000-0000000000f1/00000000-0000-4000-8000-0000000000f1.jpg' in (select f from t_f),
  'foto de peça consertada há mais de 12 meses vence'
);
select public.marcar_fotos_apagadas(array(select f from t_f));
select is((select count(*)::int from public.fotos_vencidas(10)), 0, 'marcada, não volta na lista');
reset role;

select privado.encerrar_automatico();
select is(
  (select count(*)::int from public.fechamento_dia where obra_id = 'a0000000-0000-4000-8000-0000000000f1'),
  0, 'obra encerrada fica fora do encerramento automático'
);

select * from finish();
rollback;
