import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'

import * as types from '../actions/actionTypes';
import MonitoringAppLogList from './monitoringAppLogList'
import * as actions from '../actions/applicationActions'

export class MonitoringDirSettings extends Component {

	constructor(props) {
        super(props);
        this.selectLogDir = this.selectLogDir.bind(this);
        this.handleClearLogs = this.handleClearLogs.bind(this);
        this.toggleDisplaySettings = this.toggleDisplaySettings.bind(this);
        this.state =  {displaySettings:false};
	}

    selectLogDir(){
        this.props.selectApp(this.props.appId);
    }

    handleClearLogs(){
        this.props.clearLogs(this.props.appId);
    }

    toggleDisplaySettings(){
        console.log("DisplaySettings state: " + this.state);
        this.setState({'displaySettings': !this.state.displaySettings});
    }
	componentDidMount(){
		
	}

	render() {
        let backgroundColor = 'white';
        let settingsContent = '';
        if(this.props.appId === this.props.activeAppId){
            backgroundColor = 'lightblue'
        }
        console.log("Before render DisplaySettings state: " + this.state);
        if(this.state.displaySettings){
            settingsContent = ( <div style={{ display:'flex', border:'1px dashed black', padding:'2px',borderRadius:'0.0rem 0.0rem .2rem.2rem', marginBottom:'2px'}}>
            <Button variant="danger" size="sm" onClick={this.handleClearLogs} style={{marginRight:'10px'}}>Clear</Button>
            </div>)
        }


		return (
            <div>
            <div>
                <div >
                    <div style={{display:'flex', border:'2px solid black', marginTop:'10px',  borderRadius:'.2rem', padding:'2px', cursor:'pointer', background:backgroundColor}}>
                        <div style={{flexGrow:'1'}} onClick={(e) => this.selectLogDir()}>{this.props.appName}</div>
                        <div style={{padding:'2px', color:'darkblack'}} onClick={(e) => this.toggleDisplaySettings()}>{'🛠'}</div>
                    </div>
                </div>
                
            </div>
            {settingsContent}
            </div>
       );
	}
}

const mapStateToProps = state => {
	return {
        activeAppId: state.application.activeAppId
	};
};

const mapDispatchToProps = dispatch => {
	return {
        selectApp:(appId) => { dispatch({type: types.SELECT_APP, payload: {'id':appId}});},
        clearLogs: (appId) => {dispatch({type: types.CLEAR_LOGS, payload:{'id': appId}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(MonitoringDirSettings);
