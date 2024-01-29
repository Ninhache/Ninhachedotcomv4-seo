"use client"

import styles from '@/styles/about.module.css';

import { calibreRegular, proximaNovaBold, ralewaySemiBold } from '@/app/fonts';
import Link from "next/link";
import AnimatedProfilePicture from './AnimatedProfilePicture';
import { useTranslations } from 'next-intl';

export default function About() {

	const t = useTranslations('about');

	return (
		<>
			<section id="about" className={`section ${styles.about_section}`}>
				<div className={`content ${styles.content}`}>
					<span className={`section_title ${proximaNovaBold.className}`}>{t('title')}</span>
					<div className={styles.about_content}>
						<div className={styles.left_content}>
							<p className={`${styles.p_1} ${calibreRegular.className}`}>
								{t.rich('introduction', {
									projects: (chunks) => <a className="link" href="#projects">{chunks}</a>
								})}
								<br /><br />
								{t('employmentSeeking')}
								<br /><br />
								{t('additionalInfo')}
							</p>

							<Link
								className={`${ralewaySemiBold.className} ${styles.download_resume}`}
								href="/resume"
								target="_blank"
							>
								<span>{t('resumeLink')}</span>
								<img src="/svg/OpenLink.svg" alt={t('resumeLink')} />
							</Link>

							<a >

							</a>
						</div>

						<AnimatedProfilePicture />
					</div>
				</div>
			</section>
			<div className={`section_end ${styles.about_end}`}></div>
		</>
	)
}
