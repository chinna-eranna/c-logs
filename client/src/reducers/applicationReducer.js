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
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'loading', true);
            break;
        case types.FETCH_LOGS_END:
            newState = updateArrayProperty(newState, 'monitoringApps', 'Id', newState.activeAppId, 'loading', false);
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
        default :
        console.log('default: ' + JSON.stringify(action));
    }
    return newState;
}

function updateArrayProperty(state, array, filterPropName, filterPropVal, propName, propValue ){
    for(var i in state[array]){
        if (state[array][i][filterPropName] === filterPropVal){
            state[array][i][propName] = propValue;
        }
    }
    const newArray = [...state[array]];
    const newState = dotProp.set(state, array, newArray);
    return newState
}