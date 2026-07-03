'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { MissionApi } from '@/lib/mission/mission.api';
import type { MissionDTO } from '@/lib/types';

/**
 * Presentational mission table shared by the flat missions list and the
 * employer/client detail pages. Owns the row-level delete + visibility API
 * calls; the parent supplies `onVisibilityMutate` (optimistic state update),
 * `onDeleted` (reload), and `onEdit`. The employer/client columns are optional
 * (hidden on the detail pages where that dimension is already in the URL).
 */
export function MissionsTable({
    items,
    loading,
    companyMap,
    showEmployer = false,
    showClient = false,
    onEdit,
    onDeleted,
    onVisibilityMutate,
    emptyLabel = 'Aucun résultat.',
}: {
    items: MissionDTO[];
    loading: boolean;
    companyMap?: Map<string, string>;
    showEmployer?: boolean;
    showClient?: boolean;
    onEdit: (m: MissionDTO) => void;
    onDeleted: () => void;
    onVisibilityMutate: (id: string, next: boolean) => void;
    emptyLabel?: string;
}) {
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    // Titre + (optional) Employeur + (optional) Client + Période + Visible + Actions
    const colSpan = 3 + (showEmployer ? 1 : 0) + (showClient ? 1 : 0);

    const nameOf = (id: string) => companyMap?.get(id) ?? id;

    const toggleVisibility = async (m: MissionDTO, next: boolean) => {
        setVisibilityPending(m.id);
        onVisibilityMutate(m.id, next);
        try {
            await MissionApi.patchVisibility(m.id, next);
        } catch {
            onVisibilityMutate(m.id, !next); // revert
        } finally {
            setVisibilityPending(null);
        }
    };

    return (
        <div className="max-h-[70vh] overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                    <TableRow>
                        <TableHead>Titre (FR)</TableHead>
                        {showEmployer && <TableHead>Employeur</TableHead>}
                        {showClient && (
                            <TableHead className="hidden md:table-cell">
                                Client
                            </TableHead>
                        )}
                        <TableHead className="hidden md:table-cell">
                            Période
                        </TableHead>
                        <TableHead>Visible</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(it => {
                        const frTitle =
                            it.translations.find(t => t.locale === 'fr')
                                ?.title ?? '';
                        const periodStart = format(
                            new Date(it.startDate),
                            'MMM yyyy',
                            { locale: fr }
                        );
                        const periodEnd = it.endDate
                            ? format(new Date(it.endDate), 'MMM yyyy', {
                                  locale: fr,
                              })
                            : 'En cours';
                        return (
                            <TableRow
                                key={it.id}
                                onDoubleClick={() => onEdit(it)}
                                className="cursor-pointer hover:bg-muted/50"
                            >
                                <TableCell className="truncate font-medium">
                                    {frTitle}
                                </TableCell>
                                {showEmployer && (
                                    <TableCell className="truncate">
                                        {nameOf(it.employerCompanyId)}
                                    </TableCell>
                                )}
                                {showClient && (
                                    <TableCell className="hidden truncate md:table-cell">
                                        {it.clientCompanyId
                                            ? nameOf(it.clientCompanyId)
                                            : '—'}
                                    </TableCell>
                                )}
                                <TableCell className="hidden whitespace-nowrap md:table-cell">
                                    {periodStart} — {periodEnd}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        aria-label="Basculer la visibilité"
                                        checked={it.isVisible}
                                        disabled={visibilityPending === it.id}
                                        onCheckedChange={next =>
                                            toggleVisibility(it, next)
                                        }
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="inline-flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit(it)}
                                            aria-label="Éditer"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
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
                                                        Supprimer cette mission
                                                        ?
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Cette action est
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
                                                            await MissionApi.remove(
                                                                it.id
                                                            );
                                                            onDeleted();
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

                    {!loading && items.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={colSpan}
                                className="h-32 text-center text-muted-foreground"
                            >
                                {emptyLabel}
                            </TableCell>
                        </TableRow>
                    )}

                    {loading && (
                        <TableRow>
                            <TableCell
                                colSpan={colSpan}
                                className="h-32 text-center text-muted-foreground"
                            >
                                Chargement…
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
