"use client";

import { Locale, locales } from "@/i18nconfig";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";

export default function LocaleSwitcher({ localeNames }: { localeNames: Record<Locale, string> }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathName = usePathname();

  const lastIndex = locales.length - 2;

  const switchLocale = (loc: string, e: React.MouseEvent<HTMLElement>) => {
    router.push(pathName, { locale: loc });
  };

  return (
    <div className="group relative inline-block">
      <div className="ease-in duration-150 cursor-pointer px-2 rounded-t-lg hover:text-blue group-hover:bg-white">
        {localeNames[locale]}
      </div>

      {locales.filter(loc => loc !== locale).map((loc, index) => (
        <div key={loc} className={`hidden group-hover:block absolute w-full h-full text-center group-hover:bg-white transition-opacity duration-150 opacity-0 group-hover:opacity-100 ${index === lastIndex ? "rounded-b-lg" : ""}`} >
          <p onClick={(e) => switchLocale(loc, e)} className={`text-black cursor-pointer group-hover:bg-red hover:text-blue slide-in-left`}>
            {localeNames[loc]}
          </p>
        </div>
      ))}

    </div>
  );
}
