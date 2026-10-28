/**
 * Particles around the home portrait: sparks while it overheats, then the
 * short circuit (flash, debris, smoke) and the wisps of the broken button.
 * Draws on a canvas the caller owns, centred on the portrait and three times
 * its size so the debris can fly out. The loop only runs while something is
 * alive. Callers skip it under `prefers-reduced-motion`.
 */

const SPARK_COLORS = ['#ffffff', '#56dcfc', '#fff3b0'];
const DEBRIS_COLORS = ['#56dcfc', '#197dff', '#ffffff', '#ff8a3d', '#2b2f3a'];
const GRAVITY = 900;
/** Debris pieces thrown by the short circuit. */
const DEBRIS_COUNT = 70;
/** Smoke puffs of the short circuit, spawned over SMOKE_SPREAD_MS. */
const SMOKE_COUNT = 80;
const SMOKE_SPREAD_MS = 1000;
const FLASH_MS = 380;

type Kind = 'spark' | 'debris' | 'smoke';

type Particle = {
    kind: Kind;
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Seconds left, and at birth. */
    life: number;
    span: number;
    size: number;
    grow: number;
    spin: number;
    angle: number;
    color: string;
    /** Seconds before it shows up. */
    delay: number;
};

export type Blast = {
    /** A burst of `count` sparks off the rim of the portrait. */
    sparks(count: number): void;
    /** The short circuit itself. */
    explode(): void;
    /** One thin puff of smoke at (dx, dy), in portrait radii from its centre. */
    wisp(dx: number, dy: number): void;
    dispose(): void;
};

const pick = <T>(list: readonly T[]): T =>
    list[Math.floor(Math.random() * list.length)];
const between = (min: number, max: number) => min + Math.random() * (max - min);

export function createBlast(canvas: HTMLCanvasElement): Blast {
    const ctx = canvas.getContext('2d');
    let particles: Particle[] = [];
    let flashUntil = 0;
    let frame = 0;
    let last = 0;

    const size = () => {
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr)) {
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        }
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
        // The canvas is three portraits wide.
        return { w, h, cx: w / 2, cy: h / 2, r: w / 6 };
    };

    const spawn = (p: Partial<Particle> & Pick<Particle, 'kind'>) => {
        const span = p.life ?? 1;
        particles.push({
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: 3,
            grow: 0,
            spin: 0,
            angle: 0,
            color: '#fff',
            delay: 0,
            ...p,
            life: span,
            span,
        });
    };

    const draw = (p: Particle, cx: number, cy: number) => {
        if (!ctx) return;
        const fade = Math.max(0, p.life / p.span);
        const x = cx + p.x;
        const y = cy + p.y;
        if (p.kind === 'spark') {
            ctx.globalAlpha = fade;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - p.vx * 0.03, y - p.vy * 0.03);
            ctx.stroke();
        } else if (p.kind === 'debris') {
            ctx.globalAlpha = Math.min(1, fade * 2);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        } else {
            // Smoke: soft grey puffs that thin out as they grow.
            const g = ctx.createRadialGradient(x, y, 0, x, y, p.size);
            g.addColorStop(0, p.color);
            g.addColorStop(1, 'rgba(60, 64, 74, 0)');
            ctx.globalAlpha = fade * fade * 0.85;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    };

    const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const { w, h, cx, cy, r } = size();
        if (!ctx) return;
        ctx.clearRect(0, 0, w, h);

        if (now < flashUntil) {
            const t = (flashUntil - now) / FLASH_MS;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.4);
            g.addColorStop(0, `rgba(255, 255, 255, ${t})`);
            g.addColorStop(0.35, `rgba(255, 214, 120, ${t * 0.8})`);
            g.addColorStop(1, 'rgba(255, 138, 61, 0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }

        // Smoke behind, sparks and debris on top.
        particles.sort((a, b) =>
            a.kind === 'smoke' ? -1 : b.kind === 'smoke' ? 1 : 0
        );
        for (const p of particles) {
            if (p.delay > 0) {
                p.delay -= dt;
                continue;
            }
            p.life -= dt;
            if (p.kind === 'smoke') {
                p.vx *= 0.98;
                p.vy = p.vy * 0.98 - 40 * dt;
                p.size += p.grow * dt;
            } else {
                p.vy += GRAVITY * dt * (p.kind === 'spark' ? 0.6 : 1);
                p.vx *= 0.99;
                p.angle += p.spin * dt;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            draw(p, cx, cy);
        }
        ctx.globalAlpha = 1;
        particles = particles.filter(p => p.life > 0);

        frame =
            particles.length > 0 || now < flashUntil
                ? requestAnimationFrame(tick)
                : 0;
    };

    const wake = () => {
        if (frame) return;
        last = performance.now();
        frame = requestAnimationFrame(tick);
    };

    const sparks = (count: number) => {
        const { r } = size();
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const speed = between(250, 650);
            spawn({
                kind: 'spark',
                x: Math.cos(a) * r,
                y: Math.sin(a) * r,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - 150,
                life: between(0.18, 0.45),
                size: between(1.2, 2.4),
                color: pick(SPARK_COLORS),
            });
        }
        wake();
    };

    return {
        sparks,
        explode() {
            const { r } = size();
            flashUntil = performance.now() + FLASH_MS;
            for (let i = 0; i < DEBRIS_COUNT; i++) {
                const a = Math.random() * Math.PI * 2;
                const speed = between(300, 1000);
                const from = Math.random() * r;
                spawn({
                    kind: 'debris',
                    x: Math.cos(a) * from,
                    y: Math.sin(a) * from,
                    vx: Math.cos(a) * speed,
                    vy: Math.sin(a) * speed - 300,
                    life: between(0.7, 1.4),
                    size: 4 + Math.floor(Math.random() * 3) * 3,
                    spin: between(-12, 12),
                    color: pick(DEBRIS_COLORS),
                });
            }
            for (let i = 0; i < SMOKE_COUNT; i++) {
                const a = Math.random() * Math.PI * 2;
                const from = Math.random() * r * 0.7;
                spawn({
                    kind: 'smoke',
                    x: Math.cos(a) * from,
                    y: Math.sin(a) * from,
                    vx: Math.cos(a) * between(30, 160),
                    vy: Math.sin(a) * between(30, 120) - 40,
                    life: between(2.2, 4.2),
                    size: between(r * 0.25, r * 0.5),
                    grow: between(r * 0.3, r * 0.6),
                    color: `rgba(${Math.round(between(55, 95))}, 60, 70, 0.9)`,
                    delay: (Math.random() * SMOKE_SPREAD_MS) / 1000,
                });
            }
            sparks(40);
        },
        wisp(dx, dy) {
            const { r } = size();
            spawn({
                kind: 'smoke',
                x: dx * r,
                y: dy * r,
                vx: between(-10, 10),
                vy: -30,
                life: between(1.6, 2.6),
                size: r * between(0.08, 0.14),
                grow: r * between(0.18, 0.3),
                color: 'rgba(90, 94, 104, 0.65)',
            });
            wake();
        },
        dispose() {
            if (frame) cancelAnimationFrame(frame);
            frame = 0;
            particles = [];
        },
    };
}
