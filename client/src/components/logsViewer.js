import { Component } from 'react';
import React, {createRef} from "react";
import { connect } from 'react-redux';
import Container from 'react-bootstrap/Container'
import Jumbotron from 'react-bootstrap/Jumbotron'
import InfiniteScroll from 'react-infinite-scroller';
import { getLogMessages } from '../services/appLogServices';
import *  as actions from '../actions/applicationActions';
import * as types from '../actions/actionTypes';
import styles from '../css/app.css';
import _ from 'lodash'
import scrollToComponent from 'react-scroll-to-component';

export class LogsViewer extends Component {

	constructor(props){
		super(props);
		this.loadMoreLogs = this.loadMoreLogs.bind(this);
		this.getLogsToDisplay = this.getLogsToDisplay.bind(this);
		this.paneDidMount = this.paneDidMount.bind(this);
		this.state = {items: [<div>1</div>], initialLoad:false}
		this.startAfterSearch  = createRef();
	}

	loadMoreLogs(){
		//if(this.props.activeMonitoringApp[0].tail){
			this.props.getMoreLogs(this.props.activeMonitoringApp[0]);
		//}else{
		//	console.log("Tailing is OFF, hence not loading");
		//}
	}

	componentDidMount(){
	}

	paneDidMount(node){
		if (node) {
		  node.addEventListener('scroll', () => console.log('scroll! Left: ' + node.scrollLeft + " Top:" + node.scrollTop));
		}
	};

	render() {
		if (this.props.activeMonitoringApp && this.props.activeMonitoringApp.length > 0) {
			return (
				<div style={{padding:'2px'}}>
				<InfiniteScroll
					initialLoad={this.state.initialLoad}
					pageStart={0}
					loadMore={this.loadMoreLogs}
					hasMore={true}
					loader={this.props.activeMonitoringApp[0].loading ? <div className="loader" key={0}>Loading ...</div> : ''}
					useWindow={false}>
					{this.getLogsToDisplay()}
				</InfiniteScroll>
			</div>
			)
		} else{
			return (<div style={{padding:'2px'}}><Container> Please select an application to view logs </Container></div>);
		}
	}

	componentDidUpdate(){
		console.log("ScrollToLine: this.startAfterSearch - " + this.startAfterSearch);
		console.log("ScrollToLine: this.startAfterSearch.current - " + this.startAfterSearch.current);

		if(this.props.logs && this.props.activeMonitoringApp[0].scrollToLine && 
			this.props.activeMonitoringApp[0].scrollToLine > 0 && this.props.logs.length >= this.props.activeMonitoringApp[0].scrollToLine
			&& this.startAfterSearch.current){
			this.props.resetScrollPosition(this.startAfterSearch.current.offsetTop, this.props.activeMonitoringApp[0]);
			this.startAfterSearch  = createRef();
		} else{
			console.log("Not resetting scroll position after logsviewer componentDidUpdate");
		}
		
	}


	getLogsToDisplay(){
		if(this.props.logs){
			console.log("Rendering logs of length:" + this.props.logs.length);
			var logsHtml = [];
			for(var i = 0; i < this.props.logs.length;  i++){
			//	logsHtml.push(<div style={{wordWrap: 'break-word', backgroundColor: '#6d6d6d', paddingTop:'1px', fontFamily: 'Verdana', color: 'white'}//}>  {this.props.logs[i]} </div>);
				if( this.props.activeMonitoringApp[0].scrollToLine && i === this.props.activeMonitoringApp[0].scrollToLine - 1){
					logsHtml.push(<div ref={this.startAfterSearch} className={styles.highlightLine}>  {this.props.logs[i]} </div>);
				}else if(this.props.activeMonitoringApp[0].highlightedLines.indexOf(i) >= 0){
					logsHtml.push(<div className={styles.highlightLine}>  {this.props.logs[i]} </div>);
				}else{
					logsHtml.push(<div className={styles.logLine}>  {this.props.logs[i]} </div>);
				}
			}
			logsHtml.push(this.props.activeMonitoringApp[0].loading ? '' : <div style={{cursor:'pointer'}} onClick={this.loadMoreLogs}>Click to load more..🥃</div>)
			return logsHtml;
		}else{
			console.log("No logs yet");
			return [<div> No Logs to display </div>];
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
		getMoreLogs: (app)  => {dispatch(actions.getMoreLogs(app));},
		resetScrollPosition:(topPosition, app) => { dispatch({type: types.RESET_SCROLL_POSITION, payload: {id: app.Id, 'top':topPosition}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
