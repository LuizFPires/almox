'use server'
import { criarClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
export async function responder(form: FormData) {
  const supabase = await criarClienteServidor()
  const { error } = await supabase.rpc('responder_convite', {
    p_convite: String(form.get('id')),
    p_aceitar: form.get('resposta') === 'aceitar',
  })
  if (error) redirect('/convites?erro=1')
  revalidatePath('/', 'layout')
  redirect(form.get('resposta') === 'aceitar' ? '/inicio' : '/convites')
}
