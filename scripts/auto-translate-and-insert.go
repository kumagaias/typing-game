package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	ddbtypes "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
	"github.com/aws/aws-sdk-go-v2/service/translate"
)

// WordItem mirrors scripts/check-missing-translations.go
type WordItem struct {
	Category string `dynamodbav:"category"`
	WordID   string `dynamodbav:"word_id"`
	Word     string `dynamodbav:"word"`
	Round    int    `dynamodbav:"round"`
	Type     string `dynamodbav:"type"`
	Language string `dynamodbav:"language"`
}

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id"`
	Language    string `dynamodbav:"language"`
	Translation string `dynamodbav:"translation"`
	Category    string `dynamodbav:"category"`
}

func main() {
	var (
		tableName = flag.String("table", "typing-game-translations", "DynamoDB translations table")
		region    = flag.String("region", "ap-northeast-1", "AWS region")
		mode      = flag.String("mode", "dry-run", "dry-run or commit")
		direction = flag.String("direction", "both", "both | jp2en | en2jp")
		maxItems  = flag.Int("max", 500, "maximum number of missing translations to process")
	)
	flag.Parse()

	ctx := context.Background()

	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(*region))
	if err != nil {
		log.Fatalf("failed to load AWS config: %v", err)
	}

	db := dynamodb.NewFromConfig(cfg)
	tr := translate.NewFromConfig(cfg)

	wordsTable := "typing-game-words-production"
	translationsTable := *tableName

	fmt.Println("Scanning words table...")
	wordsRes, err := db.Scan(ctx, &dynamodb.ScanInput{TableName: aws.String(wordsTable)})
	if err != nil {
		log.Fatalf("scan words failed: %v", err)
	}
	var words []WordItem
	if err := attributevalue.UnmarshalListOfMaps(wordsRes.Items, &words); err != nil {
		log.Fatalf("unmarshal words failed: %v", err)
	}
	fmt.Printf("Found %d words\n", len(words))

	fmt.Println("Scanning translations table...")
	transRes, err := db.Scan(ctx, &dynamodb.ScanInput{TableName: aws.String(translationsTable)})
	if err != nil {
		log.Fatalf("scan translations failed: %v", err)
	}
	var translations []TranslationItem
	if err := attributevalue.UnmarshalListOfMaps(transRes.Items, &translations); err != nil {
		log.Fatalf("unmarshal translations failed: %v", err)
	}
	fmt.Printf("Found %d translations\n", len(translations))

	// build map
	exists := make(map[string]bool)
	for _, t := range translations {
		exists[t.WordID+"_"+t.Language] = true
	}

	// collect missing
	type Prepared struct {
		WordID      string
		Language    string
		Translation string
		Category    string
		Source      string
	}

	var prepared []Prepared

	for _, w := range words {
		if len(prepared) >= *maxItems {
			break
		}

		if w.Language == "jp" && (*direction == "both" || *direction == "jp2en") {
			key := w.WordID + "_en"
			if !exists[key] {
				// translate ja -> en
				translated, err := translateText(ctx, tr, w.Word, "ja", "en")
				if err != nil {
					log.Printf("translate error for %s: %v", w.WordID, err)
					continue
				}
				prepared = append(prepared, Prepared{WordID: w.WordID, Language: "en", Translation: translated, Category: w.Category, Source: w.Word})
			}
		} else if w.Language == "en" && (*direction == "both" || *direction == "en2jp") {
			key := w.WordID + "_jp"
			if !exists[key] {
				translated, err := translateText(ctx, tr, w.Word, "en", "ja")
				if err != nil {
					log.Printf("translate error for %s: %v", w.WordID, err)
					continue
				}
				prepared = append(prepared, Prepared{WordID: w.WordID, Language: "jp", Translation: translated, Category: w.Category, Source: w.Word})
			}
		}
	}

	fmt.Printf("Prepared %d translations (limited to max=%d)\n", len(prepared), *maxItems)
	if len(prepared) > 0 {
		// show samples
		sample := prepared
		if len(sample) > 10 {
			sample = sample[:10]
		}
		b, _ := json.MarshalIndent(sample, "", "  ")
		fmt.Printf("Sample prepared items:\n%s\n", string(b))
	}

	if *mode == "dry-run" {
		fmt.Println("Dry-run mode: no writes will be performed. Exiting.")
		return
	}

	// commit: write to DynamoDB in batches
	const batchSize = 25
	for i := 0; i < len(prepared); i += batchSize {
		end := i + batchSize
		if end > len(prepared) {
			end = len(prepared)
		}
		batch := prepared[i:end]

		writeReqs := make([]ddbtypes.WriteRequest, 0, len(batch))
		for _, p := range batch {
			item := map[string]ddbtypes.AttributeValue{}
			item["word_id"] = &ddbtypes.AttributeValueMemberS{Value: p.WordID}
			item["language"] = &ddbtypes.AttributeValueMemberS{Value: p.Language}
			item["translation"] = &ddbtypes.AttributeValueMemberS{Value: p.Translation}
			item["category"] = &ddbtypes.AttributeValueMemberS{Value: p.Category}
			writeReqs = append(writeReqs, ddbtypes.WriteRequest{PutRequest: &ddbtypes.PutRequest{Item: item}})
		}

		_, err := db.BatchWriteItem(ctx, &dynamodb.BatchWriteItemInput{RequestItems: map[string][]ddbtypes.WriteRequest{translationsTable: writeReqs}})
		if err != nil {
			log.Fatalf("batch write failed: %v", err)
		}
		fmt.Printf("Wrote batch %d..%d\n", i, end-1)
		// brief delay to avoid throttling
		time.Sleep(200 * time.Millisecond)
	}

	fmt.Println("Commit complete")
}

func translateText(ctx context.Context, client *translate.Client, text, src, tgt string) (string, error) {
	// AWS Translate expects short text; trim excessive whitespace
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return "", nil
	}

	input := &translate.TranslateTextInput{
		Text:               aws.String(trimmed),
		SourceLanguageCode: aws.String(src),
		TargetLanguageCode: aws.String(tgt),
	}
	resp, err := client.TranslateText(ctx, input)
	if err != nil {
		return "", err
	}
	return aws.ToString(resp.TranslatedText), nil
}
