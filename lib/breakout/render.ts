/**
 * Canvas 2D drawing of a `GameState`, plus the purely cosmetic effects
 * (particles, shake) fed by the engine's events. Nothing here touches the
 * simulation, so turning effects off under reduced motion cannot change a run.
 */
import {
    BALL_SIZE,
    type Brick,
    brickX,
    DROP_SIZE,
    type GameEvent,
    type GameState,
    type PowerKind,
} from './engine';
import { WORLD_H, WORLD_W } from './levels';

/** Brand palette, see `PORTFOLIO_THEME`. */
export const COLORS = {
    bg: '#0b1422',
    frame: '#101d30',
    grid: 'rgba(86, 220, 252, 0.05)',
    brick: '#56dcfc',
    tough: '#197dff',
    steel: '#4a5d78',
    steelEdge: '#6b7f9c',
    paddle: '#e8eef7',
    ball: '#e8eef7',
    text: '#e8eef7',
    muted: '#8ea3c0',
} as const;

const POWER_LABEL: Record<PowerKind, string> = {
    wide: 'W',
    slow: 'S',
    life: '+',
    multi: 'M',
};

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
};

/** Cosmetic state living next to the game, never inside it. */
export type Fx = {
    particles: Particle[];
    shake: number;
    /** False under `prefers-reduced-motion`. */
    motion: boolean;
};

export function createFx(motion: boolean): Fx {
    return { particles: [], shake: 0, motion };
}

/** Turns engine events into particles and shake. Drains `state.events`. */
export function absorbEvents(fx: Fx, state: GameState): GameEvent[] {
    const events = state.events.splice(0);
    if (!fx.motion) return events;
    for (const e of events) {
        if (e.type === 'brick') {
            const count = e.destroyed ? 10 : 4;
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                const v = 40 + Math.random() * 120;
                fx.particles.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v,
                    life: 0.5 + Math.random() * 0.3,
                    color: state.code === 429 ? COLORS.tough : COLORS.brick,
                });
            }
            if (e.destroyed) fx.shake = Math.max(fx.shake, 2);
        } else if (e.type === 'life-lost' || e.type === 'lost') {
            fx.shake = 8;
        } else if (e.type === 'steel') {
            fx.shake = Math.max(fx.shake, 1);
        }
    }
    return events;
}

function updateFx(fx: Fx, dt: number) {
    fx.shake = Math.max(0, fx.shake - dt * 30);
    fx.particles = fx.particles.filter(p => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 300 * dt;
        return p.life > 0;
    });
}

function brickColor(state: GameState, brick: Brick): string {
    if (brick.kind === 'steel') return COLORS.steel;
    if (brick.kind === 'tough' && brick.hp > 1) return COLORS.tough;
    return COLORS.brick;
}

/** 500 flicker: each brick dims on its own phase so the code stutters. */
function brickAlpha(state: GameState, index: number): number {
    if (state.effect !== 'flicker' || !state.motion) return 1;
    const phase = Math.sin(state.time * 7 + index * 2.3);
    return phase > 0.6 ? 0.25 : 1;
}

/**
 * Draws one frame. `scale` maps world px to canvas px (DPR included); `dt` only
 * advances the cosmetic effects.
 */
export function draw(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    fx: Fx,
    scale: number,
    dt: number
) {
    updateFx(fx, dt);
    const shakeX = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
    const shakeY = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Faint pixel grid, the arcade backdrop.
    ctx.fillStyle = COLORS.grid;
    for (let x = 0; x < WORLD_W; x += 16) ctx.fillRect(x, 0, 1, WORLD_H);
    for (let y = 0; y < WORLD_H; y += 16) ctx.fillRect(0, y, WORLD_W, 1);

    ctx.translate(shakeX, shakeY);

    state.bricks.forEach((brick, i) => {
        if (!brick.alive) return;
        const x = brickX(state, brick);
        ctx.globalAlpha = brickAlpha(state, i);
        ctx.fillStyle = brickColor(state, brick);
        ctx.fillRect(x + 1, brick.y + 1, brick.w - 2, brick.h - 2);
        if (brick.kind === 'steel') {
            ctx.fillStyle = COLORS.steelEdge;
            ctx.fillRect(x + 1, brick.y + 1, brick.w - 2, 2);
        } else if (!state.motion && state.effect !== 'none') {
            // Reduced motion: the 500 and 418 twists become a static outline.
            ctx.strokeStyle = COLORS.text;
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2.5, brick.y + 2.5, brick.w - 5, brick.h - 5);
        }
    });
    ctx.globalAlpha = 1;

    for (const drop of state.drops) {
        ctx.fillStyle = COLORS.frame;
        ctx.fillRect(drop.x, drop.y, DROP_SIZE, DROP_SIZE);
        ctx.strokeStyle = COLORS.brick;
        ctx.lineWidth = 2;
        ctx.strokeRect(drop.x + 1, drop.y + 1, DROP_SIZE - 2, DROP_SIZE - 2);
        ctx.fillStyle = COLORS.brick;
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            POWER_LABEL[drop.kind],
            drop.x + DROP_SIZE / 2,
            drop.y + DROP_SIZE / 2 + 1
        );
    }

    const p = state.paddle;
    ctx.fillStyle = COLORS.paddle;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = COLORS.brick;
    ctx.fillRect(p.x, p.y, p.w, 2);

    ctx.fillStyle = COLORS.ball;
    for (const ball of state.balls) {
        ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
    }

    for (const particle of fx.particles) {
        ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2));
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - 1.5, particle.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
}
