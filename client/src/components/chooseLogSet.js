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
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Form from 'react-bootstrap/Form'
import * as types from '../actions/actionTypes';

import * as actions from '../actions/applicationActions'
import moment from 'moment'
import '../css/app.css'
import ListLogSets from './listLogSets';
import LogSet from './logSet';


export class ChooseLogSet extends Component {

	constructor(props) {
		super(props);
		this.newLogs = 'New Logs';
		this.allLogs = 'All Logs';
		this.none = "-None-"
		this.defaults = { selectLogSet: false, selectedLogSet: this.none, startLogFile:this.newLogs, readFullFileContent:false };

		this.selectLogSet = this.selectLogSet.bind(this);
		this.selectLog = this.selectLog.bind(this);
		this.getAvailableLogSets = this.getAvailableLogSets.bind(this);
		this.handleAddOnChooseLogSetModal = this.handleAddOnChooseLogSetModal.bind(this);
		this.handleCancelOnChooseLogSetModal = this.handleCancelOnChooseLogSetModal.bind(this);
		this.handleCloseOnListLogSetsModal  =  this.handleCloseOnListLogSetsModal.bind(this);
		this.handleCloseOnNewLogSetModal = this.handleCloseOnNewLogSetModal.bind(this);
		this.showAddNewLogSetModal = this.showAddNewLogSetModal.bind(this);
		this.showEditLogSetModal = this.showEditLogSetModal.bind(this);
		this.showChooseLogSetModal = this.showChooseLogSetModal.bind(this);
		this.showListLogSetsModal = this.showListLogSetsModal.bind(this);
		this.getStartFromContent = this.getStartFromContent.bind(this);
		this.readFullFileContent = this.readFullFileContent.bind(this);
		this.handleReadFullFileContent  = this.handleReadFullFileContent.bind(this);
		this.state = this.defaults;
		
	}
	handleAddOnChooseLogSetModal() {
		const reset = this.props.resetApp ? true: false;
		if(this.props.resetApp){
			this.props.resetAppDone();
		}
		if (this.state.selectedLogSet === this.none) {
			return;
		}
		const logSetToBeMonitored = this.props.availableLogSets.filter((app, index) => {
			return app.Name == this.state.selectedLogSet
		});
		
		this.props.monitorLogSet(logSetToBeMonitored[0], this.state.startLogFile, this.state.readFullFileContent, reset);
		this.setState(this.defaults);
	}

	handleCancelOnChooseLogSetModal() {
		this.setState(this.defaults);
		if(this.props.resetApp){
			this.props.resetAppDone();
		}
	}

	handleCloseOnListLogSetsModal(){
		this.setState({ showModalFor: '' });
	}
	handleCloseOnNewLogSetModal(){
		this.setState({showModalFor: 'listLogSets' });
	}

	showListLogSetsModal(){
		this.setState({showModalFor: 'listLogSets'});
	}

	showAddNewLogSetModal(){
		this.setState({showModalFor: 'addNewLogSet'});
	}

	showEditLogSetModal(logsetId){
		this.setState({showModalFor: 'editLogSet', editLogSetId:logsetId});
	}
	
	handleReadFullFileContent(){
		this.setState({readFullFileContent:!this.state.readFullFileContent});
	}

	showChooseLogSetModal() {
		this.setState({ selectLogSet: true });
	}

	selectLogSet(eventKey, event) {
		this.setState({ selectedLogSet: eventKey });
		var selectedLogSets = this.props.availableLogSets.filter((logSet, index) => {
			return logSet.Name === eventKey;
		});

		this.props.getFiles(selectedLogSets[0].Directory, selectedLogSets[0].LogFilePattern);
	}

	selectLog(eventKey, event) {
		this.setState({ startLogFile: eventKey });
	}

	static getDerivedStateFromProps (nextProps, prevState) {
		if(nextProps && prevState){
			const newState = prevState;
			if(nextProps.resetApp && !prevState.selectLogSet){
				newState.selectLogSet = true;
				newState.selectedLogSet = nextProps.resetApp;
				return newState;
			}
		}
		return null;
	}

	getAvailableLogSets() {
		let monitoringLogSetNames = new Set();
		this.props.monitoringLogSets.map((logSet, index) => {
			monitoringLogSetNames.add(logSet.Name);
		});

		let availableLogSetNames = new Set();
		this.props.availableLogSets.map((logSet, index) => {
			if (!monitoringLogSetNames.has(logSet.Name)) {
				availableLogSetNames.add(logSet.Name);
			}
		});



		let availableLogSetsContent = [];
		for (let logSet of availableLogSetNames) {
			availableLogSetsContent.push(<Dropdown.Item size="sm" eventKey={logSet} key={logSet}>{logSet}</Dropdown.Item>);
		}

		let showChooseLogSetModalButton = this.state.selectedLogSet != this.none ? '' : (<Button variant="warning" onClick={this.showAddNewLogSetModal} size="sm" >Add New</Button>);

		let selectedLogSet = this.state.selectedLogSet ? this.state.selectedLogSet : '-None-';
		let selectLogSetContent = ''
		if(this.props.resetApp){
			selectLogSetContent = (
				<InputGroup size="sm" className="mb-3">
					<InputGroup.Prepend>
						<InputGroup.Text id="basic-addon1">LogSet</InputGroup.Text>
					</InputGroup.Prepend>
					<DropdownButton disabled="true" size="sm" as={InputGroup.Prepend} variant="outline-secondary"
					title={this.props.resetApp} id="input-group-dropdown-1" >
						<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
						<Dropdown.Item size="sm" eventKey={this.props.resetApp} key={this.props.resetApp}>{this.props.resetApp}</Dropdown.Item>
						</div>
					</DropdownButton>
				</InputGroup>);
		}else{
			selectLogSetContent = (
				<div>
					<InputGroup size="sm" className="mb-3">
						<InputGroup.Prepend>
							<InputGroup.Text id="basic-addon1">LogSet</InputGroup.Text>
						</InputGroup.Prepend>
						<DropdownButton size="sm" as={InputGroup.Prepend} variant="outline-secondary"
						title={selectedLogSet} id="input-group-dropdown-1" onSelect={this.selectLogSet} >
							<div style={{maxHeight:'10em', overflowY:  'scroll'}}>
								{availableLogSetsContent}
							</div>
						</DropdownButton>
					</InputGroup>
					{showChooseLogSetModalButton}
				</div>
			);
		}


		let startFromContent = this.getStartFromContent();
		let readFullFileContent = this.readFullFileContent();
		return (
			<div>
				{selectLogSetContent}
				{startFromContent}
				{readFullFileContent}
			</div>
		);
	}

	getStartFromContent(){
		if (this.state.selectedLogSet === '-None-') {
			return '';
		}
		
		let startLogContent = []
		startLogContent.push(<Dropdown.Item size="sm" eventKey={this.newLogs} key={this.newLogs}>{this.newLogs}</Dropdown.Item>)
		startLogContent.push(<Dropdown.Item size="sm" eventKey={this.allLogs} key={this.allLogs}>{this.allLogs}</Dropdown.Item>)
		
		for(let index in this.props.filesList){
			const file = this.props.filesList[index]
			const lastModifiedTime = moment(file.LastModified/1000000).format("MMM Do YYYY, h:mm:ss a");
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
		const title =  (this.props.resetApp) ? "Reset Monitoring LogSet" : "Choose LogSet to view logs";
		const buttonTitle = (this.props.resetApp) ? "Reset" : "Add";
		let chooseLogSetContent = (
			<Modal show={true} onHide={this.handleCancelOnChooseLogSetModal}
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
						{this.getAvailableLogSets()}
					</div>
				</Modal.Body>

				<Modal.Footer>
					<div style={{ display: 'flex' }}>
						<Button variant="danger" size="sm" onClick={this.handleCancelOnChooseLogSetModal} style={{ marginRight: '10px' }}>Cancel</Button>
						<Button variant="success" size="sm" onClick={this.handleAddOnChooseLogSetModal}>{buttonTitle}</Button>
					</div>
				</Modal.Footer>

			</Modal>
		);

		let addLogSetContent = '';
		if(this.state.showModalFor === 'listLogSets'){
			addLogSetContent  = (<ListLogSets closeHandler={this.handleCloseOnListLogSetsModal} addNewLogSetHandler={this.showAddNewLogSetModal}
				editLogSetHandler={this.showEditLogSetModal} />)
		}
		else if(this.state.showModalFor === 'addNewLogSet' || this.state.showModalFor === 'editLogSet'){
			addLogSetContent = (<LogSet closeHandler={this.handleCloseOnNewLogSetModal} editLogSetId={this.state.showModalFor === 'editLogSet' ? this.state.editLogSetId: undefined}/>);
		}
		else if (this.state.selectLogSet) {
			addLogSetContent = chooseLogSetContent;
		} else {
			addLogSetContent =  (
				<Dropdown as={ButtonGroup} size="sm">
					<Button variant="warning" onClick={this.showChooseLogSetModal}>Choose LogSet</Button>

					<Dropdown.Toggle split variant="warning" id="dropdown-split-basic" />

					<Dropdown.Menu>
						<Dropdown.Item onClick={this.showListLogSetsModal}>List LogSets </Dropdown.Item>
						<Dropdown.Item onClick={this.showAddNewLogSetModal}>Add New LogSet</Dropdown.Item>
					</Dropdown.Menu>
					</Dropdown>
			);
		}

		return addLogSetContent;
	}
}

const mapStateToProps = state => {
	return {
		availableLogSets: state.application.availableLogSets,
		monitoringLogSets: state.application.monitoringLogSets,
		filesList: state.application.filesList,
		resetApp: state.application.resetApp
	};
};

const mapDispatchToProps = dispatch => {
	return {
		monitorLogSet: (logSet, startLogFile, readFullFileContent, reset) => { dispatch(actions.monitorLogSet(logSet, startLogFile, readFullFileContent, reset)); },
		resetAppDone: () => { dispatch({type: types.RESET_MONITOR_LOGSET_DONE, payload: {}})},
		getFiles: (directory, pattern) => {dispatch(actions.fetchFiles(directory, pattern)); },
		clearFilesList: () => {dispatch({type: types.FILES_LIST, payload:{filesList:[]}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ChooseLogSet);
