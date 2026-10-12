-- Dados de desenvolvimento do protótipo (local e almox-dev; NUNCA no almox-prod).
-- 2 obras, 6 empresas, 30 pessoas, 13 tipos de ferramenta, retiradas do dia e
-- usuários de teste para cada perfil (senha abaixo, só para desenvolvimento).

-- Trava: o seed só roda em banco vazio. Nunca rode em produção (db push sem --include-seed).
do $$
begin
  if exists (select 1 from public.obra) then
    raise exception 'Seed recusado: o banco já tem obras. O seed é só para banco vazio de desenvolvimento.';
  end if;
end;
$$;

-- Obras ------------------------------------------------------------------------------

insert into public.obra (id, nome, endereco) values
  ('a0000000-0000-4000-8000-000000000001', 'Obra Demonstração', 'Av. das Palmeiras, 1200'),
  ('a0000000-0000-4000-8000-000000000002', 'Obra Demonstração B', 'Rua do Canteiro, 45');

-- Empresas (cores do painel da TV) -----------------------------------------------------

insert into public.empresa (id, obra_id, nome, tipo, cor, dono_nome, dono_email, encarregado_email, proxima_medicao) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Construtora', 'propria', '#F4B400', null, null, null, null),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Elétrica Lumen', 'empreiteira', '#4C8DFF',
   'Luciana Mendes', 'luciana@lumen.exemplo', 'carlos@lumen.exemplo', current_date + 12),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Fôrmas Ribeiro', 'empreiteira', '#FF8A3D',
   'Roberto Ribeiro', 'roberto@formasribeiro.exemplo', 'paulo@formasribeiro.exemplo', current_date + 12),
  -- Sem e-mails: exercita o alerta "falta e-mail" do cadastro.
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Hidráulica JR', 'empreiteira', '#9A6BFF',
   'Jorge Rezende', null, null, current_date + 19),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Pinturas Aurora', 'empreiteira', '#3DC9B0',
   'Aurora Lima', 'aurora@pinturasaurora.exemplo', null, current_date + 19),
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Armação Teixeira', 'empreiteira', '#E86FA8',
   'Bruno Teixeira', 'bruno@armacaoteixeira.exemplo', null, current_date + 26),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'Construtora', 'propria', '#F4B400', null, null, null, null);

-- Pessoas (matrícula automática na ordem de inserção) -----------------------------------

insert into public.pessoa (obra_id, empresa_id, nome, nome_capacete, funcao)
select 'a0000000-0000-4000-8000-000000000001', e.id, p.nome, p.capacete, p.funcao
  from (values
    (1, 'Adriano Costa', 'ADRIANO', 'Servente', 'Construtora'),
    (2, 'Antônio Ferreira', 'ANTÔNIO', 'Servente', 'Construtora'),
    (3, 'Bruno Teixeira', 'BRUNO', 'Armador', 'Armação Teixeira'),
    (4, 'Carlos Mendes', 'CARLOS', 'Eletricista', 'Elétrica Lumen'),
    (5, 'Cláudio Rocha', 'CLÁUDIO', 'Pintor', 'Pinturas Aurora'),
    (6, 'Diego Rocha', 'DIEGO', 'Ajudante', 'Elétrica Lumen'),
    (7, 'Edson Lima', 'EDSON', 'Pedreiro', 'Construtora'),
    (8, 'Fábio Santos', 'FÁBIO', 'Armador', 'Armação Teixeira'),
    (9, 'Gilberto Alves', 'GILBERTO', 'Encanador', 'Hidráulica JR'),
    (10, 'Hélio Moreira', 'HÉLIO', 'Carpinteiro', 'Fôrmas Ribeiro'),
    (11, 'Ivan Pereira', 'IVAN', 'Servente', 'Fôrmas Ribeiro'),
    (12, 'Joaquim Silva', 'JOAQUIM', 'Pedreiro', 'Construtora'),
    (13, 'José Carlos', 'ZÉ CARLOS', 'Carpinteiro', 'Fôrmas Ribeiro'),
    (14, 'Juliano Freitas', 'JULIANO', 'Pintor', 'Pinturas Aurora'),
    (15, 'Leandro Souza', 'LEANDRO', 'Eletricista', 'Elétrica Lumen'),
    (16, 'Luiz Fernando', 'LUIZ', 'Encanador', 'Hidráulica JR'),
    (17, 'Marcos Souza', 'MARCOS', 'Pedreiro', 'Construtora'),
    (18, 'Márcio Dias', 'MÁRCIO', 'Servente', 'Construtora'),
    (19, 'Nilton Barbosa', 'NILTON', 'Armador', 'Armação Teixeira'),
    (20, 'Osvaldo Cruz', 'OSVALDO', 'Pedreiro', 'Construtora'),
    (21, 'Paulo Ribeiro', 'PAULO', 'Carpinteiro', 'Fôrmas Ribeiro'),
    (22, 'Raimundo Alves', 'RAIMUNDO', 'Meio-oficial', 'Construtora'),
    (23, 'Renato Lima', 'RENATO', 'Servente', 'Fôrmas Ribeiro'),
    (24, 'Ricardo Neves', 'RICARDO', 'Encanador', 'Hidráulica JR'),
    (25, 'Rodrigo Prates', 'RODRIGO', 'Pintor', 'Pinturas Aurora'),
    (26, 'Sandro Melo', 'SANDRO', 'Pedreiro', 'Construtora'),
    (27, 'Tiago Ramos', 'TIAGO', 'Ajudante', 'Elétrica Lumen'),
    (28, 'Valter Gomes', 'VALTER', 'Servente', 'Construtora'),
    (29, 'Wagner Pinto', 'WAGNER', 'Meio-oficial', 'Construtora'),
    (30, 'Wellington Reis', 'WELLINGTON', 'Armador', 'Armação Teixeira')
  ) as p (ordem, nome, capacete, funcao, empresa)
  join public.empresa e on e.nome = p.empresa and e.obra_id = 'a0000000-0000-4000-8000-000000000001'
 order by p.ordem;

-- Encarregados
update public.empresa e set encarregado_pessoa_id = p.id
  from (values ('Elétrica Lumen', 'Carlos Mendes'), ('Fôrmas Ribeiro', 'Paulo Ribeiro'),
               ('Hidráulica JR', 'Ricardo Neves'), ('Pinturas Aurora', 'Rodrigo Prates'),
               ('Armação Teixeira', 'Bruno Teixeira')) as x (empresa, pessoa)
  join public.pessoa p on p.nome = x.pessoa
 where e.nome = x.empresa and e.obra_id = 'a0000000-0000-4000-8000-000000000001';

-- Tipos de ferramenta e unidades (valores do protótipo, em centavos) --------------------

with tipos as (
  insert into public.tipo_ferramenta (obra_id, nome, icone, prefixo, valor_reposicao, alto_valor)
  select 'a0000000-0000-4000-8000-000000000001', nome, icone, prefixo, valor, alto
    from (values
      ('Pá', 'pa', 'PA', 6500, false),
      ('Enxada', 'enxada', 'ENX', 5500, false),
      ('Carrinho de mão', 'carrinho', 'CAR', 34000, false),
      ('Colher', 'colher', 'COL', 3800, false),
      ('Régua', 'regua', 'REG', 12000, false),
      ('Linha', 'linha', 'LIN', 2500, false),
      ('Furadeira', 'furadeira', 'FUR', 56000, false),
      ('Martelete', 'martelete', 'MT', 289000, true),
      ('Esmerilhadeira', 'esmerilhadeira', 'ESM', 42000, true),
      ('Serra circular', 'serra_circular', 'SER', 89000, true),
      ('Martelo', 'martelo', 'MAR', 4500, false),
      ('Escada', 'escada', 'ESC', 69000, false),
      ('Extensão', 'extensao', 'EXT', 15000, false)
    ) as t (nome, icone, prefixo, valor, alto)
  returning id, prefixo
)
insert into public.unidade (obra_id, tipo_id, codigo)
select 'a0000000-0000-4000-8000-000000000001', t.id, t.prefixo || '-' || lpad(n::text, 2, '0')
  from tipos t
  join (values ('PA', 9), ('ENX', 6), ('CAR', 6), ('COL', 8), ('REG', 4), ('LIN', 10), ('FUR', 8),
               ('MT', 3), ('ESM', 5), ('SER', 3), ('MAR', 8), ('ESC', 8), ('EXT', 6)) as q (prefixo, qtd)
    on q.prefixo = t.prefixo
  cross join lateral generate_series(1, q.qtd) as n;

-- Uma unidade em manutenção (avariada antes do seed).
update public.unidade set status = 'manutencao'
 where obra_id = 'a0000000-0000-4000-8000-000000000001' and codigo = 'FUR-08';

-- Usuários de teste (senha de desenvolvimento: almox-dev-2026) ----------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('almox-dev-2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('nome', u.nome), now(), now(),
       '', '', '', '', '', '', '', ''
  from (values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'engenheiro@almox.exemplo', 'Helena Duarte'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'almoxarife@almox.exemplo', 'Sebastião Nunes'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'mestre@almox.exemplo', 'Sérgio Prado'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'formas@almox.exemplo', 'Roberto Ribeiro')
  ) as u (id, email, nome);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
  from auth.users u
 where u.email like '%@almox.exemplo';

insert into public.usuario_obra (usuario_id, obra_id, perfil, empresa_id) values
  -- Engenheira com duas obras (exercita o seletor de obra).
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'engenheiro', null),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'consulta', null),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'almoxarife', null),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'consulta', null),
  -- Dono da Fôrmas Ribeiro: consulta restrita à própria empresa.
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'consulta', 'e0000000-0000-4000-8000-000000000003');

-- Retiradas do dia (unidades livres em ordem de código, RN-08) ----------------------------

do $$
declare
  obra constant uuid := 'a0000000-0000-4000-8000-000000000001';
  almoxarife constant uuid := 'b0000000-0000-4000-8000-000000000002';
  hoje constant date := (now() at time zone 'America/Sao_Paulo')::date;
  r record;
  icone_item text;
  mov uuid;
  uni uuid;
  quando timestamptz;
begin
  for r in
    select * from (values
      ('Adriano Costa', 0, '07:02', 'qr', array['carrinho', 'pa']),
      ('Antônio Ferreira', 0, '07:08', 'qr', array['carrinho', 'enxada', 'pa']),
      ('Bruno Teixeira', 0, '07:11', 'qr', array['martelo']),
      ('Carlos Mendes', 0, '07:20', 'qr', array['furadeira', 'escada', 'extensao']),
      ('Cláudio Rocha', 0, '07:25', 'qr', array['escada', 'extensao']),
      ('Diego Rocha', 0, '07:22', 'qr', array['esmerilhadeira']),
      ('Edson Lima', 0, '07:04', 'qr', array['colher', 'regua', 'linha']),
      ('Fábio Santos', 0, '07:12', 'qr', array['esmerilhadeira', 'martelo']),
      ('Gilberto Alves', 0, '07:31', 'qr', array['furadeira']),
      ('Hélio Moreira', 0, '07:14', 'qr', array['serra_circular', 'martelo']),
      ('Ivan Pereira', 0, '07:17', 'qr', array['carrinho']),
      ('Joaquim Silva', 0, '07:05', 'qr', array['colher', 'regua', 'linha']),
      ('José Carlos', 0, '07:16', 'qr', array['martelo', 'escada']),
      ('Juliano Freitas', 0, '07:26', 'qr', array['escada']),
      ('Leandro Souza', 0, '07:21', 'qr', array['furadeira', 'extensao']),
      ('Luiz Fernando', 0, '07:33', 'qr', array['esmerilhadeira']),
      ('Marcos Souza', 0, '07:12', 'manual', array['furadeira']),
      ('Marcos Souza', 0, '07:12', 'qr', array['colher']),
      ('Márcio Dias', 0, '07:09', 'qr', array['pa', 'enxada']),
      ('Nilton Barbosa', 0, '07:13', 'qr', array['martelo']),
      ('Osvaldo Cruz', 0, '07:06', 'qr', array['colher', 'linha']),
      ('Paulo Ribeiro', 0, '07:15', 'qr', array['serra_circular', 'martelo']),
      ('Raimundo Alves', 1, '16:40', 'qr', array['martelete']),
      ('Renato Lima', 0, '07:30', 'qr', array['carrinho', 'pa']),
      ('Ricardo Neves', 0, '07:34', 'qr', array['furadeira']),
      ('Rodrigo Prates', 0, '07:27', 'qr', array['escada', 'extensao']),
      ('Sandro Melo', 0, '07:07', 'qr', array['colher', 'regua']),
      ('Tiago Ramos', 0, '07:23', 'qr', array['escada']),
      ('Valter Gomes', 0, '07:10', 'qr', array['carrinho']),
      ('Wagner Pinto', 0, '07:18', 'qr', array['martelete']),
      ('Wellington Reis', 0, '07:13', 'qr', array['esmerilhadeira'])
    ) as x (nome, dias_atras, hora, via, icones)
  loop
    quando := ((hoje - r.dias_atras) + r.hora::time) at time zone 'America/Sao_Paulo';
    -- Antes das 07:45, as retiradas "de hoje" (07:00–07:40) ficariam no futuro e apareceriam
    -- depois de qualquer lançamento novo. Comprime para entre a meia-noite e agora, na mesma ordem.
    if r.dias_atras = 0 and now() < ((hoje + time '07:45') at time zone 'America/Sao_Paulo') then
      quando := (hoje::timestamp at time zone 'America/Sao_Paulo')
        + greatest(now() - interval '1 minute' - (hoje::timestamp at time zone 'America/Sao_Paulo'), interval '0')
          * (extract(epoch from r.hora::time - time '07:00') / extract(epoch from interval '40 minutes'));
    end if;
    insert into public.movimento (obra_id, tipo, pessoa_id, usuario_id, via, criado_em, conferido)
    select obra, 'retirada', p.id, almoxarife, r.via::public.via_movimento, quando, r.via = 'qr'
      from public.pessoa p where p.obra_id = obra and p.nome = r.nome
    returning id into mov;

    foreach icone_item in array r.icones loop
      select u.id into uni
        from public.unidade u join public.tipo_ferramenta t on t.id = u.tipo_id
       where u.obra_id = obra and t.icone = icone_item and u.status = 'livre'
       order by u.codigo
       limit 1;
      insert into public.movimento_item (movimento_id, obra_id, unidade_id) values (mov, obra, uni);
      insert into public.posse (unidade_id, obra_id, pessoa_id, desde, via, movimento_retirada_id)
      select uni, obra, p.id, quando, r.via::public.via_movimento, mov
        from public.pessoa p where p.obra_id = obra and p.nome = r.nome;
      update public.unidade set status = 'em_uso' where id = uni;
    end loop;
  end loop;
end;
$$;
