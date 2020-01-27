cp ../../client/dist/index.html templates/
cp ../../client/dist/bootstrap.min.css templates/
../../bin/packr -v
export GOPATH=/Users/meranna/git/v-logs
env GOOS=linux GOARC=386 go build -v -o ../../bin/clogs
