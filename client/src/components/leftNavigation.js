import { Component } from 'react';
import React from "react";
import { connect } from 'react-redux';
import * as types from '../actions/actionTypes';
import MonitoringLogSet from './monitoringLogSet'
import * as actions from '../actions/applicationActions'
import ChooseLogSet from './chooseLogSet'

export class LeftNavigation extends Component {

	constructor(props) {
        super(props);
        this.selectLogSetHandler = this.selectLogSetHandler.bind(this);
		this.state = {  }
    }
    
    componentDidMount(){
		this.props.fetchApplications();
	}

    selectLogSetHandler(logsetId) {
        this.props.selectLogSet(logsetId);
    }

	render() {
        let appLogItems = [];
       
        this.props.monitoringLogSets.map((logSet, index) => {
            const logsetId = `${logSet.Id}` ;
            const active = (logSet.Id === this.props.activeLogSetId) ? true: false;
            appLogItems.push(<MonitoringLogSet logSet={logSet} logsCount={logSet.logsCount}/>)
        }); 

        return (
            <div style={{textAlign:'center'}}>
                <hr style={{border:'2px solid #ffc107'}}/>
               
                <ChooseLogSet/>
  
                {appLogItems}
              
            </div>
        );
	}
}

const mapStateToProps = state => {
	return {
       monitoringLogSets: state.application.monitoringLogSets,
       activeLogSetId: state.application.activeLogSetId
	};
};

const mapDispatchToProps = dispatch => {
	return {
        selectLogSet:(logsetId) => { dispatch({type: types.SELECT_LOGSET, payload: {'id':logsetId}});},
        fetchApplications:()  => {dispatch(actions.fetchApplications());}
   };
};

export default connect(mapStateToProps, mapDispatchToProps)(LeftNavigation);
