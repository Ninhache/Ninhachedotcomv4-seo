'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Code2,
    ExternalLink,
    Globe,
    ImageIcon,
    Pencil,
    Plus,
    RefreshCcw,
    Tag,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { ProjectForm } from '@/components/projects/form';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ProjectApi } from '@/lib/project/project.api';
import type { ProjectDTO } from '@/lib/types';

export default function ProjectsPage() {
    const [items, setItems] = useState<ProjectDTO[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<ProjectDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    const load = async () => {
        setLoading(true);
        try {
            const data = await ProjectApi.findAll();
            setItems(data);
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
        return src.filter(x =>
            (x.translations ?? []).some(
                t =>
                    (t.name ?? '').toLowerCase().includes(needle) ||
                    (t.description ?? '').toLowerCase().includes(needle)
            )
        );
    }, [items, q]);

    const getProjectName = (project: ProjectDTO): string => {
        const frT = project.translations.find(t => t.locale === 'fr');
        const enT = project.translations.find(t => t.locale === 'en');
        return frT?.name || enT?.name || project.translations[0]?.name || '—';
    };

    const getTagCount = (project: ProjectDTO): number =>
        (project.techTagIds?.length ?? 0) + (project.qualTagIds?.length ?? 0);

    const getMediaCount = (project: ProjectDTO): number =>
        project.medias?.length ?? 0;

    return (
        <AdminPageShell>
            <AdminHeader
                title="Projets"
                description="Gere les projets affiches dans le portfolio."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} projet${items.length > 1 ? 's' : ''}`
                            : 'Aucune donnee'}
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
                            <Plus className="mr-1 h-4 w-4" /> Nouveau
                        </Button>
                    </>
                }
            />

            <AdminToolbar>
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un projet..."
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                                <TableRow>
                                    <TableHead>Nom (FR)</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Date
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Liens
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Tags
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Medias
                                    </TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(it => (
                                    <TableRow
                                        key={it.id}
                                        onDoubleClick={() => {
                                            setCurrent(it);
                                            setOpen(true);
                                        }}
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium">
                                            <span className="line-clamp-1">
                                                {getProjectName(it)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                                            {format(
                                                new Date(it.date),
                                                'MMM yyyy',
                                                { locale: fr }
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex items-center gap-1.5">
                                                {it.gitUrl ? (
                                                    <a
                                                        href={it.gitUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={e =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <Badge
                                                            variant="secondary"
                                                            className="cursor-pointer gap-1 hover:bg-secondary/80"
                                                        >
                                                            <Code2 className="h-3 w-3" />
                                                            Git
                                                        </Badge>
                                                    </a>
                                                ) : null}
                                                {it.visitUrl ? (
                                                    <a
                                                        href={it.visitUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={e =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        <Badge
                                                            variant="secondary"
                                                            className="cursor-pointer gap-1 hover:bg-secondary/80"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            Site
                                                        </Badge>
                                                    </a>
                                                ) : null}
                                                {!it.gitUrl && !it.visitUrl && (
                                                    <span className="text-sm text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {getTagCount(it) > 0 ? (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Tag className="h-3 w-3" />
                                                    <span>
                                                        {getTagCount(it)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {getMediaCount(it) > 0 ? (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <ImageIcon className="h-3 w-3" />
                                                    <span>
                                                        {getMediaCount(it)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                aria-label="Basculer la visibilite"
                                                checked={it.isVisible}
                                                disabled={
                                                    visibilityPending === it.id
                                                }
                                                onCheckedChange={async next => {
                                                    setVisibilityPending(it.id);
                                                    // optimistic update
                                                    setItems(prev =>
                                                        prev.map(x =>
                                                            x.id === it.id
                                                                ? {
                                                                      ...x,
                                                                      isVisible:
                                                                          next,
                                                                  }
                                                                : x
                                                        )
                                                    );
                                                    try {
                                                        await ProjectApi.update(
                                                            it.id,
                                                            {
                                                                isVisible: next,
                                                            }
                                                        );
                                                    } catch {
                                                        // rollback
                                                        setItems(prev =>
                                                            prev.map(x =>
                                                                x.id === it.id
                                                                    ? {
                                                                          ...x,
                                                                          isVisible:
                                                                              !next,
                                                                      }
                                                                    : x
                                                            )
                                                        );
                                                    } finally {
                                                        setVisibilityPending(
                                                            null
                                                        );
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setCurrent(it);
                                                        setOpen(true);
                                                    }}
                                                    aria-label="Editer"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Supprimer"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Supprimer ce
                                                                projet ?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Cette action est
                                                                irreversible.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Annuler
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                                                                onClick={async () => {
                                                                    await ProjectApi.remove(
                                                                        it.id
                                                                    );
                                                                    load();
                                                                }}
                                                            >
                                                                Supprimer
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun resultat.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Chargement...
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </AdminCard>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {current ? 'Editer un projet' : 'Creer un projet'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                        <ProjectForm
                            initial={current}
                            dialogOpen={open}
                            onCancel={() => setOpen(false)}
                            onSaved={() => {
                                setOpen(false);
                                load();
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </AdminPageShell>
    );
}
