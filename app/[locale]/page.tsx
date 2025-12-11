import { use } from 'react'
import About from '@/app/_components/about'
import Contact from '@/app/_components/contact'
import Experience from '@/app/_components/experience/experience'
import Footer from '@/app/_components/footer'
import Header from '@/app/_components/header/header'
import Home from '@/app/_components/home'
import Projects from '@/app/_components/project/projects'
import Skills from '@/app/_components/skills'
import { NextIntlClientProvider, useMessages } from 'next-intl'
import { unstable_setRequestLocale } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string }>
}

export default function Page(props: Props) {
  const params = use(props.params)

  const { locale } = params

  unstable_setRequestLocale(locale)

  const messages = useMessages()

  return (
    <main className="main">
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Header />
      </NextIntlClientProvider>

      <Home />

      <NextIntlClientProvider locale={locale} messages={messages}>
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
