package logs

import (
	//"github.com/fsnotify/fsnotify"
	//"github.com/golang-collections/collections/stack"
	log "github.com/Sirupsen/logrus"
	//"strings"
	//"os"
	"io"
	"time"
	"agent/internal/utils"
)

type LogsReader struct{
	FileName string
	Offset int64
	
	Lines chan []string
	LinesConsumed chan int64
	LinesProduced int64
	
	quit bool
	quitRequestCh chan string
	quitResponseCh chan string

	CompressedFile bool
	nextFile bool
}

func (logsReader *LogsReader) getLogs(fwdOrBwdType string) [][]string{
	var linesCount int64
	var linesRead [][]string
	var timeout bool
	for linesCount < 50 && !timeout{
		select{
		case nextLine := <- logsReader.Lines:
			//log.Debug("Line being consumed ", nextLine)
			linesRead = append(linesRead, nextLine)
			linesCount++
		case <- time.After(1 * time.Second):
			timeout = true
			break
		}
	}
	log.Info("Consumed  ", fwdOrBwdType, linesCount, " lines")
	logsReader.LinesConsumed <- linesCount
	return linesRead
}

func (logsReader *LogsReader) addLine(fileName string, bytes []byte, linesCh chan []string){
	if len(bytes) > 0{
		linesCh <- []string{fileName, string(bytes)}
		logsReader.Offset += int64(len(bytes))
		logsReader.LinesProduced += 1
	}
}

func (logsReader *LogsReader) waitForConsuming(){
	for logsReader.LinesProduced > 50 && !logsReader.quit{
		log.Info("Lines available for consuming ", logsReader.LinesProduced)
		log.Info("Offset ", logsReader.Offset)

		select {
		case <- logsReader.quitRequestCh:
			logsReader.quit = true
			log.Info("waitForConsuming(): Got Quit Request")
			break
		case linesConsumed := <- logsReader.LinesConsumed:
			logsReader.LinesProduced -= linesConsumed
			break
		}
		
		log.Info("Lines available After consuming ", logsReader.LinesProduced)
	}
}

// handle Error while reading forwards - 
// 		a) pick next file or 
//		b) same file is compressed, should start with compressed file
func (logsReader *LogsReader) handleReadForwardEror(err error, directory string, filePattern string)(bool){
	log.Info("hanldeReadForwardEror entered")
	findNextFile := false
	if err == io.EOF{
		findNextFile = true
	}else {
		//non EOF file error while reading, while for 3 seconds
		//if compressed file found continue
		waitTime := 0
		for !logsReader.CompressedFile && waitTime < 3000 && !logsReader.quit{
			logsReader.quitOrSleep(1000  * time.Millisecond); 
			waitTime = waitTime + 1000
		}
		if logsReader.CompressedFile {
			//current file compressed, switch to compressed file read OR  request to quit
			log.Info("Found Compressed file: ",logsReader.CompressedFile)
			return true
		}else{
			log.Error("Timeout waiting for compressed file, find the next available file for forward reading")
			findNextFile  = true
		}
	}
	
	if findNextFile {
		nextFile, err := utils.FindNextNewFile(directory,
			logsReader.FileName, logsReader.CompressedFile, filePattern)
		if err != nil {
			//error while fetching next file, wait for 2 seconds, then continue reading the same file
			log.Error("Got error while fetching next file ", err)
			time.Sleep(2000 * time.Millisecond)
			return false 
		}
		if nextFile != ""{
			//found next file to read,stop reading current
			logsReader.CompressedFile = false
			logsReader.FileName = nextFile
			logsReader.nextFile = true
			return true 
		}else{
			//no new file found, Quit OR Wait for 2 seconds, then continue reading the same file
			logsReader.quitOrSleep(2000  * time.Millisecond)
			return false
		}
	}
	return false
}

func (logsReader *LogsReader) quitOrSleep(sleepTime time.Duration){
	select{
	case  <- logsReader.quitRequestCh:
		logsReader.quit = true
		log.Info("quitOrSleep(): Got Quit Request")
		break
	case <- time.After(sleepTime):
		break
	}
}