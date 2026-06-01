'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { Cliente } from '@/lib/supabase/types'

interface ClienteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onSuccess: () => void
}

interface FormData {
  nome: string
  empresa: string
  email: string
  telefone: string
}

const empty: FormData = { nome: '', empresa: '', email: '', telefone: '' }

export default function ClienteForm({ open, onOpenChange, cliente, onSuccess }: ClienteFormProps) {
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(empty)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(cliente ? {
        nome: cliente.nome,
        empresa: cliente.empresa ?? '',
        email: cliente.email ?? '',
        telefone: cliente.telefone ?? '',
      } : empty)
      setError('')
    }
  }, [open, cliente])

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }
    setLoading(true)
    setError('')

    const payload = {
      nome: form.nome.trim(),
      empresa: form.empresa.trim() || null,
      email: form.email.trim() || null,
      telefone: form.telefone.trim() || null,
    }

    const { error } = cliente
      ? await supabase.from('clientes').update(payload).eq('id', cliente.id)
      : await supabase.from('clientes').insert(payload)

    if (error) {
      setError('Erro ao salvar. Tente novamente.')
      setLoading(false)
      return
    }
    setLoading(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="cliente-form" className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome *</Label>
            <Input id="nome" value={form.nome} onChange={set('nome')} placeholder="Nome do cliente" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="empresa">Empresa</Label>
            <Input id="empresa" value={form.empresa} onChange={set('empresa')} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="email@empresa.com" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" value={form.telefone} onChange={set('telefone')} placeholder="(11) 99999-9999" />
          </div>
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="cliente-form" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
