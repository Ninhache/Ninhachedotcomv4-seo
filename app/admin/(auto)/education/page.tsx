// app/admin/(auto)/education/page.tsx
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
import { EducationForm } from '@/components/education/form';
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
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { EducationApi } from '@/lib/education/education.api';
import type { EducationDTO } from '@/lib/types';

export default function EducationPage() {
    const [items, setItems] = useState<EducationDTO[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<EducationDTO | null>(null);
    const [loading, setLoading] = useState(false);
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    const load = async () => {
        setLoading(true);
        try {
            const data = await EducationApi.findAll();
            setItems(data);
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
                (x.institutionName ?? '').toLowerCase().includes(needle) ||
                (x.translations ?? []).some(t =>
                    (t.degree ?? '').toLowerCase().includes(needle)
                )
        );
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Éducation"
                description="Gère les formations / diplômes du parcours."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} formation${items.length > 1 ? 's' : ''}`
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
                    placeholder="Rechercher un établissement ou un diplôme…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                                <TableRow>
                                    <TableHead>Établissement</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Diplôme (FR)
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Période
                                    </TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(it => {
                                    const frDegree =
                                        it.translations.find(
                                            t => t.locale === 'fr'
                                        )?.degree ?? '';
                                    const period =
                                        format(
                                            new Date(it.startDate),
                                            'MMM yyyy',
                                            { locale: fr }
                                        ) +
                                        ' — ' +
                                        (it.endDate
                                            ? format(
                                                  new Date(it.endDate),
                                                  'MMM yyyy',
                                                  { locale: fr }
                                              )
                                            : 'En cours');
                                    return (
                                        <TableRow
                                            key={it.id}
                                            onDoubleClick={() => {
                                                setCurrent(it);
                                                setOpen(true);
                                            }}
                                            className="cursor-pointer hover:bg-muted/50"
                                        >
                                            <TableCell className="truncate font-medium">
                                                {it.institutionName}
                                            </TableCell>
                                            <TableCell className="hidden truncate md:table-cell">
                                                {frDegree}
                                            </TableCell>
                                            <TableCell className="hidden whitespace-nowrap md:table-cell">
                                                {period}
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
                                                            await EducationApi.patchVisibility(
                                                                it.id,
                                                                next
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
                                                                    formation ?
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
                                                                        await EducationApi.remove(
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
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun résultat.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
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
                                ? 'Éditer une formation'
                                : 'Créer une formation'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                        <EducationForm
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
