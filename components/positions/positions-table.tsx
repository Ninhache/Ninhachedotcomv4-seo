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
import { PositionApi } from '@/lib/position/position.api';
import type { PositionDTO } from '@/lib/types';

/**
 * Presentational table for an employer's job-title progression. Rows are shown
 * in the order the parent supplies (chronological). Owns the row-level delete +
 * visibility API calls; the parent supplies `onVisibilityMutate` (optimistic
 * update), `onDeleted` (reload), and `onEdit`.
 */
export function PositionsTable({
    items,
    loading,
    onEdit,
    onDeleted,
    onVisibilityMutate,
    emptyLabel = 'Aucun poste.',
}: {
    items: PositionDTO[];
    loading: boolean;
    onEdit: (p: PositionDTO) => void;
    onDeleted: () => void;
    onVisibilityMutate: (id: string, next: boolean) => void;
    emptyLabel?: string;
}) {
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    // Titre + Période + Visible + Actions
    const colSpan = 4;

    const toggleVisibility = async (p: PositionDTO, next: boolean) => {
        setVisibilityPending(p.id);
        onVisibilityMutate(p.id, next);
        try {
            await PositionApi.patchVisibility(p.id, next);
        } catch {
            onVisibilityMutate(p.id, !next); // revert
        } finally {
            setVisibilityPending(null);
        }
    };

    return (
        <div className="max-h-[70vh] overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                    <TableRow>
                        <TableHead>Intitulé (FR)</TableHead>
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
                            : 'Actuel';
                        return (
                            <TableRow
                                key={it.id}
                                onDoubleClick={() => onEdit(it)}
                                className="cursor-pointer hover:bg-muted/50"
                            >
                                <TableCell className="truncate font-medium">
                                    {frTitle}
                                </TableCell>
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
                                                        Supprimer ce poste ?
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
                                                            await PositionApi.remove(
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
