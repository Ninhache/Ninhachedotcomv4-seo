import { existsSync } from 'fs';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import path from 'path';
import { defaultLocale } from '@/config';
import { getResume } from '@/lib/portfolio';
import { resolveResumeUrl } from '@/lib/resume/resolve-url';

type Props = {
    params: Promise<{ locale: string }>;
};

const resumeFileFor = (locale: string) =>
    `CV_ALMEIDA_Neo_${locale.toUpperCase()}-web.pdf`;

export default async function Page(props: Props) {
    const { locale } = await props.params;

    setRequestLocale(locale);

    // Prefer the CV uploaded via the admin (locale-specific, served by the back).
    // getResume() swallows backend errors and returns null, so this stays safe.
    const resumeUrl = resolveResumeUrl(await getResume(), locale);

    // redirect() throws internally — keep every call outside any try/catch so the
    // NEXT_REDIRECT signal is not swallowed.
    if (resumeUrl) redirect(resumeUrl);

    // Fallback: static asset in /public/documents. Serve the locale-specific file
    // when it exists, otherwise the default locale's resume.
    const requested = resumeFileFor(locale);
    const requestedExists = existsSync(
        path.join(process.cwd(), 'public', 'documents', requested)
    );
    const file = requestedExists ? requested : resumeFileFor(defaultLocale);

    redirect(`/documents/${file}`);
}
