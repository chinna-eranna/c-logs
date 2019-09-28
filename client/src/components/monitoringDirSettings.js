import { Component } from 'react';
import React from "react";
import ReactDOM from "react-dom";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import Modal from 'react-bootstrap/Modal'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import Tooltip from 'react-bootstrap/Tooltip'
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'

import * as types from '../actions/actionTypes';
import Switch from "react-switch";
import MonitoringAppLogList from './monitoringAppLogList'
import * as actions from '../actions/applicationActions'

export class MonitoringDirSettings extends Component {

	constructor(props) {
        super(props);
        this.selectLogDir = this.selectLogDir.bind(this);
        this.handleClearLogs = this.handleClearLogs.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this.handleRemove = this.handleRemove.bind(this);
        this.handleRemoveNo = this.handleRemoveNo.bind(this);
        this.handleRemoveYes = this.handleRemoveYes.bind(this);
        this.toggleDisplaySettings = this.toggleDisplaySettings.bind(this);
        this.handleSwitch = this.handleSwitch.bind(this);
        this.search = this.search.bind(this);
        this.continueTail = this.continueTail.bind(this);
        this.searchTextChangeHandler = this.searchTextChangeHandler.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.state = {tail: false, searchStrType:'TXT'};
        this.togglesearchStrType = this.togglesearchStrType.bind(this);
   }

    selectLogDir(){
        this.props.selectApp(this.props.app.Id);
    }

    handleClearLogs(){
        this.props.clearLogs(this.props.app.Id);
    }

    handleReset(){
        this.props.resetApp(this.props.app);
    }

    handleRemove(){
        this.setState({'stopMonitoringApp' : true});
    }

    handleRemoveNo(){
        this.setState({'stopMonitoringApp' : false});
    }
    handleRemoveYes(){
        this.setState({'stopMonitoringApp' : false});
        this.props.stopMonitoring(this.props.app.Id);
    }
    handleSwitch(state) {
        console.log('Tail new state:', state);
        this.state.tail = state
        if(state){
            this.props.startTail(this.props.app.Id);
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }else{
            this.props.stopTail(this.props.app.Id);
        }
    }
    togglesearchStrType(){
        if(this.state.searchStrType === '.*'){
            this.setState({searchStrType:'TXT'});
        }else{
            this.setState({searchStrType:'.*'});
        }
    }

    toggleDisplaySettings(){
        if(this.props.app.displaySettings){
            this.props.hideSettings(this.props.app.Id);
        }else{
            this.props.showSettings(this.props.app.Id);
        }
    }
	componentDidMount(){
		if(this.props.app.tail){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
            this.continueTail(this.props.app);
        }
    }

    componentDidUnMount(){

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

    search(){
        if(this.props.app.searchText  && this.props.app.searchText.length > 0){
            this.props.search(this.props.app, this.state.searchStrType);
        }else{
            console.log("Search is not trigger for app ", this.props.app, "as searchText is null")
        }
    }

    searchTextChangeHandler(evt){
        this.props.setSearchText(this.props.app.Id,  evt.target.value);
    }

    handleKeyPress(evt){
        const keyCode = evt.keyCode ? evt.keyCode : evt.charCode
        if (keyCode === 13 /*Enter Key code */ || evt.which === 13 || evt.key === 'Enter')
           this.search();
    }
      
    continueTail(app){
        this.setState({tail: true});
        if(this.state.tailStartLogsLinesCount === undefined){
            this.setState({tailStartLogsLinesCount: this.props.logsCount});
        }
        console.log("props.logsCount : " + this.props.logsCount + " : this.state.tailStartLogsLinesCount - " + this.state.tailStartLogsLinesCount);
        if((this.props.logsCount - this.state.tailStartLogsLinesCount) >= 200){
            console.log("Stopping the trail");
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
        
        let settingsContent = '';
        if(this.props.app.Id === this.props.activeAppId){
            backgroundColor = 'white';
            textColor = 'green'
        }
      
        const searchText = this.props.app.searchText  ? this.props.app.searchText :  '';
        if(this.props.app.displaySettings){
            settingsContent = ( 
            <div style={{border:'1px dashed black', padding:'2px',borderRadius:'0.0rem 0.0rem .2rem.2rem', marginBottom:'2px', borderColor:'yellow'}}>
                <div style={{display:'flex', marginTop:'3px'}}>
                    <div style={{flexGrow:'1'}}>
                    <InputGroup size="sm">
                        <InputGroup.Prepend>
                            <Button variant="outline-warning" onClick={() => this.togglesearchStrType()}>{this.state.searchStrType}</Button>
                        </InputGroup.Prepend>
                        <FormControl ref="inputNode" aria-describedby="basic-addon1" value={searchText} onKeyUp={(event) => this.handleKeyPress(event)} onChange={(e) => this.searchTextChangeHandler(e)} autoFocus={true}/>
                    </InputGroup>
                      
                    </div> 
                    <div style={{cursor: 'pointer', padding: '2px 5px 0px 5px' , fontSize: '20px'}} onClick={(e) => this.search()}>🔍</div>
                </div>
                <div style={{marginTop:'0.5rem', marginRight: '10px'}}>
                    <InputGroup size="sm">
                        <InputGroup.Prepend>
                            <InputGroup.Text id="basic-addon1">Actions</InputGroup.Text>
                        </InputGroup.Prepend>
                        <DropdownButton size="sm" variant="outline-warning" id="dropdown-basic-button" title="-Choose Action-">
                            <Dropdown.Item onClick={this.handleClearLogs}>Clear Logs</Dropdown.Item>
                            <Dropdown.Item onClick={this.handleRemove}>Remove</Dropdown.Item>
                            <Dropdown.Item onClick={this.handleReset}>Reset</Dropdown.Item>
                        </DropdownButton>
                    </InputGroup>
                </div>
               
                <div style={{display:'flex', marginTop:'0.5rem'}}>
                    <div style={{flexGrow:'1', textAlign:'left'}}>
                        <div style={{display:'flex'}}>
                            <div style={{paddingRight: '0.5rem'}}>Tail :</div>
                            <Switch
                                checked={this.props.app.tail}
                                onChange={this.handleSwitch}
                                onColor="#86d3ff"
                                onHandleColor="#2693e6"
                                handleDiameter={30}
                                uncheckedIcon={false}
                                checkedIcon={false}
                                boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
                                activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
                                height={20}
                                width={48}
                                className="react-switch"
                                id="material-switch"
                            />
                        </div>
                    </div>
                </div>
            </div>
            )
        }

        let tailEmoji = ''
        if(this.props.app.tail){
            tailEmoji = <div style={{padding:'2px', color:'darkblack'}}>{'🏃'}</div>
        }

        let modalDialog = '';
        if(this.state.stopMonitoringApp){
            modalDialog  =  (
            <Modal show={this.state.stopMonitoringApp} onHide={this.handleRemoveNo} centered>
            <Modal.Header closeButton>
            <Modal.Title><div style={{color:'black'}}>Confirmation</div></Modal.Title>
            </Modal.Header>
            <Modal.Body><div style={{color:'black'}}>Stop Monitoring Application {this.props.app.Name} ?</div></Modal.Body>
            <Modal.Footer>
            <Button variant="danger" size="sm" onClick={this.handleRemoveNo}>
                No
            </Button>
            <Button variant="success" size="sm" onClick={this.handleRemoveYes}>
                Yes
            </Button>
            </Modal.Footer>
        </Modal>
            )
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
        clearLogs: (appId) => {dispatch({type: types.CLEAR_LOGS, payload:{'id': appId}});},
        resetApp: (app) => {dispatch(actions.resetApp(app));},
        showSettings: (appId) => {dispatch({type: types.TOGGLE_DISPLAY_SETTINGS, payload:{'id': appId, 'displaySettings':true}})},
        hideSettings: (appId) => {dispatch({type: types.TOGGLE_DISPLAY_SETTINGS, payload:{'id': appId, 'displaySettings':false}})},
        setSearchText: (appId, searchText) =>  {dispatch({type: types.SET_SEARCH_TEXT, payload: {'id' : appId, 'searchText': searchText}})},
        tail: (app)  => {dispatch(actions.tailContent(app));},
        startTail: (appId) => { dispatch({type: types.START_TAIL, payload: {'id':appId}});},
        stopTail: (appId) => { dispatch({type: types.STOP_TAIL, payload: {'id':appId}});},
        getMoreLogs: (app)  => {dispatch(actions.getMoreLogs(app));},
        search:  (app, searchStrType) => {dispatch(actions.search(app, searchStrType));},
        stopMonitoring: (appId) => { dispatch({type: types.STOP_MONITORING, payload: {'id':appId}});},
        openSearchDone: () => {dispatch({type: types.OPEN_SEARCH_DONE, payload: {}})}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(MonitoringDirSettings);
