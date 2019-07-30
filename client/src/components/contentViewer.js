import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import LogsViewer  from './logsViewer';
import SearchResults from './searchResults';
import * as types from '../actions/actionTypes';

export class ContentViewer extends Component {

	constructor(props){
		super(props);
		this.selectView = this.selectView.bind(this);
	}

	selectView (key){
		this.props.selectContentView(this.props.activeMonitoringApp[0].Id, key);
	}

	

	render() {
		console.log("ActiveMonitoringApp in ContentViewer :", this.props.activeMonitoringApp);
		if (this.props.activeMonitoringApp.length > 0 && 
			((this.props.activeMonitoringApp[0].searchResults && this.props.activeMonitoringApp[0].searchResults.length > 0) || this.props.activeMonitoringApp[0].searchInProgress)) {
			return (
				<div style={{height:'100vh', overflow:'auto'}}>
                <Tabs id="content-viewer" activeKey={this.props.activeMonitoringApp[0].contentViewKey} onSelect={key => this.selectView(key)} >
                    <Tab eventKey="logs" title="Logs">
                        <LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/>);
                    </Tab>
                    <Tab eventKey="searchResults" title="Search Results">
                        <SearchResults activeMonitoringApp={this.props.activeMonitoringApp[0]}/>
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
	return {
		selectContentView: (appId, key) => {dispatch({type: types.SELECT_CONTENT_VIEW, payload:{'id': appId, 'contentViewKey':key}})},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ContentViewer);
