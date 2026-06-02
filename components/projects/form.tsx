'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
    Code2,
    Eye,
    EyeOff,
    Film,
    Globe,
    ImageIcon,
    Loader2,
    Tag,
    Trash2,
    Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DateField } from '@/components/forms/date-field';
import { LocaleTabs } from '@/components/forms/locale-tabs';
import { TagMultiSelect } from '@/components/forms/tag-multi-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { mediaSrc } from '@/lib/baseurl';
import { LocalesApi } from '@/lib/locales/locales.api';
import { ProjectApi } from '@/lib/project/project.api';
import { TagApi } from '@/lib/tag/tag.api';
import type {
    Locale,
    MediaType,
    ProjectDTO,
    ProjectMediaDTO,
    TagDTO,
} from '@/lib/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Section heading helper                                            */
/* ------------------------------------------------------------------ */
function SectionHeading({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description?: string;
}) {
    return (
        <div className="flex items-center gap-2 pb-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
                <h3 className="text-sm font-semibold leading-none">{title}</h3>
                {description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Zod schemas                                                       */
/* ------------------------------------------------------------------ */
const translationShape = z.object({
    name: z.string().min(1, 'Requis'),
    description: z.string().min(1, 'Requis'),
});

const mediaShape = z.object({
    id: z.string().optional(),
    mediaUrl: z.string().min(1),
    type: z.enum(['IMAGE', 'VIDEO']),
    alt: z.string().optional().default(''),
});

/* ================================================================== */
/*  ProjectForm                                                       */
/* ================================================================== */
export function ProjectForm({
    initial,
    onSaved,
    onCancel,
    dialogOpen = false,
}: {
    initial?: ProjectDTO | null;
    onSaved?: (saved: ProjectDTO) => void;
    onCancel?: () => void;
    dialogOpen?: boolean;
}) {
    const [techTags, setTechTags] = useState<TagDTO[]>([]);
    const [qualTags, setQualTags] = useState<TagDTO[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Zod schema (dynamic locales)
    const FormSchema = useMemo(() => {
        return z
            .object({
                startDate: z.coerce.date(),
                // Optional: empty = ongoing project ("depuis plus de X ans/mois").
                endDate: z.coerce.date().optional(),
                gitUrl: z
                    .string()
                    .url()
                    .optional()
                    .or(z.literal('').transform(() => undefined)),
                visitUrl: z
                    .string()
                    .url()
                    .optional()
                    .or(z.literal('').transform(() => undefined)),
                isVisible: z.boolean(),
                techTagIds: z.array(z.string()).default([]),
                qualTagIds: z.array(z.string()).default([]),
                medias: z.array(mediaShape).default([]),
                translations: z.record(z.string(), translationShape),
            })
            .superRefine((data, ctx) => {
                if (data.endDate && data.endDate < data.startDate) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['endDate'],
                        message: 'La fin doit être ≥ début',
                    });
                }
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
                name: t?.name ?? '',
                description: t?.description ?? '',
            };
        };
        const translations = Object.fromEntries(
            locales.map(loc => [loc, mapT(loc)])
        );

        const startSource = initial?.startDate ?? initial?.date;
        return {
            startDate: startSource ? new Date(startSource) : new Date(),
            endDate: initial?.endDate ? new Date(initial.endDate) : undefined,
            gitUrl: initial?.gitUrl ?? undefined,
            visitUrl: initial?.visitUrl ?? undefined,
            isVisible: initial?.isVisible ?? true,
            techTagIds: initial?.techTagIds ?? [],
            qualTagIds: initial?.qualTagIds ?? [],
            medias:
                initial?.medias?.map(m => ({
                    id: m.id,
                    mediaUrl: m.mediaUrl,
                    type: m.type,
                    alt: m.alt ?? m.originalName ?? '',
                })) ?? [],
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

    // load tags when dialog opens
    useEffect(() => {
        if (!dialogOpen) return;
        let ignore = false;
        setTagsLoading(true);
        Promise.allSettled([
            TagApi.findAll({ type: 'TECH' }),
            TagApi.findAll({ type: 'QUAL' }),
        ])
            .then(([techRes, qualRes]) => {
                if (!ignore) {
                    setTechTags(
                        techRes.status === 'fulfilled'
                            ? (techRes.value ?? [])
                            : []
                    );
                    setQualTags(
                        qualRes.status === 'fulfilled'
                            ? (qualRes.value ?? [])
                            : []
                    );
                }
            })
            .finally(() => {
                if (!ignore) setTagsLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [dialogOpen]);

    // media upload handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // reset input so the same file can be re-selected
        e.target.value = '';

        // auto-detect type from MIME
        let mediaType: 'IMAGE' | 'VIDEO' | undefined;
        if (file.type.startsWith('image/')) mediaType = 'IMAGE';
        else if (file.type.startsWith('video/')) mediaType = 'VIDEO';

        setUploading(true);
        try {
            const uploaded = await ProjectApi.uploadMedia(file, mediaType);
            const currentMedias = form.getValues('medias') ?? [];
            form.setValue(
                'medias',
                [
                    ...currentMedias,
                    {
                        id: uploaded.id,
                        mediaUrl: uploaded.mediaUrl,
                        type: uploaded.type,
                        alt: uploaded.alt ?? uploaded.originalName ?? '',
                    },
                ],
                {
                    shouldDirty: true,
                    shouldValidate: true,
                }
            );
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const removeMedia = async (index: number) => {
        const currentMedias = form.getValues('medias') ?? [];
        const media = currentMedias[index];

        // If media has an id, it's persisted in the DB — delete it via API
        if (media?.id) {
            try {
                await ProjectApi.deleteMedia(media.id);
            } catch (err) {
                console.error('Failed to delete media:', err);
                return; // don't remove from form if API call failed
            }
        }

        form.setValue(
            'medias',
            currentMedias.filter((_, i) => i !== index),
            { shouldDirty: true, shouldValidate: true }
        );
    };

    // submit — defensive: stop propagation so portalled dialogs can't trigger us
    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        await form.handleSubmit(async raw => {
            setLoading(true);
            try {
                const values = FormSchema.parse(raw) as FormOutput;

                const mediasRaw = values.medias ?? [];

                // Build base payload (shared between create & update)
                const basePayload = {
                    startDate: values.startDate.toISOString(),
                    endDate: values.endDate
                        ? values.endDate.toISOString()
                        : null,
                    ...(values.gitUrl ? { gitUrl: values.gitUrl } : {}),
                    ...(values.visitUrl ? { visitUrl: values.visitUrl } : {}),
                    isVisible: values.isVisible,
                    techTagIds: values.techTagIds ?? [],
                    qualTagIds: values.qualTagIds ?? [],
                    translations: Object.entries(values.translations).map(
                        ([locale, t]) => ({
                            locale: locale as Locale,
                            name: t.name,
                            description: t.description,
                        })
                    ),
                };

                let saved: ProjectDTO;
                if (initial) {
                    // Update: send mediaIds (array of existing media IDs)
                    saved = (await ProjectApi.update(initial.id, {
                        ...basePayload,
                        mediaIds: mediasRaw
                            .map(m => m.id)
                            .filter(Boolean) as string[],
                    })) as ProjectDTO;
                } else {
                    // Create: media are already persisted via uploadMedia (POST /media)
                    // and carry an id — link them by id, matching CreateProjectDto.mediaIds.
                    saved = (await ProjectApi.create({
                        ...basePayload,
                        mediaIds: mediasRaw
                            .map(m => m.id)
                            .filter(Boolean) as string[],
                    })) as ProjectDTO;
                }

                // Persist editable alt text per media. Best-effort: the project
                // itself is already saved, and the backend may not accept `alt`
                // on PATCH /media/:id yet — don't let that fail the whole save.
                await Promise.allSettled(
                    mediasRaw
                        .filter(m => m.id)
                        .map(m =>
                            ProjectApi.updateMedia(m.id as string, {
                                alt: m.alt ?? '',
                            })
                        )
                );

                onSaved?.(saved as ProjectDTO);
            } finally {
                setLoading(false);
            }
        })(e);
    };

    // Coerce a watched RHF value (Date | string | undefined) into a Date.
    const toDate = (raw: unknown): Date | undefined =>
        raw ? (raw instanceof Date ? raw : new Date(raw as any)) : undefined;

    const watchedMedias = form.watch('medias') ?? [];
    const isVisible = form.watch('isVisible');

    return (
        <form onSubmit={handleFormSubmit} className="space-y-8">
            {/* ── Section 1: Informations generales ── */}
            <section className="space-y-4">
                <SectionHeading
                    icon={Globe}
                    title="Informations generales"
                    description="Date, liens et visibilite du projet."
                />
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <DateField
                            label="Date de début"
                            value={toDate(form.watch('startDate'))}
                            onChange={d =>
                                form.setValue(
                                    'startDate',
                                    (d ?? new Date()) as any,
                                    { shouldDirty: true, shouldValidate: true }
                                )
                            }
                        />
                        <DateField
                            label="Date de fin"
                            clearable
                            emptyLabel="En cours (aucune)"
                            value={toDate(form.watch('endDate'))}
                            defaultMonth={toDate(form.watch('startDate'))}
                            onChange={d =>
                                form.setValue('endDate', d as any, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                        />

                        <div className="grid gap-2">
                            <Label>URL Git</Label>
                            <div className="relative">
                                <Code2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    {...form.register('gitUrl')}
                                    placeholder="https://github.com/..."
                                    className="pl-9"
                                />
                            </div>
                            {form.formState.errors.gitUrl?.message && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.gitUrl.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label>URL du site</Label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    {...form.register('visitUrl')}
                                    placeholder="https://..."
                                    className="pl-9"
                                />
                            </div>
                            {form.formState.errors.visitUrl?.message && (
                                <p className="text-sm text-destructive">
                                    {form.formState.errors.visitUrl.message}
                                </p>
                            )}
                        </div>

                        <div className="flex items-end gap-3 pb-0.5">
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
                                    {isVisible ? 'Visible' : 'Masque'}
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Section 2: Tags ── */}
            <section className="space-y-4">
                <SectionHeading
                    icon={Tag}
                    title="Tags"
                    description="Technologies et qualites associees au projet."
                />
                <div className="rounded-lg border bg-muted/30 p-4 space-y-5">
                    {/* Tech Tags */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <Label className="text-sm font-medium">
                                Tags Tech
                            </Label>
                        </div>
                        <TagMultiSelect
                            value={form.watch('techTagIds') ?? []}
                            onChange={ids =>
                                form.setValue('techTagIds', ids, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                            options={techTags}
                            locale={(locales[0] as any) ?? 'fr'}
                            allowCreate
                            locales={locales as string[]}
                            createDefaults={{
                                type: 'TECH',
                                hexColor: '#3b82f6',
                                isVisible: true,
                            }}
                            createTag={TagApi.create}
                            onCreated={tag =>
                                setTechTags(prev => [...prev, tag])
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            {tagsLoading
                                ? 'Chargement des tags...'
                                : techTags.length === 0
                                  ? 'Aucun tag tech disponible — cree-en un via le bouton "+".'
                                  : 'Langages, frameworks, outils... Tape pour filtrer.'}
                        </p>
                    </div>

                    <div className="border-t" />

                    {/* Qual Tags */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-violet-500" />
                            <Label className="text-sm font-medium">
                                Tags Qualite
                            </Label>
                        </div>
                        <TagMultiSelect
                            value={form.watch('qualTagIds') ?? []}
                            onChange={ids =>
                                form.setValue('qualTagIds', ids, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                            options={qualTags}
                            locale={(locales[0] as any) ?? 'fr'}
                            allowCreate
                            locales={locales as string[]}
                            createDefaults={{
                                type: 'QUAL',
                                hexColor: '#8b5cf6',
                                isVisible: true,
                            }}
                            createTag={TagApi.create}
                            onCreated={tag =>
                                setQualTags(prev => [...prev, tag])
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            {tagsLoading
                                ? 'Chargement des tags...'
                                : qualTags.length === 0
                                  ? 'Aucun tag qualite disponible — cree-en un via le bouton "+".'
                                  : 'Categories, domaines, qualites... Tape pour filtrer.'}
                        </p>
                    </div>
                </div>
            </section>

            {/* ── Section 3: Medias ── */}
            <section className="space-y-4">
                <SectionHeading
                    icon={ImageIcon}
                    title="Medias"
                    description="Images et videos du projet."
                />
                <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
                    {/* Media grid */}
                    {watchedMedias.length > 0 && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {watchedMedias.map((media, index) => (
                                <div
                                    key={index}
                                    className="group relative overflow-hidden rounded-lg border bg-background shadow-sm transition-shadow hover:shadow-md"
                                >
                                    {media.type === 'IMAGE' ? (
                                        <img
                                            src={mediaSrc(media.mediaUrl)}
                                            alt={
                                                media.alt ||
                                                media.mediaUrl
                                                    .split('/')
                                                    .pop() ||
                                                'Aperçu du média'
                                            }
                                            className="h-32 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-32 w-full items-center justify-center bg-muted">
                                            <Film className="h-10 w-10 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between px-3 py-2">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {media.type === 'IMAGE' ? (
                                                <ImageIcon className="h-3 w-3" />
                                            ) : (
                                                <Film className="h-3 w-3" />
                                            )}
                                            <span>{media.type}</span>
                                        </div>
                                        <span className="max-w-[120px] truncate text-xs text-muted-foreground">
                                            {media.mediaUrl.split('/').pop()}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeMedia(index)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div className="px-3 pb-3">
                                        <Input
                                            value={media.alt ?? ''}
                                            onChange={e => {
                                                const next = [
                                                    ...(form.getValues(
                                                        'medias'
                                                    ) ?? []),
                                                ];
                                                next[index] = {
                                                    ...next[index],
                                                    alt: e.target.value,
                                                };
                                                form.setValue('medias', next, {
                                                    shouldDirty: true,
                                                });
                                            }}
                                            placeholder="Texte alternatif (alt)"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Drop-zone style upload area */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                    />
                    <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-sm transition-colors',
                            uploading
                                ? 'cursor-wait border-muted bg-muted/50 text-muted-foreground'
                                : 'cursor-pointer border-muted-foreground/25 text-muted-foreground hover:border-primary/50 hover:bg-muted/50 hover:text-foreground'
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span>Envoi en cours...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="h-8 w-8" />
                                <span>
                                    Cliquer pour ajouter une image ou video
                                </span>
                                <span className="text-xs text-muted-foreground/70">
                                    JPG, PNG, WebP, MP4, WebM...
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </section>

            {/* ── Section 4: Traductions ── */}
            <section className="space-y-4">
                <SectionHeading
                    icon={Globe}
                    title="Traductions"
                    description="Nom et description dans chaque langue."
                />
                <div className="rounded-lg border bg-muted/30 p-4">
                    <LocaleTabs
                        locales={locales as any}
                        defaultLocale={(locales[0] as any) ?? 'fr'}
                        render={loc => (
                            <div className="grid gap-4 pt-2">
                                <div className="grid gap-2">
                                    <Label>
                                        {String(loc).toUpperCase()} — Nom du
                                        projet
                                    </Label>
                                    <Input
                                        {...form.register(
                                            `translations.${loc}.name` as any
                                        )}
                                        placeholder="Nom du projet"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>
                                        {String(loc).toUpperCase()} —
                                        Description
                                    </Label>
                                    <Textarea
                                        rows={6}
                                        {...form.register(
                                            `translations.${loc}.description` as any
                                        )}
                                        placeholder="Description du projet, fonctionnalites, stack..."
                                    />
                                </div>
                            </div>
                        )}
                    />
                </div>
            </section>

            {/* ── Footer actions ── */}
            <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {initial ? 'Enregistrer' : 'Creer'}
                </Button>
            </div>
        </form>
    );
}
