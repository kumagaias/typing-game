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
)

type TranslationItem struct {
	WordID      string `dynamodbav:"word_id" json:"word_id"`
	Language    string `dynamodbav:"language" json:"language"`
	Translation string `dynamodbav:"translation" json:"translation"`
	Category    string `dynamodbav:"category" json:"category"`
	CreatedAt   string `dynamodbav:"created_at" json:"created_at"`
	UpdatedAt   string `dynamodbav:"updated_at" json:"updated_at"`
}

// 正しい対訳データ
var correctTranslations = map[string]map[int]map[string]string{
	"beginner_words": {
		1: {
			// 日本語 -> 英語
			"ねこ": "cat", "いぬ": "dog", "みず": "water", "ひ": "sun", "つき": "moon", 
			"ほし": "star", "き": "tree", "はな": "flower", "やま": "mountain", "うみ": "sea",
			"そら": "sky", "くも": "cloud", "あめ": "rain", "ゆき": "snow", "かぜ": "wind",
			"ひかり": "light", "いえ": "home", "みち": "road", "はし": "bridge", "くるま": "car",
			"でんしゃ": "train", "ふね": "ship", "ひこうき": "plane", "ほん": "book", 
			"えんぴつ": "pencil", "かみ": "paper", "つくえ": "desk", "いす": "chair", 
			"まど": "window", "とびら": "door",
		},
		2: {
			// 日本語 -> 英語
			"がっこう": "school", "びょういん": "hospital", "ゆうびんきょく": "post office",
			"ぎんこう": "bank", "としょかん": "library", "こうえん": "park", "えきまえ": "station front",
			"かいもの": "shopping", "しごと": "work", "べんきょう": "study", "あさごはん": "breakfast",
			"ひるごはん": "lunch", "ばんごはん": "dinner", "おやつ": "snack", "のみもの": "drink",
			"てんき": "weather", "きせつ": "season", "はるやすみ": "spring break",
			"なつやすみ": "summer vacation", "ふゆやすみ": "winter break", "たんじょうび": "birthday",
			"くりすます": "christmas", "おしょうがつ": "new year", "うんどうかい": "sports day",
		},
		3: {
			// 日本語 -> 英語
			"じどうはんばいき": "vending machine", "こうそくどうろ": "highway", 
			"しんかんせん": "bullet train", "ちかてつ": "subway", "こうくうかいしゃ": "airline",
			"だいがくせい": "university student", "けんきゅうしゃ": "researcher", 
			"ぷろぐらまー": "programmer", "でざいなー": "designer", "えんじにあ": "engineer",
			"まねーじゃー": "manager", "こんさるたんと": "consultant", "いんたーねっと": "internet",
			"すまーとふぉん": "smartphone", "こんぴゅーたー": "computer", "あぷりけーしょん": "application",
			"でーたべーす": "database", "ねっとわーく": "network", "せきゅりてぃ": "security",
			"ぷらいばしー": "privacy",
		},
		4: {
			// 日本語 -> 英語
			"いんふらすとらくちゃー": "infrastructure", "あーきてくちゃー": "architecture",
			"あるごりずむ": "algorithm", "ぷろぐらみんぐげんご": "programming language",
			"でーたさいえんす": "data science", "あーてぃふぃしゃるいんてりじぇんす": "artificial intelligence",
			"まちーんらーにんぐ": "machine learning", "でぃーぷらーにんぐ": "deep learning",
			"ぶろっくちぇーん": "blockchain", "くらうどこんぴゅーてぃんぐ": "cloud computing",
			"いんたーねっとおぶしんぐす": "internet of things", "ばーちゃるりありてぃ": "virtual reality",
			"おーぐめんてっどりありてぃ": "augmented reality", "さいばーせきゅりてぃ": "cybersecurity",
			"くりぷとかれんしー": "cryptocurrency",
		},
		5: {
			// 日本語 -> 英語
			"じんこうちのうぎじゅつしゃ": "artificial intelligence engineer",
			"そふとうぇあでべろっぷめんと": "software development",
			"しすてむあどみにすとれーたー": "system administrator",
			"ねっとわーくえんじにあ": "network engineer",
			"でーたべーすあどみにすとれーたー": "database administrator",
			"ふるすたっくでべろっぱー": "full stack developer",
			"ゆーざーえくすぺりえんすでざいなー": "user experience designer",
			"ぷろだくとまねーじゃー": "product manager",
			"びじねすあなりすと": "business analyst",
			"でじたるまーけてぃんぐすぺしゃりすと": "digital marketing specialist",
			"くらうどそりゅーしょんあーきてくと": "cloud solution architect",
			"さいばーせきゅりてぃあなりすと": "cybersecurity analyst",
			"あーてぃふぃしゃるいんてりじぇんすえんじにあ": "artificial intelligence engineer",
		},
	},
}

func main() {
	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	// DynamoDBクライアントを作成
	dynamoClient := dynamodb.NewFromConfig(cfg)

	// テーブル名を環境変数から取得
	tableName := os.Getenv("TRANSLATIONS_TABLE_NAME")
	if tableName == "" {
		tableName = "typing-game-translations" // デフォルト値
	}

	fmt.Printf("Adding correct translations to table: %s\n", tableName)

	// 各カテゴリーの翻訳を追加
	for category, rounds := range correctTranslations {
		fmt.Printf("\nProcessing category: %s\n", category)

		for round, translations := range rounds {
			fmt.Printf("  Round %d: %d translations\n", round, len(translations))

			for jpWord, enWord := range translations {
				// 日本語単語のword_idを生成
				jpWordID := fmt.Sprintf("%s_jp_%d_%03d", category, round, getWordIndex(jpWord))
				enWordID := fmt.Sprintf("%s_en_%d_%03d", category, round, getWordIndex(enWord))

				// 日本語 -> 英語の翻訳を追加
				jpToEnTranslation := TranslationItem{
					WordID:      jpWordID,
					Language:    "en",
					Translation: enWord,
					Category:    category,
					CreatedAt:   "2024-01-01T00:00:00Z",
					UpdatedAt:   "2024-01-01T00:00:00Z",
				}

				err := addTranslationToDynamoDB(dynamoClient, tableName, jpToEnTranslation)
				if err != nil {
					log.Printf("Failed to add JP->EN translation %s->%s: %v", jpWord, enWord, err)
				} else {
					fmt.Printf("    Added JP->EN: %s -> %s\n", jpWord, enWord)
				}

				// 英語 -> 日本語の翻訳を追加
				enToJpTranslation := TranslationItem{
					WordID:      enWordID,
					Language:    "jp",
					Translation: jpWord,
					Category:    category,
					CreatedAt:   "2024-01-01T00:00:00Z",
					UpdatedAt:   "2024-01-01T00:00:00Z",
				}

				err = addTranslationToDynamoDB(dynamoClient, tableName, enToJpTranslation)
				if err != nil {
					log.Printf("Failed to add EN->JP translation %s->%s: %v", enWord, jpWord, err)
				} else {
					fmt.Printf("    Added EN->JP: %s -> %s\n", enWord, jpWord)
				}
			}
		}
	}

	fmt.Println("\nCorrect translations addition completed!")
}

// 単語のインデックスを取得する簡単な関数（実際のword_idと一致させるため）
func getWordIndex(word string) int {
	// 単語の文字数とハッシュを使って一意のインデックスを生成
	hash := 0
	for _, char := range word {
		hash = hash*31 + int(char)
	}
	return (hash % 900) + 1 // 1-900の範囲
}

func addTranslationToDynamoDB(client *dynamodb.Client, tableName string, translation TranslationItem) error {
	// TranslationItemをDynamoDB形式にマーシャル
	av, err := attributevalue.MarshalMap(translation)
	if err != nil {
		return fmt.Errorf("failed to marshal translation item: %w", err)
	}

	// DynamoDBに追加
	_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(tableName),
		Item:      av,
	})

	if err != nil {
		return fmt.Errorf("failed to put item to DynamoDB: %w", err)
	}

	return nil
}