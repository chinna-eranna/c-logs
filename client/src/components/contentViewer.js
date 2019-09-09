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
		this.onScrollLogs = this.onScrollLogs.bind(this);
		this.onScrollSearch = this.onScrollSearch.bind(this);
	}

	selectView (key){
		this.props.selectContentView(this.props.activeMonitoringApp[0].Id, key);
	}

	onScrollLogs(){
		var node = this.refs.elem;
		this.props.setScrollPosition('logs', node.scrollTop);
	}
	onScrollSearch(){
		var node = this.refs.searchElem;
		this.props.setScrollPosition('search', node.scrollTop);
	}

	componentDidUpdate(){
		console.log("contentViewer::componentDidUpdte()");
		if(this.refs.elem && this.props.activeMonitoringApp.length > 0 && this.props.activeMonitoringApp[0].resetScrollTop){
			this.refs.elem.scrollTop = this.props.activeMonitoringApp[0].resetScrollTopValue;
			this.props.resetScrollPositionDone();
		}else if(this.refs.elem && this.props.activeMonitoringApp.length > 0 &&  this.props.activeMonitoringApp[0].scrollLogsOnAppSwitch){
			if(!this.props.activeMonitoringApp[0].contentViewKey || this.props.activeMonitoringApp[0].contentViewKey === 'logs'){	
				console.log("Setting scrollTopLogs to " + this.props.activeMonitoringApp[0].scrollTopLogs);
				this.refs.elem.scrollTop  = this.props.activeMonitoringApp[0].scrollTopLogs ? this.props.activeMonitoringApp[0].scrollTopLogs : 0;
			}else  if (this.props.activeMonitoringApp[0].contentViewKey === 'searchResults'){	
				console.log("Setting scrollTopSearch to " + this.props.activeMonitoringApp[0].scrollTopSearch);
				this.refs.searchElem.scrollTop  = this.props.activeMonitoringApp[0].scrollTopSearch ? this.props.activeMonitoringApp[0].scrollTopSearch : 0;
			}else{

			}
			this.props.scrollLogsOnAppSwitchDone(this.props.activeMonitoringApp[0].Id);
		}
		
	}

	render() {
		if (this.props.activeMonitoringApp.length > 0 && 
			((this.props.activeMonitoringApp[0].searchResults && this.props.activeMonitoringApp[0].searchResults.length >= 0) || this.props.activeMonitoringApp[0].searchInProgress)) {
			return (
				<div style={{height:'100vh', border:'2px solid black'}}>
                <Tabs id="content-viewer" activeKey={this.props.activeMonitoringApp[0].contentViewKey} onSelect={key => this.selectView(key)} >
                    <Tab eventKey="logs" title="Logs">
						<div ref="elem" id="logsDiv" onScroll={ this.onScrollLogs }  style={{height:'95vh', overflow:'auto'}}>
							<LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/>
						</div>
                    </Tab>
                    <Tab eventKey="searchResults" title="Search Results">
					<div ref="searchElem" onScroll={ this.onScrollSearch }  style={{height:'95vh', overflow:'auto'}}>
                        <SearchResults activeMonitoringApp={this.props.activeMonitoringApp[0]}/>
					</div>
                    </Tab>
                </Tabs>
				</div>
			);
		} else{
			return ( <div ref="elem" onScroll={ this.onScrollLogs } style={{height:'100vh',overflow:'auto', border:'2px solid black'}}><LogsViewer logs={this.props.logs} activeMonitoringApp={this.props.activeMonitoringApp}/></div>);
		}
	}
}


const mapStateToProps = state => {
	return {
		activeAppId: state.application.activeAppId,
        activeMonitoringApp: state.application.monitoringApps.filter(app => app.Id === state.application.activeAppId),
		logs: state.application["logs_" +  state.application.activeAppId]
	};
};

const mapDispatchToProps = dispatch => {
	return {
		selectContentView: (appId, key) => {dispatch({type: types.SELECT_CONTENT_VIEW, payload:{'id': appId, 'contentViewKey':key}})},
		setScrollPosition:(view, topPosition) => { dispatch({type: types.SET_SCROLL_POSITION, payload: {'view': view, 'top':topPosition}});},
		resetScrollPositionDone: () => {dispatch({type: types.RESET_SCROLL_POSITION_DONE, payload:{}})},
		scrollLogsOnAppSwitchDone : (appId) => {dispatch({type: types.SCROLL_LOGS_ON_APP_SWTICH_DONE, payload:{'id': appId}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ContentViewer);
