import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import ListGroup from 'react-bootstrap/ListGroup'
import ListGroupItem from 'react-bootstrap/ListGroupItem'
import Modal from 'react-bootstrap/Modal'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Dropdown from 'react-bootstrap/Dropdown'
import DropdownButton from 'react-bootstrap/DropdownButton'
import * as types from '../actions/actionTypes';
import MonitoringDirSettings from './monitoringDirSettings'
import * as actions from '../actions/applicationActions'
import AddApplication from './addApplication'



export class MonitoringAppLogList extends Component {

	constructor(props) {
        super(props);
        this.selectApplication = this.selectApplication.bind(this);
		this.state = {  }
    }
    
    componentDidMount(){
		this.props.fetchApplications();
	}

    selectApplication(appId) {
        console.log("List item clicked: " +  appId);
        this.props.selectApp(appId);
    }
  

	render() {
        let appLogItems = [];
        console.log("Rendering MonitoringAppLogList")

        this.props.monitoringApps.map((app, index) => {
            const appId = `${app.Id}` ;
            const active = (app.Id === this.props.activeAppId) ? true: false;
            console.log("AppName: "+ app.Name + " Active: " + active);
            appLogItems.push(<MonitoringDirSettings app={app} logsCount={app.logsCount}/>)
        }); 

        return (
            <div style={{textAlign:'center'}}>
                <hr style={{border:'3px solid blue'}}/>
                Monitoring Log Directories
                <hr style={{border:'3px solid blue'}}/>

                <AddApplication/>
  
                {appLogItems}
              
            </div>
        );
	}
}

const mapStateToProps = state => {
	return {
       monitoringApps: state.application.monitoringApps,
       activeAppId: state.application.activeAppId
	};
};

const mapDispatchToProps = dispatch => {
	return {
        selectApp:(appId) => { dispatch({type: types.SELECT_APP, payload: {'id':appId}});},
        fetchApplications:()  => {dispatch(actions.fetchApplications());}
   };
};

export default connect(mapStateToProps, mapDispatchToProps)(MonitoringAppLogList);
