import Projects from '@/app/_components/project/projects'
import About from '@/app/_components/about'
import Contact from '@/app/_components/contact'
import Experience from '@/app/_components/experience/experience'
import Footer from '@/app/_components/footer'
import Header from '@/app/_components/header/header'
import Home from '@/app/_components/home'
import Skills from '@/app/_components/skills'
import { Locale } from '@/config'
import { NextIntlClientProvider, useMessages, useTranslations } from 'next-intl'

type Props = {
  params: { locale: string };
};

export default function Page({ params: { locale } }: Props) {

  const messages = useMessages();

  return (
    <main className='main'>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Header />
      </NextIntlClientProvider>

      <Home />
      
      <NextIntlClientProvider
        locale={locale} messages={messages}
      >
        <About />
        <Projects />
        <Skills />
      </NextIntlClientProvider>

      <Experience />
      <Contact />
      <Footer />
    </main>
  )
}
