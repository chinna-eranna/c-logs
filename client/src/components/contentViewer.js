import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'
import LogsViewer  from './logsViewer';
import LogSettings from './logSettings';
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
		this.props.selectContentView(this.props.activeMonitoringLogSet[0].Id, key);
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
		if(this.refs.elem && this.props.activeMonitoringLogSet.length > 0 && this.props.activeMonitoringLogSet[0].resetScrollTop){
			this.refs.elem.scrollTop = this.props.activeMonitoringLogSet[0].resetScrollTopValue;
			this.props.resetScrollPositionDone();
		}else if(this.refs.elem && this.props.activeMonitoringLogSet.length > 0 &&  this.props.activeMonitoringLogSet[0].scrollLogsOnLogSetSwitch){
			if(!this.props.activeMonitoringLogSet[0].contentViewKey || this.props.activeMonitoringLogSet[0].contentViewKey === 'logs'){	
				this.refs.elem.scrollTop  = this.props.activeMonitoringLogSet[0].scrollTopLogs ? this.props.activeMonitoringLogSet[0].scrollTopLogs : 0;
			}else  if (this.props.activeMonitoringLogSet[0].contentViewKey === 'searchResults'){	
				this.refs.searchElem.scrollTop  = this.props.activeMonitoringLogSet[0].scrollTopSearch ? this.props.activeMonitoringLogSet[0].scrollTopSearch : 0;
			}else{
				console.log("Not changing the scroll top");
			}
			this.props.scrollLogsOnLogSetSwitchDone(this.props.activeMonitoringLogSet[0].Id);
		}
		
	}

	render() {
		let logSettingsContent ='';
		if (this.props.activeMonitoringLogSet.length > 0 && this.props.activeMonitoringLogSet[0].logsCount !== undefined){
			const viewType = this.props.activeMonitoringLogSet[0].contentViewKey ? this.props.activeMonitoringLogSet[0].contentViewKey : 'logs';
			logSettingsContent  = (<LogSettings monitoringLogSet={this.props.activeMonitoringLogSet[0]}  logsCount={this.props.activeMonitoringLogSet[0].logsCount} view={viewType}/>)
		}
		if (this.props.activeMonitoringLogSet.length > 0 && 
			((this.props.activeMonitoringLogSet[0].searchResults && this.props.activeMonitoringLogSet[0].searchResults.length >= 0) || this.props.activeMonitoringLogSet[0].searchInProgress)) {
			return (
				<div style={{height:'100vh', border:'2px solid black'}}>
                <Tabs id="content-viewer" activeKey={this.props.activeMonitoringLogSet[0].contentViewKey} onSelect={key => this.selectView(key)} >
                    <Tab eventKey="logs" title="Logs">
						<div style={{height: '95vh', display: 'flex', flexDirection: 'column'}}>
							<div>
							<LogSettings app={this.props.activeMonitoringLogSet[0]}  logsCount={this.props.activeMonitoringLogSet[0].logsCount} view="logs"/>
							</div>
							<div ref="elem" id="logsDiv" onScroll={ this.onScrollLogs }  style={{flexGrow: '1', overflow:'auto'}}>
								<LogsViewer logs={this.props.logs} activeMonitoringLogSet={this.props.activeMonitoringLogSet}/>
							</div>
						</div>
			        </Tab>
                    <Tab eventKey="searchResults" title="Search Results">
					<div style={{height: '95vh', display: 'flex', flexDirection: 'column'}}>
							<div>
							<LogSettings app={this.props.activeMonitoringLogSet[0]}  logsCount={this.props.activeMonitoringLogSet[0].logsCount} view="searchResults"/>
							</div>
						<div ref="searchElem" onScroll={ this.onScrollSearch }  style={{flexGrow: '1', overflow:'auto'}}>
							<SearchResults activeMonitoringLogSet={this.props.activeMonitoringLogSet[0]} />
						</div>
					</div>
                    </Tab>
                </Tabs>
				</div>
			);
		} else{
			return ( <div style={{height:'100vh', display: 'flex', flexDirection: 'column', border:'2px solid black'}}>
				<div>{
					logSettingsContent
				}
				</div>
				<div ref="elem" id="logsDiv" onScroll={ this.onScrollLogs }  style={{flexGrow: '1', overflow:'auto'}}>
					<LogsViewer logs={this.props.logs} activeMonitoringLogSet={this.props.activeMonitoringLogSet}/>
				</div>
			</div>);
		}
	}
}


const mapStateToProps = state => {
	return {
		activeLogSetId: state.application.activeLogSetId,
        activeMonitoringLogSet: state.application.monitoringLogSets.filter(logset => logset.Id === state.application.activeLogSetId),
		logs: state.application["logs_" +  state.application.activeLogSetId]
	};
};

const mapDispatchToProps = dispatch => {
	return {
		selectContentView: (logsetId, key) => {dispatch({type: types.SELECT_CONTENT_VIEW, payload:{'id': logsetId, 'contentViewKey':key}})},
		setScrollPosition:(view, topPosition) => { dispatch({type: types.SET_SCROLL_POSITION, payload: {'view': view, 'top':topPosition}});},
		resetScrollPositionDone: () => {dispatch({type: types.RESET_SCROLL_POSITION_DONE, payload:{}})},
		scrollLogsOnLogSetSwitchDone : (logsetId) => {dispatch({type: types.SCROLL_LOGS_ON_APP_SWTICH_DONE, payload:{'id': logsetId}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ContentViewer);
