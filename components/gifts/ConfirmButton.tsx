'use client';

import { useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

type Props = {
	message: string;
	confirmLabel: string;
	className?: string;
	label?: string;
	danger?: boolean;
	children: ReactNode;
};

// A submit button that asks "are you sure?" in a dialog first. Must be inside a <form>.
export default function ConfirmButton({ message, confirmLabel, className = '', label, danger, children }: Props) {
	const dialog = useRef<HTMLDialogElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const { pending } = useFormStatus();

	return (
		<>
			<button
				ref={trigger}
				type="button"
				className={`gx-btn ${className}${pending ? ' is-pending' : ''}`}
				aria-label={label}
				title={label}
				aria-busy={pending}
				onClick={() => dialog.current?.showModal()}
			>
				{children}
			</button>
			<dialog
				ref={dialog}
				className="gx-dialog"
				// Tapping the dimmed area outside the box closes it.
				onClick={(e) => {
					if (e.target === dialog.current) dialog.current?.close();
				}}
			>
				<p>{message}</p>
				<div className="gx-row-actions">
					<button type="button" className="gx-btn gx-btn--ghost gx-btn--small" onClick={() => dialog.current?.close()}>
						Cancel
					</button>
					<button
						type="button"
						className={`gx-btn gx-btn--small${danger ? ' gx-btn--festive' : ''}`}
						onClick={() => {
							dialog.current?.close();
							trigger.current?.form?.requestSubmit();
						}}
					>
						{confirmLabel}
					</button>
				</div>
			</dialog>
		</>
	);
}
