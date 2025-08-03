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
	Type     string `dynamodbav:"type"`
}

// 単語データ
var FOOD_WORDS = map[int][]string{
	1: {
		"うどん", "そば", "すし", "ぱん", "みそ", "のり", "たまご", "みず",
		"ちゃ", "こめ", "にく", "さかな", "やさい", "くだもの", "びーる",
		"わいん", "こーひー", "じゅーす", "みるく", "よーぐると",
	},
	2: {
		"らーめん", "てんぷら", "やきとり", "おにぎり", "かれー", "ぴざ",
		"ぱすた", "さらだ", "すーぷ", "けーき", "あいす", "ちょこれーと",
		"くっきー", "どーなつ", "ぷりん", "はんばーがー", "ふらいどちきん",
		"おむれつ", "ぐらたん", "りぞっと", "ぱえりあ", "たぴおか",
	},
	3: {
		"おこのみやき", "たこやき", "やきにく", "しゃぶしゃぶ", "すきやき",
		"ちらしずし", "かつどん", "おやこどん", "てんどん", "うなぎどん",
		"ちゃーはん", "おむらいす", "なぽりたん", "みーとそーす",
		"かるぼなーら", "ぺぺろんちーの", "ちーずけーき", "しょーとけーき",
		"てぃらみす", "ぱんなこった", "くれーむぶりゅれ", "まかろん",
		"えくれあ", "みるふぃーゆ", "ろーるけーき", "もんぶらん",
	},
	4: {
		"れいぞうこ", "せんたくき", "でんしれんじ", "えあこん", "てれび", "らじお",
		"そうじき", "すいはんき", "とーすたー", "どらいやー", "あいろん", "でんきぽっと",
		"こーひーめーかー", "じゅーさーみきさー", "ほっとぷれーと", "おーぶんとーすたー",
		"でんきけとる", "ふーどぷろせっさー", "はんどみきさー", "よーぐるとめーかー",
		"あいすくりーむめーかー", "ぱんやきき", "たこやきき", "ほっとさんどめーかー",
		"でんきぐりる", "すちーむおーぶん", "でんきなべ", "いんだくしょんひーたー",
	},
	5: {
		"おひつじざ", "おうしざ", "ふたござ", "かにざ", "ししざ", "おとめざ",
		"てんびんざ", "さそりざ", "いてざ", "やぎざ", "みずがめざ", "うおざ",
		"はくちょうざ", "わしざ", "こぐまざ", "おおぐまざ", "りゅうざ",
		"ぺがすすざ", "あんどろめだざ", "かしおぺあざ", "おりおんざ",
		"こいぬざ", "おおいぬざ", "うさぎざ", "はとざ", "からすざ",
		"きりんざ", "ろくぶんぎざ", "ぼうえんきょうざ", "とけいざ", "みなみじゅうじざ",
	},
}

var SPECIAL_WORDS = map[string][]string{
	"bonus":  {"ぼーなす", "らっきー", "ぱーふぇくと", "すぺしゃる"},
	"debuff": {"とらっぷ", "でんじゃー", "はーど", "えくすとりーむ"},
}

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run init-words.go <WORDS_TABLE_NAME>")
	}

	tableName := os.Args[1]

	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("Failed to load AWS config: %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	// 通常の単語を挿入
	for round, words := range FOOD_WORDS {
		for i, word := range words {
			item := WordItem{
				Category: "food",
				WordID:   fmt.Sprintf("food_%d_%03d", round, i+1),
				Word:     word,
				Round:    round,
				Type:     "normal",
			}

			av, err := attributevalue.MarshalMap(item)
			if err != nil {
				log.Printf("Failed to marshal word item %s: %v", word, err)
				continue
			}

			_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
				TableName: aws.String(tableName),
				Item:      av,
			})

			if err != nil {
				log.Printf("Failed to put word item %s: %v", word, err)
			} else {
				log.Printf("Added word: %s (Round %d)", word, round)
			}
		}
	}

	// 特殊単語を挿入
	for wordType, words := range SPECIAL_WORDS {
		for i, word := range words {
			item := WordItem{
				Category: "special",
				WordID:   fmt.Sprintf("special_%s_%03d", wordType, i+1),
				Word:     word,
				Round:    0, // 特殊単語は全ラウンドで使用
				Type:     wordType,
			}

			av, err := attributevalue.MarshalMap(item)
			if err != nil {
				log.Printf("Failed to marshal special word item %s: %v", word, err)
				continue
			}

			_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
				TableName: aws.String(tableName),
				Item:      av,
			})

			if err != nil {
				log.Printf("Failed to put special word item %s: %v", word, err)
			} else {
				log.Printf("Added special word: %s (%s)", word, wordType)
			}
		}
	}

	log.Println("Word initialization completed!")
}