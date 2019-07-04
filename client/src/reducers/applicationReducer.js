import initialState from './initialState';
import * as types from '../actions/actionTypes';
import * as dotProp from 'dot-prop-immutable';

export default function application(state = initialState, action){
    let newState = state;
    console.log("Reducer Action:" + JSON.stringify(action));
    switch(action.type){
        case types.APPLICATIONS_LIST:
            console.log('Got applications: ' + JSON.stringify(action));
            newState = dotProp.set(state, 'availableApps', action.payload);
            console.log("NewState:  " + JSON.stringify(newState));
            break;

        case types.SET_HOST:
            newState = dotProp.set(state, 'host', action.payload.host);
            console.log("NewState:  " + JSON.stringify(newState));
            break;
        case types.MONITOR_APP_LOG:
            const monitoringApp = action.payload;
            monitoringApp.tail = true;
            monitoringApp.tailLogsCount = 0;
            monitoringApp.displaySettings = false;
            newState = dotProp.set(state, 'monitoringApps', list => [...list, monitoringApp]);
            newState = dotProp.set(newState, 'logs_' + monitoringApp.Id, []);
            newState = dotProp.set(newState, 'activeAppId', monitoringApp.Id);
            console.log("NewState after MONITOR_APP_LOG:  " + JSON.stringify(newState));
            break;
        case types.SELECT_APP:
            console.log("Selected app " + action.payload.id);
            newState = dotProp.set(newState, 'activeAppId', action.payload.id);
            break;
        case types.FETCH_LOGS_START:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'loading', true);
            break;
        case types.FETCH_LOGS_END:
            const app = newState.monitoringApps.filter((monApp) => {
                return monApp.Id === action.payload.id;
            })
            if(app && app.length > 0){
                app[0].tailLogsCount = app[0].tailLogsCount + action.payload.logsCount;
                if(app[0].tailLogsCount  >= 1000){
                    app[0].tail = false;
                    console.log("Reducer stopping the tail, as it has got 1000 log messages");
                }
            }
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'loading', false);
            break;
        case types.START_TAIL:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'tail', true);
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'tailLogsCount', 0);
            break;
        case types.STOP_TAIL:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'tail', false);
            break;
        case types.SET_SCROLL_POSITION:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'scrollTop', action.payload.top);
            break;
        case types.LOGS_MESSAGES:
            newState = dotProp.merge(state, 'logs_' + action.payload.appId, action.payload.logs);
            console.log("NewState:  " + JSON.stringify(newState));
            break;
        case types.CLEAR_LOGS:
            newState = dotProp.set(newState, 'logs_' + action.payload.id, []);
            break;
        case types.TOGGLE_DISPLAY_SETTINGS:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'displaySettings', action.payload.displaySettings);
            break;
        case types.SET_SEARCH_TEXT:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', action.payload.id, 'searchText', action.payload.searchText);
            break;
        case types.SEARCH_RESULTS:
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'searchResults', action.payload.searchResults);
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'contentViewKey','searchResults');
            break;
        case types.SELECT_CONTENT_VIEW:
            newState = updateArrayProperty(newState,  'monitoringApps', 'Id', action.payload.id, 'contentViewKey',action.payload.contentViewKey);
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
            newState = dotProp.set(state, `${array}.${i}.${propName}`,  propValue)
            //state[array][i][propName] = propValue;
            break;
        }
    }
   // const newArray = [...state[array]];
    //const newState = dotProp.set(state, array, newArray);
    return newState
}