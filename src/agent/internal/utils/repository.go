package utils

import (
	"encoding/json"
	log "github.com/Sirupsen/logrus"
	"io/ioutil"
	"path/filepath"
	"strings"
	"errors"
)

type LogDirectory struct{
	Id int
	Name string
	LogFilePattern string
	Directory string
	LogTimestampPattern string
}

func GetAll()([]LogDirectory){
	appHomeDir := GetAppHomeDir()
	log.Info("AppHomeDirectory:", appHomeDir);
	
	logDirRepoContent, err := ioutil.ReadFile(filepath.Join(appHomeDir, "log_dir_repo.txt"))
	if err != nil{
		log.Error("Error while opening the log_dir_repo file ", err)
	}
	log.Info("Got the log dir repo content: ", string(logDirRepoContent))
	
	var logDirectories []LogDirectory
	err = json.Unmarshal(logDirRepoContent, &logDirectories)
	if err != nil {
		log.Error("Error while reading the log directory repo content")
	}
	log.Info("Log Directories configured: ", logDirectories)
	return logDirectories
}

func GetLogDirectory(id int)(LogDirectory){
	logDirectories := GetAll()
	for _, logDirectory  := range logDirectories {
		if logDirectory.Id == id{
			return logDirectory
		}
	}
	return LogDirectory{}
}

func AddLogDirectory(newLogDirectory LogDirectory) (int, error){
	logDirectories := GetAll()
	validateErr := validatelogDirectories(logDirectories, newLogDirectory)
	if validateErr != nil {
		return -1, validateErr
	}
	newLogDirectory.Id = getNextId(logDirectories)
	logDirectories = append(logDirectories, newLogDirectory)
	log.Info("Log Directories after add: ", logDirectories)

	err := saveLogDirRepository(logDirectories)
	if err != nil {
		return -1, err
	} 
	return newLogDirectory.Id, nil
}

func RemoveLogDirectory(id int)(error){
	logDirectories := GetAll()

	var updatedLogDirectories []LogDirectory
	var removed bool
	for _, logDirectory := range logDirectories{
		if logDirectory.Id == id{
			log.Info("Removed the log directory with id ", id)
			removed = true
		} else {
			updatedLogDirectories = append(updatedLogDirectories, logDirectory)
		}
	}
	if !removed {
		log.Info("No log directory found with id ", id);
		return errors.New("Log directory not found")
	}
	return saveLogDirRepository(updatedLogDirectories)
}
//TODO This api's execute with an assumption that single user will use this agent on a box.
func getNextId(logDirectories []LogDirectory)(int){
	nextId := 0;
	for _,logDirectory := range logDirectories {
		if logDirectory.Id > nextId {
			nextId = logDirectory.Id
		}
	}
	return nextId + 1;
}
func saveLogDirRepository(logDirectories []LogDirectory)(error){
	logDirRepoContent, err := json.MarshalIndent(logDirectories, " ", " ")
	if err != nil {
		log.Error("Could not marshal the log directory repo to json ", err)
		return err
	}
	appHomeDir := GetAppHomeDir()
	err = ioutil.WriteFile(filepath.Join(appHomeDir, "log_dir_repo.txt"), logDirRepoContent, 0644)
	if err != nil {
		log.Error("Unable to write the log directory repo content", err)
		return err
	}
	log.Info("Successfully saved the log directory repo ")
	return nil
}

func validatelogDirectories(logDirectories []LogDirectory, newLogDirectory LogDirectory)(error){
	/*
	newLogFilePattern := newLogDirectory.LogFilePattern;
	if len(strings.Split(newLogFilePattern, "*")) < 1 {
		log.Error("Invalid log file pattern, Max one * is allowed - ", newLogDirectory.Name)
		return errors.New("Invalid log file pattern, Max one * is allowed")
	}
	*/
	for _,logDirectory := range logDirectories {
		if strings.EqualFold(logDirectory.Name, newLogDirectory.Name) {
			log.Error("Duplicate name error - ", newLogDirectory.Name)
			return errors.New("Duplicate name")
		}

		if(strings.EqualFold(logDirectory.Directory, newLogDirectory.Directory) &&
			strings.EqualFold(logDirectory.LogFilePattern, newLogDirectory.LogFilePattern)){
				log.Error("Duplicate dir/logfile error - ", newLogDirectory.Name)
				return errors.New("Duplicate dir/logfile")
			}
	}
	return nil
}