import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
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
    mapExperience,
    mapProject,
    mapSkillCategory,
} from '@/lib/mappers';
import {
    getContacts,
    getExperiences,
    getProfile,
    getProjects,
    getSkillCategories,
} from '@/lib/portfolio';

export const revalidate = 3600;

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function Page(props: Props) {
    const { locale } = await props.params;

    setRequestLocale(locale);

    const messages = await getMessages();

    const [rawProjects, rawExperiences, rawCategories, rawContacts, profile] =
        await Promise.all([
            getProjects(),
            getExperiences(),
            getSkillCategories(),
            getContacts(),
            getProfile().catch(() => null),
        ]);

    const projects = rawProjects
        .filter(p => p.isVisible)
        .map(p => mapProject(p));
    const experiences = rawExperiences
        .filter(e => e.isVisible)
        .map(e => mapExperience(e));
    const skillCategories = rawCategories.map(c => mapSkillCategory(c));
    const profileTrans = profile?.translations.find(t => t.locale === locale);
    const contacts = rawContacts
        .filter(c => c.isVisible)
        .map(c => mapContact(c, locale as Locale));

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <main className="main">
                <Header />
                <Home profile={profile} locale={locale} />
                <About />
                <Projects data={projects} />
                <Skills data={skillCategories} />
                <Experience data={experiences} />
                <Contact data={contacts} />
                <Footer />
            </main>
        </NextIntlClientProvider>
    );
}
