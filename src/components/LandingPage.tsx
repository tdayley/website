import { Icon } from 'semantic-ui-react';
import { ReactComponent as Signature } from '../images/signature.svg';

const Header = () => {
	return (
		<div className="fill">
			<Signature className="signature-padding" />
			<Icon name="arrow down" size="big" className="splash-arrow" />
		</div>
	);
};

export default Header;
