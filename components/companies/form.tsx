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
import { SkillMultiSelect } from '@/components/forms/skill-multi-select';
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
import { CompanyApi } from '@/lib/company/company.api';
import { SkillApi } from '@/lib/skill/skill.api';
import type {
    CompanyDTO,
    CompanyKind,
    ContractType,
    SkillDTO,
} from '@/lib/types';
import { cn } from '@/lib/utils';

const contractTypes: ContractType[] = [
    'Permanent',
    'Fixed',
    'Internship',
    'Workstudy',
    'Freelance',
];

const FormSchema = z.object({
    kind: z.enum(['EMPLOYER', 'CLIENT']),
    name: z.string().min(1),
    localisation: z.string().optional(),
    siteUrl: z
        .string()
        .url()
        .optional()
        .or(z.literal('').transform(() => undefined)),
    // « Fond » — large illustration image shown on the public experience card.
    backgroundUrl: z.string().optional(),
    // « Logo » — the company's real logo, shown on the standalone timeline.
    logoUrl: z.string().optional(),
    isVisible: z.boolean(),
    // Translatable card/modal blurb. Per-locale, optional — a company may have
    // none. Stored flat here, assembled into a `translations` array on submit.
    descriptionFr: z.string().optional(),
    descriptionEn: z.string().optional(),
    // Employer-only fields — always present in the form value but ignored
    // during payload construction when kind === 'CLIENT'.
    contractType: z
        .enum(['Permanent', 'Fixed', 'Internship', 'Workstudy', 'Freelance'])
        .optional(),
    employmentStart: z.coerce.date().optional(),
    // `ongoing` drives whether employmentEnd is shown / sent.
    ongoing: z.boolean(),
    employmentEnd: z.coerce.date().optional(),
    // EMPLOYER-level curated skills shown on the public card.
    skillIds: z.array(z.string()).default([]),
});

type FormInput = z.input<typeof FormSchema>;
type FormOutput = z.output<typeof FormSchema>;

/** Build default form values from an existing CompanyDTO (edit) or blank (create). */
function buildDefaults(
    initial?: CompanyDTO | null,
    lockedKind?: CompanyKind
): FormInput {
    const effectiveKind = lockedKind ?? initial?.kind ?? 'EMPLOYER';
    const isEmployer = effectiveKind === 'EMPLOYER';
    return {
        kind: effectiveKind,
        name: initial?.name ?? '',
        localisation: initial?.localisation ?? '',
        siteUrl: initial?.siteUrl ?? '',
        backgroundUrl: initial?.backgroundUrl ?? '',
        logoUrl: initial?.logoUrl ?? '',
        isVisible: initial?.isVisible ?? true,
        descriptionFr:
            initial?.translations?.find(t => t.locale === 'fr')?.description ??
            '',
        descriptionEn:
            initial?.translations?.find(t => t.locale === 'en')?.description ??
            '',
        contractType:
            (initial?.contractType as ContractType | undefined) ?? 'Permanent',
        employmentStart: initial?.employmentStart
            ? new Date(initial.employmentStart)
            : undefined,
        ongoing: isEmployer ? !initial?.employmentEnd : false,
        employmentEnd: initial?.employmentEnd
            ? new Date(initial.employmentEnd)
            : undefined,
        // GET returns full skill objects; the form tracks their ids.
        skillIds: initial?.skills?.map(s => s.id) ?? initial?.skillIds ?? [],
    };
}

export function CompanyForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
    lockedKind,
    parentEmployerId,
}: {
    initial?: CompanyDTO | null;
    onSaved?: (saved: CompanyDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
    dialogOpen?: boolean;
    // When set, the kind picker is hidden and the form is forced to this kind
    // (the hierarchical admin injects EMPLOYER/CLIENT from the route context).
    lockedKind?: CompanyKind;
    // The owning employer for a CLIENT — always derived from route context,
    // never a visible picker. Sent in the payload when kind === 'CLIENT'.
    parentEmployerId?: string;
}) {
    const [loading, setLoading] = useState(false);
    // Available skills (the unified tech-stack pool company skills are picked from).
    const [skills, setSkills] = useState<SkillDTO[]>([]);

    // Load the skill pool when the dialog opens (avoid eager requests).
    useEffect(() => {
        if (!dialogOpen) return;
        let ignore = false;
        SkillApi.findAll()
            .then(skillList => {
                if (!ignore) setSkills(skillList ?? []);
            })
            .catch(() => {
                if (!ignore) setSkills([]);
            });
        return () => {
            ignore = true;
        };
    }, [dialogOpen]);

    const defaultValues = useMemo(
        () => buildDefaults(initial, lockedKind),
        [initial, lockedKind]
    );

    const form = useForm<FormInput>({
        resolver: zodResolver(FormSchema),
        defaultValues,
    });

    // Re-sync defaults when `initial` changes (dialog reuse between create/edit).
    useEffect(() => {
        form.reset(defaultValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultValues]);

    // Expose imperative handle so the auto-save dialog can check dirty state
    // and trigger submit without the user pressing the button.
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

    const kind = form.watch('kind');
    const ongoing = form.watch('ongoing');
    const isEmployer = kind === 'EMPLOYER';

    // Inline DateField — a month/year picker reused for both date inputs below.
    const DateField = ({
        label,
        name,
    }: {
        label: string;
        name: 'employmentStart' | 'employmentEnd';
    }) => {
        const raw = form.watch(name) as unknown;
        const value = raw
            ? raw instanceof Date
                ? raw
                : new Date(raw as any)
            : undefined;

        const setValue = (d?: Date) =>
            form.setValue(name, d, {
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

    const onSubmit = form.handleSubmit(async raw => {
        setLoading(true);
        try {
            const values = FormSchema.parse(raw) as FormOutput;

            // Assemble the per-locale blurb into the wire `translations` array,
            // dropping blank locales. Always sent (even []) so clearing the
            // text removes the translation rows on update.
            const translations = [
                { locale: 'fr' as const, description: values.descriptionFr },
                { locale: 'en' as const, description: values.descriptionEn },
            ]
                .filter(t => t.description && t.description.trim().length > 0)
                .map(t => ({ locale: t.locale, description: t.description! }));

            // Base payload — always sent regardless of kind.
            const payload: Record<string, unknown> = {
                kind: values.kind,
                name: values.name,
                isVisible: values.isVisible,
                translations,
                ...(values.localisation
                    ? { localisation: values.localisation }
                    : {}),
                ...(values.siteUrl ? { siteUrl: values.siteUrl } : {}),
                // Always sent (null when cleared) so removing a media persists —
                // an omitted field is treated as "unchanged" by the PATCH.
                backgroundUrl: values.backgroundUrl || null,
                logoUrl: values.logoUrl || null,
            };

            // Employer-only fields — omit entirely for CLIENT rows.
            if (values.kind === 'EMPLOYER') {
                if (values.contractType) {
                    payload.contractType = values.contractType;
                }
                if (values.employmentStart) {
                    payload.employmentStart =
                        values.employmentStart.toISOString();
                }
                // Always sent (null when "En cours") so toggling ongoing on an
                // employer that already had an end date actually clears it — an
                // omitted field is treated as "unchanged" by the PATCH.
                payload.employmentEnd =
                    !values.ongoing && values.employmentEnd
                        ? values.employmentEnd.toISOString()
                        : null;
                // Always send skillIds (even []) so deselecting all clears the set.
                payload.skillIds = values.skillIds ?? [];
            } else if (parentEmployerId) {
                // CLIENT scoped to its owning employer (from the route context).
                payload.parentEmployerId = parentEmployerId;
            }

            const saved = initial
                ? await CompanyApi.update(initial.id, payload)
                : await CompanyApi.create(payload);

            onSaved?.(saved);
        } finally {
            setLoading(false);
        }
    });

    return (
        <form ref={formElRef} onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {/* kind — hidden when the route context locks it */}
                {!lockedKind && (
                    <div className="grid gap-2">
                        <Label>Type</Label>
                        <select
                            className="input rounded-md border px-3 py-2"
                            {...form.register('kind')}
                        >
                            <option value="EMPLOYER">Employeur</option>
                            <option value="CLIENT">Client</option>
                        </select>
                    </div>
                )}

                {/* name */}
                <div className="grid gap-2">
                    <Label>Nom</Label>
                    <Input
                        autoFocus
                        {...form.register('name')}
                        placeholder="Nom de l'entreprise…"
                    />
                    <p className="text-sm text-destructive">
                        {form.formState.errors.name?.message}
                    </p>
                </div>

                {/* localisation */}
                <div className="grid gap-2">
                    <Label>Localisation</Label>
                    <Input
                        {...form.register('localisation')}
                        placeholder="Paris, Remote…"
                    />
                </div>

                {/* siteUrl */}
                <div className="grid gap-2">
                    <Label>Site</Label>
                    <Input
                        {...form.register('siteUrl')}
                        placeholder="https://…"
                    />
                    <p className="text-sm text-destructive">
                        {form.formState.errors.siteUrl?.message}
                    </p>
                </div>

                {/* isVisible */}
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

            {/* Fond: large illustration image used on the public experience
                card. Paste a URL or upload a file (stored in back/uploads). */}
            <FormSection
                icon={ImageIcon}
                title="Fond"
                description="Grande image représentant l'entreprise (affichée sur le portfolio)."
            >
                <MediaUploadField
                    ariaLabel="Fond"
                    value={form.watch('backgroundUrl') ?? ''}
                    onChange={url =>
                        form.setValue('backgroundUrl', url, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                />
            </FormSection>

            {/* Logo: the company's real logo, displayed on the standalone
                timeline (not the public site). */}
            <FormSection
                icon={ImageIcon}
                title="Logo"
                description="Logo de l'entreprise (affiché sur la timeline)."
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

            {/* Description (translatable) — shown on the public card (employer)
                or in the mission modal (client). Optional for both kinds. */}
            <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
                <p className="text-sm font-medium text-muted-foreground md:col-span-2">
                    Description
                </p>
                <div className="grid gap-2">
                    <Label>Description (FR)</Label>
                    <Textarea
                        {...form.register('descriptionFr')}
                        placeholder="Présentation de l'entreprise…"
                        rows={4}
                    />
                </div>
                <div className="grid gap-2">
                    <Label>Description (EN)</Label>
                    <Textarea
                        {...form.register('descriptionEn')}
                        placeholder="Company blurb…"
                        rows={4}
                    />
                </div>
            </div>

            {/* Employer-only block */}
            {isEmployer && (
                <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
                    <p className="text-sm font-medium text-muted-foreground md:col-span-2">
                        Informations employeur
                    </p>

                    {/* contractType */}
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

                    {/* employmentStart */}
                    <DateField label="Début (emploi)" name="employmentStart" />

                    {/* ongoing toggle */}
                    <div className="flex items-center gap-2 md:col-span-2">
                        <Switch
                            checked={!!ongoing}
                            onCheckedChange={v => {
                                form.setValue('ongoing', v, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                });
                                if (v) {
                                    // Clear employmentEnd when marking as ongoing.
                                    form.setValue('employmentEnd', undefined, {
                                        shouldDirty: true,
                                    });
                                }
                            }}
                        />
                        <Label>En cours</Label>
                    </div>

                    {/* employmentEnd — shown only when not ongoing */}
                    {!ongoing && (
                        <DateField label="Fin (emploi)" name="employmentEnd" />
                    )}

                    {/* Curated card skills — broad, employer-level (the public
                        card shows these, not the aggregated mission skills). */}
                    <div className="grid gap-2 md:col-span-2">
                        <Label>Compétences de la société (carte)</Label>
                        <SkillMultiSelect
                            value={form.watch('skillIds') ?? []}
                            onChange={ids =>
                                form.setValue('skillIds', ids, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                            options={skills ?? []}
                            locale="fr"
                        />
                        <p className="text-xs text-muted-foreground">
                            Quelques compétences larges affichées sur la carte.
                            Les compétences précises se définissent par mission.
                        </p>
                    </div>
                </div>
            )}

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
