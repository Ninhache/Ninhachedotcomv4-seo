import Projects from '@/app/_components/project/projects'
import About from '@/app/_components/about'
import Contact from '@/app/_components/contact'
import Experience from '@/app/_components/experience/experience'
import Footer from '@/app/_components/footer'
import Header from '@/app/_components/header/header'
import Home from '@/app/_components/home'
import Skills from '@/app/_components/skills'
import { Locale } from '@/i18nconfig'

export default async function Page({ params: { locale }}: {params: { locale: Locale }}) {
  return (
    <main className='main'>
      <Header />

      <Home />

      <About />
      <Projects />
      <Skills />
      <Experience />
      <Contact />
      <Footer />
    </main>
  )
}
