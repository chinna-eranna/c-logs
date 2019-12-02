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
		this.state = {items: [<div>1</div>], initialLoad:false}
		this.startAfterSearch  = createRef();
		this.bookmarkLine =  this.bookmarkLine.bind(this);
	}

	loadMoreLogs(page, direction){
		console.log("Page to load:" + page  + " direction: " +  direction);
		//if(this.props.activeMonitoringApp[0].tail){
			this.props.getMoreLogs(this.props.activeMonitoringApp[0], direction);
		//}else{
		//	console.log("Tailing is OFF, hence not loading");
		//}
	}

	bookmarkLine(line){
		console.log("Clicked line:  " + line);
		this.props.bookmarkLine(this.props.activeMonitoringApp[0], line);
	}

	componentDidMount(){
	}

	render() {
		if (this.props.activeMonitoringApp && this.props.activeMonitoringApp.length > 0) {
			return (
				<InfiniteScroll
					initialLoad={this.state.initialLoad}
					pageStart={0}
					loadMore={this.loadMoreLogs}
					hasMore={true}
					isReverse={true}
					loader={this.props.activeMonitoringApp[0].loading ? <div className="loader" key={0}>Loading ...</div> : ''}
					useWindow={false}>
					{this.getLogsToDisplay()}
				</InfiniteScroll>
			)
		} else{
			return (<div style={{padding:'2px'}}><Container> Please select an application to view logs </Container></div>);
		}
	}

	componentDidUpdate(){
		if(this.props.activeMonitoringApp && this.props.activeMonitoringApp.length && this.props.activeMonitoringApp[0].contentViewKey !== 'logs'){
			return;
		}
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
					logsHtml.push(<div className={styles.logLineParent}><div ref={this.startAfterSearch} className={styles.highlightLine}>  <div className={styles.logLineActions} onClick={this.bookmarkLine.bind(this, i)}>⭐</div>{this.props.logs[i]} </div></div>);
				}else if(this.props.activeMonitoringApp[0].highlightedLines.indexOf(i - this.props.activeMonitoringApp[0].bwdLogsCount) >= 0){
					console.log("Highlighting line with i: " + i + " bwdLogsCount:  " + this.props.activeMonitoringApp[0].bwdLogsCount);
					logsHtml.push(<div className={styles.logLineParent}><div className={styles.highlightLine}> <div className={styles.logLineActions}onClick={this.bookmarkLine.bind(this, i)}>⭐</div> {this.props.logs[i]} </div></div>);
				}else{
					logsHtml.push(<div className={styles.logLineParent}><div className={styles.logLine}> <div className={styles.logLineActions} onClick={this.bookmarkLine.bind(this, i)}>⭐</div> {this.props.logs[i]} </div></div>);
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
		getMoreLogs: (app, direction)  => {dispatch(actions.getMoreLogs(app, direction));},
		resetScrollPosition:(topPosition, app) => { dispatch({type: types.RESET_SCROLL_POSITION, payload: {id: app.Id, 'top':topPosition}});},
		bookmarkLine: (app, line) => {dispatch({type: types.BOOKMARK_LINE, payload: {id: app.Id, line: line}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
