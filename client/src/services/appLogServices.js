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
        axios.get("/v1/logset").then(function(response){
            resolve(response);
        }).catch(function(err){
            console.log("fetchApplications()::Error from ajax: " + err);
            reject(err);
        });
    }); 
}

function  createLogDirectory(name, directory, logFilePattern){
    return new  Promise((resolve, reject) => {
        const logTimestampPattern = '';
        axios.post("/v1/logset", {name, logFilePattern, directory, logTimestampPattern}).then((response) => {
            resolve(response);
        }).catch((err) => {
            console.log("createLogDirectory()1::failure response: " + err);
            reject(err);
        });
    });
}

function  saveLogDirectory(id, name, directory, logFilePattern){
    return new  Promise((resolve, reject) => {
        const logTimestampPattern = '';
        axios.put("/v1/logset", {id, name, logFilePattern, directory, logTimestampPattern}).then((response) => {
            resolve(response);
        }).catch((err) => {
            console.log("saveLogDirectory()::failure response: " + err);
            reject(err);
        });
    });
}

function deleteLogDirectory(id){
    return new Promise((resolve, reject) => {
        axios.delete(`/v1/logset/${id}`).then((response) => {
            resolve(response);
        }).catch((err) => {
            console.log("deleteLogDirectory()::failure response: " + err);
            reject(err);
        })
    });
}

function  stopMonitoring(logsetId){
    return new Promise((resolve, reject) => { 
        axios.post(`/v1/logset/${logsetId}/stop`).then(function(response){
        console.log("Stopped monitoring for logset/" + logsetId);
        resolve(response);
    }).catch(function(err){
        console.log("stopMonitoring()::Error from ajax: " + err);
        reject(err);
    });
});
}

function startMonitoring(logsetId, startFrom){
    return new Promise((resolve, reject) => { 
            //add content-type header
            axios.post(`/v1/logset/${logsetId}/start`, {StartFrom: startFrom}).then(function(response){
            console.log("started monitoring log for logset/" + logsetId);
            resolve(response);
        }).catch(function(err){
            console.log("startMonitoring()::Error from ajax: " + err);
            reject(err);
        });
    });
}

var logMsgRequests = {'fwd':{}, 'bwd':{}};

function getLogMessages(logsetId, direction, fullContent){
    return new Promise((resolve, reject) => { 
            if(logMsgRequests[direction][logsetId]){
                console.log("Throttled getLogMessages for App :" + logsetId);
                resolve({throttled:true, data:[]});
                return;
            }
            //add content-type header
            logMsgRequests[direction][logsetId] = true;
            const url = (direction === "bwd") ? `/v1/logset/${logsetId}/logs?bwdLogs=true` : `/v1/logset/${logsetId}/logs?fullContent=${fullContent}`;
            axios.get(url).then(function(response){
                resolve(response);
                logMsgRequests[direction][logsetId]  = false;
            }).catch(function(err){
                console.log("getLogs()::Error from ajax: " + err);
                reject(err);
                logMsgRequests[direction][logsetId] = false;
            });
    });
}

function searchInApp(logsetId, searchString, searchStrType, files){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logset/${logsetId}/search`, {SearchString: searchString, Type:searchStrType, Files: files}).then(function(response){
            resolve(response);
        }).catch(function(err){
            reject(err);
        });
    });
}

function resetMonitoring(logsetId, file, lineNumber){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logset/${logsetId}/reset`, {FileName: file, LineNumber: parseInt(lineNumber)}).then(function(response){
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



export {monitorHostLogs, getLogDirectories, createLogDirectory, saveLogDirectory, deleteLogDirectory,stopMonitoring, startMonitoring, getLogMessages, searchInApp, resetMonitoring, getFiles}