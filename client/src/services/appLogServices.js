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
            resolve(response);
        }).catch(function(err){
            console.log("fetchApplications()::Error from ajax: " + err);
            reject(err);
        });
    }); 
}

function startMonitoring(appId, startFrom){
    return new Promise((resolve, reject) => { 
            //add content-type header
            axios.post(`/v1/logDirectories/${appId}/start`, {StartFrom: startFrom}).then(function(response){
            console.log("started monitoring log for logDirectories/" + appId);
            resolve(response);
        }).catch(function(err){
            console.log("getLogs()::Error from ajax: " + err);
            reject(err);
        });
    });
}

var logMsgRequests = {};

function getLogMessages(appId, direction, fullContent){
    return new Promise((resolve, reject) => { 
            if(logMsgRequests[appId]){
                console.log("Throttled getLogMessages for App :" + appId);
                resolve({throttled:true, data:[]});
                return;
            }
            //add content-type header
            logMsgRequests[appId] = true;
            const url = (direction === "bwd") ? `/v1/logDirectories/${appId}/logs?bwdLogs=true` : `/v1/logDirectories/${appId}/logs?fullContent=${fullContent}`;
            axios.get(url).then(function(response){
                resolve(response);
                logMsgRequests[appId]  = false;
            }).catch(function(err){
                console.log("getLogs()::Error from ajax: " + err);
                reject(err);
                logMsgRequests[appId] = false;
            });
    });
}

function searchInApp(appId, searchString, searchStrType, files){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logDirectories/${appId}/search`, {SearchString: searchString, Type:searchStrType, Files: files}).then(function(response){
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

function getFiles(directory, filePattern) {
    return new Promise((resolve, reject) => {
        axios.get(`/v1/files${directory}?pattern=${filePattern}`).then(function (response) {
            console.log("Got files: " + JSON.stringify(response));
            resolve(response);
        }).catch(function (err) {
            console.log("getFiles()::Error from ajax: " + err);
            reject(err);
        });
    });
}



export {monitorHostLogs, getLogDirectories, startMonitoring, getLogMessages, searchInApp, resetMonitoring, getFiles}