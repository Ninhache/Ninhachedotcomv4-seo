import localFont from 'next/font/local';

/**
 * Calibre reserves far more room under the baseline than its glyphs ever use:
 * the file declares an ascent of 0.650em and a descent of 0.350em, while the
 * deepest descender only reaches 0.180em. Every box that centres a line of
 * Calibre therefore centres 0.17em of empty space along with the text, and the
 * label ends up sitting visibly high. It is most obvious on buttons, where the
 * eye has a border to compare against, but it is the same on any centred row.
 *
 * These two descriptors re-declare the em box so that it hugs the ink: 0.82
 * above the baseline (the ascenders reach 0.650, so the block from ascender to
 * baseline lands dead centre) and 0.18 below it (exactly the deepest
 * descender). The sum is left at 1.000, unchanged, and the line gap is
 * untouched, so `line-height: normal` still resolves to the same value and no
 * paragraph changes height. Only the baseline moves inside its line box.
 *
 * Both faces repeat the same two lines because the font loader only accepts
 * literals here, and both carry the same defect anyway: the regular and the
 * semibold ship identical vertical metrics.
 */
export const calibreSemibold = localFont({
    src: '../fonts/calibre/CalibreSemibold.otf',
    display: 'swap',
    declarations: [
        { prop: 'ascent-override', value: '82%' },
        { prop: 'descent-override', value: '18%' },
    ],
});

export const calibreRegular = localFont({
    src: '../fonts/calibre/CalibreRegular.otf',
    display: 'swap',
    declarations: [
        { prop: 'ascent-override', value: '82%' },
        { prop: 'descent-override', value: '18%' },
    ],
});

export const ralewaySemiBold = localFont({
    src: '../fonts/raleway/Raleway-SemiBold.ttf',
    display: 'swap',
});

export const ralewayBold = localFont({
    src: '../fonts/raleway/Raleway-Bold.ttf',
    display: 'swap',
});

export const ralewayMedium = localFont({
    src: '../fonts/raleway/Raleway-Medium.ttf',
    display: 'swap',
});

export const proximaNovaBold = localFont({
    src: '../fonts/proxima_nova/ProximaNovaBold.otf',
    display: 'swap',
});

export const proximaNovaSemiBold = localFont({
    src: '../fonts/proxima_nova/ProximaNovaSemibold.otf',
    display: 'swap',
});
