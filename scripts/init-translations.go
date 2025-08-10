package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id"`
	Language    string `dynamodbav:"language"`
	Translation string `dynamodbav:"translation"`
	Category    string `dynamodbav:"category"`
	CreatedAt   string `dynamodbav:"created_at"`
	UpdatedAt   string `dynamodbav:"updated_at"`
}

// 翻訳データ - word_id をキーとした多言語対応
var TRANSLATIONS = map[string]map[string]string{
	// 基本的な食べ物
	"food_001": {
		"jp": "みず",
		"en": "water",
		"es": "agua",
		"fr": "eau",
		"de": "wasser",
		"zh": "水",
		"ko": "물",
	},
	"food_002": {
		"jp": "お茶",
		"en": "tea",
		"es": "té",
		"fr": "thé",
		"de": "tee",
		"zh": "茶",
		"ko": "차",
	},
	"food_003": {
		"jp": "コーヒー",
		"en": "coffee",
		"es": "café",
		"fr": "café",
		"de": "kaffee",
		"zh": "咖啡",
		"ko": "커피",
	},
	"food_004": {
		"jp": "わいん",
		"en": "wine",
		"es": "vino",
		"fr": "vin",
		"de": "wein",
		"zh": "酒",
		"ko": "와인",
	},
	"food_005": {
		"jp": "ビール",
		"en": "beer",
		"es": "cerveza",
		"fr": "bière",
		"de": "bier",
		"zh": "啤酒",
		"ko": "맥주",
	},
	"food_006": {
		"jp": "すし",
		"en": "sushi",
		"es": "sushi",
		"fr": "sushi",
		"de": "sushi",
		"zh": "寿司",
		"ko": "스시",
	},
	"food_007": {
		"jp": "ラーメン",
		"en": "ramen",
		"es": "ramen",
		"fr": "ramen",
		"de": "ramen",
		"zh": "拉面",
		"ko": "라멘",
	},
	"food_008": {
		"jp": "りんご",
		"en": "apple",
		"es": "manzana",
		"fr": "pomme",
		"de": "apfel",
		"zh": "苹果",
		"ko": "사과",
	},
	"food_009": {
		"jp": "みかん",
		"en": "orange",
		"es": "naranja",
		"fr": "orange",
		"de": "orange",
		"zh": "橙子",
		"ko": "오렌지",
	},
	"food_010": {
		"jp": "バナナ",
		"en": "banana",
		"es": "plátano",
		"fr": "banane",
		"de": "banane",
		"zh": "香蕉",
		"ko": "바나나",
	},
	// 乗り物
	"vehicle_001": {
		"jp": "車",
		"en": "car",
		"es": "coche",
		"fr": "voiture",
		"de": "auto",
		"zh": "汽车",
		"ko": "자동차",
	},
	"vehicle_002": {
		"jp": "電車",
		"en": "train",
		"es": "tren",
		"fr": "train",
		"de": "zug",
		"zh": "火车",
		"ko": "기차",
	},
	"vehicle_003": {
		"jp": "バス",
		"en": "bus",
		"es": "autobús",
		"fr": "bus",
		"de": "bus",
		"zh": "公交车",
		"ko": "버스",
	},
	"vehicle_004": {
		"jp": "飛行機",
		"en": "airplane",
		"es": "avión",
		"fr": "avion",
		"de": "flugzeug",
		"zh": "飞机",
		"ko": "비행기",
	},
	"vehicle_005": {
		"jp": "自転車",
		"en": "bicycle",
		"es": "bicicleta",
		"fr": "vélo",
		"de": "fahrrad",
		"zh": "自行车",
		"ko": "자전거",
	},
	// 駅名
	"station_001": {
		"jp": "新宿",
		"en": "shinjuku",
		"es": "shinjuku",
		"fr": "shinjuku",
		"de": "shinjuku",
		"zh": "新宿",
		"ko": "신주쿠",
	},
	"station_002": {
		"jp": "渋谷",
		"en": "shibuya",
		"es": "shibuya",
		"fr": "shibuya",
		"de": "shibuya",
		"zh": "涩谷",
		"ko": "시부야",
	},
	"station_003": {
		"jp": "東京",
		"en": "tokyo",
		"es": "tokio",
		"fr": "tokyo",
		"de": "tokio",
		"zh": "东京",
		"ko": "도쿄",
	},
}

func main() {
	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	// DynamoDBクライアントを作成
	svc := dynamodb.NewFromConfig(cfg)

	tableName := "typing-game-translations"

	// テーブルが存在するかチェック
	_, err = svc.DescribeTable(context.TODO(), &dynamodb.DescribeTableInput{
		TableName: aws.String(tableName),
	})

	if err != nil {
		// テーブルが存在しない場合は作成
		fmt.Println("Creating translations table...")
		createTableInput := &dynamodb.CreateTableInput{
			TableName: aws.String(tableName),
			KeySchema: []types.KeySchemaElement{
				{
					AttributeName: aws.String("word_id"),
					KeyType:       types.KeyTypeHash, // パーティションキー
				},
				{
					AttributeName: aws.String("language"),
					KeyType:       types.KeyTypeRange, // ソートキー
				},
			},
			AttributeDefinitions: []types.AttributeDefinition{
				{
					AttributeName: aws.String("word_id"),
					AttributeType: types.ScalarAttributeTypeS,
				},
				{
					AttributeName: aws.String("language"),
					AttributeType: types.ScalarAttributeTypeS,
				},
			},
			BillingMode: types.BillingModePayPerRequest,
		}

		_, err = svc.CreateTable(context.TODO(), createTableInput)
		if err != nil {
			log.Fatalf("failed to create table, %v", err)
		}

		fmt.Println("Table created successfully!")
		
		// テーブルがアクティブになるまで待機
		fmt.Println("Waiting for table to become active...")
		waiter := dynamodb.NewTableExistsWaiter(svc)
		err = waiter.Wait(context.TODO(), &dynamodb.DescribeTableInput{
			TableName: aws.String(tableName),
		}, 5*time.Minute)
		if err != nil {
			log.Fatalf("failed to wait for table to become active, %v", err)
		}
	}

	fmt.Println("Inserting translation data...")

	// 翻訳データを挿入
	for wordID, translations := range TRANSLATIONS {
		for language, translation := range translations {
			// カテゴリーを word_id から推定
			category := "food"
			if len(wordID) > 7 {
				switch wordID[:7] {
				case "vehicle":
					category = "vehicle"
				case "station":
					category = "station"
				}
			}

			item := TranslationItem{
				WordID:      wordID,
				Language:    language,
				Translation: translation,
				Category:    category,
				CreatedAt:   time.Now().Format(time.RFC3339),
				UpdatedAt:   time.Now().Format(time.RFC3339),
			}

			av, err := attributevalue.MarshalMap(item)
			if err != nil {
				log.Printf("failed to marshal translation item %s-%s, %v", wordID, language, err)
				continue
			}

			_, err = svc.PutItem(context.TODO(), &dynamodb.PutItemInput{
				TableName: aws.String(tableName),
				Item:      av,
			})
			if err != nil {
				log.Printf("failed to put translation item %s-%s, %v", wordID, language, err)
				continue
			}

			fmt.Printf("Inserted: %s (%s) -> %s\n", wordID, language, translation)
		}
	}

	fmt.Println("Translation data insertion completed!")
}