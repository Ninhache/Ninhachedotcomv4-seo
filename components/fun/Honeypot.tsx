'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SAFE_CODE } from '@/lib/secrets/registry';
import { unlock } from '@/lib/secrets/store';
import styles from './honeypot.module.css';

/**
 * A login form that logs nobody in, for the bots and the curious who try
 * `/wp-admin`. Submitting it reads nothing and sends nothing: the inputs have
 * no `name`, the handler never looks at them and the form is reset on the spot.
 */
export function Honeypot({ locale }: { locale: string }) {
    const t = useTranslations('fun.honeypot');
    const [caught, setCaught] = useState(false);

    if (caught) {
        return (
            <div className={styles.card} role="status">
                <h1 className={styles.caughtTitle}>{t('caughtTitle')}</h1>
                <p className={styles.caughtText}>{t('caughtText')}</p>
                <p className={styles.caughtDigit}>
                    {t('digit', { digit: SAFE_CODE[2] })}
                </p>
                <a className={styles.submit} href={`/${locale}`}>
                    {t('back')}
                </a>
            </div>
        );
    }

    return (
        <>
            <h1 className={styles.logo}>
                <span aria-hidden="true">ninhache</span>
                <span className={styles.srOnly}>{t('title')}</span>
            </h1>
            <form
                className={styles.card}
                autoComplete="off"
                onSubmit={event => {
                    event.preventDefault();
                    event.currentTarget.reset();
                    unlock('honeypot');
                    setCaught(true);
                }}
            >
                <label className={styles.field}>
                    {t('user')}
                    <input
                        className={styles.input}
                        type="text"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                    />
                </label>
                <label className={styles.field}>
                    {t('password')}
                    <input
                        className={styles.input}
                        type="password"
                        autoComplete="off"
                    />
                </label>
                <div className={styles.row}>
                    <label className={styles.remember}>
                        <input type="checkbox" />
                        {t('remember')}
                    </label>
                    <button type="submit" className={styles.submit}>
                        {t('submit')}
                    </button>
                </div>
            </form>
            <p className={styles.below}>
                <a href={`/${locale}/404`}>{t('forgot')}</a>
            </p>
        </>
    );
}
