import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Container from 'react-bootstrap/Container'
import Jumbotron from 'react-bootstrap/Jumbotron'
import InfiniteScroll from 'react-infinite-scroller';
import { getLogMessages } from '../services/appLogServices';
import *  as actions from '../actions/applicationActions';

export class LogsViewer extends Component {

	constructor(props){
		super(props);
		this.loadMoreLogs = this.loadMoreLogs.bind(this);
		this.getLogsToDisplay = this.getLogsToDisplay.bind(this);
		this.state = {items: [<div>1</div>]}
	}

	loadMoreLogs(){
		this.setState({ initialLoad: false });
		console.log("Load more logs invoked");
		this.props.getMoreLogs(this.props.activeMonitoringApp[0]);
	}

	componentDidMount(){
		
	}

	render() {
		if (this.props.activeMonitoringApp && this.props.activeMonitoringApp.length > 0) {
			return (
					<div style={{border:'2px solid black', padding:'10px', height:'700px', overflow:'auto'}}>
				<InfiniteScroll
					initialLoad={this.state.initialLoad}
					pageStart={0}
					loadMore={this.loadMoreLogs}
					hasMore={true}
					loader={<div className="loader" key={0}>Loading ...</div>}
					useWindow={false}>
					{this.getLogsToDisplay()}
				</InfiniteScroll>
			</div>
			)
		} else if(this.props.host &&  this.props.host.length > 0){
			return (<Container> Please select an application to view logs </Container>);
		} else{
			return (<Container> Please enter a Host IP to view logs </Container>);
		}
	}


	getLogsToDisplay(){
		if(this.props.logs){
			console.log("Logs length:" + this.props.logs.length);
			var logsHtml = [];
			for(var i = 0; i < this.props.logs.length;  i++){
				logsHtml.push(<div style={{wordWrap: 'break-word', backgroundColor: '#dee2e6', margin:'1px'}}>  {this.props.logs[i]} </div>);
			}
			return logsHtml;
		}else{
			console.log("No logs yet");
		return [<div> No Logs to display </div>];
		}
	}

}


const mapStateToProps = state => {
	return {
		host: state.application.host,
		activeMonitoringApp: state.application.monitoringApps.filter(app => app.active),
		logs: state.application.logs
	};
};

const mapDispatchToProps = dispatch => {
	return {
		getMoreLogs: (app)  => {dispatch(actions.getMoreLogs(app));}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(LogsViewer);
