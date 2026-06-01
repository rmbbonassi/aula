import { createClient } from '@/lib/supabase/server'

type ContatoRecente = {
  id: string
  nome: string
  cargo: string | null
  created_at: string
  clientes: { nome: string } | null
}

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: totalClientes },
    { count: totalContatos },
    { data: contatosRecentes },
  ] = await Promise.all([
    supabase.from('clientes').select('*', { count: 'exact', head: true }),
    supabase.from('contatos').select('*', { count: 'exact', head: true }),
    supabase
      .from('contatos')
      .select('id, nome, cargo, created_at, clientes(nome)')
      .order('created_at', { ascending: false })
      .limit(5)
      .returns<ContatoRecente[]>(),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Resumo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-500">Total de Clientes</p>
          <p className="text-3xl font-bold mt-1">{totalClientes ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <p className="text-sm text-gray-500">Total de Contatos</p>
          <p className="text-3xl font-bold mt-1">{totalContatos ?? 0}</p>
        </div>
      </div>

      {contatosRecentes && contatosRecentes.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Últimos Contatos Cadastrados</h2>
          <ul className="space-y-2">
            {contatosRecentes.map(contato => (
              <li key={contato.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{contato.nome}</span>
                {contato.cargo && (
                  <span className="text-gray-400">— {contato.cargo}</span>
                )}
                {contato.clientes && (
                  <span className="text-gray-400 text-xs">
                    ({contato.clientes.nome})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
