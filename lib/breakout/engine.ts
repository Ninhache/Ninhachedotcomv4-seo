/**
 * Breakout simulation. Pure: no DOM, no clock, no `Math.random`. The caller
 * feeds fixed steps and inputs, so a run is reproducible from its seed and
 * inputs (the groundwork for a server-side replay check, out of scope in v1).
 * Rules: `docs/specs/fun-layer.md` § 2.2.
 */
import {
    type BrickKind,
    type Level,
    type StatusCode,
    WORLD_H,
    WORLD_W,
} from './levels';

/** Simulation step, in seconds. Fixed so a run never depends on the frame rate. */
export const STEP = 1 / 120;

const PADDLE_W = 80;
const PADDLE_W_WIDE = 120;
const PADDLE_H = 10;
const PADDLE_Y = WORLD_H - 40;
/** Keyboard paddle speed, px/s. */
const PADDLE_SPEED = 520;

export const BALL_SIZE = 8;
const BALL_SPEED_START = 300;
const BALL_SPEED_MAX = 540;
const BALL_SPEEDUP = 1.02;
/** Steepest bounce off the paddle edge, from vertical. */
const MAX_BOUNCE = Math.PI / 3;
/** Below this vertical share a ball would crawl sideways forever. */
const MIN_DY = 0.3;
const MAX_BALLS = 6;

const START_LIVES = 3;
const MAX_LIVES = 5;

const DROP_CHANCE = 0.12;
const DROP_SPEED = 120;
export const DROP_SIZE = 16;
const WIDE_SECONDS = 12;
const SLOW_SECONDS = 10;
const SLOW_FACTOR = 0.7;

/** 418 sway: amplitude in px and period in seconds. */
const SWAY_AMPLITUDE = 16;
const SWAY_PERIOD = 4;

export type PowerKind = 'wide' | 'slow' | 'life' | 'multi';
/** Draw weights; must sum to 1. Lives are the rare one. */
const POWER_WEIGHTS: [PowerKind, number][] = [
    ['wide', 0.3],
    ['slow', 0.25],
    ['life', 0.15],
    ['multi', 0.3],
];

export type Brick = {
    x: number;
    y: number;
    w: number;
    h: number;
    kind: BrickKind;
    hp: number;
    alive: boolean;
};

export type Ball = { x: number; y: number; dx: number; dy: number };
export type Drop = { x: number; y: number; kind: PowerKind };

export type GameStatus = 'ready' | 'playing' | 'won' | 'lost';

/** Things the renderer may want to celebrate. Drained by the caller every frame. */
export type GameEvent =
    | { type: 'brick'; x: number; y: number; destroyed: boolean }
    | { type: 'steel'; x: number; y: number }
    | { type: 'paddle'; x: number; y: number }
    | { type: 'power'; kind: PowerKind }
    | { type: 'life-lost' }
    | { type: 'won' }
    | { type: 'lost' };

export type GameState = {
    code: StatusCode;
    effect: Level['effect'];
    /** False under `prefers-reduced-motion`: the 418 stands still. */
    motion: boolean;
    bricks: Brick[];
    paddle: { x: number; w: number; y: number; h: number };
    balls: Ball[];
    /** True while the ball rests on the paddle waiting for a launch. */
    stuck: boolean;
    drops: Drop[];
    lives: number;
    status: GameStatus;
    /** Simulation clock, seconds. Drives sway and timed power-ups. */
    time: number;
    /** Clear time in ms, counted from the first launch. */
    elapsedMs: number;
    launched: boolean;
    speed: number;
    wideUntil: number;
    slowUntil: number;
    /** Current horizontal offset of the swaying bricks. */
    sway: number;
    rng: number;
    events: GameEvent[];
};

export type GameInput = {
    left: boolean;
    right: boolean;
    /** Paddle centre wanted by a pointer, in world px; null when unused. */
    pointerX: number | null;
    launch: boolean;
};

/** mulberry32: tiny, seedable, good enough for power-up drops. */
function nextRandom(state: GameState): number {
    state.rng = (state.rng + 0x6d2b79f5) | 0;
    let t = state.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function restOnPaddle(state: GameState): Ball {
    return {
        x: state.paddle.x + state.paddle.w / 2 - BALL_SIZE / 2,
        y: state.paddle.y - BALL_SIZE - 1,
        dx: 0,
        dy: -1,
    };
}

export function createGame(
    level: Level,
    seed: number,
    motion = true
): GameState {
    const state: GameState = {
        code: level.code,
        effect: level.effect,
        motion,
        bricks: level.bricks.map(b => ({
            ...b,
            hp: b.kind === 'tough' ? 2 : 1,
            alive: true,
        })),
        paddle: {
            x: (WORLD_W - PADDLE_W) / 2,
            w: PADDLE_W,
            y: PADDLE_Y,
            h: PADDLE_H,
        },
        balls: [],
        stuck: true,
        drops: [],
        lives: START_LIVES,
        status: 'ready',
        time: 0,
        elapsedMs: 0,
        launched: false,
        speed: BALL_SPEED_START,
        wideUntil: 0,
        slowUntil: 0,
        sway: 0,
        rng: seed | 0,
        events: [],
    };
    state.balls = [restOnPaddle(state)];
    return state;
}

/** Bricks still standing between the player and the clear. */
export function remainingBricks(state: GameState): number {
    return state.bricks.filter(b => b.alive && b.kind !== 'steel').length;
}

/** A brick's x once the 418 sway is applied. */
export function brickX(state: GameState, brick: Brick): number {
    return brick.kind === 'steel' ? brick.x : brick.x + state.sway;
}

function normalize(ball: Ball) {
    const len = Math.hypot(ball.dx, ball.dy) || 1;
    ball.dx /= len;
    ball.dy /= len;
    if (Math.abs(ball.dy) < MIN_DY) {
        ball.dy = Math.sign(ball.dy || -1) * MIN_DY;
        ball.dx = Math.sign(ball.dx || 1) * Math.sqrt(1 - MIN_DY * MIN_DY);
    }
}

function launch(state: GameState) {
    const ball = state.balls[0];
    // A small random tilt so two launches never trace the same line.
    const angle = (nextRandom(state) - 0.5) * (Math.PI / 6);
    ball.dx = Math.sin(angle);
    ball.dy = -Math.cos(angle);
    state.stuck = false;
    state.status = 'playing';
    state.launched = true;
}

function movePaddle(state: GameState, input: GameInput, dt: number) {
    const p = state.paddle;
    const targetW = state.time < state.wideUntil ? PADDLE_W_WIDE : PADDLE_W;
    if (p.w !== targetW) {
        // Grow or shrink around the centre.
        p.x += (p.w - targetW) / 2;
        p.w = targetW;
    }
    if (input.pointerX !== null) {
        p.x = input.pointerX - p.w / 2;
    } else {
        const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        p.x += dir * PADDLE_SPEED * dt;
    }
    p.x = Math.max(0, Math.min(WORLD_W - p.w, p.x));
}

function overlaps(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function hitBrick(state: GameState, ball: Ball): boolean {
    for (const brick of state.bricks) {
        if (!brick.alive) continue;
        const bx = brickX(state, brick);
        if (
            !overlaps(
                ball.x,
                ball.y,
                BALL_SIZE,
                BALL_SIZE,
                bx,
                brick.y,
                brick.w,
                brick.h
            )
        )
            continue;

        // Bounce along the axis of least penetration.
        const overlapX = Math.min(
            ball.x + BALL_SIZE - bx,
            bx + brick.w - ball.x
        );
        const overlapY = Math.min(
            ball.y + BALL_SIZE - brick.y,
            brick.y + brick.h - ball.y
        );
        if (overlapX < overlapY) {
            const side = ball.x + BALL_SIZE / 2 < bx + brick.w / 2 ? -1 : 1;
            ball.dx = side * Math.abs(ball.dx);
            ball.x += side * overlapX;
        } else {
            const side =
                ball.y + BALL_SIZE / 2 < brick.y + brick.h / 2 ? -1 : 1;
            ball.dy = side * Math.abs(ball.dy);
            ball.y += side * overlapY;
        }
        normalize(ball);

        const cx = bx + brick.w / 2;
        const cy = brick.y + brick.h / 2;
        if (brick.kind === 'steel') {
            state.events.push({ type: 'steel', x: cx, y: cy });
            return true;
        }
        brick.hp -= 1;
        const destroyed = brick.hp <= 0;
        if (destroyed) {
            brick.alive = false;
            if (nextRandom(state) < DROP_CHANCE) {
                state.drops.push({
                    x: cx - DROP_SIZE / 2,
                    y: cy - DROP_SIZE / 2,
                    kind: pickPower(nextRandom(state)),
                });
            }
        }
        state.events.push({ type: 'brick', x: cx, y: cy, destroyed });
        return true;
    }
    return false;
}

function pickPower(roll: number): PowerKind {
    let acc = 0;
    for (const [kind, weight] of POWER_WEIGHTS) {
        acc += weight;
        if (roll < acc) return kind;
    }
    return 'multi';
}

function applyPower(state: GameState, kind: PowerKind) {
    state.events.push({ type: 'power', kind });
    if (kind === 'wide') state.wideUntil = state.time + WIDE_SECONDS;
    else if (kind === 'slow') state.slowUntil = state.time + SLOW_SECONDS;
    else if (kind === 'life')
        state.lives = Math.min(MAX_LIVES, state.lives + 1);
    else {
        const source = state.balls[0];
        if (!source || state.stuck) return;
        for (const tilt of [-0.35, 0.35]) {
            if (state.balls.length >= MAX_BALLS) break;
            const cos = Math.cos(tilt);
            const sin = Math.sin(tilt);
            const ball = {
                x: source.x,
                y: source.y,
                dx: source.dx * cos - source.dy * sin,
                dy: source.dx * sin + source.dy * cos,
            };
            normalize(ball);
            state.balls.push(ball);
        }
    }
}

function moveBall(state: GameState, ball: Ball, dist: number): boolean {
    ball.x += ball.dx * dist;
    ball.y += ball.dy * dist;

    if (ball.x < 0) {
        ball.x = 0;
        ball.dx = Math.abs(ball.dx);
    } else if (ball.x + BALL_SIZE > WORLD_W) {
        ball.x = WORLD_W - BALL_SIZE;
        ball.dx = -Math.abs(ball.dx);
    }
    if (ball.y < 0) {
        ball.y = 0;
        ball.dy = Math.abs(ball.dy);
    }

    const p = state.paddle;
    if (
        ball.dy > 0 &&
        overlaps(ball.x, ball.y, BALL_SIZE, BALL_SIZE, p.x, p.y, p.w, p.h)
    ) {
        const offset = Math.max(
            -1,
            Math.min(1, (ball.x + BALL_SIZE / 2 - (p.x + p.w / 2)) / (p.w / 2))
        );
        const angle = offset * MAX_BOUNCE;
        ball.dx = Math.sin(angle);
        ball.dy = -Math.cos(angle);
        ball.y = p.y - BALL_SIZE;
        state.speed = Math.min(BALL_SPEED_MAX, state.speed * BALL_SPEEDUP);
        state.events.push({ type: 'paddle', x: ball.x, y: p.y });
    }

    hitBrick(state, ball);
    return ball.y <= WORLD_H;
}

/** Advances the game by one fixed `STEP`. Mutates and returns `state`. */
export function step(state: GameState, input: GameInput): GameState {
    if (state.status === 'won' || state.status === 'lost') return state;
    const dt = STEP;
    state.time += dt;
    if (state.launched) state.elapsedMs += dt * 1000;
    state.sway =
        state.effect === 'sway' && state.motion
            ? Math.sin((state.time * 2 * Math.PI) / SWAY_PERIOD) *
              SWAY_AMPLITUDE
            : 0;

    movePaddle(state, input, dt);

    if (state.stuck) {
        state.balls = [restOnPaddle(state)];
        if (input.launch) launch(state);
        return state;
    }

    const speed =
        state.speed * (state.time < state.slowUntil ? SLOW_FACTOR : 1);
    state.balls = state.balls.filter(ball => moveBall(state, ball, speed * dt));

    const p = state.paddle;
    state.drops = state.drops.filter(drop => {
        drop.y += DROP_SPEED * dt;
        if (
            overlaps(drop.x, drop.y, DROP_SIZE, DROP_SIZE, p.x, p.y, p.w, p.h)
        ) {
            applyPower(state, drop.kind);
            return false;
        }
        return drop.y <= WORLD_H;
    });

    if (remainingBricks(state) === 0) {
        state.status = 'won';
        state.events.push({ type: 'won' });
        return state;
    }

    if (state.balls.length === 0) {
        state.lives -= 1;
        state.drops = [];
        state.wideUntil = 0;
        state.slowUntil = 0;
        if (state.lives <= 0) {
            state.status = 'lost';
            state.events.push({ type: 'lost' });
        } else {
            state.events.push({ type: 'life-lost' });
            state.stuck = true;
            state.balls = [restOnPaddle(state)];
        }
    }
    return state;
}
