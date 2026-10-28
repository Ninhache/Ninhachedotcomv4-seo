/**
 * Window events tying the scattered fun bits together: a footer button, a
 * terminal command or a hotkey asks; `FunLayer` answers.
 */
export const OPEN_TERMINAL_EVENT = 'ninhache:terminal-open';

export function openTerminal(): void {
    window.dispatchEvent(new Event(OPEN_TERMINAL_EVENT));
}

/** True when the keystroke belongs to a field and must not trigger anything. */
export function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
    );
}

export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
