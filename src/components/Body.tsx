import Title from './Title';
import { Container, Item, Label } from 'semantic-ui-react';
import { ReactComponent as PebbleWatchface } from '../images/pebble.svg';
import areTheyGoodLogo from '../images/aretheygoodlogo.png'

const Body = () => {
	return (
		<div className="wrapper">
			<Container text textAlign='justified' className="margin-bottom-50">
				<Title name="about" iconName="info circle" />
				<p className="section-paragraph">
					A web developer	with a passion for creating cutting-edge sites and stunning designs. When away from the computer, you can either find me enjoying the outdoors kayaking or planning my next hike. Feel free to send <a href="mailto:tdayley@gmail.com">me</a> an email should you have any questions or want to connect!
				</p>
			</Container>
			<Container text textAlign='justified' className="margin-bottom-50">
				<Title name="projects" iconName="clipboard list" />
				<Item.Group>
					<Item>
						<Item.Image size="medium">
							<PebbleWatchface />
						</Item.Image>
						<Item.Content>
							<Item.Header as="a" href="https://github.com/tdayley/Pebble" target="_blank" rel="noreferrer">
								Pebble Watchface
							</Item.Header>
							<Item.Meta content="2016" />
							<Item.Extra>
								<Label icon="ban" content="Deprecated" />
								<Label icon="code" content="C" />
								<Label icon="js" content="JavaScript" />
							</Item.Extra>
							<Item.Description>
								<p className="section-paragraph">
									A Pebble watchface for the original Pebble Steel. It uses the <a href="https://openweathermap.org/" target="_blank" rel="noreferrer" className="clearly-a-link">OpenWeatherMap API</a> to display an up to date temperature right on your watchface. Also created a custom time display that shows the date, time, and battery. This is a lot of random text that I am using to test whether adding a lot of text would make this set up look weird or not.
								</p>
							</Item.Description>
						</Item.Content>
					</Item>
					<Item>
						<Item.Image src={areTheyGoodLogo} size="medium" alt="Are they good..." circular />
						<Item.Content>
							<Item.Header as="a" href="https://github.com/tdayley/AreTheyGood" target="_blank" rel="noreferrer">
								Are they good...
							</Item.Header>
							<Item.Meta content="2017" />
							<Item.Extra>
								<Label icon="ban" content="Deprecated" />
								<Label icon="php" content="PHP" />
								<Label icon="html5" content="HTML" />
								<Label icon="css3 alternate" content="CSS" />
								<Label icon="js" content="JavaScript" />
							</Item.Extra>
							<Item.Description>
								<p className="section-paragraph">
									This is a project I created for the RIOT Games API 2016 Challenge. It uses the <a href="https://developer.riotgames.com/" target="_blank" rel="noreferrer" className="clearly-a-link" >League of Legends API</a> to grab information of a summoner and give detailed information of their best champions.
								</p>
							</Item.Description>
						</Item.Content>
					</Item>
				</Item.Group>
			</Container>
			<Container text className="margin-bottom-50">
				<Title name="contact" iconName="mail" />
				<form
					className="js-contact-form"
					action="send_message.php"
					method="POST"
				>
					<div className="td-form-group">
						<label className="td-form-label">Name</label>
						<input
							className="td-form-control"
							type="text"
							name="queryName"
							placeholder="Your name, optional of course"
						/>
					</div>
					<div className="td-form-group">
						<label className="td-form-label">Email</label>
						<input
							className="td-form-control"
							type="text"
							name="queryEmail"
							placeholder="Your email, if you want a reply...no pressure"
						/>
					</div>
					<div className="td-form-group">
						<label className="td-form-label">Message</label>
						<textarea
							className="td-form-control"
							name="queryMessage"
							placeholder="Questions, comments, concerns, or just a spam message"
						></textarea>
					</div>
					<div
						data-ajax-id="recaptcha"
						className="g-recaptcha captcha"
						data-sitekey="6Lcu2CgTAAAAALewVa9yUheif1I0vx_wLYZPELp5"
					></div>
					<button className="td-form-button" type="submit">
						Send
					</button>
				</form>
			</Container>
		</div>
	);
};

export default Body;
