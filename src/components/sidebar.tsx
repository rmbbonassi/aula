'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r flex flex-col shrink-0">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold tracking-tight">CRM</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link
          href="/dashboard/clientes"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname.startsWith('/dashboard/clientes')
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          <Users className="h-4 w-4" />
          Clientes
        </Link>
      </nav>
    </aside>
  )
}
