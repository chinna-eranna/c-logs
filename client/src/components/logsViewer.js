import { Component } from 'react';
import React, {createRef} from "react";
import { connect } from 'react-redux';
import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button';
import Jumbotron from 'react-bootstrap/Jumbotron'
import InfiniteScroll from 'react-infinite-scroller';
import { getLogMessages } from '../services/appLogServices';
import *  as actions from '../actions/applicationActions';
import * as types from '../actions/actionTypes';
import styles from '../css/app.css';
import _ from 'lodash'
import VisibilitySensor from 'react-visibility-sensor';
import scrollToComponent from 'react-scroll-to-component';
import ReactHtmlParser, {convertNodeToElement} from 'react-html-parser';

export class LogsViewer extends Component {

	constructor(props){
		super(props);
		this.loadMoreLogs = this.loadMoreLogs.bind(this);
		this.loadNextLogs = this.loadNextLogs.bind(this);
		this.loadPrevLogs = this.loadPrevLogs.bind(this);
		this.getLogsToDisplay = this.getLogsToDisplay.bind(this);
		this.state = {items: [<div>1</div>], initialLoad:false}
		this.startAfterSearch  = createRef();
		this.bookmarkLine =  this.bookmarkLine.bind(this);
		this.fileInViewPort = this.fileInViewPort.bind(this);
		this.reverse = false;
		this.transform = this.transform.bind(this);
	}

	loadMoreLogs(page, direction){
		//if(this.props.activeMonitoringLogSet[0].tail){
			this.props.getMoreLogs(this.props.activeMonitoringLogSet[0], direction);
		//}else{
		//	console.log("Tailing is OFF, hence not loading");
		//}
	}

	loadNextLogs(){
		this.props.getMoreLogs(this.props.activeMonitoringLogSet[0], 'down');
	}
	loadPrevLogs(){
		this.props.getMoreLogs(this.props.activeMonitoringLogSet[0], 'up');
	}

	fileInViewPort(visible, file){
		console.log("VisibilitySensor callback - visibile: " + visible + " file: " + file);
		if(visible){
			this.props.setFileInViewPort(this.props.activeMonitoringLogSet[0], file);
		}else{
			this.props.setFileOutOfViewPort(this.props.activeMonitoringLogSet[0], file);
		}
	}

	bookmarkLine(line){
		this.props.bookmarkLine(this.props.activeMonitoringLogSet[0], line);
	}

	componentDidMount(){
	}

	render() {
		if (this.props.activeMonitoringLogSet && this.props.activeMonitoringLogSet.length > 0) {
			return (
				<InfiniteScroll
					initialLoad={this.state.initialLoad}
					pageStart={0}
					loadMore={this.loadMoreLogs}
					hasMore={true}
					isReverse={this.reverse}
					loader={this.props.activeMonitoringLogSet[0].loading ? <div className="loader" key={0}>Loading ...</div> : ''}
					useWindow={false}>
					{this.getLogsToDisplay()}
				</InfiniteScroll>
			)
		} else{
			return (<div style={{padding:'2px'}}><Container> Please choose a LogSet to view logs </Container></div>);
		}
	}

	componentDidUpdate(prevProp){
		
		const activeMonitoringLogSet = this.props.activeMonitoringLogSet && this.props.activeMonitoringLogSet.length > 0;
		if(!activeMonitoringLogSet){
			return;
		}

		if( this.props.activeMonitoringLogSet[0].contentViewKey !== 'logs'){
			return;
		}
		if(prevProp.activeMonitoringLogSet && prevProp.activeMonitoringLogSet.length > 0){
			if (prevProp.activeMonitoringLogSet[0].bwdLogsCount != this.props.activeMonitoringLogSet[0].bwdLogsCount){
				this.reverse = true;
			}else{
				this.reverse = false;
			}
		}

		if (this.props.activeMonitoringLogSet[0].scrollToLine && this.props.activeMonitoringLogSet[0].scrollToLine > 0 && 
			this.props.logs && this.props.logs.length >= this.props.activeMonitoringLogSet[0].scrollToLine 
			&& this.startAfterSearch.current){
			this.props.resetScrollPosition(this.startAfterSearch.current.offsetTop, this.props.activeMonitoringLogSet[0]);
			this.startAfterSearch  = createRef();
		}
		
	}

	transform(node, index) {
		console.log("Node details: type: " + node.type +  "  name: "  + node.name);
		if (node.type === 'tag' && node.name === 'font') {
		  return convertNodeToElement(node, index, transform);
		}
	  }

	getLogsToDisplay(){
		let previousFile = '';
		const separator = '**************************************';
		if(this.props.logs){
			var logsHtml = [];
			logsHtml.push(this.props.activeMonitoringLogSet[0].loadPrevLogs ?  <div style={{cursor:'pointer'}} onClick={this.loadPrevLogs}><Button variant="outline-warning" size="sm">&lt;&lt;Load Prior Logs</Button></div> : '')
			var classNameRegEx = new RegExp('\\s(\\w+\\.[\\.\\w]+\\w)\\s', 'g');
			for(var i = 0; i < this.props.logs.length;  i++){
				classNameRegEx.lastIndex = 0;
				const logLineParts = classNameRegEx.exec(this.props.logs[i][1]);
				let logLine = this.props.logs[i][1];
				console.log("LogLineParts: " + logLineParts);
				if(logLineParts  != null){
					const logLineBeforeMatch = logLine.substring(0, logLineParts.index)
					const logLineMatch = logLine.substring(logLineParts.index, classNameRegEx.lastIndex)
					const logLineAfterMatch = logLine.substring(classNameRegEx.lastIndex)
					logLine = (<React.Fragment><span>{logLineBeforeMatch}</span><span><font color="yellow">{logLineMatch}</font></span><span>{logLineAfterMatch}</span></React.Fragment>)
				}else{
					logLine = (<React.Fragment>{this.props.logs[i][1]}</React.Fragment>)
				}

				const currentLogLineFileName = this.props.logs[i][0];
			
				if(previousFile !== currentLogLineFileName){
					if(previousFile != ''){
						const previousFileConst = previousFile;
						logsHtml.push(<div className={styles.logLineParent}>
							<VisibilitySensor onChange={ (visible) => this.fileInViewPort(visible, previousFileConst)}>
								<div className={styles.logLine}>  {separator + previousFile + separator} </div>
							</VisibilitySensor></div>)
						logsHtml.push(<div className={styles.logLineParent}><div> <br/></div></div>)
					}
					if(currentLogLineFileName != ''){
						logsHtml.push(<div className={styles.logLineParent}>
							<VisibilitySensor onChange={ (visible) => this.fileInViewPort(visible, currentLogLineFileName)}>
								<div className={styles.logLine}>  {separator + currentLogLineFileName + separator} </div>
							</VisibilitySensor>
							</div>)
					}
					previousFile  = currentLogLineFileName;
				}

				let logLineHtml = '';
				if( this.props.activeMonitoringLogSet[0].scrollToLine && i === this.props.activeMonitoringLogSet[0].scrollToLine - 1){
					logLineHtml = <div ref={this.startAfterSearch} className={styles.highlightLine}> {logLine} </div>;
				}else if(this.props.activeMonitoringLogSet[0].highlightedLines.indexOf(i - this.props.activeMonitoringLogSet[0].bwdLogsCount) >= 0){
					//console.log("Highlighting line with i: " + i + " bwdLogsCount:  " + this.props.activeMonitoringLogSet[0].bwdLogsCount);
					logLineHtml = <div className={styles.highlightLine}> {logLine} </div>;
				}else{
					logLineHtml = <div className={styles.logLine}> {logLine} </div>;
				}
				logsHtml.push(<div className={styles.logLineParent}>
					<div className={styles.logLineActionsPlaceHolder}></div>
					<div className={styles.logLineActions} onClick={this.bookmarkLine.bind(this, i)}>⭐</div>
					{logLineHtml}</div>);
			}
			logsHtml.push(this.props.activeMonitoringLogSet[0].loading ? '' : <div style={{cursor:'pointer'}} onClick={this.loadNextLogs}>Click to load more..🥃</div>)
			return logsHtml;
		}else{
			console.log("No logs yet");
			return [<div> No Logs to display </div>];
		}
	}

}


const mapStateToProps = state => {
	return {
		activeLogSetId: state.application.activeLogSetId,
		activeMonitoringLogSet: state.application.monitoringLogSets.filter(logSet => logSet.Id === state.application.activeLogSetId),
        logs: state.application["logs_" +  state.application.activeLogSetId]
	};
};

const mapDispatchToProps = dispatch => {
	return {
		getMoreLogs: (logSet, direction)  => {dispatch(actions.getMoreLogs(logSet, direction));},
		resetScrollPosition:(topPosition, logSet) => { dispatch({type: types.RESET_SCROLL_POSITION, payload: {id: logSet.Id, 'top':topPosition}});},
		bookmarkLine: (logSet, line) => {dispatch({type: types.BOOKMARK_LINE, payload: {id: logSet.Id, line: line}});},
		setFileInViewPort: (logSet, file) =>  {dispatch({type: types.FILE_IN_VIEW_PORT, payload: {id: logSet.Id, file: file}});},
		setFileOutOfViewPort: (logSet, file) =>  {dispatch({type: types.FILE_OUT_OF_VIEW_PORT, payload: {id: logSet.Id, file: file}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
