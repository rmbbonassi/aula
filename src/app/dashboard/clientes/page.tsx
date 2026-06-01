import { createClient } from '@/lib/supabase/server'
import ClientesPageClient from './page-client'

export default async function ClientesPage() {
  const supabase = createClient()
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .order('nome')

  return <ClientesPageClient clientes={clientes ?? []} />
}
