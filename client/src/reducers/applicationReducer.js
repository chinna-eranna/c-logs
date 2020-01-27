import initialState from './initialState';
import * as types from '../actions/actionTypes';
import * as dotProp from 'dot-prop-immutable';
import _ from 'lodash'

export default function application(state = initialState, action){
    let newState = state;
    switch(action.type){
        case types.LOGSET_LIST:
            newState = dotProp.set(state, 'availableLogSets', action.payload);
            break;
        case types.FILES_LIST:
            const sortedFileList = _.sortBy(action.payload.filesList, function(o) { return o.LastModified * -1; })
            newState = dotProp.set(state, 'filesList', sortedFileList);
            break;
        case types.SET_HOST:
            newState = dotProp.set(state, 'host', action.payload.host);
            break;
        case types.MONITOR_LOGSET:
            const monitoringLogSet = JSON.parse(JSON.stringify(action.payload.monitoringLogSet));
            monitoringLogSet.tail = action.payload.tail;
            monitoringLogSet.logsCount = 0;
            monitoringLogSet.bwdLogsCount = 0;
            monitoringLogSet.displaySettings = false;
            monitoringLogSet.highlightedLines = [];
            monitoringLogSet.contentViewKey  =  'logs';
            monitoringLogSet.currentFile = 'test.log';
            monitoringLogSet.logFilesViewState = [];
            newState = dotProp.set(state, 'monitoringLogSets', list => [...list, monitoringLogSet]);
            newState = dotProp.set(newState, 'logs_' + monitoringLogSet.Id, []);
            newState = dotProp.set(newState, 'activeLogSetId', monitoringLogSet.Id);
            break;
        case types.SELECT_LOGSET:
            newState = dotProp.set(newState, 'activeLogSetId', action.payload.id);
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'scrollLogsOnLogSetSwitch', true);
            break;
        case types.SCROLL_LOGS_ON_APP_SWTICH_DONE:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'scrollLogsOnLogSetSwitch', false);
            break;
        case types.FETCH_LOGS_START:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'loading', true);
            break;
        case types.FETCH_LOGS_END:
            /*
            const app = newState.monitoringLogSets.filter((monApp) => {
                return monApp.Id === action.payload.id;
            })
            if(app && app.length > 0){
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'logsCount', app[0].logsCount + action.payload.logsCount);
            }
            */
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'loading', false);
            break;
        case types.START_TAIL:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'tail', true);
            break;
        case types.STOP_TAIL:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'tail', false);
            break;
        case types.SET_SCROLL_POSITION:
            if(action.payload.view  === 'logs'){
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'scrollTopLogs', action.payload.top);
            }
            else if(action.payload.view  === 'search'){
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'scrollTopSearch', action.payload.top);
            }else {
                console.log("Invalid view to set scroll position");
            }
            break;
        case types.RESET_SCROLL_POSITION:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'resetScrollTopValue', action.payload.top);
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'resetScrollTop', true);
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'scrollToLine');
            break;
        case types.RESET_SCROLL_POSITION_DONE:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'resetScrollTop', false);
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'resetScrollTopValue');

            break;
        case types.LOGS_MESSAGES:
            //Set  Logs
            if(action.payload.direction === 'bwd'){
                const oldLogs = dotProp.get(state,  'logs_' + action.payload.id);
                newState = dotProp.set(newState, 'logs_' + action.payload.id, []);
                const actualNewLogs = action.payload.logs;
                const reverseNewLogs = actualNewLogs.reverse();
                const allLogs=  reverseNewLogs.concat(oldLogs);
                newState = dotProp.set(newState, 'logs_' + action.payload.id, allLogs);
            }else{
                newState = dotProp.merge(state, 'logs_' + action.payload.id, action.payload.logs);
            }

            //Set Log Counts
            const logSet = newState.monitoringLogSets.filter((monLogSet) => {
                return monLogSet.Id === action.payload.id;
            })
            if(logSet && logSet.length > 0){
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'logsCount', (logSet[0].logsCount ? logSet[0].logsCount : 0)  +  action.payload.logs.length);
                if(action.payload.direction === 'bwd'){
                    newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'bwdLogsCount', (logSet[0].bwdLogsCount ? logSet[0].bwdLogsCount : 0)  +  action.payload.logs.length);
                }
            }

            //Set log file names

            //find log files
            const logFiles = action.payload.logs.map((elem, i) => { return elem[0]});
            console.log("Log Files in logs: " + JSON.stringify(logFiles));
            const uniqueLogFiles = new Set(logFiles); //remove duplicates
            const getLogsFilesViewState = [...uniqueLogFiles].map((elem) => {return {name: elem, inViewPort: false}}); //convert to array of objects
            console.log("UniqueLogFilesObjArray:" + JSON.stringify(logFilesViewState));

            const storeLogFilesViewState = getArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'logFilesViewState');
            //logFilesViewState  is of format  {name: 'file1.log', 'inViewPort': false/true}
            let mergedLogFilesViewState;
            if(action.payload.direction === 'bwd'){
                mergedLogFilesViewState = getLogsFilesViewState.concat(storeLogFilesViewState)
            }else{
                mergedLogFilesViewState = storeLogFilesViewState.concat(getLogsFilesViewState)
            }
            //Remove the duplicates from mergedLogFilesViewState, and merge the inViewPort attribute value
            const uniqueLogFilesViewState = mergedLogFilesViewState.reduce((m, elem) => m.set(elem.name, m.get(elem.name) || elem.inViewPort), new Map());
            const resultLogFilesViewState = Array.from(uniqueLogFilesViewState.keys()).map((elem) => {return {name: elem, inViewPort: uniqueLogFilesViewState.get(elem)}});
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'logFilesViewState', resultLogFilesViewState);

            break;
        case types.CLEAR_LOGS:
            newState = dotProp.set(newState, 'logs_' + action.payload.id, [['', '------------ Cleared ----------']]);
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'logsCount',1);
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'bwdLogsCount',0);
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'highlightedLines', []);
            break;
        case types.TOGGLE_DISPLAY_SETTINGS:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'displaySettings', action.payload.displaySettings);
            break;
        case types.OPEN_SEARCH:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'displaySettings', true);
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'openSearch', true);
            break;
        case types.OPEN_SEARCH_DONE:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'openSearch', false);
            break;
        case types.SET_SEARCH_TEXT:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'searchText', action.payload.searchText);
            break;
        case types.SEARCH_START:
                newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'contentViewKey','searchResults');
                newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'searchInProgress',true);
                newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'searchResults', []);
                break;
        case types.SEARCH_STOP:
                stopSearch();
                break;
        case types.FILES_TO_SEARCH:
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'filesToSearch', action.payload.filesToSearch);
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'nextFileToSearch', 0);
            break;
        case types.APPEND_SEARCH_RESULTS:
            //dont even append if user requested for search stop
            let searchInProgress = getArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'searchInProgress');
            if(!searchInProgress){
                return newState;
            }
            
            //update search results
            let searchResults = getArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'searchResults');
            searchResults = searchResults.concat(action.payload.searchResults.reverse());
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'searchResults', searchResults);
            
            //update next file search properties
            let nextFileToSearch = getArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'nextFileToSearch');
            let filesToSearch = getArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'filesToSearch');
            if(nextFileToSearch + 1 >= filesToSearch.length){
                stopSearch();
            }
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'nextFileToSearch', nextFileToSearch + 1);
            break;
        case types.SCROLL_TO_LINE:
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'scrollToLine',action.payload.scrollToLine);
            newState = appendArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'highlightedLines',action.payload.scrollToLine);
            break;
        case types.SELECT_CONTENT_VIEW:
            newState = updateArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'contentViewKey',action.payload.contentViewKey);
            if(action.payload.contentViewKey === 'logs'){
                const resetScrollTopValue = getArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'scrollTopLogs')
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'resetScrollTopValue', resetScrollTopValue);
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'resetScrollTop', true);
            }
            break;
        case types.STOP_MONITORING:
            const logsetIndex = newState.monitoringLogSets.findIndex((monLogSet) => {
                return monLogSet.Id === action.payload.id;
            })
            newState = dotProp.delete(newState, `monitoringLogSets.${logsetIndex}`);
            newState = dotProp.delete(newState, 'logs_' + action.payload.id);
            if(newState.activeLogSetId === action.payload.id){
                newState = dotProp.delete(newState, 'activeLogSetId');
            }
            break;
        case types.RESET_MONITOR_LOGSET:
            newState = dotProp.set(newState, 'resetApp', action.payload.name);
            break;
        case types.RESET_MONITOR_LOGSET_DONE:
            newState = dotProp.delete(newState, 'resetApp');
            break;
        case types.BOOKMARK_LINE:
            const bookMarkLine = action.payload.line - getArrayProperty(newState, 'monitoringLogSets', 'Id', newState.activeLogSetId, 'bwdLogsCount');
            newState = appendArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'highlightedLines',bookMarkLine);
            break;
        case types.SET_CURRENT_SEARCH_CURSOR:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'searchCursor', action.payload.searchCursor);
            break;
        case types.SET_CURRENT_FILE:
            newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'currentFile', action.payload.currentFile);
            break;
        case types.FILE_IN_VIEW_PORT:
        case types.FILE_OUT_OF_VIEW_PORT:
            const logFilesViewState = getArrayProperty(newState,  'monitoringLogSets', 'Id', action.payload.id, 'logFilesViewState');
            console.log("logFilesViewState:"  + JSON.stringify(logFilesViewState));
            const updatedLogFilesViewState = logFilesViewState.map((elem) => { 
                if(elem.name  === action.payload.file){
                    elem.inViewPort = (action.type  ===  types.FILE_IN_VIEW_PORT)? true: false;
                }
                return elem;
             });
             console.log("updatedLogFilesViewState:"  + JSON.stringify(updatedLogFilesViewState));
             const totalLogFilesInViewState =  updatedLogFilesViewState.reduce((count, elem) =>{ return  elem.inViewPort ? count  + 1: count}, 0);
             console.log("totalLogFilesInViewState:"  + totalLogFilesInViewState);
             if(totalLogFilesInViewState > 0){
                newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'logFilesViewState', updatedLogFilesViewState);
                
                const currentFile = updatedLogFilesViewState.reduce((resultFile, elem) => { return elem.inViewPort ? elem.name : resultFile }, "");
                console.log("currentFile:"  + currentFile);
                newState =  updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'currentFile', currentFile);
             }

            break;
        default :
            console.log('default: ' + JSON.stringify(action));
    }
    return newState;

    function stopSearch() {
        newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'searchInProgress', false);
        newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'filesToSearch');
        newState = updateArrayProperty(newState, 'monitoringLogSets', 'Id', action.payload.id, 'nextFileToSearch');
    }
}

function updateArrayProperty(state, array, filterPropName, filterPropVal, propName, propValue ){
    var newState = state;
    for(var i in state[array]){
        if (state[array][i][filterPropName] === filterPropVal){
            if(propValue || typeof propValue === 'number'){
                newState = dotProp.set(state, `${array}.${i}.${propName}`,  propValue)
            }else{
                newState = dotProp.delete(state, `${array}.${i}.${propName}`)
                console.log("Deleted property " + propName);
            }
           
            //state[array][i][propName] = propValue;
            break;
        }
    }
   // const newArray = [...state[array]];
    //const newState = dotProp.set(state, array, newArray);
    return newState
}

function appendArrayProperty(state, array, filterPropName, filterPropVal, propName, propValue ){
    var newState = state;
    for(var i in state[array]){
        if (state[array][i][filterPropName] === filterPropVal){
            if(propValue){
                newState = dotProp.set(state, `${array}.${i}.${propName}`, list => list ? [...list, propValue] :  [propValue])
            }
            break;
        }
    }
    return newState
}

function getArrayProperty(state, array, filterPropName, filterPropVal, propName ){
    var newState = state;
    for(var i in state[array]){
        if (state[array][i][filterPropName] === filterPropVal){
            return dotProp.get(state, `${array}.${i}.${propName}`)
        }
    }
   // const newArray = [...state[array]];
    //const newState = dotProp.set(state, array, newArray);
    return [];
}