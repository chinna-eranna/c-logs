package main

import (
	"agent/internal/logs"
	"agent/internal/api" 
	//"agent/internal/utils"
	"github.com/gobuffalo/packr"
)

import log "github.com/Sirupsen/logrus"


func  main(){
	log.Println("Starting C-Logs app")
	box := packr.NewBox("./templates")

	logs.Init()
	api.Init(box)
	//utils.GetAll();
	
	//testLogDir := utils.LogDirectory{"CVD", "Cisco001MCVD*", "/opt/cisco/uccx/logs/MCVD", "May 21 00:59:48.423 IST"}
	//utils.AddLogDirectory(testLogDir)
	//utils.RemoveLogDirectory("CVD")
}
