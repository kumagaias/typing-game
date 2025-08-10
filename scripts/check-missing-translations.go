package main

import (
	"context"
	"fmt"
	"log"
	"sort"

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

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id"`
	Language    string `dynamodbav:"language"`
	Translation string `dynamodbav:"translation"`
	Category    string `dynamodbav:"category"`
}

func main() {
	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)
	wordsTableName := "typing-game-words-production"
	translationsTableName := "typing-game-translations"

	fmt.Println("Checking for missing translations...")

	// 全ての単語を取得
	fmt.Println("Fetching all words...")
	wordsScanInput := &dynamodb.ScanInput{
		TableName: aws.String(wordsTableName),
	}

	wordsResult, err := client.Scan(context.TODO(), wordsScanInput)
	if err != nil {
		log.Fatalf("Failed to scan words table: %v", err)
	}

	var words []WordItem
	err = attributevalue.UnmarshalListOfMaps(wordsResult.Items, &words)
	if err != nil {
		log.Fatalf("Failed to unmarshal words: %v", err)
	}

	fmt.Printf("Found %d words\n", len(words))

	// 全ての翻訳を取得
	fmt.Println("Fetching all translations...")
	translationsScanInput := &dynamodb.ScanInput{
		TableName: aws.String(translationsTableName),
	}

	translationsResult, err := client.Scan(context.TODO(), translationsScanInput)
	if err != nil {
		log.Fatalf("Failed to scan translations table: %v", err)
	}

	var translations []TranslationItem
	err = attributevalue.UnmarshalListOfMaps(translationsResult.Items, &translations)
	if err != nil {
		log.Fatalf("Failed to unmarshal translations: %v", err)
	}

	fmt.Printf("Found %d translations\n", len(translations))

	// 翻訳のマップを作成 (word_id + language -> translation)
	translationMap := make(map[string]bool)
	for _, translation := range translations {
		key := translation.WordID + "_" + translation.Language
		translationMap[key] = true
	}

	// 日本語単語で英語翻訳が不足しているものを特定
	var missingJpToEn []WordItem
	// 英語単語で日本語翻訳が不足しているものを特定
	var missingEnToJp []WordItem

	for _, word := range words {
		if word.Language == "jp" {
			// 日本語単語の英語翻訳をチェック
			key := word.WordID + "_en"
			if !translationMap[key] {
				missingJpToEn = append(missingJpToEn, word)
			}
		} else if word.Language == "en" {
			// 英語単語の日本語翻訳をチェック
			key := word.WordID + "_jp"
			if !translationMap[key] {
				missingEnToJp = append(missingEnToJp, word)
			}
		}
	}

	// カテゴリー別に集計
	jpToEnByCategory := make(map[string][]WordItem)
	enToJpByCategory := make(map[string][]WordItem)

	for _, word := range missingJpToEn {
		jpToEnByCategory[word.Category] = append(jpToEnByCategory[word.Category], word)
	}

	for _, word := range missingEnToJp {
		enToJpByCategory[word.Category] = append(enToJpByCategory[word.Category], word)
	}

	// 結果を表示
	fmt.Printf("\n=== 翻訳不足の統計 ===\n")
	fmt.Printf("日本語→英語翻訳不足: %d個\n", len(missingJpToEn))
	fmt.Printf("英語→日本語翻訳不足: %d個\n", len(missingEnToJp))

	fmt.Printf("\n=== 日本語→英語翻訳不足 (カテゴリー別) ===\n")
	var categories []string
	for category := range jpToEnByCategory {
		categories = append(categories, category)
	}
	sort.Strings(categories)

	for _, category := range categories {
		words := jpToEnByCategory[category]
		fmt.Printf("\n%s (%d個):\n", category, len(words))
		
		// ラウンド別に整理
		roundMap := make(map[int][]WordItem)
		for _, word := range words {
			roundMap[word.Round] = append(roundMap[word.Round], word)
		}
		
		var rounds []int
		for round := range roundMap {
			rounds = append(rounds, round)
		}
		sort.Ints(rounds)
		
		for _, round := range rounds {
			roundWords := roundMap[round]
			fmt.Printf("  Round %d (%d個): ", round, len(roundWords))
			for i, word := range roundWords {
				if i > 0 {
					fmt.Print(", ")
				}
				fmt.Printf("%s(%s)", word.Word, word.WordID)
				if i >= 9 { // 最初の10個だけ表示
					if len(roundWords) > 10 {
						fmt.Printf("... +%d more", len(roundWords)-10)
					}
					break
				}
			}
			fmt.Println()
		}
	}

	fmt.Printf("\n=== 英語→日本語翻訳不足 (カテゴリー別) ===\n")
	categories = nil
	for category := range enToJpByCategory {
		categories = append(categories, category)
	}
	sort.Strings(categories)

	for _, category := range categories {
		words := enToJpByCategory[category]
		fmt.Printf("\n%s (%d個):\n", category, len(words))
		
		// ラウンド別に整理
		roundMap := make(map[int][]WordItem)
		for _, word := range words {
			roundMap[word.Round] = append(roundMap[word.Round], word)
		}
		
		var rounds []int
		for round := range roundMap {
			rounds = append(rounds, round)
		}
		sort.Ints(rounds)
		
		for _, round := range rounds {
			roundWords := roundMap[round]
			fmt.Printf("  Round %d (%d個): ", round, len(roundWords))
			for i, word := range roundWords {
				if i > 0 {
					fmt.Print(", ")
				}
				fmt.Printf("%s(%s)", word.Word, word.WordID)
				if i >= 9 { // 最初の10個だけ表示
					if len(roundWords) > 10 {
						fmt.Printf("... +%d more", len(roundWords)-10)
					}
					break
				}
			}
			fmt.Println()
		}
	}

	fmt.Printf("\n=== 推奨アクション ===\n")
	fmt.Printf("1. 翻訳が不足している単語の翻訳データを追加する\n")
	fmt.Printf("2. 特に日本語→英語の翻訳不足が多い場合は、翻訳スクリプトを実行する\n")
	fmt.Printf("3. フロントエンドで翻訳が見つからない場合のフォールバック処理を確認する\n")
}