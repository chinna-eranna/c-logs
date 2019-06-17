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
import Switch from "react-switch";
import MonitoringAppLogList from './monitoringAppLogList'
import * as actions from '../actions/applicationActions'

export class MonitoringDirSettings extends Component {

	constructor(props) {
        super(props);
        this.selectLogDir = this.selectLogDir.bind(this);
        this.handleClearLogs = this.handleClearLogs.bind(this);
        this.toggleDisplaySettings = this.toggleDisplaySettings.bind(this);
        this.handleSwitch = this.handleSwitch.bind(this);
        this.continueTail = this.continueTail.bind(this);
   }

    selectLogDir(){
        this.props.selectApp(this.props.app.Id);
    }

    handleClearLogs(){
        this.props.clearLogs(this.props.app.Id);
    }

    handleSwitch(state) {
        console.log('Tail new state:', state);
        if(state){
            this.props.startTail(this.props.app.Id);
        }else{
            this.props.stopTail(this.props.app.Id);
        }
      }

    toggleDisplaySettings(){
        console.log("Toggle display settings invoked DisplaySettings ");
        if(this.props.app.displaySettings){
            this.props.hideSettings(this.props.app.Id);
        }else{
            this.props.showSettings(this.props.app.Id);
        }
    }
	componentDidMount(){
		
    }
      
    continueTail(app){
        this.props.tail(app);
    }

	render() {
        let backgroundColor = 'white';
        let settingsContent = '';
        if(this.props.app.Id === this.props.activeAppId){
            backgroundColor = 'lightblue'
        }
        console.log("Before render DisplaySettings Value: ", this.props.app.displaySettings);

        if(this.props.app.tail){
            this.continueTail(this.props.app);
        }

        if(this.props.app.displaySettings){
            settingsContent = ( <div style={{ display:'flex', border:'1px dashed black', padding:'2px',borderRadius:'0.0rem 0.0rem .2rem.2rem', marginBottom:'2px'}}>
            <Button variant="danger" size="sm" onClick={this.handleClearLogs} style={{marginRight:'10px'}}>Clear</Button>
            Tail:   <Switch onChange={this.handleSwitch} checked={this.props.app.tail} />
            </div>)
        }


		return (
            <div>
            <div>
                <div >
                    <div style={{display:'flex', border:'2px solid black', marginTop:'10px',  borderRadius:'.2rem', padding:'2px', cursor:'pointer', background:backgroundColor}}>
                        <div style={{flexGrow:'1'}} onClick={(e) => this.selectLogDir()}>{this.props.app.Name}</div>
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
        clearLogs: (appId) => {dispatch({type: types.CLEAR_LOGS, payload:{'id': appId}});},
        showSettings: (appId) => {dispatch({type: types.TOGGLE_DISPLAY_SETTINGS, payload:{'id': appId, 'displaySettings':true}})},
        hideSettings: (appId) => {dispatch({type: types.TOGGLE_DISPLAY_SETTINGS, payload:{'id': appId, 'displaySettings':false}})},
        tail: (app)  => {dispatch(actions.tailContent(app));},
        startTail: (appId) => { dispatch({type: types.START_TAIL, payload: {'id':appId}});},
        stopTail: (appId) => { dispatch({type: types.STOP_TAIL, payload: {'id':appId}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(MonitoringDirSettings);
