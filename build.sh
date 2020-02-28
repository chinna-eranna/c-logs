cd client
npm run-script build
cd -
mkdir -p server/src/agent/templates
cp ./client/dist/index.html server/src/agent/templates/
cp ./client/dist/bootstrap.min.css server/src/agent/templates/
cd server/src/agent
../../../bin/packr -v
cd -
export GOPATH=/Users/meranna/git/c-logs/server
env GOOS=linux GOARC=386 go build -v -o ./bin/clogs agent
