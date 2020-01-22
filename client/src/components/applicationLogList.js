import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import * as types from '../actions/actionTypes';
import ApplicationLog from './applicationLog'
import * as actions from '../actions/applicationActions'
import ChooseApplicationLog from './chooseApplicationLog'

export class ApplicationLogList extends Component {

	constructor(props) {
        super(props);
        this.selectApplication = this.selectApplication.bind(this);
		this.state = {  }
    }
    
    componentDidMount(){
		this.props.fetchApplications();
	}

    selectApplication(appId) {
        this.props.selectApp(appId);
    }

	render() {
        let appLogItems = [];
       
        this.props.monitoringApps.map((app, index) => {
            const appId = `${app.Id}` ;
            const active = (app.Id === this.props.activeAppId) ? true: false;
            appLogItems.push(<ApplicationLog app={app} logsCount={app.logsCount}/>)
        }); 

        return (
            <div style={{textAlign:'center'}}>
                <hr style={{border:'2px solid #ffc107'}}/>
               
                <ChooseApplicationLog/>
  
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

export default connect(mapStateToProps, mapDispatchToProps)(ApplicationLogList);
