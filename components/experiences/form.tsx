'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ExperienceApi } from '@/lib/experience/experience.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import { TagApi } from '@/lib/tag/tag.api';
import type { ContractType, ExperienceDTO, Locale, TagDTO } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LocaleTabs } from '../forms/locale-tabs';
import { TagMultiSelect } from '../forms/tag-multi-select';

const contractTypes: ContractType[] = [
    'Permanent',
    'Fixed',
    'Internship',
    'Workstudy',
    'Freelance',
];

// --- schema dynamique (locales) ---
const translationShape = z.object({
    jobTitle: z.string().min(1),
    description: z.string().min(1),
});

export function ExperienceForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
}: {
    initial?: ExperienceDTO | null;
    onSaved?: (saved: ExperienceDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
    dialogOpen?: boolean;
}) {
    const [tags, setTags] = useState<TagDTO[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    // locales dynamiques (fallback fr/en)
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

    // Schéma Zod (dates coerce, translations dynamiques)
    const FormSchema = useMemo(() => {
        return z
            .object({
                companyName: z.string().min(1),
                localisation: z.string().min(1),
                siteUrl: z
                    .string()
                    .url()
                    .optional()
                    .or(z.literal('').transform(() => undefined)),
                contractType: z.enum([
                    'Permanent',
                    'Fixed',
                    'Internship',
                    'Workstudy',
                    'Freelance',
                ]),
                startDate: z.coerce.date(),
                endDate: z.coerce.date(),
                isVisible: z.boolean(),
                tagIds: z.array(z.string()).default([]),
                translations: z.record(z.string(), translationShape),
                // §6: media/links viendront ici
            })
            .superRefine((data, ctx) => {
                // 1) end >= start
                if (data.endDate < data.startDate) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ['endDate'],
                        message: 'La fin doit être ≥ début',
                    });
                }
                // 2) locales requises présentes
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
                // 3) pas de locales non supportées
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

    // types dérivés du schéma
    type FormInput = z.input<typeof FormSchema>; // ce que RHF manipule (dates inconnues/coercibles, defaults optionnels)
    type FormOutput = z.output<typeof FormSchema>; // output validé (dates: Date, defaults appliqués)

    // defaults construits depuis initial + locales (toutes les locales présentes)
    const defaultValues: FormInput = useMemo(() => {
        const mapT = (loc: string) => {
            const t = initial?.translations.find(
                t => t.locale === (loc as Locale)
            );
            return {
                jobTitle: t?.jobTitle ?? '',
                description: t?.description ?? '',
            };
        };
        const translations = Object.fromEntries(
            locales.map(loc => [loc, mapT(loc)])
        );

        return {
            companyName: initial?.companyName ?? '',
            localisation: initial?.localisation ?? '',
            siteUrl: initial?.siteUrl ?? undefined,
            contractType:
                (initial?.contractType as ContractType) ?? 'Workstudy',
            // z.coerce.date() accepte Date/string/number → on peut donner des Date ou ISO
            startDate: initial ? new Date(initial.startDate) : new Date(),
            endDate: initial ? new Date(initial.endDate) : new Date(),
            isVisible: initial?.isVisible ?? true,
            tagIds: initial?.tags?.map(t => t.id) ?? [],
            translations,
        };
    }, [initial, locales]);

    const form = useForm<FormInput>({
        resolver: zodResolver(FormSchema),
        defaultValues,
    });

    // si les locales changent (après fetch), on remet à jour le form avec les bons defaults
    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    const formElRef = useRef<HTMLFormElement>(null);
    useEffect(() => {
        onRegister?.({
            isDirty: () => form.formState.isDirty,
            submit: () => formElRef.current?.requestSubmit(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // tags (chargés quand le dialogue est ouvert pour éviter des appels inutiles)
    useEffect(() => {
        if (!dialogOpen) return;
        let ignore = false;
        setTagsLoading(true);
        TagApi.listExperienceTags({ visibleOnly: false })
            .then(items => {
                if (!ignore) setTags(items ?? []);
            })
            .catch(() => {
                if (!ignore) setTags([]);
            })
            .finally(() => {
                if (!ignore) setTagsLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, [dialogOpen]);

    // submit : parse → output (dates ok), mapping dynamique des traductions
    const onSubmit = form.handleSubmit(async raw => {
        setLoading(true);
        try {
            const values = FormSchema.parse(raw) as FormOutput;

            const payload: Partial<ExperienceDTO> = {
                companyName: values.companyName,
                localisation: values.localisation,
                siteUrl: values.siteUrl,
                contractType: values.contractType,
                startDate: values.startDate.toISOString(),
                endDate: values.endDate.toISOString(),
                isVisible: values.isVisible,
                tagIds: values.tagIds ?? [],
                translations: Object.entries(values.translations).map(
                    ([locale, t]) => ({
                        locale: locale as Locale,
                        jobTitle: t.jobTitle,
                        description: t.description,
                    })
                ),
            };

            const saved = initial
                ? await ExperienceApi.update(initial.id, payload)
                : await ExperienceApi.create(payload);

            onSaved?.(saved as ExperienceDTO);
        } finally {
            setLoading(false);
        }
    });

    // champ Date : convertir la valeur watchée (unknown) → Date pour le calendrier
    const DateField = ({
        label,
        name,
    }: {
        label: string;
        name: 'startDate' | 'endDate';
    }) => {
        const raw = form.watch(name) as unknown;
        const value = raw
            ? raw instanceof Date
                ? raw
                : new Date(raw as any)
            : undefined;

        const setValue = (d?: Date) =>
            form.setValue(name, d ?? new Date(), {
                shouldDirty: true,
                shouldValidate: true,
            });

        return (
            <div className="grid gap-2">
                <Label>{label}</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'justify-start',
                                !value && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {value
                                ? format(value, 'PPP', { locale: frLocale })
                                : 'Choisir une date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0">
                        <Calendar
                            mode="single"
                            selected={value}
                            onSelect={setValue}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    return (
        <form ref={formElRef} onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Entreprise</Label>
                    <Input
                        autoFocus
                        {...form.register('companyName')}
                        placeholder="Pit / Learnpilot…"
                    />
                    <p className="text-sm text-destructive">
                        {form.formState.errors.companyName?.message}
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label>Localisation</Label>
                    <Input
                        {...form.register('localisation')}
                        placeholder="Paris, Remote…"
                    />
                </div>

                <div className="grid gap-2">
                    <Label>Contrat</Label>
                    <select
                        className="input rounded-md border px-3 py-2"
                        {...form.register('contractType')}
                    >
                        {contractTypes.map(ct => (
                            <option key={ct} value={ct}>
                                {ct}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid gap-2">
                    <Label>Site</Label>
                    <Input
                        {...form.register('siteUrl')}
                        placeholder="https://…"
                    />
                </div>

                <DateField label="Début" name="startDate" />
                <DateField label="Fin" name="endDate" />

                <div className="flex items-center gap-2">
                    <Switch
                        checked={!!form.watch('isVisible')}
                        onCheckedChange={v =>
                            form.setValue('isVisible', v, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    />
                    <Label>Visible</Label>
                </div>

                <div className="md:col-span-2">
                    <Label>Tags (Expérience)</Label>
                    <TagMultiSelect
                        value={form.watch('tagIds') ?? []}
                        onChange={ids =>
                            form.setValue('tagIds', ids, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                        options={tags ?? []}
                        locale={(locales[0] as any) ?? 'fr'}
                        // ⬇️ Création inline
                        allowCreate
                        locales={locales as string[]}
                        createDefaults={{
                            type: 'EXPERIENCE_TECH',
                            hexColor: '#8b5cf6',
                            isVisible: true,
                        }}
                        createTag={TagApi.create}
                        onCreated={tag => setTags(prev => [...prev, tag])}
                    />
                    <p className="text-xs text-muted-foreground">
                        {tagsLoading
                            ? 'Chargement des tags…'
                            : tags.length === 0
                              ? 'Aucun tag disponible — crée-en un directement.'
                              : 'Tape pour filtrer ou crée un tag si besoin.'}
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <Label>Traductions</Label>
                <LocaleTabs
                    locales={locales as any}
                    defaultLocale={(locales[0] as any) ?? 'fr'}
                    render={loc => (
                        <div className="grid gap-3">
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Titre du poste
                                </Label>
                                <Input
                                    {...form.register(
                                        `translations.${loc}.jobTitle` as any
                                    )}
                                    placeholder="Intitulé du poste"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Description
                                </Label>
                                <Textarea
                                    rows={6}
                                    {...form.register(
                                        `translations.${loc}.description` as any
                                    )}
                                    placeholder="Missions, stack, résultats…"
                                />
                            </div>
                        </div>
                    )}
                />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                    {initial ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </form>
    );
}
