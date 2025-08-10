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

// 基本的な翻訳マッピング（日本語→英語）
var basicTranslations = map[string]string{
	// 食べ物 - 基本
	"うどん": "udon", "そば": "soba", "すし": "sushi", "ぱん": "bread", "みそ": "miso",
	"のり": "seaweed", "たまご": "egg", "みず": "water", "ちゃ": "tea", "こめ": "rice",
	"さけ": "salmon", "まぐろ": "tuna", "えび": "shrimp", "かに": "crab", "いか": "squid",
	"たこ": "octopus", "あじ": "horse mackerel", "さば": "mackerel", "いわし": "sardine", "さんま": "saury",
	"ぶり": "yellowtail", "ひらめ": "flounder", "たい": "sea bream", "あなご": "conger eel", "うなぎ": "eel",
	"かつお": "bonito", "ます": "trout", "あゆ": "sweetfish", "にしん": "herring", "こはだ": "gizzard shad",
	"あまえび": "sweet shrimp", "ほたて": "scallop", "あわび": "abalone", "うに": "sea urchin", "いくら": "salmon roe",
	"かずのこ": "herring roe", "たらこ": "cod roe", "めんたいこ": "spicy cod roe", "しらす": "whitebait", "ちりめんじゃこ": "dried baby sardines",
	"わかめ": "wakame", "こんぶ": "kelp", "ひじき": "hijiki", "もずく": "mozuku", "めかぶ": "mekabu",
	"とうふ": "tofu", "あぶらあげ": "fried tofu", "がんもどき": "ganmodoki", "ゆば": "yuba", "なっとう": "natto",
	"みそしる": "miso soup", "すいもの": "clear soup", "おすまし": "clear broth", "ぞうすい": "rice porridge", "おかゆ": "rice gruel",
	"おにぎり": "rice ball", "おむすび": "rice ball", "いなりずし": "inari sushi", "ちらしずし": "chirashi sushi", "まきずし": "maki sushi",
	"てまきずし": "hand roll", "にぎりずし": "nigiri sushi", "かっぱまき": "cucumber roll", "てっかまき": "tuna roll", "ねぎとろ": "minced tuna with green onion",
	
	// 食べ物 - 料理
	"らーめん": "ramen", "てんぷら": "tempura", "やきとり": "yakitori", "かれー": "curry", "ぴざ": "pizza",
	"ぱすた": "pasta", "さらだ": "salad", "すーぷ": "soup", "けーき": "cake", "あいすくりーむ": "ice cream",
	"おこのみやき": "okonomiyaki", "たこやき": "takoyaki", "やきにく": "yakiniku", "しゃぶしゃぶ": "shabu-shabu", "すきやき": "sukiyaki",
	"かつどん": "katsudon", "おやこどん": "oyakodon", "てんどん": "tendon", "うなぎどん": "unagidon", "ぎゅうどん": "gyudon",
	"ちゃーはん": "fried rice", "やきそば": "yakisoba", "おでん": "oden", "なべ": "hot pot", "しちゅー": "stew",
	
	// 乗り物 - 基本
	"くるま": "car", "でんしゃ": "train", "ばす": "bus", "ひこうき": "airplane", "ふね": "ship",
	"じてんしゃ": "bicycle", "ばいく": "motorcycle", "たくしー": "taxi", "とらっく": "truck", "あんぶらんす": "ambulance",
	"しょうぼうしゃ": "fire truck", "ぱとかー": "police car", "きゅうきゅうしゃ": "ambulance", "ごみしゅうしゅうしゃ": "garbage truck", "うんそうしゃ": "delivery truck",
	"しんかんせん": "bullet train", "ちかてつ": "subway", "ろめんでんしゃ": "tram", "けーぶるかー": "cable car", "ろーぷうぇい": "ropeway",
	"ものれーる": "monorail", "とろりーばす": "trolley bus", "りむじん": "limousine", "すぽーつかー": "sports car", "おーとばい": "motorcycle",
	
	// 乗り物 - 航空機
	"じぇっとき": "jet fighter", "へりこぷたー": "helicopter", "ぐらいだー": "glider", "ぱらぐらいだー": "paraglider", "きゅうきゅうへり": "rescue helicopter",
	"しょうぼうへり": "fire helicopter", "ぽりすへり": "police helicopter", "どくたーへり": "medical helicopter", "かーごせん": "cargo ship", "くるーずせん": "cruise ship",
	
	// 駅名 - 主要駅
	"とうきょう": "tokyo", "しんじゅく": "shinjuku", "しぶや": "shibuya", "いけぶくろ": "ikebukuro", "うえの": "ueno",
	"あきはばら": "akihabara", "ぎんざ": "ginza", "はらじゅく": "harajuku", "おおさか": "osaka", "きょうと": "kyoto",
	"こうべ": "kobe", "なごや": "nagoya", "よこはま": "yokohama", "ちば": "chiba", "さいたま": "saitama",
	"ひろしま": "hiroshima", "ふくおか": "fukuoka", "せんだい": "sendai", "さっぽろ": "sapporo", "にいがた": "niigata",
	"かなざわ": "kanazawa", "しずおか": "shizuoka", "はままつ": "hamamatsu", "ぎふ": "gifu", "つ": "tsu",
	"おおつ": "otsu", "なら": "nara", "わかやま": "wakayama", "とっとり": "tottori", "まつえ": "matsue",
	"おかやま": "okayama", "やまぐち": "yamaguchi", "とくしま": "tokushima", "たかまつ": "takamatsu", "まつやま": "matsuyama",
	"こうち": "kochi", "おおいた": "oita", "みやざき": "miyazaki", "かごしま": "kagoshima", "なは": "naha",
	"あおもり": "aomori", "もりおか": "morioka", "あきた": "akita", "やまがた": "yamagata", "ふくしま": "fukushima",
	"みと": "mito", "うつのみや": "utsunomiya", "まえばし": "maebashi", "こうふ": "kofu", "ながの": "nagano",
	"とやま": "toyama", "ふくい": "fukui", "すが": "tsuruga", "おおがき": "ogaki", "よっかいち": "yokkaichi",
	
	// 特殊単語
	"ぼーなす": "bonus", "らっきー": "lucky", "ぱーふぇくと": "perfect", "すぺしゃる": "special",
	"とらっぷ": "trap", "でんじゃー": "danger", "はーど": "hard", "えくすとりーむ": "extreme",
}

// 英語→日本語の逆マッピングを生成
func reverseMap(m map[string]string) map[string]string {
	reversed := make(map[string]string)
	for k, v := range m {
		reversed[v] = k
	}
	return reversed
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

	fmt.Println("Adding missing translations...")

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

	// 既存の翻訳を取得
	fmt.Println("Fetching existing translations...")
	translationsScanInput := &dynamodb.ScanInput{
		TableName: aws.String(translationsTableName),
	}

	translationsResult, err := client.Scan(context.TODO(), translationsScanInput)
	if err != nil {
		log.Fatalf("Failed to scan translations table: %v", err)
	}

	var existingTranslations []TranslationItem
	err = attributevalue.UnmarshalListOfMaps(translationsResult.Items, &existingTranslations)
	if err != nil {
		log.Fatalf("Failed to unmarshal translations: %v", err)
	}

	// 既存翻訳のマップを作成
	existingMap := make(map[string]bool)
	for _, translation := range existingTranslations {
		key := translation.WordID + "_" + translation.Language
		existingMap[key] = true
	}

	fmt.Printf("Found %d existing translations\n", len(existingTranslations))

	// 英語→日本語の逆マッピングを作成
	enToJp := reverseMap(basicTranslations)

	// 翻訳を追加
	var newTranslations []TranslationItem
	now := time.Now().Format(time.RFC3339)

	for _, word := range words {
		if word.Language == "jp" {
			// 日本語単語の英語翻訳を追加
			key := word.WordID + "_en"
			if !existingMap[key] {
				if translation, exists := basicTranslations[word.Word]; exists {
					newTranslations = append(newTranslations, TranslationItem{
						WordID:      word.WordID,
						Language:    "en",
						Translation: translation,
						Category:    word.Category,
						CreatedAt:   now,
						UpdatedAt:   now,
					})
				}
			}
		} else if word.Language == "en" {
			// 英語単語の日本語翻訳を追加
			key := word.WordID + "_jp"
			if !existingMap[key] {
				if translation, exists := enToJp[word.Word]; exists {
					newTranslations = append(newTranslations, TranslationItem{
						WordID:      word.WordID,
						Language:    "jp",
						Translation: translation,
						Category:    word.Category,
						CreatedAt:   now,
						UpdatedAt:   now,
					})
				}
			}
		}
	}

	fmt.Printf("Prepared %d new translations\n", len(newTranslations))

	if len(newTranslations) == 0 {
		fmt.Println("No new translations to add")
		return
	}

	// バッチで翻訳を追加
	batchSize := 25 // DynamoDBのバッチ書き込み制限
	for i := 0; i < len(newTranslations); i += batchSize {
		end := i + batchSize
		if end > len(newTranslations) {
			end = len(newTranslations)
		}

		batch := newTranslations[i:end]
		
		// バッチ書き込みリクエストを作成
		var writeRequests []types.WriteRequest
		for _, translation := range batch {
			item, err := attributevalue.MarshalMap(translation)
			if err != nil {
				log.Printf("Failed to marshal translation: %v", err)
				continue
			}

			writeRequests = append(writeRequests, types.WriteRequest{
				PutRequest: &types.PutRequest{
					Item: item,
				},
			})
		}

		if len(writeRequests) > 0 {
			_, err := client.BatchWriteItem(context.TODO(), &dynamodb.BatchWriteItemInput{
				RequestItems: map[string][]types.WriteRequest{
					translationsTableName: writeRequests,
				},
			})

			if err != nil {
				log.Printf("Failed to batch write translations: %v", err)
			} else {
				fmt.Printf("Added batch %d-%d (%d translations)\n", i+1, end, len(writeRequests))
			}
		}

		// レート制限を避けるため少し待機
		time.Sleep(100 * time.Millisecond)
	}

	fmt.Printf("Successfully added %d new translations!\n", len(newTranslations))
	fmt.Println("Translation addition completed!")
}