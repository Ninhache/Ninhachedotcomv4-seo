import { proximaNovaBold } from "@/app/fonts";

import rawData from "@/jsons/experiences.json";
import AnimatedComponent from "../AnimatedComponent";

import { ExperienceItem } from "./ExperienceItem";

import styles from "@/styles/experience/experience.module.css";
import "@/styles/globals.css";
import { useTranslations } from "next-intl";

export default function Experience() {
  const t = useTranslations("jobs");

  return (
    <>
      <section id={t("anchor")} className={`section ${styles.section}`}>
        <div className={`content leaning`}>
          <span
            className={`section_title ${styles.title} ${proximaNovaBold.className}`}
          >
            Where I&apos;ve Worked
          </span>
          <div className={styles.content}>
            {rawData
              .sort((a, b) => a.order - b.order)
              .map((item, index) => {
                return (
                  <AnimatedComponent delay={100} key={index}>
                    <ExperienceItem
                      key={index}
                      experience={item}
                      inverted={index % 2 === 0}
                    />
                  </AnimatedComponent>
                );
              })}
          </div>
        </div>
      </section>
      <div className={`section_end ${styles.experience_end}`} />
    </>
  );
}
