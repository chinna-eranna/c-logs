cp ../../client/dist/index.html templates/
../../bin/packr
export GOPATH=/Users/meranna/git/v-logs
env GOOS=linux GOARC=386 go build -v -o ../../bin/clogs
