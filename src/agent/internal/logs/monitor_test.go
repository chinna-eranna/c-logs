package logs

import ("testing"
        "os"
        "time"
        "fmt"
        "strconv"
        "agent/internal/utils"
        "github.com/stretchr/testify/require")

var Id int;

func init() {
   Id = 1
}

func testGetLogs(t *testing.T) {
    startMonitoring("All Logs","testLog*",  t)
    defer Files[Id].StopMonitoring()
    logs := getLogs("fwd", 51, t)
    validateContent(logs, map[int]string{ 0: "1\n", 49: "50\n", 50: "51\n",},  t)
}

func TestGetLogs_NewLogs(t *testing.T){
    latestFile := "./_test/newLogs1.txt"
    f, after := createFile(latestFile, t)
    defer after(f, latestFile)

    //write some content before we start with
    _,err := f.WriteString(fmt.Sprintf("line:%s\nline:%s\n", "1","2"));
    require.Nil(t, err, "Failed writing to log file", err)
    
    startMonitoring("New Logs","newLogs*", t)
    defer Files[Id].StopMonitoring()
    writeLogs_GetLogs_Validate(f, "File-1_line-", t)
    getBwdLogs_Validate("line:", 2, t)
}

func TestGetLogs_NewLogs_BwdLogsPickFromOldFile(t *testing.T){
    oldFilePath := "./_test/pickOldFile_old.txt"
    oldFilePtr, after := createFile(oldFilePath, t)
    defer after(oldFilePtr, oldFilePath)

    _,err := oldFilePtr.WriteString(fmt.Sprintf("line:%s\nline:%s\n", "1","2"));
    require.Nil(t, err, "Failed writing to log file", err)

    newFilePath := "./_test/pickOldFile_new.txt"
    newFilePtr, after := createFile(newFilePath, t)
    defer after(newFilePtr, newFilePath)

    _,err = newFilePtr.WriteString(fmt.Sprintf("line:%s\nline:%s\n", "3","4"));
    require.Nil(t, err, "Failed writing to log file", err)
    
    startMonitoring("New Logs","pickOldFile*", t)
    defer Files[Id].StopMonitoring()

    writeLogs_GetLogs_Validate(newFilePtr, "File-1_line-", t)
    getBwdLogs_Validate("line:", 4, t)
}

func TestGetLogs_compressedFile(t *testing.T){
    startMonitoring("compressed.txt.gz", "compressed*", t)
    defer Files[Id].StopMonitoring()
    logs := getLogs("fwd", 51, t)
    validateContent(logs, map[int]string{ 0: "1\n", 49: "50\n", 50: "51\n",},  t)
}


func TestGetLogs_startFrom_pickWithNextFile(t *testing.T){
    lastButOneFile := "./_test/pickNext1.txt"
    f, after := createFile(lastButOneFile, t)
    defer after(f, lastButOneFile)

    startMonitoring("pickNext1.txt", "pickNext*", t)
    defer Files[Id].StopMonitoring()
    writeLogs_GetLogs_Validate(f, "File-1_line-", t)

    //pick the next file
    lastFile := "./_test/pickNext2.txt"
    f, after = createFile(lastFile, t)
    defer after(f, lastFile)

    writeLogs_GetLogs_Validate(f, "File-2_line-", t)
}


func testGetLogs_ResetReq(t *testing.T) {

    startMonitoring("All Logs", "testLog*", t)
    defer Files[Id].StopMonitoring()

    logs := getLogs("fwd", 50, t)
    validateContent(logs, map[int]string{ 0: "1\n", 49: "50\n", },  t)
    
    monitoringLogFile := Files[Id]
    reset := monitoringLogFile.ResetMonitoring(ResetRequest{"testLog1.txt", 30});
    require.True(t, reset, "Failed reset the log monitoring")

    logs = getLogs("fwd", 1, t)
    require.Equal(t, "30\n", logs[0], "Logs[0] is not matching to 30 after reset")

    //reset not existing file
    reset = monitoringLogFile.ResetMonitoring(ResetRequest{"testLog_NotExisting.txt", 30});
    require.False(t, reset, "ResetMonitoring should have failed")
}

func startMonitoring(from string, filePattern string, t *testing.T){
    Files =  make(map[int]*MonitoringLogFile)
    testLogDir := utils.LogDirectory{Id, "logConfName", filePattern, "./_test", ""}
    startMonitoringReq  :=  StartMonitoringRequest{from}
    _,err :=  MonitorLogPath(testLogDir,startMonitoringReq)
    require.Nil(t, err, "Got an error from MonitorLogPath() ", err);
}



//As the logs reading is in a parallel goroutine, we cannot guarantee the number of logs that it reads,
//Hence get the logs in loop, and then assert the logs are in proper sequence
func getLogs(logsType string, minCount int, t  *testing.T)([]string){
    monitoringLogFile := Files[Id]
    var logs []string
    retries := 0
    for{
        if logsType  == "bwd"{
            logs = append(logs, monitoringLogFile.GetBwdLogs()...);
        }else{
            logs = append(logs, monitoringLogFile.GetFwdLogs()...);
        }
        if len(logs) >= minCount{
            break;
        }
        
        retries++
        if retries == 6 {
            break;
        }
        time.Sleep(5000 * time.Millisecond);
    }
    require.NotEqual(t, 6, retries, fmt.Sprintf("Got %d lines expecting %d. Max retries exceeded", len(logs), minCount)) 
    return logs
}

func createFile(fileName string, t *testing.T)(*os.File, func(f1 *os.File, fileName string)){
    time.Sleep(1 * time.Millisecond)
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

    logs := getLogs("fwd", 2, t)
    require.Equal(t, prefix + "1\n", logs[0], "1st line content didn't match in forward logs")
    require.Equal(t, prefix + "2\n", logs[1], "2nd line content didn't match in forward logs")
}

func getBwdLogs_Validate(prefix string, linesCount int, t *testing.T){
    
    logs := getLogs("bwd", linesCount, t)
    nextLine := 0
    for linesCount  > 0 {
        require.Equal(t, prefix + strconv.Itoa(linesCount) + "\n", logs[nextLine], "line content didn't match in backward logs for line # : " + string(linesCount))
        linesCount--
        nextLine++
    }
}

func validateContent(logs []string, lineToContentMap map[int]string,  t *testing.T){
    for key,value := range lineToContentMap{
        require.Equal(t, value, logs[key], fmt.Sprintf("Logs[%d] is not matching to %s", key, value))
    }
}