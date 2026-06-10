// app/admin/(auto)/companies/page.tsx
'use client';

import { Plus, RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { CompaniesTable } from '@/components/companies/companies-table';
import { CompanyFormDialog } from '@/components/companies/company-form-dialog';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { CompanyApi } from '@/lib/company/company.api';
import type { CompanyDTO } from '@/lib/types';

/**
 * Top of the hierarchical timeline admin: employers only. Each employer links
 * to its detail page (clients + in-house missions). Clients are managed inside
 * an employer, never here.
 */
export default function CompaniesPage() {
    const [items, setItems] = useState<CompanyDTO[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<CompanyDTO | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            setItems(await CompanyApi.findAll('EMPLOYER'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const src = items ?? [];
        if (!q) return src;
        const needle = q.toLowerCase();
        return src.filter(
            x =>
                (x.name ?? '').toLowerCase().includes(needle) ||
                (x.localisation ?? '').toLowerCase().includes(needle)
        );
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Entreprises"
                description="Gère les employeurs du parcours. Ouvre un employeur pour ses clients & missions."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} employeur${items.length > 1 ? 's' : ''}`
                            : 'Aucune donnée'}
                    </p>
                }
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => load()}
                            disabled={loading}
                        >
                            <RefreshCcw className="mr-1 h-4 w-4" />
                            Actualiser
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setCurrent(null);
                                setOpen(true);
                            }}
                        >
                            <Plus className="mr-1 h-4 w-4" /> Nouvel employeur
                        </Button>
                    </>
                }
            />

            <AdminToolbar>
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un employeur ou une ville…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <CompaniesTable
                        items={filtered}
                        loading={loading}
                        showContract
                        rowHref={c => `/admin/companies/${c.id}`}
                        onEdit={c => {
                            setCurrent(c);
                            setOpen(true);
                        }}
                        onDeleted={load}
                        onVisibilityMutate={(id, next) =>
                            setItems(prev =>
                                prev.map(x =>
                                    x.id === id ? { ...x, isVisible: next } : x
                                )
                            )
                        }
                    />
                </CardContent>
            </AdminCard>

            <CompanyFormDialog
                open={open}
                setOpen={setOpen}
                initial={current}
                lockedKind="EMPLOYER"
                title={current ? 'Éditer un employeur' : 'Créer un employeur'}
                onSaved={load}
            />
        </AdminPageShell>
    );
}
