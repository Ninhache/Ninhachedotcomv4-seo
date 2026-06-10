'use client';

import { ChevronRight, Pencil, Plus, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
import { CompanyFormDialog } from '@/components/companies/company-form-dialog';
import { MissionFormDialog } from '@/components/missions/mission-form-dialog';
import { MissionsTable } from '@/components/missions/missions-table';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanyApi } from '@/lib/company/company.api';
import { MissionApi } from '@/lib/mission/mission.api';
import type { CompanyDTO, MissionDTO } from '@/lib/types';

/**
 * Client detail — the bottom of the drill-down. Shows the missions delivered
 * for this client (under its employer). New missions pre-fill both employer
 * and client from the route.
 */
export default function ClientDetailPage() {
    const { employerId, clientId } = useParams<{
        employerId: string;
        clientId: string;
    }>();

    const [employer, setEmployer] = useState<CompanyDTO | null>(null);
    const [client, setClient] = useState<CompanyDTO | null>(null);
    const [missions, setMissions] = useState<MissionDTO[]>([]);
    const [loading, setLoading] = useState(false);

    const [clientOpen, setClientOpen] = useState(false);
    const [missionOpen, setMissionOpen] = useState(false);
    const [currentMission, setCurrentMission] = useState<MissionDTO | null>(
        null
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [emp, cl, ms] = await Promise.all([
                CompanyApi.findOne(employerId),
                CompanyApi.findOne(clientId),
                MissionApi.findAll({ clientCompanyId: clientId }),
            ]);
            setEmployer(emp);
            setClient(cl);
            setMissions(ms);
        } finally {
            setLoading(false);
        }
    }, [employerId, clientId]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <AdminPageShell>
            <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                <Link href="/admin/companies" className="hover:underline">
                    Entreprises
                </Link>
                <ChevronRight className="h-4 w-4" />
                <Link
                    href={`/admin/companies/${employerId}`}
                    className="hover:underline"
                >
                    {employer?.name ?? '…'}
                </Link>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-foreground">
                    {client?.name ?? '…'}
                </span>
            </nav>

            <AdminHeader
                title={client?.name ?? 'Client'}
                description={
                    client?.localisation
                        ? `Client · ${client.localisation}`
                        : 'Client'
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
                            variant="outline"
                            size="sm"
                            onClick={() => setClientOpen(true)}
                            disabled={!client}
                        >
                            <Pencil className="mr-1 h-4 w-4" /> Éditer
                        </Button>
                    </>
                }
            />

            <AdminCard>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                        Missions ({missions.length})
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={() => {
                            setCurrentMission(null);
                            setMissionOpen(true);
                        }}
                    >
                        <Plus className="mr-1 h-4 w-4" /> Nouvelle mission
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <MissionsTable
                        items={missions}
                        loading={loading}
                        onEdit={m => {
                            setCurrentMission(m);
                            setMissionOpen(true);
                        }}
                        onDeleted={load}
                        onVisibilityMutate={(id, next) =>
                            setMissions(prev =>
                                prev.map(x =>
                                    x.id === id ? { ...x, isVisible: next } : x
                                )
                            )
                        }
                        emptyLabel="Aucune mission pour ce client."
                    />
                </CardContent>
            </AdminCard>

            {/* Edit this client */}
            <CompanyFormDialog
                open={clientOpen}
                setOpen={setClientOpen}
                initial={client}
                lockedKind="CLIENT"
                parentEmployerId={employerId}
                title="Éditer le client"
                onSaved={load}
            />

            {/* Create / edit a mission for this client (employer + client locked) */}
            <MissionFormDialog
                open={missionOpen}
                setOpen={setMissionOpen}
                initial={currentMission}
                defaultEmployerCompanyId={employerId}
                defaultClientCompanyId={clientId}
                onSaved={load}
            />
        </AdminPageShell>
    );
}
