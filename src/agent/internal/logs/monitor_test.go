package logs

import "testing"
import "agent/internal/utils"
import "github.com/stretchr/testify/require"

func TestGetLogs(t *testing.T) {

    Files =  make(map[int]*MonitoringLogFile)
    testLogDir := utils.LogDirectory{1, "logConfName", "testLog*", "./_test", "" }
    startMonitoringReq  :=  StartMonitoringRequest{"All Logs"}
    monitoringLogFile,err :=  MonitorLogPath(testLogDir,startMonitoringReq)
    if(monitoringLogFile.FileName == ""){
        t.Error("FileName is empty")
    }
    if(err != nil){
        t.Error("Got an error from MonitorLogPath")
    }

    logs  := monitoringLogFile.GetLogs();
    require.Equal(t, 50, len(logs), "logs length was not 10")
    require.Equal(t, "1\n", logs[0], "Logs[0] is not matching to 1")
    require.Equal(t, "50\n", logs[49], "Logs[9] is not matching to 10")
 
    logs = monitoringLogFile.GetLogs();
    require.Equal(t, 1, len(logs), "logs length was not 1 in second iteration")
    require.Equal(t, "51\n", logs[0], "Logs[0] is not matching to 1 in second iteration")
    //t.Error("testABC") // to indicate test failed
}