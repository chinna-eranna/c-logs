package api

import (
    log "github.com/Sirupsen/logrus"
    "net/http"
	"github.com/gorilla/mux"
	"fmt"
	"os"
	"io/ioutil"
	"encoding/json"
	"strconv"
	"time"
	"path/filepath"
	"agent/internal/logs"
	"agent/internal/utils"
	"github.com/gobuffalo/packr"
)

func Init(box packr.Box) {
	
	appHomeDir := utils.GetAppHomeDir()
	f, err := os.OpenFile(filepath.Join(appHomeDir, "/clogs.log_" + time.Now().Format(time.RFC3339) ), os.O_APPEND | os.O_CREATE | os.O_RDWR, 0666)
    if err != nil {
        fmt.Printf("error opening file: %v", err)
	}
	log.SetFormatter(&log.TextFormatter{
		DisableColors: true,
		FullTimestamp: true,
	})
	log.SetOutput(f)
	log.SetLevel(log.WarnLevel)
	
	
	log.Println("Initializing API router")
	router := mux.NewRouter()
	router.HandleFunc("/", http.FileServer(box).ServeHTTP).Methods("GET")
	router.HandleFunc("/v1/logDirectories/{id}/logs", getLogs).Queries("fullContent", "{fullContent}").Methods("GET")
	router.HandleFunc("/v1/logDirectories", addDirectory).Methods("POST")
	router.HandleFunc("/v1/logDirectories", getAll).Methods("GET")
	router.HandleFunc("/v1/logDirectories/{id}", removeDirectory).Methods("DELETE")
	router.HandleFunc("/v1/logDirectories/{id}/start", startMonitoring).Methods("POST")
	router.HandleFunc("/v1/logDirectories/{id}/search", searchDirectory).Methods("POST")
	router.HandleFunc("/v1/logDirectories/{id}/reset", resetMonitoring).Methods("POST")
	router.HandleFunc("/v1/files/{rest:.*}", getFiles).Queries("pattern", "{pattern}").Methods("GET")
	log.Fatal(http.ListenAndServe(":13999", router))
}

func getLogs(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked GET ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid directory id for GET: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	monitoringFile := logs.Files[id]
	if monitoringFile == nil {
		log.Error("Invalid directory id for GET: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, "Invalid directory for Monitoring start", http.StatusBadRequest)
	}
	fullContent, err := strconv.ParseBool(r.FormValue("fullContent"))
	if err != nil {
		log.Error("Invalid value for query param fullContent -  ", r.FormValue("fullContent"));
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var logMessages []string
	if fullContent {
		fileContentCh, err := utils.GetFileContents(monitoringFile.Directory, monitoringFile.FileName)
		if err != nil {
			log.Error("Error while reading file contents - ", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}else{
			for {
				nextLine, more := <-fileContentCh
				//log.Info("Got content: ", j , " and more: ", more)
				if more {
					logMessages = append(logMessages, nextLine)
				} else {
					break
				}
			}
		}

	}else{
		logMessages = monitoringFile.GetLogs()
	}
	logMessagesJson,err := json.MarshalIndent(logMessages, " ", " ")
	if(err != nil){
		log.Error("Error while fetching logs - ", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}else{
		w.Write(logMessagesJson)
	}
}

func addDirectory(w  http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST /v1/logDirectories API")
	reqBody,err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
	}

	logDirectoryToAdd := utils.LogDirectory{}
	err = json.Unmarshal(reqBody, &logDirectoryToAdd)
	if err != nil {
		log.Error("Invalid Json for addDirectory API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}
	log.Info("Add directory in Request", logDirectoryToAdd)

	id, addErr := utils.AddLogDirectory(logDirectoryToAdd)
	if addErr != nil {
		log.Error("Error while adding a directory - ", addErr)
		http.Error(w, addErr.Error(), http.StatusBadRequest)
	}else {
		fmt.Fprintf(w, strconv.Itoa(id))
	}
}

func getAll(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked GET /v1/logDirectories API")
	logDirectories := utils.GetAll()
	logDirectoriesJson, err := json.MarshalIndent(logDirectories, " ", " ")
	if err != nil {
		log.Error ("Error while marshing the log directories to json ", logDirectories, " Error: ", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(logDirectoriesJson)
}

func removeDirectory(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked DELETE ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid directory id for delete: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err = utils.RemoveLogDirectory(id)
	if err != nil {
		log.Error("Error while deleting the log directory: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func startMonitoring(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid directory id for monitoring: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	reqBody,err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
	}
	startMonitoringRequest := logs.StartMonitoringRequest{}
	err = json.Unmarshal(reqBody, &startMonitoringRequest)
	if err != nil {
		log.Error("Invalid Json for startMonitoring API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}

	logDirectory := utils.GetLogDirectory(id)
	logs.MonitorLogPath(logDirectory, startMonitoringRequest)
}

func searchDirectory(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid directory id for searching: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	reqBody,err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
	}

	searchQuery := utils.SearchQuery{}
	err = json.Unmarshal(reqBody, &searchQuery)
	if err != nil {
		log.Error("Invalid Json for searchDirectory API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}

	logDirectory := utils.GetLogDirectory(id)
	results, err := utils.SearchLogs(logDirectory.Directory, logDirectory.LogFilePattern, searchQuery)
	if(err != nil){
		log.Error("Error while searching for logs - ", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
	}
	jsonResults, err := json.MarshalIndent(results, " ", " ")
	if(err != nil){
		log.Error("Error while parsing results - ", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}else{
		w.Write(jsonResults)
	}
}

func resetMonitoring(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST ", r.URL.Path, "API")

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid directory id for reset: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	reqBody,err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
	}

	resetReq := logs.ResetRequest{}
	err = json.Unmarshal(reqBody, &resetReq)
	if err != nil {
		log.Error("Invalid Json for resetMonitoring API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}
	monitoringFile := logs.Files[id]
	monitoringFile.ResetMonitoring(resetReq);
}

func getFiles(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked GET ", r.URL.Path, " API")
	
	getFilesReq := utils.GetFilesRequest{"/" + mux.Vars(r)["rest"], r.FormValue("pattern")}
	log.Info("GetFilesReq Dir:  ", getFilesReq.Dir + "  Pattern: ", getFilesReq.Pattern)
	
	files,err := utils.GetMatchingFiles(getFilesReq.Dir, getFilesReq.Pattern, false)
	if err != nil {
		log.Error("Error while getting files ", r.URL.Path , " : Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJson(files, w)
}
/*
func getId( r *http.Request){
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid id for request ", r.URL.Path , " : Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return nil,err
	}
	return id,nil
}
*/
func writeJson(response interface{}, w http.ResponseWriter){
	jsonResponse, err := json.MarshalIndent(response, " ", " ")
	if(err != nil){
		log.Error("Error while parsing response - ", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}else{
		w.Write(jsonResponse)
	}
}