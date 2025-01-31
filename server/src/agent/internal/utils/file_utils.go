package utils

import (
	//"github.com/rjeczalik/notify"
	log "github.com/Sirupsen/logrus"
	"github.com/golang-collections/collections/stack"
	"github.com/mitchellh/go-homedir"
	"io"
	"bufio"
	"os"
	"fmt"
	"io/ioutil"
	"path/filepath"
//	"time"
	"math"
	"errors"
	"regexp"
	"bytes"
	"compress/gzip"
	"strings"
	"os/exec")

type GetFilesRequest struct{
	Dir string
	Pattern string
}

type GetFilesResponse struct{
	Name string
	LastModified int64
}

func EnsureAppHomeDir(){
	homeDirFromEnv, ok := os.LookupEnv("CLOGS_HOME")
	if ok {
		log.Info("Home directory of user ", homeDirFromEnv)
		return
	}
	homeDir, _ := homedir.Dir()
	log.Info("Home directory of user ", homeDir)
	appDir := filepath.Join(homeDir, ".c-logs")
	os.MkdirAll(appDir, os.ModePerm)
}

func GetAppHomeDir()(string){
	homeDirFromEnv, ok := os.LookupEnv("CLOGS_HOME")
	if ok {
		return homeDirFromEnv
	}
	homeDir, _ := homedir.Dir()
	appDir := filepath.Join(homeDir, ".c-logs")
	return appDir
}

func FileExists(dir string, filename string)(bool){
	info, err := os.Stat(filepath.Join(dir, filename))
    if os.IsNotExist(err) {
        return false
    }
    return !info.IsDir()
}

func FindNextOldFile(dir string, fileName string, filePattern string)(string, error){
	return findNextFile(dir, fileName, filePattern,  "old")
}

func  FindNextNewFile(dir string, fileName string, compressedFile bool, filePattern string)(string, error){
	currentFileName := fileName
	if compressedFile && !strings.HasSuffix(currentFileName, ".gz"){
		currentFileName = currentFileName +  ".gz"
	}
	return findNextFile(dir, currentFileName, filePattern, "new")
}

func findNextFile(dir string, currentFileName string, filePattern string, nextType string)(string, error){
	currentFile, err := os.Stat(filepath.Join(dir, currentFileName))
	if err != nil {
		log.Error("FindNextFile():Error while opening the currentFile - ", currentFileName, err);
		return "", err
	}

	filesCh, err  := ioutil.ReadDir(dir)
	if err != nil{
		log.Error("FindNextFile():Error while listing files in directory", dir, err)
		return "", err
	}
	
	nextFile := currentFile
	foundNextFile:= false
	for _,f := range filesCh {
		log.Debug("Current File: ", currentFileName, " file to compare: ", f.Name())
		if strings.HasSuffix(f.Name(), ".swp") {
			continue
		}
		fileMatch, regexErr := regexp.MatchString(filePattern, f.Name())
		if regexErr != nil  {
			log.Error("findLatestFile():Error while matching the pattern ", filePattern, " with file ", f.Name(), " -- Error:  ", regexErr)
			return "", regexErr
		}
		if fileMatch && f.Name() != currentFile.Name(){
			log.Debug("Next File to compare - ", f.Name(), " Timestamp - ", f.ModTime().UnixNano(), 
				" currentFile Timestamp - ", currentFile.ModTime().UnixNano(), " Current Next File Timestamp - ", nextFile.ModTime().UnixNano())
			if nextType == "new" && f.ModTime().UnixNano() > currentFile.ModTime().UnixNano() && 
				(!foundNextFile  || f.ModTime().UnixNano() <= nextFile.ModTime().UnixNano()){
				nextFile = f
				foundNextFile =  true
			}
			if nextType == "old" && f.ModTime().UnixNano() < currentFile.ModTime().UnixNano() &&
				 (!foundNextFile || f.ModTime().UnixNano() >= nextFile.ModTime().UnixNano()	){
				nextFile = f
				foundNextFile = true
			}
		}else{
			if fileMatch{
				log.Debug("Ignoring current file ", f.Name())
			}else{
				log.Debug("File ", f.Name() , "didn't match with pattern: ", filePattern)
			}
		}
	}
	log.Info("Current File: ", currentFileName, " Next file: ", nextFile.Name())
	if foundNextFile{
		return nextFile.Name(), nil
	}else{
		return "", nil
	}
}

func FindOldestFile(dir string, filePattern string)(string, error){
	return findFile(dir, filePattern, "oldest")
}

func FindLatestFile(dir string, filePattern string)(string, error){
	return findFile(dir, filePattern, "latest")
}

func findFile(dir string, filePattern string, kind string)(string, error){
	if(kind != "oldest" && kind != "latest"){
		return "", errors.New("invalid kind")
	}
	filesCh, err  := ioutil.ReadDir(dir)
	if err != nil{
		log.Error("findFile():Error while listing files in directory", dir, err)
		return "", err
	}
	
	var file string
	var fileModTime int64
	if kind == "oldest"{
		fileModTime = math.MaxInt64;
	}
	for _, f := range filesCh {
		fileMatch, regexErr := regexp.MatchString(filePattern, f.Name())
		if regexErr != nil  {
			log.Error("findFile():Error while matching the pattern ", filePattern, " with file ", f.Name(), " -- Error:  ", regexErr)
			return "", regexErr
		}
		if  fileMatch {
			if ((kind == "latest" && f.ModTime().UnixNano() > fileModTime) || (kind == "oldest" && f.ModTime().UnixNano() < fileModTime)) {
				file = f.Name();
				fileModTime = f.ModTime().UnixNano()
			}
		}
	}
	log.Info("File found in directory ", dir, " is ", file)
	return file, nil
}

func GunzipFile(gzFilePath, dstFilePath string) (int64, error) {
	/* - commenting this block as it seems to be not required
	gzFileCh := make(chan notify.EventInfo, 10)
	if err := notify.Watch(gzFilePath, gzFileCh, notify.InModify); err != nil {
		log.Info("Error while watching for modify event for gz file ", gzFilePath)
	}else{
		log.Info("Watching  file: ", gzFilePath);
	}

	var timeout bool
	for !timeout{
		select{
		case <- gzFileCh:
			log.Info("File ", gzFilePath, " is being modified")
		case <- time.After(2 * time.Second):
			timeout = true
			log.Info("Gzip file creation complete")
		}
	}
	*/
	log.Info("Uncompress file ", gzFilePath, " to ", dstFilePath);
    gzFile, err := os.Open(gzFilePath)
    if err != nil {
        return 0, fmt.Errorf("Failed to open file %s for unpack: %s", gzFilePath, err)
    }
    dstFile, err := os.OpenFile(dstFilePath, os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0660)
    if err != nil {
        return 0, fmt.Errorf("Failed to create destination file %s for unpack: %s", dstFilePath, err)
    }

    ioReader, ioWriter := io.Pipe()

    go func() { // goroutine leak is possible here
		gzReader, err := gzip.NewReader(gzFile)
		if err != nil {
			log.Error("Failed to create a reader for gzFile", gzFile, err)
		}
        // it is important to close the writer or reading from the other end of the
        // pipe or io.copy() will never finish
        defer func(){
            gzFile.Close()
            gzReader.Close()
            ioWriter.Close()
        }()

        io.Copy(ioWriter, gzReader)
    }()

    written, err := io.Copy(dstFile, ioReader)
    if err != nil {
        return 0, err // goroutine leak is possible here
    }
    ioReader.Close()
    dstFile.Close()

    return written, nil
}

func FileSize(dir string, fileName string)(int64){
	file, err := os.Stat(filepath.Join(dir, fileName));
	if err != nil {
		log.Error("FileSize():Error while reading the size of the file ", err)
		return 0
	}
	// get the size
	return file.Size()
}

func AbsFileSize(absfilepath string)(int64){
	file, err := os.Stat(absfilepath);
	if err != nil {
		log.Error("AbsFileSize():Error while reading the size of the file ", err)
		return 0
	}
	// get the size
	return file.Size()
}

func PrepareFile(dir string, fileName string)(string){
	absFilepath := filepath.Join(dir, fileName)
	if strings.HasSuffix(fileName, ".gz"){
		uncompressedFilePath := filepath.Join(GetAppHomeDir(), strings.TrimSuffix(fileName, ".gz"))
		GunzipFile(filepath.Join(dir, fileName), uncompressedFilePath)
		absFilepath = uncompressedFilePath
	}
	return absFilepath
}


func GetFileContents(dir string, fileName string)(chan []string, error){
	absFilepath := filepath.Join(dir, fileName)
	var fileSize int64
	if strings.HasSuffix(fileName, ".gz"){
		uncompressedFilePath := filepath.Join(GetAppHomeDir(), strings.TrimSuffix(fileName, ".gz"))
		GunzipFile(filepath.Join(dir, fileName), uncompressedFilePath)
		absFilepath = uncompressedFilePath
		fileSize = FileSize(GetAppHomeDir(), strings.TrimSuffix(fileName, ".gz"))
	}else{
		fileSize = FileSize(dir, fileName);
	}
	log.Info("GetFileContents for " , absFilepath)
	file,err := os.Open(absFilepath)
	
	if(err != nil){
		log.Error("Error while opening the log file - ", absFilepath)
		return nil, err
	}

	
	var bytesRead int64
	linesReadCh := make(chan []string, 1000)
	reader := bufio.NewReader(file)

	go func(){
		defer file.Close()
		for bytesRead < fileSize {
			bytes,err := reader.ReadBytes('\n');
			if(err !=  nil){
				log.Error("Error ", err, " while reading the file : ", absFilepath)
				break
			}
			bytesRead = bytesRead +  int64(len(bytes));
			linesReadCh <- []string{fileName,  string(bytes)}
			log.Info("Line: " + string(bytes))
		}
		log.Info("Total bytes read ", bytesRead)
		close(linesReadCh)
	}()
	
	return linesReadCh, nil

}

func GetMatchingFiles(dir string, filePattern string, fullpath bool)([]GetFilesResponse, error){
	var matchingFiles []GetFilesResponse
	filesCh, err  := ioutil.ReadDir(dir)
	if err != nil{
		log.Error("getMatchingFiles():Error while listing files in directory", dir, err)
		return matchingFiles, err
	}
	//loc, _ := time.LoadLocation("Asia/Kolkata")

	for _, f := range filesCh {
		if strings.HasSuffix(f.Name(), ".swp") {
			continue
		}

		matchingFile := f.Name()
		if fullpath {
			matchingFile = filepath.Join(dir, f.Name())
		}
		if filePattern == "" {
			matchingFiles = append(matchingFiles, GetFilesResponse{matchingFile, f.ModTime().UnixNano()})
			continue
		}

		fileMatch, regexErr := regexp.MatchString(filePattern, f.Name())
		if regexErr != nil  {
			log.Error("getMatchingFiles():Error while matching the pattern ", filePattern, " with file ", f.Name(), " -- Error:  ", regexErr)
			return matchingFiles, regexErr
		}
		if  fileMatch {
			matchingFiles = append(matchingFiles, GetFilesResponse{matchingFile, f.ModTime().UnixNano()})
		}else {
			log.Info("Ignoring file ", f.Name(), " as the name didn't match with pattern ", filePattern)
		}
	}
	log.Info("matching Files in ", dir, " are ", matchingFiles)
	return matchingFiles, nil
}

func SearchLogs(directory string, filePattern string, searchQuery SearchQuery)([]SearchResult, error){
	
	var filesToSearch []string
	if len(searchQuery.Files) > 0 {
		for _,eachFile := range searchQuery.Files {
			filesToSearch = append(filesToSearch, filepath.Join(directory, eachFile))
		}
	}else{
		matchingFiles, _ := GetMatchingFiles(directory, filePattern, true)
		for _,eachFile := range matchingFiles {
			filesToSearch = append(filesToSearch, eachFile.Name)
		}
	}
	log.Info("Files to search in ", filesToSearch)

	var args []string
	if(searchQuery.Type == ".*"){
		args = []string{"-Hni", "--max-count=50", searchQuery.SearchString}
	}else{
		args = []string{"-HFni", "--max-count=50", searchQuery.SearchString}
	}
	
	args = append(args, filesToSearch...)
	cmd := exec.Command("zgrep", args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	err := cmd.Run()
	output := out.String();
	errOutput := stderr.String()

	log.Debug("SearchLogs Output: " + output );
	log.Info("SearchLogs errOutput: " + errOutput );
	log.Info("SearchLogs err: " + fmt.Sprint(err) );

	if len(errOutput) > 0 && err != nil {
		log.Error("SearchLogs : " + fmt.Sprint(err) + ": " + stderr.String())
		return nil, errors.New(fmt.Sprint(err) + ": " + stderr.String())
	}
	return ParseResults(output), nil
}

type BackwardsFilePointer struct {
	FileName string
	Offset int64
	Lines int
}

func FindOffset(dir string, fileName string, lineNumber int)(int64, error){
	absFilepath := PrepareFile(dir, fileName)
	var offset int64

	log.Info("Finding the offset  of line ", lineNumber , " for file ", absFilepath)
	

	
	if(lineNumber  < 0){
		fileSize := AbsFileSize(absFilepath);
		startOffset := int64(0)
		if(fileSize > 1000){
			startOffset = fileSize - int64(1000);
		}
		endOffset  := fileSize;
		for startOffset >=  0 {
			file,err := os.Open(absFilepath)
			if err != nil {
				log.Info("Got error while opening the file ", absFilepath, err)
				return offset, err
			}
			log.Info("Iteration with startOffset: ", startOffset)
			reader := bufio.NewReader(file)
			if(startOffset >  0){
				discarded, err  := reader.Discard(int(startOffset))
				if err != nil{
					log.Error("Could not seek into the file  ", absFilepath, " Bytes Discarded: ", discarded, "  Error:  " ,  err)
					file.Close()
					return 0,err
				}
			}
			//ignore the first line, as it may not be a full line
			bytes,err  := reader.ReadBytes('\n')
			if err != nil{
				log.Error("Error while finding the offset  in file: ", absFilepath, err)
				file.Close()
				return 0,err
			}
		
			startOffset = startOffset  + int64(len(bytes)) + 1
			nextLineOffset := startOffset;
			var pointers []int64

			for nextLineOffset < endOffset {
				pointers = append(pointers, nextLineOffset)
				bytes,err  := reader.ReadBytes('\n')
				if bytes !=  nil && len(bytes) > 0 {
					nextLineOffset  = nextLineOffset + int64(len(bytes))
				}
				if err  == io.EOF{
					break;
				}
				if err != nil{
					log.Error("--Error while finding the offset  in file: ", absFilepath, err)
					file.Close()
					return 0,err
				}
			}
			if len(pointers) >= lineNumber * -1 {
				resultOffset  :=  pointers[len(pointers) - (lineNumber  * -1)]
				log.Info("Found  Offset ",  resultOffset,  " for  lineNumber ",  lineNumber)
				file.Close()
				return resultOffset-1, nil
			}else{
				lineNumber = lineNumber + len(pointers)
				endOffset = startOffset - 1
				if(startOffset > 1000){
					startOffset =  startOffset  -  1000
				}else{
					startOffset = 0
				}
			}
			file.Close()
		}
		return -1,errors.New("could not offset for the give line");
	}
	file,err := os.Open(absFilepath)
	defer file.Close()
	if err != nil {
		log.Info("Got error while opening the file ", absFilepath, err)
		return offset, err
	}
	reader := bufio.NewReader(file)
	skippedLines := 0
	for skippedLines < lineNumber - 1 {
		bytes,err := reader.ReadBytes('\n');
		if err != nil{
			log.Error("Error while finding the offset of line ", lineNumber, " in file: ", absFilepath, err);
			break
		}
		offset = offset +  int64(len(bytes));
		log.Info("Number of bytes Read: " , len(bytes));
		skippedLines++
	}
	log.Info("Number of lines skipped for reset ", skippedLines, " and offset ", offset)
	return offset+1, nil
}

func PopulateBackPointers(dir string, filename string, offset int64, linesBetweenPointers int)(*stack.Stack, error) {
	log.Info("Entered populating back pointers for Dir:", dir, " File:", filename, " till Offset:", offset, " with linesBetweenPointer ", linesBetweenPointers)
	backwardsPointers := stack.New()
	absFilepath := PrepareFile(dir, filename)
	file,err := os.Open(absFilepath)
	defer file.Close()
	if err != nil {
		log.Error("Got error while opening the file for populating back pointers ", absFilepath, err)
		//TODO on Fail what?
		return backwardsPointers, errors.New("error while opening file")
	}
	reader := bufio.NewReader(file)

	startOffset := int64(0)
	lastOffset := offset
	pointerOffset :=  startOffset
	linesRead := 0;

	for pointerOffset < lastOffset-1 {
		lineBytes, err := reader.ReadBytes('\n')
		if err != nil{
			log.Error("Error while populating back pointers for file: ", absFilepath, err);
			break
		}
		linesRead++
		pointerOffset  += int64(len(lineBytes))
		if(linesRead == linesBetweenPointers){
			backwardsPointers.Push(BackwardsFilePointer{filename, startOffset,  linesRead})
			startOffset = pointerOffset 
			linesRead = 0
		}
	}
	if(linesRead  > 0){
		backwardsPointers.Push(BackwardsFilePointer{filename, startOffset,  linesRead})
	}

	return backwardsPointers, nil
}