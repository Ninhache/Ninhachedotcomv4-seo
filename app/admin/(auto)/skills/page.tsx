'use client';

import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
import { SkillForm } from '@/components/skills/form';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { SkillApi } from '@/lib/skill/skill.api';
import type { SkillDTO } from '@/lib/types';
import { assetUrl } from '@/lib/utils';

function getSkillName(skill: SkillDTO, locale: string) {
    return (
        skill.translations?.find(t => t.locale === locale)?.name ??
        skill.translations?.[0]?.name ??
        '—'
    );
}

export default function SkillsPage() {
    const [items, setItems] = useState<SkillDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<SkillDTO | null>(null);
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );
    const [deleteTarget, setDeleteTarget] = useState<SkillDTO | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const skills = await SkillApi.findAll();
            setItems(skills ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return items ?? [];
        return (items ?? []).filter(skill =>
            skill.translations?.some(t =>
                (t.name ?? '').toLowerCase().includes(needle)
            )
        );
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Skills"
                description="Gère les compétences affichées sur le portfolio."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} skills`
                            : 'Aucun skill'}
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
                            <Plus className="mr-1 h-4 w-4" />
                            Nouveau skill
                        </Button>
                    </>
                }
            />

            <AdminToolbar className="gap-4">
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un skill…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-backdrop-filter:bg-muted/40">
                                <TableRow>
                                    <TableHead className="hidden md:table-cell">
                                        Image
                                    </TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Wiki URL
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Tags
                                    </TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(skill => (
                                    <TableRow
                                        key={skill.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onDoubleClick={() => {
                                            setCurrent(skill);
                                            setOpen(true);
                                        }}
                                    >
                                        <TableCell className="hidden md:table-cell">
                                            {skill.image ? (
                                                <Image
                                                    src={assetUrl(skill.image)}
                                                    alt={getSkillName(
                                                        skill,
                                                        'fr'
                                                    )}
                                                    width={32}
                                                    height={32}
                                                    className="h-8 w-8 rounded object-contain"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-muted" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {getSkillName(skill, 'fr')}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {getSkillName(skill, 'en')}
                                            </p>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {skill.wikiUrl ? (
                                                <a
                                                    href={skill.wikiUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="truncate text-xs text-primary underline-offset-4 hover:underline"
                                                    onClick={e =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    {skill.wikiUrl}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {skill.tags
                                                    ?.slice(0, 3)
                                                    .map(tag => (
                                                        <Badge
                                                            key={tag.id}
                                                            variant="secondary"
                                                            style={
                                                                tag.hexColor
                                                                    ? {
                                                                          backgroundColor:
                                                                              tag.hexColor,
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            {tag.nameByLocale
                                                                ?.fr ??
                                                                tag.nameByLocale
                                                                    ?.en ??
                                                                tag.id}
                                                        </Badge>
                                                    ))}
                                                {(skill.tags?.length ?? 0) >
                                                    3 && (
                                                    <Badge variant="outline">
                                                        +{skill.tags.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                aria-label="Basculer la visibilité"
                                                checked={skill.isVisible}
                                                disabled={
                                                    visibilityPending ===
                                                    skill.id
                                                }
                                                onCheckedChange={async next => {
                                                    setVisibilityPending(
                                                        skill.id
                                                    );
                                                    setItems(prev =>
                                                        prev.map(item =>
                                                            item.id === skill.id
                                                                ? {
                                                                      ...item,
                                                                      isVisible:
                                                                          next,
                                                                  }
                                                                : item
                                                        )
                                                    );
                                                    try {
                                                        await SkillApi.update(
                                                            skill.id,
                                                            { isVisible: next }
                                                        );
                                                    } catch {
                                                        setItems(prev =>
                                                            prev.map(item =>
                                                                item.id ===
                                                                skill.id
                                                                    ? {
                                                                          ...item,
                                                                          isVisible:
                                                                              !next,
                                                                      }
                                                                    : item
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
                                                    aria-label="Éditer"
                                                    onClick={() => {
                                                        setCurrent(skill);
                                                        setOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Supprimer"
                                                    onClick={() =>
                                                        setDeleteTarget(skill)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun skill correspondant.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Chargement…
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </AdminCard>

            <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {current ? 'Éditer un skill' : 'Créer un skill'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <SkillForm
                            initial={current}
                            dialogOpen={open}
                            onRegister={register}
                            onCancel={() =>
                                closeWithoutSaving(() => setOpen(false))
                            }
                            onSaved={() => {
                                closeWithoutSaving(() => setOpen(false));
                                load();
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={next => !next && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer ce skill ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `"${getSkillName(deleteTarget, 'fr')}" sera définitivement supprimé.`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setDeleteTarget(null)}
                        >
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                            disabled={deleting}
                            onClick={async () => {
                                if (!deleteTarget) return;
                                setDeleting(true);
                                try {
                                    await SkillApi.remove(deleteTarget.id);
                                    setDeleteTarget(null);
                                    load();
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPageShell>
    );
}
