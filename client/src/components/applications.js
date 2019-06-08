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

import AddApplication from './addApplication'
import MonitoringAppLogList from './monitoringAppLogList'
import * as actions from '../actions/applicationActions'

export class Applications extends Component {

	constructor(props) {
		super(props);
	}

	componentDidMount(){
		this.props.fetchApplications();
	}

	render() {
		let addAppContent = <AddApplication/>;
		return (
			<div>
				<div class="container-fluid">
					<div className="row">
						<div className="col">
							{addAppContent}
						</div>
					</div>
				</div>
				<hr/>
				<div class="container-fluid">
					<div className="row">
						<div className="col">
							<MonitoringAppLogList/>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		availableApps: state.application.availableApps
	};
};

const mapDispatchToProps = dispatch => {
	return {
		fetchApplications:()  => {dispatch(actions.fetchApplications());}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(Applications);
