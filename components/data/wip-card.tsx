import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

export function WipCard({
  title,
  href,
  ready = false,
}: {
  title: string
  href: string
  ready?: boolean
}) {
  return (
    <Card className={cn(!ready && 'opacity-60')}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {ready ? (
          <Link href={href} className="underline">
            Open
          </Link>
        ) : (
          <span className="text-muted-foreground">En cours…</span>
        )}
      </CardContent>
    </Card>
  )
}
