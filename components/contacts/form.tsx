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
import { Switch } from '@/components/ui/switch';
import {
    ContactApi,
    type CreateContactPayload,
} from '@/lib/contact/contact.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import type { ContactDTO, Locale } from '@/lib/types';

const TranslationSchema = z.object({ name: z.string().min(1, 'Requis') });

const FormSchema = z.object({
    contactUrl: z.string().url('URL invalide'),
    imageUrl: z.string().url('URL invalide'),
    isVisible: z.boolean(),
    translations: z.record(z.string(), TranslationSchema),
});

type FormInput = z.input<typeof FormSchema>;

export function ContactForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
}: {
    initial?: ContactDTO | null;
    onSaved?: (contact: ContactDTO) => void;
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
                if (Array.isArray(ls) && ls.length) setLocales(ls);
            })
            .catch(() => {});
    }, [dialogOpen]);

    const defaultValues = useMemo<FormInput>(() => {
        const safeLocales = locales.length ? locales : ['fr', 'en'];
        const translations = Object.fromEntries(
            safeLocales.map(loc => {
                const fallback =
                    initial?.translations?.find(t => t.locale === loc)?.name ??
                    initial?.nameByLocale?.[loc as Locale] ??
                    '';
                return [loc, { name: fallback }];
            })
        );
        return {
            contactUrl: initial?.contactUrl ?? '',
            imageUrl: initial?.imageUrl ?? '',
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

    const [saving, setSaving] = useState(false);

    const onSubmit = form.handleSubmit(async raw => {
        setSaving(true);
        try {
            const payload: CreateContactPayload = {
                contactUrl: raw.contactUrl,
                imageUrl: raw.imageUrl,
                isVisible: raw.isVisible,
                translations: Object.entries(raw.translations).map(
                    ([locale, data]) => ({
                        locale,
                        name: data.name,
                    })
                ),
            };
            const saved = initial
                ? await ContactApi.update(initial.id, payload)
                : await ContactApi.create(payload);
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
                    <Label>Contact URL</Label>
                    <Input
                        value={form.watch('contactUrl') || ''}
                        onChange={e =>
                            form.setValue('contactUrl', e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                        placeholder="https://..."
                    />
                    <p className="text-xs text-destructive">
                        {form.formState.errors.contactUrl?.message}
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label>Image URL</Label>
                    <Input
                        value={form.watch('imageUrl') || ''}
                        onChange={e =>
                            form.setValue('imageUrl', e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                        placeholder="https://..."
                    />
                    <p className="text-xs text-destructive">
                        {form.formState.errors.imageUrl?.message}
                    </p>
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
                            Contrôle l'affichage public.
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
                                onChange={e =>
                                    form.setValue(
                                        `translations.${locale}.name`,
                                        e.target.value,
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
