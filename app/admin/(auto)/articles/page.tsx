'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { ArticleForm } from '@/components/articles/form';
import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
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
import { ArticleApi } from '@/lib/article/article.api';
import { ArticleCategoryApi } from '@/lib/article-category/article-category.api';
import type { ArticleCategoryDTO, ArticleDTO } from '@/lib/types';

function getArticleTitle(article: ArticleDTO): string {
    const frT = article.translations.find(t => t.locale === 'fr');
    const enT = article.translations.find(t => t.locale === 'en');
    return frT?.title || enT?.title || article.translations[0]?.title || '—';
}

function getArticleExcerpt(article: ArticleDTO): string {
    const frT = article.translations.find(t => t.locale === 'fr');
    return frT?.excerpt ?? article.translations[0]?.excerpt ?? '';
}

/**
 * Admin CRUD page for blog articles. Modeled on `ProjectsPage`: list +
 * search, table with optimistic visibility toggle, and an auto-save dialog
 * hosting `ArticleForm`. Also loads categories (needed both to render badges
 * and to pass as options into the form's category picker).
 */
export default function ArticlesPage() {
    const [items, setItems] = useState<ArticleDTO[]>([]);
    const [categories, setCategories] = useState<ArticleCategoryDTO[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<ArticleDTO | null>(null);
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();
    const [loading, setLoading] = useState(false);
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    const load = async () => {
        setLoading(true);
        try {
            const [articles, cats] = await Promise.all([
                ArticleApi.findAll(),
                ArticleCategoryApi.findAll(),
            ]);
            setItems(articles);
            setCategories(cats);
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
        return src.filter(
            x =>
                (x.translations ?? []).some(
                    t =>
                        (t.title ?? '').toLowerCase().includes(needle) ||
                        (t.excerpt ?? '').toLowerCase().includes(needle)
                ) ||
                (x.tags ?? []).some(tag => tag.toLowerCase().includes(needle))
        );
    }, [items, q]);

    const getArticleCategories = (
        article: ArticleDTO
    ): ArticleCategoryDTO[] => {
        if (article.categories?.length) return article.categories;
        const ids = article.categoryIds ?? [];
        return categories.filter(c => ids.includes(c.id));
    };

    return (
        <AdminPageShell>
            <AdminHeader
                title="Articles"
                description="Gère les articles du blog."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} article${items.length > 1 ? 's' : ''}`
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
                            <Plus className="mr-1 h-4 w-4" /> Nouveau
                        </Button>
                    </>
                }
            />

            <AdminToolbar>
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un article..."
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                                <TableRow>
                                    <TableHead>Titre (FR)</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Slug
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Catégories
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Publication
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
                                            <span
                                                className="line-clamp-1"
                                                title={getArticleExcerpt(it)}
                                            >
                                                {getArticleTitle(it)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground md:table-cell">
                                            {it.slug}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {getArticleCategories(it)
                                                    .slice(0, 3)
                                                    .map(c => (
                                                        <Badge
                                                            key={c.id}
                                                            variant="secondary"
                                                        >
                                                            {c.translations?.find(
                                                                t =>
                                                                    t.locale ===
                                                                    'fr'
                                                            )?.name ??
                                                                c
                                                                    .translations?.[0]
                                                                    ?.name}
                                                        </Badge>
                                                    ))}
                                                {getArticleCategories(it)
                                                    .length === 0 && (
                                                    <span className="text-sm text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                                            {it.publishedAt
                                                ? format(
                                                      new Date(it.publishedAt),
                                                      'dd MMM yyyy',
                                                      { locale: fr }
                                                  )
                                                : 'Brouillon'}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                aria-label="Basculer la visibilité"
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
                                                        await ArticleApi.update(
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
                                                    aria-label="Éditer"
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
                                                                Supprimer cet
                                                                article ?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Cette action est
                                                                irréversible.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Annuler
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                                                                onClick={async () => {
                                                                    await ArticleApi.remove(
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
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun résultat.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
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

            <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {current ? 'Éditer un article' : 'Créer un article'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                        <ArticleForm
                            initial={current}
                            categories={categories}
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
        </AdminPageShell>
    );
}
