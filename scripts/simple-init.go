package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type WordItem struct {
	Category string `dynamodbav:"category"`
	WordID   string `dynamodbav:"word_id"`
	Word     string `dynamodbav:"word"`
	Round    int    `dynamodbav:"round"`
	Type     string `dynamodbav:"type"`
	Language string `dynamodbav:"language"`
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run simple-init.go <WORDS_TABLE_NAME>")
	}

	tableName := os.Args[1]

	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	fmt.Printf("Adding sample words to table: %s\n", tableName)

	// サンプル単語データ
	words := []struct {
		category string
		wordID   string
		word     string
		round    int
		wordType string
		language string
	}{
		{"beginner_words", "beginner_words_jp_1_001", "みず", 1, "normal", "jp"},
		{"beginner_words", "beginner_words_en_1_001", "water", 1, "normal", "en"},
		{"beginner_words", "beginner_words_jp_1_002", "たべもの", 1, "normal", "jp"},
		{"beginner_words", "beginner_words_en_1_002", "food", 1, "normal", "en"},
		{"beginner_conversation", "beginner_conversation_jp_1_001", "おはよう", 1, "normal", "jp"},
		{"beginner_conversation", "beginner_conversation_en_1_001", "good morning", 1, "normal", "en"},
	}

	for _, w := range words {
		wordItem := WordItem{
			Category: w.category,
			WordID:   w.wordID,
			Word:     w.word,
			Round:    w.round,
			Type:     w.wordType,
			Language: w.language,
		}

		item, err := attributevalue.MarshalMap(wordItem)
		if err != nil {
			log.Printf("Failed to marshal word item: %v", err)
			continue
		}

		_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      item,
		})

		if err != nil {
			log.Printf("Failed to add word %s: %v", w.word, err)
		} else {
			fmt.Printf("Added: %s (%s)\n", w.word, w.language)
		}

		time.Sleep(100 * time.Millisecond)
	}

	fmt.Println("Sample words added successfully!")
}