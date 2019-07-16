package utils

import (
	"github.com/rjeczalik/notify"
	log "github.com/Sirupsen/logrus"
	"github.com/mitchellh/go-homedir"
	"io"
	"os"
	"fmt"
	"io/ioutil"
	"path/filepath"
	"time"
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
	appDir := filepath.Join(homeDir, ".v-logs")
	os.MkdirAll(appDir, os.ModePerm)
}

func GetAppHomeDir()(string){
	homeDir, _ := homedir.Dir()
	appDir := filepath.Join(homeDir, ".v-logs")
	return appDir
}

func FileExists(dir string, filename string)(bool){
	info, err := os.Stat(filepath.Join(dir, filename))
    if os.IsNotExist(err) {
        return false
    }
    return !info.IsDir()
}

func FindNextFile(dir string, currentFile string, filePattern string)(string, error){
	file, err := os.Stat(filepath.Join(dir, currentFile))
	if err != nil {
		log.Error("Error while opening the currentFile - ", currentFile, err);
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
		if fileMatch {
			log.Info("Next File to compare - ", f.Name(), " Timestamp - ", f.ModTime().Unix(), 
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

func FindLatestFile(dir string, filePattern string)(string, error){
	filesCh, err  := ioutil.ReadDir(dir)
	if err != nil{
		log.Error("findLatestFile():Error while listing files in directory", dir, err)
		return "", err
	}
	
	var latestFile string
	var latestFileModTime int64
	for _, f := range filesCh {
		fileMatch, regexErr := regexp.MatchString(filePattern, f.Name())
		if regexErr != nil  {
			log.Error("findLatestFile():Error while matching the pattern ", filePattern, " with file ", f.Name(), " -- Error:  ", regexErr)
			return "", regexErr
		}
		if  fileMatch {
			if f.ModTime().Unix() > latestFileModTime{
				latestFile = f.Name();
				latestFileModTime = f.ModTime().Unix()
			}
		}
	}
	log.Info("Latest file in directory ", dir, " is ", latestFile)
	return latestFile, nil
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
    dstFile, err := os.OpenFile(dstFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0660)
    if err != nil {
        return 0, fmt.Errorf("Failed to create destination file %s for unpack: %s", dstFilePath, err)
    }

    ioReader, ioWriter := io.Pipe()

    go func() { // goroutine leak is possible here
		gzReader, err := gzip.NewReader(gzFile)
		if err != nil {
			log.Info("Failed to create a reader for gzFile", gzFile, err)
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

func SearchLogs(directory string, filePattern string, searchString string)([]SearchResult){
	matchingFiles, _ := GetMatchingFiles(directory, filePattern, true)
	
	var filesToSearch []string
	for _,eachFile := range matchingFiles {
		filesToSearch = append(filesToSearch, eachFile.Name)
	}

	args := []string{"-n", searchString,}
	args = append(args, filesToSearch...)
	cmd := exec.Command("grep", args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		log.Fatal("Error while searching ", err)
	}
	fmt.Printf("Output Returned: %q\n", out.String())
	return ParseResults(out.String())
}