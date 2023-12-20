"use client"

import Linkedin from "@/public/svg/contact/Linkedin.svg"
import Github from "@/public/svg/contact/Github.svg"
import Mail from "@/public/svg/contact/Mail.svg"

import styles from '@/styles/contact.module.css'
import { proximaNovaBold } from "@/app/fonts"

export default function Contact() {
    return (
        <>
        <a id="contact"></a>
        <section className={`section ${styles.contact_section} ${proximaNovaBold.className}`} id="">
            <div className={`content leaning ${styles.content}`}>
                <span className={`section_title`}>How to contact me?</span>
                <div className={styles.contact_content}>
                    <div className={styles.social_line}>
                        <a className={styles.social_link} href="https://www.linkedin.com/in/n%C3%A9o-almeida/" target="_blank">
                            <img src="svg/contact/Linkedin.svg"/>

                            <div className={styles.social_text}>
                                <span>in/néo-almeida</span>
                            </div>
                        </a>
                    </div>
                    <div className={styles.social_line}>
                        <a className={styles.social_link} href="https://github.com/ninhache" target="_blank">
                            <img src="svg/contact/Github.svg"/>
                            <div className={styles.social_text}>
                                <span>Ninhache</span>
                            </div>
                        </a>
                        <div className={styles.social_link}>
                            <a href="mailto: neo.almeida2706@gmail.com" target="_blank">
                                <img src="svg/contact/Mail.svg"/>
                            </a>
                            <div className={styles.social_text}>
                                <span>neo.almeida2706@gmail.com</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        </>
    )
}
