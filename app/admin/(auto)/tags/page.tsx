'use client';

import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
import { TagForm } from '@/components/tags/tag-form';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { TagApi } from '@/lib/tag/tag.api';
import type { TagDTO } from '@/lib/types';

const typeLabels: Record<TagDTO['type'], string> = {
    TECH: 'Tech',
    QUAL: 'Qualité',
    SKILL_CATEGORY: 'Catégorie',
    EXPERIENCE_TECH: 'Expérience',
};

function getTagName(tag: TagDTO, locale: string) {
    return (
        tag?.nameByLocale?.[locale as keyof typeof tag.nameByLocale] ??
        tag?.nameByLocale?.en ??
        Object.values(tag?.nameByLocale ?? {}).find(Boolean) ??
        '—'
    );
}

export default function TagsPage() {
    const [items, setItems] = useState<TagDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | TagDTO['type']>('ALL');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<TagDTO | null>(null);
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );
    const [deleteTarget, setDeleteTarget] = useState<TagDTO | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();

    const load = async () => {
        setLoading(true);
        try {
            const tags = await TagApi.findAll();
            setItems(tags ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return (items ?? []).filter(tag => {
            if (typeFilter !== 'ALL' && tag.type !== typeFilter) return false;
            if (!needle) return true;
            return Object.values(tag.nameByLocale ?? {}).some(name =>
                (name ?? '').toLowerCase().includes(needle)
            );
        });
    }, [items, q, typeFilter]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Tags"
                description="Pilote les tags utilisés dans les expériences, projets ou compétences."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length ? `${items.length} tags` : 'Aucun tag'}
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
                            Nouveau tag
                        </Button>
                    </>
                }
            />

            <AdminToolbar className="gap-4">
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un tag…"
                    className="w-full max-w-xs"
                />
                <Select
                    value={typeFilter}
                    onValueChange={value =>
                        setTypeFilter(value as 'ALL' | TagDTO['type'])
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tous les types</SelectItem>
                        <SelectItem value="EXPERIENCE_TECH">
                            Expériences
                        </SelectItem>
                        <SelectItem value="TECH">Tech</SelectItem>
                        <SelectItem value="QUAL">Qualités</SelectItem>
                        <SelectItem value="SKILL_CATEGORY">
                            Catégories
                        </SelectItem>
                    </SelectContent>
                </Select>
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-backdrop-filter:bg-muted/40">
                                <TableRow>
                                    <TableHead>Nom</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Couleur
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Visible
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(tag => (
                                    <TableRow
                                        key={tag.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onDoubleClick={() => {
                                            setCurrent(tag);
                                            setOpen(true);
                                        }}
                                    >
                                        <TableCell>
                                            <div className="font-medium">
                                                {getTagName(tag, 'fr')}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {getTagName(tag, 'en')}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {typeLabels[tag.type] ??
                                                    tag.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="h-6 w-6 rounded border"
                                                    style={{
                                                        backgroundColor:
                                                            tag.hexColor,
                                                    }}
                                                />
                                                <span className="font-mono text-xs">
                                                    {tag.hexColor}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Switch
                                                aria-label="Basculer la visibilité"
                                                checked={tag.isVisible}
                                                disabled={
                                                    visibilityPending === tag.id
                                                }
                                                onCheckedChange={async next => {
                                                    setVisibilityPending(
                                                        tag.id
                                                    );
                                                    setItems(prev =>
                                                        prev.map(item =>
                                                            item.id === tag.id
                                                                ? {
                                                                      ...item,
                                                                      isVisible:
                                                                          next,
                                                                  }
                                                                : item
                                                        )
                                                    );
                                                    try {
                                                        await TagApi.patchVisibility(
                                                            tag.id,
                                                            next
                                                        );
                                                    } catch {
                                                        setItems(prev =>
                                                            prev.map(item =>
                                                                item.id ===
                                                                tag.id
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
                                                        setCurrent(tag);
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
                                                        setDeleteTarget(tag)
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
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun tag correspondant.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
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
                            {current ? 'Éditer un tag' : 'Créer un tag'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <TagForm
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
                        <AlertDialogTitle>Supprimer ce tag ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `“${getTagName(deleteTarget, 'fr')}” sera définitivement supprimé.`
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
                                    await TagApi.remove(deleteTarget.id);
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
