"use client"

import { proximaNovaBold } from "@/app/fonts"

import styles from "@/styles/footer.module.css"
import Image from "next/image"


export default function Footer() {
	return (
		<footer className={`section ${styles.footer_section} ${proximaNovaBold.className}`}>
			<div className={`content ${styles.content}`}>
				<div className={`${styles.footer_content}`}>
					<a className={styles.footer_licence} href="https://github.com/Ninhache/Ninhachedotv4/blob/main/LICENSE" target="_blank">
						<span>© 2023 Almeida Neo</span>
						<Image src={`svg/License.svg`} alt="license" width={`20`} height={`20`} />
						<span>MIT license</span>
					</a>
					<a href="https://github.com/ninhache/Ninhachedotv4" target="_blank">
						<span>See the repository on GitHub</span>
						<Image src={`svg/Github.svg`} alt="license" width={`20`} height={`20`} />
					</a>
				</div>
				<div className={`${styles.footer_content}`}>
					<p>
						This website was built by Almeida Neo using NextJS.
						Thank you for taking the time to read through it, and I hope you found it enjoyable.
					</p>
				</div>
			</div>
		</footer>
	)
}


