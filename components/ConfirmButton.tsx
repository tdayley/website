'use client';

import type { ReactNode } from 'react';

// A submit button that asks "are you sure?" first.
export default function ConfirmButton({ message, className, label, children }: { message: string; className?: string; label?: string; children: ReactNode }) {
	return (
		<button
			type="submit"
			className={className}
			aria-label={label}
			title={label}
			onClick={(e) => {
				if (!window.confirm(message)) e.preventDefault();
			}}
		>
			{children}
		</button>
	);
}
