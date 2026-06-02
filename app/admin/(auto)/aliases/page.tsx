'use client';

import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { AliasForm } from '@/components/aliases/alias-form';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AliasApi } from '@/lib/alias/alias.api';
import type { Alias } from '@/lib/types';

export default function AliasesPage() {
    const [items, setItems] = useState<Alias[]>([]);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<Alias | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const data = await AliasApi.findAll();
            setItems(data ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return items;
        return items.filter(a => a.key.toLowerCase().includes(needle));
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Aliases"
                description="Éditeur des alias résolus côté back. Le code n’est jamais exécuté ici."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length ? `${items.length} alias` : 'Aucun alias'}
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
                            <Plus className="mr-1 h-4 w-4" /> Nouvel alias
                        </Button>
                    </>
                }
            />

            <AdminToolbar>
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher une clé…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-backdrop-filter:bg-muted/40">
                                <TableRow>
                                    <TableHead>Clé</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Langues
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(it => (
                                    <TableRow
                                        key={it.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onDoubleClick={() => {
                                            setCurrent(it);
                                            setOpen(true);
                                        }}
                                    >
                                        <TableCell className="font-mono font-medium">
                                            {it.key}
                                        </TableCell>
                                        <TableCell className="hidden text-muted-foreground md:table-cell">
                                            {(it.bodies ?? [])
                                                .map(b =>
                                                    b.locale.toUpperCase()
                                                )
                                                .join(', ') || '—'}
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
                                                                Supprimer cet
                                                                alias ?
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
                                                                    await AliasApi.remove(
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
                                ))}

                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun résultat.
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={3}
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {current ? 'Éditer un alias' : 'Créer un alias'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                        <AliasForm
                            initial={current}
                            dialogOpen={open}
                            save={payload =>
                                current
                                    ? AliasApi.update(current.id, payload)
                                    : AliasApi.create(payload)
                            }
                            onCancel={() => setOpen(false)}
                            onSaved={() => {
                                setOpen(false);
                                load();
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </AdminPageShell>
    );
}
