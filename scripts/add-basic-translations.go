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

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id"`
	Language    string `dynamodbav:"language"`
	Translation string `dynamodbav:"translation"`
	Category    string `dynamodbav:"category"`
	CreatedAt   string `dynamodbav:"created_at"`
	UpdatedAt   string `dynamodbav:"updated_at"`
}

// 基本的な翻訳マッピング
var BASIC_TRANSLATIONS = map[string]string{
	// 初級単語
	"みず": "water", "たべもの": "food", "のみもの": "drink", "いえ": "house", "がっこう": "school",
	"しごと": "work", "ともだち": "friend", "かぞく": "family", "いぬ": "dog", "ねこ": "cat",
	"くるま": "car", "でんしゃ": "train", "ほん": "book", "えいが": "movie", "おんがく": "music",
	"てんき": "weather", "あめ": "rain", "ゆき": "snow", "はな": "flower", "き": "tree",
	"やま": "mountain", "うみ": "sea", "かわ": "river", "そら": "sky", "つき": "moon",
	"ひ": "sun", "よる": "night", "あさ": "morning", "ひる": "noon", "ばん": "evening",
	"きょう": "today", "あした": "tomorrow", "きのう": "yesterday", "らいしゅう": "next week", "せんしゅう": "last week",
	"おおきい": "big", "ちいさい": "small", "たかい": "expensive", "やすい": "cheap", "あたらしい": "new",
	"ふるい": "old", "きれい": "beautiful", "きたない": "dirty", "おいしい": "delicious", "まずい": "bad taste",
	
	// 基本会話
	"おはよう": "good morning", "こんにちは": "hello", "こんばんは": "good evening", "おやすみ": "good night",
	"はじめまして": "nice to meet you", "よろしく": "please treat me well", "ありがとう": "thank you",
	"すみません": "excuse me", "ごめんなさい": "sorry", "はい": "yes", "いいえ": "no",
	"わかりました": "i understand", "わかりません": "i don't understand", "もういちど": "once more",
	"ゆっくり": "slowly", "おねがいします": "please", "だいじょうぶ": "it's okay",
	
	// 特殊単語
	"ぼーなす": "bonus", "らっきー": "lucky", "ぱーふぇくと": "perfect", "すぺしゃる": "special",
	"とらっぷ": "trap", "でんじゃー": "danger", "はーど": "hard", "えくすとりーむ": "extreme",
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run add-basic-translations.go <TRANSLATIONS_TABLE_NAME>")
	}

	tableName := os.Args[1]

	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	fmt.Printf("Adding basic translations to table: %s\n", tableName)

	now := time.Now().Format(time.RFC3339)
	totalTranslations := 0

	for jpWord, enWord := range BASIC_TRANSLATIONS {
		// 日本語→英語の翻訳を追加
		jpToEnTranslation := TranslationItem{
			WordID:      fmt.Sprintf("basic_%s", jpWord),
			Language:    "en",
			Translation: enWord,
			Category:    "basic",
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		item, err := attributevalue.MarshalMap(jpToEnTranslation)
		if err != nil {
			log.Printf("Failed to marshal translation item: %v", err)
			continue
		}

		_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      item,
		})

		if err != nil {
			log.Printf("Failed to add translation %s -> %s: %v", jpWord, enWord, err)
		} else {
			totalTranslations++
			fmt.Printf("Added: %s -> %s\n", jpWord, enWord)
		}

		// 英語→日本語の翻訳を追加
		enToJpTranslation := TranslationItem{
			WordID:      fmt.Sprintf("basic_%s", enWord),
			Language:    "jp",
			Translation: jpWord,
			Category:    "basic",
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		item, err = attributevalue.MarshalMap(enToJpTranslation)
		if err != nil {
			log.Printf("Failed to marshal translation item: %v", err)
			continue
		}

		_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      item,
		})

		if err != nil {
			log.Printf("Failed to add translation %s -> %s: %v", enWord, jpWord, err)
		} else {
			totalTranslations++
			fmt.Printf("Added: %s -> %s\n", enWord, jpWord)
		}

		time.Sleep(50 * time.Millisecond)
	}

	fmt.Printf("Successfully added %d translations!\n", totalTranslations)
	fmt.Println("Basic translations completed!")
}