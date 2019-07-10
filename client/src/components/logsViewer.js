import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Container from 'react-bootstrap/Container'
import Jumbotron from 'react-bootstrap/Jumbotron'
import InfiniteScroll from 'react-infinite-scroller';
import { getLogMessages } from '../services/appLogServices';
import *  as actions from '../actions/applicationActions';
import * as types from '../actions/actionTypes';

export class LogsViewer extends Component {

	constructor(props){
		super(props);
		this.loadMoreLogs = this.loadMoreLogs.bind(this);
		this.getLogsToDisplay = this.getLogsToDisplay.bind(this);
		this.paneDidMount = this.paneDidMount.bind(this);
		this.onScroll = this.onScroll.bind(this);
		this.state = {items: [<div>1</div>]}
	}

	loadMoreLogs(){
		this.setState({ initialLoad: false });
		if(!this.props.activeMonitoringApp[0].tail){
			console.log("Load more logs invoked");
			this.props.getMoreLogs(this.props.activeMonitoringApp[0]);
		}else{
			console.log("Tailing is ON, hence not loading");
		}
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

	componentDidUpdate(){
		console.log("Update life cycle method");
		if(this.refs.elem){
			this.refs.elem.scrollTop = this.props.activeMonitoringApp[0].scrollTop;
		}else{
			console.log("Ref is not defined yet");
		}
	}
	onScroll(){
		var node = this.refs.elem;
		this.props.setScrollPosition(node.scrollTop);
	}

	render() {
		console.log("Active Monitoring App in LogsViewer rendeer : ", this.props.activeMonitoringApp);
		if (this.props.activeMonitoringApp && this.props.activeMonitoringApp.length > 0) {
			return (
					<div ref="elem" onScroll={ this.onScroll } style={{border:'2px solid black', padding:'2px', height:'100vh', overflow:'auto'}}>
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
			return (<Container> Please select an application to view logs </Container>);
		}
	}


	getLogsToDisplay(){
		if(this.props.logs){
			console.log("Logs length:" + this.props.logs.length);
			var logsHtml = [];
			for(var i = 0; i < this.props.logs.length;  i++){
				logsHtml.push(<div style={{wordWrap: 'break-word', backgroundColor: '#dee2e6', margin:'1px'}}>  {this.props.logs[i]} </div>);
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
		setScrollPosition:(topPosition) => { dispatch({type: types.SET_SCROLL_POSITION, payload: {'top':topPosition}});}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
