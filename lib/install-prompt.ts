// Runs in the browser. Keeps track of whether this site can be installed as an app.
//
// Chrome, Edge and Android fire a "beforeinstallprompt" event when a site is installable.
// It only fires once per page load, possibly before the Install button is on screen, so it
// is caught here (this module is loaded on every Secret Santa page) and kept for later.

type InstallEvent = Event & { prompt: () => Promise<unknown>; userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// 'prompt': the browser can show its install prompt.   'ios': iPhone/iPad, which has no prompt.
// 'none': already installed, or this browser can't install sites.
export type InstallMode = 'prompt' | 'ios' | 'none';

let saved: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
	window.addEventListener('beforeinstallprompt', (event) => {
		// The browser may also show its own install pop-up; that's left alone. This
		// just keeps the event so the Install button can open the prompt on request.
		saved = event as InstallEvent;
		notify();
	});
	window.addEventListener('appinstalled', () => {
		saved = null;
		installed = true;
		notify();
	});
}

function runningAsApp() {
	return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos() {
	// iPads report themselves as Macs, but Macs don't have touch screens.
	return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function installMode(): InstallMode {
	if (installed || runningAsApp()) return 'none';
	if (saved) return 'prompt';
	return isIos() ? 'ios' : 'none';
}

// Opens the browser's install prompt. Each saved event can be used once.
export async function promptInstall() {
	const event = saved;
	if (!event) return;
	saved = null;
	try {
		await event.prompt();
		await event.userChoice;
	} catch {
		// The prompt couldn't be shown; nothing else to do.
	}
	notify();
}
