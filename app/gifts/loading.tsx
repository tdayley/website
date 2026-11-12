// Shown instantly while a Secret Santa page loads.
export default function Loading() {
	return (
		<div className="gx-stack" aria-busy="true" aria-label="Loading">
			<div className="gx-skeleton" style={{ height: 40, width: '60%' }} />
			<div className="gx-skeleton" style={{ height: 22, width: '85%' }} />
			<div className="gx-skeleton" style={{ height: 110 }} />
			<div className="gx-skeleton" style={{ height: 110 }} />
		</div>
	);
}
