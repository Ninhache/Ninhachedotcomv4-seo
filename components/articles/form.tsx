'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Eye,
    EyeOff,
    FileText,
    Globe,
    Loader2,
    Sparkles,
    Tag,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArticleCategoryMultiSelect } from '@/components/forms/article-category-multi-select';
import { DateField } from '@/components/forms/date-field';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { FormSection } from '@/components/forms/form-section';
import { LocaleTabs } from '@/components/forms/locale-tabs';
import { MarkdownEditor } from '@/components/forms/markdown-editor';
import { MediaUploadField } from '@/components/forms/media-upload-field';
import { TagsInput } from '@/components/forms/tags-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ArticleApi } from '@/lib/article/article.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import type { ArticleCategoryDTO, ArticleDTO, Locale } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// kebab-case: lowercase letters/digits, single hyphens, no leading/trailing hyphen.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugify a title client-side for the "Générer depuis le titre" shortcut. */
function slugify(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Coerce a watched RHF value (Date | string | undefined) into a Date.
const toDate = (raw: unknown): Date | undefined =>
    raw ? (raw instanceof Date ? raw : new Date(raw as any)) : undefined;

/* ------------------------------------------------------------------ */
/*  Zod schema                                                        */
/* ------------------------------------------------------------------ */
const translationShape = z.object({
    title: z.string().min(1, 'Requis'),
    excerpt: z.string().min(1, 'Requis'),
    body: z.string().min(1, 'Requis'),
});

/* ================================================================== */
/*  ArticleForm                                                       */
/* ================================================================== */
/**
 * Create/edit form for a blog article. Mirrors `ProjectForm`'s shape (dynamic
 * locales, superRefine translation completeness, imperative auto-save handle
 * for the host dialog): "Informations" (slug/publication/visibility/cover),
 * "Catégories & tags", then per-locale "Contenu" (title/excerpt/Markdown body).
 */
export function ArticleForm({
    initial,
    categories,
    onSaved,
    onCancel,
    onRegister,
}: {
    initial?: ArticleDTO | null;
    categories: ArticleCategoryDTO[];
    onSaved?: (saved: ArticleDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
}) {
    const [loading, setLoading] = useState(false);

    // dynamic locales (fallback fr/en)
    const [locales, setLocales] = useState<Array<'fr' | 'en' | string>>([
        'fr',
        'en',
    ]);
    useEffect(() => {
        LocalesApi.findAll()
            .then(ls =>
                Array.isArray(ls) && ls.length ? setLocales(ls) : undefined
            )
            .catch(() => {});
    }, []);

    // Source locale for the "generate slug" / category-picker labels: prefer
    // fr (the admin's editorial default), fall back to whatever's first.
    const primaryLocale = locales.includes('fr')
        ? 'fr'
        : ((locales[0] as string) ?? 'fr');

    // Zod schema (dynamic locales)
    const FormSchema = useMemo(() => {
        return z
            .object({
                slug: z
                    .string()
                    .min(1, 'Requis')
                    .regex(SLUG_RE, 'kebab-case uniquement (ex: mon-article)'),
                isVisible: z.boolean(),
                // Optional/clearable: null = draft/never published.
                publishedAt: z.coerce.date().optional(),
                coverImageUrl: z
                    .string()
                    .optional()
                    .or(z.literal('').transform(() => undefined)),
                tags: z.array(z.string()).default([]),
                categoryIds: z.array(z.string()).default([]),
                translations: z.record(z.string(), translationShape),
            })
            .superRefine((data, ctx) => {
                const missing = locales.filter(
                    loc => !data.translations?.[loc]
                );
                missing.forEach(loc =>
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['translations', loc],
                        message: `Traduction ${String(loc).toUpperCase()} requise`,
                    })
                );
                const extras = Object.keys(data.translations ?? {}).filter(
                    k => !locales.includes(k)
                );
                if (extras.length) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['translations'],
                        message: `Locales non supportées: ${extras.join(', ')}`,
                    });
                }
            });
    }, [locales]);

    type FormInput = z.input<typeof FormSchema>;
    type FormOutput = z.output<typeof FormSchema>;

    // defaults from initial + locales
    const defaultValues: FormInput = useMemo(() => {
        const mapT = (loc: string) => {
            const t = initial?.translations.find(
                t => t.locale === (loc as Locale)
            );
            return {
                title: t?.title ?? '',
                excerpt: t?.excerpt ?? '',
                body: t?.body ?? '',
            };
        };
        const translations = Object.fromEntries(
            locales.map(loc => [loc, mapT(loc)])
        );

        return {
            slug: initial?.slug ?? '',
            isVisible: initial?.isVisible ?? true,
            publishedAt: initial?.publishedAt
                ? new Date(initial.publishedAt)
                : undefined,
            coverImageUrl: initial?.coverImageUrl ?? undefined,
            tags: initial?.tags ?? [],
            categoryIds:
                initial?.categoryIds ??
                initial?.categories?.map(c => c.id) ??
                [],
            translations,
        };
    }, [initial, locales]);

    const form = useForm<FormInput>({
        resolver: zodResolver(FormSchema),
        defaultValues,
    });

    // reset form when locales or initial change
    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    const formElRef = useRef<HTMLFormElement>(null);
    // RHF's formState proxy only tracks fields read during render — read
    // isDirty here so it stays current, exposed via a ref to the dialog.
    const isDirtyRef = useRef(false);
    isDirtyRef.current = form.formState.isDirty;
    useEffect(() => {
        onRegister?.({
            isDirty: () => isDirtyRef.current,
            submit: () => formElRef.current?.requestSubmit(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // submit — defensive: stop propagation so portalled dialogs can't trigger us
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit(async raw => {
            setLoading(true);
            try {
                const values = FormSchema.parse(raw) as FormOutput;

                const payload = {
                    slug: values.slug,
                    isVisible: values.isVisible,
                    publishedAt: values.publishedAt
                        ? values.publishedAt.toISOString()
                        : null,
                    coverImageUrl: values.coverImageUrl ?? null,
                    tags: values.tags ?? [],
                    categoryIds: values.categoryIds ?? [],
                    translations: Object.entries(values.translations).map(
                        ([locale, t]) => ({
                            locale: locale as Locale,
                            title: t.title,
                            excerpt: t.excerpt,
                            body: t.body,
                        })
                    ),
                };

                const saved: ArticleDTO = initial
                    ? await ArticleApi.update(initial.id, payload)
                    : await ArticleApi.create(payload);

                onSaved?.(saved);
            } finally {
                setLoading(false);
            }
        })(e);
    };

    const applySlugFromTitle = () => {
        const title = form.getValues(
            `translations.${primaryLocale}.title` as any
        ) as string | undefined;
        if (!title) return;
        form.setValue('slug', slugify(title), {
            shouldDirty: true,
            shouldValidate: true,
        });
    };

    const isVisible = form.watch('isVisible');

    return (
        <form ref={formElRef} onSubmit={handleFormSubmit} className="space-y-8">
            {/* ── Section 1: Informations ── */}
            <FormSection
                collapsible
                icon={Globe}
                title="Informations"
                description="Identifiant, publication, visibilité et image de couverture."
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label>Slug</Label>
                        <div className="flex gap-2">
                            <Input
                                {...form.register('slug')}
                                placeholder="mon-article"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                                onClick={applySlugFromTitle}
                            >
                                <Sparkles className="mr-1 h-4 w-4" />
                                Générer depuis le titre
                            </Button>
                        </div>
                        {form.formState.errors.slug?.message && (
                            <p className="text-sm text-destructive">
                                {form.formState.errors.slug.message}
                            </p>
                        )}
                    </div>

                    <DateField
                        label="Date de publication"
                        clearable
                        emptyLabel="Non publié (brouillon)"
                        value={toDate(form.watch('publishedAt'))}
                        onChange={d =>
                            form.setValue('publishedAt', d as any, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    />
                </div>

                <div className="flex items-center gap-3">
                    <Switch
                        checked={!!isVisible}
                        onCheckedChange={v =>
                            form.setValue('isVisible', v, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    />
                    <div className="flex items-center gap-1.5">
                        {isVisible ? (
                            <Eye className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Label className="cursor-pointer">
                            {isVisible ? 'Visible' : 'Masqué'}
                        </Label>
                    </div>
                </div>

                <MediaUploadField
                    label="Image de couverture"
                    value={form.watch('coverImageUrl') ?? ''}
                    onChange={v =>
                        form.setValue('coverImageUrl', v, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                />
            </FormSection>

            {/* ── Section 2: Catégories & tags ── */}
            <FormSection
                collapsible
                icon={Tag}
                title="Catégories & tags"
                description="Classement dans le blog et mots-clés libres."
            >
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Catégories</Label>
                    <ArticleCategoryMultiSelect
                        value={form.watch('categoryIds') ?? []}
                        onChange={ids =>
                            form.setValue('categoryIds', ids, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                        options={categories}
                        locale={primaryLocale}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Tags</Label>
                    <TagsInput
                        value={form.watch('tags') ?? []}
                        onChange={tags =>
                            form.setValue('tags', tags, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    />
                </div>
            </FormSection>

            {/* ── Section 3: Contenu ── */}
            <FormSection
                collapsible
                icon={FileText}
                title="Contenu"
                description="Titre, extrait et corps (Markdown) dans chaque langue."
            >
                <LocaleTabs
                    locales={locales as any}
                    defaultLocale={(locales[0] as any) ?? 'fr'}
                    render={loc => (
                        <div className="grid gap-4 pt-2">
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Titre
                                </Label>
                                <Input
                                    {...form.register(
                                        `translations.${loc}.title` as any
                                    )}
                                    placeholder="Titre de l'article"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Extrait
                                </Label>
                                <Textarea
                                    rows={3}
                                    {...form.register(
                                        `translations.${loc}.excerpt` as any
                                    )}
                                    placeholder="Résumé court affiché dans les listes"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Corps
                                </Label>
                                <MarkdownEditor
                                    value={
                                        form.watch(
                                            `translations.${loc}.body` as any
                                        ) ?? ''
                                    }
                                    onChange={v =>
                                        form.setValue(
                                            `translations.${loc}.body` as any,
                                            v,
                                            {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                            }
                                        )
                                    }
                                />
                            </div>
                        </div>
                    )}
                />
            </FormSection>

            {/* ── Footer actions ── */}
            <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {initial ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </form>
    );
}
