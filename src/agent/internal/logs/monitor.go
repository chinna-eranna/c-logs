package logs


import (
	"github.com/fsnotify/fsnotify"
	"github.com/golang-collections/collections/stack"
	log "github.com/Sirupsen/logrus"
	"strings"
	"path/filepath"
	"os"
	"bufio"
	"time"
	"agent/internal/utils"
)

type MonitoringLogFile struct{
	Directory string
	FilePattern string
	
	reset bool
	resetLineNumber int
	quitCh chan string
	start bool
	
	fwdLogsReader LogsReader
	bwdLogsReader LogsReader

	//backwards variables
	backwardsPointers *stack.Stack
	
}

type ResetRequest struct{
	FileName string
	LineNumber int
}

type StartMonitoringRequest struct{
	StartFrom string
}

var Files map[int]*MonitoringLogFile

func Init(){
	utils.EnsureAppHomeDir()
	Files = make(map[int]*MonitoringLogFile)
}

func NewMonitoringLogFile(logDirectory utils.LogDirectory, startFile string, offset int64)*MonitoringLogFile{
	quitCh := make(chan string, 1)
	
	monitoringLogFile := MonitoringLogFile{}
	monitoringLogFile.Directory = logDirectory.Directory
	monitoringLogFile.FilePattern = logDirectory.LogFilePattern
	monitoringLogFile.fwdLogsReader = NewLogsReader(startFile, offset)
	monitoringLogFile.bwdLogsReader = NewLogsReader(startFile, offset)
	monitoringLogFile.backwardsPointers  = stack.New()
	monitoringLogFile.quitCh = quitCh
	monitoringLogFile.start = true

	return &monitoringLogFile
}

func NewLogsReader(startFile string, offset int64) LogsReader {
	logsReader := LogsReader{}
	logsReader.FileName = startFile
	logsReader.Offset = offset
	logsReader.Lines = make(chan []string, 1000)
	logsReader.LinesConsumed = make(chan int64, 1000)
	logsReader.quitResponseCh =  make(chan string, 1)
	logsReader.quitRequestCh =  make(chan string, 1)
	return logsReader
}

func MonitorLogPath(logDirectory utils.LogDirectory, startMonitoringReq StartMonitoringRequest) (MonitoringLogFile, error){
	log.Info("Starting monitoring log  ", logDirectory)
	dir := logDirectory.Directory
	monFilePattern := logDirectory.LogFilePattern
	var err error
	var startFile string
	var offset int64
	
	if startMonitoringReq.StartFrom == "New Logs" {
		startFile,err = utils.FindLatestFile(dir, monFilePattern)
		if(err != nil){
			return MonitoringLogFile{}, err
		}
		offset =  utils.FileSize(dir, startFile)
	}else if (startMonitoringReq.StartFrom == "All Logs"){
		startFile,err = utils.FindOldestFile(dir, monFilePattern)
		if(err != nil){
			return MonitoringLogFile{}, err
		}
	}else{
		startFile = startMonitoringReq.StartFrom
	}
	
	monitoringLogFile := NewMonitoringLogFile(logDirectory, startFile, offset)
	Files[logDirectory.Id] = monitoringLogFile
	
	go monitoringLogFile.startReadBackwards()
	go monitoringLogFile.startReadForwards(monitoringLogFile.start, monitoringLogFile.reset)
	go monitoringLogFile.monitorDir()
	log.Info("Started monitoring log path ", filepath.Join(dir, monFilePattern));

	return *monitoringLogFile, nil	
}


func (monitoringLogFile *MonitoringLogFile) GetFileName()(string){
	return monitoringLogFile.fwdLogsReader.FileName
}

func (monitoringLogFile *MonitoringLogFile) StopMonitoring(){
	monitoringLogFile.fwdLogsReader.quitRequestCh <- "quit"
	monitoringLogFile.bwdLogsReader.quitRequestCh <- "quit"
	monitoringLogFile.quitCh <- "quit"
}

func (monitoringLogFile *MonitoringLogFile) ResetMonitoring(resetReq ResetRequest)(bool){
	exists := utils.FileExists(monitoringLogFile.Directory, resetReq.FileName)
	if(!exists){
		log.Error("Request file ",resetReq.FileName," doesn't exist in monitoring directory ", monitoringLogFile.Directory)
		return false
	}
	log.Info("Entered reset request for ", resetReq)
	monitoringLogFile.reset = true

	//Wait for the actual routine to quit
	retries := 0
	fwdQuit := false
	monitoringLogFile.fwdLogsReader.quitRequestCh <- "quit"
	for  retries < 5 || !fwdQuit{
		select{
		case <- monitoringLogFile.fwdLogsReader.quitResponseCh:
			fwdQuit = true
			break
		case <- time.After(1 * time.Second):
			retries = retries + 1
			break
		}
	}
	monitoringLogFile.reset  = false
	monitoringLogFile.resetLineNumber = resetReq.LineNumber
	resetOffset, err := utils.FindOffset(monitoringLogFile.Directory, resetReq.FileName, resetReq.LineNumber)
	if err != nil{
		log.Error("Could not reset the pointers to file ", resetReq.FileName )
		return false
	}
	monitoringLogFile.fwdLogsReader = NewLogsReader(resetReq.FileName, resetOffset)
	monitoringLogFile.bwdLogsReader = NewLogsReader(resetReq.FileName, resetOffset)
	go monitoringLogFile.startReadBackwards()
	go monitoringLogFile.startReadForwards(false, false)
	log.Info("monitoringLogFile:",monitoringLogFile);
	return true
}

func (monitoringLogFile *MonitoringLogFile) startReadBackwards(){
	log.Info("Start reading backwards - ", monitoringLogFile.bwdLogsReader.FileName)
	linesCh := monitoringLogFile.bwdLogsReader.Lines
	for {
		pointersStack, err := utils.PopulateBackPointers(monitoringLogFile.Directory, 
			monitoringLogFile.bwdLogsReader.FileName, monitoringLogFile.bwdLogsReader.Offset, utils.NUM_LINES_BETWEEN_POINTERS)
		if err != nil {
			log.Error("Could not read backpointers of  file  ", monitoringLogFile.bwdLogsReader.FileName)
			monitoringLogFile.quitCh <- "quit"
			return 
		}
		log.Info("Total Pointers are ", pointersStack.Len(), " for file ",monitoringLogFile.bwdLogsReader.FileName)
		for pointersStack.Len() > 0 && !monitoringLogFile.bwdLogsReader.quit{
			lastBackwardsPtr := pointersStack.Pop().(utils.BackwardsFilePointer)
			absFilepath := utils.PrepareFile(monitoringLogFile.Directory, lastBackwardsPtr.FileName)
			file,err := os.Open(absFilepath)
			defer file.Close()

			log.Debug("Backward pointer offset ", lastBackwardsPtr.Offset, "for file ", absFilepath)
			reader := bufio.NewReader(file)
			discarded,err  := reader.Discard(int(lastBackwardsPtr.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogFile.quitCh <- "quit"
				return 
			}

			linesReadCount := 0
			linesFromOffset := stack.New()
			log.Info("Reading ", lastBackwardsPtr.Lines, " lines from file ", absFilepath)
			for linesReadCount < lastBackwardsPtr.Lines{
				bytes,err := reader.ReadBytes('\n');
				if err != nil{
					//handle error
				}
				log.Debug("Line in backward read that is being pushed: ", string(bytes))
				linesFromOffset.Push(bytes)
				linesReadCount++
			}
			for linesFromOffset.Len() > 0 && !monitoringLogFile.bwdLogsReader.quit {
				bytes := linesFromOffset.Pop().([]byte)
				monitoringLogFile.bwdLogsReader.addLine(lastBackwardsPtr.FileName, bytes, linesCh)
				monitoringLogFile.bwdLogsReader.waitForConsuming()
			}
		}
		if(monitoringLogFile.bwdLogsReader.quit){
			break
		}
		//Find Next old file & populate pointersStack, if no file is present, break
		nextFile, err := utils.FindNextOldFile(monitoringLogFile.Directory,
			monitoringLogFile.bwdLogsReader.FileName,monitoringLogFile.FilePattern)
		if err != nil {
			log.Error("Failed  finding the next old file - relative to ", monitoringLogFile.bwdLogsReader.FileName);
			break
		}else if nextFile != ""{
			monitoringLogFile.bwdLogsReader.FileName = nextFile
			monitoringLogFile.bwdLogsReader.Offset = utils.FileSize(monitoringLogFile.Directory, nextFile)
		}else{
			log.Info("No old file exist, breaking the loop in readBackwards")
			break
		}
	}

}

func (monitoringLogFile *MonitoringLogFile) startReadForwards(start bool, reset bool){
	for  {
		absFilepath := utils.PrepareFile(monitoringLogFile.Directory, monitoringLogFile.fwdLogsReader.FileName)

		log.Info("Start reading and buffering log file ", absFilepath)
		file,err := os.Open(absFilepath)
		defer file.Close()
		if err != nil {
			log.Info("Got error while opening the file ", absFilepath, err)
			monitoringLogFile.quitCh <- "quit"
			return
		}

		reader := bufio.NewReader(file)

		if monitoringLogFile.fwdLogsReader.Offset > 0 {
			//TODO Discard in  a loop, if offset (of type  int64) has value > max int
			discarded,err  := reader.Discard(int(monitoringLogFile.fwdLogsReader.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogFile.quitCh <- "quit"
				return 
			}
		}

		log.Info("Start reading and buffering log file ", absFilepath)
		monitoringLogFile.readForwards(reader);

		if(monitoringLogFile.fwdLogsReader.nextFile){
			monitoringLogFile.fwdLogsReader.nextFile  = false
			monitoringLogFile.fwdLogsReader.Offset = 0;
		}else if(monitoringLogFile.fwdLogsReader.CompressedFile) {
			monitoringLogFile.fwdLogsReader.CompressedFile = false;
		}else if(monitoringLogFile.fwdLogsReader.quit){
			monitoringLogFile.fwdLogsReader.quitResponseCh <- "quit"
			break;
		}
	}
}

func (monitoringLogFile *MonitoringLogFile) readForwards(reader *bufio.Reader) {
	linesCh := monitoringLogFile.fwdLogsReader.Lines
	for !monitoringLogFile.fwdLogsReader.quit{
		if monitoringLogFile.reset  {
			log.Info("Reset is set, hence quitting startReadingForwards")
			break
		}

		bytes,err := reader.ReadBytes('\n');
		if err != nil{
			absFilepath := filepath.Join(monitoringLogFile.Directory, monitoringLogFile.fwdLogsReader.FileName)
			log.Error("Error while reading the monitoring file: ", absFilepath, err);
			stopReading := monitoringLogFile.fwdLogsReader.handleReadForwardEror(err, 
				monitoringLogFile.Directory, monitoringLogFile.FilePattern)
			if stopReading{
				break;
			}
		}else{
			log.Info("Lines Read:  "  + string(bytes))
			monitoringLogFile.fwdLogsReader.addLine(monitoringLogFile.fwdLogsReader.FileName, bytes, linesCh)
			monitoringLogFile.fwdLogsReader.waitForConsuming()
		}
	}
}

func (monitoringLogFile *MonitoringLogFile) GetBwdLogs() [][]string{
	return monitoringLogFile.bwdLogsReader.getLogs("Backwards")
}

func (monitoringLogFile *MonitoringLogFile) GetFwdLogs() [][]string{
	return monitoringLogFile.fwdLogsReader.getLogs("Forward")
}

func (monitoringLogFile *MonitoringLogFile) monitorDir(){
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("Error creating a new watcher", err)
	}
	defer watcher.Close()
	err = watcher.Add(monitoringLogFile.Directory)
	if err != nil {
		log.Fatal("Error while watching the directory", err)
	}

	for {
        select {
        case event, ok := <-watcher.Events:
            if !ok {
                return
            }
			log.Info("FSEvent in watcher:", event)
			monitoringLogFile.handleDirChangeNotification(event);
        case err, ok := <-watcher.Errors:
            if !ok {
                return
            }
            log.Error("Error while watching the directory - ",monitoringLogFile.Directory, err)
		case <- monitoringLogFile.quitCh:
			log.Warn("Routine asked to quit");
			return
		}
    }
}

func (monitoringLogFile *MonitoringLogFile) handleDirChangeNotification(event fsnotify.Event){
	switch event.Op{
	case fsnotify.Create:
		log.Info("Directory Change Notification - Created file : ", event.Name)
		fileName := event.Name
		if strings.HasSuffix(fileName, ".gz") {
			if  monitoringLogFile.fwdLogsReader.CompressedFile {
				return;
			}
			log.Info("Got compressed file ", filepath.Join(monitoringLogFile.Directory, fileName))
			//TODO Before setting compressedFile to true, need to check if the fileName matches the pattern
			monitoringLogFile.fwdLogsReader.CompressedFile = true
			monitoringLogFile.fwdLogsReader.FileName = fileName
		}
		
	case fsnotify.Remove:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
	case fsnotify.Rename:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
		
	}
}
