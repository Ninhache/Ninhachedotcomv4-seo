'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
import { SummaryCard } from '@/components/admin/summary-card';
import { WipCard } from '@/components/data/wip-card';
import { Button } from '@/components/ui/button';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ContactApi } from '@/lib/contact/contact.api';
import { ExperienceApi } from '@/lib/experience/experience.api';
import { ProjectApi } from '@/lib/project/project.api';
import { SkillApi } from '@/lib/skill/skill.api';
import { TagApi } from '@/lib/tag/tag.api';

const readyModules = [
    { title: 'Profil', href: '/admin/profile', ready: true },
    { title: 'Experiences', href: '/admin/experiences', ready: true },
    { title: 'Tags', href: '/admin/tags', ready: true },
    { title: 'Projects', href: '/admin/projects', ready: true },
    { title: 'Resume', href: '/admin/resume', ready: true },
    { title: 'Skills', href: '/admin/skills', ready: true },
    { title: 'Contacts', href: '/admin/contacts', ready: true },
];

const roadmap = [
    { title: 'Skill Categories', href: '/admin/categories' },
    { title: 'Users', href: '/admin/users' },
];

export default function AdminHome() {
    const [stats, setStats] = useState({
        experiences: 0,
        tags: 0,
        projects: 0,
        skills: 0,
        contacts: 0,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            try {
                const [experiences, tags, projects, skills, contacts] =
                    await Promise.allSettled([
                        ExperienceApi.findAll(),
                        TagApi.findAll(),
                        ProjectApi.findAll(),
                        SkillApi.findAll(),
                        ContactApi.findAll(),
                    ]);

                setStats({
                    experiences:
                        experiences.status === 'fulfilled'
                            ? experiences.value.length
                            : 0,
                    tags: tags.status === 'fulfilled' ? tags.value.length : 0,
                    projects:
                        projects.status === 'fulfilled'
                            ? projects.value.length
                            : 0,
                    skills:
                        skills.status === 'fulfilled' ? skills.value.length : 0,
                    contacts:
                        contacts.status === 'fulfilled'
                            ? contacts.value.length
                            : 0,
                });
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Tableau de bord"
                description="Gère le contenu du portfolio en quelques clics."
                actions={
                    <>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/tags">Gérer les tags</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/projects">
                                Gérer les projets
                            </Link>
                        </Button>
                        <Button asChild size="sm">
                            <Link href="/admin/experiences">
                                Ajouter une expérience
                                <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                    label="Experiences"
                    value={stats.experiences}
                    helper={loading ? 'Mise à jour…' : 'Synchronisé'}
                    action={
                        <Button
                            asChild
                            variant="link"
                            className="px-0 text-xs font-medium text-primary"
                        >
                            <Link href="/admin/experiences">Ouvrir</Link>
                        </Button>
                    }
                />
                <SummaryCard
                    label="Tags"
                    value={stats.tags}
                    helper={
                        loading
                            ? 'Mise à jour…'
                            : 'Utilisés dans les formulaires'
                    }
                    action={
                        <Button
                            asChild
                            variant="link"
                            className="px-0 text-xs font-medium text-primary"
                        >
                            <Link href="/admin/tags">Ouvrir</Link>
                        </Button>
                    }
                />
                <SummaryCard
                    label="Projets"
                    value={stats.projects}
                    helper={loading ? 'Mise à jour…' : 'Synchronisé'}
                    action={
                        <Button
                            asChild
                            variant="link"
                            className="px-0 text-xs font-medium text-primary"
                        >
                            <Link href="/admin/projects">Ouvrir</Link>
                        </Button>
                    }
                />
                <SummaryCard
                    label="Skills"
                    value={stats.skills}
                    helper={loading ? 'Mise à jour…' : 'Synchronisé'}
                    action={
                        <Button
                            asChild
                            variant="link"
                            className="px-0 text-xs font-medium text-primary"
                        >
                            <Link href="/admin/skills">Ouvrir</Link>
                        </Button>
                    }
                />
                <SummaryCard
                    label="Contacts"
                    value={stats.contacts}
                    helper={loading ? 'Mise à jour…' : 'Synchronisé'}
                    action={
                        <Button
                            asChild
                            variant="link"
                            className="px-0 text-xs font-medium text-primary"
                        >
                            <Link href="/admin/contacts">Ouvrir</Link>
                        </Button>
                    }
                />
                <SummaryCard
                    label="Modules restants"
                    value={roadmap.length}
                    helper="WIP"
                />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <AdminCard>
                    <CardHeader className="border-b">
                        <CardTitle>Modules prêts</CardTitle>
                        <CardDescription>
                            Production-ready, branchés sur l’API.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            {readyModules.map(module => (
                                <WipCard key={module.href} {...module} />
                            ))}
                        </div>
                    </CardContent>
                </AdminCard>

                <AdminCard>
                    <CardHeader className="border-b">
                        <CardTitle>Prochaines étapes</CardTitle>
                        <CardDescription>
                            Placées ici pour prioriser les développements.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            {roadmap.map(module => (
                                <WipCard key={module.href} {...module} />
                            ))}
                        </div>
                    </CardContent>
                </AdminCard>
            </div>
        </AdminPageShell>
    );
}
