import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Container from 'react-bootstrap/Container'
import Jumbotron from 'react-bootstrap/Jumbotron'
import InfiniteScroll from 'react-infinite-scroller';
import { getLogMessages } from '../services/appLogServices';
import *  as actions from '../actions/applicationActions';
import * as types from '../actions/actionTypes';
import { LogsViewer } from './logsViewer';

export class ContentViewer extends Component {

	constructor(props){
		super(props);
	}

	

	render() {
		if (this.props.activeMonitoringApp && this.props.activeMonitoringApp.searchResults && this.props.activeMonitoringApp.searchResults.length > 0) {
			return (
                <Tabs defaultActiveKey="contentViewer" id="content-viewer">
                    <Tab eventKey="logs" title="Logs">
                        <LogsViewer logs={this.props.logs}/>
                    </Tab>
                    <Tab eventKey="searchResults" title="Search Results">
                        Search Results here
                    </Tab>
                </Tabs>
			);
		} else{
			return ( <LogsViewer logs={this.props.logs}/>);
		}
	}
}


const mapStateToProps = state => {
	return {
        activeMonitoringApp: state.application.monitoringApps.filter(app => app.Id === state.application.activeAppId),
        logs: state.application["logs_" +  state.application.activeAppId]
	};
};

const mapDispatchToProps = dispatch => {
	return {
		
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ContentViewer);
