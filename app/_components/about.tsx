"use client";

import styles from "@/styles/about.module.css";

import { calibreRegular, proximaNovaBold, ralewaySemiBold } from "@/app/fonts";
import Link from "next/link";
import AnimatedProfilePicture from "./AnimatedProfilePicture";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";

export default function About() {
  const t = useTranslations("about");

  // const locale = useLocale();
  // todo: add the english version

  return (
    <>
      <section id={t("anchor")} className={`section ${styles.about_section}`}>
        <div className={`content ${styles.content}`}>
          <span className={`section_title ${proximaNovaBold.className}`}>
            {t("title")}
          </span>
          <div className={styles.about_content}>
            <div className={styles.left_content}>
              <p className={`${styles.p_1} ${calibreRegular.className}`}>
                {t.rich("introduction", {
                  projects: (chunks) => (
                    <Link className="link" href="#projects">
                      {chunks}
                    </Link>
                  ),
                })}
                <br />
                <br />
                {t("employmentSeeking")}
                <br />
                <br />
                {t("additionalInfo")}
              </p>

              <Link
                className={`${ralewaySemiBold.className} ${styles.download_resume}`}
                href="/documents/CV_ALMEIDA_Neo_FR-web.pdf"
                target="_blank"
              >
                <span>{t("resumeLink")}</span>
                <Image
                  src="/svg/OpenLink.svg"
                  width={20}
                  height={20}
                  alt={t("altLink")}
                  style={{ width: "20px", height: "20px" }}
                />
              </Link>
            </div>

            <AnimatedProfilePicture />
          </div>
        </div>
      </section>
      <div className={`section_end ${styles.about_end}`}></div>
    </>
  );
}
