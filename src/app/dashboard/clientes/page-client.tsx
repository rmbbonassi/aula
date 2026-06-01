'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import ClientesTable from '@/components/clientes-table'
import ClienteForm from '@/components/cliente-form'
import ClienteDeleteDialog from '@/components/cliente-delete-dialog'
import { Button } from '@/components/ui/button'
import type { Cliente } from '@/lib/supabase/types'

interface Props {
  clientes: Cliente[]
}

export default function ClientesPageClient({ clientes }: Props) {
  const router = useRouter()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null)

  function handleEdit(cliente: Cliente) {
    setEditingCliente(cliente)
    setFormOpen(true)
  }

  function handleCreate() {
    setEditingCliente(null)
    setFormOpen(true)
  }

  function handleFormSuccess() {
    const wasEditing = editingCliente
    setFormOpen(false)
    setEditingCliente(null)
    router.refresh()
    toast.success(wasEditing ? 'Cliente atualizado.' : 'Cliente criado.')
  }

  async function handleDeleteConfirm(cliente: Cliente) {
    const supabase = createClient()

    // Delete children first (on delete restrict requires manual cascade)
    const { error: notasError } = await supabase.from('notas').delete().eq('cliente_id', cliente.id)
    if (notasError) {
      toast.error('Não foi possível excluir as notas do cliente.')
      setDeletingCliente(null)
      return
    }

    const { error: contatosError } = await supabase.from('contatos').delete().eq('cliente_id', cliente.id)
    if (contatosError) {
      toast.error('Não foi possível excluir os contatos do cliente.')
      setDeletingCliente(null)
      return
    }

    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (error) {
      toast.error('Não foi possível excluir o cliente.')
    } else {
      toast.success('Cliente excluído.')
      router.refresh()
    }
    setDeletingCliente(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button onClick={handleCreate}>Novo Cliente</Button>
      </div>

      <ClientesTable
        clientes={clientes}
        onEdit={handleEdit}
        onDelete={setDeletingCliente}
      />

      <ClienteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        cliente={editingCliente}
        onSuccess={handleFormSuccess}
      />

      {deletingCliente && (
        <ClienteDeleteDialog
          cliente={deletingCliente}
          open={!!deletingCliente}
          onOpenChange={(open: boolean) => !open && setDeletingCliente(null)}
          onConfirm={() => handleDeleteConfirm(deletingCliente)}
        />
      )}
    </div>
  )
}
