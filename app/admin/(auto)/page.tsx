'use client';

import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
import { SummaryCard } from '@/components/admin/summary-card';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ContactApi } from '@/lib/contact/contact.api';
import { ProjectApi } from '@/lib/project/project.api';
import { SkillApi } from '@/lib/skill/skill.api';
import type { ContactDTO, ProjectDTO, SkillDTO } from '@/lib/types';
import {
    computeHealth,
    countVisibility,
    type HealthItem,
    type Offender,
    type Visibility,
} from './dashboard-stats';

const EMPTY: Visibility = { total: 0, visible: 0, hidden: 0 };

/** How many offending items to name inline before collapsing to "+N autres". */
const MAX_NAMED_OFFENDERS = 4;

type ResourceKey = 'projects' | 'skills' | 'contacts';

const summaryCards: { key: ResourceKey; label: string; href: string }[] = [
    { key: 'projects', label: 'Projets', href: '/admin/projects' },
    { key: 'skills', label: 'Skills', href: '/admin/skills' },
    { key: 'contacts', label: 'Contacts', href: '/admin/contacts' },
];

type Stats = Record<ResourceKey, Visibility>;

function OffenderList({ offenders }: { offenders: Offender[] }) {
    const shown = offenders.slice(0, MAX_NAMED_OFFENDERS);
    const rest = offenders.length - shown.length;
    return (
        <p className="text-xs text-muted-foreground">
            {shown.map(o => o.name).join(', ')}
            {rest > 0 && ` +${rest} autre${rest > 1 ? 's' : ''}`}
        </p>
    );
}

export default function AdminHome() {
    const [stats, setStats] = useState<Stats>({
        projects: EMPTY,
        skills: EMPTY,
        contacts: EMPTY,
    });
    const [health, setHealth] = useState<HealthItem[]>([]);
    const [errored, setErrored] = useState<Set<ResourceKey>>(new Set());
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            try {
                const [projects, skills, contacts] = await Promise.allSettled([
                    ProjectApi.findAll(),
                    SkillApi.findAll(),
                    ContactApi.findAll(),
                ]);

                const failed = new Set<ResourceKey>();
                const value = <T,>(
                    result: PromiseSettledResult<T[]>,
                    key: ResourceKey
                ): T[] => {
                    if (result.status === 'fulfilled') return result.value;
                    failed.add(key);
                    return [];
                };

                const projectsList = value<ProjectDTO>(projects, 'projects');
                const skillsList = value<SkillDTO>(skills, 'skills');
                const contactsList = value<ContactDTO>(contacts, 'contacts');

                setStats({
                    projects: countVisibility(projectsList),
                    skills: countVisibility(skillsList),
                    contacts: countVisibility(contactsList),
                });
                setHealth(
                    computeHealth({
                        projects: projectsList,
                        skills: skillsList,
                        contacts: contactsList,
                    })
                );
                setErrored(failed);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    const helperFor = (key: ResourceKey) => {
        if (errored.has(key)) return 'Indisponible';
        if (loading) return 'Mise à jour…';
        const { hidden } = stats[key];
        return `dont ${hidden} masqué${hidden > 1 ? 's' : ''}`;
    };

    return (
        <AdminPageShell>
            <AdminHeader
                title="Tableau de bord"
                description="Aperçu du contenu publié et de ce qui reste à compléter."
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map(({ key, label, href }) => (
                    <Link
                        key={key}
                        href={href}
                        className="rounded-xl transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <SummaryCard
                            label={label}
                            value={stats[key].total}
                            helper={helperFor(key)}
                        />
                    </Link>
                ))}
            </div>

            <AdminCard>
                <CardHeader className="border-b">
                    <CardTitle>À corriger</CardTitle>
                    <CardDescription>
                        Contenu incomplet, repéré automatiquement.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {health.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            {loading
                                ? 'Analyse en cours…'
                                : 'Tout est en ordre.'}
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {health.map(item => (
                                <li
                                    key={item.id}
                                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                                >
                                    <div className="flex items-start gap-3">
                                        <span className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                                            {item.offenders.length}
                                        </span>
                                        <div className="space-y-0.5">
                                            <span className="text-sm">
                                                {item.label}
                                            </span>
                                            <OffenderList
                                                offenders={item.offenders}
                                            />
                                        </div>
                                    </div>
                                    <Link
                                        href={item.href}
                                        className="shrink-0 text-xs font-medium text-primary hover:underline"
                                    >
                                        Corriger
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </AdminCard>
        </AdminPageShell>
    );
}
