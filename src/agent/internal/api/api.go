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
import _ "net/http/pprof"

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
	//log.SetOutput(os.Stdout)
	log.SetLevel(log.InfoLevel)
	
	/*
	log.Info("Starting the server for profiling")
	go func(){
	log.Fatal(http.ListenAndServe(":6061", http.DefaultServeMux))
	}()
	*/
	
	log.Println("Initializing API router")
	router := mux.NewRouter()
	fileServer := http.FileServer(box);
	router.HandleFunc("/", fileServer.ServeHTTP).Methods("GET")
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", fileServer))
	router.HandleFunc("/v1/logset/{id}/logs", getLogs).Queries("fullContent", "{fullContent}").Methods("GET")
	router.HandleFunc("/v1/logset/{id}/logs", getLogs).Queries("bwdLogs", "{bwdLogs}").Methods("GET")
	router.HandleFunc("/v1/logset", addLogSet).Methods("POST")
	router.HandleFunc("/v1/logset", updateLogSet).Methods("PUT")
	router.HandleFunc("/v1/logset", getAll).Methods("GET")
	router.HandleFunc("/v1/logset/{id}", deleteLogSet).Methods("DELETE")
	router.HandleFunc("/v1/logset/{id}/start", startMonitoring).Methods("POST")
	router.HandleFunc("/v1/logset/{id}/stop", stopMonitoring).Methods("POST")
	router.HandleFunc("/v1/logset/{id}/search", searchInLogSet).Methods("POST")
	router.HandleFunc("/v1/logset/{id}/reset", resetMonitoring).Methods("POST")
	router.HandleFunc("/v1/files/{rest:.*}", getFiles).Queries("pattern", "{pattern}").Methods("GET")
	log.Fatal(http.ListenAndServe(":13999", router))
	

}

func getLogs(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked GET ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid Logset id for GET: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	monitoringLogSet := logs.Files[id]
	if monitoringLogSet == nil {
		log.Error("Invalid logset id for GET: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, "Invalid logset for Monitoring start", http.StatusBadRequest)
	}
	fullContent, err := strconv.ParseBool(r.FormValue("fullContent"))
	if err != nil {
		log.Error("Invalid value for query param fullContent -  ", r.FormValue("fullContent"));
		fullContent = false
	}

	bwdLogs, err := strconv.ParseBool(r.FormValue("bwdLogs"))
	if err != nil {
		log.Error("Invalid value for query param bwdLogs -  ", r.FormValue("bwdLogs"));
		bwdLogs = false
	}

	var logMessages [][]string
	if fullContent {
		fileContentCh, err := utils.GetFileContents(monitoringLogSet.Directory, monitoringLogSet.GetFileName())
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

	}else if bwdLogs{
		logMessages = monitoringLogSet.GetBwdLogs()
	}else {
		logMessages = monitoringLogSet.GetFwdLogs()
	}
	logMessagesJson,err := json.MarshalIndent(logMessages, " ", " ")
	if(err != nil){
		log.Error("Error while fetching logs - ", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}else{
		w.Write(logMessagesJson)
	}
}

func addLogSet(w  http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST /v1/logSet API")
	reqBody,err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
	}

	logSetToAdd := utils.LogSet{}
	err = json.Unmarshal(reqBody, &logSetToAdd)
	if err != nil {
		log.Error("Invalid Json for addLogSet API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}
	log.Info("Add directory in Request", logSetToAdd)

	id, addErr := utils.SaveLogSet(logSetToAdd)
	if addErr != nil {
		log.Error("Error while adding a directory - ", addErr)
		http.Error(w, addErr.Error(), http.StatusBadRequest)
	}else {
		fmt.Fprintf(w, strconv.Itoa(id))
	}
}

func updateLogSet(w  http.ResponseWriter, r *http.Request){
	log.Info("Invoked PUT /v1/logset API")
	reqBody,err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Cannot read body", http.StatusBadRequest)
	}

	logSetToUpdate := utils.LogSet{}
	err = json.Unmarshal(reqBody, &logSetToUpdate)
	if err != nil {
		log.Error("Invalid Json for updateLogSet API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}
	log.Info("Update logset in Request", logSetToUpdate)

	id, updateErr := utils.SaveLogSet(logSetToUpdate)
	if updateErr != nil {
		log.Error("Error while updating a logset - ", updateErr)
		http.Error(w, updateErr.Error(), http.StatusBadRequest)
	}else {
		fmt.Fprintf(w, strconv.Itoa(id))
	}
}

func getAll(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked GET /v1/logset API")
	logSets := utils.GetAll()
	logSetsJson, err := json.MarshalIndent(logSets, " ", " ")
	if err != nil {
		log.Error ("Error while marshing the logsets to json ", logSets, " Error: ", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(logSetsJson)
}

func deleteLogSet(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked DELETE ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid logset id for delete: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	err = utils.DeleteLogSet(id)
	if err != nil {
		log.Error("Error while deleting the logset: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func startMonitoring(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid logset id for monitoring: Error -  ", err);
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

	logSet := utils.GetLogSet(id)
	logs.MonitorLogPath(logSet, startMonitoringRequest)
}

func stopMonitoring(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST ", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid logset id for stop monitoring: Error -  ", err);
		//TODO  separate error types for user errors vs application  errors.
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	monitoringLogSet := logs.Files[id]
	monitoringLogSet.StopMonitoring()
}

func searchInLogSet(w http.ResponseWriter, r *http.Request){
	log.Info("Invoked POST", r.URL.Path, " API")
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		log.Error("Invalid logset id for searching: Error -  ", err);
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
		log.Error("Invalid Json for searchInLogSet API ", string(reqBody), err)
		http.Error(w, "Cannot unmarshal json", http.StatusBadRequest)
		return
	}

	logSet := utils.GetLogSet(id)
	results, err := utils.SearchLogs(logSet.Directory, logSet.LogFilePattern, searchQuery)
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
	monitoringLogSet := logs.Files[id]
	monitoringLogSet.ResetMonitoring(resetReq);
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