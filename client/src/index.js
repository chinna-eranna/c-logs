import React from "react";
import ReactDOM from "react-dom";
import {Provider} from 'react-redux';
import configureStore from './store/configureStore';
import ContentViewer from './components/contentViewer'
import MonitoringAppLogList from './components/monitoringAppLogList'
import * as actions from './actions/applicationActions'

const store = configureStore();

window.document.onkeyup = (event) => {
    console.log("Key Pressed: ctrlKey: " + event.ctrlKey +  "  Shift:  "+ event.shiftKey + " Which:  " + event.which);
    if(event.ctrlKey && event.shiftKey && event.which == 70){
        store.dispatch(actions.openSearch());
    }else{
       console.log("else  part");
    }
}

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
                <ContentViewer/>
            </div>
        </div>
    </div>
    </Provider>, document.getElementById("index"));
