'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  userEmail: string
}

export default function Header({ userEmail }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{userEmail}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700">
          Sair
        </Button>
      </div>
    </header>
  )
}
