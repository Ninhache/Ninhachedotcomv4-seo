import styles from '@/styles/home.module.css';

import { calibreSemibold, ralewaySemiBold } from '@/app/fonts';
import { isInViewport, sleep } from '@/utils';
import { useEffect, useMemo, useState } from 'react';
import ParticlesComponent from './ParticlesComponent';
import AnimatedComponent from './AnimatedComponent';
import { useTranslations } from 'next-intl';

export default function Home() {

	const t = useTranslations("home");
	

	const memoizedParticlesComponent = useMemo(() => {
		return <ParticlesComponent />;
	}, []);

	return (
		<>
			<section id="home" className={`section ${styles.home_section}`}>
				{memoizedParticlesComponent}
				<div className={`content ${styles.content}`}>
					<AnimatedComponent delay={100}>
						<span className={`${styles.hi} ${ralewaySemiBold.className}`}>
							{t("greeting")}
						</span>
					</AnimatedComponent>
					<AnimatedComponent delay={200}>
						<span className={`${styles.name} ${calibreSemibold.className}`}>
							{t("name")}
						</span>
					</AnimatedComponent>
					<AnimatedComponent delay={300}>
						<span className={`${styles.title} ${calibreSemibold.className}`}>
							{t("profession")}
						</span>
					</AnimatedComponent>
					<AnimatedComponent delay={400}>
						<p className={`${styles.bio} ${calibreSemibold.className}`}>
							{t("description")}
						</p>
					</AnimatedComponent>
					<AnimatedComponent delay={500}>
					<div className={`${styles.home_button}`}>
						<a className={`button ${styles.button} ${ralewaySemiBold.className}`} href="#about">
							<p>{t("start")}</p>
							<svg className={`button_arrow ${styles.button_arrow}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.69 17.39">
								<g>
									<path className="path_1" d="M8.9 12.4 L8.9 12.4" />
									<path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
								</g>
							</svg>
						</a>
					</div>
					</AnimatedComponent>
				</div>
			</section>
		</>
	)
}