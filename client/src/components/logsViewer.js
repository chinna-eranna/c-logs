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

export class LogsViewer extends Component {

	constructor(props){
		super(props);
		this.loadMoreLogs = this.loadMoreLogs.bind(this);
		this.getLogsToDisplay = this.getLogsToDisplay.bind(this);
		this.paneDidMount = this.paneDidMount.bind(this);
		this.state = {items: [<div>1</div>], initialLoad:false}
		this.startAfterSearch = undefined;
	}

	loadMoreLogs(){
		//if(this.props.activeMonitoringApp[0].tail){
			console.log("Load more logs invoked");
			this.props.getMoreLogs(this.props.activeMonitoringApp[0]);
		//}else{
		//	console.log("Tailing is OFF, hence not loading");
		//}
	}

	componentDidMount(){
		console.log("Mount life cycle method");
	}

	paneDidMount(node){
		console.log("Node did mount");
		if (node) {
		  node.addEventListener('scroll', () => console.log('scroll! Left: ' + node.scrollLeft + " Top:" + node.scrollTop));
		}
	};

	render() {
		console.log("Active Monitoring App in LogsViewer render : ", this.props.activeMonitoringApp);
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
		/*
		console.log("componentDidUpdate life cycle method");
		if(this.startAfterSearch){
			console.log("Found startAfterSearch ref element");
			//window.scrollTo(0, this.refs.startAfterSearch.offsetTop)   
			this.startAfterSearch.scrollIntoView({ behavior: 'smooth', block: 'start' });

		} else{
			console.log("Not found startAfterSearch ref element");
		}
		*/
	}


	getLogsToDisplay(){
		this.startAfterSearch  = createRef();
		if(this.props.logs){
			console.log("Logs length:" + this.props.logs.length);
			var logsHtml = [];
			for(var i = 0; i < this.props.logs.length;  i++){
			//	logsHtml.push(<div style={{wordWrap: 'break-word', backgroundColor: '#6d6d6d', paddingTop:'1px', fontFamily: 'Verdana', color: 'white'}//}>  {this.props.logs[i]} </div>);
				//if( i === 10){
				//	logsHtml.push(<div ref={this.startAfterSearch} className={styles.logLine}>  {this.props.logs[i]} </div>);
				//}else{
					logsHtml.push(<div className={styles.logLine}>  {this.props.logs[i]} </div>);
				//}
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
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
