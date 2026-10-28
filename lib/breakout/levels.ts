/**
 * The Breakout levels of the 404 page: each one spells an HTTP status code in
 * bricks. See `docs/specs/fun-layer.md` § 2.1.
 */

/** Logical size of the playfield. The canvas scales it, the physics never sees pixels. */
export const WORLD_W = 480;
export const WORLD_H = 640;

/**
 * One lit pixel of the digit font is one column by two rows of bricks, so a
 * 3-digit code is an 11x10 grid. Wide bricks keep a clear around a minute: a
 * 2x2 split read better but took three.
 */
const ROWS_PER_PIXEL = 2;
const GRID_COLS = 11;
const MARGIN_X = 20;
const TOP = 72;
export const BRICK_W = (WORLD_W - 2 * MARGIN_X) / GRID_COLS;
export const BRICK_H = 14;

export type BrickKind = 'normal' | 'tough' | 'steel';

export type BrickSpec = {
    x: number;
    y: number;
    w: number;
    h: number;
    kind: BrickKind;
};

/**
 * `flicker` and `sway` are the 500 and 418 twists. They change how the level
 * reads, never what counts as a clear.
 */
export type LevelEffect = 'none' | 'flicker' | 'sway';

export type Level = {
    code: StatusCode;
    effect: LevelEffect;
    bricks: BrickSpec[];
};

/** Play order. A clear unlocks the next one. */
export const LEVEL_CODES = [404, 500, 403, 429, 418] as const;
export type StatusCode = (typeof LEVEL_CODES)[number];

export function isStatusCode(value: number): value is StatusCode {
    return (LEVEL_CODES as readonly number[]).includes(value);
}

/** 3x5 digits, one string per row, `#` lit. */
const DIGITS: Record<string, string[]> = {
    '0': ['###', '#.#', '#.#', '#.#', '###'],
    '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['###', '..#', '###', '#..', '###'],
    '3': ['###', '..#', '.##', '..#', '###'],
    '4': ['#.#', '#.#', '###', '..#', '..#'],
    '5': ['###', '#..', '###', '..#', '###'],
    '6': ['###', '#..', '###', '#.#', '###'],
    '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'],
    '9': ['###', '#.#', '###', '..#', '###'],
};

/** Columns of the brick grid left open in the 403 steel floor: the only ways up. */
const STEEL_GAPS = new Set([2, 8]);

function brickAt(col: number, row: number, kind: BrickKind): BrickSpec {
    return {
        x: MARGIN_X + col * BRICK_W,
        y: TOP + row * BRICK_H,
        w: BRICK_W,
        h: BRICK_H,
        kind,
    };
}

/** The bricks spelling `code`, plus whatever twist that code carries. */
export function levelFor(code: StatusCode): Level {
    const text = String(code);
    const kind: BrickKind = code === 429 ? 'tough' : 'normal';
    const bricks: BrickSpec[] = [];

    for (let d = 0; d < text.length; d++) {
        const glyph = DIGITS[text[d]];
        // Each digit is 3 font columns wide plus one blank column between digits.
        const fontCol0 = d * 4;
        glyph.forEach((line, fy) => {
            for (let fx = 0; fx < line.length; fx++) {
                if (line[fx] !== '#') continue;
                for (let by = 0; by < ROWS_PER_PIXEL; by++) {
                    bricks.push(
                        brickAt(fontCol0 + fx, fy * ROWS_PER_PIXEL + by, kind)
                    );
                }
            }
        });
    }

    if (code === 403) {
        // A forbidden floor one row under the digits.
        const row = 5 * ROWS_PER_PIXEL + 1;
        for (let col = 0; col < GRID_COLS; col++) {
            if (!STEEL_GAPS.has(col)) bricks.push(brickAt(col, row, 'steel'));
        }
    }

    const effect: LevelEffect =
        code === 500 ? 'flicker' : code === 418 ? 'sway' : 'none';
    return { code, effect, bricks };
}
