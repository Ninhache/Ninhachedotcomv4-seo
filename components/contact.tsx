"use client"

// import Linkedin from "@/public/svg/contact/Linkedin.svg"
// import Github from "@/public/svg/contact/Github.svg"
// import Mail from "@/public/svg/contact/Mail.svg"

import styles from '@/styles/contact.module.css'
import { proximaNovaBold } from "@/app/fonts"

interface socialProps {
    text: string;
    imageUrl: string;
    redirectLink: string;
    cssSize: string; // This could probably be improved
}

export default function Contact() {

    const socialArray: socialProps[] = [
        {
            text: "in/néo-almeida",
            imageUrl: "svg/contact/Linkedin.svg",
            redirectLink: "https://www.linkedin.com/in/n%C3%A9o-almeida/",
            cssSize: "135px"
        },
        {
            text: "Ninhache",
            imageUrl: "svg/contact/GitHub.svg",
            redirectLink: "https://github.com/ninhache",
            cssSize: "90px"
        },
        {
            text: "neo.almeida2706@gmail.com",
            imageUrl: "svg/contact/Mail.svg",
            redirectLink: "mailto: neo.almeida2706@gmail.com",
            cssSize: "268px"
        }
    ];

    return (
        <>
            <section id="contact" className={`section ${styles.section} ${styles.contact_section} ${proximaNovaBold.className}`}>
                <div className={`content leaning ${styles.content} ${styles.leaning}`}>
                    <span className={`section_title ${styles.section_title}`}>How to contact me?</span>

                    <div className={styles.contact_content}>
                        {
                            socialArray.map(item => {
                                const style = {
                                    '--size': item.cssSize
                                } as React.CSSProperties;

                                return (<>
                                    <div className={styles.social_line}>
                                        <a className={styles.social_link} href={item.redirectLink} target="_blank" style={style}>
                                            <img src={item.imageUrl} />

                                            <div className={styles.social_text}>
                                                <span>{item.text}</span>
                                            </div>
                                        </a>
                                    </div>
                                </>);
                            })
                        }
                    </div>
                </div>
            </section>
        </>
    )
}
