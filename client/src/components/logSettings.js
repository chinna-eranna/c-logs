import { Component } from 'react';
import React from "react";
import ReactDOM from "react-dom";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Modal from 'react-bootstrap/Modal'

import * as types from '../actions/actionTypes';
import Switch from "react-switch";
import * as actions from '../actions/applicationActions'
import LogSearchSettings from './logSearchSettings'
import styles from '../css/app.css';


export class LogSettings extends Component {

    constructor(props) {
        super(props);
        this.state = {tail: false};
      
        this.handleClearLogs = this.handleClearLogs.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this.handleRemove = this.handleRemove.bind(this);
        this.handleRemoveNo = this.handleRemoveNo.bind(this);
        this.handleRemoveYes = this.handleRemoveYes.bind(this);

        this.handleSwitch = this.handleSwitch.bind(this);
       
    }
   
    handleClearLogs(){
        this.props.clearLogs(this.props.app.Id);
    }

    handleReset(){
        this.props.resetApp(this.props.app);
    }

    handleRemove(){
        this.setState({'stopMonitoringApp' : true});
    }

    handleRemoveNo(){
        this.setState({'stopMonitoringApp' : false});
    }
    handleRemoveYes(){
        this.setState({'stopMonitoringApp' : false});
        this.props.stopMonitoring(this.props.app.Id);
    }


    handleSwitch(state) {
        console.log('Tail new state:', state);
        this.state.tail = state
        if(state){
            this.props.startTail(this.props.app.Id);
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }else{
            this.props.stopTail(this.props.app.Id);
        }
    }

    componentDidUpdate(){
        if(this.props.app.tail && !this.state.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }
        /*
        if(this.props.app.openSearch){
            let node = ReactDOM.findDOMNode(this.refs.inputNode);
            if (node && node.focus instanceof Function) {
                node.focus();
            }
            this.props.openSearchDone();
        }
        */
    }

    componentDidMount(){
		if(this.props.app.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }
    }

    continueTail(app){
        this.setState({tail: true});
        if(this.state.tailStartLogsLinesCount === undefined){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
        }
        console.log("props.logsCount : " + this.props.logsCount + " : this.state.tailStartLogsLinesCount - " + this.state.tailStartLogsLinesCount);
        if((this.props.logsCount - this.state.tailStartLogsLinesCount) >= 200){
            console.log("Stopping the trail");
            this.props.stopTail(app.Id);
            this.setState({tail: false});
            return;
        }else{
            this.props.getMoreLogs(app);
            setTimeout(() => {
                if(this.props.app.tail){
                    this.continueTail(app);
                }
            }, 100);
        }
        
    }
   
    render(){
        console.log("Render on LogSettings is invoked");
        let modalDialog = '';
        if(this.state.stopMonitoringApp){
            modalDialog  =  (
            <Modal show={this.state.stopMonitoringApp} onHide={this.handleRemoveNo} centered>
            <Modal.Header closeButton>
            <Modal.Title><div style={{color:'black'}}>Confirmation</div></Modal.Title>
            </Modal.Header>
            <Modal.Body><div style={{color:'black'}}>Stop Monitoring Application {this.props.app.Name} ?</div></Modal.Body>
            <Modal.Footer>
            <Button variant="danger" size="sm" onClick={this.handleRemoveNo}>
                No
            </Button>
            <Button variant="success" size="sm" onClick={this.handleRemoveYes}>
                Yes
            </Button>
            </Modal.Footer>
        </Modal>
            )
        }
        let tailAndActionsContent = '';
        if(this.props.view  === 'logs'){
            tailAndActionsContent = (
                <div style={{marginLeft: 'auto', display:'flex'}}>
                    <div style={{paddingRight: '0.5rem'}}>Tail :</div>
                    <Switch
                        checked={this.props.app.tail}
                        onChange={this.handleSwitch}
                        onColor="#86d3ff"
                        onHandleColor="#2693e6"
                        handleDiameter={30}
                        uncheckedIcon={false}
                        checkedIcon={false}
                        boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                        activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                        height={20}
                        width={48}
                        className="react-switch"
                        id="material-switch"
                    />
                    <div style={{marginRight: '1.0rem'}}>
                        <InputGroup size="sm">
                            <InputGroup.Prepend>
                                <InputGroup.Text id="basic-addon1">Actions</InputGroup.Text>
                            </InputGroup.Prepend>
                            <DropdownButton size="sm" variant="outline-warning" id="dropdown-basic-button" title="-Choose Action-">
                                <Dropdown.Item onClick={this.handleClearLogs}>Clear Logs</Dropdown.Item>
                                <Dropdown.Item onClick={this.handleRemove}>Remove</Dropdown.Item>
                                <Dropdown.Item onClick={this.handleReset}>Reset</Dropdown.Item>
                            </DropdownButton>
                        </InputGroup>
                    </div>
                </div>
            )
        }
        
        return (
        <div style={{border:'1px dashed black', padding:'0.3rem',borderRadius:'0.0rem 0.0rem .2rem.2rem', marginBottom:'2px', borderColor:'yellow'}}>
            <div style={{display:'flex'}}>
                <LogSearchSettings app={this.props.app}  logsCount={this.props.app.logsCount} view={this.props.view}/>
                {tailAndActionsContent}
            </div>
            {modalDialog}
        </div>
        );
    }
}

const mapStateToProps = state => {
	return {
   };
};

const mapDispatchToProps = dispatch => {
	return {
        clearLogs: (appId) => {dispatch({type: types.CLEAR_LOGS, payload:{'id': appId}});},
        resetApp: (app) => {dispatch(actions.resetApp(app));},
        stopMonitoring: (appId) => { dispatch({type: types.STOP_MONITORING, payload: {'id':appId}});},

        startTail: (appId) => { dispatch({type: types.START_TAIL, payload: {'id':appId}});},
        stopTail: (appId) => { dispatch({type: types.STOP_TAIL, payload: {'id':appId}});},
        getMoreLogs: (app)  => {dispatch(actions.getMoreLogs(app));},
  	};
};


export default connect(mapStateToProps, mapDispatchToProps)(LogSettings);