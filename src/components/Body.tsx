import Title from './Title';
import { Container, Segment } from 'semantic-ui-react';
import { ReactComponent as PebbleWatchface } from '../images/pebble.svg';

const Body = () => {
	return (
		<div className="wrapper">
			<Container text className="margin-bottom-50">
				<Title name="about" iconName="info circle" />
				<p>
					Hello! My name is Tim and you are on my website. Since this is the
					about section, I guess I should let you know that I am a web developer
					with a passion for creating cutting-edge sites and stunning designs.
					When I am away from the computer, you can either find me enjoying the
					outdoors or getting back on the computer. Feel free to send{' '}
					<a href="mailto:tdayley@gmail.com">me</a> an email should you have any
					questions.
				</p>
			</Container>
			<Container text className="margin-bottom-50">
				<Title name="projects" iconName="clipboard list" />
				<Container>
					<Segment>
						<PebbleWatchface
							href="https://apps.getpebble.com/en_US/application/55ac922477eb5ef7ab000048?section=watchfaces"
							target="_blank"
						/>
						{/* <div id="svg-container">
                            <a href="https://apps.getpebble.com/en_US/application/55ac922477eb5ef7ab000048?section=watchfaces" target="_blank">
                                <PebbleWatchface className='' />
                            </a>
                        </div> */}
						<h3>
							<a
								href="https://apps.getpebble.com/en_US/application/55ac922477eb5ef7ab000048?section=watchfaces"
								target="_blank"
								rel="noreferrer"
							>
								Pebble Watchface
							</a>
						</h3>
						<p className="section-paragraph">
							A Pebble watchface for the original Pebble Steel. It uses the
							<a
								href="https://openweathermap.org/"
								target="_blank"
								rel="noreferrer"
								className="clearly-a-link"
							>
								OpenWeatherMap API
							</a>{' '}
							to display an up to date (synced every 5 minutes) temperature
							right on your watchface. Also created a custom time display that
							shows the date, time, and battery.
						</p>
					</Segment>
				</Container>
				<Container>
					<div>
						<h3>
							<a
								href="http://aretheygood.timdayley.com"
								target="_blank"
								rel="noreferrer"
							>
								Are they good...
							</a>
						</h3>
						<p className="section-paragraph">
							This is a project I created for the RIOT Games API 2016 Challenge.
							It uses the
							<a
								href="https://developer.riotgames.com/"
								target="_blank"
								rel="noreferrer"
								className="clearly-a-link"
							>
								League of Legends API
							</a>{' '}
							to grab information of a summoner and give detailed information of
							their best champions.
						</p>
					</div>
					<div className="col-lg-4 col-md-4 col-sm-12 col-xs-12">
						<img
							className="project-image"
							src="../images/aretheygoodlogo.png"
							alt="Are they good..."
						/>
					</div>
				</Container>
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
