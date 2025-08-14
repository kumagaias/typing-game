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

type WordItem struct {
	Category string `dynamodbav:"category"`
	WordID   string `dynamodbav:"word_id"`
	Word     string `dynamodbav:"word"`
	Round    int    `dynamodbav:"round"`
	Type     string `dynamodbav:"type"`
	Language string `dynamodbav:"language"`
}

// 拡充された単語データ
var EXPANDED_WORDS = map[string]map[int]map[string][]string{
	"beginner_words": {
		1: {
			"jp": {
				"みず", "たべもの", "のみもの", "いえ", "がっこう", "しごと", "ともだち", "かぞく", "いぬ", "ねこ",
				"くるま", "でんしゃ", "ほん", "えいが", "おんがく", "てんき", "あめ", "ゆき", "はな", "き",
				"やま", "うみ", "かわ", "そら", "つき", "ひ", "よる", "あさ", "ひる", "ばん",
				"きょう", "あした", "きのう", "らいしゅう", "せんしゅう", "つき", "ねん", "じかん", "ふん", "びょう",
				"おおきい", "ちいさい", "たかい", "やすい", "あたらしい", "ふるい", "きれい", "きたない", "おいしい", "まずい",
			},
			"en": {
				"water", "food", "drink", "house", "school", "work", "friend", "family", "dog", "cat",
				"car", "train", "book", "movie", "music", "weather", "rain", "snow", "flower", "tree",
				"mountain", "sea", "river", "sky", "moon", "sun", "night", "morning", "noon", "evening",
				"today", "tomorrow", "yesterday", "next week", "last week", "month", "year", "time", "minute", "second",
				"big", "small", "expensive", "cheap", "new", "old", "beautiful", "dirty", "delicious", "bad taste",
			},
		},
		2: {
			"jp": {
				"びょういん", "くすりや", "ぎんこう", "ゆうびんきょく", "こうばん", "としょかん", "びじゅつかん", "はくぶつかん", "こうえん", "えき",
				"くうこう", "ほてる", "れすとらん", "かふぇ", "こんびに", "すーぱー", "でぱーと", "やくざいし", "いしゃ", "かんごし",
				"せんせい", "がくせい", "かいしゃいん", "てんいん", "うんてんしゅ", "けいさつかん", "しょうぼうし", "りょうりにん", "びようし", "でんきや",
				"みぎ", "ひだり", "まえ", "うしろ", "うえ", "した", "なか", "そと", "となり", "ちかく",
				"とおく", "きた", "みなみ", "ひがし", "にし", "あか", "あお", "きいろ", "みどり", "しろ",
			},
			"en": {
				"hospital", "pharmacy", "bank", "post office", "police box", "library", "art museum", "museum", "park", "station",
				"airport", "hotel", "restaurant", "cafe", "convenience store", "supermarket", "department store", "pharmacist", "doctor", "nurse",
				"teacher", "student", "office worker", "clerk", "driver", "police officer", "firefighter", "chef", "hairdresser", "electrician",
				"right", "left", "front", "back", "up", "down", "inside", "outside", "next to", "near",
				"far", "north", "south", "east", "west", "red", "blue", "yellow", "green", "white",
			},
		},
		3: {
			"jp": {
				"けんこう", "びょうき", "くすり", "ちりょう", "しんさつ", "よやく", "かいぎ", "しゅっちょう", "ざんぎょう", "きゅうか",
				"しゅみ", "すぽーつ", "りょこう", "かいもの", "りょうり", "せんたく", "そうじ", "べんきょう", "しゅくだい", "しけん",
				"そつぎょう", "にゅうがく", "しゅうしょく", "けっこん", "りこん", "たんじょうび", "くりすます", "しんねん", "なつやすみ", "ふゆやすみ",
				"はるやすみ", "ごーるでんうぃーく", "おぼん", "しちごさん", "せいじんしき", "けいざい", "せいじ", "ぶんか", "れきし", "かがく",
				"ぎじゅつ", "こんぴゅーたー", "いんたーねっと", "すまーとふぉん", "あぷり", "そふとうぇあ", "はーどうぇあ", "でーた", "ふぁいる", "めーる",
			},
			"en": {
				"health", "illness", "medicine", "treatment", "examination", "appointment", "meeting", "business trip", "overtime", "vacation",
				"hobby", "sports", "travel", "shopping", "cooking", "laundry", "cleaning", "study", "homework", "exam",
				"graduation", "entrance", "employment", "marriage", "divorce", "birthday", "christmas", "new year", "summer vacation", "winter vacation",
				"spring vacation", "golden week", "obon", "shichi-go-san", "coming of age ceremony", "economy", "politics", "culture", "history", "science",
				"technology", "computer", "internet", "smartphone", "app", "software", "hardware", "data", "file", "email",
			},
		},
	},
	"intermediate_words": {
		1: {
			"jp": {
				"かんきょう", "おんだんか", "こうがい", "りさいくる", "しぜん", "どうぶつ", "しょくぶつ", "せいたいけい", "ちきゅう", "うちゅう",
				"わくせい", "ほし", "ぎんが", "たいよう", "つき", "きせつ", "きこう", "たいふう", "じしん", "つなみ",
				"かざん", "こうずい", "かんばつ", "おんしつこうか", "さんせいう", "たいきおせん", "すいしつおだく", "どじょうおせん", "そうおん", "でんじは",
				"ほうしゃのう", "げんしりょく", "さいせいかのうえねるぎー", "たいようこう", "ふうりょく", "すいりょく", "ちねつ", "ばいおます", "すいそ", "でんき",
				"がそりん", "せきゆ", "てんねんがす", "せきたん", "うらん", "げんしりょくはつでん", "かりょくはつでん", "すいりょくはつでん", "ふうりょくはつでん", "たいようこうはつでん",
			},
			"en": {
				"environment", "global warming", "pollution", "recycle", "nature", "animal", "plant", "ecosystem", "earth", "space",
				"planet", "star", "galaxy", "sun", "moon", "season", "climate", "typhoon", "earthquake", "tsunami",
				"volcano", "flood", "drought", "greenhouse effect", "acid rain", "air pollution", "water pollution", "soil contamination", "noise", "electromagnetic waves",
				"radiation", "nuclear power", "renewable energy", "solar power", "wind power", "hydroelectric power", "geothermal", "biomass", "hydrogen", "electricity",
				"gasoline", "petroleum", "natural gas", "coal", "uranium", "nuclear power generation", "thermal power generation", "hydroelectric generation", "wind power generation", "solar power generation",
			},
		},
		2: {
			"jp": {
				"じんこうちのう", "きかいがくしゅう", "びっぐでーた", "くらうど", "いんたーねっとおぶしんぐす", "ぶろっくちぇーん", "かそうつうか", "さいばーせきゅりてぃ", "はっきんぐ", "ふぃっしんぐ",
				"まるうぇあ", "らんさむうぇあ", "ふぁいあうぉーる", "あんちういるす", "ばっくあっぷ", "くらうどこんぴゅーてぃんぐ", "えっじこんぴゅーてぃんぐ", "くぁんたむこんぴゅーてぃんぐ", "ばーちゃるりありてぃ", "おーぐめんてっどりありてぃ",
				"みっくすどりありてぃ", "ほろぐらむ", "さんでぃーぷりんたー", "ろぼっと", "どろーん", "じどううんてん", "でんきじどうしゃ", "はいぶりっどかー", "ねんりょうでんち", "りちうむいおんでんち",
				"たいようでんち", "ふうりょくはつでん", "すいりょくはつでん", "げんしりょくはつでん", "かりょくはつでん", "ばいおてくのろじー", "いでんしそうさ", "くろーん", "さいぼうばいよう", "いりょうようろぼっと",
				"てれめでぃしん", "あいぴーえす", "えむあーるあい", "しーてぃー", "えっくすせん", "ないないしきょう", "ちょうおんぱ", "れんとげん", "がんま", "べーた",
			},
			"en": {
				"artificial intelligence", "machine learning", "big data", "cloud", "internet of things", "blockchain", "cryptocurrency", "cybersecurity", "hacking", "phishing",
				"malware", "ransomware", "firewall", "antivirus", "backup", "cloud computing", "edge computing", "quantum computing", "virtual reality", "augmented reality",
				"mixed reality", "hologram", "3d printer", "robot", "drone", "autonomous driving", "electric vehicle", "hybrid car", "fuel cell", "lithium ion battery",
				"solar cell", "wind power generation", "hydroelectric generation", "nuclear power generation", "thermal power generation", "biotechnology", "genetic manipulation", "clone", "cell culture", "medical robot",
				"telemedicine", "ips", "mri", "ct", "x-ray", "endoscopy", "ultrasound", "x-ray", "gamma", "beta",
			},
		},
	},
	"beginner_conversation": {
		1: {
			"jp": {
				"おはよう", "こんにちは", "こんばんは", "おやすみ", "はじめまして", "よろしく", "ありがとう", "すみません", "ごめんなさい", "いいえ",
				"はい", "わかりました", "わかりません", "もういちど", "ゆっくり", "おねがいします", "だいじょうぶ", "げんき", "つかれた", "おなかすいた",
				"のどかわいた", "あつい", "さむい", "いたい", "たのしい", "うれしい", "かなしい", "こわい", "びっくり", "いそがしい",
				"ひま", "たいへん", "らく", "むずかしい", "やさしい", "おもしろい", "つまらない", "きれい", "かわいい", "かっこいい",
				"すてき", "すごい", "やばい", "まじ", "えー", "うそ", "ほんと", "そうですね", "そうですか", "どうぞ",
			},
			"en": {
				"good morning", "hello", "good evening", "good night", "nice to meet you", "please treat me well", "thank you", "excuse me", "sorry", "no",
				"yes", "i understand", "i don't understand", "once more", "slowly", "please", "it's okay", "healthy", "tired", "hungry",
				"thirsty", "hot", "cold", "painful", "fun", "happy", "sad", "scary", "surprised", "busy",
				"free", "difficult", "easy", "difficult", "easy", "interesting", "boring", "beautiful", "cute", "cool",
				"wonderful", "amazing", "dangerous", "really", "eh", "lie", "really", "that's right", "is that so", "please go ahead",
			},
		},
		2: {
			"jp": {
				"いくらですか", "たかいです", "やすいです", "まけて", "かいます", "かいません", "みせて", "これください", "あれください", "どれですか",
				"どこですか", "いつですか", "だれですか", "なんですか", "なぜですか", "どうですか", "どうやって", "どのくらい", "いくつ", "なんじ",
				"なんようび", "なんがつ", "なんねん", "どこから", "どこまで", "いっしょに", "ひとりで", "みんなで", "てつだって", "おしえて",
				"かして", "まって", "いそいで", "ゆっくり", "きをつけて", "がんばって", "おつかれさま", "いってきます", "いってらっしゃい", "ただいま",
				"おかえり", "いただきます", "ごちそうさま", "おやすみなさい", "しつれいします", "おじゃまします", "おじゃましました", "おせわになりました", "ありがとうございました", "どういたしまして",
			},
			"en": {
				"how much is it", "it's expensive", "it's cheap", "discount please", "i'll buy it", "i won't buy it", "show me", "this please", "that please", "which one",
				"where", "when", "who", "what", "why", "how", "how to", "how much", "how many", "what time",
				"what day", "what month", "what year", "from where", "to where", "together", "alone", "everyone", "help me", "teach me",
				"lend me", "wait", "hurry", "slowly", "be careful", "good luck", "good work", "i'm going", "take care", "i'm back",
				"welcome back", "let's eat", "thank you for the meal", "good night", "excuse me", "excuse me for intruding", "thank you for having me", "thank you for your help", "thank you very much", "you're welcome",
			},
		},
		3: {
			"jp": {
				"きょうはいいてんきですね", "あしたあめですか", "さむくなりましたね", "あつくなりましたね", "はるですね", "なつですね", "あきですね", "ふゆですね", "さくらがきれいですね", "もみじがきれいですね",
				"ゆきがふっていますね", "かぜがつよいですね", "たいふうがきますね", "じしんがありましたね", "でんしゃがおくれています", "みちがこんでいます", "しんごうがあかです", "みどりになりました", "みぎにまがって", "ひだりにまがって",
				"まっすぐいって", "つぎのかどで", "しんごうで", "はしをわたって", "かいだんをのぼって", "えれべーたーで", "えすかれーたーで", "にかいに", "ちかいちに", "となりのたてもの",
				"むかいのたてもの", "ちかくのこんびに", "えきのまえ", "がっこうのうしろ", "びょういんのとなり", "ぎんこうのむかい", "こうえんのなか", "としょかんのちかく", "ほてるのよこ", "れすとらんのうえ",
				"かふぇのした", "すーぱーのまえ", "でぱーとのなか", "くうこうまで", "えきまで", "いえまで", "がっこうまで", "かいしゃまで", "びょういんまで", "やくざいしまで",
			},
			"en": {
				"nice weather today", "will it rain tomorrow", "it's gotten cold", "it's gotten hot", "it's spring", "it's summer", "it's autumn", "it's winter", "the cherry blossoms are beautiful", "the autumn leaves are beautiful",
				"it's snowing", "the wind is strong", "a typhoon is coming", "there was an earthquake", "the train is delayed", "the road is congested", "the traffic light is red", "it turned green", "turn right", "turn left",
				"go straight", "at the next corner", "at the traffic light", "cross the bridge", "go up the stairs", "by elevator", "by escalator", "to the second floor", "to the basement", "the next building",
				"the building across", "nearby convenience store", "in front of the station", "behind the school", "next to the hospital", "across from the bank", "inside the park", "near the library", "beside the hotel", "above the restaurant",
				"below the cafe", "in front of the supermarket", "inside the department store", "to the airport", "to the station", "to home", "to school", "to the company", "to the hospital", "to the pharmacy",
			},
		},
	},
	"intermediate_conversation": {
		1: {
			"jp": {
				"おひさしぶりです", "げんきでしたか", "おかげさまで", "いかがですか", "どうされましたか", "なにかありましたか", "しんぱいしています", "だいじょうぶでしょうか", "てつだいましょうか", "なにかできることは",
				"もうしわけありません", "しつれいいたします", "おじゃまいたします", "ありがとうございます", "どういたしまして", "きにしないでください", "きをつかわないで", "えんりょしないで", "りらっくすして", "ゆっくりして",
				"じかんがありません", "いそいでいます", "まにあいません", "おくれそうです", "さきにいきます", "あとでれんらくします", "でんわします", "めーるします", "らいんします", "かえりにかいものします",
				"ついでにいきます", "よりみちします", "まわりみちします", "ちかみちします", "はやみちします", "きょうはありがとうございました", "たのしかったです", "べんきょうになりました", "いいけいけんでした", "またおねがいします",
				"こんどいっしょに", "こんどごはんたべましょう", "こんどのみにいきましょう", "こんどえいがみましょう", "こんどかいものしましょう", "らいしゅうはどうですか", "らいげつはどうですか", "つごうはどうですか", "じかんはありますか", "よていはありますか",
			},
			"en": {
				"long time no see", "how have you been", "thanks to you", "how are things", "what happened", "did something happen", "i'm worried", "will it be okay", "shall i help", "is there anything i can do",
				"i'm very sorry", "excuse me", "excuse me for intruding", "thank you very much", "you're welcome", "please don't worry about it", "don't worry about it", "don't hesitate", "relax", "take your time",
				"i don't have time", "i'm in a hurry", "i won't make it", "i might be late", "i'll go ahead", "i'll contact you later", "i'll call you", "i'll email you", "i'll line you", "i'll shop on the way back",
				"i'll go while i'm at it", "i'll drop by", "i'll take a detour", "i'll take a shortcut", "i'll take the quick way", "thank you for today", "it was fun", "it was educational", "it was a good experience", "please again",
				"together next time", "let's eat together next time", "let's drink together next time", "let's watch a movie next time", "let's shop next time", "how about next week", "how about next month", "how is your schedule", "do you have time", "do you have plans",
			},
		},
	},
}

func
 main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run expand-categories.go <WORDS_TABLE_NAME>")
	}

	tableName := os.Args[1]

	// AWS設定を読み込み
	cfg, err := config.LoadDefaultConfig(context.TODO(), config.WithRegion("ap-northeast-1"))
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	client := dynamodb.NewFromConfig(cfg)

	fmt.Printf("Expanding categories in table: %s\n", tableName)

	totalWords := 0
	for category, rounds := range EXPANDED_WORDS {
		fmt.Printf("Adding category: %s\n", category)
		
		for round, languages := range rounds {
			for language, words := range languages {
				fmt.Printf("  Round %d, Language %s: %d words\n", round, language, len(words))
				
				for i, word := range words {
					wordID := fmt.Sprintf("%s_%s_%d_%03d", category, language, round, i+1)
					
					wordItem := WordItem{
						Category: category,
						WordID:   wordID,
						Word:     word,
						Round:    round,
						Type:     "normal",
						Language: language,
					}

					item, err := attributevalue.MarshalMap(wordItem)
					if err != nil {
						log.Printf("Failed to marshal word item: %v", err)
						continue
					}

					_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
						TableName: aws.String(tableName),
						Item:      item,
					})

					if err != nil {
						log.Printf("Failed to add word %s: %v", word, err)
					} else {
						totalWords++
						if totalWords%50 == 0 {
							fmt.Printf("Added %d words...\n", totalWords)
						}
					}

					// レート制限を避けるため少し待機
					time.Sleep(20 * time.Millisecond)
				}
			}
		}
	}

	// 特殊単語を追加
	fmt.Println("Adding special words...")
	specialWords := map[string]map[string][]string{
		"jp": {
			"bonus": {"ぼーなす", "らっきー", "ぱーふぇくと", "すぺしゃる"},
			"debuff": {"とらっぷ", "でんじゃー", "はーど", "えくすとりーむ"},
		},
		"en": {
			"bonus": {"bonus", "lucky", "perfect", "special"},
			"debuff": {"trap", "danger", "hard", "extreme"},
		},
	}

	for language, types := range specialWords {
		for wordType, words := range types {
			for i, word := range words {
				wordID := fmt.Sprintf("special_%s_%s_%03d", language, wordType, i+1)
				
				wordItem := WordItem{
					Category: "special",
					WordID:   wordID,
					Word:     word,
					Round:    0,
					Type:     wordType,
					Language: language,
				}

				item, err := attributevalue.MarshalMap(wordItem)
				if err != nil {
					log.Printf("Failed to marshal special word item: %v", err)
					continue
				}

				_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
					TableName: aws.String(tableName),
					Item:      item,
				})

				if err != nil {
					log.Printf("Failed to add special word %s: %v", word, err)
				} else {
					totalWords++
					fmt.Printf("Added %s special word: %s\n", wordType, word)
				}
			}
		}
	}

	fmt.Printf("Successfully added %d words!\n", totalWords)
	fmt.Println("Category expansion completed!")
}