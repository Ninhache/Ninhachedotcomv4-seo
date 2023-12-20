import Projects from '@/components/projects'
import About from '@/components/about'
import Contact from '@/components/contact'
import Experience from '@/components/experience'
import Footer from '@/components/footer'
import Header from '@/components/header/header'
import Home from '@/components/home'
import Skills from '@/components/skills'
import HeaderMobile from '@/components/header/headerMobile'

// import styles from '@/styles/page.module.css'

export default function Page() {
  return (
    <main className='main'>
      <Header />
      {/* <HeaderMobile /> */}

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
