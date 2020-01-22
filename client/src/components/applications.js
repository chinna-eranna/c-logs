import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';

import ChooseApplicationLog from './chooseApplicationLog'
import ApplicationLogList from './monitoringAppLogList'
import * as actions from '../actions/applicationActions'

export class Applications extends Component {

	constructor(props) {
		super(props);
	}

	componentDidMount(){
		this.props.fetchApplications();
	}

	render() {
		let addAppContent = <ChooseApplicationLog/>;
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
							<ApplicationLogList/>
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
