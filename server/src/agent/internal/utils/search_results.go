package utils

import  (
	"strings"
	"path"
	log "github.com/Sirupsen/logrus"
)

type SearchQuery struct{
	SearchString string
	Type string
	Files []string
}

type SearchResult struct{
	Name string
	Line string
	Text string
}

func ParseResults(output string)([]SearchResult){
	lines := strings.Split(output, "\n")
	results := []SearchResult{}
	for _, line := range lines {
		if (len(line) > 0){
			results = append(results, parseLine(line))
		}
	}
	return results
}

func parseLine(line string)(SearchResult){
	log.Info("Parsing line: ", line);
	tokens := strings.SplitN(line, ":", 3)
	return SearchResult{path.Base(tokens[0]), tokens[1], tokens[2]}
}