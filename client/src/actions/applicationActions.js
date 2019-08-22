import * as types from './actionTypes';
import * as _async from 'async'
import {monitorHostLogs, getLogDirectories, startMonitoring, getLogMessages, searchInApp, resetMonitoring, getFiles} from '../services/appLogServices'

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


export function monitorAppLog(app, startLogFile, fullContent){
    return dispatch => {
        //TODO a progress bar should be displayed before starting the monitoring
        startMonitoring(app.Id, startLogFile).then(function(response){
           dispatch({type: types.MONITOR_APP_LOG, payload: {monitoringApp: app, tail: !fullContent}});
           if(fullContent){
               console.log("Getting the full conetent of the file ", startLogFile);
                getLogMessages(app.Id, true).then((response) => {
                    const logsLinesCount =  logsResponseHandler(app, dispatch, response);
                    resetMonitoring(app.Id, startLogFile, logsLinesCount+1).then(function(response){
                        getLogs(app, dispatch);
                    });
                });
           }else{
                console.log("Invoking getLogs in success response handler of startMonitoring for app  " + JSON.stringify(app)) ; 
                getLogs(app, dispatch);
           }
        }, function(err){
            console.log("Error while starting the monitoring of an app, show error to user");
        })
    }
}

export function search(app, searchStrType) {
    return dispatch => {
        console.log("Starting search for app ", app.Name, " with search text ", app.searchText);
        dispatch({type: types.SEARCH_RESULTS_INPROGRESS, payload: {id: app.Id}});
        getFiles(app.Directory, app.LogFilePattern).then(function(response){
            if(response && response.data && response.data != null && response.data.length > 0){
                const sortedFileList = _.sortBy(response.data, function(o) { return o.LastModified * -1; });
                _async.mapLimit(sortedFileList, 1, (file, test) => {
                    console.log("Invoked iteratee");
                    searchInApp(app.Id, app.searchText, searchStrType, [file.Name]).then(function(response){
                        dispatch({type: types.APPEND_SEARCH_RESULTS, payload: {id: app.Id, searchResults: response.data}});
                        console.log("Successfully retrieved the search results for app " + response.data);
                        test(null, response.data);
                    }, function(err){
                        console.log("Error in the search request ", err);
                        dispatch({type: types.APPEND_SEARCH_RESULTS, payload: {id: app.Id, searchResults: err.response.data}});
                    });
                    
                }, (error, results) => {
                    console.log("Result is invoked, ", results);
                })

            }else{
                console.log("No Files to search for");
            }
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
            dispatch({type: types.SET_SCROLL_POSITION, payload: {'top':0}});
            dispatch({type: types.SELECT_CONTENT_VIEW, payload:{'id': app.Id, 'contentViewKey':'logs'}})
        }, function(err){
            console.log("Error while reset monitoring - ", err);
        });
    }
}

export function fetchFiles(directory, filePattern){
    return dispatch => {
        getFiles(directory, filePattern).then(function(response){
            console.log(`Got files  for directory ${directory}`);
            if(response && response.data && response.data != null && response.data.length > 0){
                dispatch({type: types.FILES_LIST, payload: {filesList: response.data}});
            }else{
                console.log("No Files to list");
            }
        }, function(err){
            console.log(`Error while getFiles for directory ${directory} - `, err);
        });
    }
}
export function openSearch(){
    return (dispatch) => {
        //console.log("Search open request");
        dispatch({type: types.OPEN_SEARCH, payload: {}});
    }
}

function getLogs(app, dispatch){
    console.log("getLogs: app: " + JSON.stringify(app));
    dispatch({type: types.FETCH_LOGS_START, payload: {id:app.Id}});
    getLogMessages(app.Id, false).then((response) => {logsResponseHandler(app, dispatch, response)});
}

function logsResponseHandler(app, dispatch, response){
        var logsLinesCount = 0;
        if(response && response.data && response.data != null && response.data.length > 0){
            console.log("Got logs in logsResponseHandler");
            dispatch({type: types.LOGS_MESSAGES, payload: {appId:app.Id, logs:response.data}});
            dispatch({type:  types.FETCH_LOGS_END, payload: {id:app.Id, logsCount:response.data.length}});
            logsLinesCount = response.data.length;
        }else{
            console.log("No Logs to fetch");
            if(!response.throttled){
                dispatch({type:  types.FETCH_LOGS_END, payload: {id:app.Id, logsCount:0}});
            }
        }
        return logsLinesCount;
}
