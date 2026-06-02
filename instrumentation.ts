/**
 * Runs once when the Next.js server boots (Next calls `register()` at startup).
 * Fails fast if REVALIDATE_SECRET is missing, so the /api/revalidate endpoint is
 * never served unprotected. Scoped to the Node.js runtime so it doesn't trip the
 * edge runtime or the build phase.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    if (!process.env.REVALIDATE_SECRET) {
        throw new Error(
            'REVALIDATE_SECRET is not set. /api/revalidate would be unprotected. ' +
                'Set REVALIDATE_SECRET (identical to the backend value) in the environment.'
        );
    }
}
