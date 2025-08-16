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
	if len(os.Args) < 3 {
		log.Fatal("Usage: go run add-new-category-translations.go <WORDS_TABLE_NAME> <TRANSLATIONS_TABLE_NAME>")
	}

	wordsTableName := os.Args[1]
	translationsTableName := os.Args[2]

	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	fmt.Printf("Adding translations for new categories...\n")
	fmt.Printf("Words table: %s\n", wordsTableName)
	fmt.Printf("Translations table: %s\n", translationsTableName)

	// 新しいカテゴリーの単語を取得
	newCategories := []string{"beginner_words", "intermediate_words", "beginner_conversation", "intermediate_conversation"}
	
	totalTranslations := 0
	now := time.Now().Format(time.RFC3339)

	for _, category := range newCategories {
		fmt.Printf("Processing category: %s\n", category)
		
		// 日本語単語を取得
		jpWords, err := getWordsByCategory(client, wordsTableName, category, "jp")
		if err != nil {
			log.Printf("Failed to get JP words for category %s: %v", category, err)
			continue
		}

		// 英語単語を取得
		enWords, err := getWordsByCategory(client, wordsTableName, category, "en")
		if err != nil {
			log.Printf("Failed to get EN words for category %s: %v", category, err)
			continue
		}

		fmt.Printf("  Found %d JP words and %d EN words\n", len(jpWords), len(enWords))

		// 日本語と英語の単語をペアリング（同じラウンド・同じインデックス）
		for i := 0; i < len(jpWords) && i < len(enWords); i++ {
			jpWord := jpWords[i]
			enWord := enWords[i]

			// 同じラウンドの同じ位置の単語をペアとして翻訳を作成
			if jpWord.Round == enWord.Round {
				// 日本語→英語の翻訳
				jpToEnTranslation := TranslationItem{
					WordID:      jpWord.WordID,
					Language:    "en",
					Translation: enWord.Word,
					Category:    category,
					CreatedAt:   now,
					UpdatedAt:   now,
				}

				err := addTranslation(client, translationsTableName, jpToEnTranslation)
				if err != nil {
					log.Printf("Failed to add JP->EN translation: %s -> %s: %v", jpWord.Word, enWord.Word, err)
				} else {
					totalTranslations++
					fmt.Printf("  Added: %s -> %s\n", jpWord.Word, enWord.Word)
				}

				// 英語→日本語の翻訳
				enToJpTranslation := TranslationItem{
					WordID:      enWord.WordID,
					Language:    "jp",
					Translation: jpWord.Word,
					Category:    category,
					CreatedAt:   now,
					UpdatedAt:   now,
				}

				err = addTranslation(client, translationsTableName, enToJpTranslation)
				if err != nil {
					log.Printf("Failed to add EN->JP translation: %s -> %s: %v", enWord.Word, jpWord.Word, err)
				} else {
					totalTranslations++
					fmt.Printf("  Added: %s -> %s\n", enWord.Word, jpWord.Word)
				}

				time.Sleep(50 * time.Millisecond)
			}
		}
	}

	fmt.Printf("Successfully added %d translations!\n", totalTranslations)
	fmt.Println("New category translations completed!")
}

func getWordsByCategory(client *dynamodb.Client, tableName, category, language string) ([]WordItem, error) {
	scanInput := &dynamodb.ScanInput{
		TableName:        aws.String(tableName),
		FilterExpression: aws.String("#category = :category AND #language = :language"),
		ExpressionAttributeNames: map[string]string{
			"#category": "category",
			"#language": "language",
		},
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":category": &types.AttributeValueMemberS{Value: category},
			":language": &types.AttributeValueMemberS{Value: language},
		},
	}

	result, err := client.Scan(context.TODO(), scanInput)
	if err != nil {
		return nil, err
	}

	var words []WordItem
	err = attributevalue.UnmarshalListOfMaps(result.Items, &words)
	if err != nil {
		return nil, err
	}

	// ラウンドとword_idでソート
	for i := 0; i < len(words)-1; i++ {
		for j := i + 1; j < len(words); j++ {
			if words[i].Round > words[j].Round || 
			   (words[i].Round == words[j].Round && words[i].WordID > words[j].WordID) {
				words[i], words[j] = words[j], words[i]
			}
		}
	}

	return words, nil
}

func addTranslation(client *dynamodb.Client, tableName string, translation TranslationItem) error {
	item, err := attributevalue.MarshalMap(translation)
	if err != nil {
		return err
	}

	_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      item,
	})

	return err
}