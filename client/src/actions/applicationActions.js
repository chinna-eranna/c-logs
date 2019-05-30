import * as types from './actionTypes';
import {monitorHostLogs, getLogDirectories, startMonitoring, getLogMessages} from '../services/appLogServices'

export function monitorHost(host){
    return dispatch => {
        dispatch({type: types.SET_HOST, payload: {'host':host}});
        const monitorHostPromise = monitorHostLogs(host);
        const fetchApplicationsPromise =  fetchApplications();
        Promise.all([fetchApplicationsPromise, monitorHostPromise]).then(function(response){
            dispatch({type: types.APPLICATIONS_LIST, payload: response[0].data});
        }, function(err){
            console.log("Error while fetching the applications, show error to user");
        })
       /* return new Promise((resolve, reject) => {
            resolve(fetchApplications());
        }).then(data => {
            dispatch({type: types.APPLICATIONS_LIST, payload: data});
        });
        */
    }
}

export function fetchApplications(){
    return dispatch => {
        const fetchApplicationsPromise =  getLogDirectories();
        fetchApplicationsPromise.then(function(response){
            dispatch({type: types.APPLICATIONS_LIST, payload: response.data});
        }, function(err){
            console.log("Error while fetching the applications, show error to user");
        })
    }
}

export function monitorAppLog(app){
    return dispatch => {
        //TODO a progress bar should be displayed before starting the monitoring
        startMonitoring(app.Id).then(function(response){
           console.log("Invoking getLogs in success response handler of startMonitoring for app  " + JSON.stringify(app)) ; 
           getLogs(app, dispatch);
           dispatch({type: types.MONITOR_APP_LOG, payload: app});
        }, function(err){
            console.log("Error while starting the monitoring of an app, show error to user");
        })
    }
}

export function getMoreLogs(app){
    console.log("Invled getMoreLogs for app  " + JSON.stringify(app)) ; 
    return dispatch  => {   
        getLogs(app, dispatch);
    }
}

var getLogs = _.debounce(_getLogs, 3000, {leading: true, trailing: false});

function _getLogs(app, dispatch){
    console.log("getLogs: app: " + JSON.stringify(app));
    getLogMessages(app.Id).then((response) => {logsResponseHandler(app, dispatch, response)});
}

function logsResponseHandler(app, dispatch, response){
        if(response.data.length == 0){
            console.log("Scheduling a timer to fetch the logs again, as there was nothing got");
            setTimeout(() => {
                console.log("logsResponseHandler - timer started: app: " + JSON.stringify(app));
                getLogs(app,  dispatch);
            }, 5000)
        }else{
            console.log("Got logs in logsResponseHandler");
            dispatch({type: types.LOGS_MESSAGES, payload: response.data});
        }
}