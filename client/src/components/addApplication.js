import { Component } from 'react';
import React from "react";
import {connect} from 'react-redux';
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

import * as actions from '../actions/applicationActions'



export class AddApplication extends Component {

	constructor(props){
				super(props);
				this.selectApplication = this.selectApplication.bind(this);
				this.selectLog = this.selectLog.bind(this);
				this.getAvailableApps = this.getAvailableApps.bind(this);
				this.handleAddAppLog = this.handleAddAppLog.bind(this);
				this.handleCancelAppLog = this.handleCancelAppLog.bind(this);
				this.addApplication = this.addApplication.bind(this);
				this.state = {selectApplication : false};
		}
		
	handleAddAppLog(){
		const appToBeMonitored =  this.props.availableApps.filter((app, index) => {
			return app.Name == this.state.selectedApp
		});
		console.log("Application To Be monitored:" + JSON.stringify(appToBeMonitored));
		this.props.monitorAppLog(appToBeMonitored[0]);
		this.setState({selectApplication: false});
	}

	handleCancelAppLog(){
		this.setState({ selectApplication: false });
	}
	addApplication() {
		this.setState({ selectApplication: true });
	}

	selectApplication(eventKey, event){
			console.log("Selected Application: " + eventKey);
			this.setState({selectedApp : eventKey});
	}

	selectLog(eventKey, event){
		console.log("Selected Log: " + eventKey);
		this.setState({selectedFileType : eventKey});
	}

	getAvailableApps(){
		let applications = new Set();
		this.props.availableApps.map((app, index) => {
			applications.add(app.Name);
			console.log("Application being added: " + app.appName);
		});
		console.log("Total unique applications: " + applications.size);
		let availableAppsContent = [];
		for (let app of applications)
			availableAppsContent.push(<Dropdown.Item size="sm" eventKey={app} key={app}>{app}</Dropdown.Item>);
	
		let selectedApp = this.state.selectedApp ? this.state.selectedApp : '-None-';
		let selectAppContent = (<DropdownButton size="sm" as={InputGroup.Prepend} variant="outline-secondary"
			title={selectedApp} id="input-group-dropdown-1" onSelect={this.selectApplication} >
			{availableAppsContent}
		</DropdownButton>);
		return (
			<InputGroup size="sm" className="mb-3">
			<InputGroup.Prepend>
				<InputGroup.Text id="basic-addon1">Choose Directory</InputGroup.Text>
			</InputGroup.Prepend>
			{selectAppContent}
		</InputGroup>);
	}
	
	render (){
		let chooseApplicationContent = (
			<div>
				<div>
					{this.getAvailableApps()}
				</div>
				<div style={{ display:'flex'}}>	
					<Button variant="danger" size="sm" onClick={this.handleCancelAppLog} style={{marginRight:'10px'}}>Cancel</Button>
					<Button variant="success" size="sm" onClick={this.handleAddAppLog}>Add</Button>
				</div>
			</div>
		);

		let addAppContent = '';	
		if (this.state.selectApplication) {
			addAppContent = chooseApplicationContent;
		} else {
			addAppContent = (<Button variant="primary" size="sm" onClick={this.addApplication}>Add Directory</Button>);
		}

		return addAppContent;
    }
}

const mapStateToProps = state => {
	return {
				availableApps: state.application.availableApps
   };
};

const mapDispatchToProps = dispatch => {
	return {
		monitorAppLog: (app)  => {dispatch(actions.monitorAppLog(app));}
	};
};

export default connect(mapStateToProps,  mapDispatchToProps)(AddApplication);
