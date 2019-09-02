import initialState from './initialState';
import * as types from '../actions/actionTypes';
import * as dotProp from 'dot-prop-immutable';
import _ from 'lodash'

export default function application(state = initialState, action){
    let newState = state;
    switch(action.type){
        case types.APPLICATIONS_LIST:
            newState = dotProp.set(state, 'availableApps', action.payload);
            break;
        case types.FILES_LIST:
            const sortedFileList = _.sortBy(action.payload.filesList, function(o) { return o.LastModified * -1; })
            newState = dotProp.set(state, 'filesList', sortedFileList);
            break;
        case types.SET_HOST:
            newState = dotProp.set(state, 'host', action.payload.host);
            break;
        case types.MONITOR_APP_LOG:
            const monitoringApp = JSON.parse(JSON.stringify(action.payload.monitoringApp));
            monitoringApp.tail = action.payload.tail;
            monitoringApp.logsCount = 0;
            monitoringApp.displaySettings = false;
            monitoringApp.highlightedLines = [];
            newState = dotProp.set(state, 'monitoringApps', list => [...list, monitoringApp]);
            newState = dotProp.set(newState, 'logs_' + monitoringApp.Id, []);
            newState = dotProp.set(newState, 'activeAppId', monitoringApp.Id);
            break;
        case types.SELECT_APP:
            newState = dotProp.set(newState, 'activeAppId', action.payload.id);
            break;
        case types.FETCH_LOGS_START:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'loading', true);
            break;
        case types.FETCH_LOGS_END:
            /*
            const app = newState.monitoringApps.filter((monApp) => {
                return monApp.Id === action.payload.id;
            })
            if(app && app.length > 0){
                newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'logsCount', app[0].logsCount + action.payload.logsCount);
            }
            */
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'loading', false);
            break;
        case types.START_TAIL:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'tail', true);
            break;
        case types.STOP_TAIL:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'tail', false);
            break;
        case types.SET_SCROLL_POSITION:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'scrollTop', action.payload.top);
            break;
        case types.RESET_SCROLL_POSITION:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'resetScrollTopValue', action.payload.top);
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'resetScrollTop', true);
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'scrollToLine');
            break;
        case types.RESET_SCROLL_POSITION_DONE:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'resetScrollTop', false);
            break;
        case types.LOGS_MESSAGES:
            newState = dotProp.merge(state, 'logs_' + action.payload.id, action.payload.logs);
            const app = newState.monitoringApps.filter((monApp) => {
                return monApp.Id === action.payload.id;
            })
            if(app && app.length > 0){
                newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'logsCount', (app[0].logsCount ? app[0].logsCount : 0)  +  action.payload.logs.length);
            }
            break;
        case types.CLEAR_LOGS:
            newState = dotProp.set(newState, 'logs_' + action.payload.id, []);
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'logsCount',0);
            break;
        case types.TOGGLE_DISPLAY_SETTINGS:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'displaySettings', action.payload.displaySettings);
            break;
        case types.OPEN_SEARCH:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'displaySettings', true);
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'openSearch', true);
            break;
        case types.OPEN_SEARCH_DONE:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'openSearch', false);
            break;
        case types.SET_SEARCH_TEXT:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'searchText', action.payload.searchText);
            break;
        case types.SEARCH_RESULTS_INPROGRESS:
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'contentViewKey','searchResults');
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchInProgress',true);
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchResults', []);
            break;
        case types.APPEND_SEARCH_RESULTS:
            let searchResults = getArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchResults');
            searchResults = searchResults.concat(action.payload.searchResults.reverse());
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchResults', searchResults);
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchInProgress', false);
           /*
            if(!action.payload.searchResults || action.payload.searchResults.length == 0){
                newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchResults', [{Name: "", Line: "", Text:"No Results"}]);
            }
            */
            break;
        case types.SCROLL_TO_LINE:
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'scrollToLine',action.payload.scrollToLine);
            newState = appendArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'highlightedLines',action.payload.scrollToLine);
            break;
        case types.SELECT_CONTENT_VIEW:
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'contentViewKey',action.payload.contentViewKey);
            if(action.payload.contentViewKey == 'logs'){
                const resetScrollTopValue = getArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'scrollTop')
                newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'resetScrollTopValue', resetScrollTopValue);
                newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'resetScrollTop', true);
            }
            break;
        case types.STOP_MONITORING:
            const appIndex = newState.monitoringApps.findIndex((monApp) => {
                return monApp.Id === action.payload.id;
            })
            newState = dotProp.delete(newState, `monitoringApps.${appIndex}`);
            newState = dotProp.delete(newState, 'logs_' + action.payload.id);
            if(newState.activeAppId === action.payload.id){
                newState = dotProp.delete(newState, 'activeAppId');
            }
            break;
        case types.RESET_APP:
            newState = dotProp.set(newState, 'resetApp', action.payload.name);
            break;
        case types.RESET_APP_DONE:
            newState = dotProp.delete(newState, 'resetApp');
            break;
        default :
        console.log('default: ' + JSON.stringify(action));
    }
    return newState;
}

function updateArrayProperty(state, array, filterPropName, filterPropVal, propName, propValue ){
    var newState = state;
    for(var i in state[array]){
        if (state[array][i][filterPropName] === filterPropVal){
            if(propValue){
                newState = dotProp.set(state, `${array}.${i}.${propName}`,  propValue)
            }else{
                newState = dotProp.delete(state, `${array}.${i}.${propName}`)
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
                newState = dotProp.set(state, `${array}.${i}.${propName}`, list => [...list, propValue])
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