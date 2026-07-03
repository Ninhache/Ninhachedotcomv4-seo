'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { CalendarIcon, ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { FormSection } from '@/components/forms/form-section';
import { MediaUploadField } from '@/components/forms/media-upload-field';
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
import { EducationApi } from '@/lib/education/education.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import type { EducationDTO, Locale } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LocaleTabs } from '../forms/locale-tabs';

// Per-locale translation shape
const translationShape = z.object({
    degree: z.string().min(1),
    description: z.string().optional(),
});

export function EducationForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
}: {
    initial?: EducationDTO | null;
    onSaved?: (saved: EducationDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
    dialogOpen?: boolean;
}) {
    const [loading, setLoading] = useState(false);

    // Dynamic locales (fallback fr/en)
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

    // Zod schema — built dynamically so superRefine sees the live locales list
    const FormSchema = useMemo(() => {
        return z
            .object({
                institutionName: z.string().min(1),
                siteUrl: z
                    .string()
                    .url()
                    .optional()
                    .or(z.literal('').transform(() => undefined)),
                logoUrl: z.string().optional(),
                startDate: z.coerce.date(),
                // endDate only validated when ongoing is false
                endDate: z.coerce.date().optional(),
                ongoing: z.boolean(),
                isVisible: z.boolean(),
                translations: z.record(z.string(), translationShape),
            })
            .superRefine((data, ctx) => {
                // 1) end >= start when not ongoing
                if (!data.ongoing) {
                    if (!data.endDate) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ['endDate'],
                            message: 'La date de fin est requise',
                        });
                    } else if (data.endDate < data.startDate) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            path: ['endDate'],
                            message: 'La fin doit être ≥ début',
                        });
                    }
                }
                // 2) All required locales present
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
                // 3) No unsupported locales
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
                degree: t?.degree ?? '',
                description: t?.description ?? '',
            };
        };
        const translations = Object.fromEntries(
            locales.map(loc => [loc, mapT(loc)])
        );

        return {
            institutionName: initial?.institutionName ?? '',
            siteUrl: initial?.siteUrl ?? undefined,
            logoUrl: initial?.logoUrl ?? '',
            startDate: initial ? new Date(initial.startDate) : new Date(),
            endDate: initial?.endDate ? new Date(initial.endDate) : new Date(),
            ongoing: initial ? !initial.endDate : true,
            isVisible: initial?.isVisible ?? true,
            translations,
        };
    }, [initial, locales]);

    const form = useForm<FormInput>({
        resolver: zodResolver(FormSchema),
        defaultValues,
    });

    // When locales arrive after async fetch, re-initialise form defaults
    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    const formElRef = useRef<HTMLFormElement>(null);
    // Read isDirty during render so RHF tracks it; expose via ref to the dialog
    const isDirtyRef = useRef(false);
    isDirtyRef.current = form.formState.isDirty;
    useEffect(() => {
        onRegister?.({
            isDirty: () => isDirtyRef.current,
            submit: () => formElRef.current?.requestSubmit(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const ongoing = form.watch('ongoing');

    const onSubmit = form.handleSubmit(async raw => {
        setLoading(true);
        try {
            const values = FormSchema.parse(raw) as FormOutput;

            const payload: Record<string, any> = {
                institutionName: values.institutionName,
                startDate: values.startDate.toISOString(),
                ...(values.ongoing
                    ? {}
                    : { endDate: values.endDate!.toISOString() }),
                ...(values.siteUrl ? { siteUrl: values.siteUrl } : {}),
                // Always sent (null when cleared) so removing the logo persists
                // — an omitted field is treated as "unchanged" by the PATCH.
                logoUrl: values.logoUrl || null,
                isVisible: values.isVisible,
                translations: Object.entries(values.translations).map(
                    ([locale, t]) => ({
                        locale,
                        degree: t.degree,
                        ...(t.description
                            ? { description: t.description }
                            : {}),
                    })
                ),
            };

            const saved = initial
                ? await EducationApi.update(initial.id, payload)
                : await EducationApi.create(payload);

            onSaved?.(saved as EducationDTO);
        } finally {
            setLoading(false);
        }
    });

    // Inline DateField — a month/year picker reused for both date inputs
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
                <p className="text-sm text-destructive">
                    {form.formState.errors[name]?.message as string}
                </p>
            </div>
        );
    };

    return (
        <form ref={formElRef} onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Établissement</Label>
                    <Input
                        autoFocus
                        {...form.register('institutionName')}
                        placeholder="Université Paris Cité…"
                    />
                    <p className="text-sm text-destructive">
                        {form.formState.errors.institutionName?.message}
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label>Site</Label>
                    <Input
                        {...form.register('siteUrl')}
                        placeholder="https://…"
                    />
                    <p className="text-sm text-destructive">
                        {form.formState.errors.siteUrl?.message as string}
                    </p>
                </div>

                <DateField label="Début" name="startDate" />

                <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={!!ongoing}
                            onCheckedChange={v =>
                                form.setValue('ongoing', v, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                        />
                        <Label>En cours</Label>
                    </div>
                    {!ongoing && <DateField label="Fin" name="endDate" />}
                </div>

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
            </div>

            {/* Logo — same media card as every other admin form */}
            <FormSection
                icon={ImageIcon}
                title="Logo"
                description="Importez un fichier ou collez une URL."
            >
                <MediaUploadField
                    ariaLabel="Logo"
                    value={form.watch('logoUrl') ?? ''}
                    onChange={url =>
                        form.setValue('logoUrl', url, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                />
            </FormSection>

            <div className="space-y-4">
                <Label>Traductions</Label>
                <LocaleTabs
                    locales={locales as any}
                    defaultLocale={(locales[0] as any) ?? 'fr'}
                    render={loc => (
                        <div className="grid gap-3">
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Diplôme
                                </Label>
                                <Input
                                    {...form.register(
                                        `translations.${loc}.degree` as any
                                    )}
                                    placeholder="Master Informatique…"
                                />
                                <p className="text-sm text-destructive">
                                    {
                                        (
                                            form.formState.errors
                                                .translations as any | undefined
                                        )?.[loc]?.degree?.message
                                    }
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Description
                                </Label>
                                <Textarea
                                    rows={5}
                                    {...form.register(
                                        `translations.${loc}.description` as any
                                    )}
                                    placeholder="Spécialisation, projets marquants…"
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
