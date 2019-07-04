import * as types from './actionTypes';
import {monitorHostLogs, getLogDirectories, startMonitoring, getLogMessages, searchInApp, resetMonitoring} from '../services/appLogServices'

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
           dispatch({type: types.MONITOR_APP_LOG, payload: app});
           console.log("Invoking getLogs in success response handler of startMonitoring for app  " + JSON.stringify(app)) ; 
           getLogs(app, dispatch);
        }, function(err){
            console.log("Error while starting the monitoring of an app, show error to user");
        })
    }
}

export  function tailContent(app){
    return dispatch => {
        console.log("Invoked tailContent");
        getLogMessages(app.Id).then((response) => {logsResponseHandler(app, dispatch, response)});
    }
}

export function search(app) {
    return dispatch => {
        console.log("Starting search for app ", app.Name, " with search text ", app.searchText);
        searchInApp(app.Id, app.searchText).then(function(response){
            dispatch({type: types.SEARCH_RESULTS, payload: {id: app.Id, searchResults: response.data}});
            console.log("Successfully retrieved the search results for app " + response.data);
        }, function(err){
            console.log("Error in the search request ", err);
        });
    }
}

export function getMoreLogs(app){
    console.log("Invoked getMoreLogs for app  " + JSON.stringify(app)) ; 
    return dispatch  => {   
        getLogs(app, dispatch);
    }
}

export function reset(app, file, lineNumber){
    return dispatch => {
        resetMonitoring(app.Id, file, lineNumber).then(function(response){
            console.log("Successfully reset monitoring");
            dispatch({type: types.CLEAR_LOGS, payload: {id: app.Id}})
            dispatch({type: types.START_TAIL, payload: {id: app.Id}})
            dispatch({type: types.SELECT_CONTENT_VIEW, payload:{'id': app.Id, 'contentViewKey':'logs'}})
        }, function(err){
            console.log("Error while reset monitoring - ", err);
        })
    }
}

var getLogs = _.debounce(_getLogs, 3000, {leading: true, trailing: false});

function _getLogs(app, dispatch){
    console.log("getLogs: app: " + JSON.stringify(app));
    dispatch({type: types.FETCH_LOGS_START, payload: {id:app.Id}});
    getLogMessages(app.Id).then((response) => {logsResponseHandler(app, dispatch, response)});
}

function logsResponseHandler(app, dispatch, response){
        if(response.data.length == 0){
            console.log("No Logs to fetch");
        }else{
            console.log("Got logs in logsResponseHandler");
            dispatch({type: types.LOGS_MESSAGES, payload: {appId:app.Id, logs:response.data}});
        }
        dispatch({type:  types.FETCH_LOGS_END, payload: {id:app.Id, logsCount:response.data.length}});
}