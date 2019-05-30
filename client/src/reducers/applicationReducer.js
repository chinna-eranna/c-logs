import initialState from './initialState';
import * as types from '../actions/actionTypes';
import * as dotProp from 'dot-prop-immutable';

export default function application(state = initialState, action){
    let newState = state;
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
            if(state.monitoringApps.length === 0){
                monitoringApp.active = true;
            }
            newState = dotProp.set(state, 'monitoringApps', list => [...list, monitoringApp]);
            console.log("NewState after MONITOR_APP_LOG:  " + JSON.stringify(newState));
            break;
        case types.LOGS_MESSAGES:
            newState = dotProp.merge(state, 'logs', action.payload);
            console.log("NewState:  " + JSON.stringify(newState));
            break;
        default :
        console.log('default: ' + JSON.stringify(action));
    }
    return newState;
}
