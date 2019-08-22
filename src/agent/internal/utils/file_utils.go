package utils

import (
	"github.com/rjeczalik/notify"
	log "github.com/Sirupsen/logrus"
	"github.com/mitchellh/go-homedir"
	"io"
	"bufio"
	"os"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"time"
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
	homeDir, _ := homedir.Dir()
	log.Info("Home directory of user ", homeDir)
	appDir := filepath.Join(homeDir, ".c-logs")
	os.MkdirAll(appDir, os.ModePerm)
}

func GetAppHomeDir()(string){
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

func FindNextFile(dir string, fileName string, compressedFile bool, filePattern string)(string, error){
	currentFile := fileName
	if compressedFile && !strings.HasSuffix(currentFile, ".gz"){
		currentFile = currentFile +  ".gz"
	}
	file, err := os.Stat(filepath.Join(dir, currentFile))
	if err != nil {
		log.Error("FindNextFile():Error while opening the currentFile - ", currentFile, err);
		return "", err
	}

	filesCh, err  := ioutil.ReadDir(dir)
	if err != nil{
		log.Error("FindNextFile():Error while listing files in directory", dir, err)
		return "", err
	}
	
	nextFile := file
	foundNextFile:= false
	for _,f := range filesCh {
		if strings.HasSuffix(f.Name(), ".swp") {
			continue
		}
		fileMatch, regexErr := regexp.MatchString(filePattern, f.Name())
		if regexErr != nil  {
			log.Error("findLatestFile():Error while matching the pattern ", filePattern, " with file ", f.Name(), " -- Error:  ", regexErr)
			return "", regexErr
		}
		if fileMatch && f.Name() != file.Name(){
			log.Debug("Next File to compare - ", f.Name(), " Timestamp - ", f.ModTime().Unix(), 
				" currentFile Timestamp - ", file.ModTime().Unix(), " Current Next File Timestamp - ", nextFile.ModTime().Unix())
			if f.ModTime().Unix() > file.ModTime().Unix() && (!foundNextFile  || f.ModTime().Unix() <= nextFile.ModTime().Unix()){
				nextFile = f
				foundNextFile =  true
			}
		}
	}
	log.Info("Current File: ", currentFile, " Next file: ", nextFile.Name())
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
			if ((kind == "latest" && f.ModTime().Unix() > fileModTime) || (kind == "oldest" && f.ModTime().Unix() < fileModTime)) {
				file = f.Name();
				fileModTime = f.ModTime().Unix()
			}
		}
	}
	log.Info("File found in directory ", dir, " is ", file)
	return file, nil
}

func GunzipFile(gzFilePath, dstFilePath string) (int64, error) {
	
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

	log.Info("Uncompress file ", gzFilePath, " to ", dstFilePath);
    gzFile, err := os.Open(gzFilePath)
    if err != nil {
        return 0, fmt.Errorf("Failed to open file %s for unpack: %s", gzFilePath, err)
    }
    dstFile, err := os.OpenFile(dstFilePath, os.O_CREATE|os.O_WRONLY, 0660)
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
		log.Error("Error while reading the size of the file ", err)
		return 0
	}
	// get the size
	return file.Size()
}



func GetFileContents(dir string, fileName string)(chan string, error){
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
	linesReadCh := make(chan string, 1000)
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
			linesReadCh <- string(bytes)
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
			matchingFiles = append(matchingFiles, GetFilesResponse{matchingFile, f.ModTime().Unix()})
			continue
		}

		fileMatch, regexErr := regexp.MatchString(filePattern, f.Name())
		if regexErr != nil  {
			log.Error("getMatchingFiles():Error while matching the pattern ", filePattern, " with file ", f.Name(), " -- Error:  ", regexErr)
			return matchingFiles, regexErr
		}
		if  fileMatch {
			matchingFiles = append(matchingFiles, GetFilesResponse{matchingFile, f.ModTime().Unix()})
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
		args = []string{"-Hn", "--max-count=50", searchQuery.SearchString}
	}else{
		args = []string{"-HFn", "--max-count=50", searchQuery.SearchString}
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

	log.Info("SearchLogs Output: " + output );
	log.Info("SearchLogs errOutput: " + errOutput );
	log.Info("SearchLogs err: " + fmt.Sprint(err) );

	if len(errOutput) > 0 && err != nil {
		log.Error("SearchLogs : " + fmt.Sprint(err) + ": " + stderr.String())
		return nil, errors.New(fmt.Sprint(err) + ": " + stderr.String())
	}
	return ParseResults(output), nil
}