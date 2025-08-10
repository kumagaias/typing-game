package main

import (
	"context"
	"fmt"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type WordItem struct {
	Category string `dynamodbav:"category"`
	WordID   string `dynamodbav:"word_id"`
	Word     string `dynamodbav:"word"`
	Round    int    `dynamodbav:"round"`
	Type     string `dynamodbav:"type"`
	Language string `dynamodbav:"language"`
}

// 翻訳対応単語のマッピング
var WORD_ID_MAPPING = map[string]map[string]string{
	// 日本語単語 -> word_id
	"jp": {
		"みず":   "food_001",
		"お茶":   "food_002",
		"コーヒー": "food_003",
		"わいん":  "food_004",
		"ビール":  "food_005",
		"すし":   "food_006",
		"ラーメン": "food_007",
		"りんご":  "food_008",
		"みかん":  "food_009",
		"バナナ":  "food_010",
		"車":    "vehicle_001",
		"電車":   "vehicle_002",
		"バス":   "vehicle_003",
		"飛行機":  "vehicle_004",
		"自転車":  "vehicle_005",
		"新宿":   "station_001",
		"渋谷":   "station_002",
		"東京":   "station_003",
	},
	// 英語単語 -> word_id
	"en": {
		"water":    "food_001",
		"tea":      "food_002",
		"coffee":   "food_003",
		"wine":     "food_004",
		"beer":     "food_005",
		"sushi":    "food_006",
		"ramen":    "food_007",
		"apple":    "food_008",
		"orange":   "food_009",
		"banana":   "food_010",
		"car":      "vehicle_001",
		"train":    "vehicle_002",
		"bus":      "vehicle_003",
		"airplane": "vehicle_004",
		"bicycle":  "vehicle_005",
		"shinjuku": "station_001",
		"shibuya":  "station_002",
		"tokyo":    "station_003",
	},
}

func main() {
	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)
	tableName := "typing-game-words-production"

	fmt.Println("Updating word_ids for translation-supported words...")

	// 各言語の単語を更新
	for language, wordMapping := range WORD_ID_MAPPING {
		for word, wordID := range wordMapping {
			err := updateWordID(client, tableName, word, language, wordID)
			if err != nil {
				log.Printf("Failed to update word_id for %s (%s): %v", word, language, err)
			} else {
				fmt.Printf("Updated: %s (%s) -> %s\n", word, language, wordID)
			}
		}
	}

	fmt.Println("Word ID update completed!")
}

func updateWordID(client *dynamodb.Client, tableName, word, language, newWordID string) error {
	// まず既存の単語を検索
	scanInput := &dynamodb.ScanInput{
		TableName: aws.String(tableName),
		FilterExpression: aws.String("#word = :word AND #language = :language"),
		ExpressionAttributeNames: map[string]string{
			"#word":     "word",
			"#language": "language",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":word": &types.AttributeValueMemberS{
				Value: word,
			},
			":language": &types.AttributeValueMemberS{
				Value: language,
			},
		},
	}

	result, err := client.Scan(context.TODO(), scanInput)
	if err != nil {
		return fmt.Errorf("failed to scan for word %s: %w", word, err)
	}

	if len(result.Items) == 0 {
		return fmt.Errorf("word %s (%s) not found", word, language)
	}

	// 各アイテムのword_idを更新
	for _, item := range result.Items {
		var wordItem WordItem
		err := attributevalue.UnmarshalMap(item, &wordItem)
		if err != nil {
			log.Printf("Failed to unmarshal word item: %v", err)
			continue
		}

		// 古いアイテムを削除
		_, err = client.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
			TableName: aws.String(tableName),
			Key: map[string]types.AttributeValue{
				"category": &types.AttributeValueMemberS{
					Value: wordItem.Category,
				},
				"word_id": &types.AttributeValueMemberS{
					Value: wordItem.WordID,
				},
			},
		})
		if err != nil {
			log.Printf("Failed to delete old word item: %v", err)
			continue
		}

		// 新しいword_idで再挿入
		wordItem.WordID = newWordID
		av, err := attributevalue.MarshalMap(wordItem)
		if err != nil {
			log.Printf("Failed to marshal updated word item: %v", err)
			continue
		}

		_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      av,
		})
		if err != nil {
			log.Printf("Failed to put updated word item: %v", err)
			continue
		}
	}

	return nil
}