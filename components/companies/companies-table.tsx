'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
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
import { CompanyApi } from '@/lib/company/company.api';
import type { CompanyDTO } from '@/lib/types';

/** Compact EMPLOYER/CLIENT badge. */
function KindBadge({ kind }: { kind: CompanyDTO['kind'] }) {
    const label = kind === 'EMPLOYER' ? 'Employeur' : 'Client';
    const cls =
        kind === 'EMPLOYER'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    return (
        <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}
        >
            {label}
        </span>
    );
}

/**
 * Presentational company table shared by the employers list and an employer's
 * clients list. Owns the row-level delete + visibility API calls; the parent
 * supplies `onVisibilityMutate` (optimistic state update) and `onDeleted`
 * (reload), and `onEdit` (open the edit dialog).
 */
export function CompaniesTable({
    items,
    loading,
    showKind = false,
    showContract = false,
    rowHref,
    onEdit,
    onDeleted,
    onVisibilityMutate,
    emptyLabel = 'Aucun résultat.',
}: {
    items: CompanyDTO[];
    loading: boolean;
    showKind?: boolean;
    showContract?: boolean;
    rowHref?: (c: CompanyDTO) => string;
    onEdit: (c: CompanyDTO) => void;
    onDeleted: () => void;
    onVisibilityMutate: (id: string, next: boolean) => void;
    emptyLabel?: string;
}) {
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );

    // Localisation + (optional) Type + (optional) Contrat + Nom + Visible + Actions
    const colSpan = 3 + (showKind ? 1 : 0) + (showContract ? 1 : 0);

    const toggleVisibility = async (c: CompanyDTO, next: boolean) => {
        setVisibilityPending(c.id);
        onVisibilityMutate(c.id, next);
        try {
            await CompanyApi.patchVisibility(c.id, next);
        } catch {
            onVisibilityMutate(c.id, !next); // revert
        } finally {
            setVisibilityPending(null);
        }
    };

    return (
        <div className="max-h-[70vh] overflow-auto">
            <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                    <TableRow>
                        <TableHead>Nom</TableHead>
                        {showKind && <TableHead>Type</TableHead>}
                        <TableHead className="hidden md:table-cell">
                            Localisation
                        </TableHead>
                        {showContract && (
                            <TableHead className="hidden md:table-cell">
                                Contrat
                            </TableHead>
                        )}
                        <TableHead>Visible</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map(it => (
                        <TableRow
                            key={it.id}
                            onDoubleClick={() => onEdit(it)}
                            className="cursor-pointer hover:bg-muted/50"
                        >
                            <TableCell className="truncate font-medium">
                                {rowHref ? (
                                    <Link
                                        href={rowHref(it)}
                                        className="hover:underline"
                                    >
                                        {it.name}
                                    </Link>
                                ) : (
                                    it.name
                                )}
                            </TableCell>
                            {showKind && (
                                <TableCell>
                                    <KindBadge kind={it.kind} />
                                </TableCell>
                            )}
                            <TableCell className="hidden truncate md:table-cell">
                                {it.localisation ?? '—'}
                            </TableCell>
                            {showContract && (
                                <TableCell className="hidden md:table-cell">
                                    {it.contractType ?? '—'}
                                </TableCell>
                            )}
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
                                                    Supprimer cette entreprise ?
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
                                                        await CompanyApi.remove(
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
                    ))}

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
