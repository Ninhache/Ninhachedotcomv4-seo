'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LEVEL_CODES, type StatusCode } from '@/lib/breakout/levels';
import { getUnlocked, unlockAfter } from '@/lib/breakout/progress';
import { SPEEDRUN_MS, SPEEDRUN_NEAR_MS } from '@/lib/secrets/registry';
import { getFound, unlock } from '@/lib/secrets/store';
import { Breakout, type ClearResult } from './Breakout';
import styles from './not-found-game.module.css';

/**
 * The game block of every 404: the level ladder plus the board. Landing here at
 * all is the `lost` secret; the game holds four more (404, 418, no life lost,
 * a fast 404). A 404 cleared a little too slowly says by how much: the near
 * miss is what makes people press « Rejouer ».
 */
export function NotFoundGame() {
    const t = useTranslations('fun.game');
    const [code, setCode] = useState<StatusCode>(LEVEL_CODES[0]);
    // 1 on the server and on first paint; the stored value arrives after mount.
    const [unlocked, setUnlocked] = useState(1);
    const [run, setRun] = useState(0);
    const [missedBy, setMissedBy] = useState<number | null>(null);

    useEffect(() => {
        setUnlocked(getUnlocked());
        unlock('lost');
    }, []);

    const index = LEVEL_CODES.indexOf(code);
    const nextCode = LEVEL_CODES[index + 1];

    const handleClear = ({ code: cleared, ms, flawless }: ClearResult) => {
        setUnlocked(unlockAfter(cleared));
        if (cleared === 404) unlock('breaker');
        if (cleared === 418) unlock('teapot');
        if (flawless) unlock('flawless');
        if (cleared !== 404) return;
        if (ms < SPEEDRUN_MS) unlock('speedrun');
        else if (ms < SPEEDRUN_NEAR_MS && !getFound().includes('speedrun')) {
            setMissedBy(ms - SPEEDRUN_MS);
        }
    };

    const pick = (next: StatusCode) => {
        setMissedBy(null);
        setCode(next);
        setRun(r => r + 1);
    };

    return (
        <div className={styles.wrap}>
            <nav className={styles.levels} aria-label={t('levels')}>
                {LEVEL_CODES.map((level, i) => {
                    const locked = i >= unlocked;
                    return (
                        <button
                            key={level}
                            type="button"
                            className={styles.level}
                            aria-pressed={level === code}
                            disabled={locked}
                            title={locked ? t('locked') : t(`hints.${level}`)}
                            onClick={() => pick(level)}
                        >
                            {level}
                        </button>
                    );
                })}
            </nav>
            <p className={styles.hint}>
                {missedBy === null
                    ? t(`hints.${code}`)
                    : t('nearMiss', { gap: (missedBy / 1000).toFixed(2) })}
            </p>
            <Breakout
                key={`${code}-${run}`}
                code={code}
                onClear={handleClear}
                onNext={nextCode ? () => pick(nextCode) : undefined}
            />
        </div>
    );
}
