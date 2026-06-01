import { existsSync } from 'fs';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import path from 'path';
import { defaultLocale } from '@/config';

type Props = {
    params: Promise<{ locale: string }>;
};

const resumeFileFor = (locale: string) =>
    `CV_ALMEIDA_Neo_${locale.toUpperCase()}-web.pdf`;

export default async function Page(props: Props) {
    const { locale } = await props.params;

    setRequestLocale(locale);

    // Resumes are static assets in /public/documents. Serve the locale-specific
    // file when it exists, otherwise fall back to the default locale's resume.
    const requested = resumeFileFor(locale);
    const requestedExists = existsSync(
        path.join(process.cwd(), 'public', 'documents', requested)
    );
    const file = requestedExists ? requested : resumeFileFor(defaultLocale);

    // redirect() throws internally — must be called outside any try/catch so the
    // NEXT_REDIRECT signal is not swallowed.
    redirect(`/documents/${file}`);
}
