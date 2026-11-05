-- M13 · Materiais: tipos novos da fila de envios. Ficam numa migration separada porque um valor
-- novo de enum não pode ser usado na mesma transação em que é criado.
alter type public.tipo_envio add value if not exists 'limite_material';
alter type public.tipo_envio add value if not exists 'pedido_cadastro_material';
alter type public.tipo_envio add value if not exists 'material_cadastrado';
