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
        axios.get("/v1/logSet").then(function(response){
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
        axios.post("/v1/logSet", {name, logFilePattern, directory, logTimestampPattern}).then((response) => {
            resolve(response);
        }).catch((err) => {
            console.log("createLogDirectory()::failure response: " + err);
            reject(err);
        });
    });
}

function  saveLogDirectory(id, name, directory, logFilePattern){
    return new  Promise((resolve, reject) => {
        const logTimestampPattern = '';
        axios.put("/v1/logSet", {id, name, logFilePattern, directory, logTimestampPattern}).then((response) => {
            resolve(response);
        }).catch((err) => {
            console.log("saveLogDirectory()::failure response: " + err);
            reject(err);
        });
    });
}

function deleteLogDirectory(id){
    return new Promise((resolve, reject) => {
        axios.delete(`/v1/logSet/${id}`).then((response) => {
            resolve(response);
        }).catch((err) => {
            console.log("deleteLogDirectory()::failure response: " + err);
            reject(err);
        })
    });
}

function startMonitoring(logsetId, startFrom){
    return new Promise((resolve, reject) => { 
            //add content-type header
            axios.post(`/v1/logSet/${logsetId}/start`, {StartFrom: startFrom}).then(function(response){
            console.log("started monitoring log for logDirectories/" + logsetId);
            resolve(response);
        }).catch(function(err){
            console.log("getLogs()::Error from ajax: " + err);
            reject(err);
        });
    });
}

var logMsgRequests = {};

function getLogMessages(logsetId, direction, fullContent){
    return new Promise((resolve, reject) => { 
            if(logMsgRequests[logsetId]){
                console.log("Throttled getLogMessages for App :" + logsetId);
                resolve({throttled:true, data:[]});
                return;
            }
            //add content-type header
            logMsgRequests[logsetId] = true;
            const url = (direction === "bwd") ? `/v1/logSet/${logsetId}/logs?bwdLogs=true` : `/v1/logset/${logsetId}/logs?fullContent=${fullContent}`;
            axios.get(url).then(function(response){
                resolve(response);
                logMsgRequests[logsetId]  = false;
            }).catch(function(err){
                console.log("getLogs()::Error from ajax: " + err);
                reject(err);
                logMsgRequests[logsetId] = false;
            });
    });
}

function searchInApp(logsetId, searchString, searchStrType, files){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logSet/${logsetId}/search`, {SearchString: searchString, Type:searchStrType, Files: files}).then(function(response){
            resolve(response);
        }).catch(function(err){
            reject(err);
        });
    });
}

function resetMonitoring(logsetId, file, lineNumber){
    return new Promise((resolve, reject)=> {
        axios.post(`/v1/logSet/${logsetId}/reset`, {FileName: file, LineNumber: parseInt(lineNumber)}).then(function(response){
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



export {monitorHostLogs, getLogDirectories, createLogDirectory, saveLogDirectory, deleteLogDirectory, startMonitoring, getLogMessages, searchInApp, resetMonitoring, getFiles}