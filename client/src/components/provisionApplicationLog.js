import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import * as types from '../actions/actionTypes';
import * as actions from '../actions/applicationActions'


export class AddNewApplicationLog extends Component {
    constructor(props){
        super(props);
        this.handleApplicationLogNameChange = this.handleApplicationLogNameChange.bind(this);
        this.handleApplicationLogDirChange = this.handleApplicationLogDirChange.bind(this);
        this.handleApplicationLogFilePatternChange = this.handleApplicationLogFilePatternChange.bind(this);
        this.saveApplicationLogHandler = this.saveApplicationLogHandler.bind(this);
        this.applicationLogName = '';
        this.applicationDirName = '';
        this.applicationLogFilePattern = '';
        if(this.props.editAppId){
            console.log("EditAppID:  "+ this.props.editAppId);
            const appLogToEdit = this.props.availableApps.filter((appLog) => {
                    console.log("AppLog: " + JSON.stringify(appLog));
                    return appLog.Id === this.props.editAppId;
                });
            console.log("Log Directory to edit:"  + JSON.stringify(appLogToEdit));
            if(appLogToEdit.length > 0){
                this.state  = {applicationLogName: appLogToEdit[0].Name, applicationDirName: appLogToEdit[0].Directory, applicationLogFilePattern: appLogToEdit[0].LogFilePattern}
            }else{
                console.log("Application Log directory requested to edit was not found");
            }
        }else{
            this.state =  {applicationLogName: '', applicationDirName: '', applicationLogFilePattern:''}
        }
    }

    handleApplicationLogNameChange(event){
        this.setState({applicationLogName:event.target.value})
        console.log("ApplicationLogName:"  + event.target.value);
    }
    handleApplicationLogDirChange(event){
        this.setState({applicationDirName:event.target.value})
        console.log("applicationDirName:"  + event.target.value);
    }
    handleApplicationLogFilePatternChange(event){
        this.setState({applicationLogFilePattern:event.target.value})
        console.log("applicationLogFilePattern:"  + event.target.value);
    }
    saveApplicationLogHandler(){
        if(this.props.editAppId){
            this.props.saveApplicationLog(this.props.editAppId, this.state.applicationLogName, this.state.applicationDirName, this.state.applicationLogFilePattern);
        }else{
            this.props.addNewApplicationLog(this.state.applicationLogName, this.state.applicationDirName, this.state.applicationLogFilePattern);
        }
    }

    render() {
        return (
            <Modal show={true} onHide={this.props.closeHandler}
            size="lg"
            aria-labelledby="contained-modal-title-vcenter"
            centered
        >
            <Modal.Header closeButton>
                <Modal.Title id="contained-modal-title-vcenter">
                    <div style={{color: 'black'}}>Application Log</div>
                  </Modal.Title>
            </Modal.Header>
            <Modal.Body>
            <div style={{color: 'black'}}>
                <Form.Group as={Row} controlId="applicationLogName">
                    <Form.Label column sm="3">Name</Form.Label>
                    <Col sm="4">
                        <Form.Control type="text" name="applicationLogName" value={this.state.applicationLogName} onChange={(e) => this.handleApplicationLogNameChange(e)}/>
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="applicationLogDir">
                    <Form.Label column sm="3">Directory</Form.Label>
                    <Col sm="4">
                        <Form.Control type="text" name="applicationLogDir" value={this.state.applicationDirName} onChange={(e)  => this.handleApplicationLogDirChange(e)}/>
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="applicationLogFilePattern">
                    <Form.Label column sm="3">Log File Pattern</Form.Label>
                    <Col sm="4">
                        <Form.Control type="text" name="applicationLogFilePattern" value={this.state.applicationLogFilePattern}  onChange={(e)  => this.handleApplicationLogFilePatternChange(e)}/>
                    </Col>
                </Form.Group>
            </div>
            </Modal.Body>

            <Modal.Footer>
                <div style={{ display: 'flex' }}>
                    <Button variant="danger" size="sm" style={{ marginRight: '10px' }} onClick={this.props.closeHandler}>Cancel</Button>
                    <Button variant="success" size="sm" onClick={this.saveApplicationLogHandler}>{this.props.editAppId ? 'Save' : 'Add'}</Button>
                </div>
            </Modal.Footer>

        </Modal>
        );
    }
}


const mapStateToProps = state => {
	return {
		availableApps: state.application.availableApps,
	};
};

const mapDispatchToProps = dispatch => {
    return {
        saveApplicationLog: (id, name, logDirectory, logFilePattern) => {dispatch(actions.saveApplicationLog(id, name, logDirectory, logFilePattern))},
        addNewApplicationLog: (name, logDirectory, logFilePattern) => {dispatch(actions.addNewApplicationLog(name, logDirectory, logFilePattern));}
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AddNewApplicationLog);