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

// 単語データ - カテゴリー別
var WORD_CATEGORIES = map[string]map[int][]string{
	"food": {
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
		},
		4: {
			"えくれあ", "みるふぃーゆ", "ろーるけーき", "もんぶらん", "ばうむくーへん",
			"ちーずたると", "ふるーつたると", "しゅーくりーむ", "まどれーぬ",
			"ふぃなんしぇ", "かすてら", "どらやき", "たいやき", "いまがわやき",
			"みたらしだんご", "あんみつ", "ぜんざい", "しるこ", "わらびもち",
		},
		5: {
			"ちょこれーとふぁうんてん", "すとろべりーしょーとけーき", "もんぶらんたると",
			"てぃらみすけーき", "にゅーよーくちーずけーき", "れあちーずけーき",
			"ぱんなこったけーき", "くれーむぶりゅれたると", "まかろんたわー",
			"ふれんちとーすと", "ぱんけーきたわー", "わっふるあいす",
		},
	},
	"vehicle": {
		1: {
			"くるま", "でんしゃ", "ばす", "ひこうき", "ふね", "じてんしゃ",
			"ばいく", "たくしー", "とらっく", "あんぶらんす", "しょうぼうしゃ",
			"ぱとかー", "きゅうきゅうしゃ", "ごみしゅうしゅうしゃ",
		},
		2: {
			"しんかんせん", "ちかてつ", "ろめんでんしゃ", "けーぶるかー",
			"ろーぷうぇい", "ものれーる", "とろりーばす", "りむじん",
			"すぽーつかー", "おーとばい", "すくーたー", "せぐうぇい",
		},
		3: {
			"じぇっとき", "へりこぷたー", "ぐらいだー", "ぱらぐらいだー",
			"きゅうきゅうへり", "しょうぼうへり", "ぽりすへり", "どくたーへり",
			"かーごせん", "くるーずせん", "よっと", "もーたーぼーと",
		},
		4: {
			"すぺーすしゃとる", "ろけっと", "じんこうえいせい", "うちゅうすてーしょん",
			"すーぱーそにっくじぇっと", "こんこるど", "えあばすえーさんはちまる",
			"ぼーいんぐななよんなな", "えふじゅうごらいとにんぐ",
		},
		5: {
			"いんたーなしょなるすぺーすすてーしょん", "あぽろうちゅうせん",
			"すぺーすえっくすふぁるこんないん", "ぶるーおりじんにゅーしぇぱーど",
			"ばーじんぎゃらくてぃっくゆにてぃー", "すぺーすえっくすどらごん",
		},
	},
	"station": {
		1: {
			"とうきょう", "しんじゅく", "しぶや", "いけぶくろ", "うえの",
			"あきはばら", "ぎんざ", "はらじゅく", "おおさか", "きょうと",
			"こうべ", "なごや", "よこはま", "ちば", "さいたま",
		},
		2: {
			"しながわ", "はままつちょう", "たまち", "ゆらくちょう", "しんばし",
			"かんだ", "にっぽり", "たばた", "すがも", "おおつか",
			"いけぶくろ", "しんじゅく", "よよぎ", "はらじゅく", "えびす",
		},
		3: {
			"しんよこはま", "こうほく", "ひがしかながわ", "かながわしんまち",
			"つるみ", "なかやま", "ながつた", "みどり", "じゅうじょう",
			"ひがしじゅうじょう", "あかばね", "うぐいすだに", "にしにっぽり",
		},
		4: {
			"みなみうらわ", "さいたましんとしん", "おおみや", "つちうら",
			"ひたちなか", "みと", "うつのみや", "おやま", "こうのす",
			"くまがや", "ほんじょう", "たかさき", "まえばし", "きりゅう",
		},
		5: {
			"みなみあるぷすあぴこ", "ちゅうおうあるぷすかみこうち",
			"きたあるぷすかみたかち", "ふじさんごごうめ", "はこねゆもと",
			"あたみおんせん", "いとうおんせん", "しゅぜんじおんせん",
			"かわづなのはな", "しもだかいひん", "いずきゅうこう",
		},
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
	for category, rounds := range WORD_CATEGORIES {
		for round, words := range rounds {
			for i, word := range words {
				item := WordItem{
					Category: category,
					WordID:   fmt.Sprintf("%s_%d_%03d", category, round, i+1),
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
					log.Printf("Added word: %s (Category: %s, Round %d)", word, category, round)
				}
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