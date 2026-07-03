'use client';

import {
    ArrowDown,
    ArrowUp,
    Pencil,
    Plus,
    RefreshCcw,
    Sparkles,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
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
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArticleCategoryApi } from '@/lib/article-category/article-category.api';
import type { ArticleCategoryDTO } from '@/lib/types';

type FormState = {
    slug: string;
    isVisible: boolean;
    nameFr: string;
    nameEn: string;
};

const emptyForm = (): FormState => ({
    slug: '',
    isVisible: true,
    nameFr: '',
    nameEn: '',
});

function getCategoryName(cat: ArticleCategoryDTO, locale: string) {
    return (
        cat.translations?.find(t => t.locale === locale)?.name ??
        cat.translations?.[0]?.name ??
        '—'
    );
}

/** Slugify a name client-side for the "Générer depuis le nom" shortcut. */
function slugify(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Admin CRUD page for blog categories (`ArticleCategory`). Copy of the Skills
 * `CategoriesPage` shape (table + order arrows + reorder + create/edit dialog
 * + optimistic visibility switch + delete confirm), with a `slug` field added
 * and the skill picker dropped — category↔article membership is authored on
 * the article form, not here.
 */
export default function ArticleCategoriesPage() {
    const [categories, setCategories] = useState<ArticleCategoryDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<ArticleCategoryDTO | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<ArticleCategoryDTO | null>(
        null
    );
    const [deleting, setDeleting] = useState(false);
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );
    const [reordering, setReordering] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const cats = await ArticleCategoryApi.findAll();
            setCategories(
                [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        setCurrent(null);
        setForm(emptyForm());
        setOpen(true);
    };

    const openEdit = (cat: ArticleCategoryDTO) => {
        setCurrent(cat);
        setForm({
            slug: cat.slug,
            isVisible: cat.isVisible,
            nameFr: cat.translations?.find(t => t.locale === 'fr')?.name ?? '',
            nameEn: cat.translations?.find(t => t.locale === 'en')?.name ?? '',
        });
        setOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                slug: form.slug,
                isVisible: form.isVisible,
                translations: [
                    { locale: 'fr', name: form.nameFr },
                    { locale: 'en', name: form.nameEn },
                ],
            };
            if (current) {
                await ArticleCategoryApi.update(current.id, payload);
            } else {
                await ArticleCategoryApi.create(payload);
            }
            setOpen(false);
            load();
        } finally {
            setSaving(false);
        }
    };

    /**
     * Swap a category with its neighbour and persist the whole ordering in one
     * batch request. Optimistic: the table reverts if the backend rejects.
     */
    const moveCategory = async (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= categories.length) return;

        const previous = categories;
        const next = [...categories];
        [next[index], next[target]] = [next[target], next[index]];
        setCategories(next);
        setReordering(true);
        try {
            await ArticleCategoryApi.reorder(
                next.map((c, i) => ({ id: c.id, order: i }))
            );
        } catch {
            setCategories(previous);
        } finally {
            setReordering(false);
        }
    };

    return (
        <AdminPageShell>
            <AdminHeader
                title="Catégories (Blog)"
                description="Organise les catégories du blog."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {categories.length
                            ? `${categories.length} catégories`
                            : 'Aucune catégorie'}
                    </p>
                }
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={load}
                            disabled={loading}
                        >
                            <RefreshCcw className="mr-1 h-4 w-4" />
                            Actualiser
                        </Button>
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="mr-1 h-4 w-4" />
                            Nouvelle catégorie
                        </Button>
                    </>
                }
            />

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-24">
                                        Ordre
                                    </TableHead>
                                    <TableHead>Nom (FR)</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Nom (EN)
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Slug
                                    </TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.map((cat, index) => (
                                    <TableRow
                                        key={cat.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onDoubleClick={() => openEdit(cat)}
                                    >
                                        <TableCell
                                            onDoubleClick={e =>
                                                e.stopPropagation()
                                            }
                                        >
                                            <div className="inline-flex items-center gap-0.5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    aria-label="Monter"
                                                    disabled={
                                                        reordering ||
                                                        index === 0
                                                    }
                                                    onClick={() =>
                                                        moveCategory(index, -1)
                                                    }
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    aria-label="Descendre"
                                                    disabled={
                                                        reordering ||
                                                        index ===
                                                            categories.length -
                                                                1
                                                    }
                                                    onClick={() =>
                                                        moveCategory(index, 1)
                                                    }
                                                >
                                                    <ArrowDown className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {getCategoryName(cat, 'fr')}
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground md:table-cell">
                                            {getCategoryName(cat, 'en')}
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground md:table-cell">
                                            {cat.slug}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={cat.isVisible}
                                                disabled={
                                                    visibilityPending === cat.id
                                                }
                                                aria-label="Basculer la visibilité"
                                                onCheckedChange={async next => {
                                                    setVisibilityPending(
                                                        cat.id
                                                    );
                                                    setCategories(prev =>
                                                        prev.map(c =>
                                                            c.id === cat.id
                                                                ? {
                                                                      ...c,
                                                                      isVisible:
                                                                          next,
                                                                  }
                                                                : c
                                                        )
                                                    );
                                                    try {
                                                        await ArticleCategoryApi.update(
                                                            cat.id,
                                                            { isVisible: next }
                                                        );
                                                    } catch {
                                                        setCategories(prev =>
                                                            prev.map(c =>
                                                                c.id === cat.id
                                                                    ? {
                                                                          ...c,
                                                                          isVisible:
                                                                              !next,
                                                                      }
                                                                    : c
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
                                                    onClick={() =>
                                                        openEdit(cat)
                                                    }
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Supprimer"
                                                    onClick={() =>
                                                        setDeleteTarget(cat)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && categories.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucune catégorie.
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

            {/* Edit / Create dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>
                            {current
                                ? 'Éditer une catégorie'
                                : 'Nouvelle catégorie'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-5 py-2 pr-1">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Nom (Français)</Label>
                                <Input
                                    value={form.nameFr}
                                    onChange={e =>
                                        setForm(p => ({
                                            ...p,
                                            nameFr: e.target.value,
                                        }))
                                    }
                                    placeholder="Actualités"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Nom (English)</Label>
                                <Input
                                    value={form.nameEn}
                                    onChange={e =>
                                        setForm(p => ({
                                            ...p,
                                            nameEn: e.target.value,
                                        }))
                                    }
                                    placeholder="News"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Slug</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={form.slug}
                                    onChange={e =>
                                        setForm(p => ({
                                            ...p,
                                            slug: e.target.value,
                                        }))
                                    }
                                    placeholder="actualites"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() =>
                                        setForm(p => ({
                                            ...p,
                                            slug: slugify(p.nameFr),
                                        }))
                                    }
                                    disabled={!form.nameFr}
                                >
                                    <Sparkles className="mr-1 h-4 w-4" />
                                    Générer depuis le nom
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="visible"
                                checked={form.isVisible}
                                onCheckedChange={v =>
                                    setForm(p => ({ ...p, isVisible: v }))
                                }
                            />
                            <Label htmlFor="visible">Visible sur le blog</Label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving || !form.nameFr || !form.slug}
                        >
                            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete confirm */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={open => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer cette catégorie ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `"${getCategoryName(deleteTarget, 'fr')}" sera définitivement supprimée.`
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleting}
                            onClick={async () => {
                                if (!deleteTarget) return;
                                setDeleting(true);
                                try {
                                    await ArticleCategoryApi.remove(
                                        deleteTarget.id
                                    );
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
