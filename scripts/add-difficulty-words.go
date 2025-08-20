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

type WordItem struct {
	Category string `dynamodbav:"category"`
	WordID   string `dynamodbav:"word_id"`
	Word     string `dynamodbav:"word"`
	Round    int    `dynamodbav:"round"`
	Type     string `dynamodbav:"type"` // "normal", "bonus", "debuff"
	Language string `dynamodbav:"language"`
}

// ラウンド別の単語リスト（段階的難易度アップ）
var difficultyWords = map[string]map[int][]string{
	"jp": {
		// ラウンド1: 2-3文字の基本単語
		1: []string{
			"ねこ", "いぬ", "みず", "ひ", "つき", "ほし", "き", "はな",
			"やま", "うみ", "そら", "くも", "あめ", "ゆき", "かぜ", "ひかり",
			"いえ", "みち", "はし", "くるま", "でんしゃ", "ふね", "ひこうき",
			"ほん", "えんぴつ", "かみ", "つくえ", "いす", "まど", "とびら",
		},
		// ラウンド2: 4-5文字の日常単語
		2: []string{
			"がっこう", "びょういん", "ゆうびんきょく", "ぎんこう", "としょかん",
			"こうえん", "えきまえ", "かいもの", "しごと", "べんきょう",
			"あさごはん", "ひるごはん", "ばんごはん", "おやつ", "のみもの",
			"てんき", "きせつ", "はるやすみ", "なつやすみ", "ふゆやすみ",
			"たんじょうび", "くりすます", "おしょうがつ", "うんどうかい",
		},
		// ラウンド3: 6-8文字の複合語・専門用語
		3: []string{
			"じどうはんばいき", "こうそくどうろ", "しんかんせん", "ちかてつ",
			"こうくうかいしゃ", "だいがくせい", "けんきゅうしゃ", "ぷろぐらまー",
			"でざいなー", "えんじにあ", "まねーじゃー", "こんさるたんと",
			"いんたーねっと", "すまーとふぉん", "こんぴゅーたー", "あぷりけーしょん",
			"でーたべーす", "ねっとわーく", "せきゅりてぃ", "ぷらいばしー",
		},
		// ラウンド4: 9-12文字の長い専門用語・カタカナ語
		4: []string{
			"いんふらすとらくちゃー", "あーきてくちゃー", "あるごりずむ",
			"ぷろぐらみんぐげんご", "でーたさいえんす", "あーてぃふぃしゃるいんてりじぇんす",
			"まちーんらーにんぐ", "でぃーぷらーにんぐ", "ぶろっくちぇーん",
			"くらうどこんぴゅーてぃんぐ", "いんたーねっとおぶしんぐす",
			"ばーちゃるりありてぃ", "おーぐめんてっどりありてぃ",
			"さいばーせきゅりてぃ", "くりぷとかれんしー",
		},
		// ラウンド5: 13文字以上の超長単語・文章
		5: []string{
			"じんこうちのうぎじゅつしゃ", "きかいがくしゅう", "でぃーぷらーにんぐ",
			"しぜんげんごしょり", "こんぴゅーたーびじょん", "でーたさいえんす",
			"くらうどこんぴゅーてぃんぐ", "いんたーねっとおぶしんぐす", "ばーちゃるりありてぃ",
			"おーぐめんてっどりありてぃ", "そふとうぇあえんじにありんぐ", "しすてむあどみにすとれーしょん",
			"ねっとわーくえんじにありんぐ", "でーたべーすあどみにすとれーしょん", "ふるすたっくでべろっぷめんと",
			"ゆーざーえくすぺりえんすでざいん", "でじたるまーけてぃんぐすぺしゃりすと",
			"びじねすいんてりじぇんすあなりすと", "くらうどそりゅーしょんあーきてくと",
		},
	},
	"en": {
		// ラウンド1: 3-4文字の基本単語
		1: []string{
			"cat", "dog", "sun", "moon", "star", "tree", "book", "car",
			"home", "road", "fish", "bird", "hand", "foot", "head", "eye",
			"red", "blue", "big", "small", "hot", "cold", "new", "old",
			"good", "bad", "fast", "slow", "high", "low", "near", "far",
		},
		// ラウンド2: 5-7文字の日常単語
		2: []string{
			"school", "hospital", "library", "market", "office", "garden",
			"kitchen", "bedroom", "bathroom", "window", "computer", "phone",
			"breakfast", "lunch", "dinner", "weather", "season", "holiday",
			"birthday", "weekend", "morning", "evening", "student", "teacher",
		},
		// ラウンド3: 8-10文字の複合語・専門用語
		3: []string{
			"programmer", "designer", "engineer", "manager", "consultant",
			"developer", "architect", "scientist", "researcher", "professor",
			"internet", "smartphone", "application", "database", "network",
			"security", "privacy", "algorithm", "software", "hardware",
			"technology", "innovation", "automation", "digitalization",
		},
		// ラウンド4: 11-15文字の長い専門用語
		4: []string{
			"infrastructure", "architecture", "programming", "development",
			"administration", "configuration", "optimization", "integration",
			"implementation", "documentation", "authentication", "authorization",
			"cryptocurrency", "blockchain", "cybersecurity", "virtualization",
			"containerization", "microservices", "scalability", "reliability",
		},
		// ラウンド5: 16文字以上の超長単語・複合語
		5: []string{
			"artificial intelligence", "machine learning", "deep learning",
			"natural language processing", "computer vision", "data science",
			"cloud computing", "internet of things", "virtual reality",
			"augmented reality", "software engineering", "system administration",
			"network engineering", "database administration", "full stack development",
			"user experience design", "digital marketing specialist",
			"business intelligence analyst", "cloud solution architect",
		},
	},
}

// 特殊単語
var specialWords = map[string]map[string]map[int][]string{
	"jp": {
		"bonus": {
			1: []string{"ぼーなす", "らっきー", "すぺしゃる"},
			2: []string{"ぱーふぇくと", "えくせれんと", "すーぱー"},
			3: []string{"あめいじんぐ", "ふぁんたすてぃっく", "いんくれでぃぶる"},
			4: []string{"えくすとらおーでぃなりー", "すぺくたきゅらー", "まぐにふぃせんと"},
			5: []string{"えくすとらおーでぃなりーあちーぶめんと", "すーぱーかりふらじりすてぃっく"},
		},
		"debuff": {
			1: []string{"とらっぷ", "でんじゃー", "はーど"},
			2: []string{"えくすとりーむ", "いんぽっしぶる", "でぃふぃかると"},
			3: []string{"ちゃれんじんぐ", "こんぷりけーてっど", "いんてんす"},
			4: []string{"いんこんぷりへんしぶる", "あんぷれでぃくたぶる", "いんえくすとりけーぶる"},
			5: []string{"いんこんせいばぶりーあんこんぷりへんしぶる", "あんてぃでぃせすたぶりっしゅめんたりあにずむ"},
		},
	},
	"en": {
		"bonus": {
			1: []string{"bonus", "lucky", "special"},
			2: []string{"perfect", "excellent", "super"},
			3: []string{"amazing", "fantastic", "incredible"},
			4: []string{"extraordinary", "spectacular", "magnificent"},
			5: []string{"supercalifragilisticexpialidocious", "extraordinaryachievement"},
		},
		"debuff": {
			1: []string{"trap", "danger", "hard"},
			2: []string{"extreme", "impossible", "difficult"},
			3: []string{"challenging", "complicated", "intense"},
			4: []string{"incomprehensible", "unpredictable", "inextricable"},
			5: []string{"antidisestablishmentarianism", "pneumonoultramicroscopicsilicovolcanoconiosiss"},
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
	tableName := os.Getenv("WORDS_TABLE_NAME")
	if tableName == "" {
		tableName = "typing-game-words" // デフォルト値
	}

	fmt.Printf("Adding difficulty words to table: %s\n", tableName)

	// カテゴリーリスト
	categories := []string{"beginner_words", "intermediate_words", "beginner_conversation", "intermediate_conversation"}

	for _, category := range categories {
		fmt.Printf("\nProcessing category: %s\n", category)

		for language, rounds := range difficultyWords {
			fmt.Printf("  Language: %s\n", language)

			for round, words := range rounds {
				fmt.Printf("    Round %d: %d words\n", round, len(words))

				// 通常単語を追加
				for i, word := range words {
					wordItem := WordItem{
						Category: category,
						WordID:   fmt.Sprintf("%s_%s_%d_%03d", category, language, round, i+1),
						Word:     word,
						Round:    round,
						Type:     "normal",
						Language: language,
					}

					err := addWordToDynamoDB(dynamoClient, tableName, wordItem)
					if err != nil {
						log.Printf("Failed to add word %s: %v", word, err)
					}
				}

				// 特殊単語を追加
				if specialLang, exists := specialWords[language]; exists {
					// ボーナス単語
					if bonusWords, exists := specialLang["bonus"][round]; exists {
						for i, word := range bonusWords {
							wordItem := WordItem{
								Category: category,
								WordID:   fmt.Sprintf("%s_%s_%d_bonus_%03d", category, language, round, i+1),
								Word:     word,
								Round:    round,
								Type:     "bonus",
								Language: language,
							}

							err := addWordToDynamoDB(dynamoClient, tableName, wordItem)
							if err != nil {
								log.Printf("Failed to add bonus word %s: %v", word, err)
							}
						}
					}

					// デバフ単語
					if debuffWords, exists := specialLang["debuff"][round]; exists {
						for i, word := range debuffWords {
							wordItem := WordItem{
								Category: category,
								WordID:   fmt.Sprintf("%s_%s_%d_debuff_%03d", category, language, round, i+1),
								Word:     word,
								Round:    round,
								Type:     "debuff",
								Language: language,
							}

							err := addWordToDynamoDB(dynamoClient, tableName, wordItem)
							if err != nil {
								log.Printf("Failed to add debuff word %s: %v", word, err)
							}
						}
					}
				}
			}
		}
	}

	fmt.Println("\nDifficulty words addition completed!")
}

func addWordToDynamoDB(client *dynamodb.Client, tableName string, word WordItem) error {
	// WordItemをDynamoDB形式にマーシャル
	av, err := attributevalue.MarshalMap(word)
	if err != nil {
		return fmt.Errorf("failed to marshal word item: %w", err)
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