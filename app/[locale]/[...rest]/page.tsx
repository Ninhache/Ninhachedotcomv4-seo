import { notFound } from 'next/navigation';

/**
 * Catches every unknown localized path so it lands on `[locale]/not-found`
 * (the game) instead of the root 404, which only knows French.
 */
export default function CatchAll() {
    notFound();
}
