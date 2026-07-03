'use client';

import { Download, FileText, Loader2, Save, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
} from '@/components/admin/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { baseUrl } from '@/lib/baseurl';
import { CvApi } from '@/lib/cv/cv.api';
import type {
    CvConfigDTO,
    CvInventoryDTO,
    CvSelection,
    Locale,
} from '@/lib/types';

type GenLocale = 'fr' | 'en' | 'both';

type SectionKey = keyof NonNullable<CvSelection['sections']>;
type EntityKey = keyof NonNullable<CvSelection['includeIds']>;

const SECTION_LABELS: Record<SectionKey, string> = {
    experience: 'Expériences',
    education: 'Formation',
    skills: 'Compétences',
    projects: 'Projets',
    contact: 'Contacts (en-tête)',
};

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
    experience: true,
    education: true,
    skills: true,
    projects: false,
    contact: true,
};

const fullUrl = (url: string) =>
    url.startsWith('http') ? url : `${baseUrl}${url}`;

// Compact "2022 – 2025" / "2018" / "2024 – present" label from ISO dates.
const yearRange = (
    start?: string | null,
    end?: string | null
): string | undefined => {
    if (!start) return undefined;
    const s = start.slice(0, 4);
    const e = end ? end.slice(0, 4) : 'présent';
    return s === e ? s : `${s} – ${e}`;
};

export default function CvBuilderPage() {
    const [labelLocale, setLabelLocale] = useState<Locale>('fr');
    const [inventory, setInventory] = useState<CvInventoryDTO | null>(null);
    const [loading, setLoading] = useState(true);

    const [template, setTemplate] = useState('international');
    const [genLocale, setGenLocale] = useState<GenLocale>('both');
    const [publish, setPublish] = useState(false);

    const [sections, setSections] =
        useState<Record<SectionKey, boolean>>(DEFAULT_SECTIONS);
    // Explicit allow-lists: a Set holds the checked ids per entity.
    const [checked, setChecked] = useState<Record<EntityKey, Set<string>>>({
        companies: new Set(),
        missions: new Set(),
        education: new Set(),
        skills: new Set(),
        projects: new Set(),
        contacts: new Set(),
    });

    const [summary, setSummary] = useState<{ fr: string; en: string }>({
        fr: '',
        en: '',
    });
    // Per-mission CV bullet overrides, kept as raw textarea text (one bullet
    // per line) per locale; split into arrays only when building the payload.
    const [bulletText, setBulletText] = useState<
        Record<string, { fr: string; en: string }>
    >({});
    // Per-project bullet text + role line (same raw-text approach).
    const [projectBulletText, setProjectBulletText] = useState<
        Record<string, { fr: string; en: string }>
    >({});
    const [projectRole, setProjectRole] = useState<
        Record<string, { fr: string; en: string }>
    >({});
    const [spoken, setSpoken] = useState<{ fr: string; en: string }>({
        fr: '',
        en: '',
    });
    // "Leadership & Activities" entries; role/bullets held as raw text.
    type ActivityEntry = {
        org: string;
        dates: string;
        role: { fr: string; en: string };
        bullets: { fr: string; en: string };
    };
    const [activities, setActivities] = useState<ActivityEntry[]>([]);

    // Header extras (not backed by portfolio entities).
    const [phone, setPhone] = useState('');
    type LinkEntry = { label: string; url: string };
    const [extraLinks, setExtraLinks] = useState<LinkEntry[]>([]);
    // Projects note + its optional link.
    const [projectsNote, setProjectsNote] = useState<{
        fr: string;
        en: string;
    }>({ fr: '', en: '' });
    const [projectsNoteUrl, setProjectsNoteUrl] = useState('');
    // References: a note (per locale) and/or named referents.
    const [referencesNote, setReferencesNote] = useState<{
        fr: string;
        en: string;
    }>({ fr: '', en: '' });
    type ReferenceEntry = {
        name: string;
        title: string;
        org: string;
        contact: string;
        url: string;
    };
    const [references, setReferences] = useState<ReferenceEntry[]>([]);
    // Full loaded selection, kept so buildSelection preserves any field the UI
    // does not manage (never silently drop config on generate/save).
    const [baseSelection, setBaseSelection] = useState<CvSelection>({});

    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ fr?: string; en?: string }>({});

    // Build the full set of available ids for an entity from the inventory.
    const allIds = useCallback(
        (inv: CvInventoryDTO): Record<EntityKey, string[]> => ({
            companies: inv.companies.map(c => c.id),
            missions: inv.companies.flatMap(c => c.missions.map(m => m.id)),
            education: inv.education.map(e => e.id),
            skills: inv.skillCategories.flatMap(cat =>
                cat.skills.map(s => s.id)
            ),
            projects: inv.projects.map(p => p.id),
            contacts: inv.contacts.map(c => c.id),
        }),
        []
    );

    const hydrate = useCallback(
        (inv: CvInventoryDTO, cfg: CvConfigDTO) => {
            const all = allIds(inv);
            const sel = cfg.selection ?? {};
            setTemplate(cfg.template || 'international');
            setSections({ ...DEFAULT_SECTIONS, ...(sel.sections ?? {}) });
            setChecked({
                companies: new Set(sel.includeIds?.companies ?? all.companies),
                missions: new Set(sel.includeIds?.missions ?? all.missions),
                education: new Set(sel.includeIds?.education ?? all.education),
                skills: new Set(sel.includeIds?.skills ?? all.skills),
                projects: new Set(sel.includeIds?.projects ?? all.projects),
                contacts: new Set(sel.includeIds?.contacts ?? all.contacts),
            });
            setSummary({
                fr: sel.summary?.fr ?? '',
                en: sel.summary?.en ?? '',
            });
            const joinBullets = (
                src: Record<string, { fr?: string[]; en?: string[] }>
            ) => {
                const out: Record<string, { fr: string; en: string }> = {};
                for (const [id, b] of Object.entries(src)) {
                    out[id] = {
                        fr: (b.fr ?? []).join('\n'),
                        en: (b.en ?? []).join('\n'),
                    };
                }
                return out;
            };
            setBulletText(joinBullets(sel.bulletsByMission ?? {}));
            setProjectBulletText(joinBullets(sel.bulletsByProject ?? {}));
            const roles: Record<string, { fr: string; en: string }> = {};
            for (const [id, r] of Object.entries(sel.roleByProject ?? {})) {
                roles[id] = { fr: r.fr ?? '', en: r.en ?? '' };
            }
            setProjectRole(roles);
            setSpoken({
                fr: sel.spokenLanguages?.fr ?? '',
                en: sel.spokenLanguages?.en ?? '',
            });
            setActivities(
                (sel.activities ?? []).map(a => ({
                    org: a.org ?? '',
                    dates: a.dates ?? '',
                    role: { fr: a.role?.fr ?? '', en: a.role?.en ?? '' },
                    bullets: {
                        fr: (a.bullets?.fr ?? []).join('\n'),
                        en: (a.bullets?.en ?? []).join('\n'),
                    },
                }))
            );
            setPhone(sel.phone ?? '');
            setExtraLinks(
                (sel.extraLinks ?? []).map(l => ({
                    label: l.label ?? '',
                    url: l.url ?? '',
                }))
            );
            setProjectsNote({
                fr: sel.projectsNote?.fr ?? '',
                en: sel.projectsNote?.en ?? '',
            });
            setProjectsNoteUrl(sel.projectsNoteUrl ?? '');
            setReferencesNote({
                fr: sel.referencesNote?.fr ?? '',
                en: sel.referencesNote?.en ?? '',
            });
            setReferences(
                (sel.references ?? []).map(r => ({
                    name: r.name ?? '',
                    title: r.title ?? '',
                    org: r.org ?? '',
                    contact: r.contact ?? '',
                    url: r.url ?? '',
                }))
            );
            // Keep the whole loaded selection so buildSelection can preserve
            // any field the UI does not manage.
            setBaseSelection(sel);
            setResult({
                fr: cfg.generatedFrUrl ?? undefined,
                en: cfg.generatedEnUrl ?? undefined,
            });
        },
        [allIds]
    );

    const load = useCallback(
        async (loc: Locale) => {
            setLoading(true);
            try {
                const [inv, cfg] = await Promise.all([
                    CvApi.getData(loc),
                    CvApi.getConfig(),
                ]);
                setInventory(inv);
                hydrate(inv, cfg);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        },
        [hydrate]
    );

    useEffect(() => {
        load(labelLocale);
    }, [labelLocale, load]);

    const toggleSection = (key: SectionKey, value: boolean) =>
        setSections(prev => ({ ...prev, [key]: value }));

    const toggleId = (entity: EntityKey, id: string, value: boolean) =>
        setChecked(prev => {
            const next = new Set(prev[entity]);
            if (value) next.add(id);
            else next.delete(id);
            return { ...prev, [entity]: next };
        });

    // Select-all / none for one entity. `ids` is the full set from the
    // inventory; pass `[]` and value=false to clear.
    const setMany = (entity: EntityKey, ids: string[], value: boolean) =>
        setChecked(prev => ({
            ...prev,
            [entity]: value ? new Set(ids) : new Set<string>(),
        }));

    const setBullet = (missionId: string, loc: Locale, text: string) =>
        setBulletText(prev => {
            const cur = prev[missionId] ?? { fr: '', en: '' };
            return { ...prev, [missionId]: { ...cur, [loc]: text } };
        });

    // Experiences span two entities (employers + their missions); toggle both.
    const setAllExperience = (value: boolean) => {
        if (!inventory) return;
        const companyIds = inventory.companies.map(c => c.id);
        const missionIds = inventory.companies.flatMap(c =>
            c.missions.map(m => m.id)
        );
        setMany('companies', companyIds, value);
        setMany('missions', missionIds, value);
    };

    const setProjectBullet = (projectId: string, loc: Locale, text: string) =>
        setProjectBulletText(prev => {
            const cur = prev[projectId] ?? { fr: '', en: '' };
            return { ...prev, [projectId]: { ...cur, [loc]: text } };
        });

    const setRole = (projectId: string, loc: Locale, text: string) =>
        setProjectRole(prev => {
            const cur = prev[projectId] ?? { fr: '', en: '' };
            return { ...prev, [projectId]: { ...cur, [loc]: text } };
        });

    const updateActivity = (i: number, patch: Partial<ActivityEntry>) =>
        setActivities(prev =>
            prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a))
        );
    const addActivity = () =>
        setActivities(prev => [
            ...prev,
            {
                org: '',
                dates: '',
                role: { fr: '', en: '' },
                bullets: { fr: '', en: '' },
            },
        ]);
    const removeActivity = (i: number) =>
        setActivities(prev => prev.filter((_, idx) => idx !== i));

    const updateLink = (i: number, patch: Partial<LinkEntry>) =>
        setExtraLinks(prev =>
            prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))
        );
    const addLink = () =>
        setExtraLinks(prev => [...prev, { label: '', url: '' }]);
    const removeLink = (i: number) =>
        setExtraLinks(prev => prev.filter((_, idx) => idx !== i));

    const updateReference = (i: number, patch: Partial<ReferenceEntry>) =>
        setReferences(prev =>
            prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r))
        );
    const addReference = () =>
        setReferences(prev => [
            ...prev,
            { name: '', title: '', org: '', contact: '', url: '' },
        ]);
    const removeReference = (i: number) =>
        setReferences(prev => prev.filter((_, idx) => idx !== i));

    const lines = (t: string) =>
        t
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);

    // Turn a {id: {fr,en} text} map into {id: {fr,en} arrays}, dropping empties.
    const buildBullets = (
        src: Record<string, { fr: string; en: string }>
    ): Record<string, { fr: string[]; en: string[] }> => {
        const out: Record<string, { fr: string[]; en: string[] }> = {};
        for (const [id, t] of Object.entries(src)) {
            const fr = lines(t.fr);
            const en = lines(t.en);
            if (fr.length || en.length) out[id] = { fr, en };
        }
        return out;
    };

    const buildSelection = (): CvSelection => {
        const roleByProject: NonNullable<CvSelection['roleByProject']> = {};
        for (const [id, r] of Object.entries(projectRole)) {
            if (r.fr.trim() || r.en.trim())
                roleByProject[id] = { fr: r.fr, en: r.en };
        }
        return {
            // Preserve any field the UI does not manage (never drop config).
            ...baseSelection,
            sections,
            includeIds: {
                companies: [...checked.companies],
                missions: [...checked.missions],
                education: [...checked.education],
                skills: [...checked.skills],
                projects: [...checked.projects],
                contacts: [...checked.contacts],
            },
            summary: { fr: summary.fr, en: summary.en },
            spokenLanguages: { fr: spoken.fr, en: spoken.en },
            bulletsByMission: buildBullets(bulletText),
            bulletsByProject: buildBullets(projectBulletText),
            roleByProject,
            activities: activities
                .filter(a => a.org.trim())
                .map(a => ({
                    org: a.org.trim(),
                    dates: a.dates.trim() || undefined,
                    role: { fr: a.role.fr, en: a.role.en },
                    bullets: {
                        fr: lines(a.bullets.fr),
                        en: lines(a.bullets.en),
                    },
                })),
            phone: phone.trim() || undefined,
            extraLinks: extraLinks
                .filter(l => l.url.trim())
                .map(l => ({
                    label: l.label.trim() || l.url.trim(),
                    url: l.url.trim(),
                })),
            projectsNote: { fr: projectsNote.fr, en: projectsNote.en },
            projectsNoteUrl: projectsNoteUrl.trim() || undefined,
            referencesNote: { fr: referencesNote.fr, en: referencesNote.en },
            references: references
                .filter(r => r.name.trim())
                .map(r => ({
                    name: r.name.trim(),
                    title: r.title.trim() || undefined,
                    org: r.org.trim() || undefined,
                    contact: r.contact.trim() || undefined,
                    url: r.url.trim() || undefined,
                })),
        };
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await CvApi.saveConfig({
                template,
                selection: buildSelection(),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        setError(null);
        try {
            const res = await CvApi.generate({
                locale: genLocale,
                template,
                selection: buildSelection(),
                publish,
                save: true,
            });
            setResult(prev => ({ ...prev, ...res.urls }));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AdminPageShell>
            <AdminHeader
                title="Générateur de CV"
                description="Génère un CV PDF (LaTeX) depuis tes données. Choisis quoi afficher, puis génère en FR, EN ou les deux."
                actions={
                    <div className="flex items-center gap-2">
                        <Select
                            value={labelLocale}
                            onValueChange={v => setLabelLocale(v as Locale)}
                        >
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fr">
                                    Libellés : FR
                                </SelectItem>
                                <SelectItem value="en">
                                    Libellés : EN
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                }
            />

            {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <p className="font-medium text-destructive">Erreur</p>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {error}
                    </pre>
                </div>
            )}

            {loading || !inventory ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Sections */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <CardTitle>Sections</CardTitle>
                            <CardDescription>
                                Active ou désactive des sections entières du CV.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                            {(Object.keys(SECTION_LABELS) as SectionKey[]).map(
                                key => (
                                    <label
                                        key={key}
                                        className="flex items-center justify-between rounded-md border p-3"
                                    >
                                        <span className="text-sm font-medium">
                                            {SECTION_LABELS[key]}
                                        </span>
                                        <Switch
                                            checked={sections[key]}
                                            onCheckedChange={v =>
                                                toggleSection(key, v)
                                            }
                                        />
                                    </label>
                                )
                            )}
                        </CardContent>
                    </AdminCard>

                    {/* Selectable entries */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {sections.experience && (
                            <AdminCard>
                                <CardHeader className="border-b">
                                    <SectionTitleRow
                                        title="Expériences"
                                        description="Coche les employeurs et missions à inclure."
                                        onAll={() => setAllExperience(true)}
                                        onNone={() => setAllExperience(false)}
                                    />
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    {inventory.companies.map(c => (
                                        <div key={c.id} className="space-y-2">
                                            <CheckRow
                                                id={`co-${c.id}`}
                                                label={c.name}
                                                meta={yearRange(c.start, c.end)}
                                                bold
                                                checked={checked.companies.has(
                                                    c.id
                                                )}
                                                onChange={v =>
                                                    toggleId(
                                                        'companies',
                                                        c.id,
                                                        v
                                                    )
                                                }
                                            />
                                            <div className="ml-6 space-y-3">
                                                {c.missions.map(m => (
                                                    <div
                                                        key={m.id}
                                                        className="space-y-1.5"
                                                    >
                                                        <CheckRow
                                                            id={`mi-${m.id}`}
                                                            label={
                                                                m.title ||
                                                                '(sans titre)'
                                                            }
                                                            meta={yearRange(
                                                                m.start,
                                                                m.end
                                                            )}
                                                            muted
                                                            disabled={
                                                                !checked.companies.has(
                                                                    c.id
                                                                )
                                                            }
                                                            checked={checked.missions.has(
                                                                m.id
                                                            )}
                                                            onChange={v =>
                                                                toggleId(
                                                                    'missions',
                                                                    m.id,
                                                                    v
                                                                )
                                                            }
                                                        />
                                                        {checked.companies.has(
                                                            c.id
                                                        ) &&
                                                            checked.missions.has(
                                                                m.id
                                                            ) && (
                                                                <MissionBullets
                                                                    locale={
                                                                        labelLocale
                                                                    }
                                                                    value={
                                                                        bulletText[
                                                                            m.id
                                                                        ]?.[
                                                                            labelLocale
                                                                        ] ?? ''
                                                                    }
                                                                    portfolioTasks={
                                                                        m.tasks
                                                                    }
                                                                    onChange={text =>
                                                                        setBullet(
                                                                            m.id,
                                                                            labelLocale,
                                                                            text
                                                                        )
                                                                    }
                                                                    onPrefill={() =>
                                                                        setBullet(
                                                                            m.id,
                                                                            labelLocale,
                                                                            m.tasks.join(
                                                                                '\n'
                                                                            )
                                                                        )
                                                                    }
                                                                />
                                                            )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </AdminCard>
                        )}

                        {sections.skills && (
                            <AdminCard>
                                <CardHeader className="border-b">
                                    <SectionTitleRow
                                        title="Compétences"
                                        description="Par catégorie."
                                        onAll={() =>
                                            setMany(
                                                'skills',
                                                inventory.skillCategories.flatMap(
                                                    cat =>
                                                        cat.skills.map(
                                                            s => s.id
                                                        )
                                                ),
                                                true
                                            )
                                        }
                                        onNone={() =>
                                            setMany('skills', [], false)
                                        }
                                    />
                                </CardHeader>
                                <CardContent className="space-y-4 pt-6">
                                    {inventory.skillCategories.map(cat => (
                                        <div key={cat.id} className="space-y-2">
                                            <p className="text-sm font-semibold">
                                                {cat.name}
                                            </p>
                                            <div className="ml-2 grid grid-cols-2 gap-1.5">
                                                {cat.skills.map(s => (
                                                    <CheckRow
                                                        key={s.id}
                                                        id={`sk-${s.id}`}
                                                        label={s.name}
                                                        muted
                                                        checked={checked.skills.has(
                                                            s.id
                                                        )}
                                                        onChange={v =>
                                                            toggleId(
                                                                'skills',
                                                                s.id,
                                                                v
                                                            )
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </AdminCard>
                        )}

                        {sections.education && (
                            <AdminCard>
                                <CardHeader className="border-b">
                                    <SectionTitleRow
                                        title="Formation"
                                        onAll={() =>
                                            setMany(
                                                'education',
                                                inventory.education.map(
                                                    e => e.id
                                                ),
                                                true
                                            )
                                        }
                                        onNone={() =>
                                            setMany('education', [], false)
                                        }
                                    />
                                </CardHeader>
                                <CardContent className="space-y-1.5 pt-6">
                                    {inventory.education.map(ed => (
                                        <CheckRow
                                            key={ed.id}
                                            id={`ed-${ed.id}`}
                                            label={ed.label}
                                            meta={yearRange(ed.start, ed.end)}
                                            checked={checked.education.has(
                                                ed.id
                                            )}
                                            onChange={v =>
                                                toggleId('education', ed.id, v)
                                            }
                                        />
                                    ))}
                                </CardContent>
                            </AdminCard>
                        )}

                        {sections.projects && (
                            <AdminCard>
                                <CardHeader className="border-b">
                                    <SectionTitleRow
                                        title="Projets"
                                        description="Les plus récents d'abord."
                                        onAll={() =>
                                            setMany(
                                                'projects',
                                                inventory.projects.map(
                                                    p => p.id
                                                ),
                                                true
                                            )
                                        }
                                        onNone={() =>
                                            setMany('projects', [], false)
                                        }
                                    />
                                </CardHeader>
                                <CardContent className="space-y-3 pt-6">
                                    {inventory.projects.map(p => (
                                        <div key={p.id} className="space-y-1.5">
                                            <CheckRow
                                                id={`pr-${p.id}`}
                                                label={p.name}
                                                meta={yearRange(p.start, p.end)}
                                                checked={checked.projects.has(
                                                    p.id
                                                )}
                                                onChange={v =>
                                                    toggleId(
                                                        'projects',
                                                        p.id,
                                                        v
                                                    )
                                                }
                                            />
                                            {checked.projects.has(p.id) && (
                                                <div className="ml-6 space-y-1.5">
                                                    <Input
                                                        value={
                                                            projectRole[p.id]?.[
                                                                labelLocale
                                                            ] ?? ''
                                                        }
                                                        onChange={e =>
                                                            setRole(
                                                                p.id,
                                                                labelLocale,
                                                                e.target.value
                                                            )
                                                        }
                                                        placeholder={`Rôle (${labelLocale.toUpperCase()}) — ex : Founder & lead developer`}
                                                        className="h-8 text-xs"
                                                    />
                                                    <MissionBullets
                                                        locale={labelLocale}
                                                        value={
                                                            projectBulletText[
                                                                p.id
                                                            ]?.[labelLocale] ??
                                                            ''
                                                        }
                                                        portfolioTasks={[]}
                                                        onChange={text =>
                                                            setProjectBullet(
                                                                p.id,
                                                                labelLocale,
                                                                text
                                                            )
                                                        }
                                                        onPrefill={() => {}}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </CardContent>
                            </AdminCard>
                        )}

                        {sections.contact && (
                            <AdminCard>
                                <CardHeader className="border-b">
                                    <SectionTitleRow
                                        title="Contacts"
                                        onAll={() =>
                                            setMany(
                                                'contacts',
                                                inventory.contacts.map(
                                                    c => c.id
                                                ),
                                                true
                                            )
                                        }
                                        onNone={() =>
                                            setMany('contacts', [], false)
                                        }
                                    />
                                </CardHeader>
                                <CardContent className="space-y-1.5 pt-6">
                                    {inventory.contacts.map(c => (
                                        <CheckRow
                                            key={c.id}
                                            id={`ct-${c.id}`}
                                            label={c.label}
                                            checked={checked.contacts.has(c.id)}
                                            onChange={v =>
                                                toggleId('contacts', c.id, v)
                                            }
                                        />
                                    ))}
                                </CardContent>
                            </AdminCard>
                        )}
                    </div>

                    {/* Header extras: phone + extra links (portfolio, relabelled
                        GitHub...) appended after the selected contacts. */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <ListSectionRow
                                title="En-tête"
                                description="Téléphone (rendu en lien tel:) et liens d'en-tête supplémentaires (ex: portfolio), après les contacts."
                                onAdd={addLink}
                                onClear={() => setExtraLinks([])}
                            />
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-1.5">
                                <Label htmlFor="cv-phone">Téléphone</Label>
                                <Input
                                    id="cv-phone"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="+33 6 12 34 56 78"
                                    className="max-w-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Liens supplémentaires</Label>
                                {extraLinks.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Aucun lien. « + Ajouter » pour en créer
                                        un.
                                    </p>
                                )}
                                {extraLinks.map((l, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2"
                                    >
                                        <Input
                                            value={l.label}
                                            onChange={e =>
                                                updateLink(i, {
                                                    label: e.target.value,
                                                })
                                            }
                                            placeholder="Libellé (ex: Ninhache.fr)"
                                            className="h-8 text-xs"
                                        />
                                        <Input
                                            value={l.url}
                                            onChange={e =>
                                                updateLink(i, {
                                                    url: e.target.value,
                                                })
                                            }
                                            placeholder="https://…"
                                            className="h-8 text-xs"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 shrink-0 px-2 text-xs text-destructive"
                                            onClick={() => removeLink(i)}
                                        >
                                            Retirer
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </AdminCard>

                    {/* Professional summary (per locale) — NOT the catchy
                        portfolio description; leave empty to omit the line. */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <CardTitle>Résumé professionnel</CardTitle>
                            <CardDescription>
                                Phrase d'accroche pro en haut du CV (≈ 1–2
                                lignes). Différent de la description du
                                portfolio. Laisse vide pour ne rien afficher.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-6 lg:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="summary-fr">Résumé (FR)</Label>
                                <Textarea
                                    id="summary-fr"
                                    rows={3}
                                    value={summary.fr}
                                    onChange={e =>
                                        setSummary(prev => ({
                                            ...prev,
                                            fr: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="summary-en">Résumé (EN)</Label>
                                <Textarea
                                    id="summary-en"
                                    rows={3}
                                    value={summary.en}
                                    onChange={e =>
                                        setSummary(prev => ({
                                            ...prev,
                                            en: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </AdminCard>

                    {/* Spoken languages (per locale) */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <CardTitle>Langues parlées</CardTitle>
                            <CardDescription>
                                Ligne « Spoken » des compétences (ex : French
                                (native), English (professional — TOEIC 900)).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 pt-6 lg:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="spoken-fr">Langues (FR)</Label>
                                <Input
                                    id="spoken-fr"
                                    value={spoken.fr}
                                    onChange={e =>
                                        setSpoken(prev => ({
                                            ...prev,
                                            fr: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="spoken-en">Langues (EN)</Label>
                                <Input
                                    id="spoken-en"
                                    value={spoken.en}
                                    onChange={e =>
                                        setSpoken(prev => ({
                                            ...prev,
                                            en: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </CardContent>
                    </AdminCard>

                    {/* Projects note (per locale) + optional clickable URL. */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <CardTitle>Note projets</CardTitle>
                            <CardDescription>
                                Ligne sous la section Projets (ex : « More
                                projects on github.com/… »). URL facultative
                                pour la rendre cliquable.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="pn-fr">Note (FR)</Label>
                                    <Input
                                        id="pn-fr"
                                        value={projectsNote.fr}
                                        onChange={e =>
                                            setProjectsNote(prev => ({
                                                ...prev,
                                                fr: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="pn-en">Note (EN)</Label>
                                    <Input
                                        id="pn-en"
                                        value={projectsNote.en}
                                        onChange={e =>
                                            setProjectsNote(prev => ({
                                                ...prev,
                                                en: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="pn-url">Lien (URL)</Label>
                                <Input
                                    id="pn-url"
                                    value={projectsNoteUrl}
                                    onChange={e =>
                                        setProjectsNoteUrl(e.target.value)
                                    }
                                    placeholder="https://github.com/…"
                                />
                            </div>
                        </CardContent>
                    </AdminCard>

                    {/* Leadership & Activities (operator-authored, e.g. ESN) */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <ListSectionRow
                                title="Engagements & Activités"
                                description="Ex : ESN. Org/dates communs aux 2 langues ; rôle/bullets dans la langue courante."
                                onAdd={addActivity}
                                onClear={() => setActivities([])}
                            />
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            {activities.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Aucune activité. « + Ajouter » pour en créer
                                    une.
                                </p>
                            )}
                            {activities.map((a, i) => (
                                <div
                                    key={i}
                                    className="space-y-2 rounded-md border p-3"
                                >
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <Input
                                            value={a.org}
                                            onChange={e =>
                                                updateActivity(i, {
                                                    org: e.target.value,
                                                })
                                            }
                                            placeholder="Organisation (ex : Erasmus Student Network)"
                                            className="h-8 text-xs"
                                        />
                                        <Input
                                            value={a.dates}
                                            onChange={e =>
                                                updateActivity(i, {
                                                    dates: e.target.value,
                                                })
                                            }
                                            placeholder="Dates (ex : Jan 2025 – Present)"
                                            className="h-8 text-xs"
                                        />
                                    </div>
                                    <Input
                                        value={a.role[labelLocale]}
                                        onChange={e =>
                                            updateActivity(i, {
                                                role: {
                                                    ...a.role,
                                                    [labelLocale]:
                                                        e.target.value,
                                                },
                                            })
                                        }
                                        placeholder={`Rôle (${labelLocale.toUpperCase()}) — ex : Member`}
                                        className="h-8 text-xs"
                                    />
                                    <Textarea
                                        rows={2}
                                        value={a.bullets[labelLocale]}
                                        onChange={e =>
                                            updateActivity(i, {
                                                bullets: {
                                                    ...a.bullets,
                                                    [labelLocale]:
                                                        e.target.value,
                                                },
                                            })
                                        }
                                        placeholder={`Bullets (${labelLocale.toUpperCase()}) — une ligne = un point`}
                                        className="text-xs"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-xs text-destructive"
                                            onClick={() => removeActivity(i)}
                                        >
                                            Retirer
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </AdminCard>

                    {/* References: a note ("available on request") and/or named
                        referents. */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <ListSectionRow
                                title="References"
                                description="Une note (ex: « available upon request ») et/ou des référents nommés (« + Ajouter »)."
                                onAdd={addReference}
                                onClear={() => setReferences([])}
                            />
                        </CardHeader>
                        <CardContent className="space-y-5 pt-6">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="rn-fr">Note (FR)</Label>
                                    <Textarea
                                        id="rn-fr"
                                        rows={2}
                                        value={referencesNote.fr}
                                        onChange={e =>
                                            setReferencesNote(prev => ({
                                                ...prev,
                                                fr: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="rn-en">Note (EN)</Label>
                                    <Textarea
                                        id="rn-en"
                                        rows={2}
                                        value={referencesNote.en}
                                        onChange={e =>
                                            setReferencesNote(prev => ({
                                                ...prev,
                                                en: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Référents nommés (optionnel)</Label>
                                {references.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Aucun référent. « + Ajouter » pour en
                                        créer un.
                                    </p>
                                )}
                                {references.map((r, i) => (
                                    <div
                                        key={i}
                                        className="space-y-2 rounded-md border p-3"
                                    >
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <Input
                                                value={r.name}
                                                onChange={e =>
                                                    updateReference(i, {
                                                        name: e.target.value,
                                                    })
                                                }
                                                placeholder="Nom"
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                value={r.title}
                                                onChange={e =>
                                                    updateReference(i, {
                                                        title: e.target.value,
                                                    })
                                                }
                                                placeholder="Titre (ex: Tuteur de stage)"
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                value={r.org}
                                                onChange={e =>
                                                    updateReference(i, {
                                                        org: e.target.value,
                                                    })
                                                }
                                                placeholder="Entreprise / institution"
                                                className="h-8 text-xs"
                                            />
                                            <Input
                                                value={r.contact}
                                                onChange={e =>
                                                    updateReference(i, {
                                                        contact: e.target.value,
                                                    })
                                                }
                                                placeholder="Contact (email…)"
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={r.url}
                                                onChange={e =>
                                                    updateReference(i, {
                                                        url: e.target.value,
                                                    })
                                                }
                                                placeholder="Lien (mailto:… ou https://…)"
                                                className="h-8 text-xs"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 shrink-0 px-2 text-xs text-destructive"
                                                onClick={() =>
                                                    removeReference(i)
                                                }
                                            >
                                                Retirer
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </AdminCard>

                    {/* Generate */}
                    <AdminCard>
                        <CardHeader className="border-b">
                            <CardTitle>Générer</CardTitle>
                            <CardDescription>
                                Choisis le template, la ou les langues, puis
                                génère.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="space-y-1.5">
                                    <Label>Template</Label>
                                    <Select
                                        value={template}
                                        onValueChange={setTemplate}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inventory.templates.map(t => (
                                                <SelectItem key={t} value={t}>
                                                    {t}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Langue(s)</Label>
                                    <Select
                                        value={genLocale}
                                        onValueChange={v =>
                                            setGenLocale(v as GenLocale)
                                        }
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="both">
                                                FR + EN
                                            </SelectItem>
                                            <SelectItem value="fr">
                                                Français
                                            </SelectItem>
                                            <SelectItem value="en">
                                                English
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <label className="flex items-center gap-2 pb-2">
                                    <Checkbox
                                        checked={publish}
                                        onCheckedChange={v =>
                                            setPublish(v === true)
                                        }
                                    />
                                    <span className="text-sm">
                                        Publier comme CV public
                                    </span>
                                </label>
                            </div>

                            <div className="flex items-center gap-2 border-t pt-4">
                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Génération...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Générer
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Save className="mr-2 h-4 w-4" />
                                    )}
                                    Enregistrer la sélection
                                </Button>
                            </div>
                        </CardContent>
                    </AdminCard>

                    {/* Results */}
                    {(result.fr || result.en) && (
                        <AdminCard>
                            <CardHeader className="border-b">
                                <CardTitle>Dernier CV généré</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
                                {(['fr', 'en'] as const).map(loc =>
                                    result[loc] ? (
                                        <GeneratedPreview
                                            key={loc}
                                            loc={loc}
                                            url={fullUrl(result[loc] as string)}
                                        />
                                    ) : null
                                )}
                            </CardContent>
                        </AdminCard>
                    )}
                </>
            )}
        </AdminPageShell>
    );
}

function SectionTitleRow({
    title,
    description,
    onAll,
    onNone,
}: {
    title: string;
    description?: string;
    onAll: () => void;
    onNone: () => void;
}) {
    return (
        <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
                <CardTitle>{title}</CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </div>
            <div className="flex shrink-0 gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onAll}
                >
                    Tout
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onNone}
                >
                    Aucun
                </Button>
            </div>
        </div>
    );
}

function ListSectionRow({
    title,
    description,
    onAdd,
    onClear,
}: {
    title: string;
    description?: string;
    onAdd: () => void;
    onClear: () => void;
}) {
    return (
        <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
                <CardTitle>{title}</CardTitle>
                {description && (
                    <CardDescription>{description}</CardDescription>
                )}
            </div>
            <div className="flex shrink-0 gap-1">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onAdd}
                >
                    + Ajouter
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={onClear}
                >
                    Tout retirer
                </Button>
            </div>
        </div>
    );
}

function CheckRow({
    id,
    label,
    meta,
    checked,
    onChange,
    bold,
    muted,
    disabled,
}: {
    id: string;
    label: string;
    meta?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    bold?: boolean;
    muted?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center gap-2">
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={v => onChange(v === true)}
            />
            <Label
                htmlFor={id}
                className={[
                    'flex flex-1 cursor-pointer items-center justify-between gap-2 text-sm',
                    bold ? 'font-semibold' : '',
                    muted ? 'text-muted-foreground' : '',
                    disabled ? 'opacity-50' : '',
                ].join(' ')}
            >
                <span>{label}</span>
                {meta && (
                    <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">
                        {meta}
                    </span>
                )}
            </Label>
        </div>
    );
}

function MissionBullets({
    locale,
    value,
    portfolioTasks,
    onChange,
    onPrefill,
}: {
    locale: Locale;
    value: string;
    portfolioTasks: string[];
    onChange: (text: string) => void;
    onPrefill: () => void;
}) {
    return (
        <div className="space-y-1 rounded-md border bg-muted/30 p-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                    Bullets CV ({locale.toUpperCase()}) — une ligne = un point
                </span>
                {portfolioTasks.length > 0 && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={onPrefill}
                    >
                        Pré-remplir
                    </Button>
                )}
            </div>
            <Textarea
                rows={3}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={
                    portfolioTasks.length
                        ? portfolioTasks.join('\n')
                        : 'Laisse vide pour utiliser les tâches du portfolio'
                }
                className="text-xs"
            />
        </div>
    );
}

function GeneratedPreview({ loc, url }: { loc: 'fr' | 'en'; url: string }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Badge variant="outline">{loc.toUpperCase()}</Badge>
                <Button variant="outline" size="sm" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Télécharger
                    </a>
                </Button>
            </div>
            <iframe
                title={`CV ${loc}`}
                src={url}
                className="h-[480px] w-full rounded-md border"
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {url.split('/').pop()}
            </p>
        </div>
    );
}
