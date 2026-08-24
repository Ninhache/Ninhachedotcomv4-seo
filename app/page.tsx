import { redirect } from 'next/navigation';

// Unprefixed-root fallback. next-intl's middleware (`proxy.ts`, whose matcher
// includes '/') normally redirects before this renders; this covers the paths
// the middleware does not run on, so `/` never 404s.
export default function RootPage() {
    redirect('/fr');
}
