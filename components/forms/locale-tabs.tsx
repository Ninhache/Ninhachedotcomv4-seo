'use client';

import { type ReactNode, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Locale } from '@/lib/types';

export function LocaleTabs({
    locales = ['fr', 'en'],
    defaultLocale = 'fr',
    onActiveChange,
    render,
}: {
    locales?: Locale[];
    defaultLocale?: Locale;
    /**
     * Notifie l'onglet courant a un parent. Utile quand quelque chose *au-dessus*
     * des onglets depend de la locale affichee, comme le panneau de score SEO de
     * l'editeur d'article, dont le brief est par traduction. Optionnel : les
     * formulaires qui n'en ont pas besoin ne changent pas.
     */
    onActiveChange?: (active: Locale) => void;
    render: (active: Locale) => ReactNode;
}) {
    const [active, setActive] = useState<Locale>(defaultLocale);
    const select = (loc: Locale) => {
        setActive(loc);
        onActiveChange?.(loc);
    };
    return (
        <Tabs value={active} onValueChange={v => select(v as Locale)}>
            <TabsList>
                {locales.map(loc => (
                    <TabsTrigger key={loc} value={loc}>
                        {loc.toUpperCase()}
                    </TabsTrigger>
                ))}
            </TabsList>
            {locales.map(loc => (
                <TabsContent key={loc} value={loc} className="mt-4">
                    {active === loc && render(loc)}
                </TabsContent>
            ))}
        </Tabs>
    );
}
