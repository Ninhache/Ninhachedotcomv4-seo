'use client';

import { useAutoSaveDialog } from '@/components/forms/use-auto-save-dialog';
import { MissionForm } from '@/components/missions/form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { MissionDTO } from '@/lib/types';

/**
 * Dialog wrapper around MissionForm, bundling the auto-save-on-outside-click
 * behaviour. `defaultEmployerCompanyId` / `defaultClientCompanyId` pre-fill +
 * lock the employer/client when a mission is created from a detail page.
 */
export function MissionFormDialog({
    open,
    setOpen,
    initial,
    defaultEmployerCompanyId,
    defaultClientCompanyId,
    onSaved,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
    initial?: MissionDTO | null;
    defaultEmployerCompanyId?: string;
    defaultClientCompanyId?: string;
    onSaved: () => void;
}) {
    const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();

    return (
        <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle>
                        {initial ? 'Éditer une mission' : 'Créer une mission'}
                    </DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto py-2 pr-1">
                    <MissionForm
                        initial={initial}
                        dialogOpen={open}
                        defaultEmployerCompanyId={defaultEmployerCompanyId}
                        defaultClientCompanyId={defaultClientCompanyId}
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
