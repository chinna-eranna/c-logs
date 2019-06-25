import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import LogsViewer  from './logsViewer';
import SearchResults from './searchResults';

export class ContentViewer extends Component {

	constructor(props){
		super(props);
	}

	

	render() {
		console.log("ActiveMonitoringApp in ContentViewer :", this.props.activeMonitoringApp);
		if (this.props.activeMonitoringApp.length > 0 && this.props.activeMonitoringApp[0].searchResults && this.props.activeMonitoringApp[0].searchResults.length > 0) {
			return (
				<div style={{height:'100vh', overflow:'auto'}}>
                <Tabs defaultActiveKey="searchResults" id="content-viewer">
                    <Tab eventKey="logs" title="Logs">
                        <LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/>);
                    </Tab>
                    <Tab eventKey="searchResults" title="Search Results">
                        <SearchResults results={this.props.activeMonitoringApp[0].searchResults}/>
                    </Tab>
                </Tabs>
				</div>
			);
		} else{
			return ( <LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/>);
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
	console.log("Invoking Content Viewer connect ---");
	return {
		
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ContentViewer);
