import { NextIntlClientProvider } from 'next-intl';
import { calibreRegular, proximaNovaBold } from '@/app/fonts';
import { NotFoundGame } from './NotFoundGame';
import styles from './not-found-view.module.css';

type Copy = {
    title: string;
    text: string;
    home: string;
    blog: string;
};

/**
 * The whole 404 screen, shared by the localized not-found and the root one
 * (dotted paths such as `/.env` never reach the locale segment). It styles
 * itself: neither root layout loads a global stylesheet.
 *
 * `messages` carries the `fun` namespace only, the client needs nothing else.
 */
export function NotFoundView({
    locale,
    copy,
    messages,
}: {
    locale: string;
    copy: Copy;
    messages: Record<string, unknown>;
}) {
    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <main className={`${styles.page} ${calibreRegular.className}`}>
                <div className={styles.layout}>
                    <section className={styles.copy}>
                        <p className={styles.kicker}>404</p>
                        <h1
                            className={`${styles.title} ${proximaNovaBold.className}`}
                        >
                            {copy.title}
                        </h1>
                        <p className={styles.text}>{copy.text}</p>
                        <p className={styles.links}>
                            <a className={styles.primary} href={`/${locale}`}>
                                {copy.home}
                            </a>
                            <a
                                className={styles.secondary}
                                href={`/${locale}/blog`}
                            >
                                {copy.blog}
                            </a>
                        </p>
                    </section>
                    <NotFoundGame />
                </div>
            </main>
        </NextIntlClientProvider>
    );
}
