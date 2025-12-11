'use client'

import { WipCard } from '@/components/data/wip-card'

export default function AdminHome() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <WipCard title="Projects" href="/admin/projects" />
      <WipCard title="Skills" href="/admin/skills" />
      <WipCard title="Skill Categories" href="/admin/categories" />
      <WipCard title="Tags" href="/admin/tags" />
      <WipCard title="Experiences" href="/admin/experiences" ready />
      <WipCard title="Contacts" href="/admin/contacts" />
      <WipCard title="Resume" href="/admin/resume" />
      <WipCard title="Users" href="/admin/users" />
    </div>
  )
}
