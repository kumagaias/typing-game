// 日本語→英語の基本翻訳マップ
var BASIC_TRANSLATIONS = map[string]string{
	"みず": "water", "たべもの": "food", "のみもの": "drink", "いえ": "house", "がっこう": "school",
	"しごと": "work", "ともだち": "friend", "かぞく": "family", "いぬ": "dog", "ねこ": "cat",
	"くるま": "car", "でんしゃ": "train", "ほん": "book", "えいが": "movie", "おんがく": "music",
	"てんき": "weather", "あめ": "rain", "ゆき": "snow", "はな": "flower", "き": "tree",
	"やま": "mountain", "うみ": "sea", "かわ": "river", "そら": "sky", "つき": "moon",
	"ひ": "sun", "よる": "night", "あさ": "morning", "ひる": "noon", "ばん": "evening",
	"きょう": "today", "あした": "tomorrow", "きのう": "yesterday", "らいしゅう": "next week", "せんしゅう": "last week",
	"おおきい": "big", "ちいさい": "small", "たかい": "expensive", "やすい": "cheap", "あたらしい": "new",
	"ふるい": "old", "きれい": "beautiful", "きたない": "dirty", "おいしい": "delicious", "まずい": "bad taste",
	"おはよう": "good morning", "こんにちは": "hello", "こんばんは": "good evening", "おやすみ": "good night",
	"はじめまして": "nice to meet you", "よろしく": "please treat me well", "ありがとう": "thank you",
	"すみません": "excuse me", "ごめんなさい": "sorry", "はい": "yes", "いいえ": "no",
	"わかりました": "i understand", "わかりません": "i don't understand", "もういちど": "once more",
	"ゆっくり": "slowly", "おねがいします": "please", "だいじょうぶ": "it's okay",
	// ... 必要に応じて追加 ...
}
package main

import (
	"context"
	"fmt"
	"log"
	"os"

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

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id"`
	Language    string `dynamodbav:"language"`
	Translation string `dynamodbav:"translation"`
	Category    string `dynamodbav:"category"`
	CreatedAt   string `dynamodbav:"created_at"`
	UpdatedAt   string `dynamodbav:"updated_at"`
}

func main() {
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}
	dynamoClient := dynamodb.NewFromConfig(cfg)
	translationsTable := os.Getenv("TRANSLATIONS_TABLE_NAME")
	if translationsTable == "" {
		translationsTable = "typing-game-translations"
	}

	fmt.Println("Step 1: Deleting all English translations...")
	// 1. Scan and delete all items where language = 'en'
	var lastEvaluatedKey map[string]types.AttributeValue
	deleteCount := 0
	for {
		scanInput := &dynamodb.ScanInput{
			TableName:                &translationsTable,
			FilterExpression:         aws.String("#lang = :en"),
			ExpressionAttributeNames: map[string]string{"#lang": "language"},
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":en": &types.AttributeValueMemberS{Value: "en"},
			},
			ExclusiveStartKey: lastEvaluatedKey,
		}
		scanOutput, err := dynamoClient.Scan(context.TODO(), scanInput)
		if err != nil {
			log.Fatalf("Failed to scan for English translations: %v", err)
		}
		if len(scanOutput.Items) == 0 {
			break
		}
		// バッチで削除
		writeRequests := make([]types.WriteRequest, 0, len(scanOutput.Items))
		for _, item := range scanOutput.Items {
			var t TranslationItem
			err := attributevalue.UnmarshalMap(item, &t)
			if err != nil {
				log.Printf("Failed to unmarshal item: %v", err)
				continue
			}
			writeRequests = append(writeRequests, types.WriteRequest{
				DeleteRequest: &types.DeleteRequest{
					Key: map[string]types.AttributeValue{
						"word_id":  &types.AttributeValueMemberS{Value: t.WordID},
						"language": &types.AttributeValueMemberS{Value: t.Language},
					},
				},
			})
		}
		// DynamoDBのバッチ書き込みは最大25件
		for i := 0; i < len(writeRequests); i += 25 {
			end := i + 25
			if end > len(writeRequests) {
				end = len(writeRequests)
			}
			batch := writeRequests[i:end]
			_, err := dynamoClient.BatchWriteItem(context.TODO(), &dynamodb.BatchWriteItemInput{
				RequestItems: map[string][]types.WriteRequest{
					translationsTable: batch,
				},
			})
			if err != nil {
				log.Printf("Batch delete error: %v", err)
			} else {
				deleteCount += len(batch)
			}
		}
		if scanOutput.LastEvaluatedKey == nil || len(scanOutput.LastEvaluatedKey) == 0 {
			break
		}
		lastEvaluatedKey = scanOutput.LastEvaluatedKey
	}
	fmt.Printf("Deleted %d English translation items.\n", deleteCount)

	fmt.Println("Step 2: Scanning all Japanese translations...")
	// 2. Scan all items where language = 'jp'
	var jpLastEvaluatedKey map[string]types.AttributeValue
	var japaneseItems []TranslationItem
	for {
		scanInput := &dynamodb.ScanInput{
			TableName:                &translationsTable,
			FilterExpression:         aws.String("#lang = :jp"),
			ExpressionAttributeNames: map[string]string{"#lang": "language"},
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":jp": &types.AttributeValueMemberS{Value: "jp"},
			},
			ExclusiveStartKey: jpLastEvaluatedKey,
		}
		scanOutput, err := dynamoClient.Scan(context.TODO(), scanInput)
		if err != nil {
			log.Fatalf("Failed to scan for Japanese translations: %v", err)
		}
		for _, item := range scanOutput.Items {
			var t TranslationItem
			err := attributevalue.UnmarshalMap(item, &t)
			if err != nil {
				log.Printf("Failed to unmarshal JP item: %v", err)
				continue
			}
			japaneseItems = append(japaneseItems, t)
		}
		if scanOutput.LastEvaluatedKey == nil || len(scanOutput.LastEvaluatedKey) == 0 {
			break
		}
		jpLastEvaluatedKey = scanOutput.LastEvaluatedKey
	}
	fmt.Printf("Scanned %d Japanese translation items.\n", len(japaneseItems))

	fmt.Println("Step 3: Generating and inserting English translations...")
	// 3. For each Japanese item, generate English translation and insert as new item (language = 'en')
	// TODO: 実際の翻訳ロジック（BASIC_TRANSLATIONSや外部API）をここに組み込む
	now := fmt.Sprintf("%s", os.Getenv("NOW"))
	if now == "" {
		now = "2025-08-20T00:00:00Z" // 仮のタイムスタンプ
	}
	var putRequests []types.WriteRequest
	for _, jpItem := range japaneseItems {
		// 日本語→英語の正しい翻訳があればそれを、なければ空文字
		enTranslation := ""
		if val, ok := BASIC_TRANSLATIONS[jpItem.Translation]; ok {
			enTranslation = val
		}
		putRequests = append(putRequests, types.WriteRequest{
			PutRequest: &types.PutRequest{
				Item: map[string]types.AttributeValue{
					"word_id":    &types.AttributeValueMemberS{Value: jpItem.WordID},
					"language":   &types.AttributeValueMemberS{Value: "en"},
					"translation": &types.AttributeValueMemberS{Value: enTranslation},
					"category":   &types.AttributeValueMemberS{Value: jpItem.Category},
					"created_at": &types.AttributeValueMemberS{Value: now},
					"updated_at": &types.AttributeValueMemberS{Value: now},
				},
			},
		})
	}
	// バッチでDynamoDBにPut
	putCount := 0
	for i := 0; i < len(putRequests); i += 25 {
		end := i + 25
		if end > len(putRequests) {
			end = len(putRequests)
		}
		batch := putRequests[i:end]
		_, err := dynamoClient.BatchWriteItem(context.TODO(), &dynamodb.BatchWriteItemInput{
			RequestItems: map[string][]types.WriteRequest{
				translationsTable: batch,
			},
		})
		if err != nil {
			log.Printf("Batch put error: %v", err)
		} else {
			putCount += len(batch)
		}
	}
	fmt.Printf("Inserted %d English translation items.\n", putCount)

	fmt.Println("Done.")
}
