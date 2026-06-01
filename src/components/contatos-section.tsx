'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Contato } from '@/lib/supabase/types'

interface ContatosSectionProps {
  clienteId: string
  initialContatos: Contato[]
}

interface ContatoForm {
  nome: string
  cargo: string
  email: string
  telefone: string
}

const emptyForm: ContatoForm = { nome: '', cargo: '', email: '', telefone: '' }

export default function ContatosSection({ clienteId, initialContatos }: ContatosSectionProps) {
  const supabase = createClient()
  const [contatos, setContatos] = useState<Contato[]>(initialContatos)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ContatoForm>(emptyForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field: keyof ContatoForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('contatos')
      .insert({
        cliente_id: clienteId,
        nome: form.nome.trim(),
        cargo: form.cargo.trim() || null,
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
      })
      .select()
      .single()
    if (error) { setError('Erro ao salvar.'); setLoading(false); return }
    if (data) setContatos(prev => [...prev, data])
    setLoading(false)
    setOpen(false)
    setForm(emptyForm)
    setError('')
  }

  async function handleDelete(id: string) {
    await supabase.from('contatos').delete().eq('id', id)
    setContatos(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Contatos</h2>
        <Button size="sm" onClick={() => { setForm(emptyForm); setError(''); setOpen(true) }}>
          Adicionar Contato
        </Button>
      </div>

      {contatos.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum contato cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {contatos.map(c => (
            <li key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="font-medium text-sm">{c.nome}</p>
                <div className="flex gap-2 mt-1">
                  {c.cargo && <Badge variant="secondary">{c.cargo}</Badge>}
                  {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                  {c.telefone && <span className="text-xs text-gray-400">{c.telefone}</span>}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(c.id)}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} id="contato-form" className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="contato-nome">Nome *</Label>
              <Input id="contato-nome" value={form.nome} onChange={set('nome')} placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contato-cargo">Cargo</Label>
              <Input id="contato-cargo" value={form.cargo} onChange={set('cargo')} placeholder="Ex: Diretor Comercial" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contato-email">E-mail</Label>
              <Input id="contato-email" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="contato-telefone">Telefone</Label>
              <Input id="contato-telefone" value={form.telefone} onChange={set('telefone')} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" form="contato-form" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
