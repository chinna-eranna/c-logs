package logs


import (
	"github.com/fsnotify/fsnotify"
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
	FileName string
	Lines chan string
	Offset int64

	CompressedFile bool

	LinesConsumed chan int64
	LinesProduced int64

	quitCh chan string
	reset bool
	resetLineNumber int
	start bool
	nextFile bool

	//backwards variables
	//backwardsPointersCh chan BackwardsFilePointer
	//backwardsLines chan string
}

type BackwardsFilePointer struct {
	FileName string
	Offset int64
	lines int
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
	linesReadCh := make(chan string, 1000)
	linesConsumeTracker := make(chan int64, 1000)

	monitoringLogFile := MonitoringLogFile{}
	monitoringLogFile.Directory = logDirectory.Directory
	monitoringLogFile.FilePattern = logDirectory.LogFilePattern
	monitoringLogFile.FileName  = startFile
	monitoringLogFile.Lines = linesReadCh
	monitoringLogFile.Offset = offset
	monitoringLogFile.LinesConsumed = linesConsumeTracker
	monitoringLogFile.quitCh = quitCh
	monitoringLogFile.start = true

	return &monitoringLogFile
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
	
	go monitoringLogFile.readLogFile()
	go monitoringLogFile.monitorDir()
	log.Info("Started monitoring log path ", filepath.Join(dir, monFilePattern));

	return *monitoringLogFile, nil	
}

func (monitoringLogFile *MonitoringLogFile) ResetMonitoring(resetReq ResetRequest)(bool){
	exists := utils.FileExists(monitoringLogFile.Directory, resetReq.FileName)
	if(!exists){
		log.Error("Request file ",resetReq.FileName," doesn't exist in monitoring directory ", monitoringLogFile.Directory)
		return false
	}
	log.Info("Entered reset request for ", resetReq)
	monitoringLogFile.reset = true
	monitoringLogFile.FileName = resetReq.FileName
	monitoringLogFile.resetLineNumber = resetReq.LineNumber
	monitoringLogFile.LinesConsumed <- monitoringLogFile.LinesProduced
	monitoringLogFile.Lines = make(chan string, 1000)
	log.Info("monitoringLogFile:",monitoringLogFile);
	return true
}

func (monitoringLogFile *MonitoringLogFile) readLogFile(){
	for monitoringLogFile.start  || monitoringLogFile.nextFile || monitoringLogFile.reset || monitoringLogFile.CompressedFile {
		
		if(monitoringLogFile.nextFile){
			monitoringLogFile.nextFile  = false
		}

		absFilepath := filepath.Join(monitoringLogFile.Directory, monitoringLogFile.FileName)
		if strings.HasSuffix(monitoringLogFile.FileName, ".gz"){
			uncompressedFilePath := filepath.Join(utils.GetAppHomeDir(), strings.TrimSuffix(monitoringLogFile.FileName, ".gz"))
			utils.GunzipFile(filepath.Join(monitoringLogFile.Directory, monitoringLogFile.FileName), uncompressedFilePath)
			absFilepath = uncompressedFilePath
		}

		if monitoringLogFile.CompressedFile {
			monitoringLogFile.CompressedFile = false
		}else  if monitoringLogFile.start {
			monitoringLogFile.start = false
			//Dont reset offset to 0 while starting for the first time, as either it is default 0 or Set to start with new logs.
		}else{
			monitoringLogFile.Offset = 0;
		}
	
		log.Info("Start reading and buffering log file ", absFilepath)
		
		file,err := os.Open(absFilepath)
		defer file.Close()
		if err != nil {
			log.Info("Got error while opening the file ", absFilepath, err)
			monitoringLogFile.quitCh <- "quit"
			return
		}

		reader := bufio.NewReader(file)
		if monitoringLogFile.reset{
			monitoringLogFile.handleResetForwards(reader)
		}
		
		if monitoringLogFile.Offset > 0 {
			//TODO Discard in  a loop, if offset (of type  int64) has value > max int
			discarded,err  := reader.Discard(int(monitoringLogFile.Offset))
			if err != nil{
				log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded)
				monitoringLogFile.quitCh <- "quit"
				return 
			}
		}

		monitoringLogFile.startReadingForwards(reader);
	}
}

func (monitoringLogFile *MonitoringLogFile) handleResetForwards(reader *bufio.Reader) {
	log.Info("Reset the monitoring to file ", monitoringLogFile.FileName)
	monitoringLogFile.reset = false;
	monitoringLogFile.Offset = 0;

	//skip the lines
	skippedLines := 0
	for skippedLines < monitoringLogFile.resetLineNumber - 1 {
		_,err := reader.ReadBytes('\n');
		if err != nil{
			absFilepath := filepath.Join(monitoringLogFile.Directory, monitoringLogFile.FileName)
			log.Error("Error while skipping the lines monitoring file reset: ", absFilepath, err);
			break
		}
		skippedLines++
	}
	log.Info("Number of lines skipped for reset ", skippedLines)
}

func (monitoringLogFile *MonitoringLogFile) startReadingForwards(reader *bufio.Reader) {
	linesCh := monitoringLogFile.Lines
	for{
		if monitoringLogFile.reset {
			log.Info("Reset is set, hence resetting the monitoring forwards")
			break
		}

		bytes,err := reader.ReadBytes('\n');
		if err != nil{
			stopReading := monitoringLogFile.shdStopReadingForwards(err)
			if stopReading{
				break;
			}
		}else{
			monitoringLogFile.addLine(bytes, linesCh)
			monitoringLogFile.waitForConsuming()
		}
	}
}

func (monitoringLogFile *MonitoringLogFile) shdStopReadingForwards(err error)(bool){
	absFilepath := filepath.Join(monitoringLogFile.Directory, monitoringLogFile.FileName)
	log.Error("Error while reading the monitoring file: ", absFilepath, err);
	
	if err == io.EOF{
		monitoringLogFile.nextFile = true
	}else {
		//non EOF file error while reading, while for 5 seconds
		//if compressed file found continue
		waitTime := 0
		for !monitoringLogFile.CompressedFile && waitTime < 5000{
			time.Sleep(1000 * time.Millisecond); 
			waitTime = waitTime + 1000
		}
		if !monitoringLogFile.CompressedFile {
			log.Error("Timeout waiting for compressed file, Start forward reading the next available file")
			monitoringLogFile.nextFile = true
		}else{
			//current file compressed, switch to compressed file read
			log.Info("Found Compressed file: ",monitoringLogFile.CompressedFile)
			return true
		}
	}
	
	if monitoringLogFile.nextFile {
		nextFile, err := utils.FindNextFile(monitoringLogFile.Directory,
			monitoringLogFile.FileName,monitoringLogFile.CompressedFile,monitoringLogFile.FilePattern)
		if err != nil {
			//error while fetching next file, wait for 2 seconds, then continue reading the same file
			log.Error("Got error while fetching next file ", err)
			time.Sleep(2000 * time.Millisecond)
			return false 
		}
		if nextFile != ""{
			//found next file to read,stop reading current
			monitoringLogFile.CompressedFile = false
			monitoringLogFile.FileName = nextFile
			monitoringLogFile.nextFile = true
			return true 
		}else{
			//no new file found, wait for 2 seconds, then continue reading the same file
			time.Sleep(2000 * time.Millisecond)
			return false
		}
	}
	return false
}

func (monitoringLogFile *MonitoringLogFile) GetLogs() []string{
	var linesCount int64
	var linesRead []string
	var timeout bool
	for linesCount < 50 && !timeout{
		select{
		case nextLine := <- monitoringLogFile.Lines:
			linesRead = append(linesRead, nextLine)
			linesCount++
		case <- time.After(1 * time.Second):
			timeout = true
			break
		}
	}
	log.Info("Consumed ", linesCount, " lines")
	monitoringLogFile.LinesConsumed <- linesCount
	return linesRead
}

func (monitoringLogFile *MonitoringLogFile) addLine(bytes []byte, linesCh chan string){
	if len(bytes) > 0{
		linesCh <- string(bytes)
		monitoringLogFile.Offset += int64(len(bytes))
		monitoringLogFile.LinesProduced += 1
	}
}

func (monitoringLogFile *MonitoringLogFile) waitForConsuming(){
	for monitoringLogFile.LinesProduced > 50{
		log.Info("Lines available for consuming ", monitoringLogFile.LinesProduced)
		log.Info("Offset ", monitoringLogFile.Offset)
		linesConsumed := <- monitoringLogFile.LinesConsumed
		monitoringLogFile.LinesProduced -= linesConsumed
		log.Info("Lines available After consuming ", monitoringLogFile.LinesProduced)
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
			if  monitoringLogFile.CompressedFile {
				return;
			}
			log.Info("Got compressed file ", filepath.Join(monitoringLogFile.Directory, fileName))
			//TODO Before setting compressedFile to true, need to check if the fileName matches the pattern
			monitoringLogFile.CompressedFile = true
			monitoringLogFile.FileName = fileName
		}
		
	case fsnotify.Remove:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
	case fsnotify.Rename:
		log.Info("Directory Change Notification - Removed file: ", event.Name)
		
	}
}
