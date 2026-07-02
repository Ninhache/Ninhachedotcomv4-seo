'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, Loader2, Pencil, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ArticlePreview } from '@/components/articles/article-preview';
import { ArticleCategoryMultiSelect } from '@/components/forms/article-category-multi-select';
import { DateField } from '@/components/forms/date-field';
import { LocaleTabs } from '@/components/forms/locale-tabs';
import { MediaUploadField } from '@/components/forms/media-upload-field';
import { TagsInput } from '@/components/forms/tags-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArticleApi } from '@/lib/article/article.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import type { ArticleCategoryDTO, ArticleDTO, Locale } from '@/lib/types';

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
    raw ? (raw instanceof Date ? raw : new Date(raw as string)) : undefined;

const translationShape = z.object({
    title: z.string().min(1, 'Requis'),
    excerpt: z.string().min(1, 'Requis'),
    body: z.string().min(1, 'Requis'),
});

/**
 * Full-page, CMS-style article editor: a main content column (per-locale, with
 * an Édition | Prévisualisation segmented toggle) plus a settings sidebar
 * (slug / date / visibility / cover / categories / tags). Replaces the old
 * card-based `ArticleForm` + side-by-side markdown editor. Reuses the same
 * RHF + zod contract so the save payload is unchanged.
 */
export function ArticleEditor({
    initial,
    categories,
    onSaved,
    onCancel,
}: {
    initial?: ArticleDTO | null;
    categories: ArticleCategoryDTO[];
    onSaved?: (saved: ArticleDTO) => void;
    onCancel?: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');

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

    const primaryLocale = locales.includes('fr')
        ? 'fr'
        : ((locales[0] as string) ?? 'fr');

    const FormSchema = useMemo(() => {
        return z
            .object({
                slug: z
                    .string()
                    .min(1, 'Requis')
                    .regex(SLUG_RE, 'kebab-case uniquement (ex: mon-article)'),
                isVisible: z.boolean(),
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

    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    const formElRef = useRef<HTMLFormElement>(null);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
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

    const catNamesFor = (loc: string) =>
        (form.watch('categoryIds') ?? [])
            .map(id => categories.find(c => c.id === id))
            .filter((c): c is ArticleCategoryDTO => Boolean(c))
            .map(
                c =>
                    c.translations.find(t => t.locale === loc)?.name ??
                    c.translations[0]?.name ??
                    c.slug
            );

    const isVisible = form.watch('isVisible');
    const slugError = form.formState.errors.slug?.message;

    return (
        <form ref={formElRef} onSubmit={handleFormSubmit} className="space-y-6">
            {/* Action bar */}
            <div className="flex items-center justify-end gap-2">
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

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main content column */}
                <div className="lg:col-span-2">
                    <LocaleTabs
                        locales={locales as any}
                        defaultLocale={(locales[0] as any) ?? 'fr'}
                        render={loc => (
                            <div className="pt-2">
                                <Tabs
                                    value={mode}
                                    onValueChange={v =>
                                        setMode(v as 'edit' | 'preview')
                                    }
                                >
                                    <TabsList>
                                        <TabsTrigger value="edit">
                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                            Édition
                                        </TabsTrigger>
                                        <TabsTrigger value="preview">
                                            <Eye className="mr-1.5 h-3.5 w-3.5" />
                                            Prévisualisation
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent
                                        value="edit"
                                        className="space-y-4 pt-4"
                                    >
                                        <div className="grid gap-2">
                                            <Label>Titre</Label>
                                            <Input
                                                {...form.register(
                                                    `translations.${loc}.title` as any
                                                )}
                                                placeholder="Titre de l'article"
                                                className="text-lg font-semibold"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Extrait</Label>
                                            <Textarea
                                                rows={2}
                                                {...form.register(
                                                    `translations.${loc}.excerpt` as any
                                                )}
                                                placeholder="Résumé court affiché dans les listes"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Corps (MDX)</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Markdown (GFM, `:::tip`, code
                                                Shiki) + composants&nbsp;:{' '}
                                                <code>{'<Callout>'}</code>,{' '}
                                                <code>{'<Figure>'}</code>,{' '}
                                                <code>{'<Chart>'}</code>.
                                                Échappe un <code>{'<'}</code> ou{' '}
                                                <code>{'{'}</code> isolé (
                                                <code>{'\\<'}</code>,{' '}
                                                <code>{'\\{'}</code>).
                                            </p>
                                            <Textarea
                                                {...form.register(
                                                    `translations.${loc}.body` as any
                                                )}
                                                placeholder={
                                                    '## Introduction\n\nÉcris en MDX — GFM, `:::tip`, blocs de code, et <Callout type="tip">…</Callout>'
                                                }
                                                className="min-h-[32rem] resize-y font-mono text-sm leading-relaxed"
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent
                                        value="preview"
                                        className="pt-4"
                                    >
                                        <ArticlePreview
                                            data={{
                                                title:
                                                    (form.watch(
                                                        `translations.${loc}.title` as any
                                                    ) as string) ?? '',
                                                coverUrl:
                                                    form.watch(
                                                        'coverImageUrl'
                                                    ) || undefined,
                                                publishedAt: toDate(
                                                    form.watch('publishedAt')
                                                ),
                                                body:
                                                    (form.watch(
                                                        `translations.${loc}.body` as any
                                                    ) as string) ?? '',
                                                categories: catNamesFor(loc),
                                            }}
                                        />
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    />
                </div>

                {/* Settings sidebar */}
                <aside className="h-fit space-y-5 rounded-lg border p-4 lg:sticky lg:top-4">
                    <h3 className="text-sm font-semibold">Réglages</h3>

                    <div className="grid gap-2">
                        <Label>Slug</Label>
                        <Input
                            {...form.register('slug')}
                            placeholder="mon-article"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={applySlugFromTitle}
                        >
                            <Sparkles className="mr-1 h-4 w-4" />
                            Générer depuis le titre
                        </Button>
                        {slugError && (
                            <p className="text-sm text-destructive">
                                {slugError}
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

                    <div className="flex items-center gap-3">
                        <Switch
                            checked={!!isVisible}
                            onCheckedChange={v =>
                                form.setValue('isVisible', v, {
                                    shouldDirty: true,
                                })
                            }
                        />
                        <Label className="cursor-pointer">
                            {isVisible ? 'Visible' : 'Masqué (brouillon)'}
                        </Label>
                    </div>

                    <MediaUploadField
                        label="Image de couverture"
                        value={form.watch('coverImageUrl') ?? ''}
                        onChange={v =>
                            form.setValue('coverImageUrl', v, {
                                shouldDirty: true,
                            })
                        }
                    />

                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Catégories
                        </Label>
                        <ArticleCategoryMultiSelect
                            value={form.watch('categoryIds') ?? []}
                            onChange={ids =>
                                form.setValue('categoryIds', ids, {
                                    shouldDirty: true,
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
                                })
                            }
                        />
                    </div>
                </aside>
            </div>
        </form>
    );
}
