import { Component } from 'react';
import React from "react";
import ReactDOM from "react-dom";
import { connect } from 'react-redux';
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'

import * as types from '../actions/actionTypes';
import * as actions from '../actions/applicationActions'

export class ApplicationLog extends Component {

	constructor(props) {
        super(props);
        this.selectLogDir = this.selectLogDir.bind(this);
        this.continueTail = this.continueTail.bind(this);
        this.state = {tail: false, searchStrType:'TXT'};
   }

    selectLogDir(){
        this.props.selectApp(this.props.app.Id);
    }

    componentDidMount(){
		if(this.props.app.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }
    }

    componentDidUpdate(){
        if(this.props.app.tail && !this.state.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }
        if(this.props.app.openSearch){
            let node = ReactDOM.findDOMNode(this.refs.inputNode);
            if (node && node.focus instanceof Function) {
                node.focus();
            }
            this.props.openSearchDone();
        }
    }

    continueTail(app){
        this.setState({tail: true});
        if(this.state.tailStartLogsLinesCount === undefined){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
        }
        if((this.props.logsCount - this.state.tailStartLogsLinesCount) >= 200){
            this.props.stopTail(app.Id);
            this.setState({tail: false});
            return;
        }else{
            this.props.getMoreLogs(app);
            setTimeout(() => {
                if(this.props.app.tail){
                    this.continueTail(app);
                }
            }, 100);
        }
    }


	render() {
        let backgroundColor = ''
        let textColor = 'white'
        
        if(this.props.app.Id === this.props.activeAppId){
            backgroundColor = 'white';
            textColor = 'green'
        }
      
   
        let tailEmoji = ''
        if(this.props.app.tail){
            tailEmoji = <div style={{padding:'2px', color:'darkblack'}}>{'🏃'}</div>
        }

   
		return (
            <div>
                <div>
                    <div >
                    <OverlayTrigger overlay={<Tooltip id="tooltip-disabled">{this.props.app.Name}</Tooltip>}>
                        <div style={{display:'flex', border:'2px solid black', marginTop:'0.5rem',  borderRadius:'.2rem', padding:'2px', cursor:'pointer', background:backgroundColor, color: textColor, fontSize:'.875rem'}}>
                            <div style={{flexGrow:'1', textAlign:'left', width:'100%', overflow:'hidden', textOverflow:'ellipsis'}} onClick={(e) => this.selectLogDir()}>{this.props.app.Name}</div>
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
        activeAppId: state.application.activeAppId
	};
};

const mapDispatchToProps = dispatch => {
	return {
        selectApp:(appId) => { dispatch({type: types.SELECT_APP, payload: {'id':appId}});},
        tail: (app)  => {dispatch(actions.tailContent(app));},
        startTail: (appId) => { dispatch({type: types.START_TAIL, payload: {'id':appId}});},
        stopTail: (appId) => { dispatch({type: types.STOP_TAIL, payload: {'id':appId}});},
        getMoreLogs: (app)  => {dispatch(actions.getMoreLogs(app, 'down'));},
        openSearchDone: () => {dispatch({type: types.OPEN_SEARCH_DONE, payload: {}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(ApplicationLog);
