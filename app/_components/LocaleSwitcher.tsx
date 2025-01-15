"use client";

import { Locale, locales } from "@/config";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

import styles from "@/styles/localeSwitcher.module.css";
import Image from "next/image";

export default function LocaleSwitcher({
  localeNames,
}: {
  localeNames: Record<Locale, string>;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();

  const switchLocale = (loc: string, e: React.MouseEvent<HTMLElement>) => {
    router.replace(loc);
  };

  return (
    <div
      className={styles.container}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 12,
        paddingRight: 12,
      }}
    >
      <div className={styles.content}>
        <div className={styles.label}>
          <Image
            src={`/images/translations/${locale}.jpg`}
            width={35}
            height={20}
            alt={locale}
            style={{ width: "35px", height: "20px" }}
          />
          <p>{localeNames[locale]}</p>
        </div>

        {locales
          .filter((loc) => loc !== locale)
          .map((loc, index) => (
            <div
              key={loc}
              className={styles.langList}
              onClick={(e) => switchLocale(loc, e)}
            >
              <Image
                src={`/images/translations/${loc}.jpg`}
                width={35}
                height={20}
                alt={loc}
                style={{ width: "35px", height: "20px" }}
              />
              <p className={styles.langItem}>{localeNames[loc]}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
