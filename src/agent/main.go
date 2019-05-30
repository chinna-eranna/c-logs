package main

import (
	"agent/internal/logs"
	"agent/internal/api" 
	//"agent/internal/utils"
)

import log "github.com/Sirupsen/logrus"

func  main(){
	log.Println("Starting V-logs app")
	logs.Init()
	api.Init()
	//utils.GetAll();
	
	//testLogDir := utils.LogDirectory{"CVD", "Cisco001MCVD*", "/opt/cisco/uccx/logs/MCVD", "May 21 00:59:48.423 IST"}
	//utils.AddLogDirectory(testLogDir)
	//utils.RemoveLogDirectory("CVD")
}
