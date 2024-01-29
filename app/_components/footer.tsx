import { proximaNovaBold } from "@/app/fonts"

import styles from "@/styles/footer.module.css"
import { useTranslations } from "next-intl"
import Image from "next/image"

export default function Footer() {

	const t = useTranslations('footer');

	return (
		<footer className={`section ${styles.footer_section} ${proximaNovaBold.className}`}>
			<div className={`content ${styles.content}`}>
				<div className={`${styles.footer_content}`}>
					<a className={styles.footer_licence} href="https://github.com/Ninhache/Ninhachedotv4/blob/main/LICENSE" target="_blank">
						<span>© 2024 Almeida Neo</span>
						<Image src={`svg/License.svg`} alt="license" width={`20`} height={`20`} />
						<span>MIT license</span>
					</a>
					<a href="https://github.com/ninhache/Ninhachedotv4" target="_blank">
						<span>{t('github')}</span>
						<Image src={`svg/Github.svg`} alt="license" width={`20`} height={`20`} />
					</a>
				</div>
				<div className={`${styles.footer_content}`}>
					<p>
						{t('text')}
					</p>
				</div>
			</div>
		</footer>
	)
}


