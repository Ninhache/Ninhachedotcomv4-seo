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
import { Textarea } from '@/components/ui/textarea';
import type { AliasPayload } from '@/lib/alias/alias.api';
import { LocalesApi } from '@/lib/locales/locales.api';
import type { Alias, Locale } from '@/lib/types';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FormSchema = z.object({
    key: z
        .string()
        .min(1, 'Requis')
        .regex(SLUG_RE, 'Clé invalide (slug : a-z, 0-9, tirets)'),
    bodies: z.record(z.string(), z.object({ code: z.string() })),
});

type FormInput = z.input<typeof FormSchema>;
type FormOutput = z.output<typeof FormSchema>;

export function AliasForm({
    initial,
    save,
    onSaved,
    onCancel,
    onRegister,
    dialogOpen = false,
}: {
    initial?: Alias | null;
    // Injected by the page: AliasApi.create on create, a closure over
    // AliasApi.update(id, …) on edit. The front never executes alias bodies.
    save: (payload: AliasPayload) => Promise<Alias>;
    onSaved?: (alias: Alias) => void;
    onCancel?: () => void;
    onRegister?: (handle: EditFormHandle) => void;
    dialogOpen?: boolean;
}) {
    const [locales, setLocales] = useState<Array<Locale | string>>([
        'fr',
        'en',
    ]);
    const [saving, setSaving] = useState(false);

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
        const bodies = Object.fromEntries(
            safeLocales.map(loc => {
                const code =
                    initial?.bodies?.find(b => b.locale === loc)?.code ?? '';
                return [loc, { code }];
            })
        );
        return { key: initial?.key ?? '', bodies };
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
    useEffect(() => {
        onRegister?.({
            isDirty: () => form.formState.isDirty,
            submit: () => formElRef.current?.requestSubmit(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const localeList = (locales.length ? locales : ['fr', 'en']) as Locale[];
    const primaryLocale = localeList[0] ?? 'fr';

    const onSubmit = form.handleSubmit(async raw => {
        setSaving(true);
        try {
            const values = FormSchema.parse(raw) as FormOutput;
            const payload: AliasPayload = {
                key: values.key,
                bodies: Object.entries(values.bodies).map(([locale, data]) => ({
                    locale,
                    code: data.code,
                })),
            };
            const saved = await save(payload);
            onSaved?.(saved);
        } finally {
            setSaving(false);
        }
    });

    return (
        <form ref={formElRef} onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-2">
                <Label>Clé</Label>
                <Input
                    value={form.watch('key') || ''}
                    onChange={event =>
                        form.setValue('key', event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                        })
                    }
                    placeholder="ex: age-actuel"
                />
                <p className="text-xs text-destructive">
                    {form.formState.errors.key?.message}
                </p>
            </div>

            <div className="space-y-3">
                <Label>Corps (JS) par langue</Label>
                <p className="text-xs text-muted-foreground">
                    Dernière ligne = <code>return</code> ; autres alias via{' '}
                    <code>$.cle</code> ; arguments via <code>$.args</code>. Le
                    code n’est jamais exécuté côté front — il l’est côté back
                    (isolate).
                </p>
                <LocaleTabs
                    locales={localeList}
                    defaultLocale={primaryLocale}
                    render={locale => (
                        <div className="grid gap-2">
                            <Label className="text-xs text-muted-foreground">
                                {locale.toUpperCase()}
                            </Label>
                            <Textarea
                                rows={10}
                                spellCheck={false}
                                className="font-mono text-sm"
                                value={
                                    form.watch(`bodies.${locale}.code`) || ''
                                }
                                onChange={event =>
                                    form.setValue(
                                        `bodies.${locale}.code`,
                                        event.target.value,
                                        {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        }
                                    )
                                }
                                placeholder={`// ${locale}\nconst y = new Date().getFullYear() - 2002;\nreturn y;`}
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
