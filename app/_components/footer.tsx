import { proximaNovaBold } from "@/app/fonts";

import styles from "@/styles/footer.module.css";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("footer");

  return (
    <footer
      className={`section ${styles.footer_section} ${proximaNovaBold.className}`}
    >
      <div className={`content ${styles.content}`}>
        <div className={`${styles.footer_content}`}>
          <Link
            className={styles.footer_licence}
            href="https://github.com/Ninhache/Ninhachedotv4/blob/main/LICENSE"
            target="_blank"
          >
            <span>© 2025 Almeida Neo</span>
            <Image
              src={`svg/License.svg`}
              alt="license link"
              width={`20`}
              height={`20`}
              style={{ width: "20px", height: "20px" }}
            />
            <span>MIT license</span>
          </Link>
          <Link
            href="https://github.com/Ninhache/Ninhachedotcomv4-seo"
            target="_blank"
          >
            <span>{t("github")}</span>
            <Image
              src={`svg/Github.svg`}
              alt="github link"
              width={`20`}
              height={`20`}
              style={{ width: "20px", height: "20px" }}
            />
          </Link>
        </div>
        <div className={`${styles.footer_content}`}>
          <p>{t("text")}</p>
        </div>
      </div>
    </footer>
  );
}
