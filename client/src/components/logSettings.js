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
import Form from 'react-bootstrap/Form'

import * as types from '../actions/actionTypes';
import Switch from "react-switch";
import * as actions from '../actions/applicationActions'
import LogSearchSettings from './logSearchSettings'


export class LogSettings extends Component {

    constructor(props) {
        super(props);
        this.state = {tail: false};
      
        this.handleClearLogs = this.handleClearLogs.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this.handleRemove = this.handleRemove.bind(this);
        this.handleRemoveNo = this.handleRemoveNo.bind(this);
        this.handleRemoveYes = this.handleRemoveYes.bind(this);
        this.handleGoToNextFile = this.handleGoToNextFile.bind(this);
        this.handleGoToPrevFile = this.handleGoToPrevFile.bind(this);
        this.handleSwitch = this.handleSwitch.bind(this);
       
    }
   
    handleClearLogs(){
        this.props.clearLogs(this.props.monitoringLogSet.Id);
    }

    handleReset(){
        this.props.resetApp(this.props.monitoringLogSet);
    }

    handleRemove(){
        this.setState({'stopMonitoringLogSet' : true});
    }

    handleRemoveNo(){
        this.setState({'stopMonitoringLogSet' : false});
    }
    handleRemoveYes(){
        this.setState({'stopMonitoringLogSet' : false});
        this.props.stopMonitoring(this.props.monitoringLogSet.Id);
    }
    handleGoToNextFile(){
        this.props.goToNextFile(this.props.monitoringLogSet)
    }
    handleGoToPrevFile(){
        console.log("Go to previous file clicked");
        this.props.goToPrevFile(this.props.monitoringLogSet)
    }


    handleSwitch(state) {
        this.state.tail = state
        if(state){
            this.props.startTail(this.props.monitoringLogSet.Id);
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.monitoringLogSet);
        }else{
            this.props.stopTail(this.props.monitoringLogSet.Id);
        }
    }

    componentDidUpdate(){
        if(this.props.monitoringLogSet.tail && !this.state.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.monitoringLogSet);
        }
        /*
        if(this.props.monitoringLogSet.openSearch){
            let node = ReactDOM.findDOMNode(this.refs.inputNode);
            if (node && node.focus instanceof Function) {
                node.focus();
            }
            this.props.openSearchDone();
        }
        */
    }

    componentDidMount(){
		if(this.props.monitoringLogSet.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.monitoringLogSet);
        }
    }

    continueTail(monitoringLogSet){
        this.setState({tail: true});
        if(this.state.tailStartLogsLinesCount === undefined){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
        }
        if((this.props.logsCount - this.state.tailStartLogsLinesCount) >= 200){
            this.props.stopTail(monitoringLogSet.Id);
            this.setState({tail: false});
            return;
        }else{
            this.props.getMoreLogs(monitoringLogSet);
            setTimeout(() => {
                if(this.props.monitoringLogSet.tail){
                    this.continueTail(monitoringLogSet);
                }
            }, 100);
        }
        
    }
   
    render(){
        let modalDialog = '';
        if(this.state.stopMonitoringLogSet){
            modalDialog  =  (
            <Modal show={this.state.stopMonitoringLogSet} onHide={this.handleRemoveNo} centered>
            <Modal.Header closeButton>
            <Modal.Title><div style={{color:'black'}}>Confirmation</div></Modal.Title>
            </Modal.Header>
            <Modal.Body><div style={{color:'black'}}>Stop Monitoring LogSet {this.props.monitoringLogSet.Name} ?</div></Modal.Body>
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
                    <div style={{paddingRight: '0.5rem', borderRight: 'yellow 1px dashed', display: 'flex'}}>
                        <InputGroup size="sm">
                            <Button variant="outline-warning" size="sm" onClick={this.handleGoToPrevFile}>◀</Button>
                            <InputGroup.Prepend>
                                <InputGroup.Text id="file">File: {this.props.monitoringLogSet.currentFile}</InputGroup.Text>
                            </InputGroup.Prepend>
                           <Button variant="outline-warning" size="sm" onClick={this.handleGoToNextFile}>▶</Button>
                        </InputGroup>
                    </div>
                    {/*
                    <div style={{paddingLeft: '0.5rem', paddingRight: '0.5rem'}}><b>Tail:</b></div>
                    <Switch
                        checked={this.props.monitoringLogSet.tail}
                        onChange={this.handleSwitch}
                        onColor="#86d3ff"
                        onHandleColor="#2693e6"
                        handleDiameter={26}
                        uncheckedIcon={false}
                        checkedIcon={false}
                        boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                        activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                        height={16}
                        width={40}
                        className="react-switch"
                        id="material-switch"
                    />
                    */}
                    <div style={{marginLeft: '0.5rem', marginRight: '1.0rem'}}>
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
                <LogSearchSettings monitoringLogSet={this.props.monitoringLogSet}  logsCount={this.props.monitoringLogSet.logsCount} view={this.props.view}/>
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
        clearLogs: (logsetId) => {dispatch({type: types.CLEAR_LOGS, payload:{'id': logsetId}});},
        resetApp: (monitoringLogSet) => {dispatch(actions.resetApp(monitoringLogSet));},
        stopMonitoring: (logsetId) => { dispatch({type: types.STOP_MONITORING, payload: {'id':logsetId}});},

        startTail: (logsetId) => { dispatch({type: types.START_TAIL, payload: {'id':logsetId}});},
        stopTail: (logsetId) => { dispatch({type: types.STOP_TAIL, payload: {'id':logsetId}});},
        getMoreLogs: (monitoringLogSet)  => {dispatch(actions.getMoreLogs(monitoringLogSet, 'down'));},
        goToPrevFile: (monitoringLogSet) => {dispatch(actions.navigateToFile(monitoringLogSet, 'prev'));},
        goToNextFile: (monitoringLogSet) => {dispatch(actions.navigateToFile(monitoringLogSet, 'next'));}
  	};
};


export default connect(mapStateToProps, mapDispatchToProps)(LogSettings);