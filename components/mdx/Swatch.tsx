import { BLUE } from './tokens';

/**
 * Color math backing `<Swatch>`/`<DeltaE>`: sRGB hex -> linear light -> CIE
 * XYZ (D65) -> CIELAB, then CIE76 (euclidean Lab distance) for ΔE. CIEDE2000
 * would be perceptually more accurate (weights hue/chroma non-uniformly) but
 * is overkill for illustrating "two hex codes, one perceptual gap" here.
 */
type Lab = [number, number, number];

/** Parse `#rgb`/`#rrggbb` into r, g, b channels in [0, 1]. */
function hexToRgb(hex: string): [number, number, number] {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    const h = m ? m[1] : '000000';
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map(c => c + c)
                  .join('')
            : h;
    const n = Number.parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** sRGB -> linear-light, per channel (IEC 61966-2-1). */
function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear sRGB -> CIE XYZ, D65 primaries. */
function linearToXyz(
    r: number,
    g: number,
    b: number
): [number, number, number] {
    return [
        0.4124 * r + 0.3576 * g + 0.1805 * b,
        0.2126 * r + 0.7152 * g + 0.0722 * b,
        0.0193 * r + 0.1192 * g + 0.9505 * b,
    ];
}

// D65 reference white.
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;

function labF(t: number): number {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

/** CIE XYZ -> CIELAB, D65 white point. */
function xyzToLab(x: number, y: number, z: number): Lab {
    const fx = labF(x / XN);
    const fy = labF(y / YN);
    const fz = labF(z / ZN);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** `#rgb`/`#rrggbb` -> CIELAB triplet. */
function hexToLab(hex: string): Lab {
    const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
    const [x, y, z] = linearToXyz(r, g, b);
    return xyzToLab(x, y, z);
}

/** CIE76 ΔE: euclidean distance between two Lab colors. */
function deltaE76(labA: Lab, labB: Lab): number {
    return Math.hypot(labA[0] - labB[0], labA[1] - labB[1], labA[2] - labB[2]);
}

/** Rule-of-thumb reading of a CIE76 ΔE value, in French (article's language). */
function interpretDeltaE(de: number): string {
    if (de < 1) return 'imperceptible';
    if (de < 2) return 'à peine perceptible';
    if (de < 10) return 'perceptible';
    if (de < 50) return 'franchement différent';
    return 'opposé';
}

/**
 * MDX `<Swatch>` - a color chip: a rounded square filled with `hex` next to a
 * caption showing the hex code and its CIELAB triplet (rounded to integers).
 * `lab` can be passed in to reuse an already-computed triplet (see
 * `<DeltaE>`); otherwise it's derived from `hex`. Presentational.
 */
export function Swatch({
    hex,
    lab,
    label,
}: {
    hex: string;
    lab?: Lab;
    label?: string;
}) {
    const l = lab ?? hexToLab(hex);
    return (
        <div className="not-prose my-3 flex items-center gap-3">
            <span
                className="h-10 w-10 shrink-0 rounded-xl border border-border"
                style={{ backgroundColor: hex }}
                aria-hidden="true"
            />
            <div className="flex flex-col text-sm">
                {label && <span className="font-semibold">{label}</span>}
                <span className="text-muted-foreground">
                    {hex} · L {Math.round(l[0])} a {Math.round(l[1])} b{' '}
                    {Math.round(l[2])}
                </span>
            </div>
        </div>
    );
}

/**
 * MDX `<DeltaE>` - two swatches (`a`, `b`, hex strings) side by side with
 * their CIE76 ΔE and a one-line reading of how perceptible the gap is. The
 * demo behind "two hex codes can be numerically close but perceptually far".
 */
export function DeltaE({ a, b }: { a: string; b: string }) {
    const labA = hexToLab(a);
    const labB = hexToLab(b);
    const de = deltaE76(labA, labB);
    return (
        <div className="not-prose my-6 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-6">
                <Swatch hex={a} lab={labA} label="A" />
                <Swatch hex={b} lab={labB} label="B" />
                <div className="ml-auto text-right">
                    <div className="font-bold text-2xl" style={{ color: BLUE }}>
                        ΔE {de.toFixed(1)}
                    </div>
                    <div className="text-muted-foreground text-sm">
                        {interpretDeltaE(de)}
                    </div>
                </div>
            </div>
        </div>
    );
}
