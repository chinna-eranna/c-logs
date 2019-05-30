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
		this.addApplication = this.addApplication.bind(this);
		this.state = { addApplication: false }
	}

	componentDidMount(){
		this.props.fetchApplications();
	}

	addApplication() {
		this.setState({ addApplication: true });
	}


	render() {
		let addAppContent = '';

		if (this.state.addApplication) {
			addAppContent = (<AddApplication/>)
		} else {
			addAppContent = (<Button variant="outline-primary" onClick={this.addApplication}>Add Application</Button>);
		}
		return (
			<div>
				<Container>
					<Row>
						<Col>
							{addAppContent}
						</Col>
					</Row>
					<hr />
					<Row>
						<Col>
							<MonitoringAppLogList/>
						</Col>
					</Row>
				</Container>
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
