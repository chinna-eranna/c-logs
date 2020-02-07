package utils

import (
	"encoding/json"
	log "github.com/Sirupsen/logrus"
	"io/ioutil"
	"path/filepath"
	"strings"
	"errors"
)

type LogSet struct{
	Id int
	Name string
	LogFilePattern string
	Directory string
	LogTimestampPattern string
}

func GetAll()([]LogSet){
	appHomeDir := GetAppHomeDir()
	log.Info("AppHomeDirectory:", appHomeDir);
	
	logDirRepoContent, err := ioutil.ReadFile(filepath.Join(appHomeDir, "clogs.conf"))
	if err != nil{
		log.Error("Error while opening the log_dir_repo file ", err)
	}
	log.Info("Got the log dir repo content: ", string(logDirRepoContent))
	
	var logSetArr []LogSet
	err = json.Unmarshal(logDirRepoContent, &logSetArr)
	if err != nil {
		log.Error("Error while reading the logset repo content")
	}
	log.Info("LogSets configured: ", logSetArr)
	return logSetArr
}

func GetLogSet(id int)(LogSet){
	logSetArr := GetAll()
	index := findLogSetIndex(id, logSetArr)
	if index  >= 0 {
		return logSetArr[index]
	}else{
		return LogSet{}
	}
}

func findLogSetIndex(id int, logSetArr []LogSet)(int){
	for i, logSet  := range logSetArr {
		if logSet.Id == id{
			return i
		}
	}
	return -1
}

func SaveLogSet(logSet LogSet) (int, error){
	logSetArr := GetAll()
	validateErr := validatelogSetArr(logSetArr, logSet)
	if validateErr != nil {
		return -1, validateErr
	}
	if(logSet.Id > 0){
		logSetIndex := findLogSetIndex(logSet.Id, logSetArr);
		if(logSetArr[logSetIndex].Id  !=  logSet.Id){
			log.Error("Didn't find LogSet for update. Id: " , logSet.Id);
		}
		logSetArr[logSetIndex].Name = logSet.Name
		logSetArr[logSetIndex].Directory = logSet.Directory
		logSetArr[logSetIndex].LogFilePattern = logSet.LogFilePattern
	}else{
		logSet.Id = getNextId(logSetArr)
		logSetArr = append(logSetArr, logSet)
	}
	log.Info("LogSets after save: ", logSetArr)

	err := saveLogDirRepository(logSetArr)
	if err != nil {
		return -1, err
	} 
	return logSet.Id, nil
}


func DeleteLogSet(id int)(error){
	logSetArr := GetAll()

	var updatedLogDirectories []LogSet
	var removed bool
	for _, logSet := range logSetArr{
		if logSet.Id == id{
			log.Info("Removed the log directory with id ", id)
			removed = true
		} else {
			updatedLogDirectories = append(updatedLogDirectories, logSet)
		}
	}
	if !removed {
		log.Info("No logset found with id ", id);
		return errors.New("Logset not found")
	}
	return saveLogDirRepository(updatedLogDirectories)
}
//TODO This api's execute with an assumption that single user will use this agent on a box.
func getNextId(logSetArr []LogSet)(int){
	nextId := 0;
	for _,logSet := range logSetArr {
		if logSet.Id > nextId {
			nextId = logSet.Id
		}
	}
	return nextId + 1;
}
func saveLogDirRepository(logSetArr []LogSet)(error){
	logSetRepoContent, err := json.MarshalIndent(logSetArr, " ", " ")
	if err != nil {
		log.Error("Could not marshal the logset repo to json ", err)
		return err
	}
	appHomeDir := GetAppHomeDir()
	err = ioutil.WriteFile(filepath.Join(appHomeDir, "clogs.conf"), logSetRepoContent, 0644)
	if err != nil {
		log.Error("Unable to write the log directory repo content", err)
		return err
	}
	log.Info("Successfully saved the log directory repo ")
	return nil
}

func validatelogSetArr(logSetArr []LogSet, newLogSet LogSet)(error){
	/*
	newLogFilePattern := newLogSet.LogFilePattern;
	if len(strings.Split(newLogFilePattern, "*")) < 1 {
		log.Error("Invalid log file pattern, Max one * is allowed - ", newLogSet.Name)
		return errors.New("Invalid log file pattern, Max one * is allowed")
	}
	*/
	for _,logSet := range logSetArr {
		if(newLogSet.Id == logSet.Id){
			continue
		}
		if strings.EqualFold(logSet.Name, newLogSet.Name) {
			log.Error("Duplicate name error - ", newLogSet.Name)
			return errors.New("Duplicate name")
		}

		if(strings.EqualFold(logSet.Directory, newLogSet.Directory) &&
			strings.EqualFold(logSet.LogFilePattern, newLogSet.LogFilePattern)){
				log.Error("Duplicate dir/logfile error - ", newLogSet.Name)
				return errors.New("Duplicate dir/logfile")
			}
	}
	return nil
}