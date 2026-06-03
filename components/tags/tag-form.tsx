'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { LocaleTabs } from '@/components/forms/locale-tabs';
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
import { LocalesApi } from '@/lib/locales/locales.api';
import { type CreateTagPayload, TagApi } from '@/lib/tag/tag.api';
import type { Locale, TagDTO } from '@/lib/types';

const TagTypeEnum = z.enum([
    'TECH',
    'QUAL',
    'SKILL_CATEGORY',
    'EXPERIENCE_TECH',
]);
const TranslationSchema = z.object({ name: z.string().min(1, 'Requis') });

const FormSchema = z.object({
    type: TagTypeEnum,
    hexColor: z
        .string()
        .regex(/^#([0-9A-Fa-f]{6})$/, 'Format hex invalide (ex: #8b5cf6)'),
    isVisible: z.boolean(),
    translations: z.record(z.string(), TranslationSchema),
});

type FormInput = z.input<typeof FormSchema>;
type FormOutput = z.output<typeof FormSchema>;

export function TagForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
}: {
    initial?: TagDTO | null;
    onSaved?: (tag: TagDTO) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
    dialogOpen?: boolean;
}) {
    const [locales, setLocales] = useState<Array<Locale | string>>([
        'fr',
        'en',
    ]);

    useEffect(() => {
        if (!dialogOpen) return;
        LocalesApi.findAll()
            .then(ls => {
                if (Array.isArray(ls) && ls.length) {
                    setLocales(ls);
                }
            })
            .catch(() => {});
    }, [dialogOpen]);

    const defaultValues = useMemo<FormInput>(() => {
        const safeLocales = locales.length ? locales : ['fr', 'en'];
        const translations = Object.fromEntries(
            safeLocales.map(loc => {
                const fallback =
                    (initial as any)?.translations?.find(
                        (t: any) => t.locale === loc
                    )?.name ??
                    (
                        initial?.nameByLocale as
                            | Record<string, string>
                            | undefined
                    )?.[loc] ??
                    '';
                return [loc, { name: fallback }];
            })
        );
        return {
            type: initial?.type ?? 'EXPERIENCE_TECH',
            hexColor: initial?.hexColor ?? '#8b5cf6',
            isVisible: initial?.isVisible ?? true,
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

    // Expose dirty state + submit so the dialog can auto-save on close.
    const formElRef = useRef<HTMLFormElement>(null);
    useEffect(() => {
        onRegister?.({
            isDirty: () => form.formState.isDirty,
            submit: () => formElRef.current?.requestSubmit(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [saving, setSaving] = useState(false);

    const onSubmit = form.handleSubmit(async raw => {
        setSaving(true);
        try {
            const values = FormSchema.parse(raw) as FormOutput;
            const payload: CreateTagPayload = {
                type: values.type,
                hexColor: values.hexColor,
                isVisible: values.isVisible,
                translations: Object.entries(values.translations).map(
                    ([locale, data]) => ({
                        locale,
                        name: data.name,
                    })
                ),
            };
            const saved = initial
                ? await TagApi.update(initial.id, payload)
                : await TagApi.create(payload);
            onSaved?.(saved);
        } finally {
            setSaving(false);
        }
    });

    const localeList = (locales.length ? locales : ['fr', 'en']) as Locale[];
    const primaryLocale = localeList[0] ?? 'fr';

    return (
        <form ref={formElRef} onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Type</Label>
                    <Select
                        value={form.watch('type')}
                        onValueChange={value =>
                            form.setValue('type', value as FormInput['type'], {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Choisir un type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TECH">TECH</SelectItem>
                            <SelectItem value="QUAL">QUAL</SelectItem>
                            <SelectItem value="SKILL_CATEGORY">
                                SKILL_CATEGORY
                            </SelectItem>
                            <SelectItem value="EXPERIENCE_TECH">
                                EXPERIENCE_TECH
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-2">
                    <Label>Couleur</Label>
                    <div className="grid grid-cols-[auto,1fr] items-center gap-3">
                        <Input
                            type="color"
                            className="h-10 w-12 cursor-pointer p-1"
                            value={form.watch('hexColor')}
                            onChange={event =>
                                form.setValue('hexColor', event.target.value, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                })
                            }
                        />
                        <div>
                            <Input
                                value={form.watch('hexColor')}
                                onChange={event =>
                                    form.setValue(
                                        'hexColor',
                                        event.target.value,
                                        {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        }
                                    )
                                }
                                placeholder="#8b5cf6"
                            />
                            <p className="text-xs text-destructive">
                                {form.formState.errors.hexColor?.message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <Switch
                        checked={!!form.watch('isVisible')}
                        onCheckedChange={value =>
                            form.setValue('isVisible', value, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                    />
                    <div className="space-y-1">
                        <Label>Visible</Label>
                        <p className="text-xs text-muted-foreground">
                            Contrôle l’affichage public du tag.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Libellés</Label>
                <LocaleTabs
                    locales={localeList}
                    defaultLocale={primaryLocale}
                    render={locale => (
                        <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                                {locale.toUpperCase()}
                            </Label>
                            <Input
                                value={
                                    form.watch(`translations.${locale}.name`) ||
                                    ''
                                }
                                onChange={event =>
                                    form.setValue(
                                        `translations.${locale}.name`,
                                        event.target.value,
                                        {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        }
                                    )
                                }
                                placeholder={`Nom (${locale})`}
                            />
                        </div>
                    )}
                />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onCancel?.()}
                >
                    Annuler
                </Button>
                <Button type="submit" disabled={saving}>
                    {initial ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </form>
    );
}
