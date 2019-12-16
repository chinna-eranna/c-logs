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
import VisibilitySensor from 'react-visibility-sensor';
import scrollToComponent from 'react-scroll-to-component';

export class LogsViewer extends Component {

	constructor(props){
		super(props);
		this.loadMoreLogs = this.loadMoreLogs.bind(this);
		this.getLogsToDisplay = this.getLogsToDisplay.bind(this);
		this.state = {items: [<div>1</div>], initialLoad:false}
		this.startAfterSearch  = createRef();
		this.bookmarkLine =  this.bookmarkLine.bind(this);
		this.fileInViewPort = this.fileInViewPort.bind(this);
		this.reverse = false;
	}

	loadMoreLogs(page, direction){
		//if(this.props.activeMonitoringApp[0].tail){
			this.props.getMoreLogs(this.props.activeMonitoringApp[0], direction);
		//}else{
		//	console.log("Tailing is OFF, hence not loading");
		//}
	}

	fileInViewPort(visible, file){
		console.log("VisibilitySensor callback - visibile: " + visible + " file: " + file);
		if(visible){
			this.props.setFileInViewPort(this.props.activeMonitoringApp[0], file);
		}else{
			this.props.setFileOutOfViewPort(this.props.activeMonitoringApp[0], file);
		}
	}

	bookmarkLine(line){
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
					isReverse={this.reverse}
					loader={this.props.activeMonitoringApp[0].loading ? <div className="loader" key={0}>Loading ...</div> : ''}
					useWindow={false}>
					{this.getLogsToDisplay()}
				</InfiniteScroll>
			)
		} else{
			return (<div style={{padding:'2px'}}><Container> Please select an application to view logs </Container></div>);
		}
	}

	componentDidUpdate(prevProp){
		
		const activeMonitoringApp = this.props.activeMonitoringApp && this.props.activeMonitoringApp.length > 0;
		if(!activeMonitoringApp){
			return;
		}

		if( this.props.activeMonitoringApp[0].contentViewKey !== 'logs'){
			return;
		}
		if(prevProp.activeMonitoringApp && prevProp.activeMonitoringApp.length > 0){
			if (prevProp.activeMonitoringApp[0].bwdLogsCount != this.props.activeMonitoringApp[0].bwdLogsCount){
				this.reverse = true;
			}else{
				this.reverse = false;
			}
		}

		if (this.props.activeMonitoringApp[0].scrollToLine && this.props.activeMonitoringApp[0].scrollToLine > 0 && 
			this.props.logs && this.props.logs.length >= this.props.activeMonitoringApp[0].scrollToLine 
			&& this.startAfterSearch.current){
			this.props.resetScrollPosition(this.startAfterSearch.current.offsetTop, this.props.activeMonitoringApp[0]);
			this.startAfterSearch  = createRef();
		}
		
	}


	getLogsToDisplay(){
		let previousFile = '';
		const separator = '**************************************';
		if(this.props.logs){
			var logsHtml = [];
			for(var i = 0; i < this.props.logs.length;  i++){
				const logLine = this.props.logs[i][1];
				const currentLogLineFileName = this.props.logs[i][0];
			
				if(previousFile !== currentLogLineFileName){
					if(previousFile != ''){
						const previousFileConst = previousFile;
						logsHtml.push(<div className={styles.logLineParent}><VisibilitySensor onChange={ (visible) => this.fileInViewPort(visible, previousFileConst)}><div className={styles.logLine}>  {separator + previousFile + separator} </div></VisibilitySensor></div>)
						logsHtml.push(<div className={styles.logLineParent}><div> <br/></div></div>)
					}
					logsHtml.push(<div className={styles.logLineParent}>
						<VisibilitySensor onChange={ (visible) => this.fileInViewPort(visible, currentLogLineFileName)}>
							<div className={styles.logLine}>  {separator + currentLogLineFileName + separator} </div>
						</VisibilitySensor>
						</div>)
					previousFile  = currentLogLineFileName;
				}

				if( this.props.activeMonitoringApp[0].scrollToLine && i === this.props.activeMonitoringApp[0].scrollToLine - 1){
					logsHtml.push(<div className={styles.logLineParent}><div ref={this.startAfterSearch} className={styles.highlightLine}>  <div className={styles.logLineActions} onClick={this.bookmarkLine.bind(this, i)}>⭐</div>{logLine} </div></div>);
				}else if(this.props.activeMonitoringApp[0].highlightedLines.indexOf(i - this.props.activeMonitoringApp[0].bwdLogsCount) >= 0){
					//console.log("Highlighting line with i: " + i + " bwdLogsCount:  " + this.props.activeMonitoringApp[0].bwdLogsCount);
					logsHtml.push(<div className={styles.logLineParent}><div className={styles.highlightLine}> <div className={styles.logLineActions}onClick={this.bookmarkLine.bind(this, i)}>⭐</div> {logLine} </div></div>);
				}else{
					logsHtml.push(<div className={styles.logLineParent}><div className={styles.logLine}> <div className={styles.logLineActions} onClick={this.bookmarkLine.bind(this, i)}>⭐</div> {logLine} </div></div>);
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
		bookmarkLine: (app, line) => {dispatch({type: types.BOOKMARK_LINE, payload: {id: app.Id, line: line}});},
		setFileInViewPort: (app, file) =>  {dispatch({type: types.FILE_IN_VIEW_PORT, payload: {id: app.Id, file: file}});},
		setFileOutOfViewPort: (app, file) =>  {dispatch({type: types.FILE_OUT_OF_VIEW_PORT, payload: {id: app.Id, file: file}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
