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
import { CompaniesTable } from '@/components/companies/companies-table';
import { CompanyFormDialog } from '@/components/companies/company-form-dialog';
import { MissionFormDialog } from '@/components/missions/mission-form-dialog';
import { MissionsTable } from '@/components/missions/missions-table';
import { PositionFormDialog } from '@/components/positions/position-form-dialog';
import { PositionsTable } from '@/components/positions/positions-table';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanyApi } from '@/lib/company/company.api';
import { MissionApi } from '@/lib/mission/mission.api';
import { PositionApi } from '@/lib/position/position.api';
import type { CompanyDTO, MissionDTO, PositionDTO } from '@/lib/types';

/**
 * Employer detail — the middle of the drill-down. Shows the employer's scoped
 * clients (each linking deeper) and its in-house missions (delivered with no
 * client). Client missions live under their client, so they're excluded here.
 */
export default function EmployerDetailPage() {
    const { employerId } = useParams<{ employerId: string }>();

    const [employer, setEmployer] = useState<CompanyDTO | null>(null);
    const [clients, setClients] = useState<CompanyDTO[]>([]);
    const [missions, setMissions] = useState<MissionDTO[]>([]);
    const [positions, setPositions] = useState<PositionDTO[]>([]);
    const [loading, setLoading] = useState(false);

    const [employerOpen, setEmployerOpen] = useState(false);
    const [clientOpen, setClientOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<CompanyDTO | null>(null);
    const [missionOpen, setMissionOpen] = useState(false);
    const [currentMission, setCurrentMission] = useState<MissionDTO | null>(
        null
    );
    const [positionOpen, setPositionOpen] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<PositionDTO | null>(
        null
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [emp, cls, missionsForEmployer, positionsForEmployer] =
                await Promise.all([
                    CompanyApi.findOne(employerId),
                    CompanyApi.findAll('CLIENT', employerId),
                    MissionApi.findAll({ employerCompanyId: employerId }),
                    PositionApi.findAll({ companyId: employerId }),
                ]);
            setEmployer(emp);
            setClients(cls);
            // In-house missions only — client ones are shown under their client.
            setMissions(missionsForEmployer.filter(m => !m.clientCompanyId));
            // Chronological progression (oldest → newest), order breaks ties.
            setPositions(
                [...positionsForEmployer].sort(
                    (a, b) =>
                        new Date(a.startDate).getTime() -
                            new Date(b.startDate).getTime() ||
                        (a.order ?? 0) - (b.order ?? 0)
                )
            );
        } finally {
            setLoading(false);
        }
    }, [employerId]);

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
                <span className="font-medium text-foreground">
                    {employer?.name ?? '…'}
                </span>
            </nav>

            <AdminHeader
                title={employer?.name ?? 'Employeur'}
                description={
                    employer?.localisation
                        ? `Employeur · ${employer.localisation}`
                        : 'Employeur'
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
                            onClick={() => setEmployerOpen(true)}
                            disabled={!employer}
                        >
                            <Pencil className="mr-1 h-4 w-4" /> Éditer
                        </Button>
                    </>
                }
            />

            <AdminCard>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                        Clients ({clients.length})
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={() => {
                            setCurrentClient(null);
                            setClientOpen(true);
                        }}
                    >
                        <Plus className="mr-1 h-4 w-4" /> Nouveau client
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <CompaniesTable
                        items={clients}
                        loading={loading}
                        rowHref={c =>
                            `/admin/companies/${employerId}/clients/${c.id}`
                        }
                        onEdit={c => {
                            setCurrentClient(c);
                            setClientOpen(true);
                        }}
                        onDeleted={load}
                        onVisibilityMutate={(id, next) =>
                            setClients(prev =>
                                prev.map(x =>
                                    x.id === id ? { ...x, isVisible: next } : x
                                )
                            )
                        }
                        emptyLabel="Aucun client pour cet employeur."
                    />
                </CardContent>
            </AdminCard>

            <AdminCard>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                        Missions internes ({missions.length})
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
                        emptyLabel="Aucune mission interne (sans client)."
                    />
                </CardContent>
            </AdminCard>

            <AdminCard>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">
                        Postes ({positions.length})
                    </CardTitle>
                    <Button
                        size="sm"
                        onClick={() => {
                            setCurrentPosition(null);
                            setPositionOpen(true);
                        }}
                    >
                        <Plus className="mr-1 h-4 w-4" /> Nouveau poste
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <PositionsTable
                        items={positions}
                        loading={loading}
                        onEdit={p => {
                            setCurrentPosition(p);
                            setPositionOpen(true);
                        }}
                        onDeleted={load}
                        onVisibilityMutate={(id, next) =>
                            setPositions(prev =>
                                prev.map(x =>
                                    x.id === id ? { ...x, isVisible: next } : x
                                )
                            )
                        }
                        emptyLabel="Aucun poste pour cet employeur."
                    />
                </CardContent>
            </AdminCard>

            {/* Edit the employer itself */}
            <CompanyFormDialog
                open={employerOpen}
                setOpen={setEmployerOpen}
                initial={employer}
                lockedKind="EMPLOYER"
                title="Éditer l'employeur"
                onSaved={load}
            />

            {/* Create / edit a client scoped to this employer */}
            <CompanyFormDialog
                open={clientOpen}
                setOpen={setClientOpen}
                initial={currentClient}
                lockedKind="CLIENT"
                parentEmployerId={employerId}
                title={currentClient ? 'Éditer le client' : 'Nouveau client'}
                onSaved={load}
            />

            {/* Create / edit an in-house mission for this employer */}
            <MissionFormDialog
                open={missionOpen}
                setOpen={setMissionOpen}
                initial={currentMission}
                defaultEmployerCompanyId={employerId}
                onSaved={load}
            />

            {/* Create / edit a job-title position for this employer */}
            <PositionFormDialog
                open={positionOpen}
                setOpen={setPositionOpen}
                initial={currentPosition}
                companyId={employerId}
                onSaved={load}
            />
        </AdminPageShell>
    );
}
