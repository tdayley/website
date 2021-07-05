import { Icon, Image } from 'semantic-ui-react';
import signature from '../images/Signature_v2.png';

const Header = () => {
	return (
		<div className="fill">
			<Image src={signature} center size="huge" />
			<Icon name="arrow down" size="big" className="splash-arrow bounce" />
		</div>
	);
};

export default Header;
