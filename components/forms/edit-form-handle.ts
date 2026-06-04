// Imperative handle a modal edit-form exposes to its host dialog so the dialog
// can auto-save on close (outside-click / Esc / X). Cancel stays an explicit
// discard; a successful save closes via onSaved.
export type EditFormHandle = {
    /** Whether the form has unsaved changes. */
    isDirty: () => boolean;
    /** Validate + save (same as pressing the submit button). */
    submit: () => void;
};
