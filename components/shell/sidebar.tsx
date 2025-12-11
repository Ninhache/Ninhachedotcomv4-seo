'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/projects', label: 'Projects', wip: true },
  { href: '/admin/skills', label: 'Skills', wip: true },
  { href: '/admin/categories', label: 'Skill Categories', wip: true },
  { href: '/admin/tags', label: 'Tags', wip: true },
  { href: '/admin/experiences', label: 'Experiences' },
  { href: '/admin/contacts', label: 'Contacts', wip: true },
  { href: '/admin/resume', label: 'Resume', wip: true },
  { href: '/admin/users', label: 'Users', wip: true },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <span className="font-semibold">Ninhache.fr</span>
      </div>
      <nav className="space-y-1 p-2">
        {items.map((it) => {
          const active = pathname === it.href
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-disabled={it.wip}
              onClick={(e) => it.wip && e.preventDefault()}
              className={cn(
                'group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                it.wip && 'cursor-not-allowed opacity-50',
                !it.wip && 'hover:bg-accent hover:text-accent-foreground',
                active && !it.wip && 'bg-accent text-accent-foreground',
              )}
            >
              <span>{it.label}</span>
              {it.wip && <span className="ml-auto text-xs text-muted-foreground">WIP</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
