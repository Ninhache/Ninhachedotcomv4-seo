'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { openTerminal } from '@/lib/fun/events';
import { SECRET_IDS } from '@/lib/secrets/registry';
import { getFound, onSecret, openSecrets } from '@/lib/secrets/store';
import styles from './fun.module.css';

/**
 * The two visible doors into the fun layer, in every footer: the secrets
 * counter and the terminal. The count is read after mount, since the list
 * lives in the visitor's browser.
 */
export function FunButtons() {
    const t = useTranslations('fun');
    const [count, setCount] = useState(0);

    useEffect(() => {
        setCount(getFound().length);
        return onSecret(detail => setCount(detail.count));
    }, []);

    return (
        <div className={styles.footerButtons}>
            <button
                type="button"
                className={styles.footerButton}
                data-complete={count === SECRET_IDS.length}
                onClick={openSecrets}
            >
                {t('secrets.button', { count, total: SECRET_IDS.length })}
            </button>
            <button
                type="button"
                className={styles.footerButton}
                onClick={openTerminal}
                aria-label={t('terminal.open')}
                title={t('terminal.open')}
            >
                &gt;_
            </button>
        </div>
    );
}
