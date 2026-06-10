'use client';

import { CompanyForm } from '@/components/companies/form';
import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { CompanyDTO, CompanyKind } from '@/lib/types';

/**
 * Dialog wrapper around CompanyForm, bundling the auto-save-on-outside-click
 * behaviour so each admin page doesn't repeat the Dialog + useAutoSaveDialog
 * boilerplate. `lockedKind` / `parentEmployerId` flow straight to the form so
 * the hierarchical admin can inject EMPLOYER/CLIENT + the owning employer.
 */
export function CompanyFormDialog({
    open,
    setOpen,
    initial,
    lockedKind,
    parentEmployerId,
    title,
    onSaved,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    initial?: CompanyDTO | null;
    lockedKind?: CompanyKind;
    parentEmployerId?: string;
    title?: string;
    onSaved: () => void;
}) {
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();

    const heading =
        title ?? (initial ? 'Éditer une entreprise' : 'Créer une entreprise');

    return (
        <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{heading}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                    <CompanyForm
                        initial={initial}
                        dialogOpen={open}
                        lockedKind={lockedKind}
                        parentEmployerId={parentEmployerId}
                        onRegister={register}
                        onCancel={() =>
                            closeWithoutSaving(() => setOpen(false))
                        }
                        onSaved={() => {
                            closeWithoutSaving(() => setOpen(false));
                            onSaved();
                        }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
