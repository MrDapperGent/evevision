import React, {Component} from 'react';
import {Panel, Typography, WindowButtons} from '../ui/Layout';
import {Button} from '../ui/Input';
import {ipcRenderer, shell} from "electron"
import {updateCharacterPublicInfo} from "../store/characters/actions";
import {AppState} from "../store/rootReducer";
import {connect} from "react-redux";
import {ApiConnectionStatus, ApiState, CharacterEsiAuth, CharacterInfo} from "../store/characters/types";
import superagent from "superagent";
const { version } = require('../package.json');

interface WelcomeProps {
    updateCharacterPublicInfo: typeof updateCharacterPublicInfo;
    character?: CharacterInfo
    characterId: number
    auth?: CharacterEsiAuth
    apiState?: ApiState
}

const allowedAlliances = [
    386292982, // pandemic legion
    99005338, // pandemic horde
    1727758877, // northern coalition
    99008788, // the skeleton crew
    99007707, // damned brotherhood
    933731581, // triumvirate
    99009289, // reckless contingency
    99009310, // veni vidi vici
    99002003, // no value
    99009275, // the stars of northern moon
    1042504553, // slyce
]

interface WelcomeState {
    newVersion?: string // version number if available
}

class Welcome extends Component<WelcomeProps, WelcomeState> {

    versionCheckTimer?: NodeJS.Timeout

    constructor(props: WelcomeProps) {
        super(props)
        this.state = {}
    }

    // honestly this should just be done in the main process but it's all gonna be replaced by an autoupdater anyways
    checkForLatestVersion = () => {
        superagent.get("http://releases.eve.vision.s3-website.us-east-2.amazonaws.com/").then(res => {
            if(res.text !== version) {
                console.log("Latest EveVision version differs", res.text)
                this.setState({newVersion: res.text})
            }
        }).catch((err) => {
            console.error("Failed to retrieve latest EveVision version", err)
        })
    }

    componentDidMount() {
        // go ahead and update this character's data
        this.props.updateCharacterPublicInfo(this.props.characterId);
        document.title = "EveVision " + version
        this.versionCheckTimer = setInterval(this.checkForLatestVersion, 10*60*1000) // every 10 minutes
        this.checkForLatestVersion();
    }

    componentWillUnmount(): void {
        if(this.versionCheckTimer) { clearInterval(this.versionCheckTimer) }
    }

    apiStateText() {
        if(this.props.apiState === undefined) { return null; }
        switch(this.props.apiState.status) {
            case ApiConnectionStatus.DISCONNECTED: return ""
            case ApiConnectionStatus.CONNECTING: return "Connecting to api.eve.vision"
            case ApiConnectionStatus.CONNECTED: return "Connected to api.eve.vision"
        }
    }
    render() {
        if(this.props.character === undefined || this.props.character.public === undefined) {
            return (<>
                <Panel>
                    <Typography>Loading character info..</Typography>
                </Panel>
                <WindowButtons>
                    <Button onClick={() => {
                        ipcRenderer.send("openWindow", "about");
                    }}>About</Button>
                </WindowButtons>
            </>)
        } else if(!allowedAlliances.includes(this.props.character.public.alliance_id!)) { // basic check, easy to get around but whatever, they get an ingame browser woopteedoo
            return (<>
                <Panel>
                    <h1>Unauthorized!</h1>
                    <h3>Sorry, but {this.props.character.public.name} does not appear to be a member of the PanFam coalition.</h3>
                </Panel>
                <WindowButtons>
                    <Button onClick={() => {
                        ipcRenderer.send("openWindow", "about");
                    }}>About</Button>
                </WindowButtons>
            </>)
        } else {
            return (
                <>
                    <div className={"eve-welcome-bean"}></div>
                    <Panel>
                        <Typography>
                            <h2 style={{textAlign: 'right', marginLeft: '150px'}}>Welcome to EveVision, {this.props.character.public.name}.</h2>
                            <br />
                            <div style={{textAlign: 'right', marginLeft: '150px'}}>{this.props.auth === undefined ? 'You are currently not ESI authorized. You will be unable to use some tools.' : 'ESI successfully authorized'}</div>
                            {this.props.apiState ? <div style={{textAlign: 'right', marginLeft: '150px'}}>{this.apiStateText()}</div> : null}
                            {this.state.newVersion ? <div className={"new-version-alert"} onClick={() => shell.openExternal("https://www.pandemic-horde.org/forum/index.php?threads/evevision-the-eve-ui-you-always-wanted.2540/")}><strong>Version {this.state.newVersion} available!</strong></div> : null}
                        </Typography>
                    </Panel>
                    <WindowButtons>
                        <Button onClick={() => {
                            ipcRenderer.send("openWindow", "externalsite", "https://www.pandemic-horde.org/");
                        }}>Square</Button>
                        <Button onClick={() => {
                            ipcRenderer.send("openWindow", "beanwatch");
                        }}>Beanwatch</Button>
                        <Button onClick={() => {
                            ipcRenderer.send("openWindow", "tools");
                        }}>Tools</Button>
                        <Button onClick={() => {
                            ipcRenderer.send("openWindow", "settings");
                        }}>Settings</Button>
                        <Button onClick={() => {
                            ipcRenderer.send("openWindow", "auth");
                        }}>ESI Authorization</Button>
                        <Button onClick={() => {
                            ipcRenderer.send("openWindow", "about");
                        }}>About</Button>
                    </WindowButtons>
                </>
            );
        }
    }
}

const mapStateToProps = (state: AppState, ownProps: WelcomeProps) => {
    const character = state.characters.characters.find(c => c.id == ownProps.characterId)
    if(character !== undefined) {
        return {character, auth: character.auth, apiState: character.apiState}
    } else {
        return {}
    }
}

export default connect(
    mapStateToProps,
    {updateCharacterPublicInfo: updateCharacterPublicInfo}
)(Welcome)