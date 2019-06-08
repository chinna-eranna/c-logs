import React from "react";
import ReactDOM from "react-dom";
import {Provider} from 'react-redux';
import configureStore from './store/configureStore';
import LogsViewer from './components/logsViewer'
import MonitoringAppLogList from './components/monitoringAppLogList'


const store = configureStore();


ReactDOM.render(
<Provider store={store}>
    <div class="container-fluid">
        <div className="row">
            <div className="col col-lg-2" style={{border:'2px solid black', height:'100vh', overflow:'auto'}}>
                <div className="row">
                    <div className="col">
                        <div class="container-fluid">
                           
                            <div style={{fontFamily:'cursive', textAlign:'center'}}>
                                <h1>C-Logs</h1>
                            </div>
                        </div>
                    </div>
                </div>
                    
                <div className="row">
                    <div className="col">
                        <MonitoringAppLogList/>
                    </div>
                </div>
                
            </div>
            <div className="col col-lg-10">
                <LogsViewer/>
            </div>
        </div>
    </div>
    </Provider>, document.getElementById("index"));
