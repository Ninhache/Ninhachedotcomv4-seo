export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isInViewport(el: HTMLElement): Boolean {
	if (el === null) return false;
	const rect = el.getBoundingClientRect();

	return rect.bottom >= 0 && rect.top <= (window.innerHeight || document.documentElement.clientHeight);
}