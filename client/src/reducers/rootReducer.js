import {combineReducers} from 'redux';
import application  from './applicationReducer';

const rootReducer = combineReducers({application});

export default rootReducer;