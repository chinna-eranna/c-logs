import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import ModalDialog from 'react-bootstrap/ModalDialog'
import ModalHeader from 'react-bootstrap/ModalHeader'
import ModalTitle from 'react-bootstrap/ModalTitle'
import ModalBody from 'react-bootstrap/ModalBody'
import ModalFooter from 'react-bootstrap/ModalFooter'
import Form from 'react-bootstrap/Form'
import * as types from '../actions/actionTypes';

import * as actions from '../actions/applicationActions'
import moment from 'moment'
import '../css/app.css'


export class AddApplication extends Component {

	constructor(props) {
		super(props);
		this.newLogs = 'New Logs';
		this.allLogs = 'All Logs';
		this.none = "-None-"
		this.defaults = { selectApplication: false, selectedApp: this.none, startLogFile:this.newLogs, readFullFileContent:false };

		this.selectApplication = this.selectApplication.bind(this);
		this.selectLog = this.selectLog.bind(this);
		this.getAvailableApps = this.getAvailableApps.bind(this);
		this.handleAddAppLog = this.handleAddAppLog.bind(this);
		this.handleCancelAppLog = this.handleCancelAppLog.bind(this);
		this.addApplication = this.addApplication.bind(this);
		this.getStartFromContent = this.getStartFromContent.bind(this);
		this.readFullFileContent = this.readFullFileContent.bind(this);
		this.handleReadFullFileContent  = this.handleReadFullFileContent.bind(this);
		this.state = this.defaults;
		
	}
	handleAddAppLog() {
		const reset = this.props.resetApp ? true: false;
		if(this.props.resetApp){
			this.props.resetAppDone();
		}
		if (this.state.selectedApp === this.none) {
			return;
		}
		const appToBeMonitored = this.props.availableApps.filter((app, index) => {
			return app.Name == this.state.selectedApp
		});
		
		this.props.monitorAppLog(appToBeMonitored[0], this.state.startLogFile, this.state.readFullFileContent, reset);
		this.setState(this.defaults);
	}

	handleCancelAppLog() {
		this.setState(this.defaults);
		if(this.props.resetApp){
			this.props.resetAppDone();
		}
	}

	handleReadFullFileContent(){
		this.setState({readFullFileContent:!this.state.readFullFileContent});
	}

	addApplication() {
		this.setState({ selectApplication: true });
	}

	selectApplication(eventKey, event) {
		this.setState({ selectedApp: eventKey });
		var selectedApps = this.props.availableApps.filter((app, index) => {
			return app.Name === eventKey;
		});

		this.props.getFiles(selectedApps[0].Directory, selectedApps[0].LogFilePattern);
	}

	selectLog(eventKey, event) {
		this.setState({ startLogFile: eventKey });
	}

	static getDerivedStateFromProps (nextProps, prevState) {
		console.log("Get DerivedState From Props: " + JSON.stringify(prevState));
		if(nextProps && prevState){
			const newState = prevState;
			if(nextProps.resetApp && !prevState.selectApplication){
				console.log("Resetting AddApplication state for resetting application " + nextProps.resetApp);
				newState.selectApplication = true;
				newState.selectedApp = nextProps.resetApp;
				return newState;
			}
		}
		return null;
	}

	getAvailableApps() {
		let monitoringAppNames = new Set();
		this.props.monitoringApps.map((app, index) => {
			monitoringAppNames.add(app.Name);
		});

		let availableAppNames = new Set();
		this.props.availableApps.map((app, index) => {
			if (!monitoringAppNames.has(app.Name)) {
				availableAppNames.add(app.Name);
			}
		});



		let availableAppsContent = [];
		for (let app of availableAppNames) {
			availableAppsContent.push(<Dropdown.Item size="sm" eventKey={app} key={app}>{app}</Dropdown.Item>);
		}

		let selectedApp = this.state.selectedApp ? this.state.selectedApp : '-None-';
		let selectAppContent = ''
		if(this.props.resetApp){
			selectAppContent = (
				<InputGroup size="sm" className="mb-3">
					<InputGroup.Prepend>
						<InputGroup.Text id="basic-addon1">Application</InputGroup.Text>
					</InputGroup.Prepend>
					<DropdownButton disabled="true" size="sm" as={InputGroup.Prepend} variant="outline-secondary"
					title={this.props.resetApp} id="input-group-dropdown-1" >
						<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
						<Dropdown.Item size="sm" eventKey={this.props.resetApp} key={this.props.resetApp}>{this.props.resetApp}</Dropdown.Item>
						</div>
					</DropdownButton>
				</InputGroup>);
		}else{
			selectAppContent = (
				<InputGroup size="sm" className="mb-3">
					<InputGroup.Prepend>
						<InputGroup.Text id="basic-addon1">Application</InputGroup.Text>
					</InputGroup.Prepend>
					<DropdownButton size="sm" as={InputGroup.Prepend} variant="outline-secondary"
					title={selectedApp} id="input-group-dropdown-1" onSelect={this.selectApplication} >
						<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
							{availableAppsContent}
						</div>
					</DropdownButton>
				</InputGroup>
			);
		}


		let startFromContent = this.getStartFromContent();
		let readFullFileContent = this.readFullFileContent();
		return (
			<div>
				{selectAppContent}
				{startFromContent}
				{readFullFileContent}
			</div>
		);
	}

	getStartFromContent(){
		if (this.state.selectedApp === '-None-') {
			return '';
		}
		
		let startLogContent = []
		startLogContent.push(<Dropdown.Item size="sm" eventKey={this.newLogs} key={this.newLogs}>{this.newLogs}</Dropdown.Item>)
		startLogContent.push(<Dropdown.Item size="sm" eventKey={this.allLogs} key={this.allLogs}>{this.allLogs}</Dropdown.Item>)
		
		for(let index in this.props.filesList){
			const file = this.props.filesList[index]
			const lastModifiedTime = moment(file.LastModified/1000000).format("MMM Do YYYY, h:mm:ss a");
			console.log("Last Modified time: " + lastModifiedTime);
			startLogContent.push(<Dropdown.Item size="sm" eventKey={file.Name} key={file.Name}>{file.Name + ' (' + lastModifiedTime+')'}</Dropdown.Item>)
		}

		let startFromContent = (
			<InputGroup size="sm" className="mb-3">
			<InputGroup.Prepend>
				<InputGroup.Text id="basic-addon1">Start From</InputGroup.Text>
			</InputGroup.Prepend>
			<DropdownButton size="sm" as={InputGroup.Prepend} variant="outline-secondary"
			title={this.state.startLogFile} id="input-group-dropdown-1" onSelect={this.selectLog} >
			<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
			{startLogContent}
			</div>
		</DropdownButton>
		</InputGroup>);
		
		return startFromContent;
	}

	readFullFileContent(){
		if(this.state.startLogFile &&  this.state.startLogFile !== this.newLogs && this.state.startLogFile !== this.allLogs) {
			return  <Form.Check  style={{ color: 'black' }} onClick={this.handleReadFullFileContent} type="checkbox" label="Read selected files full content on start" />
		}
		else{
			return '';
		}
	}
	render() {
		const title =  (this.props.resetApp) ? "Reset Monitoring Application" : "Choose Application to view logs";
		const buttonTitle = (this.props.resetApp) ? "Reset" : "Add";
		let chooseApplicationContent = (
			<Modal show={true} onHide={this.handleCancelAppLog}
				size="lg"
				aria-labelledby="contained-modal-title-vcenter"
				centered
			>
				<Modal.Header closeButton>
					<Modal.Title id="contained-modal-title-vcenter">
						<div style={{color: 'black'}}>{title}</div>
          			</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div>
						{this.getAvailableApps()}
					</div>
				</Modal.Body>

				<Modal.Footer>
					<div style={{ display: 'flex' }}>
						<Button variant="danger" size="sm" onClick={this.handleCancelAppLog} style={{ marginRight: '10px' }}>Cancel</Button>
						<Button variant="success" size="sm" onClick={this.handleAddAppLog}>{buttonTitle}</Button>
					</div>
				</Modal.Footer>

			</Modal>
		);

		let addAppContent = '';
		if (this.state.selectApplication) {
			addAppContent = chooseApplicationContent;
		} else {
			addAppContent = (<Button variant="warning" size="sm" onClick={this.addApplication}>Choose Application</Button>);
		}

		return addAppContent;
	}
}

const mapStateToProps = state => {
	console.log("State in Add Application: " + state);
	return {
		availableApps: state.application.availableApps,
		monitoringApps: state.application.monitoringApps,
		filesList: state.application.filesList,
		resetApp: state.application.resetApp
	};
};

const mapDispatchToProps = dispatch => {
	return {
		monitorAppLog: (app, startLogFile, readFullFileContent, reset) => { dispatch(actions.monitorAppLog(app, startLogFile, readFullFileContent, reset)); },
		resetAppDone: () => { dispatch({type: types.RESET_APP_DONE, payload: {}})},
		getFiles: (directory, pattern) => {dispatch(actions.fetchFiles(directory, pattern)); },
		clearFilesList: () => {dispatch({type: types.FILES_LIST, payload:{filesList:[]}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(AddApplication);
