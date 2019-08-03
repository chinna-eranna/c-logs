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

import * as actions from '../actions/applicationActions'
import moment from 'moment'
import '../css/app.css'


export class AddApplication extends Component {

	constructor(props) {
		super(props);
		this.newLogs = 'New Logs';
		this.allLogs = 'All Logs';

		this.selectApplication = this.selectApplication.bind(this);
		this.selectLog = this.selectLog.bind(this);
		this.getAvailableApps = this.getAvailableApps.bind(this);
		this.handleAddAppLog = this.handleAddAppLog.bind(this);
		this.handleCancelAppLog = this.handleCancelAppLog.bind(this);
		this.addApplication = this.addApplication.bind(this);
		this.getStartFromContent = this.getStartFromContent.bind(this);
		this.readFullFileContent = this.readFullFileContent.bind(this);
		this.handleReadFullFileContent  = this.handleReadFullFileContent.bind(this);
		this.state = { selectApplication: false, selectedApp: '-None-', startLogFile:this.newLogs, readFullFileContent:false };
	}
	handleAddAppLog() {
		if (this.state.selectedApp === '-None-') {
			return;
		}
		const appToBeMonitored = this.props.availableApps.filter((app, index) => {
			return app.Name == this.state.selectedApp
		});
		console.log("Application To Be monitored:" + JSON.stringify(appToBeMonitored));
		this.props.monitorAppLog(appToBeMonitored[0], this.state.startLogFile, this.state.readFullFileContent);
		this.setState({ selectApplication: false, selectedApp: '-None-', startLogFile:'New Logs'});
	}

	handleCancelAppLog() {
		this.setState({ selectApplication: false });
	}

	handleReadFullFileContent(){
		this.setState({readFullFileContent:!this.state.readFullFileContent});
		console.log("State after toggling read full file content: " + this.state);
	}

	addApplication() {
		this.setState({ selectApplication: true });
	}

	selectApplication(eventKey, event) {
		console.log("Selected Application: " + eventKey);
		this.setState({ selectedApp: eventKey });
		var selectedApps = this.props.availableApps.filter((app, index) => {
			return app.Name === eventKey;
		});

		this.props.getFiles(selectedApps[0].Directory, selectedApps[0].LogFilePattern);
	}

	selectLog(eventKey, event) {
		console.log("Selected Log: " + eventKey);
		this.setState({ startLogFile: eventKey });
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
			console.log("Application being added: " + app.appName);
		});



		console.log("Total unique applications: " + availableAppNames.size);
		let availableAppsContent = [];
		for (let app of availableAppNames) {
			availableAppsContent.push(<Dropdown.Item size="sm" eventKey={app} key={app}>{app}</Dropdown.Item>);
		}

		let selectedApp = this.state.selectedApp ? this.state.selectedApp : '-None-';
		let selectAppContent = (<DropdownButton size="sm" as={InputGroup.Prepend} variant="outline-secondary"
			title={selectedApp} id="input-group-dropdown-1" onSelect={this.selectApplication} >
			<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
			{availableAppsContent}
			</div>
		</DropdownButton>);


		let startFromContent = this.getStartFromContent();
		let readFullFileContent = this.readFullFileContent();
		return (
			<div>
				<InputGroup size="sm" className="mb-3">
					<InputGroup.Prepend>
						<InputGroup.Text id="basic-addon1">Choose Application</InputGroup.Text>
					</InputGroup.Prepend>
					{selectAppContent}
				</InputGroup>
				
				<InputGroup size="sm" className="mb-3">
					<InputGroup.Prepend>
						<InputGroup.Text id="basic-addon1">Start From</InputGroup.Text>
					</InputGroup.Prepend>
					{startFromContent}
				</InputGroup>
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
			const lastModifiedTime = moment(file.LastModified*1000).format("MMM Do YYYY, h:mm:ss a");
			startLogContent.push(<Dropdown.Item size="sm" eventKey={file.Name} key={file.Name}>{file.Name + ' (' + lastModifiedTime+')'}</Dropdown.Item>)
		}

		let startFromContent = (<DropdownButton size="sm" as={InputGroup.Prepend} variant="outline-secondary"
			title={this.state.startLogFile} id="input-group-dropdown-1" onSelect={this.selectLog} >
			<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
			{startLogContent}
			</div>
		</DropdownButton>);
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
		let chooseApplicationContent = (
			<Modal show={true} onHide={this.handleCancelAppLog}
				size="lg"
				aria-labelledby="contained-modal-title-vcenter"
				centered
			>
				<Modal.Header closeButton>
					<Modal.Title id="contained-modal-title-vcenter">
						<div style={{color: 'black'}}>Choose Application to view logs</div>
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
						<Button variant="success" size="sm" onClick={this.handleAddAppLog}>Add</Button>
					</div>
				</Modal.Footer>

			</Modal>
		);

		let addAppContent = '';
		if (this.state.selectApplication) {
			addAppContent = chooseApplicationContent;
		} else {
			addAppContent = (<Button variant="warning" size="sm" onClick={this.addApplication}>Add Application</Button>);
		}

		return addAppContent;
	}
}

const mapStateToProps = state => {
	return {
		availableApps: state.application.availableApps,
		monitoringApps: state.application.monitoringApps,
		filesList: state.application.filesList
	};
};

const mapDispatchToProps = dispatch => {
	return {
		monitorAppLog: (app, startLogFile, readFullFileContent) => { dispatch(actions.monitorAppLog(app, startLogFile, readFullFileContent)); },
		getFiles: (directory, pattern) => {dispatch(actions.fetchFiles(directory, pattern)); },
		clearFilesList: () => {dispatch({type: types.FILES_LIST, payload:{filesList:[]}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(AddApplication);
