-- Ícone próprio de ferramenta: o engenheiro envia uma imagem quando nenhum ícone do Almox serve.
-- Fica no bucket público "icones" (desenho de ferramenta, sem dado pessoal; a TV lê sem login),
-- caminho "{obra}/{uuid}.png", e o tipo grava "arquivo:{obra}/{uuid}.png" em tipo_ferramenta.icone.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('icones', 'icones', true, 1048576, array['image/png'])
on conflict (id) do nothing;

-- Só o engenheiro da obra envia (RN cadastros só pelo engenheiro). Ninguém troca nem apaga:
-- trocar o ícone é enviar outro arquivo.
create policy icones_enviar on storage.objects for insert to authenticated
  with check (
    bucket_id = 'icones'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'
    and privado.eh_engenheiro(privado.obra_do_caminho(name))
  );

-- O ícone é uma chave do Almox (biblioteca ampliada: components/icones-ferramenta.ts) ou um
-- arquivo da própria obra.
alter table public.tipo_ferramenta drop constraint tipo_ferramenta_icone_check;
alter table public.tipo_ferramenta add constraint tipo_ferramenta_icone_check check (
  icone in (
    'pa', 'enxada', 'picareta', 'cavadeira', 'alavanca', 'marreta', 'martelo',
    'martelo_borracha', 'talhadeira', 'serrote', 'arco_serra', 'colher', 'desempenadeira',
    'espatula', 'pincel', 'rolo_pintura', 'regua', 'nivel', 'esquadro', 'trena', 'linha',
    'peneira', 'rastelo', 'vassoura', 'rodo', 'alicate', 'torques', 'tesoura', 'chave_fenda',
    'chave_boca', 'chave_grifo', 'estilete', 'cortador_piso', 'furadeira', 'parafusadeira',
    'martelete', 'rompedor', 'esmerilhadeira', 'serra_circular', 'serra_marmore',
    'serra_tico_tico', 'serra_bancada', 'policorte', 'lixadeira', 'plaina', 'tupia',
    'soprador', 'misturador', 'betoneira', 'vibrador', 'compactador', 'placa_vibratoria',
    'gerador', 'compressor', 'lavadora', 'solda', 'bomba', 'aspirador', 'nivel_laser',
    'refletor', 'extensao', 'escada', 'andaime', 'cavalete', 'carrinho', 'balde', 'mangueira',
    'lanterna', 'cone'
  )
  or (
    icone ~ '^arquivo:[0-9a-f-]{36}/[0-9a-f-]{36}\.png$'
    and split_part(substr(icone, 9), '/', 1) = obra_id::text
  )
);
