package logs


import (
	"github.com/fsnotify/fsnotify"
	"github.com/golang-collections/collections/stack"
	log "github.com/Sirupsen/logrus"
	"strings"
	"path/filepath"
	"os"
	"bufio"
	"io"
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
	
	fwdLogLinesRead LogLinesRead
	bwdLogLinesRead LogLinesRead

	//backwards variables
	backwardsPointers *stack.Stack
	
}

type LogLinesRead struct{
	FileName string
	Offset int64
	Lines chan string
	LinesConsumed chan int64
	LinesProduced int64
	quitRequestCh chan string
	quitResponseCh chan string

	CompressedFile bool
	nextFile bool
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
	monitoringLogFile.fwdLogLinesRead = NewLogLinesRead(startFile, offset)
	monitoringLogFile.bwdLogLinesRead = NewLogLinesRead(startFile, offset)
	monitoringLogFile.backwardsPointers  = stack.New()
	monitoringLogFile.quitCh = quitCh
	monitoringLogFile.start = true

	return &monitoringLogFile
}

func NewLogLinesRead(startFile string, offset int64) LogLinesRead {
	logsLineRead := LogLinesRead{}
	logsLineRead.FileName = startFile
	logsLineRead.Offset = offset
	logsLineRead.Lines = make(chan string, 1000)
	logsLineRead.LinesConsumed = make(chan int64, 1000)
	logsLineRead.quitResponseCh =  make(chan string, 1)
	logsLineRead.quitRequestCh =  make(chan string, 1)
	return logsLineRead
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
	
	go monitoringLogFile.readBackwards()
	go monitoringLogFile.readForwards(monitoringLogFile.start, monitoringLogFile.reset)
	go monitoringLogFile.monitorDir()
	log.Info("Started monitoring log path ", filepath.Join(dir, monFilePattern));

	return *monitoringLogFile, nil	
}


func (monitoringLogFile *MonitoringLogFile) GetFileName()(string){
	return monitoringLogFile.fwdLogLinesRead.FileName
}

func (monitoringLogFile *MonitoringLogFile) StopMonitoring(){
	monitoringLogFile.fwdLogLinesRead.quitRequestCh <- "quit"
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
	monitoringLogFile.fwdLogLinesRead.quitRequestCh <- "quit"
	for  retries < 5 || !fwdQuit{
		select{
		case <- monitoringLogFile.fwdLogLinesRead.quitResponseCh:
			fwdQuit = true
			break
		case <- time.After(1 * time.Second):
			retries = retries + 1
			break
		}
	}
	monitoringLogFile.reset  = false
	monitoringLogFile.resetLineNumber = resetReq.LineNumber
	monitoringLogFile.fwdLogLinesRead = NewLogLinesRead(resetReq.FileName, 0)
	go monitoringLogFile.readBackwards()
	go monitoringLogFile.readForwards(false, true)
	log.Info("monitoringLogFile:",monitoringLogFile);
	return true
}


func (monitoringLogFile *MonitoringLogFile) startRead(){
	if(monitoringLogFile.start){
		monitoringLogFile.start = false
	}
	if(monitoringLogFile.reset){
		monitoringLogFile.fwdLogLinesRead.Offset = 0;
	}
}

func (monitoringLogFile *MonitoringLogFile) readBackwards(){
	log.Info("Start reading backwards - ", monitoringLogFile.bwdLogLinesRead.FileName)
	linesCh := monitoringLogFile.bwdLogLinesRead.Lines
	for {
		pointersStack, err := utils.PopulateBackPointers(monitoringLogFile.Directory, 
			monitoringLogFile.bwdLogLinesRead.FileName, monitoringLogFile.bwdLogLinesRead.Offset, utils.NUM_LINES_BETWEEN_POINTERS)
		if err != nil {
			log.Error("Could not read backpointers of  file  ", monitoringLogFile.bwdLogLinesRead.FileName)
			monitoringLogFile.quitCh <- "quit"
			return 
		}
		log.Info("Total Pointers are ", pointersStack.Len(), " for file ",monitoringLogFile.bwdLogLinesRead.FileName)
		for pointersStack.Len() > 0{
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
			for linesFromOffset.Len() > 0{
				bytes := linesFromOffset.Pop().([]byte)
				monitoringLogFile.bwdLogLinesRead.addLine(bytes, linesCh)
				monitoringLogFile.bwdLogLinesRead.waitForConsuming()
			}
		}
		//Find Next old file & populate pointersStack, if no file is present, break
		nextFile, err := utils.FindNextOldFile(monitoringLogFile.Directory,
			monitoringLogFile.bwdLogLinesRead.FileName,monitoringLogFile.FilePattern)
		if err != nil {
			log.Error("Failed  finding the next old file - relative to ", monitoringLogFile.bwdLogLinesRead.FileName);
			break
		}else if nextFile != ""{
			monitoringLogFile.bwdLogLinesRead.FileName = nextFile
			monitoringLogFile.bwdLogLinesRead.Offset = 0
		}else{
			log.Info("No old file exist, breaking the loop in readBackwards")
			break
		}
	}

}

func (monitoringLogFile *MonitoringLogFile) readForwards(start bool, reset bool){
	absFilepath := utils.PrepareFile(monitoringLogFile.Directory, monitoringLogFile.fwdLogLinesRead.FileName)
	file,err := os.Open(absFilepath)
	defer file.Close()
	if err != nil {
		log.Error("Got error while opening the file ", absFilepath, err)
		monitoringLogFile.quitCh <- "quit"
		return
	}
	reader := bufio.NewReader(file)

	if(reset){
		//Correct the offset in reset  case
		monitoringLogFile.fwdLogLinesRead.handleResetForwards(reader,  monitoringLogFile.resetLineNumber, monitoringLogFile.Directory)
	}
	if(start && monitoringLogFile.fwdLogLinesRead.Offset > 0){
		discarded,err  := reader.Discard(int(monitoringLogFile.fwdLogLinesRead.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogFile.quitCh <- "quit"
				return 
			}
	}

	for  {
		log.Info("Start reading and buffering log file ", absFilepath)
		
		monitoringLogFile.startReadingForwards(reader);

		if(monitoringLogFile.fwdLogLinesRead.nextFile){
			monitoringLogFile.fwdLogLinesRead.nextFile  = false
			monitoringLogFile.fwdLogLinesRead.Offset = 0;
		}else if(monitoringLogFile.fwdLogLinesRead.CompressedFile) {
			monitoringLogFile.fwdLogLinesRead.CompressedFile = false;
		}else{
			monitoringLogFile.fwdLogLinesRead.quitResponseCh <- "quit"
			break;
		}

		absFilepath = utils.PrepareFile(monitoringLogFile.Directory, monitoringLogFile.fwdLogLinesRead.FileName)
		log.Info("Start reading and buffering log file ", absFilepath)
		file,err := os.Open(absFilepath)
		defer file.Close()
		if err != nil {
			log.Info("Got error while opening the file ", absFilepath, err)
			monitoringLogFile.quitCh <- "quit"
			return
		}
		reader = bufio.NewReader(file)

		if monitoringLogFile.fwdLogLinesRead.Offset > 0 {
			//TODO Discard in  a loop, if offset (of type  int64) has value > max int
			discarded,err  := reader.Discard(int(monitoringLogFile.fwdLogLinesRead.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogFile.quitCh <- "quit"
				return 
			}
		}

	}
}

func (logLinesRead *LogLinesRead) handleResetForwards(reader *bufio.Reader, resetLineNumber int, directory string) {
	log.Info("Reset the monitoring to file ", logLinesRead.FileName)
	
	logLinesRead.Offset = 0;  //shouldn't the offset be  moving here ?

	//skip the lines
	skippedLines := 0
	for skippedLines < resetLineNumber - 1 {
		_,err := reader.ReadBytes('\n');
		if err != nil{
			absFilepath := filepath.Join(directory, logLinesRead.FileName)
			log.Error("Error while skipping the lines monitoring file reset: ", absFilepath, err);
			break
		}
		skippedLines++
	}
	log.Info("Number of lines skipped for reset ", skippedLines)
}

func (monitoringLogFile *MonitoringLogFile) startReadingForwards(reader *bufio.Reader) {
	linesCh := monitoringLogFile.fwdLogLinesRead.Lines
	for{
		if monitoringLogFile.reset  {
			log.Info("Reset is set, hence quitting startReadingForwards")
			break
		}

		bytes,err := reader.ReadBytes('\n');
		if err != nil{
			stopReading := monitoringLogFile.shdStopReadingForwards(err)
			if stopReading{
				break;
			}
		}else{
			log.Info("Lines Read:  "  + string(bytes))
			monitoringLogFile.fwdLogLinesRead.addLine(bytes, linesCh)
			monitoringLogFile.fwdLogLinesRead.waitForConsuming()
		}
	}
}

func (monitoringLogFile *MonitoringLogFile) shdStopReadingForwards(err error)(bool){
	absFilepath := filepath.Join(monitoringLogFile.Directory, monitoringLogFile.fwdLogLinesRead.FileName)
	log.Error("Error while reading the monitoring file: ", absFilepath, err);
	
	if err == io.EOF{
		monitoringLogFile.fwdLogLinesRead.nextFile = true
	}else {
		//non EOF file error while reading, while for 3 seconds
		//if compressed file found continue
		waitTime := 0
		for !monitoringLogFile.fwdLogLinesRead.CompressedFile && waitTime < 3000{
			time.Sleep(1000 * time.Millisecond); 
			waitTime = waitTime + 1000
		}
		if !monitoringLogFile.fwdLogLinesRead.CompressedFile {
			log.Error("Timeout waiting for compressed file, Start forward reading the next available file")
			monitoringLogFile.fwdLogLinesRead.nextFile = true
		}else{
			//current file compressed, switch to compressed file read
			log.Info("Found Compressed file: ",monitoringLogFile.fwdLogLinesRead.CompressedFile)
			return true
		}
	}
	
	if monitoringLogFile.fwdLogLinesRead.nextFile {
		nextFile, err := utils.FindNextNewFile(monitoringLogFile.Directory,
			monitoringLogFile.fwdLogLinesRead.FileName,monitoringLogFile.fwdLogLinesRead.CompressedFile,monitoringLogFile.FilePattern)
		if err != nil {
			//error while fetching next file, wait for 2 seconds, then continue reading the same file
			log.Error("Got error while fetching next file ", err)
			time.Sleep(2000 * time.Millisecond)
			return false 
		}
		if nextFile != ""{
			//found next file to read,stop reading current
			monitoringLogFile.fwdLogLinesRead.CompressedFile = false
			monitoringLogFile.fwdLogLinesRead.FileName = nextFile
			monitoringLogFile.fwdLogLinesRead.nextFile = true
			return true 
		}else{
			//no new file found, wait for 2 seconds, then continue reading the same file
			time.Sleep(2000 * time.Millisecond)
			return false
		}
	}
	return false
}

func (monitoringLogFile *MonitoringLogFile) GetBwdLogs() []string{
	var linesCount int64
	var linesRead []string
	var timeout bool
	for linesCount < 50 && !timeout{
		select{
		case nextLine := <- monitoringLogFile.bwdLogLinesRead.Lines:
			linesRead = append(linesRead, nextLine)
			linesCount++
		case <- time.After(1 * time.Second):
			timeout = true
			break
		}
	}
	log.Info("Consumed ", linesCount, " lines")
	monitoringLogFile.bwdLogLinesRead.LinesConsumed <- linesCount
	return linesRead
}

func (monitoringLogFile *MonitoringLogFile) GetFwdLogs() []string{
	var linesCount int64
	var linesRead []string
	var timeout bool
	for linesCount < 50 && !timeout{
		select{
		case nextLine := <- monitoringLogFile.fwdLogLinesRead.Lines:
			linesRead = append(linesRead, nextLine)
			linesCount++
		case <- time.After(1 * time.Second):
			timeout = true
			break
		}
	}
	log.Info("Consumed ", linesCount, " lines")
	monitoringLogFile.fwdLogLinesRead.LinesConsumed <- linesCount
	return linesRead
}

func (logLinesRead *LogLinesRead) addLine(bytes []byte, linesCh chan string){
	if len(bytes) > 0{
		linesCh <- string(bytes)
		logLinesRead.Offset += int64(len(bytes))
		logLinesRead.LinesProduced += 1
	}
}

func (logLinesRead *LogLinesRead) waitForConsuming(){
	quitReq := false
	for logLinesRead.LinesProduced > 50 && !quitReq{
		log.Info("Lines available for consuming ", logLinesRead.LinesProduced)
		log.Info("Offset ", logLinesRead.Offset)

		select {
		case <- logLinesRead.quitRequestCh:
			quitReq = true
			log.Info("Got Quit Request")
			break
		case linesConsumed := <- logLinesRead.LinesConsumed:
			logLinesRead.LinesProduced -= linesConsumed
			break
		}
		
		log.Info("Lines available After consuming ", logLinesRead.LinesProduced)
	}
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
			if  monitoringLogFile.fwdLogLinesRead.CompressedFile {
				return;
			}
			log.Info("Got compressed file ", filepath.Join(monitoringLogFile.Directory, fileName))
			//TODO Before setting compressedFile to true, need to check if the fileName matches the pattern
			monitoringLogFile.fwdLogLinesRead.CompressedFile = true
			monitoringLogFile.fwdLogLinesRead.FileName = fileName
		}
		
	case fsnotify.Remove:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
	case fsnotify.Rename:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
		
	}
}
