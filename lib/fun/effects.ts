/**
 * The two full-screen celebrations: pixel confetti (Konami) and the matrix
 * rain (terminal). Each draws on a throwaway canvas above the page, never
 * catches a click, and removes itself when done. Callers skip them under
 * `prefers-reduced-motion`.
 */
const CONFETTI_COLORS = ['#56dcfc', '#197dff', '#e8eef7', '#8ea3c0'];
const CONFETTI_COUNT = 140;
const CONFETTI_MS = 2600;
const MATRIX_MS = 6000;
const MATRIX_FONT = 16;
const MATRIX_GLYPHS = '01<>/{}[]=;ninhache404';

function overlayCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '2147483000',
    });
    document.body.appendChild(canvas);
    return [canvas, ctx];
}

/** Runs `frame(elapsedMs)` until `duration`, then drops the canvas. */
function animate(
    duration: number,
    frame: (ctx: CanvasRenderingContext2D, ms: number, dt: number) => void
) {
    const made = overlayCanvas();
    if (!made) return;
    const [canvas, ctx] = made;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
        const ms = now - start;
        if (ms > duration) {
            canvas.remove();
            return;
        }
        frame(ctx, ms, Math.min(0.05, (now - last) / 1000));
        last = now;
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

export function confetti(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const bits = Array.from({ length: CONFETTI_COUNT }, () => ({
        x: w / 2 + (Math.random() - 0.5) * w * 0.3,
        y: h * 0.6,
        vx: (Math.random() - 0.5) * 900,
        vy: -400 - Math.random() * 700,
        size: 4 + Math.floor(Math.random() * 3) * 2,
        color: CONFETTI_COLORS[Math.floor(Math.random() * 4)],
    }));
    animate(CONFETTI_MS, (ctx, ms, dt) => {
        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = Math.min(1, (CONFETTI_MS - ms) / 600);
        for (const b of bits) {
            b.vy += 900 * dt;
            b.vx *= 0.99;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            ctx.fillStyle = b.color;
            ctx.fillRect(Math.round(b.x), Math.round(b.y), b.size, b.size);
        }
    });
}

export function matrixRain(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const columns = Math.ceil(w / MATRIX_FONT);
    const drops = Array.from({ length: columns }, () => Math.random() * -40);
    let acc = 0;
    animate(MATRIX_MS, (ctx, ms, dt) => {
        // Fade in, rain, fade out: the trail comes from painting over each
        // frame with a translucent background.
        const fadeOut = Math.max(0, (ms - (MATRIX_MS - 1000)) / 1000);
        ctx.fillStyle = `rgba(11, 20, 34, ${0.12 + fadeOut * 0.5})`;
        ctx.fillRect(0, 0, w, h);
        acc += dt;
        if (acc < 1 / 30) return;
        acc = 0;
        ctx.font = `${MATRIX_FONT}px ui-monospace, monospace`;
        ctx.fillStyle = fadeOut
            ? `rgba(86, 220, 252, ${1 - fadeOut})`
            : '#56dcfc';
        drops.forEach((y, i) => {
            const glyph =
                MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
            ctx.fillText(glyph, i * MATRIX_FONT, y * MATRIX_FONT);
            drops[i] = y * MATRIX_FONT > h && Math.random() > 0.97 ? 0 : y + 1;
        });
    });
}
