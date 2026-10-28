'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { SeoGradeBadge } from '@/components/articles/seo-grade-badge';
import {
    type MdxScoreInput,
    useMdxScores,
} from '@/components/articles/use-mdx-scores';
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
import type {
    ArticleCategoryDTO,
    ArticleDTO,
    ArticleTranslationDTO,
    Locale,
} from '@/lib/types';

/** Les deux langues du site. L'ordre est celui de la bascule. */
const LOCALES: Locale[] = ['fr', 'en'];

const LOCALE_LABEL: Record<Locale, string> = {
    fr: 'Français',
    en: 'English',
};

/** La traduction demandee, ou `undefined` si l'article ne l'a pas encore. */
function getTranslation(
    article: ArticleDTO,
    locale: Locale
): ArticleTranslationDTO | undefined {
    return article.translations.find(t => t.locale === locale);
}

/**
 * Le titre a afficher pour la locale courante.
 *
 * Replis explicites : une traduction manquante ne doit pas laisser une ligne
 * vide, sans quoi l'article devient introuvable dans la liste.
 */
function getArticleTitle(article: ArticleDTO, locale: Locale): string {
    const wanted = getTranslation(article, locale);
    const other = article.translations.find(t => t.locale !== locale);
    return wanted?.title || other?.title || '—';
}

function getArticleExcerpt(article: ArticleDTO, locale: Locale): string {
    return (
        getTranslation(article, locale)?.excerpt ??
        article.translations[0]?.excerpt ??
        ''
    );
}

/** Cle de note d'une traduction : l'article et la langue, pas l'id, absent en creation. */
const scoreKey = (articleId: string, locale: Locale) =>
    `${articleId}:${locale}`;

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
    const [locale, setLocale] = useState<Locale>('fr');
    const router = useRouter();
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

    // Toutes les traductions sont notees, pas seulement la langue affichee :
    // l'objectif est un rang C dans les deux, donc les deux doivent se voir.
    const scoreInputs = useMemo<MdxScoreInput[]>(
        () =>
            items.flatMap(a =>
                a.translations.map(tr => ({
                    key: scoreKey(a.id, tr.locale),
                    title: tr.title,
                    body: tr.body,
                    brief: tr.seoBrief,
                }))
            ),
        [items]
    );
    const { scores, pending } = useMdxScores(scoreInputs);

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
                        {pending > 0 &&
                            ` · notation SEO en cours (${pending} restante${
                                pending > 1 ? 's' : ''
                            })`}
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
                            onClick={() => router.push('/admin/articles/new')}
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
                {/* La recherche, elle, porte sur toutes les langues : on ne
                    veut pas rater un article parce qu'on tape son titre
                    anglais alors que la liste est en francais. */}
                <div className="inline-flex overflow-hidden rounded-md border">
                    {LOCALES.map(l => (
                        <button
                            key={l}
                            type="button"
                            onClick={() => setLocale(l)}
                            aria-pressed={locale === l}
                            title={LOCALE_LABEL[l]}
                            className={`px-3 py-1.5 text-xs font-medium uppercase transition-colors ${
                                locale === l
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                                <TableRow>
                                    <TableHead>
                                        Titre ({locale.toUpperCase()})
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Slug public
                                    </TableHead>
                                    <TableHead>SEO</TableHead>
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
                                        onDoubleClick={() =>
                                            router.push(
                                                `/admin/articles/${it.id}/edit`
                                            )
                                        }
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium">
                                            <span
                                                className="line-clamp-1"
                                                title={getArticleExcerpt(
                                                    it,
                                                    locale
                                                )}
                                            >
                                                {getArticleTitle(it, locale)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground md:table-cell">
                                            {/* Le slug public change avec la
                                                langue ; la cle interne de
                                                l'article, elle, n'en a qu'une. */}
                                            <span
                                                title={`clé interne : ${it.slug}`}
                                            >
                                                {getTranslation(it, locale)
                                                    ?.slug ?? '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1">
                                                {LOCALES.map(l =>
                                                    getTranslation(it, l) ? (
                                                        <SeoGradeBadge
                                                            key={l}
                                                            locale={l}
                                                            active={
                                                                l === locale
                                                            }
                                                            loading={Boolean(
                                                                pending &&
                                                                    getTranslation(
                                                                        it,
                                                                        l
                                                                    )?.seoBrief
                                                            )}
                                                            score={
                                                                scores.get(
                                                                    scoreKey(
                                                                        it.id,
                                                                        l
                                                                    )
                                                                ) ?? null
                                                            }
                                                        />
                                                    ) : null
                                                )}
                                            </div>
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
                                                    onClick={() =>
                                                        router.push(
                                                            `/admin/articles/${it.id}/edit`
                                                        )
                                                    }
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
                                            colSpan={7}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun résultat.
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
        </AdminPageShell>
    );
}
