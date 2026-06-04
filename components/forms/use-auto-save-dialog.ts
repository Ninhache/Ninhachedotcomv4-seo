'use client';

import { useRef } from 'react';
import type { EditFormHandle } from './edit-form-handle';

/**
 * Wiring for an edit dialog that auto-saves on close.
 *
 * - Outside-click / Esc / X with unsaved changes → submit the form (valid saves
 *   & closes via onSaved; invalid keeps the dialog open).
 * - No changes → just close.
 * - Save success and Cancel close via `closeWithoutSaving` so they don't
 *   re-trigger a save.
 *
 * Usage:
 *   const { register, onOpenChange, closeWithoutSaving } = useAutoSaveDialog();
 *   <Dialog open={open} onOpenChange={onOpenChange(setOpen)}>
 *     <Form
 *       onRegister={register}
 *       onCancel={() => closeWithoutSaving(() => setOpen(false))}
 *       onSaved={() => { closeWithoutSaving(() => setOpen(false)); load(); }} />
 */
export function useAutoSaveDialog() {
    const handle = useRef<EditFormHandle | null>(null);
    const skipAutoSave = useRef(false);

    const register = (h: EditFormHandle) => {
        handle.current = h;
    };

    const closeWithoutSaving = (close: () => void) => {
        skipAutoSave.current = true;
        close();
    };

    const onOpenChange = (setOpen: (v: boolean) => void) => (next: boolean) => {
        if (next) {
            setOpen(true);
            return;
        }
        if (skipAutoSave.current) {
            skipAutoSave.current = false;
            setOpen(false);
            return;
        }
        if (handle.current?.isDirty()) {
            handle.current.submit();
        } else {
            setOpen(false);
        }
    };

    return { register, onOpenChange, closeWithoutSaving };
}
