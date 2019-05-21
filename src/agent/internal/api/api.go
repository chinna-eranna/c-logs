package api

import (
    log "github.com/Sirupsen/logrus"
    "net/http"
	"github.com/gorilla/mux"
	"fmt"
	"agent/internal/logs"
)

func Init() {
	log.Println("Initializing API router")
	router := mux.NewRouter()
	router.HandleFunc("/v1/logs", getLogs).Methods("GET")
	log.Fatal(http.ListenAndServe(":13999", router))
}

func getLogs(w http.ResponseWriter, r *http.Request){
	log.Println("Invoked /v1/logs API")
	monitoringFile := logs.Files["test"]
	logMessages := monitoringFile.GetLogs()
	for _,line := range logMessages {
		fmt.Fprintf(w, line)
	}
}
