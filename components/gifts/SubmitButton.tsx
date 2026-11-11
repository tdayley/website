'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

// A form's submit button. Shows a spinner while the form is being sent, so a tap always gets a response.
export default function SubmitButton({ className = '', children, label }: { className?: string; children: ReactNode; label?: string }) {
	const { pending } = useFormStatus();
	return (
		<button type="submit" className={`gx-btn ${className}${pending ? ' is-pending' : ''}`} aria-busy={pending} aria-label={label} title={label}>
			{children}
		</button>
	);
}
