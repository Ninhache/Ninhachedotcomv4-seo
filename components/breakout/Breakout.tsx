'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    createGame,
    type GameInput,
    type GameState,
    STEP,
    step,
} from '@/lib/breakout/engine';
import {
    levelFor,
    type StatusCode,
    WORLD_H,
    WORLD_W,
} from '@/lib/breakout/levels';
import { formatTime, getBest, recordBest } from '@/lib/breakout/progress';
import { absorbEvents, createFx, draw, type Fx } from '@/lib/breakout/render';
import styles from './breakout.module.css';

/** A slow frame never advances the simulation more than this many steps. */
const MAX_STEPS_PER_FRAME = 8;
/** How often the DOM timer refreshes, ms. The canvas runs at full rate. */
const HUD_INTERVAL = 100;

type Phase = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

export type ClearResult = {
    code: StatusCode;
    ms: number;
    newBest: boolean;
    /** No life lost on the way, extra lives notwithstanding. */
    flawless: boolean;
};

type Props = {
    code: StatusCode;
    /** Called once per clear, after the best time is stored. */
    onClear?: (result: ClearResult) => void;
    /** Shown on the win screen when there is a level after this one. */
    onNext?: () => void;
};

function isEditable(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
    );
}

function reducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The Breakout board of the 404 page: canvas, HUD and the DOM overlays for the
 * ready, pause, win and loss screens. The simulation lives in
 * `lib/breakout/engine.ts`; this component only owns the clock, the input and
 * what the visitor sees around the canvas.
 */
export function Breakout({ code, onClear, onNext }: Props) {
    const t = useTranslations('fun.game');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<GameState | null>(null);
    const fxRef = useRef<Fx | null>(null);
    const inputRef = useRef<GameInput>({
        left: false,
        right: false,
        pointerX: null,
        launch: false,
    });
    const phaseRef = useRef<Phase>('ready');
    const livesLostRef = useRef(0);
    const onClearRef = useRef(onClear);
    onClearRef.current = onClear;

    const [phase, setPhaseState] = useState<Phase>('ready');
    const [lives, setLives] = useState(3);
    const [timeMs, setTimeMs] = useState(0);
    const [best, setBest] = useState<number | null>(null);
    const [result, setResult] = useState<ClearResult | null>(null);

    const setPhase = useCallback((next: Phase) => {
        phaseRef.current = next;
        setPhaseState(next);
    }, []);

    const restart = useCallback(() => {
        const motion = !reducedMotion();
        const seed = Math.floor(Math.random() * 2 ** 31);
        gameRef.current = createGame(levelFor(code), seed, motion);
        fxRef.current = createFx(motion);
        livesLostRef.current = 0;
        inputRef.current.launch = false;
        setLives(gameRef.current.lives);
        setTimeMs(0);
        setResult(null);
        setBest(getBest(code));
        setPhase('ready');
    }, [code, setPhase]);

    const launchOrResume = useCallback(() => {
        const current = phaseRef.current;
        if (current === 'paused') setPhase('playing');
        else if (current === 'ready') inputRef.current.launch = true;
    }, [setPhase]);

    const togglePause = useCallback(() => {
        const current = phaseRef.current;
        if (current === 'playing') setPhase('paused');
        else if (current === 'paused') setPhase('playing');
    }, [setPhase]);

    useEffect(restart, [restart]);

    // The loop: a fixed-step accumulator fed by requestAnimationFrame.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let frame = 0;
        let last = performance.now();
        let acc = 0;
        let lastHud = 0;

        const tick = (now: number) => {
            frame = requestAnimationFrame(tick);
            const dt = Math.min(0.1, (now - last) / 1000);
            last = now;
            const game = gameRef.current;
            const fx = fxRef.current;
            if (!game || !fx) return;

            const current = phaseRef.current;
            if (current === 'ready' || current === 'playing') {
                acc += dt;
                let steps = 0;
                while (acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
                    step(game, inputRef.current);
                    acc -= STEP;
                    steps++;
                    if (inputRef.current.launch) {
                        inputRef.current.launch = false;
                    }
                }
                if (steps === MAX_STEPS_PER_FRAME) acc = 0;
            } else {
                acc = 0;
            }

            for (const event of absorbEvents(fx, game)) {
                if (event.type === 'won') {
                    const newBest = recordBest(game.code, game.elapsedMs);
                    const cleared = {
                        code: game.code,
                        ms: game.elapsedMs,
                        newBest,
                        flawless: livesLostRef.current === 0,
                    };
                    setResult(cleared);
                    setBest(getBest(game.code));
                    setTimeMs(game.elapsedMs);
                    setPhase('won');
                    onClearRef.current?.(cleared);
                } else if (event.type === 'lost') {
                    setLives(0);
                    setPhase('lost');
                } else if (event.type === 'life-lost') {
                    livesLostRef.current++;
                    setLives(game.lives);
                    setPhase('ready');
                } else if (event.type === 'power') {
                    setLives(game.lives);
                }
            }
            if (game.status === 'playing' && phaseRef.current === 'ready') {
                setPhase('playing');
            }

            if (
                now - lastHud > HUD_INTERVAL &&
                phaseRef.current === 'playing'
            ) {
                lastHud = now;
                setTimeMs(game.elapsedMs);
            }

            const scale = canvas.width / WORLD_W;
            draw(ctx, game, fx, scale, dt);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [setPhase]);

    // Backing store follows the CSS size and the device pixel ratio.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = canvas.clientWidth;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round((width * WORLD_H * dpr) / WORLD_W);
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        return () => observer.disconnect();
    }, []);

    // Keyboard. Ignored while typing anywhere, so the terminal and forms win.
    useEffect(() => {
        const input = inputRef.current;
        const onDown = (event: KeyboardEvent) => {
            if (isEditable(event.target) || event.metaKey || event.ctrlKey) {
                return;
            }
            const key = event.key;
            if (key === 'ArrowLeft' || key === 'a' || key === 'q') {
                input.left = true;
                input.pointerX = null;
            } else if (key === 'ArrowRight' || key === 'd') {
                input.right = true;
                input.pointerX = null;
            } else if (key === ' ') {
                launchOrResume();
            } else if (key === 'p' || key === 'P') {
                togglePause();
            } else if (key === 'Escape') {
                if (phaseRef.current === 'playing') setPhase('paused');
                return;
            } else {
                return;
            }
            // Arrows and space would scroll the page under the game.
            event.preventDefault();
        };
        const onUp = (event: KeyboardEvent) => {
            const key = event.key;
            if (key === 'ArrowLeft' || key === 'a' || key === 'q') {
                input.left = false;
            } else if (key === 'ArrowRight' || key === 'd') {
                input.right = false;
            }
        };
        const onHidden = () => {
            if (document.hidden && phaseRef.current === 'playing') {
                setPhase('paused');
            }
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        document.addEventListener('visibilitychange', onHidden);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
            document.removeEventListener('visibilitychange', onHidden);
        };
    }, [launchOrResume, togglePause, setPhase]);

    const pointerToWorld = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        inputRef.current.pointerX =
            ((event.clientX - rect.left) / rect.width) * WORLD_W;
    };

    const lifeSquares = Array.from({ length: Math.max(lives, 0) }, (_, i) => i);

    return (
        <div className={styles.board}>
            <div className={styles.hud}>
                <span className={styles.code}>{code}</span>
                <span className={styles.stat}>
                    <span className={styles.label}>{t('lives')}</span>
                    <span className={styles.lives} aria-label={String(lives)}>
                        {lifeSquares.map(i => (
                            <span key={i} className={styles.life} />
                        ))}
                    </span>
                </span>
                <span className={styles.stat}>
                    <span className={styles.label}>{t('time')}</span>
                    <span className={styles.value}>{formatTime(timeMs)}</span>
                </span>
                <span className={styles.stat}>
                    <span className={styles.label}>{t('best')}</span>
                    <span className={styles.value}>
                        {best === null ? '-' : formatTime(best)}
                    </span>
                </span>
            </div>

            <div className={styles.stage}>
                <canvas
                    ref={canvasRef}
                    className={styles.canvas}
                    role="img"
                    aria-label={t('canvasLabel', { code })}
                    onPointerMove={pointerToWorld}
                    onPointerDown={event => {
                        pointerToWorld(event);
                        launchOrResume();
                    }}
                />

                <div className={styles.overlayLayer} aria-live="polite">
                    {phase === 'ready' && (
                        <p className={styles.prompt}>{t('launch')}</p>
                    )}
                    {phase === 'paused' && (
                        <button
                            type="button"
                            className={styles.card}
                            onClick={() => setPhase('playing')}
                        >
                            <span className={styles.cardTitle}>
                                {t('paused')}
                            </span>
                            <span className={styles.cardText}>
                                {t('resume')}
                            </span>
                        </button>
                    )}
                    {phase === 'won' && result && (
                        <div className={styles.card}>
                            <span className={styles.cardTitle}>
                                {t('won', { code })}
                            </span>
                            <span className={styles.cardText}>
                                {t('wonTime', { time: formatTime(result.ms) })}
                            </span>
                            {result.newBest && (
                                <span className={styles.badge}>
                                    {t('newBest')}
                                </span>
                            )}
                            <span className={styles.actions}>
                                {onNext && (
                                    <button
                                        type="button"
                                        className={styles.primary}
                                        onClick={onNext}
                                    >
                                        {t('next')}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={
                                        onNext
                                            ? styles.secondary
                                            : styles.primary
                                    }
                                    onClick={restart}
                                >
                                    {t('replay')}
                                </button>
                            </span>
                        </div>
                    )}
                    {phase === 'lost' && (
                        <div className={styles.card}>
                            <span className={styles.cardTitle}>
                                {t('lost')}
                            </span>
                            <span className={styles.actions}>
                                <button
                                    type="button"
                                    className={styles.primary}
                                    onClick={restart}
                                >
                                    {t('retry')}
                                </button>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <p className={styles.controls}>{t('controls')}</p>
        </div>
    );
}
