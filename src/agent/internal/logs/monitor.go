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
	FileName string
	Lines chan string
	Offset int

	CompressedFile string

	LinesConsumed chan int64
	LinesProduced int64

	quitCh chan string
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

func MonitorLogPath(logDirectory utils.LogDirectory) (MonitoringLogFile, error){
	log.Info("Starting monitoring log  ", logDirectory)
	dir := logDirectory.Directory
	monFilePattern := logDirectory.LogFilePattern
	latestFile,err := utils.FindLatestFile(dir, monFilePattern)
	if(err != nil){
		return MonitoringLogFile{}, err
	}

	quitCh := make(chan string, 1)
	linesReadCh := make(chan string, 1000)
	linesConsumeTracker := make(chan int64, 1000)
	monitoringLogFile := MonitoringLogFile{dir, latestFile, linesReadCh, 0, "", linesConsumeTracker, 0, quitCh}
	Files[logDirectory.Id] = &monitoringLogFile
	
	go monitoringLogFile.readLogFile()
	go monitoringLogFile.monitorDir()
	log.Info("Started monitoring log path ", filepath.Join(dir, monFilePattern));

	return monitoringLogFile, nil	
}

func (monitoringLogFile *MonitoringLogFile) resetMonitoring(file string, line int)(bool){
	exists := utils.FileExists(monitoringLogFile.Directory, file)
	if(!exists){
		return false
	}

	monitoringLogFile.FileName = file
	monitoringLogFile.Lines = make(chan string, 1000)
	monitoringLogFile.CompressedFile = "";

}

func (monitoringLogFile *MonitoringLogFile) readLogFile(){
	absFilepath := filepath.Join(monitoringLogFile.Directory, monitoringLogFile.FileName)
	log.Info("Start reading and buffering log file ", absFilepath)
	
	file,err := os.Open(absFilepath)
	defer file.Close()
	if err != nil {
		log.Info("Got error while opening the file ", absFilepath, err)
		monitoringLogFile.quitCh <- "quit"
		return
	}

	reader := bufio.NewReader(file)
	compressedFileBeingRead := false
	for{
		if reset {
			monitoringLogFile
		}
		if !compressedFileBeingRead && len(monitoringLogFile.CompressedFile) > 0 {
			file, err := monitoringLogFile.switchToCompressedFile()
			if err != nil{
				return
			}
			compressedFileBeingRead = true
			defer file.Close()
		}

		bytes,err := reader.ReadBytes('\n');
		monitoringLogFile.addLine(bytes)
		if err != nil{
			log.Error("Error while reading the monitoring file: ", absFilepath, err);
			if err == io.EOF{
				time.Sleep(2000 * time.Millisecond)
			}else{
				break
			}
		}
		monitoringLogFile.waitForConsuming()
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
		monitoringLogFile.Offset += len(bytes)
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
			if  len(monitoringLogFile.CompressedFile) > 0 {
				return;
			}
			log.Info("Got compressed file ", filepath.Join(dirName, fileName))
			uncompressedFilePath := filepath.Join(utils.GetAppHomeDir(), strings.TrimSuffix(fileName, ".gz"))
			utils.GunzipFile(ei.Path(), uncompressedFilePath)
			monitoringLogFile.CompressedFile = uncompressedFilePath
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
