/**
 * 
 * {
 *  availableApps : [
    {
        "name": "CCX",
        "component": "Engine",
        "filetype": "MIVR",
        "filepath": "/opt/cisco/uccx/log/MIVR/Cisco001MIVR*",
        "logPattern": "",
        "id": "-3WhJGkB6NaXeXOLEHIk"
    },
    {
        "name": "CCX",
        "component": "PlatformTomcat",
        "filetype": "MADM",
        "filepath": "",
        "logPattern": "",
        "id": "_HWhJGkB6NaXeXOLNHI2"
    }
 *  ],
 *  monitoringApps : [
 *      {name: 'Engine', fileType: 'stdout', active:true, logs:[{timestamp:12344, msg}]},
 *      {name: 'Engine', fileType: 'MIVR'}
 *  ] 
 *      
 *  
 * }
 */

export default {
    availableLogSets: [],
    monitoringLogSets: [],
    host: '',
    logs:[],
    highlightedLines:[],
    filesList:[]
}