'use client';

import {
    ArrowDown,
    ArrowUp,
    Pencil,
    Plus,
    RefreshCcw,
    Trash2,
} from 'lucide-react';
import Image from 'next/image';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CategoryApi, SkillApi } from '@/lib/skill/skill.api';
import type { SkillCategoryDTO, SkillDTO } from '@/lib/types';
import { assetUrl } from '@/lib/utils';

type FormState = {
    isVisible: boolean;
    nameFr: string;
    nameEn: string;
    skillIds: string[];
};

const emptyForm = (): FormState => ({
    isVisible: true,
    nameFr: '',
    nameEn: '',
    skillIds: [],
});

function getCategoryName(cat: SkillCategoryDTO, locale: string) {
    return (
        cat.translations?.find(t => t.locale === locale)?.name ??
        cat.translations?.[0]?.name ??
        '—'
    );
}

function getSkillName(skill: SkillDTO) {
    return (
        skill.translations?.find(t => t.locale === 'fr')?.name ??
        skill.translations?.[0]?.name ??
        '—'
    );
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<SkillCategoryDTO[]>([]);
    const [allSkills, setAllSkills] = useState<SkillDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<SkillCategoryDTO | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<SkillCategoryDTO | null>(
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
            const [cats, skills] = await Promise.all([
                CategoryApi.findAll(),
                SkillApi.findAll(),
            ]);
            setCategories(
                [...cats].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            );
            setAllSkills(skills);
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

    const openEdit = (cat: SkillCategoryDTO) => {
        setCurrent(cat);
        setForm({
            isVisible: cat.isVisible,
            nameFr: cat.translations?.find(t => t.locale === 'fr')?.name ?? '',
            nameEn: cat.translations?.find(t => t.locale === 'en')?.name ?? '',
            skillIds: cat.skills?.map(s => s.id) ?? [],
        });
        setOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                isVisible: form.isVisible,
                translations: [
                    { locale: 'fr', name: form.nameFr },
                    { locale: 'en', name: form.nameEn },
                ],
                skillIds: form.skillIds,
            };
            if (current) {
                await CategoryApi.update(current.id, payload);
            } else {
                await CategoryApi.create(payload);
            }
            setOpen(false);
            load();
        } finally {
            setSaving(false);
        }
    };

    const toggleSkill = (id: string) => {
        setForm(prev => ({
            ...prev,
            skillIds: prev.skillIds.includes(id)
                ? prev.skillIds.filter(s => s !== id)
                : [...prev.skillIds, id],
        }));
    };

    /** Move a selected skill up/down in the dialog's display-order list. */
    const moveSkill = (index: number, dir: -1 | 1) => {
        setForm(prev => {
            const next = [...prev.skillIds];
            const target = index + dir;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return { ...prev, skillIds: next };
        });
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
            await CategoryApi.reorder(
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
                title="Catégories de compétences"
                description="Organise les compétences par catégorie."
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
                                    <TableHead>Compétences</TableHead>
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
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {(cat.skills ?? [])
                                                    .slice(0, 4)
                                                    .map(s => (
                                                        <Badge
                                                            key={s.id}
                                                            variant="secondary"
                                                            className="gap-1"
                                                        >
                                                            {s.image && (
                                                                <Image
                                                                    src={assetUrl(
                                                                        s.image
                                                                    )}
                                                                    alt=""
                                                                    width={12}
                                                                    height={12}
                                                                    className="rounded"
                                                                    unoptimized
                                                                />
                                                            )}
                                                            {getSkillName(s)}
                                                        </Badge>
                                                    ))}
                                                {(cat.skills?.length ?? 0) >
                                                    4 && (
                                                    <Badge variant="outline">
                                                        +{cat.skills.length - 4}
                                                    </Badge>
                                                )}
                                                {(cat.skills?.length ?? 0) ===
                                                    0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Aucune
                                                    </span>
                                                )}
                                            </div>
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
                                                        await CategoryApi.update(
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
                                    placeholder="Frontend"
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
                                    placeholder="Frontend"
                                />
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
                            <Label htmlFor="visible">
                                Visible sur le portfolio
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Compétences ({form.skillIds.length}{' '}
                                sélectionnées)
                            </Label>

                            {form.skillIds.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">
                                        Ordre d&apos;affichage — utilisez les
                                        flèches pour réordonner.
                                    </p>
                                    <div className="rounded-md border p-2 space-y-1">
                                        {form.skillIds.map((id, index) => {
                                            const skill = allSkills.find(
                                                s => s.id === id
                                            );
                                            if (!skill) return null;
                                            return (
                                                <div
                                                    key={id}
                                                    className="flex items-center gap-2 rounded px-2 py-1"
                                                >
                                                    <span className="w-5 text-xs text-muted-foreground tabular-nums">
                                                        {index + 1}
                                                    </span>
                                                    {skill.image && (
                                                        <Image
                                                            src={assetUrl(
                                                                skill.image
                                                            )}
                                                            alt=""
                                                            width={20}
                                                            height={20}
                                                            className="rounded object-contain"
                                                            unoptimized
                                                        />
                                                    )}
                                                    <span className="flex-1 text-sm">
                                                        {getSkillName(skill)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        aria-label="Monter"
                                                        disabled={index === 0}
                                                        onClick={() =>
                                                            moveSkill(index, -1)
                                                        }
                                                    >
                                                        <ArrowUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        aria-label="Descendre"
                                                        disabled={
                                                            index ===
                                                            form.skillIds
                                                                .length -
                                                                1
                                                        }
                                                        onClick={() =>
                                                            moveSkill(index, 1)
                                                        }
                                                    >
                                                        <ArrowDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="max-h-64 overflow-y-auto rounded-md border p-2 space-y-1">
                                {allSkills.map(skill => (
                                    <div
                                        key={skill.id}
                                        className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                                        onClick={() => toggleSkill(skill.id)}
                                    >
                                        <Checkbox
                                            checked={form.skillIds.includes(
                                                skill.id
                                            )}
                                            onCheckedChange={() =>
                                                toggleSkill(skill.id)
                                            }
                                        />
                                        {skill.image && (
                                            <Image
                                                src={assetUrl(skill.image)}
                                                alt=""
                                                width={20}
                                                height={20}
                                                className="rounded object-contain"
                                                unoptimized
                                            />
                                        )}
                                        <span className="text-sm">
                                            {getSkillName(skill)}
                                        </span>
                                    </div>
                                ))}
                                {allSkills.length === 0 && (
                                    <p className="text-center text-sm text-muted-foreground py-4">
                                        Aucun skill disponible.
                                    </p>
                                )}
                            </div>
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
                            disabled={saving || !form.nameFr}
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
                                    await CategoryApi.remove(deleteTarget.id);
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
