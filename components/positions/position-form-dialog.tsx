'use client';

import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
import { PositionForm } from '@/components/positions/form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { PositionDTO } from '@/lib/types';

/**
 * Dialog wrapper around PositionForm, bundling the auto-save-on-outside-click
 * behaviour. `companyId` scopes the position to the employer it's created from.
 */
export function PositionFormDialog({
    open,
    setOpen,
    initial,
    companyId,
    onSaved,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    initial?: PositionDTO | null;
    companyId: string;
    onSaved: () => void;
}) {
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();

    return (
        <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>
                        {initial ? 'Éditer un poste' : 'Créer un poste'}
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                    <PositionForm
                        initial={initial}
                        companyId={companyId}
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
