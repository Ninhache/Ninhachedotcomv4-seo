// src/app/admin/experiences/page.tsx
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { ExperienceForm } from '@/components/experiences/form';
import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ExperienceApi } from '@/lib/experience/experience.api';
import type { ExperienceDTO } from '@/lib/types';

export default function ExperiencesPage() {
    const [items, setItems] = useState<ExperienceDTO[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<ExperienceDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    const load = async () => {
        setLoading(true);
        try {
            const items = await ExperienceApi.findAll();
            setItems(items);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const src = items ?? [];
        if (!q) return src;
        const needle = q.toLowerCase();
        return src.filter(
            x =>
                (x.companyName ?? '').toLowerCase().includes(needle) ||
                (x.translations ?? []).some(t =>
                    (t.jobTitle ?? '').toLowerCase().includes(needle)
                )
        );
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Experiences"
                description="Gère les expériences affichées sur le CV interactif."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} expériences`
                            : 'Aucune donnée'}
                    </p>
                }
                actions={
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => load()}
                            disabled={loading}
                        >
                            <RefreshCcw className="mr-1 h-4 w-4" />
                            Actualiser
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setCurrent(null);
                                setOpen(true);
                            }}
                        >
                            <Plus className="mr-1 h-4 w-4" /> Nouvelle
                        </Button>
                    </>
                }
            />

            <AdminToolbar>
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher une entreprise ou un titre…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                                <TableRow>
                                    <TableHead>Entreprise</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Titre (FR)
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Période
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Contrat
                                    </TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(it => {
                                    const frTitle =
                                        it.translations.find(
                                            t => t.locale === 'fr'
                                        )?.jobTitle ?? '';
                                    return (
                                        <TableRow
                                            onDoubleClick={() => {
                                                setCurrent(it);
                                                setOpen(true);
                                            }}
                                            className="cursor-pointer hover:bg-muted/50"
                                            key={it.id}
                                        >
                                            <TableCell className="truncate font-medium">
                                                {it.companyName}
                                            </TableCell>
                                            <TableCell className="hidden truncate md:table-cell">
                                                {frTitle}
                                            </TableCell>
                                            <TableCell className="hidden whitespace-nowrap md:table-cell">
                                                {format(
                                                    new Date(it.startDate),
                                                    'MMM yyyy',
                                                    {
                                                        locale: fr,
                                                    }
                                                )}{' '}
                                                —{' '}
                                                {format(
                                                    new Date(it.endDate),
                                                    'MMM yyyy',
                                                    { locale: fr }
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {it.contractType}
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    aria-label="Basculer la visibilité"
                                                    checked={it.isVisible}
                                                    disabled={
                                                        visibilityPending ===
                                                        it.id
                                                    }
                                                    onCheckedChange={async next => {
                                                        setVisibilityPending(
                                                            it.id
                                                        );
                                                        setItems(prev =>
                                                            prev.map(x =>
                                                                x.id === it.id
                                                                    ? {
                                                                          ...x,
                                                                          isVisible:
                                                                              next,
                                                                      }
                                                                    : x
                                                            )
                                                        );
                                                        try {
                                                            // The backend UpdateExperienceDto is not partial — it
                                                            // requires the full set of fields. Rebuild a whitelist-safe
                                                            // payload from the row and flip only isVisible.
                                                            await ExperienceApi.update(
                                                                it.id,
                                                                {
                                                                    startDate:
                                                                        it.startDate,
                                                                    endDate:
                                                                        it.endDate,
                                                                    contractType:
                                                                        it.contractType,
                                                                    localisation:
                                                                        it.localisation,
                                                                    companyName:
                                                                        it.companyName,
                                                                    isVisible:
                                                                        next,
                                                                    tagIds:
                                                                        it.tagIds ??
                                                                        (
                                                                            it.tags ??
                                                                            []
                                                                        ).map(
                                                                            t =>
                                                                                t.id
                                                                        ),
                                                                    translations:
                                                                        it.translations.map(
                                                                            t => ({
                                                                                locale: t.locale,
                                                                                jobTitle:
                                                                                    t.jobTitle,
                                                                                description:
                                                                                    t.description,
                                                                            })
                                                                        ),
                                                                    ...(it.siteUrl
                                                                        ? {
                                                                              siteUrl:
                                                                                  it.siteUrl,
                                                                          }
                                                                        : {}),
                                                                    ...(it.imageUrl
                                                                        ? {
                                                                              imageUrl:
                                                                                  it.imageUrl,
                                                                          }
                                                                        : {}),
                                                                    ...(typeof it.order ===
                                                                    'number'
                                                                        ? {
                                                                              order: it.order,
                                                                          }
                                                                        : {}),
                                                                }
                                                            );
                                                        } catch {
                                                            setItems(prev =>
                                                                prev.map(x =>
                                                                    x.id ===
                                                                    it.id
                                                                        ? {
                                                                              ...x,
                                                                              isVisible:
                                                                                  !next,
                                                                          }
                                                                        : x
                                                                )
                                                            );
                                                        } finally {
                                                            setVisibilityPending(
                                                                null
                                                            );
                                                        }
                                                    }}
                                                />
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setCurrent(it);
                                                            setOpen(true);
                                                        }}
                                                        aria-label="Éditer"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger
                                                            asChild
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                aria-label="Supprimer"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>
                                                                    Supprimer
                                                                    cette
                                                                    expérience ?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Cette action
                                                                    est
                                                                    irréversible.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>
                                                                    Annuler
                                                                </AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                                                                    onClick={async () => {
                                                                        await ExperienceApi.remove(
                                                                            it.id
                                                                        );
                                                                        load();
                                                                    }}
                                                                >
                                                                    Supprimer
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun résultat.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Chargement…
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </AdminCard>

            <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>
                            {current
                                ? 'Éditer une expérience'
                                : 'Créer une expérience'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                        <ExperienceForm
                            initial={current}
                            dialogOpen={open}
                            onRegister={register}
                            onCancel={() =>
                                closeWithoutSaving(() => setOpen(false))
                            }
                            onSaved={() => {
                                closeWithoutSaving(() => setOpen(false));
                                load();
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </AdminPageShell>
    );
}
