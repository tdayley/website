type Props = {
	name?: string;
	iconName?: string;
};

const Title = ({ name = 'Section', iconName }: Props) => {
	return (
		<h2 className="ui dividing header">
			{iconName ? <i aria-hidden="true" className={`${iconName} icon`}></i> : null}
			{name}
		</h2>
	);
};

export default Title;
