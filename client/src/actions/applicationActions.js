import * as types from './actionTypes';
import * as _async from 'async'
import {monitorHostLogs, getLogDirectories,createLogDirectory,saveLogDirectory,deleteLogDirectory,stopMonitoring, startMonitoring, getLogMessages, searchInApp, resetMonitoring, getFiles} from '../services/appLogServices'

export function monitorHost(host){
    return dispatch => {
        dispatch({type: types.SET_HOST, payload: {'host':host}});
        const monitorHostPromise = monitorHostLogs(host);
        const fetchApplicationsPromise =  fetchApplications();
        Promise.all([fetchApplicationsPromise, monitorHostPromise]).then(function(response){
            dispatch({type: types.LOGSET_LIST, payload: response[0].data});
        }, function(err){
            console.log("Error while fetching the applications, show error to user");
        })
       /* return new Promise((resolve, reject) => {
            resolve(fetchApplications());
        }).then(data => {
            dispatch({type: types.LOGSET_LIST, payload: data});
        });
        */
    }
}

export function fetchApplications(){
    return dispatch => {
        const fetchApplicationsPromise =  getLogDirectories();
        fetchApplicationsPromise.then(function(response){
            console.log("Successfully fetched LogSets definitions")
            dispatch({type: types.LOGSET_LIST, payload: response.data});
        }, function(err){
            console.log("Error while fetching the applications, show error to user");
        });
    }
}

export function addNewLogSet(name, logDirectory, logFilePattern){
    return dispatch => {
        console.log("Name: " + name + " LogDirectory: " + logDirectory + " logFilePattern:  " + logFilePattern);
        createLogDirectory(name, logDirectory,  logFilePattern).then(function(response){
            console.log("Log Directory created");
            fetchApplications()(dispatch);
        }, function(err){
            console.log("Log Directory creation failed");
        });
    };
}

export function saveLogSet(id, name, logDirectory, logFilePattern){
    return dispatch => {
        console.log("Name: " + name + " LogDirectory: " + logDirectory + " logFilePattern:  " + logFilePattern);
        saveLogDirectory(id, name, logDirectory,  logFilePattern).then(function(response){
            console.log("Log Directory updated");
            fetchApplications()(dispatch);
        }, function(err){
            console.log("Log Directory updation failed: " + err);
        });
    };
}

export function  deleteApplicationLog(id){
    return  dispatch => {
        deleteLogDirectory(id).then(function(response){
            console.log("Succesfully deleted log directory");
            fetchApplications()(dispatch);
        }, function(err){
            console.log("Log Directory delete failed: " + err);
        });
    }
}

export function monitorLogSetWithReset(app, startLogFile, fullContent){
    return dispatch => {
        //TODO a progress bar should be displayed before starting the monitoring
        stopMonitoring(app.Id).then(function(response){
            dispatch({type: types.STOP_MONITORING, payload: {'id':app.Id}});
            startMonitorLogSet(app, startLogFile, fullContent, dispatch);
        }, function(err){
            console.log("Error while stopping the monitoring of an app, show error to user");
        });
    }
}
export function monitorLogSet(app, startLogFile, fullContent){
    return dispatch => {
        //TODO a progress bar should be displayed before starting the monitoring
        startMonitorLogSet(app, startLogFile, fullContent, dispatch);
    }
}

function startMonitorLogSet(app, startLogFile, fullContent, dispatch){
    startMonitoring(app.Id, startLogFile).then(function(response){
        dispatch({type: types.MONITOR_LOGSET, payload: {monitoringLogSet: app, tail: !fullContent}});
        if(fullContent){
            console.log("Getting the full conetent of the file ", startLogFile);
             getLogMessages(app.Id, 'fwd', true).then((response) => {
                 const logsLinesCount =  logsResponseHandler(app, 'fwd', dispatch, response);
                 resetMonitoring(app.Id, startLogFile, logsLinesCount+1).then(function(response){
                     getLogs(app, 'fwd', dispatch);
                 });
             });
        }else{
             console.log("Invoking getLogs in success response handler of startMonitoring for app  " + JSON.stringify(app)) ; 
             getLogs(app, 'fwd', dispatch);
        }
     }, function(err){
         console.log("Error while starting the monitoring of an app, show error to user");
     })
}

export function searchInFile(app, nextFileIndex, searchStrType){
    return dispatch =>  {
        if(!app.searchInProgress){
            console.log("searchInProgress is stopped");
            return;
        }
        const fileName = app.filesToSearch[nextFileIndex].Name;
        console.log("Got action to search in file: " + fileName);
        searchInApp(app.Id, app.searchText, searchStrType, [fileName]).then(function(response){
            dispatch({type: types.APPEND_SEARCH_RESULTS, payload: {id: app.Id, searchResults: response.data}});
        }, function(err){
            console.log("Error in the search request ", err);
            dispatch({type: types.APPEND_SEARCH_RESULTS, payload: {id: app.Id, searchResults: err.response.data}});
        });
    };
}

export function search(app, searchStrType) {
    return dispatch => {
        console.log("Starting search for app ", app.Name, " with search text ", app.searchText);
        dispatch({type: types.SEARCH_START, payload: {id: app.Id, 'searchProgress': true}});
        getFiles(app.Directory, app.LogFilePattern).then(function(response){
            if(response && response.data && response.data != null && response.data.length > 0){
                const sortedFileList = _.sortBy(response.data, function(o) { return o.LastModified * -1; });
                dispatch({type: types.FILES_TO_SEARCH, payload: {id: app.Id, 'filesToSearch': sortedFileList}});
                /*
                _async.mapLimit(sortedFileList, 1, (file, asyncCallback) => {
                    searchInApp(app.Id, app.searchText, searchStrType, [file.Name]).then(function(response){
                        dispatch({type: types.APPEND_SEARCH_RESULTS, payload: {id: app.Id, searchResults: response.data}});
                        setTimeout(() => {
                            asyncCallback(null, response.data);
                        }, 2000);
                    }, function(err){
                        console.log("Error in the search request ", err);
                        dispatch({type: types.APPEND_SEARCH_RESULTS, payload: {id: app.Id, searchResults: err.response.data}});
                    });
                    
                }, (error, results) => {
                    console.log("Result is invoked, ", results);
                    dispatch({type: types.SEARCH_STOP, payload: {id: app.Id}});  
                });*/
            }else{
                console.log("No Files to search for");
                dispatch({type: types.SEARCH_STOP, payload: {id: app.Id}});
            }
        });
    }
}

export function getMoreLogs(app, direction){
    console.log("Invoked getMoreLogs for app  " + app.Name + " direction: " +  direction) ; 
    return dispatch  => {  
        if(direction === 'down'){ 
            getLogs(app, 'fwd', dispatch);
        }else{
            getLogs(app, 'bwd', dispatch);
        }
    }
}

export function reset(app, file, lineNumber, searchCursor){
    return dispatch => {
        dispatch({type: types.SET_CURRENT_SEARCH_CURSOR, payload: {id: app.Id, searchCursor: searchCursor}})
        var adjustedLineNumberToLoad = lineNumber > 100 ? lineNumber - 100 : 1;
        var adjustedLineNumberToScroll = lineNumber > 100 ? 100 : parseInt(lineNumber);
        resetMonitoring(app.Id, file, adjustedLineNumberToLoad).then(function(response){
            console.log("Successfully reset monitoring");
            dispatch({type: types.CLEAR_LOGS, payload: {id: app.Id}})
            dispatch({type: types.START_TAIL, payload: {id: app.Id}})
            dispatch({type: types.SET_SCROLL_POSITION, payload: {'top':0}});
            dispatch({type: types.SCROLL_TO_LINE, payload: {id: app.Id, 'scrollToLine':adjustedLineNumberToScroll}});
            dispatch({type: types.SELECT_CONTENT_VIEW, payload:{'id': app.Id, 'contentViewKey':'logs'}})
        }, function(err){
            console.log("Error while reset monitoring - ", err);
        });
    }
}

export function navigateToFile(logset, navigation){
    return dispatch => {
        //code is being duplicated?
        getFiles(logset.Directory, logset.LogFilePattern).then(function(response){
            console.log(`Got files  for directory ${logset.Directory}`);
            if(response && response.data && response.data != null && response.data.length > 0){
                dispatch({type: types.FILES_LIST, payload: {filesList: response.data}});
                const sortedFileList = _.sortBy(response.data, function(o) { return o.LastModified * -1; })
                console.log("Sorted FileList:  " + JSON.stringify(sortedFileList) +  " currentFile:    "  +  logset.currentFile + " Navigation: " + navigation);
                var currentFileObjIndex  = -1;
                sortedFileList.some((elem, index) => {
                    console.log("Elem:  " + JSON.stringify(elem));
                    if(elem.Name === logset.currentFile){
                        currentFileObjIndex =  index;
                        return true;
                    }
                })
                if(currentFileObjIndex ==  -1){
                    console.log("Current viewing file not found");
                    return;
                } 
                if(currentFileObjIndex == 0  && navigation === 'next' || currentFileObjIndex === sortedFileList.length && navigation === 'prev'){
                    console.log("No next/prev file found");
                }
                const fileToNavigate = sortedFileList[navigation === 'next' ? (currentFileObjIndex - 1) : (currentFileObjIndex + 1)];
                /*
                const fileToNavigate = sortedFileList.reduce((prevFileObj, currFileObj) => {
                    if (navigation != 'prev' && prevFileObj.Name != currentFileObj[0].Name)
                        return prevFileObj;
                    else
                        return (navigation  === 'prev') ? (currFileObj.LastModified < prevFileObj.LastModified ? currFileObj :  prevFileObj):
                        (currFileObj.LastModified > prevFileObj.LastModified?  currFileObj :  prevFileObj);
                }, currentFileObj[0]);*/
                console.log("fileToNavigate: " + JSON.stringify(fileToNavigate));
                
                monitorLogSetWithReset(logset, fileToNavigate.Name, false)(dispatch);
            }else{
                console.log("No Files to list");
            }
        }, function(err){
            console.log(`Error while getFiles for directory ${logset.Directory} - `, err);
        });
    };
}

export function moveSearchCursor(app, cursor){
    const searchResults = app.searchResults;
    if(!searchResults || searchResults.length == 0){
        console.log("Invalid searchResults for reset");
        return;
    }
    if(cursor < 0 || cursor >= searchResults.length) {
        console.log("Invalid search cursor for reset");
        return;
    }

    const result = searchResults[cursor];
    const file = result.Name.slice(result.Name.lastIndexOf("/") + 1);
    const lineNumber = result.Line;
    return reset(app, file, lineNumber, cursor);
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
        dispatch({type: types.OPEN_SEARCH, payload: {}});
    }
}

export function resetApp(app){
    return (dispatch) => {
        getFiles(app.Directory, app.LogFilePattern).then(function(response){
            if(response && response.data && response.data != null && response.data.length > 0){
                dispatch({type: types.FILES_LIST, payload: {filesList: response.data}});
                dispatch({type: types.RESET_MONITOR_LOGSET, payload:{'name': app.Name}});
            }else{
                console.log("No Files to list");
            }
        }, function(err){
            console.log(`Error while fetchFilesWithPromise for directory ${directory} - `, app.Directory);
        });
       
    }
}

function getLogs(app, direction, dispatch){
    dispatch({type: types.FETCH_LOGS_START, payload: {id:app.Id}});
    getLogMessages(app.Id, direction, false).then((response) => {logsResponseHandler(app, direction, dispatch, response)});
}

function logsResponseHandler(app, direction, dispatch, response){
        var logsLinesCount = 0;
        if(response && response.data && response.data != null && response.data.length > 0){
            console.log("Got " + response.data.length + " logs for app " + app.Name);
            dispatch({type: types.LOGS_MESSAGES, payload: {id:app.Id, logs:response.data, direction: direction}});
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
