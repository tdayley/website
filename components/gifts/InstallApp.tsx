'use client';

import { useRef, useSyncExternalStore } from 'react';
import { installMode, promptInstall, subscribe } from '@/lib/install-prompt';

// Loaded on every Secret Santa page (from the layout) so the browser's install event is
// caught wherever someone lands. Shows nothing.
export function InstallCapture() {
	useSyncExternalStore(subscribe, installMode, () => 'none' as const);
	return null;
}

// "Install app" on the home page. Hidden when the app is already installed or the
// browser can't install sites.
export default function InstallApp() {
	const mode = useSyncExternalStore(subscribe, installMode, () => 'none' as const);
	const dialog = useRef<HTMLDialogElement>(null);
	if (mode === 'none') return null;

	return (
		<section className="gx-section install-app">
			<div className="gx-card install-card">
				<span className="install-icon" aria-hidden="true">
					📲
				</span>
				<div className="install-text">
					<h2 className="gx-h3">Put Secret Santa on your home screen</h2>
					<p className="gx-muted gx-small">It opens like an app, with no address bar to type in.</p>
				</div>
				<button type="button" className="gx-btn gx-btn--small" onClick={() => (mode === 'prompt' ? promptInstall() : dialog.current?.showModal())}>
					Install app
				</button>
			</div>
			<dialog
				ref={dialog}
				className="gx-dialog"
				onClick={(e) => {
					if (e.target === dialog.current) dialog.current?.close();
				}}
			>
				<h2 className="gx-h2">Add to your home screen</h2>
				<ol className="install-steps">
					<li>
						Tap the <strong>Share</strong> button{' '}
						<svg className="share-glyph" viewBox="0 0 24 24" aria-hidden="true">
							<path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
						</svg>{' '}
						(at the bottom of Safari, or the top in other browsers).
					</li>
					<li>
						Scroll down and tap <strong>Add to Home Screen</strong>.
					</li>
					<li>
						Tap <strong>Add</strong>.
					</li>
				</ol>
				<p className="gx-muted gx-small">You may need to sign in once more the first time you open it from the home screen.</p>
				<div className="gx-row-actions">
					<button type="button" className="gx-btn gx-btn--small" onClick={() => dialog.current?.close()}>
						Got it
					</button>
				</div>
			</dialog>
		</section>
	);
}
