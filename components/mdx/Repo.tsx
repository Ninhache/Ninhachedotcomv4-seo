import { ArrowUpRight, Github } from 'lucide-react';
import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';

/**
 * Extracts `owner/name` from a GitHub URL so the card can label itself without
 * the author repeating what the href already says. Returns null for anything
 * that is not a `github.com/<owner>/<repo>` URL (a user profile, a gist, a
 * malformed href), in which case the caller falls back to `title`/children.
 */
function repoSlug(url: string): string | null {
    const match =
        /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)/i.exec(url);
    if (!match) return null;
    return `${match[1]}/${match[2].replace(/\.git$/, '')}`;
}

/**
 * MDX `<Repo>` : a card-style link to a GitHub repository, the block-level
 * counterpart to the GitHub mark that `SmartAnchor` puts on inline links. Use it
 * when the repository *is* the point of the paragraph; a plain markdown link is
 * enough when it is only a reference.
 *
 * `url` is the full GitHub URL; `title` overrides the `owner/name` label derived
 * from it; `description` is an optional one-liner (children work too). Nothing
 * is fetched, at build time or at runtime: stars and descriptions would need the
 * GitHub API, which this project deliberately never calls.
 */
export function Repo({
    url,
    title,
    description,
    children,
}: {
    url: string;
    title?: string;
    description?: string;
    children?: ReactNode;
}) {
    const label = title ?? repoSlug(url) ?? url;
    const body = description ?? children;
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group not-prose my-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 no-underline transition-colors hover:border-primary/40"
        >
            <Github className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
                <span
                    className={`block truncate text-foreground text-lg leading-snug ${ralewaySemiBold.className}`}
                >
                    {label}
                </span>
                {body && (
                    <span className="mt-0.5 block text-muted-foreground text-sm">
                        {body}
                    </span>
                )}
            </span>
            <ArrowUpRight
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
            />
        </a>
    );
}
