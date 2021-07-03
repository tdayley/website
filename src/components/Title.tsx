import PropTypes from 'prop-types';
import { Header, Icon, SemanticICONS } from 'semantic-ui-react';

type Props = {
	name: string;
	iconName: SemanticICONS;
};

const Title = ({ name, iconName }: Props) => {
	return (
		<Header as="h2" dividing>
			{iconName ? <Icon name={iconName} /> : null}
			{name}
		</Header>
	);
};

Title.defaultProps = {
	name: 'Section'
};

Title.propTypes = {
	name: PropTypes.string.isRequired
};

export default Title;
