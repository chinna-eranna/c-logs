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
		this.onScroll = this.onScroll.bind(this);
	}

	selectView (key){
		this.props.selectContentView(this.props.activeMonitoringApp[0].Id, key);
	}

	onScroll(){
		var node = this.refs.elem;
		this.props.setScrollPosition(node.scrollTop);
	}

	componentDidUpdate(){
		if(this.refs.elem && this.props.activeMonitoringApp.length > 0 && this.props.activeMonitoringApp[0].resetScrollTop){
			this.refs.elem.scrollTop = this.props.activeMonitoringApp[0].resetScrollTopValue;
			this.props.resetScrollPositionDone();
		}
	}

	render() {
		if (this.props.activeMonitoringApp.length > 0 && 
			((this.props.activeMonitoringApp[0].searchResults && this.props.activeMonitoringApp[0].searchResults.length >= 0) || this.props.activeMonitoringApp[0].searchInProgress)) {
			return (
				<div style={{height:'100vh', border:'2px solid black'}}>
                <Tabs id="content-viewer" activeKey={this.props.activeMonitoringApp[0].contentViewKey} onSelect={key => this.selectView(key)} >
                    <Tab eventKey="logs" title="Logs">
						<div ref="elem" id="logsDiv" onScroll={ this.onScroll }  style={{height:'95vh', overflow:'auto'}}>
							<LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/>
						</div>
                    </Tab>
                    <Tab eventKey="searchResults" title="Search Results">
					<div ref="searchElem" onScroll={ this.onScroll }  style={{height:'95vh', overflow:'auto'}}>
                        <SearchResults activeMonitoringApp={this.props.activeMonitoringApp[0]}/>
					</div>
                    </Tab>
                </Tabs>
				</div>
			);
		} else{
			return ( <div ref="elem" onScroll={ this.onScroll } style={{height:'100vh',overflow:'auto', border:'2px solid black'}}><LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/></div>);
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
		setScrollPosition:(topPosition) => { dispatch({type: types.SET_SCROLL_POSITION, payload: {'top':topPosition}});},
		resetScrollPositionDone: () => {dispatch({type: types.RESET_SCROLL_POSITION_DONE, payload:{}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ContentViewer);
