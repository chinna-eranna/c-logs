import { Component } from 'react';
import React from "react";
import ReactDOM from "react-dom";
import { connect } from 'react-redux';
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'

import * as types from '../actions/actionTypes';
import * as actions from '../actions/applicationActions'

export class MonitoringLogSet extends Component {

	constructor(props) {
        super(props);
        this.selectLogDir = this.selectLogDir.bind(this);
        this.continueTail = this.continueTail.bind(this);
        this.state = {tail: false, searchStrType:'TXT'};
   }

    selectLogDir(){
        this.props.selectApp(this.props.logSet.Id);
    }

    componentDidMount(){
		if(this.props.logSet.tail){
           // this.setState({tailStartLogsLinesCount: this.props.logsCount});
           // this.continueTail(this.props.logSet);
        }
    }

    componentDidUpdate(){
        if(this.props.logSet.tail && !this.state.tail){
            //this.setState({tailStartLogsLinesCount: this.props.logsCount});
            //this.continueTail(this.props.logSet);
        }
        if(this.props.logSet.openSearch){
            let node = ReactDOM.findDOMNode(this.refs.inputNode);
            if (node && node.focus instanceof Function) {
                node.focus();
            }
            this.props.openSearchDone();
        }
    }

    continueTail(logSet){
        console.log("Continuing tail in MonitoringLogSet");
        this.setState({tail: true});
        if(this.state.tailStartLogsLinesCount === undefined){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
        }
        if((this.props.logsCount - this.state.tailStartLogsLinesCount) >= 200){
            this.props.stopTail(logSet.Id);
            this.setState({tail: false});
            return;
        }else{
            this.props.getMoreLogs(logSet);
            setTimeout(() => {
                if(this.props.logSet.tail){
                    this.continueTail(logSet);
                }
            }, 100);
        }
    }


	render() {
        let backgroundColor = ''
        let textColor = 'white'
        
        if(this.props.logSet.Id === this.props.activeLogSetId){
            backgroundColor = 'white';
            textColor = 'green'
        }
      
   
        let tailEmoji = ''
        if(this.props.logSet.tail){
            tailEmoji = <div style={{padding:'2px', color:'darkblack'}}>{'🏃'}</div>
        }

   
		return (
            <div>
                <div>
                    <div >
                    <OverlayTrigger overlay={<Tooltip id="tooltip-disabled">{this.props.logSet.Name}</Tooltip>}>
                        <div style={{display:'flex', border:'2px solid black', marginTop:'0.5rem',  borderRadius:'.2rem', padding:'2px', cursor:'pointer', background:backgroundColor, color: textColor, fontSize:'.875rem'}}>
                            <div style={{flexGrow:'1', textAlign:'left', width:'100%', overflow:'hidden', textOverflow:'ellipsis'}} onClick={(e) => this.selectLogDir()}>{this.props.logSet.Name}</div>
                            {tailEmoji}
                        </div>
                        </OverlayTrigger>
                    </div>
                </div>
            </div>
       );
	}
}

const mapStateToProps = state => {
	return {
        activeLogSetId: state.application.activeLogSetId
	};
};

const mapDispatchToProps = dispatch => {
	return {
        selectApp:(logsetId) => { dispatch({type: types.SELECT_LOGSET, payload: {'id':logsetId}});},
        tail: (logSet)  => {dispatch(actions.tailContent(logSet));},
        startTail: (logsetId) => { dispatch({type: types.START_TAIL, payload: {'id':logsetId}});},
        stopTail: (logsetId) => { dispatch({type: types.STOP_TAIL, payload: {'id':logsetId}});},
        getMoreLogs: (logSet)  => {dispatch(actions.getMoreLogs(logSet, 'down'));},
        openSearchDone: () => {dispatch({type: types.OPEN_SEARCH_DONE, payload: {}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(MonitoringLogSet);
