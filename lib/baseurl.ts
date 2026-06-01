// Backend (back-office) API base URL. Must be NEXT_PUBLIC_ prefixed because the
// admin axios clients run in the browser — without the prefix the value is
// stripped from the client bundle and silently falls back to localhost in prod.
// The legacy server-only name is kept as a fallback for existing setups.
export const baseUrl =
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ||
    process.env.NEXT_BACKOFFICE_URL ||
    'http://localhost:5000';
