import {Component} from 'react';
import React from "react";


export default class SearchResults extends Component {
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
    }

    render(){
        let searchResultContent = this.props.results.map((result) => {
            return (<div><span style={{cursor: 'pointer', paddingRight:'3px', background:'gray'}} onClick={() => this.showLogs(this.getName(result.Name), result.Line)}>[{this.getName(result.Name)}:{result.Line}]</span> {result.Text}</div>)
        })
        return (<div style={{overflow:'auto'}}>{searchResultContent}</div>)
    }
}