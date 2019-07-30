package logs


import (
	"github.com/rjeczalik/notify"
	log "github.com/Sirupsen/logrus"
	"golang.org/x/sys/unix"
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
	/*
	_,err := MonitorLogPath("/test/file")
	if(err != nil){
		log.Fatal("Could not monitor logpath")
	}
	*/
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
	
	
	quitCh := make(chan string, 1)
	linesReadCh := make(chan string, 1000)
	linesConsumeTracker := make(chan int64, 1000)
	monitoringLogFile := MonitoringLogFile{dir,monFilePattern, startFile, linesReadCh, offset, false, linesConsumeTracker, 0, quitCh, false, 0, true, false}
	Files[logDirectory.Id] = &monitoringLogFile
	
	go monitoringLogFile.readLogFile()
	go monitoringLogFile.monitorDir()
	log.Info("Started monitoring log path ", filepath.Join(dir, monFilePattern));

	return monitoringLogFile, nil	
}

func (monitoringLogFile *MonitoringLogFile) ResetMonitoring(resetReq ResetRequest)(bool){
	exists := utils.FileExists(monitoringLogFile.Directory, resetReq.FileName)
	if(!exists){
		log.Error("Request file ",resetReq.FileName," doesn't exist in monitoring directory ", monitoringLogFile.Directory)
		return false
	}

	monitoringLogFile.reset = true
	monitoringLogFile.FileName = resetReq.FileName
	monitoringLogFile.resetLineNumber = resetReq.LineNumber
	monitoringLogFile.LinesConsumed <- monitoringLogFile.LinesProduced
	monitoringLogFile.Lines = make(chan string, 1000)
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
	
		/*
		if monitoringLogFile.CompressedFile {
			absFilepath = monitoringLogFile.CompressedFile
			monitoringLogFile.FileName = monitoringLogFile.CompressedFile
			monitoringLogFile.CompressedFile = ""
		}else{
			absFilepath = filepath.Join(monitoringLogFile.Directory, monitoringLogFile.FileName)
			monitoringLogFile.Offset = 0;
		}*/

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
			log.Info("Reset the monitoring to file ", monitoringLogFile.FileName)
			monitoringLogFile.reset = false;
			monitoringLogFile.Offset = 0;
			//skip the lines

			skippedLines := 0
			for skippedLines < monitoringLogFile.resetLineNumber - 1 {
				_,err := reader.ReadBytes('\n');
				if err != nil{
					log.Error("Error while skipping the lines monitoring file reset: ", absFilepath, err);
				}
				skippedLines++
			}
			log.Info("Number of lines skipped for reset ", skippedLines)
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
		for{
			if monitoringLogFile.reset {
				log.Info("Reset is set, hence resetting the monitoring")
				break
			}
	
			bytes,err := reader.ReadBytes('\n');
			if err != nil{
				log.Error("Error while reading the monitoring file: ", absFilepath, err);
				if err == io.EOF{
					monitoringLogFile.nextFile = true
				}else {
					waitTime := 0
					for !monitoringLogFile.CompressedFile && waitTime < 10000{
						time.Sleep(1000 * time.Millisecond);
					}
					if !monitoringLogFile.CompressedFile {
						log.Error("Timeout waiting for compressed file, Start reading the next available file")
						monitoringLogFile.nextFile = true
					}else{
						log.Info("Found Compressed file: ",monitoringLogFile.CompressedFile)
						break
					}
				}
				
				if monitoringLogFile.nextFile {
					nextFile, err := utils.FindNextFile(monitoringLogFile.Directory,
						monitoringLogFile.FileName,monitoringLogFile.CompressedFile,monitoringLogFile.FilePattern)
					if err != nil {
						log.Error("Got error while fetching next file ", err)
						time.Sleep(2000 * time.Millisecond)
						continue
					}
					if nextFile != ""{
						monitoringLogFile.CompressedFile = false
						monitoringLogFile.FileName = nextFile
						monitoringLogFile.nextFile = true
						break
					}else{
						time.Sleep(2000 * time.Millisecond)
						continue
					}
				}
			}else{
				monitoringLogFile.addLine(bytes)
				monitoringLogFile.waitForConsuming()
			}
			
		}
	}
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

func (monitoringLogFile *MonitoringLogFile) addLine(bytes []byte){
	if len(bytes) > 0{
		monitoringLogFile.Lines <- string(bytes)
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
/*
func (monitoringLogFile *MonitoringLogFile) switchToCompressedFile()(*os.File, error){
	log.Info("Opening Compressed file now")
	file,err := os.Open(monitoringLogFile.CompressedFile)
	if err != nil {
		log.Info("Got error while opening the compressed file ", monitoringLogFile.CompressedFile, err)
		monitoringLogFile.quitCh <- "quit"
		return nil,err
	}
	reader := bufio.NewReader(file)
	log.Info("Discarding ", monitoringLogFile.Offset, " bytes from compressed file")
	discarded,err  := reader.Discard(monitoringLogFile.Offset)
	if err != nil{
		log.Info("Could not seek into the compressed file ", monitoringLogFile.CompressedFile)
		monitoringLogFile.quitCh <- "quit"
		defer file.Close()
		return nil,err
	}
	log.Info("Succeessfully discarded bytes ", discarded, " from ", monitoringLogFile.CompressedFile)
	return file, nil
}
*/

func (monitoringLogFile *MonitoringLogFile) monitorDir(){
	dirMonitorCh := make(chan notify.EventInfo, 10)
	if err := notify.Watch(monitoringLogFile.Directory, dirMonitorCh, notify.Create, notify.Remove, notify.InMovedFrom, notify.InMovedTo); err != nil {
		log.Info("Error while watching for create/remove/rename event for directory ", monitoringLogFile.Directory)
	}else{
		log.Info("Watching  directory: ", monitoringLogFile.Directory);
	}
	
	for{
		var ei notify.EventInfo
		select {
		case <- monitoringLogFile.quitCh:
			log.Warn("Routine asked to quit");
			return
		case ei = <- dirMonitorCh:
			monitoringLogFile.handleDirChangeNotification(ei)
		}
	}
}

func (monitoringLogFile *MonitoringLogFile) handleDirChangeNotification(ei notify.EventInfo){
	moves := make(map[uint32]struct{
		From string
		To string
	})
	
	switch ei.Event(){
	case notify.Create:
		log.Info("Directory Change Notification - Created file : ", ei.Path())
		dirName,fileName := filepath.Split(ei.Path())
		if strings.HasSuffix(fileName, ".gz") {
			if  monitoringLogFile.CompressedFile {
				return;
			}
			log.Info("Got compressed file ", filepath.Join(dirName, fileName))
			//uncompressedFilePath := filepath.Join(utils.GetAppHomeDir(), strings.TrimSuffix(fileName, ".gz"))
			//utils.GunzipFile(ei.Path(), uncompressedFilePath)
			monitoringLogFile.CompressedFile = true
			monitoringLogFile.FileName = fileName
		}
		
	case notify.Remove:
		log.Info("Removed: ", ei.Path())
	case notify.InMovedFrom:
		fallthrough
	case notify.InMovedTo:
		cookie := ei.Sys().(*unix.InotifyEvent).Cookie
		info := moves[cookie]
		if ei.Event() == notify.InMovedFrom{
			info.From = ei.Path()
		}else{
			info.To = ei.Path()
		}
		moves[cookie] = info
		if info.From != "" && info.To != ""{
			log.Info("Renamed: " , info.From + " -> ", info.To)
			delete(moves, cookie)
			_,fileRenamed := filepath.Split(ei.Path())
			if strings.Index(fileRenamed, "dummy") >= 0{
				log.Info("Renamed file matched with watching log pattern")
			}
		}
	}
}
