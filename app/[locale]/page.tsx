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
    getSkillCategories,
    getTimeline,
} from '@/lib/portfolio';

export const revalidate = 3600;

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function Page(props: Props) {
    const { locale } = await props.params;

    setRequestLocale(locale);

    const messages = await getMessages();
    const tJobs = await getTranslations('jobs');

    const [rawProjects, rawTimeline, rawCategories, rawContacts, profile] =
        await Promise.all([
            getProjects(),
            getTimeline(),
            getSkillCategories(),
            getContacts(),
            getProfile().catch(() => null),
        ]);

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
                <Header />
                <Home profile={profile} locale={locale} />
                <About profile={profile} />
                <Projects data={projects} />
                <Skills data={skillCategories} />
                <Experience data={employerTimeline} />
                <Contact data={contacts} />
                <Footer />
            </main>
        </NextIntlClientProvider>
    );
}
