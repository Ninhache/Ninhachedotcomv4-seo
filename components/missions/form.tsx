'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { DateField } from '@/components/forms/date-field';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { FormSection } from '@/components/forms/form-section';
import { LocaleTabs } from '@/components/forms/locale-tabs';
import { MediaUploadField } from '@/components/forms/media-upload-field';
import { SkillMultiSelect } from '@/components/forms/skill-multi-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CompanyApi } from '@/lib/company/company.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import { MissionApi } from '@/lib/mission/mission.api';
import { SkillApi } from '@/lib/skill/skill.api';
import type { CompanyDTO, Locale, MissionDTO, SkillDTO } from '@/lib/types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const translationShape = z.object({
    title: z.string().min(1),
    context: z.string().optional(),
    tasks: z.array(z.string()).default([]),
});

// The full form schema is built dynamically so superRefine can see the current
// locale list (required locales change if the backend adds one).
function buildSchema(locales: string[], ongoing: boolean) {
    return z
        .object({
            employerCompanyId: z.string().min(1, 'Employeur requis'),
            clientCompanyId: z.string().optional(),
            startDate: z.coerce.date(),
            endDate: ongoing ? z.coerce.date().optional() : z.coerce.date(),
            isVisible: z.boolean(),
            imageUrl: z.string().optional(),
            skillIds: z.array(z.string()).default([]),
            translations: z.record(z.string(), translationShape),
        })
        .superRefine((data, ctx) => {
            // 1) end >= start (only when not ongoing and endDate is present)
            if (!ongoing && data.endDate && data.endDate < data.startDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['endDate'],
                    message: 'La fin doit être ≥ début',
                });
            }
            // 2) employerCompanyId non-empty (belt-and-suspenders — schema already min(1))
            if (!data.employerCompanyId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['employerCompanyId'],
                    message: 'Employeur requis',
                });
            }
            // 3) required locales present
            const missing = locales.filter(loc => !data.translations?.[loc]);
            missing.forEach(loc =>
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['translations', loc],
                    message: `Traduction ${String(loc).toUpperCase()} requise`,
                })
            );
            // 4) no unsupported locales
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
// TaskList — extracted so useFieldArray is called at component top-level
// ---------------------------------------------------------------------------

function TaskList({
    form,
    loc,
}: {
    form: ReturnType<typeof useForm<any>>;
    loc: string;
}) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `translations.${loc}.tasks` as any,
    });

    return (
        <div className="grid gap-2">
            <Label>{String(loc).toUpperCase()} — Tâches</Label>
            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <Input
                            {...form.register(
                                `translations.${loc}.tasks.${index}` as any
                            )}
                            placeholder="Décrire une tâche…"
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Supprimer cette tâche"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit"
                onClick={() => append('')}
            >
                Ajouter une tâche
            </Button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MissionForm
// ---------------------------------------------------------------------------

export function MissionForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
    defaultEmployerCompanyId,
    defaultClientCompanyId,
}: {
    initial?: MissionDTO | null;
    onSaved?: (saved: MissionDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
    dialogOpen?: boolean;
    // Pre-fill + lock the employer (mission created from an employer/client page).
    defaultEmployerCompanyId?: string;
    // Pre-fill the client (mission created from a client page).
    defaultClientCompanyId?: string;
}) {
    const [locales, setLocales] = useState<Array<'fr' | 'en' | string>>([
        'fr',
        'en',
    ]);
    const [employerCompanies, setEmployerCompanies] = useState<CompanyDTO[]>(
        []
    );
    const [clientCompanies, setClientCompanies] = useState<CompanyDTO[]>([]);
    const [skills, setSkills] = useState<SkillDTO[]>([]);
    const [skillsLoading, setSkillsLoading] = useState(false);
    const [loading, setLoading] = useState(false);

    // ongoing = endDate is null / not provided
    const [ongoing, setOngoing] = useState(!initial?.endDate);

    // Fetch locales once (independent of dialog state)
    useEffect(() => {
        LocalesApi.findAll()
            .then(ls =>
                Array.isArray(ls) && ls.length ? setLocales(ls) : undefined
            )
            .catch(() => {});
    }, []);

    // Fetch employers + skills when the dialog opens (avoid unnecessary requests)
    useEffect(() => {
        if (!dialogOpen) return;
        let ignore = false;

        setSkillsLoading(true);
        Promise.all([
            CompanyApi.findAll('EMPLOYER'),
            // Skills are the unified tech-stack pool (they absorbed the former
            // TECH tags). Missions, projects and companies all draw from it.
            SkillApi.findAll(),
        ])
            .then(([employers, skillList]) => {
                if (ignore) return;
                setEmployerCompanies(employers ?? []);
                setSkills(skillList ?? []);
            })
            .catch(() => {
                if (!ignore) {
                    setEmployerCompanies([]);
                    setSkills([]);
                }
            })
            .finally(() => {
                if (!ignore) setSkillsLoading(false);
            });

        return () => {
            ignore = true;
        };
    }, [dialogOpen]);

    // Dynamic schema — rebuilds when locales or ongoing toggle changes
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
            return {
                title: t?.title ?? '',
                context: t?.context ?? '',
                tasks: t?.tasks ?? [],
            };
        };
        const translations = Object.fromEntries(
            locales.map(loc => [loc, mapTranslation(loc)])
        );

        return {
            employerCompanyId:
                initial?.employerCompanyId ?? defaultEmployerCompanyId ?? '',
            clientCompanyId:
                initial?.clientCompanyId ?? defaultClientCompanyId ?? undefined,
            startDate: initial ? new Date(initial.startDate) : new Date(),
            endDate: initial?.endDate ? new Date(initial.endDate) : new Date(),
            isVisible: initial?.isVisible ?? true,
            imageUrl: initial?.imageUrl ?? '',
            skillIds:
                initial?.skills?.map(s => s.id) ?? initial?.skillIds ?? [],
            translations,
        };
    }, [initial, locales, defaultEmployerCompanyId, defaultClientCompanyId]);

    const form = useForm<FormInput>({
        resolver: zodResolver(FormSchema),
        defaultValues,
    });

    // Re-sync defaults when locales or initial changes
    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    // A client belongs to one employer, so the client picker is scoped to the
    // currently-selected (or context-locked) employer's clients only.
    const watchedEmployerId = form.watch('employerCompanyId');
    const effectiveEmployerId = defaultEmployerCompanyId ?? watchedEmployerId;
    useEffect(() => {
        if (!dialogOpen) return;
        if (!effectiveEmployerId) {
            setClientCompanies([]);
            return;
        }
        let ignore = false;
        CompanyApi.findAll('CLIENT', effectiveEmployerId)
            .then(cs => {
                if (!ignore) setClientCompanies(cs ?? []);
            })
            .catch(() => {
                if (!ignore) setClientCompanies([]);
            });
        return () => {
            ignore = true;
        };
    }, [dialogOpen, effectiveEmployerId]);

    // Also reset the ongoing toggle when initial changes (e.g. editing a different mission)
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
                ([locale, t]) => ({
                    locale,
                    title: t.title,
                    ...(t.context ? { context: t.context } : {}),
                    tasks: (t.tasks ?? [])
                        .map((s: string) => s.trim())
                        .filter(Boolean),
                })
            );

            const payload: Record<string, unknown> = {
                employerCompanyId: values.employerCompanyId,
                ...(values.clientCompanyId
                    ? { clientCompanyId: values.clientCompanyId }
                    : {}),
                startDate: (values.startDate as Date).toISOString(),
                ...(ongoing
                    ? {}
                    : {
                          endDate: (values.endDate as Date).toISOString(),
                      }),
                isVisible: values.isVisible,
                // Always sent: '' clears the image on PATCH; on create it is a
                // no-op. A non-empty string is the illustration path/URL.
                imageUrl: values.imageUrl ?? '',
                skillIds: values.skillIds ?? [],
                translations: translationsPayload,
            };

            const saved = initial
                ? await MissionApi.update(initial.id, payload)
                : await MissionApi.create(payload);

            onSaved?.(saved as MissionDTO);
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
            {/* Company selects */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Employer (required) */}
                <div className="grid gap-2">
                    <Label htmlFor="employerCompanyId">Employeur</Label>
                    <Select
                        disabled={!!defaultEmployerCompanyId}
                        value={form.watch('employerCompanyId') ?? ''}
                        onValueChange={val => {
                            form.setValue('employerCompanyId', val, {
                                shouldDirty: true,
                                shouldValidate: true,
                            });
                            // The previously-picked client belongs to the old
                            // employer — clear it so we never persist a mismatch.
                            form.setValue('clientCompanyId', undefined, {
                                shouldDirty: true,
                                shouldValidate: true,
                            });
                        }}
                    >
                        <SelectTrigger id="employerCompanyId">
                            <SelectValue placeholder="Choisir un employeur…" />
                        </SelectTrigger>
                        <SelectContent>
                            {employerCompanies.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-destructive">
                        {form.formState.errors.employerCompanyId?.message}
                    </p>
                </div>

                {/* Client (optional) */}
                <div className="grid gap-2">
                    <Label htmlFor="clientCompanyId">Client (optionnel)</Label>
                    <Select
                        value={form.watch('clientCompanyId') ?? ''}
                        onValueChange={val =>
                            form.setValue(
                                'clientCompanyId',
                                val === '__none__' ? undefined : val,
                                { shouldDirty: true, shouldValidate: true }
                            )
                        }
                    >
                        <SelectTrigger id="clientCompanyId">
                            <SelectValue placeholder="Aucun client" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Aucun</SelectItem>
                            {clientCompanies.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

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
                    {/* Ongoing toggle */}
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
                        <Label htmlFor="ongoing">En cours</Label>
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

            {/* Visibility */}
            <div className="flex items-center gap-2">
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

            {/* Skills (tech stack) */}
            <div className="grid gap-2">
                <Label>Technologies (Mission)</Label>
                <SkillMultiSelect
                    value={form.watch('skillIds') ?? []}
                    onChange={ids =>
                        form.setValue('skillIds', ids, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                    options={skills ?? []}
                    locale={(locales[0] as any) ?? 'fr'}
                />
                <p className="text-xs text-muted-foreground">
                    {skillsLoading
                        ? 'Chargement des compétences…'
                        : skills.length === 0
                          ? 'Aucune compétence disponible — crée-en dans Compétences.'
                          : 'Tape pour filtrer les compétences.'}
                </p>
            </div>

            {/* Illustration — same media card as every other admin form */}
            <FormSection
                icon={ImageIcon}
                title="Illustration"
                description="Importez un fichier ou collez une URL (image ou vidéo)."
            >
                <MediaUploadField
                    ariaLabel="Illustration"
                    accept="media"
                    value={form.watch('imageUrl') ?? ''}
                    onChange={url =>
                        form.setValue('imageUrl', url, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                />
            </FormSection>

            {/* Translations */}
            <div className="space-y-4">
                <Label>Traductions</Label>
                <LocaleTabs
                    locales={locales as any}
                    defaultLocale={(locales[0] as any) ?? 'fr'}
                    render={loc => (
                        <div className="grid gap-4">
                            {/* Title */}
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Titre
                                </Label>
                                <Input
                                    {...form.register(
                                        `translations.${loc}.title` as any
                                    )}
                                    placeholder="Titre de la mission…"
                                />
                                {(form.formState.errors.translations as any)?.[
                                    loc
                                ]?.title && (
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

                            {/* Context */}
                            <div className="grid gap-2">
                                <Label>
                                    {String(loc).toUpperCase()} — Contexte
                                </Label>
                                <Textarea
                                    rows={4}
                                    {...form.register(
                                        `translations.${loc}.context` as any
                                    )}
                                    placeholder="Contexte de la mission (optionnel)…"
                                />
                            </div>

                            {/* Tasks — extracted component so useFieldArray is at component top-level */}
                            <TaskList form={form as any} loc={loc} />
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
