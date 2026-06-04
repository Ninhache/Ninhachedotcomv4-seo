import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Revalidation endpoint called by the backend (content edits + hourly greeting
 * cron) to bust tagged caches. The only write surface the front exposes:
 * requires the shared secret, accepts only a string[] of tags, and does nothing
 * but call revalidateTag. The secret is never logged.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-revalidate-secret');
    if (!secret || secret !== process.env.REVALIDATE_SECRET) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 });
    }

    const tags = (body as { tags?: unknown }).tags;
    if (!Array.isArray(tags) || tags.some(t => typeof t !== 'string')) {
        return NextResponse.json(
            { error: 'tags must be string[]' },
            { status: 400 }
        );
    }

    // Next 16 requires a cache-life profile as the 2nd arg; 'max' is the
    // recommended value for an on-demand purge (see Next's own deprecation note).
    for (const tag of tags as string[]) revalidateTag(tag, 'max');
    return NextResponse.json({ revalidated: true, tags });
}
