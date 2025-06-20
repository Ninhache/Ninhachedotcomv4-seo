// import createMiddleware from "next-intl/middleware";
// import { defaultLocale, locales } from "./config";

// export default createMiddleware({
//   locales,
//   defaultLocale,
//   localePrefix: "always",
// });

// export const config = {
//   matcher: ["/((?!api|_next|.*\\..*).*)"],
// };

import createMiddleware from "next-intl/middleware";
import { pathnames, locales, localePrefix, defaultLocale } from "./config";

export default createMiddleware({
  defaultLocale,
  locales,
  pathnames,
  localePrefix,
});

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    "/",

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    "/(en|fr)/:path*",

    // Enable redirects that add missing locales
    // (e.g. `/pathnames` -> `/en/pathnames`)
    "/((?!_next|_vercel|api|.*\\..*).*)",
  ],
};
