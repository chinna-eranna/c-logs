import axios from 'axios'
import _ from 'lodash'

function monitorHostLogs(hostIp){
    return new Promise((resolve, reject) => {
        axios.post(`/host/${hostIp}/monitor`).then(function(response){
            console.log("monitorHostLogs()::success response: " + JSON.stringify(response));
            resolve(response);
        }).catch(function(err){
            console.log("monitorHostLogs()::failure response: " + err);
            reject(err);
        });
    }); 
}
function  getLogDirectories(){
    return new Promise((resolve, reject) => {
        axios.get("/v1/logDirectories").then(function(response){
            console.log("Applications from ajax: " + JSON.stringify(response));
            resolve(response);
        }).catch(function(err){
            console.log("fetchApplicatio    ns()::Error from ajax: " + err);
            reject(err);
        });
    }); 
}

function startMonitoring(appId){
    return new Promise((resolve, reject) => { 
            //add content-type header
            axios.post(`/v1/logDirectories/${appId}/start`).then(function(response){
            console.log("started monitoring log for logDirectories/" + appId);
            resolve(response);
        }).catch(function(err){
            console.log("getLogs()::Error from ajax: " + err);
            reject(err);
        });
    });
}

function getLogMessagesReq(appId, resolve, reject){
    axios.get(`/v1/logDirectories/${appId}/logs`).then(function(response){
        console.log("Got logs: " + JSON.stringify(response));
        resolve(response);
    }).catch(function(err){
        console.log("getLogs()::Error from ajax: " + err);
        reject(err);
    });
}

function getLogMessages(appId){
    return new Promise((resolve, reject) => { 
            //add content-type header
            getLogMessagesReq(appId, resolve, reject);
    });
}

function searchInApp(appId, searchString){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logDirectories/${appId}/search`, {SearchString: searchString}).then(function(response){
            resolve(response);
        }).catch(function(err){
            reject(err);
        });
    });
}

function resetMonitoring(appId, file, lineNumber){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logDirectories/${appId}/reset`, {FileName: file, LineNumber: parseInt(lineNumber)}).then(function(response){
            resolve(response);
        }).catch(function(err){
            reject(err);
        });
    });
}



export {monitorHostLogs, getLogDirectories, startMonitoring, getLogMessages, searchInApp, resetMonitoring}