'use client';

import { ImageIcon, RefreshCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
import { FormSection } from '@/components/forms/form-section';
import { MediaUploadField } from '@/components/forms/media-upload-field';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfileApi } from '@/lib/profile/profile.api';
import type { ProfileDTO } from '@/lib/types';

const LOCALES = ['fr', 'en'] as const;
const LOCALE_LABELS = { fr: 'Français', en: 'English' };

type LocaleData = {
    greeting: string;
    profession: string;
    description: string;
    introduction: string;
};
type FormState = {
    name: string;
    imageUrl: string;
    fr: LocaleData;
    en: LocaleData;
};

const empty = (): LocaleData => ({
    greeting: '',
    profession: '',
    description: '',
    introduction: '',
});

function toFormState(p: ProfileDTO): FormState {
    const get = (loc: string): LocaleData => {
        const t = p.translations.find(t => t.locale === loc);
        return t
            ? {
                  greeting: t.greeting,
                  profession: t.profession,
                  description: t.description,
                  introduction: t.introduction ?? '',
              }
            : empty();
    };
    return {
        name: p.name,
        imageUrl: p.imageUrl ?? '',
        fr: get('fr'),
        en: get('en'),
    };
}

export default function ProfilePage() {
    const [form, setForm] = useState<FormState>({
        name: '',
        imageUrl: '',
        fr: empty(),
        en: empty(),
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await ProfileApi.get();
            setForm(toFormState(data));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const setLocale = (
        loc: 'fr' | 'en',
        key: keyof LocaleData,
        value: string
    ) => {
        setForm(prev => ({ ...prev, [loc]: { ...prev[loc], [key]: value } }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await ProfileApi.update({
                name: form.name,
                imageUrl: form.imageUrl,
                translations: LOCALES.map(loc => ({
                    locale: loc,
                    greeting: form[loc].greeting,
                    profession: form[loc].profession,
                    description: form[loc].description,
                    introduction: form[loc].introduction,
                })),
            });
            setSaved(true);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminPageShell>
            <AdminHeader
                title="Profil"
                description="Textes affichés dans la section héro du portfolio."
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={load}
                            disabled={loading}
                        >
                            <RefreshCcw className="mr-1 h-4 w-4" />
                            Actualiser
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={saving || loading}
                        >
                            <Save className="mr-1 h-4 w-4" />
                            {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
                        </Button>
                    </>
                }
            />

            <AdminCard>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Label>Nom</Label>
                        <Input
                            value={form.name}
                            onChange={e => {
                                setForm(p => ({ ...p, name: e.target.value }));
                                setSaved(false);
                            }}
                            placeholder="Almeida Neo."
                        />
                        <p className="text-xs text-muted-foreground">
                            Affiché dans les deux langues.
                        </p>
                    </div>

                    {/* Photo — same media card as every other admin form */}
                    <FormSection
                        icon={ImageIcon}
                        title="Photo (« Qui suis-je ? »)"
                        description="Importez un fichier ou collez une URL."
                    >
                        <MediaUploadField
                            ariaLabel="Photo"
                            value={form.imageUrl}
                            onChange={url => {
                                setForm(p => ({ ...p, imageUrl: url }));
                                setSaved(false);
                            }}
                        />
                    </FormSection>

                    <div className="grid gap-6 md:grid-cols-2">
                        {LOCALES.map(loc => (
                            <div key={loc} className="space-y-4">
                                <h3 className="font-medium">
                                    {LOCALE_LABELS[loc]}
                                </h3>
                                <div className="space-y-2">
                                    <Label>Salutation</Label>
                                    <Input
                                        value={form[loc].greeting}
                                        onChange={e =>
                                            setLocale(
                                                loc,
                                                'greeting',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            loc === 'fr'
                                                ? "Bonjour, je m'appelle"
                                                : 'Hi, my name is'
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Profession</Label>
                                    <Input
                                        value={form[loc].profession}
                                        onChange={e =>
                                            setLocale(
                                                loc,
                                                'profession',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            loc === 'fr'
                                                ? 'Je suis développeur de logiciels.'
                                                : "I'm a Software Developer."
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={form[loc].description}
                                        onChange={e =>
                                            setLocale(
                                                loc,
                                                'description',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            loc === 'fr'
                                                ? 'Je suis un étudiant français de 22 ans !'
                                                : "I'm a 22 years old french student !"
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Introduction (« Qui suis-je ? »)
                                    </Label>
                                    <Textarea
                                        value={form[loc].introduction}
                                        onChange={e =>
                                            setLocale(
                                                loc,
                                                'introduction',
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            loc === 'fr'
                                                ? 'Hello ! Je m’appelle… découvrez la section <projects>projets</projects> de ce site.'
                                                : 'Hey! My name is… explore the <projects>projects</projects> section of this site.'
                                        }
                                        rows={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Texte complet de la section. Saute une
                                        ligne pour un nouveau paragraphe ;
                                        entoure un mot avec{' '}
                                        <code>
                                            &lt;projects&gt;…&lt;/projects&gt;
                                        </code>{' '}
                                        pour en faire un lien vers la section
                                        projets.
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </AdminCard>
        </AdminPageShell>
    );
}
