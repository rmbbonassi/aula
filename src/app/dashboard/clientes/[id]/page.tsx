import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import ContatosSection from '@/components/contatos-section'
import NotasSection from '@/components/notas-section'

interface Props {
  params: { id: string }
}

export default async function ClienteDetailPage({ params }: Props) {
  const supabase = createClient()

  const [{ data: cliente }, { data: contatos }, { data: notas }] = await Promise.all([
    supabase.from('clientes').select('*').eq('id', params.id).single(),
    supabase.from('contatos').select('*').eq('cliente_id', params.id).order('nome'),
    supabase.from('notas').select('*').eq('cliente_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!cliente) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clientes">
          <Button variant="ghost" size="sm">← Voltar</Button>
        </Link>
        <h1 className="text-2xl font-bold">{cliente.nome}</h1>
      </div>

      {/* Dados do cliente */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Dados</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Empresa</dt>
            <dd className="font-medium">{cliente.empresa ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">E-mail</dt>
            <dd className="font-medium">{cliente.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Telefone</dt>
            <dd className="font-medium">{cliente.telefone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Atualizado em</dt>
            <dd className="font-medium">{new Date(cliente.updated_at).toLocaleDateString('pt-BR')}</dd>
          </div>
        </dl>
      </div>

      <ContatosSection clienteId={params.id} initialContatos={contatos ?? []} />
      <NotasSection clienteId={params.id} initialNotas={notas ?? []} />
    </div>
  )
}
