'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { type Locale } from '@/lib/types'
import { ReactNode, useState } from 'react'

export function LocaleTabs({
  locales = ['fr', 'en'],
  defaultLocale = 'fr',
  render,
}: {
  locales?: Locale[]
  defaultLocale?: Locale
  render: (active: Locale) => ReactNode
}) {
  const [active, setActive] = useState<Locale>(defaultLocale)
  return (
    <Tabs value={active} onValueChange={(v) => setActive(v as Locale)}>
      <TabsList>
        {locales.map((loc) => (
          <TabsTrigger key={loc} value={loc}>
            {loc.toUpperCase()}
          </TabsTrigger>
        ))}
      </TabsList>
      {locales.map((loc) => (
        <TabsContent key={loc} value={loc} className="mt-4">
          {active === loc && render(loc)}
        </TabsContent>
      ))}
    </Tabs>
  )
}
