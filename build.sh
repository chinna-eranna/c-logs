mkdir -p src/agent/templates
cp ./client/dist/index.html src/agent/templates/
cp ./client/dist/bootstrap.min.css src/agent/templates/
cd src/agent
../../bin/packr -v
cd -
export GOPATH=/Users/meranna/git/c-logs
env GOOS=linux GOARC=386 go build -v -o ./bin/clogs agent
