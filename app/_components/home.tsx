import styles from "@/styles/home.module.css";

import { calibreRegular, calibreSemibold, ralewaySemiBold } from "@/app/fonts";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import AnimatedComponent from "./AnimatedComponent";
import ParticlesComponent from "./ParticlesComponent";
import Link from "next/link";

export default function Home() {
  const t = useTranslations("home");
  const t_about = useTranslations("about");

  const memoizedParticlesComponent = useMemo(() => {
    return <ParticlesComponent />;
  }, []);

  return (
    <>
      <section id={t("anchor")} className={`section ${styles.home_section}`}>
        {memoizedParticlesComponent}
        <div className={`content ${styles.content}`}>
          <AnimatedComponent delay={100}>
            <span className={`${styles.hi} ${ralewaySemiBold.className}`}>
              {t("greeting")}
            </span>
          </AnimatedComponent>
          <AnimatedComponent delay={200} customCss={{ marginTop: 25 }}>
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
            <p className={`${styles.bio} ${calibreRegular.className}`}>
              {t("description")}
            </p>
          </AnimatedComponent>
          <AnimatedComponent delay={500}>
            <div className={`${styles.home_button}`}>
              <Link
                className={`button ${styles.button} ${ralewaySemiBold.className}`}
                href={`#${t_about("anchor")}`}
              >
                <p>{t("start")}</p>
                <svg
                  className={`button_arrow ${styles.button_arrow}`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 17.69 17.39"
                >
                  <g>
                    <path className="path_1" d="M8.9 12.4 L8.9 12.4" />
                    <path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
                  </g>
                </svg>
              </Link>
            </div>
          </AnimatedComponent>
        </div>
      </section>
    </>
  );
}
