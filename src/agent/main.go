package main

import (
	"agent/internal/logs"
	"agent/internal/api" )

import log "github.com/Sirupsen/logrus"

func  main(){
	log.Println("Starting V-logs app")
	logs.Init()
	api.Init()
}
