import { WipCard } from '@/components/data/wip-card'

export default function UsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users (WIP)</h1>
      <p className="text-muted-foreground">
        Listing basique + création (email, password) à brancher sur ton service.
      </p>
      <WipCard title="Créer un utilisateur" href="#" />
    </div>
  )
}
