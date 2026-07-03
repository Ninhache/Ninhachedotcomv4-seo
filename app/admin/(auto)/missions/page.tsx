// app/admin/(auto)/missions/page.tsx
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
import { MissionFormDialog } from '@/components/missions/mission-form-dialog';
import { MissionsTable } from '@/components/missions/missions-table';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { CompanyApi } from '@/lib/company/company.api';
import { MissionApi } from '@/lib/mission/mission.api';
import type { CompanyDTO, MissionDTO } from '@/lib/types';

/**
 * Flat list of every mission. No longer linked from the sidebar (the
 * hierarchical Entreprises drill-down is the primary path) but kept working as
 * a global fallback / cross-employer overview.
 */
export default function MissionsPage() {
    const [items, setItems] = useState<MissionDTO[]>([]);
    const [companies, setCompanies] = useState<CompanyDTO[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<MissionDTO | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [missions, allCompanies] = await Promise.all([
                MissionApi.findAll(),
                CompanyApi.findAll(),
            ]);
            setItems(missions);
            setCompanies(allCompanies);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const companyMap = useMemo(
        () => new Map(companies.map(c => [c.id, c.name])),
        [companies]
    );

    const filtered = useMemo(() => {
        const src = items ?? [];
        if (!q) return src;
        const needle = q.toLowerCase();
        return src.filter(x =>
            (x.translations ?? []).some(t =>
                (t.title ?? '').toLowerCase().includes(needle)
            )
        );
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Missions"
                description="Toutes les missions (réalisées chez un employeur, pour un client)."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} mission${items.length > 1 ? 's' : ''}`
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
                            <Plus className="mr-1 h-4 w-4" /> Nouvelle
                        </Button>
                    </>
                }
            />

            <AdminToolbar>
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher par titre…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <MissionsTable
                        items={filtered}
                        loading={loading}
                        companyMap={companyMap}
                        showEmployer
                        showClient
                        onEdit={m => {
                            setCurrent(m);
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

            <MissionFormDialog
                open={open}
                setOpen={setOpen}
                initial={current}
                onSaved={load}
            />
        </AdminPageShell>
    );
}
