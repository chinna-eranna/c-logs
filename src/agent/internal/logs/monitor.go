package logs

import (
	"agent/internal/utils")

import (
	"github.com/rjeczalik/notify"
	log "github.com/Sirupsen/logrus"
	"github.com/mitchellh/go-homedir"
	"io/ioutil"
	"golang.org/x/sys/unix"
	"strings"
	"path/filepath"
	"os"
	"bufio"
	"io"
	"time")

type MonitoringLogFile struct{
	Directory string
	FileName string
	Lines chan string
	Offset int

	CompressedFile string

	LinesConsumed chan int64
	LinesProduced int64
}
var Files map[string]*MonitoringLogFile

func Init(){
	Files = make(map[string]*MonitoringLogFile)
	_,err := MonitorLogPath("/test/file")
	if(err != nil){
		log.Fatal("Could not monitor logpath")
	}
}

func MonitorLogPath(logPath  string)(MonitoringLogFile, error){
	log.Info("Starting monitoring log path ", logPath)
	dir,monFilePrefix := filepath.Split(logPath)
	latestFile,err := findLatestFile(dir, monFilePrefix)
	if(err != nil){
		return MonitoringLogFile{}, err
	}

	quitCh := make chan(chan string 1)
	linesReadCh := make(chan string, 1000)
	linesConsumeTracker := make(chan int64, 1000)
	MonitoringLogFile := MonitoringLogFile{dir, latestFile, linesReadCh, 0, "", linesConsumeTracker, 0}
	Files["test"] = &MonitoringLogFile
	
	go MonitoringLogFile.readLogFile(quitCh)
	go MonitoringLogFile.monitorDir(quitCh)
	log.Info("Started monitoring log path ", logPath);

	return MonitoringLogFile, nil	
}

func (MonitoringLogFile *MonitoringLogFile) readLogFile(quitCh){
	absFilepath := filepath.Join(MonitoringLogFile.Directory, MonitoringLogFile.FileName)
	log.Info("Start reading and buffering log file ", absFilepath)
	
	file,err := os.Open(absFilepath)
	defer file.Close()
	if err != nil {
		log.Info("Got error while opening the file ", absFilepath, err)
		quitCh <- "quit"
		return
	}

	reader := bufio.NewReader(file)
	var linesConsumed int64
	compressedFileBeingRead := false
	for{
		if !compressedFileBeingRead && len(MonitoringLogFile.CompressedFile) > 0 {
			log.Info("Opening Compressed file now")
			compressedFileBeingRead = true;
			file,err := os.Open(MonitoringLogFile.CompressedFile)
			defer file.Close()
			if err != nil {
				log.Info("Got error while opening the compressed file ", absFilepath, err)
				quitCh <- "quit"
				return
			}
			reader := bufio.NewReader(file)
			log.Info("Discarding ", MonitoringLogFile.Offset, " bytes from compressed file")
			discarded,err  := reader.Discard(MonitoringLogFile.Offset)
			if err != nil{
				log.Info("Could not seek into the compressed file ", MonitoringLogFile.CompressedFile)
				quitCh <- "quit"
				return
			}
			log.Info("Succeessfully discarded bytes ", discarded, " from ", MonitoringLogFile.CompressedFile)
		}

		bytes,err := reader.ReadBytes('\n');
		if bytes != nil && len(bytes) > 0{
			MonitoringLogFile.Lines <- string(bytes)
			MonitoringLogFile.Offset += len(bytes)
			MonitoringLogFile.LinesProduced += 1
		}
		if err != nil{
			log.Info("Error: ", err);
			if err == io.EOF{
				time.Sleep(2000 * time.Millisecond)
			}else{
				break
			}
		}
		
		for MonitoringLogFile.LinesProduced > 50{
			log.Info("Lines Produced Before consuming ", MonitoringLogFile.LinesProduced)
			log.Info("Offset ", MonitoringLogFile.Offset)
			linesConsumed = <- MonitoringLogFile.LinesConsumed
			MonitoringLogFile.LinesProduced -= linesConsumed
			log.Info("Lines Produced After consuming ", MonitoringLogFile.LinesProduced)
			<- time.After(10 * time.Second)
		}
	}
}

func (MonitoringLogFile *MonitoringLogFile) GetLogs() []string{
	var linesCount int64
	var linesRead []string
	var timeout bool
	for linesCount < 50 && !timeout{
		select{
		case nextLine := <- MonitoringLogFile.Lines:
			linesRead = append(linesRead, nextLine)
			linesCount++
		case <- time.After(1 * time.Second):
			timeout = true
			log.Info("Timeout in getlogs")
			break
		}
	}
	log.Info("Consumed ", linesCount, " lines")
	MonitoringLogFile.LinesConsumed <- linesCount
	return linesRead
}

func (MonitoringLogFile *MonitoringLogFile) monitorDir(quitCh chan){
	moves := make(map[uint32]struct{
		From string
		To string
	})
	dirMonitorCh := make(chan notify.EventInfo, 10)
	if err := notify.Watch(MonitoringLogFile.Directory, dirMonitorCh, notify.Create, notify.Remove, notify.InMovedFrom, notify.InMovedTo); err != nil {
		log.Info("Error while watching for create/remove/rename event for directory ", MonitoringLogFile.Directory)
	}else{
		log.Info("Watching  directory: ", MonitoringLogFile.Directory);
	}
	log.Info("Starting the monitoring for", MonitoringLogFile.Directory)
	for{
		var ei EventInfo
		select {
		case <- quitCh:
			log.Warn("Routine asked to quit");
			return
		case ei = <- dirMonitorCh:
		}

		switch ei.Event(){
		case notify.Create:
			log.Info("Created: ", ei.Path())
			dirName,fileName := filepath.Split(ei.Path())
			if strings.HasSuffix(fileName, ".gz") {
				if  len(MonitoringLogFile.CompressedFile) > 0 {
					continue;
				}
				log.Info("Got compressed file ", filepath.Join(dirName, fileName))
				homeDir, _ := homedir.Dir()
				log.Info("Home directory of user ", homeDir)
				appDir := filepath.Join(homeDir, ".v-logs")
				os.MkdirAll(appDir, os.ModePerm)
				uncompressedFilePath := filepath.Join(appDir, strings.TrimSuffix(fileName, ".gz"))
				utils.GunzipFile(ei.Path(), uncompressedFilePath)
				MonitoringLogFile.CompressedFile = uncompressedFilePath
				log.Info("MonitoringLogFile struct compressed file path ", MonitoringLogFile.CompressedFile,  " offset: ", MonitoringLogFile.Offset)
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
}


func findLatestFile(dir string, filePrefix string)(string, error){
	filesCh, err  := ioutil.ReadDir(dir)
	if err != nil{
		log.Info("findLatestFile():Error while listing files in directory", dir, err)
		return "", err
	}
	
	var latestFile string
	var latestFileModTime int64
	for _, f := range filesCh {
		if strings.Index(f.Name(), filePrefix) == 0 {
			if f.ModTime().Unix() > latestFileModTime{
				latestFile = f.Name();
				latestFileModTime = f.ModTime().Unix()
			}
		}
	}
	log.Info("Latest file in directory ", dir, " is ", latestFile)
	return latestFile, nil
}
