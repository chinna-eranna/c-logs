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

type MonitoringLogSet struct{
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

var Files map[int]*MonitoringLogSet

func Init(){
	utils.EnsureAppHomeDir()
	Files = make(map[int]*MonitoringLogSet)
}

func NewMonitoringLogSet(logSet utils.LogSet, startFile string, offset int64)*MonitoringLogSet{
	quitCh := make(chan string, 1)
	
	monitoringLogSet := MonitoringLogSet{}
	monitoringLogSet.Directory = logSet.Directory
	monitoringLogSet.FilePattern = logSet.LogFilePattern
	monitoringLogSet.fwdLogsReader = NewLogsReader(startFile, offset)
	monitoringLogSet.bwdLogsReader = NewLogsReader(startFile, offset)
	monitoringLogSet.backwardsPointers  = stack.New()
	monitoringLogSet.quitCh = quitCh
	monitoringLogSet.start = true

	return &monitoringLogSet
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

func MonitorLogPath(logSet utils.LogSet, startMonitoringReq StartMonitoringRequest) (MonitoringLogSet, error){
	log.Info("Starting monitoring log  ", logSet)
	dir := logSet.Directory
	monFilePattern := logSet.LogFilePattern
	var err error
	var startFile string
	var offset int64
	
	if startMonitoringReq.StartFrom == "New Logs" {
		startFile,err = utils.FindLatestFile(dir, monFilePattern)
		if(err != nil){
			return MonitoringLogSet{}, err
		}
		offset =  utils.FileSize(dir, startFile)
	}else if (startMonitoringReq.StartFrom == "All Logs"){
		startFile,err = utils.FindOldestFile(dir, monFilePattern)
		if(err != nil){
			return MonitoringLogSet{}, err
		}
	}else{
		startFile = startMonitoringReq.StartFrom
	}
	
	monitoringLogSet := NewMonitoringLogSet(logSet, startFile, offset)
	Files[logSet.Id] = monitoringLogSet
	
	go monitoringLogSet.startReadBackwards()
	go monitoringLogSet.startReadForwards(monitoringLogSet.start, monitoringLogSet.reset)
	go monitoringLogSet.monitorDir()
	log.Info("Started monitoring log path ", filepath.Join(dir, monFilePattern));

	return *monitoringLogSet, nil	
}


func (monitoringLogSet *MonitoringLogSet) GetFileName()(string){
	return monitoringLogSet.fwdLogsReader.FileName
}

func (monitoringLogSet *MonitoringLogSet) StopMonitoring(){
	monitoringLogSet.fwdLogsReader.quitRequestCh <- "quit"
	monitoringLogSet.bwdLogsReader.quitRequestCh <- "quit"
	monitoringLogSet.quitCh <- "quit"
}

func (monitoringLogSet *MonitoringLogSet) ResetMonitoring(resetReq ResetRequest)(bool){
	exists := utils.FileExists(monitoringLogSet.Directory, resetReq.FileName)
	if(!exists){
		log.Error("Request file ",resetReq.FileName," doesn't exist in monitoring directory ", monitoringLogSet.Directory)
		return false
	}
	log.Info("Entered reset request for ", resetReq)
	monitoringLogSet.reset = true

	//Wait for the actual routine to quit
	retries := 0
	fwdQuit := false
	monitoringLogSet.fwdLogsReader.quitRequestCh <- "quit"
	for  retries < 5 && !fwdQuit{
		select{
		case <- monitoringLogSet.fwdLogsReader.quitResponseCh:
			log.Info("ResetMonitoring(): Got quit in quitResponseCh")
			fwdQuit = true
			break
		case <- time.After(1 * time.Second):
			log.Info("ResetMonitoring():Waiting for a second for previous readers to quit")
			retries = retries + 1
			break
		}
	}
	monitoringLogSet.reset  = false
	monitoringLogSet.resetLineNumber = resetReq.LineNumber
	resetOffset, err := utils.FindOffset(monitoringLogSet.Directory, resetReq.FileName, resetReq.LineNumber)
	if err != nil{
		log.Error("Could not reset the pointers to file ", resetReq.FileName )
		return false
	}
	monitoringLogSet.fwdLogsReader = NewLogsReader(resetReq.FileName, resetOffset)
	monitoringLogSet.bwdLogsReader = NewLogsReader(resetReq.FileName, resetOffset)
	go monitoringLogSet.startReadBackwards()
	go monitoringLogSet.startReadForwards(false, false)
	log.Info("monitoringLogSet:",monitoringLogSet);
	return true
}

func (monitoringLogSet *MonitoringLogSet) startReadBackwards(){
	log.Info("Start reading backwards - ", monitoringLogSet.bwdLogsReader.FileName)
	linesCh := monitoringLogSet.bwdLogsReader.Lines
	for {
		pointersStack, err := utils.PopulateBackPointers(monitoringLogSet.Directory, 
			monitoringLogSet.bwdLogsReader.FileName, monitoringLogSet.bwdLogsReader.Offset, utils.NUM_LINES_BETWEEN_POINTERS)
		if err != nil {
			log.Error("Could not read backpointers of  file  ", monitoringLogSet.bwdLogsReader.FileName)
			monitoringLogSet.quitCh <- "quit"
			return 
		}
		log.Info("Total Pointers are ", pointersStack.Len(), " for file ",monitoringLogSet.bwdLogsReader.FileName)
		for pointersStack.Len() > 0 && !monitoringLogSet.bwdLogsReader.quit{
			lastBackwardsPtr := pointersStack.Pop().(utils.BackwardsFilePointer)
			absFilepath := utils.PrepareFile(monitoringLogSet.Directory, lastBackwardsPtr.FileName)
			file,err := os.Open(absFilepath)
			defer file.Close()

			log.Debug("Backward pointer offset ", lastBackwardsPtr.Offset, "for file ", absFilepath)
			reader := bufio.NewReader(file)
			discarded,err  := reader.Discard(int(lastBackwardsPtr.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogSet.quitCh <- "quit"
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
			for linesFromOffset.Len() > 0 && !monitoringLogSet.bwdLogsReader.quit {
				bytes := linesFromOffset.Pop().([]byte)
				monitoringLogSet.bwdLogsReader.addLine(lastBackwardsPtr.FileName, bytes, linesCh)
				monitoringLogSet.bwdLogsReader.waitForConsuming()
			}
		}
		if(monitoringLogSet.bwdLogsReader.quit){
			break
		}
		//Find Next old file & populate pointersStack, if no file is present, break
		nextFile, err := utils.FindNextOldFile(monitoringLogSet.Directory,
			monitoringLogSet.bwdLogsReader.FileName,monitoringLogSet.FilePattern)
		if err != nil {
			log.Error("Failed  finding the next old file - relative to ", monitoringLogSet.bwdLogsReader.FileName)
			break
		}else if nextFile != ""{
			monitoringLogSet.bwdLogsReader.FileName = nextFile
			absFilepath := utils.PrepareFile(monitoringLogSet.Directory, monitoringLogSet.bwdLogsReader.FileName)
			monitoringLogSet.bwdLogsReader.Offset = utils.AbsFileSize(absFilepath)
			log.Info("Size of the file being considered for read backwards: " , monitoringLogSet.bwdLogsReader.Offset)
		}else{
			log.Info("No old file exist, breaking the loop in readBackwards")
			break
		}
	}

}

func (monitoringLogSet *MonitoringLogSet) startReadForwards(start bool, reset bool){
	for  {
		absFilepath := utils.PrepareFile(monitoringLogSet.Directory, monitoringLogSet.fwdLogsReader.FileName)

		log.Info("Start reading and buffering log file ", absFilepath)
		file,err := os.Open(absFilepath)
		defer file.Close()
		if err != nil {
			log.Info("Got error while opening the file ", absFilepath, err)
			monitoringLogSet.quitCh <- "quit"
			return
		}

		reader := bufio.NewReader(file)

		if monitoringLogSet.fwdLogsReader.Offset > 0 {
			//TODO Discard in  a loop, if offset (of type  int64) has value > max int
			discarded,err  := reader.Discard(int(monitoringLogSet.fwdLogsReader.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogSet.quitCh <- "quit"
				return 
			}
		}

		log.Info("Start reading and buffering log file ", absFilepath)
		monitoringLogSet.readForwards(reader);

		if(monitoringLogSet.fwdLogsReader.nextFile){
			monitoringLogSet.fwdLogsReader.nextFile  = false
			monitoringLogSet.fwdLogsReader.Offset = 0;
		}else if(monitoringLogSet.fwdLogsReader.CompressedFile) {
			monitoringLogSet.fwdLogsReader.CompressedFile = false;
		}else if(monitoringLogSet.fwdLogsReader.quit){
			log.Info("startReadForwards():Populating quit into quitResponseCh")
			monitoringLogSet.fwdLogsReader.quitResponseCh <- "quit"
			break;
		}
	}
}

func (monitoringLogSet *MonitoringLogSet) readForwards(reader *bufio.Reader) {
	linesCh := monitoringLogSet.fwdLogsReader.Lines
	for !monitoringLogSet.fwdLogsReader.quit{
		if monitoringLogSet.reset  {
			log.Info("Reset is set, hence quitting startReadingForwards")
			break
		}

		bytes,err := reader.ReadBytes('\n');
		if err != nil{
			absFilepath := filepath.Join(monitoringLogSet.Directory, monitoringLogSet.fwdLogsReader.FileName)
			log.Error("Error while reading the monitoring file: ", absFilepath, err);
			stopReading := monitoringLogSet.fwdLogsReader.handleReadForwardEror(err, 
				monitoringLogSet.Directory, monitoringLogSet.FilePattern)
			if stopReading{
				break;
			}
		}else{
			log.Debug("Lines Read:  "  + string(bytes))
			monitoringLogSet.fwdLogsReader.addLine(monitoringLogSet.fwdLogsReader.FileName, bytes, linesCh)
			monitoringLogSet.fwdLogsReader.waitForConsuming()
		}
	}
}

func (monitoringLogSet *MonitoringLogSet) GetBwdLogs() [][]string{
	return monitoringLogSet.bwdLogsReader.getLogs("Backwards")
}

func (monitoringLogSet *MonitoringLogSet) GetFwdLogs() [][]string{
	return monitoringLogSet.fwdLogsReader.getLogs("Forward")
}

func (monitoringLogSet *MonitoringLogSet) monitorDir(){
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		log.Fatal("Error creating a new watcher", err)
	}
	defer watcher.Close()
	err = watcher.Add(monitoringLogSet.Directory)
	if err != nil {
		log.Fatal("Error while watching the directory", err)
	}

	for {
        select {
        case event, ok := <-watcher.Events:
            if !ok {
                return
            }
			monitoringLogSet.handleDirChangeNotification(event);
        case err, ok := <-watcher.Errors:
            if !ok {
                return
            }
            log.Error("Error while watching the directory - ",monitoringLogSet.Directory, err)
		case <- monitoringLogSet.quitCh:
			log.Warn("Routine asked to quit");
			return
		}
    }
}

func (monitoringLogSet *MonitoringLogSet) handleDirChangeNotification(event fsnotify.Event){
	switch event.Op{
	case fsnotify.Create:
		log.Info("Directory Change Notification - Created file : ", event.Name)
		fileName := event.Name
		if strings.HasSuffix(fileName, ".gz") {
			if  monitoringLogSet.fwdLogsReader.CompressedFile {
				return;
			}
			log.Info("Got compressed file ", filepath.Join(monitoringLogSet.Directory, fileName))
			//TODO Before setting compressedFile to true, need to check if the fileName matches the pattern
			monitoringLogSet.fwdLogsReader.CompressedFile = true
			monitoringLogSet.fwdLogsReader.FileName = fileName
		}
		
	case fsnotify.Remove:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
	case fsnotify.Rename:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
		
	}
}
