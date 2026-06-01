'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Nota } from '@/lib/supabase/types'

interface NotasSectionProps {
  clienteId: string
  initialNotas: Nota[]
}

export default function NotasSection({ clienteId, initialNotas }: NotasSectionProps) {
  const supabase = createClient()
  const [notas, setNotas] = useState<Nota[]>(initialNotas)
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notas')
      .insert({ cliente_id: clienteId, texto: texto.trim() })
      .select()
      .single()
    if (!error && data) {
      setNotas(prev => [data, ...prev])
      setTexto('')
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Histórico de Notas</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <Textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="Escreva uma nota sobre esta interação..."
          className="resize-none"
          rows={2}
        />
        <Button type="submit" disabled={loading} className="self-end shrink-0">
          {loading ? '...' : 'Adicionar Nota'}
        </Button>
      </form>

      {notas.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma nota registrada.</p>
      ) : (
        <ul className="space-y-4">
          {notas.map(nota => (
            <li key={nota.id} className="border-l-2 border-gray-200 pl-4">
              <p className="text-sm">{nota.texto}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(nota.created_at).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
