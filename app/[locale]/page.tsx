import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
    getMessages,
    getTranslations,
    setRequestLocale,
} from 'next-intl/server';
import About from '@/app/_components/about';
import Contact from '@/app/_components/contact';
import Experience from '@/app/_components/experience/experience';
import Footer from '@/app/_components/footer';
import Header from '@/app/_components/header/header';
import Home from '@/app/_components/home';
import Projects from '@/app/_components/project/projects';
import { JsonLd } from '@/app/_components/seo/JsonLd';
import Skills from '@/app/_components/skills';
import { Locale } from '@/config';
import {
    mapContact,
    mapProject,
    mapSkillCategory,
    mapTimelineToEmployers,
} from '@/lib/mappers';
import {
    getContacts,
    getProfile,
    getProjects,
    getResume,
    getSkillCategories,
    getTimeline,
} from '@/lib/portfolio';
import { resolveResumeUrl } from '@/lib/resume/resolve-url';
import {
    graph,
    profileIdentity,
    profilePageJsonLd,
    projectListJsonLd,
} from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { ogImagePath } from '@/lib/seo/og';

export const revalidate = 3600;

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale } = await props.params;
    const loc = locale as Locale;
    const profile = await getProfile();
    const { name, jobTitle, description } = profileIdentity(profile, loc);

    return pageMetadata({
        locale: loc,
        title: `${name} · ${jobTitle}`,
        // The home page title already carries the full name; suffixing it would
        // read as "Néo Almeida · … · Néo Almeida".
        absoluteTitle: true,
        description,
        type: 'profile',
        image: ogImagePath('home', loc),
    });
}

export default async function Page(props: Props) {
    const { locale } = await props.params;

    setRequestLocale(locale);

    const messages = await getMessages();
    const tJobs = await getTranslations('jobs');

    const [
        rawProjects,
        rawTimeline,
        rawCategories,
        rawContacts,
        profile,
        resume,
    ] = await Promise.all([
        getProjects(),
        getTimeline(),
        getSkillCategories(),
        getContacts(),
        getProfile().catch(() => null),
        getResume(),
    ]);

    // Locale-specific CV uploaded via the admin; null when none exists, in
    // which case <About> falls back to its static /public/documents PDF.
    const resumeUrl = resolveResumeUrl(resume, locale);

    const projects = rawProjects
        .filter(p => p.isVisible)
        .map(p => mapProject(p, locale as Locale));
    const employerTimeline = mapTimelineToEmployers(
        rawTimeline,
        locale as Locale,
        tJobs('present')
    );
    const skillCategories = [...rawCategories]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map(c => mapSkillCategory(c));
    const profileTrans = profile?.translations.find(t => t.locale === locale);
    const contacts = rawContacts
        .filter(c => c.isVisible)
        .map(c => mapContact(c, locale as Locale));

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <main className="main">
                {/* Only describes what this page actually renders: the profile
                    it is about, and the project list visible below. */}
                <JsonLd
                    data={graph([
                        profilePageJsonLd(profile, locale as Locale),
                        projectListJsonLd(
                            rawProjects.filter(p => p.isVisible),
                            locale as Locale
                        ),
                    ])}
                />
                <Header />
                <Home profile={profile} locale={locale} />
                <About profile={profile} resumeUrl={resumeUrl} />
                <Projects data={projects} />
                <Skills data={skillCategories} />
                <Experience data={employerTimeline} />
                <Contact data={contacts} />
                <Footer />
            </main>
        </NextIntlClientProvider>
    );
}
