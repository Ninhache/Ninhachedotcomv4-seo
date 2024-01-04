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
						{/* <img src="svg/license.svg" alt="license" width="20px" height="20px" /> */}
						<Image src={`svg/license.svg`} alt="license" width={`20`} height={`20`} />
						<span>MIT license</span>
					</a>
					<a href="https://github.com/ninhache/Ninhachedotv4" target="_blank">
						<span>See the repository on GitHub</span>
						{/* <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.05 20.31"><g><path d="M7.26 16.34c-4.11 1.23-4.11-2.06-5.76-2.47M13 18.81V15.62a2.78 2.78 0 0 0-.77-2.15c2.59-.28 5.3-1.26 5.3-5.76a4.46 4.46 0 0 0-1.23-3.08 4.18 4.18 0 0 0-.08-3.11s-1-.29-3.22 1.22a11 11 0 0 0-5.76 0C5 1.23 4 1.52 4 1.52A4.18 4.18 0 0 0 4 4.63 4.48 4.48 0 0 0 2.73 7.74c0 4.46 2.72 5.44 5.31 5.76a2.8 2.8 0 0 0-.78 2.12v3.19" /></g></svg> */}
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


