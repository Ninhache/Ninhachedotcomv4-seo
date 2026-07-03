'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ImageIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EditFormHandle } from '@/components/forms/edit-form-handle';
import { FormSection } from '@/components/forms/form-section';
import { LocaleTabs } from '@/components/forms/locale-tabs';
import { MediaUploadField } from '@/components/forms/media-upload-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LocalesApi } from '@/lib/locales/locales.api';
import { type CreateSkillPayload, SkillApi } from '@/lib/skill/skill.api';
import type { Locale, SkillDTO } from '@/lib/types';

const TranslationSchema = z.object({ name: z.string().min(1, 'Requis') });

// The image field accepts both a remote URL (https://…) and a local asset path
// served from the front's `public/` folder (e.g. `svg/skills/C.svg`) — exactly
// the two cases `mediaSrc` resolves. So we can't use `z.string().url()`, which
// only accepts absolute URLs. Accept an http(s) URL OR a relative-ish path that
// ends in a known image extension; still rejects obvious typos.
const IMAGE_SRC =
    /^(https?:\/\/.+|\/?[\w.@\-]+(\/[\w.@\-]+)*\.(svg|png|jpe?g|webp|gif|avif))$/i;

const FormSchema = z.object({
    // Optional since the Skill/Tag merge — a skill migrated from a TECH tag may
    // have no icon yet. Empty string is allowed and sent as "no image".
    image: z
        .string()
        .regex(IMAGE_SRC, 'URL ou chemin invalide')
        .or(z.literal(''))
        .optional(),
    wikiUrl: z.string().url('URL invalide').or(z.literal('')).optional(),
    isVisible: z.boolean(),
    translations: z.record(z.string(), TranslationSchema),
});

type FormInput = z.input<typeof FormSchema>;

export function SkillForm({
    initial,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
}: {
    initial?: SkillDTO | null;
    onSaved?: (skill: SkillDTO) => void;
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
                    '';
                return [loc, { name: fallback }];
            })
        );
        return {
            image: initial?.image ?? '',
            wikiUrl: initial?.wikiUrl ?? '',
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
            const payload: CreateSkillPayload = {
                // null (not undefined) so removing the icon persists — an
                // omitted field is treated as "unchanged" by the PATCH.
                image: raw.image || null,
                wikiUrl: raw.wikiUrl || undefined,
                isVisible: raw.isVisible,
                categoryIds: [],
                translations: Object.entries(raw.translations).map(
                    ([locale, data]) => ({
                        locale,
                        name: data.name,
                    })
                ),
            };
            const saved = initial
                ? await SkillApi.update(initial.id, payload)
                : await SkillApi.create(payload);
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
                    <Label>Wiki URL</Label>
                    <Input
                        value={form.watch('wikiUrl') || ''}
                        onChange={e =>
                            form.setValue('wikiUrl', e.target.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                            })
                        }
                        placeholder="https://..."
                    />
                    <p className="text-xs text-destructive">
                        {form.formState.errors.wikiUrl?.message}
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

            {/* Image — same media card as every other admin form */}
            <FormSection
                icon={ImageIcon}
                title="Image"
                description="Importez un fichier ou collez une URL."
            >
                <MediaUploadField
                    ariaLabel="Image"
                    value={form.watch('image') || ''}
                    onChange={url =>
                        form.setValue('image', url, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                    placeholder="https://… ou svg/skills/C.svg"
                />
                {form.formState.errors.image?.message && (
                    <p className="text-xs text-destructive">
                        {form.formState.errors.image.message}
                    </p>
                )}
            </FormSection>

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
