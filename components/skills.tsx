"use client"

import { proximaNovaBold } from '@/app/fonts'
import styles from '@/styles/skills.module.css'

export default function Skills() {
	return (
		<>
		<a id="skills"></a>
            <section className={`section ${styles.skills_section}`}>
                <div className={`content leaning ${styles.content}`}>
                    <span className={`section_title ${proximaNovaBold.className}`}>What are my Skills?</span>
                    <div className={styles.skills_content}>
                        <div className={styles.box}></div>
                    </div>
                </div>
            </section>
            <div className={`section_end ${styles.skills_end}`}></div>
		</>
	)
}
