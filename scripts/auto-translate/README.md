This folder contains helpers and notes for the auto-translate script.

Note: AWS Translate SDK package is not included in the repository's go.mod by default.
If you want to run the script with AWS Translate, run `go get github.com/aws/aws-sdk-go-v2/service/translate` inside the scripts directory, or run the script using Go modules enabled.

Usage (dry-run):
  go run ../auto-translate-and-insert.go -table typing-game-translations -region ap-northeast-1 -mode dry-run

Commit mode:
  go run ../auto-translate-and-insert.go -table typing-game-translations -region ap-northeast-1 -mode commit
