'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { DateField } from '@/components/forms/date-field';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { LocaleTabs } from '@/components/forms/locale-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LocalesApi } from '@/lib/locales/locales.api';
import { PositionApi } from '@/lib/position/position.api';
import type { Locale, PositionDTO } from '@/lib/types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const translationShape = z.object({
    title: z.string().min(1),
});

// Built dynamically so superRefine sees the current locale list.
function buildSchema(locales: string[], ongoing: boolean) {
    return z
        .object({
            startDate: z.coerce.date(),
            endDate: ongoing ? z.coerce.date().optional() : z.coerce.date(),
            isVisible: z.boolean(),
            order: z.coerce.number().int(),
            translations: z.record(z.string(), translationShape),
        })
        .superRefine((data, ctx) => {
            // end >= start (only when not ongoing and endDate present)
            if (!ongoing && data.endDate && data.endDate < data.startDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['endDate'],
                    message: 'La fin doit être ≥ début',
                });
            }
            // required locales present
            const missing = locales.filter(loc => !data.translations?.[loc]);
            missing.forEach(loc =>
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['translations', loc],
                    message: `Traduction ${String(loc).toUpperCase()} requise`,
                })
            );
            // no unsupported locales
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
}

// ---------------------------------------------------------------------------
// PositionForm
// ---------------------------------------------------------------------------

export function PositionForm({
    initial,
    companyId,
    onSaved,
    onCancel,
    onRegister,
}: {
    initial?: PositionDTO | null;
    // The employer this position belongs to (locked — positions are created
    // from the employer detail page, never standalone).
    companyId: string;
    onSaved?: (saved: PositionDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
}) {
    const [locales, setLocales] = useState<Array<'fr' | 'en' | string>>([
        'fr',
        'en',
    ]);
    const [loading, setLoading] = useState(false);

    // ongoing = endDate is null / not provided (the current title)
    const [ongoing, setOngoing] = useState(!initial?.endDate);

    // Fetch locales once
    useEffect(() => {
        LocalesApi.findAll()
            .then(ls =>
                Array.isArray(ls) && ls.length ? setLocales(ls) : undefined
            )
            .catch(() => {});
    }, []);

    const FormSchema = useMemo(
        () => buildSchema(locales, ongoing),
        [locales, ongoing]
    );
    type FormInput = z.input<typeof FormSchema>;
    type FormOutput = z.output<typeof FormSchema>;

    const defaultValues: FormInput = useMemo(() => {
        const mapTranslation = (loc: string) => {
            const t = initial?.translations.find(
                x => x.locale === (loc as Locale)
            );
            return { title: t?.title ?? '' };
        };
        const translations = Object.fromEntries(
            locales.map(loc => [loc, mapTranslation(loc)])
        );

        return {
            startDate: initial ? new Date(initial.startDate) : new Date(),
            endDate: initial?.endDate ? new Date(initial.endDate) : new Date(),
            isVisible: initial?.isVisible ?? true,
            order: initial?.order ?? 0,
            translations,
        };
    }, [initial, locales]);

    const form = useForm<FormInput>({
        resolver: zodResolver(FormSchema),
        defaultValues,
    });

    // Re-sync defaults when locales or initial changes
    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    // Reset the ongoing toggle when switching to a different position
    useEffect(() => {
        setOngoing(!initial?.endDate);
    }, [initial]);

    // Register the imperative handle so the dialog can auto-save on outside-click
    const formElRef = useRef<HTMLFormElement>(null);
    const isDirtyRef = useRef(false);
    isDirtyRef.current = form.formState.isDirty;
    useEffect(() => {
        onRegister?.({
            isDirty: () => isDirtyRef.current,
            submit: () => formElRef.current?.requestSubmit(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSubmit = form.handleSubmit(async raw => {
        setLoading(true);
        try {
            const values = FormSchema.parse(raw) as FormOutput;

            const translationsPayload = Object.entries(values.translations).map(
                ([locale, t]) => ({ locale, title: t.title })
            );

            const payload: Record<string, unknown> = {
                companyId,
                startDate: (values.startDate as Date).toISOString(),
                ...(ongoing
                    ? {}
                    : { endDate: (values.endDate as Date).toISOString() }),
                isVisible: values.isVisible,
                order: values.order,
                translations: translationsPayload,
            };

            const saved = initial
                ? await PositionApi.update(initial.id, payload)
                : await PositionApi.create(payload);

            onSaved?.(saved as PositionDTO);
        } finally {
            setLoading(false);
        }
    });

    const startDateValue = form.watch('startDate') as unknown;
    const endDateValue = form.watch('endDate') as unknown;
    const toDate = (v: unknown): Date | undefined => {
        if (!v) return undefined;
        if (v instanceof Date) return v;
        return new Date(v as any);
    };

    return (
        <form ref={formElRef} onSubmit={onSubmit} className="space-y-6">
            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
                <DateField
                    label="Début"
                    value={toDate(startDateValue)}
                    onChange={d =>
                        form.setValue('startDate', d ?? new Date(), {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                />

                <div className="grid gap-2">
                    {/* Ongoing toggle — the current title has no end date */}
                    <div className="flex items-center gap-2">
                        <Switch
                            id="ongoing"
                            checked={ongoing}
                            onCheckedChange={next => {
                                setOngoing(next);
                                if (!next && !toDate(endDateValue)) {
                                    form.setValue('endDate', new Date(), {
                                        shouldDirty: true,
                                    });
                                }
                            }}
                        />
                        <Label htmlFor="ongoing">Poste actuel</Label>
                    </div>

                    {!ongoing && (
                        <DateField
                            label="Fin"
                            value={toDate(endDateValue)}
                            onChange={d =>
                                form.setValue('endDate', d ?? new Date(), {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                            defaultMonth={toDate(startDateValue)}
                        />
                    )}
                    {form.formState.errors.endDate && (
                        <p className="text-sm text-destructive">
                            {(form.formState.errors.endDate as any)?.message}
                        </p>
                    )}
                </div>
            </div>

            {/* Order + Visibility */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="order">Ordre</Label>
                    <Input
                        id="order"
                        type="number"
                        {...form.register('order')}
                    />
                    <p className="text-xs text-muted-foreground">
                        Départage deux postes commençant le même mois.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-end pb-2">
                    <Switch
                        id="isVisible"
                        checked={!!form.watch('isVisible')}
                        onCheckedChange={v =>
                            form.setValue('isVisible', v, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    />
                    <Label htmlFor="isVisible">Visible</Label>
                </div>
            </div>

            {/* Translations — just the title per locale */}
            <div className="space-y-4">
                <Label>Intitulé du poste</Label>
                <LocaleTabs
                    locales={locales as any}
                    defaultLocale={(locales[0] as any) ?? 'fr'}
                    render={loc => (
                        <div className="grid gap-2">
                            <Label>{String(loc).toUpperCase()} — Titre</Label>
                            <Input
                                {...form.register(
                                    `translations.${loc}.title` as any
                                )}
                                placeholder="Ex. Ingénieur Alternant Full-Stack & DevOps…"
                            />
                            {(form.formState.errors.translations as any)?.[loc]
                                ?.title && (
                                <p className="text-sm text-destructive">
                                    {
                                        (
                                            form.formState.errors
                                                .translations as any
                                        )?.[loc]?.title?.message
                                    }
                                </p>
                            )}
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
