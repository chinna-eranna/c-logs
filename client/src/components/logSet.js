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


export class LogSet extends Component {
    constructor(props){
        super(props);
        this.handleLogSetNameChange = this.handleLogSetNameChange.bind(this);
        this.handleLogSetDirChange = this.handleLogSetDirChange.bind(this);
        this.handleLogSetFilePatternChange = this.handleLogSetFilePatternChange.bind(this);
        this.saveLogSetHandler = this.saveLogSetHandler.bind(this);
        this.deleteLogSetHandler = this.deleteLogSetHandler.bind(this);
        this.logSetName = '';
        this.logSetDirName = '';
        this.logSetFilePattern = '';
        if(this.props.editLogSetId){
            console.log("editLogSetId:  "+ this.props.editLogSetId);
            const appLogToEdit = this.props.availableLogSets.filter((logSet) => {
                    console.log("LogSet: " + JSON.stringify(logSet));
                    return logSet.Id === this.props.editLogSetId;
                });
            console.log("Log Directory to edit:"  + JSON.stringify(appLogToEdit));
            if(appLogToEdit.length > 0){
                this.state  = {logSetName: appLogToEdit[0].Name, logSetDirName: appLogToEdit[0].Directory, logSetFilePattern: appLogToEdit[0].LogFilePattern}
            }else{
                console.log("LogSet directory requested to edit was not found");
            }
        }else{
            this.state =  {logSetName: '', logSetDirName: '', logSetFilePattern:''}
        }
    }

    handleLogSetNameChange(event){
        this.setState({logSetName:event.target.value})
        console.log("logSetName:"  + event.target.value);
    }
    handleLogSetDirChange(event){
        this.setState({logSetDirName:event.target.value})
        console.log("logSetDirName:"  + event.target.value);
    }
    handleLogSetFilePatternChange(event){
        this.setState({logSetFilePattern:event.target.value})
        console.log("logSetFilePattern:"  + event.target.value);
    }
    saveLogSetHandler(){
        if(this.props.editLogSetId){
            this.props.saveLogSet(this.props.editLogSetId, this.state.logSetName, this.state.logSetDirName, this.state.logSetFilePattern);
        }else{
            this.props.addNewLogSet(this.state.logSetName, this.state.logSetDirName, this.state.logSetFilePattern);
        }
        this.props.closeHandler();
    }
    deleteLogSetHandler(){
        const result = confirm('Are you sure, you want to  delete - ' , this.state.logSetName , " ?");
        if(result){
            this.props.deleteLogSet(this.props.editLogSetId);
            this.props.closeHandler();
        }
    }

    render() {
        let deleteButtonContent =  this.props.editLogSetId ? ( <Button variant="danger" size="sm" style={{ marginRight: '10px' }} onClick={this.deleteLogSetHandler}>Delete</Button>) :  '';
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
                <Form.Group as={Row} controlId="logSetName">
                    <Form.Label column sm="3">Name</Form.Label>
                    <Col sm="4">
                        <Form.Control type="text" name="logSetName" value={this.state.logSetName} onChange={(e) => this.handleLogSetNameChange(e)}/>
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="applicationLogDir">
                    <Form.Label column sm="3">Directory</Form.Label>
                    <Col sm="4">
                        <Form.Control type="text" name="applicationLogDir" value={this.state.logSetDirName} onChange={(e)  => this.handleLogSetDirChange(e)}/>
                    </Col>
                </Form.Group>
                <Form.Group as={Row} controlId="logSetFilePattern">
                    <Form.Label column sm="3">Log File Pattern</Form.Label>
                    <Col sm="4">
                        <Form.Control type="text" name="logSetFilePattern" value={this.state.logSetFilePattern}  onChange={(e)  => this.handleLogSetFilePatternChange(e)}/>
                    </Col>
                </Form.Group>
            </div>
            </Modal.Body>

            <Modal.Footer>
                <div style={{ display: 'flex' }}>
                    {deleteButtonContent}
                    <Button variant="danger" size="sm" style={{ marginRight: '10px' }} onClick={this.props.closeHandler}>Cancel</Button>
                    <Button variant="success" size="sm" onClick={this.saveLogSetHandler}>{this.props.editLogSetId ? 'Save' : 'Add'}</Button>
                </div>
            </Modal.Footer>

        </Modal>
        );
    }
}


const mapStateToProps = state => {
	return {
		availableLogSets: state.application.availableLogSets,
	};
};

const mapDispatchToProps = dispatch => {
    return {
        saveLogSet: (id, name, logDirectory, logFilePattern) => {dispatch(actions.saveLogSet(id, name, logDirectory, logFilePattern))},
        addNewLogSet: (name, logDirectory, logFilePattern) => {dispatch(actions.addNewLogSet(name, logDirectory, logFilePattern));},
        deleteLogSet: (id) => {dispatch(actions.deleteLogSetlicationLog(id))}
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(LogSet);