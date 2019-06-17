package utils

import  (
	"strings"
)

type SearchResult struct{
	Name string
	Line string
	Text string
}

func ParseResults(output string)([]SearchResult){
	lines := strings.Split(output, "\n")
	var results []SearchResult
	for _, line := range lines {
		results = append(results, parseLine(line))
	}
	return results
}

func parseLine(line string)(SearchResult){
	tokens := strings.SplitN(line, ":", 3)
	return SearchResult(tokens[0], tokens[1], tokens[2])
}