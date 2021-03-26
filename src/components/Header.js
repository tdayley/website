import signature from '../images/signature_v1.svg'
import largePortrait from '../images/portrait_v4_large.gif'
import mediumPortrait from '../images/portrait_v4_medium.gif'
import smallPortrait from '../images/portrait_v4_small.gif'

const Header = () => {
    return (
        <div class="fill">
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                        navbar
                    </div>
                </div>
                <div class="row">
                    <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                        <img alt='timdayley' src={signature} width='650' />
                    </div>
                    <div class="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                        <img class="portrait" src={smallPortrait} 
                            srcset={`${largePortrait} 1024w, ${mediumPortrait} 640w, ${smallPortrait} 320w`} alt="human" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Header
