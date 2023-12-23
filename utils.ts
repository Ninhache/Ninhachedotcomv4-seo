export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isInViewport(el: HTMLElement): Boolean {
	if (el === null) return false;
	const rect = el.getBoundingClientRect();

	return rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight);
}

export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}