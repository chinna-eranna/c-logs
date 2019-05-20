package utils

import (
	"github.com/rjeczalik/notify"
	log "github.com/Sirupsen/logrus"
	"io"
	"os"
	"fmt"
	"time"
	"compress/gzip")

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