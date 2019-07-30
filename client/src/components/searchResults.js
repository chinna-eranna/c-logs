import {Component} from 'react';
import React from "react";
import *  as actions from '../actions/applicationActions';
import { connect } from 'react-redux';


export class SearchResults extends Component {
    constructor(props){
        super(props);
        this.getName = this.getName.bind(this);
        this.showLogs = this.showLogs.bind(this);
        
    }

    getName(path){
        return path.slice(path.lastIndexOf("/") + 1);
    }

    showLogs(file, lineNumber){
        console.log("Clicked file: ", file, " line: ", lineNumber);
        this.props.reset(this.props.activeMonitoringApp, file, lineNumber);
    }

    render(){
        let searchResultContent = '';
        if(this.props.activeMonitoringApp.searchInProgress){
            searchResultContent = 'Searching logs...'
        }else{
            searchResultContent = this.props.activeMonitoringApp.searchResults.map((result) => {
                return (<div><span style={{cursor: 'pointer', paddingRight:'3px', background:'gray'}} onClick={() => this.showLogs(this.getName(result.Name), result.Line)}>[{this.getName(result.Name)}:{result.Line}]</span> {result.Text}</div>)
            })
        }
        return (<div style={{overflow:'auto'}}>{searchResultContent}</div>)
    }
}

const mapStateToProps = state => {
	console.log("Invoking state Logs Viewer connect ---");
	return {
		
	};
};

const mapDispatchToProps = dispatch => {
	console.log("Invoking dispatch SearchResults connect ---");
	return {
        reset: (app, file, lineNumber) => {dispatch(actions.reset(app, file, lineNumber));}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchResults);