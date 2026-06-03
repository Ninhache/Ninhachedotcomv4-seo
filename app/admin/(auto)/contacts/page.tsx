'use client';

import { Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminCard,
    AdminHeader,
    AdminPageShell,
    AdminToolbar,
} from '@/components/admin/page-shell';
import { ResourceSearchInput } from '@/components/admin/resource-search-input';
import { ContactForm } from '@/components/contacts/form';
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
import { ContactApi } from '@/lib/contact/contact.api';
import type { ContactDTO } from '@/lib/types';
import { assetUrl } from '@/lib/utils';

function getContactName(contact: ContactDTO, locale: string) {
    return (
        contact.nameByLocale?.[locale as keyof typeof contact.nameByLocale] ??
        contact.translations?.find(t => t.locale === locale)?.name ??
        contact.translations?.[0]?.name ??
        '—'
    );
}

export default function ContactsPage() {
    const [items, setItems] = useState<ContactDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [current, setCurrent] = useState<ContactDTO | null>(null);
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();
    const [visibilityPending, setVisibilityPending] = useState<string | null>(
        null
    );
    const [deleteTarget, setDeleteTarget] = useState<ContactDTO | null>(null);
    const [deleting, setDeleting] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const contacts = await ContactApi.findAll();
            setItems(contacts ?? []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return items ?? [];
        return (items ?? []).filter(
            contact =>
                Object.values(contact.nameByLocale ?? {}).some(name =>
                    (name ?? '').toLowerCase().includes(needle)
                ) ||
                contact.translations?.some(t =>
                    (t.name ?? '').toLowerCase().includes(needle)
                )
        );
    }, [items, q]);

    return (
        <AdminPageShell>
            <AdminHeader
                title="Contacts"
                description="Gère les liens de contact affichés sur le portfolio."
                meta={
                    <p className="text-xs text-muted-foreground">
                        {items.length
                            ? `${items.length} contacts`
                            : 'Aucun contact'}
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
                            <Plus className="mr-1 h-4 w-4" />
                            Nouveau contact
                        </Button>
                    </>
                }
            />

            <AdminToolbar className="gap-4">
                <ResourceSearchInput
                    value={q}
                    onChange={setQ}
                    placeholder="Rechercher un contact…"
                    className="w-full max-w-xs"
                />
            </AdminToolbar>

            <AdminCard>
                <CardContent className="p-0">
                    <div className="max-h-[70vh] overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-backdrop-filter:bg-muted/40">
                                <TableRow>
                                    <TableHead className="hidden md:table-cell">
                                        Image
                                    </TableHead>
                                    <TableHead>Nom</TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Contact URL
                                    </TableHead>
                                    <TableHead>Visible</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(contact => (
                                    <TableRow
                                        key={contact.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onDoubleClick={() => {
                                            setCurrent(contact);
                                            setOpen(true);
                                        }}
                                    >
                                        <TableCell className="hidden md:table-cell">
                                            {contact.imageUrl ? (
                                                <Image
                                                    src={assetUrl(
                                                        contact.imageUrl
                                                    )}
                                                    alt={getContactName(
                                                        contact,
                                                        'fr'
                                                    )}
                                                    width={32}
                                                    height={32}
                                                    className="h-8 w-8 rounded object-contain"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-muted" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {getContactName(contact, 'fr')}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {getContactName(contact, 'en')}
                                            </p>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <a
                                                href={contact.contactUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="truncate text-xs text-primary underline-offset-4 hover:underline"
                                                onClick={e =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                {contact.contactUrl}
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                aria-label="Basculer la visibilité"
                                                checked={contact.isVisible}
                                                disabled={
                                                    visibilityPending ===
                                                    contact.id
                                                }
                                                onCheckedChange={async next => {
                                                    setVisibilityPending(
                                                        contact.id
                                                    );
                                                    setItems(prev =>
                                                        prev.map(item =>
                                                            item.id ===
                                                            contact.id
                                                                ? {
                                                                      ...item,
                                                                      isVisible:
                                                                          next,
                                                                  }
                                                                : item
                                                        )
                                                    );
                                                    try {
                                                        await ContactApi.update(
                                                            contact.id,
                                                            { isVisible: next }
                                                        );
                                                    } catch {
                                                        setItems(prev =>
                                                            prev.map(item =>
                                                                item.id ===
                                                                contact.id
                                                                    ? {
                                                                          ...item,
                                                                          isVisible:
                                                                              !next,
                                                                      }
                                                                    : item
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
                                                    aria-label="Éditer"
                                                    onClick={() => {
                                                        setCurrent(contact);
                                                        setOpen(true);
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label="Supprimer"
                                                    onClick={() =>
                                                        setDeleteTarget(contact)
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {!loading && filtered.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="h-32 text-center text-muted-foreground"
                                        >
                                            Aucun contact correspondant.
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
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {current ? 'Éditer un contact' : 'Créer un contact'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <ContactForm
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

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={next => !next && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Supprimer ce contact ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget
                                ? `"${getContactName(deleteTarget, 'fr')}" sera définitivement supprimé.`
                                : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setDeleteTarget(null)}
                        >
                            Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                            disabled={deleting}
                            onClick={async () => {
                                if (!deleteTarget) return;
                                setDeleting(true);
                                try {
                                    await ContactApi.remove(deleteTarget.id);
                                    setDeleteTarget(null);
                                    load();
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPageShell>
    );
}
