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

    showLogs(file, lineNumber, searchIdx){
        this.props.reset(this.props.activeMonitoringApp, file, lineNumber, searchIdx);
    }

    render(){
        let searchResultContent = '';
        if(Array.isArray(this.props.activeMonitoringApp.searchResults)) {
            if(this.props.activeMonitoringApp.searchResults.length === 0){
                if(this.props.activeMonitoringApp.searchInProgress){
                    searchResultContent = (<div>Searching logs...</div>);
                }else{
                    searchResultContent = (<div>No Search Results</div>);
                }
            }else{
                searchResultContent = this.props.activeMonitoringApp.searchResults.map((result, idx) => {
                    if(result.Name && result.Line &&  result.Text) {
                        return (<div style={{fontSize:'0.85em',fontFamily: 'Verdana'}}><span style={{cursor: 'pointer', paddingRight:'3px', background:'#b5a061'}} onClick={() => this.showLogs(this.getName(result.Name), result.Line, idx)}>[{this.getName(result.Name)}:{result.Line}]</span> {result.Text}</div>)
                    }else{
                        return (<div style={{fontSize:'0.85em',fontFamily: 'Verdana'}}>{result}</div>)
                    }
                })
            }
        }else if(this.props.activeMonitoringApp.searchInProgress){
            searchResultContent = 'Searching logs...';
        }else{
            searchResultContent = <div>{this.props.activeMonitoringApp.searchResults}</div>
        }
        return (<div style={{overflow:'auto'}}>{searchResultContent}</div>)
    }
}

const mapStateToProps = state => {
	return {

    };
};

const mapDispatchToProps = dispatch => {
	return {
        reset: (app, file, lineNumber, searchIdx) => {dispatch(actions.reset(app, file, lineNumber, searchIdx));}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(SearchResults);