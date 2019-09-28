import React from "react";
import ReactDOM from "react-dom";
import {Provider} from 'react-redux';
import configureStore from './store/configureStore';
import ContentViewer from './components/contentViewer'
import MonitoringAppLogList from './components/monitoringAppLogList'
import * as actions from './actions/applicationActions'

const store = configureStore();

window.document.onkeyup = (event) => {
    //console.log("Key Pressed: ctrlKey: " + event.ctrlKey +  "  Shift:  "+ event.shiftKey + " Which:  " + event.which);
    if(event.ctrlKey && event.shiftKey && event.which == 70){
        store.dispatch(actions.openSearch());
    }
}

ReactDOM.render(
<Provider store={store}>
    <div class="container-fluid">
        <div className="row">
            <div className="col col-lg-1" style={{border:'2px solid black', height:'100vh'}}>
                <div className="row">
                    <div style={{paddingLeft:'5px', paddingRight:'5px', width:'100%'}}>
                        <div style={{paddingTop:'1.0rem'}}>
                           
                            <div style={{fontFamily:'cursive', textAlign:'center'}}>
                                <h2>C-Logs</h2>
                            </div>
                        </div>
                    </div>
                </div>
                    
                <div className="row">
                    <div style={{paddingLeft:'5px', paddingRight:'5px', width:'100%'}}>
                        <MonitoringAppLogList/>
                    </div>
                </div>
                
            </div>
            <div className="col col-lg-11">
                <ContentViewer/>
            </div>
        </div>
    </div>
    </Provider>, document.getElementById("index"));
