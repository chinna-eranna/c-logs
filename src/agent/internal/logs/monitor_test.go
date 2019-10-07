package logs

import ("testing"
        "os"
        "time"
        "fmt"
        "agent/internal/utils"
        "github.com/stretchr/testify/require")

func TestGetLogs(t *testing.T) {
    startMonitoring("All Logs","testLog*",  t)
    logs := getLogs(51, t)
    validateContent(logs, map[int]string{ 0: "1\n", 49: "50\n", 50: "51\n",},  t)
}

func TestGetLogs_NewLogs(t *testing.T){
    latestFile := "./_test/testLog100.txt"
    f, after := createFile(latestFile, t)
    defer after(f, latestFile)

    //write some content before we start with
    _,err := f.WriteString(fmt.Sprintf("line 1: %s\nline 2:%s\n", "some txt","something_else"));
    require.Nil(t, err, "Failed writing to log file", err)
    
    startMonitoring("New Logs","testLog*", t)
    writeLogs_GetLogs_Validate(f, "File-1_line-", t)
}

func TestGetLogs_compressedFile(t *testing.T){
    startMonitoring("compressed.txt.gz", "compressed*", t)
    logs := getLogs(51, t)
    validateContent(logs, map[int]string{ 0: "1\n", 49: "50\n", 50: "51\n",},  t)
}

func TestGetLogs_startFrom_pickWithNextFile(t *testing.T){
    lastButOneFile := "./_test/testLog2.txt"
    f, after := createFile(lastButOneFile, t)
    defer after(f, lastButOneFile)

    startMonitoring("testLog2.txt", "testLog*", t)
    writeLogs_GetLogs_Validate(f, "File-1_line-", t)

    //pick the next file
    lastFile := "./_test/testLog3.txt"
    f, after = createFile(lastFile, t)
    defer after(f, lastFile)

    writeLogs_GetLogs_Validate(f, "File-2_line-", t)
}

func TestGetLogs_ResetReq(t *testing.T) {

    startMonitoring("All Logs", "testLog*", t)
    logs := getLogs(50, t)
    validateContent(logs, map[int]string{ 0: "1\n", 49: "50\n", },  t)
    
    monitoringLogFile := Files[1]
    reset := monitoringLogFile.ResetMonitoring(ResetRequest{"testLog1.txt", 30});
    require.True(t, reset, "Failed reset the log monitoring")

    logs = getLogs(1, t)
    require.Equal(t, "30\n", logs[0], "Logs[0] is not matching to 30 after reset")

    //reset not existing file
    reset = monitoringLogFile.ResetMonitoring(ResetRequest{"testLog_NotExisting.txt", 30});
    require.False(t, reset, "ResetMonitoring should have failed")
}

func startMonitoring(from string, filePattern string, t *testing.T){
    Files =  make(map[int]*MonitoringLogFile)
    testLogDir := utils.LogDirectory{1, "logConfName", filePattern, "./_test", ""}
    startMonitoringReq  :=  StartMonitoringRequest{from}
    _,err :=  MonitorLogPath(testLogDir,startMonitoringReq)
    require.Nil(t, err, "Got an error from MonitorLogPath() ", err);
}



//As the logs reading is in a parallel goroutine, we cannot guarantee the number of logs that it reads,
//Hence get the minimum logs, and then assert the logs are in proper sequence
func getLogs(minCount int, t  *testing.T)([]string){
    monitoringLogFile := Files[1]
    var logs []string
    retries := 0
    for{
        logs = append(logs, monitoringLogFile.GetLogs()...);
        if len(logs) >= minCount{
            break;
        }
        
        retries++
        if retries == 10 {
            break;
        }
        time.Sleep(1000 * time.Millisecond);
    }
    require.NotEqual(t, 10, retries, fmt.Sprintf("Got %d lines expecting %d. Max retries exceeded", len(logs), minCount)) 
    return logs
}

func createFile(fileName string, t *testing.T)(*os.File, func(f1 *os.File, fileName string)){
    f,err := os.Create(fileName)
    require.Nil(t, err, "Failed creating the log file", err);
    return f, func(f *os.File, fileName string){
        f.Close()
        os.Remove(fileName)
    }
}

func writeLogs_GetLogs_Validate(f *os.File, prefix string, t *testing.T){
    //Generate content in the new file, get logs, and validate
    _,err := f.WriteString(fmt.Sprintf("%s1\n%s2\n%s3\n", prefix,prefix,prefix));
    require.Nil(t, err, "Failed writing to log file", err)

    logs := getLogs(2, t)
    require.Equal(t, prefix + "1\n", logs[0], "1st line content didn't match")
    require.Equal(t, prefix + "2\n", logs[1], "2nd line content didn't match")
}

func validateContent(logs []string, lineToContentMap map[int]string,  t *testing.T){
    for key,value := range lineToContentMap{
        require.Equal(t, value, logs[key], fmt.Sprintf("Logs[%d] is not matching to %s", key, value))
    }
}