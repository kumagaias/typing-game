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
	Language string `dynamodbav:"language"`
}

// 単語データ - カテゴリー別（日本語）
var WORD_CATEGORIES_JP = map[string]map[int][]string{
	"food": {
		1: {
			// 基本的な食べ物・飲み物（60個）
			"うどん", "そば", "すし", "ぱん", "みそ", "のり", "たまご", "みず",
			"ちゃ", "こめ", "にく", "さかな", "やさい", "くだもの", "びーる",
			"わいん", "こーひー", "じゅーす", "みるく", "よーぐると",
			"しお", "さとう", "あぶら", "す", "しょうゆ", "みりん", "さけ",
			"とうふ", "なっとう", "みそしる", "おちゃ", "むぎちゃ", "こうちゃ",
			"ばたー", "ちーず", "はむ", "そーせーじ", "べーこん", "つな",
			"いか", "たこ", "えび", "かに", "ほたて", "あさり", "しじみ",
			"りんご", "みかん", "ばなな", "いちご", "ぶどう", "もも", "なし",
			"すいか", "めろん", "きうい", "ぱいん", "まんごー", "あぼかど",
		},
		2: {
			// 料理・デザート（66個）
			"らーめん", "てんぷら", "やきとり", "おにぎり", "かれー", "ぴざ",
			"ぱすた", "さらだ", "すーぷ", "けーき", "あいす", "ちょこれーと",
			"くっきー", "どーなつ", "ぷりん", "はんばーがー", "ふらいどちきん",
			"おむれつ", "ぐらたん", "りぞっと", "ぱえりあ", "たぴおか",
			"みそらーめん", "しおらーめん", "とんこつらーめん", "つけめん", "やきそば",
			"ちゃーしゅーめん", "わんたんめん", "たんめん", "ちゃんぽん", "うーめん",
			"そーめん", "ひやむぎ", "きしめん", "ほうとう", "いなりずし",
			"ちらしずし", "まきずし", "てまきずし", "かっぱまき", "てっかまき",
			"さーもんろーる", "かりふぉるにあろーる", "あなごずし", "うにずし", "いくらずし",
			"ぽてとさらだ", "まかろにさらだ", "しーざーさらだ", "こーるすろー", "わかめさらだ",
		},
		3: {
			// 日本料理・洋菓子（78個）
			"おこのみやき", "たこやき", "やきにく", "しゃぶしゃぶ", "すきやき",
			"ちらしずし", "かつどん", "おやこどん", "てんどん", "うなぎどん",
			"ちゃーはん", "おむらいす", "なぽりたん", "みーとそーす",
			"かるぼなーら", "ぺぺろんちーの", "ちーずけーき", "しょーとけーき",
			"てぃらみす", "ぱんなこった", "くれーむぶりゅれ", "まかろん",
			"ぎゅうどん", "ぶたどん", "とりどん", "かいせんどん", "ちらしどん",
			"てりやきどん", "そぼろどん", "ねぎとろどん", "まぐろどん", "さーもんどん",
			"はんばーぐ", "みーとぼーる", "びーふしちゅー", "ぽーくしちゅー", "くりーむしちゅー",
			"ぼるしち", "みねすとろーね", "こーんすーぷ", "おにおんすーぷ", "とまとすーぷ",
			"かぼちゃすーぷ", "きのこすーぷ", "ちきんすーぷ", "びーふすーぷ", "しーふーどすーぷ",
			"えびふらい", "あじふらい", "いかふらい", "かきふらい", "ひれかつ",
			"ろーすかつ", "ちきんかつ", "めんちかつ", "ころっけ", "かにくりーむころっけ",
			"えびかつ", "ふぃっしゅふらい", "からあげ", "てりやきちきん", "ちきんなんばん",
		},
		4: {
			// 洋菓子・和菓子（84個）
			"えくれあ", "みるふぃーゆ", "ろーるけーき", "もんぶらん", "ばうむくーへん",
			"ちーずたると", "ふるーつたると", "しゅーくりーむ", "まどれーぬ",
			"ふぃなんしぇ", "かすてら", "どらやき", "たいやき", "いまがわやき",
			"みたらしだんご", "あんみつ", "ぜんざい", "しるこ", "わらびもち",
			"すふれちーずけーき", "べいくどちーずけーき", "れあちーずけーき", "にゅーよーくちーずけーき",
			"ばすくちーずけーき", "ちょこれーとけーき", "がとーしょこら", "ざっはとるて",
			"しゅばるつばるだーきるしゅとるて", "あっぷるぱい", "ぱんぷきんぱい", "すうぃーとぽてとぱい",
			"れもんぱい", "ちぇりーぱい", "ぶるーべりーぱい", "いちごたると", "きういたると",
			"ぴーちたると", "ちょこれーとたると", "なっつたると", "あーもんどたると", "ぴすたちおたると",
			"くりーむぱふ", "しゅーくりーむ", "ぷろふぃてろーる", "くろかんぶっしゅ", "さんとのれ",
			"おぺら", "みるくれーぷ", "ちょこれーとれーぷ", "いちごれーぷ", "ばななれーぷ",
			"かすたーどぷりん", "かららめるぷりん", "ちょこれーとぷりん", "まんごーぷりん", "こーひーぷりん",
			"ぱんなこった", "ばばろあ", "むーす", "ちょこれーとむーす", "いちごむーす",
			"れもんむーす", "まんごーむーす", "てぃらみす", "ざばいおーね", "かんのーり",
			"じぇらーと", "そるべ", "あふぉがーと", "ぐらにーた", "せみふれっど",
		},
		5: {
			// 複雑なデザート名（90個）
			"ちょこれーとふぁうんてん", "すとろべりーしょーとけーき", "もんぶらんたると",
			"てぃらみすけーき", "にゅーよーくちーずけーき", "れあちーずけーき",
			"ぱんなこったけーき", "くれーむぶりゅれたると", "まかろんたわー",
			"ふれんちとーすと", "ぱんけーきたわー", "わっふるあいす",
			"みるふぃーゆなぽれおん", "がとーおぺら", "くろかんぶっしゅたわー", "ぷろふぃてろーるけーき",
			"しゅばるつばるだーきるしゅとるて", "ざっはとるてみっとしゃーらっは", "あっぷるしゅとぅるーでる",
			"ぱんぷきんちーずけーき", "すうぃーとぽてとたると", "もんてぶらんこ", "ちょこれーとふぉんでゅ",
			"ふるーつふぉんでゅ", "ちーずふぉんでゅ", "ちょこれーとそうふれ", "ばにらそうふれ",
			"れもんそうふれ", "いちごそうふれ", "まんごーそうふれ", "ぱっしょんふるーつそうふれ",
			"ちょこれーとむーすけーき", "いちごむーすけーき", "まんごーむーすけーき", "れもんむーすけーき",
			"らずべりーむーすけーき", "ぶるーべりーむーすけーき", "ぴーちむーすけーき", "きういむーすけーき",
			"ちょこれーとがなっしゅ", "きゃらめるがなっしゅ", "ほわいとちょこれーとがなっしゅ", "まっちゃがなっしゅ",
			"いちごがなっしゅ", "ばにらがなっしゅ", "こーひーがなっしゅ", "らむれーずんがなっしゅ",
			"ちょこれーととりゅふ", "しゃんぱんとりゅふ", "らむとりゅふ", "こにゃっくとりゅふ",
			"まっちゃとりゅふ", "ゆずとりゅふ", "くろごまとりゅふ", "きなことりゅふ",
			"ちょこれーとぼんぼん", "りきゅーるぼんぼん", "ふるーつぼんぼん", "なっつぼんぼん",
			"ちょこれーとぷらりね", "へーぜるなっつぷらりね", "あーもんどぷらりね", "ぴすたちおぷらりね",
			"まかだみあなっつぷらりね", "くるみぷらりね", "ぴーかんなっつぷらりね", "かしゅーなっつぷらりね",
			"ちょこれーとたると", "きゃらめるたると", "なっつたると", "ふるーつたると",
			"べりーたると", "しとらすたると", "とろぴかるたると", "えきぞちっくふるーつたると",
		},
	},
	"vehicle": {
		1: {
			// 基本的な乗り物（60個）
			"くるま", "でんしゃ", "ばす", "ひこうき", "ふね", "じてんしゃ",
			"ばいく", "たくしー", "とらっく", "あんぶらんす", "しょうぼうしゃ",
			"ぱとかー", "きゅうきゅうしゃ", "ごみしゅうしゅうしゃ", "ゆうびんしゃ",
			"みきさーしゃ", "くれーんしゃ", "ぶるどーざー", "しょべるかー", "だんぷかー",
			"ろーどろーらー", "ふぉーくりふと", "とれーらー", "きゃんぴんぐかー", "ばん",
			"すてーしょんわごん", "みにばん", "こんぱくとかー", "せだん", "はっちばっく",
			"くーぺ", "かぶりおれ", "おーぷんかー", "えすゆーぶい", "くろすおーばー",
			"ぴっくあっぷとらっく", "らいとばん", "まいくろばす", "ちゅうがたばす", "だいがたばす",
			"かんこうばす", "こうそくばす", "ろんぐでぃすたんすばす", "しゃとるばす", "こみゅにてぃばす",
			"でんきばす", "はいぶりっどばす", "てんねんがすばす", "ばいおでぃーぜるばす", "すくーるばす",
		},
		2: {
			// 電車・特殊車両（66個）
			"しんかんせん", "ちかてつ", "ろめんでんしゃ", "けーぶるかー",
			"ろーぷうぇい", "ものれーる", "とろりーばす", "りむじん",
			"すぽーつかー", "おーとばい", "すくーたー", "せぐうぇい",
			"とっきゅうでんしゃ", "きゅうこうでんしゃ", "かくえきていしゃ", "つうきんでんしゃ",
			"とうきゅうでんしゃ", "おだきゅうでんしゃ", "けいきゅうでんしゃ", "けいおうでんしゃ",
			"せいぶでんしゃ", "とうぶでんしゃ", "けいせいでんしゃ", "しんけいせいでんしゃ",
			"やまのてせん", "けいひんとうほくせん", "ちゅうおうせん", "そうぶせん",
			"とうかいどうせん", "たかさきせん", "うつのみやせん", "じょうばんせん",
			"でんきじどうしゃ", "はいぶりっどかー", "ぷらぐいんはいぶりっど", "ふゅーえるせるかー",
			"すーぱーかー", "はいぱーかー", "れーしんぐかー", "らりーかー",
			"どらっぐすたー", "ふぉーみゅらかー", "いんでぃかー", "なすかー",
			"ごーかーと", "あーるしー", "どろーん", "らじこんかー",
			"みによんく", "あーるしーへり", "あーるしーひこうき", "あーるしーぼーと",
			"せぐうぇい", "ほばーぼーど", "きっくぼーど", "すけーとぼーど",
		},
		3: {
			// 航空機・船舶（78個）
			"じぇっとき", "へりこぷたー", "ぐらいだー", "ぱらぐらいだー",
			"きゅうきゅうへり", "しょうぼうへり", "ぽりすへり", "どくたーへり",
			"かーごせん", "くるーずせん", "よっと", "もーたーぼーと",
			"せんとうき", "ばくげきき", "ゆそうき", "れんらくき",
			"かんしき", "きゅうなんき", "きゅうきゅうき", "しょうぼうき",
			"のうやくさんぷき", "そうさき", "くんれんき", "きょくちき",
			"すいじょうき", "ふろーと", "あんふぃびあん", "てぃるとろーたー",
			"おーとじゃいろ", "うるとららいと", "まいくろらいと", "ぱらもーたー",
			"はんぐぐらいだー", "ばるーん", "ねっきゅうき", "つぇっぺりん",
			"ひこうせん", "きゅうき", "ろけっとぐらいだー", "すぺーすぷれーん",
			"かーごせん", "たんかー", "こんてなせん", "ふぇりー",
			"ろーろーせん", "りょかくせん", "ゆうらんせん", "つりせん",
			"ぎょせん", "ほえーるうぉっちんぐぼーと", "だいびんぐぼーと", "じぇっとすきー",
			"ばななぼーと", "かやっく", "かぬー", "らふと",
			"いんふれーたぶるぼーと", "ごむぼーと", "すたんどあっぷぱどる", "うぃんどさーふぃん",
			"かいとさーふぃん", "せーりんぐ", "よっと", "くるーざー",
			"もーたーよっと", "ふぃっしんぐぼーと", "ぽんつーん", "はうすぼーと",
		},
		4: {
			// 宇宙・軍事・特殊車両（84個）
			"すぺーすしゃとる", "ろけっと", "じんこうえいせい", "うちゅうすてーしょん",
			"すーぱーそにっくじぇっと", "こんこるど", "えあばすえーさんはちまる",
			"ぼーいんぐななよんなな", "えふじゅうごらいとにんぐ", "えふにじゅうにらぷたー",
			"えふさんじゅうごらいとにんぐ", "ゆーろふぁいたーたいふーん", "らふぁーる",
			"ぐりぺん", "みらーじゅ", "えふしっくすてぃーん", "えふふぉー",
			"はりあー", "とーねーど", "いーぐる", "ほーねっと",
			"すーぱーほーねっと", "いんとるーだー", "ぷろうらー", "ぐろうらー",
			"あぱっち", "こぶら", "ばいぱー", "ひゅーい",
			"ちぬーく", "ぶらっくほーく", "しーほーく", "すーぱーこぶら",
			"きんぐこぶら", "りとるばーど", "おすぷれい", "てぃるとろーたー",
			"せんしゃ", "そうこうしゃ", "じそうほうしゃ", "たいくうしゃ",
			"こうしゃほう", "ろけっとらんちゃー", "みさいるらんちゃー", "ぐれねーどらんちゃー",
			"すないぱーらいふる", "あさるとらいふる", "ましんがん", "しょっとがん",
			"ぴすとる", "りぼるばー", "でざーといーぐる", "えーけーよんじゅうなな",
			"えむしっくすてぃーん", "えむふぉー", "えすえーだぶりゅー", "ばれっと",
			"どらぐのふ", "えすぶいでぃー", "ぐれねーど", "ふらっしゅばん",
			"すもーくぐれねーど", "てぃあがす", "ぺっぱーすぷれー", "てーざー",
			"すたんがん", "らばーぶれっと", "びーんばっぐらうんど", "うぉーたーきゃのん",
			"ねっとがん", "ふっくがん", "はーぷーんがん", "くろすぼう",
			"すりんぐしょっと", "ぶーめらん", "しゅりけん", "くない",
		},
		5: {
			// 超長い宇宙・未来車両名（90個）
			"いんたーなしょなるすぺーすすてーしょん", "あぽろうちゅうせん",
			"すぺーすえっくすふぁるこんないん", "ぶるーおりじんにゅーしぇぱーど",
			"ばーじんぎゃらくてぃっくゆにてぃー", "すぺーすえっくすどらごん",
			"ぼーいんぐしーえすてぃーひゃくすたーらいなー", "えあばすえーさんはちまるねお",
			"ぼーいんぐななななななどりーむらいなー", "えあばすえーさんごじゅうえっくすだぶりゅーびー",
			"ろっきーどまーてぃんえふにじゅうにらぷたー", "のーすろっぷぐらまんびーにいせんすぴりっと",
			"ぼーいんぐえーえいちろくじゅうよんあぱっち", "べるぼーいんぐぶいにじゅうにおすぷれい",
			"しこるすきーえすろくじゅうよんぶらっくほーく", "ぼーいんぐちーえいちよんじゅうななちぬーく",
			"ゆーろこぷたーえっくすさんえーろこぷたー", "あぐすたうぇすとらんどえーだぶりゅーいちにじゅうきゅー",
			"えあばすへりこぷたーずえっくすさんえーろこぷたー", "れおなるどえーだぶりゅーいちにじゅうきゅーまんぐすた",
			"みるみーえむあいにじゅうよんはいんど", "ぼーいんぐえーえいちろくじゅうよんろんぐぼうあぱっち",
			"べるあーえいちいちこぶら", "べるゆーえいちいちひゅーい", "べるおーえいちごじゅうはちきおわ",
			"しこるすきーえすろくじゅうよんぶらっくほーくだうん", "ぼーいんぐちーえいちよんじゅうななえふちぬーく",
			"なさすぺーすらんちしすてむ", "すぺーすえっくすふぁるこんへびー",
			"ぶるーおりじんにゅーぐれん", "ばーじんおーびっと", "ばーじんぎゃらくてぃっく",
			"すぺーすえっくすすたーしっぷ", "ぶるーおりじんにゅーしぇぱーどさぶおーびたる",
			"あまぞんぷらいむえあ", "ぐーぐるうぃんぐでりばりーどろーん", "あまぞんぷらいむえあどろーん",
			"うーばーえあたくしー", "りりうむえあもびりてぃ", "じょびーあびえーしょん",
			"いーはんぐあびえーしょん", "ぼろこぷたー", "えあばすぽっぷあっぷ",
			"ぼーいんぐぱっせんじゃーえあびーくる", "えあばすしてぃえあばす", "べるねくさす",
			"ろびんそんあーるよんよんれーべん", "ろびんそんあーるにじゅうにべーた",
			"ぐらすほっぱーてくのろじーずしーえーにじゅうに", "まぐにえっくすえあろすぺーすいーびーばー",
			"てらふじあてらふじあとらんじしょん", "ぱるあーるぱるりばてぃ", "もーらーいんたーなしょなるえむよん",
			"ぱいぱーえあくらふとぱいぱーあーちゃー", "だいあもんどえあくらふとだいあもんどだよんじゅう",
			"しーらすえあくらふとしーらすえすあーるにじゅうに", "らんすえあくらふとらんすえぼりゅーしょん",
			"ばんずえあくらふとばんずあーるぶいいち", "ぐらいだーあーるじーいちろくじゅう",
			"あれくさんだーしゅらいひゃーあーえすけー", "ろーらんどあーるにじゅうにべーた",
			"ぴっつえすにじゅうはちくるーざー", "あめりかんちゃんぴおんしちえーしーえー",
			"えくすとらいちさんごじゅうえるえー", "ばんずあーるぶいろんぐいーぜっと",
			"ぐらすほっぱーてくのろじーずすぽーつまん", "あめりかんちゃんぴおんあーるぶいろんぐいーぜっと",
		},
	},
	"station": {
		1: {
			// 主要駅・都市名（60個）
			"とうきょう", "しんじゅく", "しぶや", "いけぶくろ", "うえの",
			"あきはばら", "ぎんざ", "はらじゅく", "おおさか", "きょうと",
			"こうべ", "なごや", "よこはま", "ちば", "さいたま",
			"ひろしま", "ふくおか", "せんだい", "さっぽろ", "にいがた",
			"かなざわ", "しずおか", "はままつ", "ぎふ", "つ",
			"おおつ", "なら", "わかやま", "とっとり", "まつえ",
			"おかやま", "やまぐち", "とくしま", "たかまつ", "まつやま",
			"こうち", "きたきゅうしゅう", "くまもと", "おおいた", "みやざき",
			"かごしま", "なは", "あおもり", "もりおか", "あきた",
			"やまがた", "ふくしま", "みと", "うつのみや", "まえばし",
			"こうふ", "ながの", "とやま", "ふくい", "つるが",
			"おがき", "よっかいち", "いせ", "ひこね", "おおがき",
		},
		2: {
			// 関東・首都圏の駅（66個）
			"しながわ", "はままつちょう", "たまち", "ゆらくちょう", "しんばし",
			"かんだ", "にっぽり", "たばた", "すがも", "おおつか",
			"いけぶくろ", "しんじゅく", "よよぎ", "はらじゅく", "えびす",
			"おおさき", "ごたんだ", "めぐろ", "なかめぐろ", "じゆうがおか",
			"でんえんちょうふ", "みぞのくち", "のぼりと", "しんゆりがおか", "まちだ",
			"はちおうじ", "たちかわ", "こくぶんじ", "みたか", "きちじょうじ",
			"しもきたざわ", "さんげんじゃや", "こまざわだいがく", "ようが", "ふたこたまがわ",
			"じじゅうがおか", "おおいまち", "おおもり", "かまた", "はねだくうこう",
			"しんかなざわ", "かなざわはっけい", "かなざわぶんこ", "きんざわ", "のげやま",
			"みなとみらい", "さくらぎちょう", "かんないちゅうかがい", "いしかわちょう", "よこはまちゅうかがい",
			"つるみ", "しんつるみ", "おおぐち", "ひがしかながわ", "かながわしんまち",
			"こうほく", "しんよこはま", "きくな", "おおくらやま", "みょうれんじ",
			"しらくら", "ひよし", "つなしま", "おおくらやま", "みどりがおか",
			"ながつた", "みどり", "なかやま", "こずかしば", "あざみの",
			"たまぷらーざ", "あおば", "ふじがおか",
		},
		3: {
			// 関西・中部・地方都市（78個）
			"しんよこはま", "こうほく", "ひがしかながわ", "かながわしんまち",
			"つるみ", "なかやま", "ながつた", "みどり", "じゅうじょう",
			"ひがしじゅうじょう", "あかばね", "うぐいすだに", "にしにっぽり",
			"うめだ", "なんば", "てんのうじ", "しんおおさか", "きょうばし",
			"つるはし", "いまみや", "しんいまみや", "すみよし", "すみよしたいしゃ",
			"あべの", "あべのはるかす", "てんのうじ", "しんせかい", "どうとんぼり",
			"しんさいばし", "なんばぱーくす", "なんばしてぃ", "でんでんたうん", "くろもん",
			"きょうとえき", "きよみずでら", "ぎおん", "かわらまち", "ぽんとちょう",
			"あらしやま", "きんかくじ", "ぎんかくじ", "ふしみいなり", "うじ",
			"なら", "かすが", "とうだいじ", "こうふくじ", "やくしじ",
			"ほりゅうじ", "いかるが", "あすか", "よしの", "くまの",
			"こうや", "わかやま", "しらはま", "かつうら", "なち",
			"こうべ", "さんのみや", "もとまち", "ちゅうかがい", "はーばーらんど",
			"ろっこう", "あらしやま", "たからづか", "にしのみや", "あまがさき",
			"ひめじ", "あかし", "すま", "まいこ", "あわじしま",
			"なごや", "さかえ", "おおす", "かなやま", "ふしみ",
			"きんじょうふとう", "なごやじょう", "あつた", "かなやまそうごう", "ちくさ",
		},
		4: {
			// 地方都市・観光地（84個）
			"みなみうらわ", "さいたましんとしん", "おおみや", "つちうら",
			"ひたちなか", "みと", "うつのみや", "おやま", "こうのす",
			"くまがや", "ほんじょう", "たかさき", "まえばし", "きりゅう",
			"にっこう", "きぬがわおんせん", "ゆもと", "ちゅうぜんじ", "いろは",
			"あしかが", "さの", "おやま", "こが", "ゆうき",
			"つくば", "つくばみらい", "りゅうがさき", "とりで", "いしおか",
			"かさま", "ひたちおおた", "ひたちおおみや", "たかはぎ", "いわき",
			"あいづわかまつ", "きたかた", "いなわしろ", "ばんだい", "あだたら",
			"ふくしま", "こおりやま", "しらかわ", "すかがわ", "いわせ",
			"やまがた", "つるおか", "さかた", "よねざわ", "てんどう",
			"むらやま", "ながい", "おばなざわ", "しんじょう", "ざおう",
			"あきた", "よこて", "だいせん", "のしろ", "ゆざわ",
			"かくのだて", "たざわこ", "にゅうとう", "おがち", "はちまんたい",
			"もりおか", "はなまき", "きたかみ", "いちのせき", "みずさわ",
			"おうしゅう", "ひらいずみ", "げいび", "りくちゅうたかた", "おおふなと",
			"みやこ", "くじ", "にのへ", "はちのへ", "みさわ",
			"あおもり", "ひろさき", "ごしょがわら", "つがる", "むつ",
			"はこだて", "おたる", "あさひかわ", "おびひろ", "くしろ",
			"ねむろ", "きたみ", "もんべつ", "わっかない", "るもい",
		},
		5: {
			// 超長い駅名・観光地名（90個）
			"みなみあるぷすあぴこ", "ちゅうおうあるぷすかみこうち",
			"きたあるぷすかみたかち", "ふじさんごごうめ", "はこねゆもと",
			"あたみおんせん", "いとうおんせん", "しゅぜんじおんせん",
			"かわづなのはな", "しもだかいひん", "いずきゅうこう",
			"みなみあるぷすちゅうおうせん", "ちゅうおうあるぷすかみこうちこうげん",
			"きたあるぷすかみたかちこうげん", "ふじごこかわぐちこ", "ふじごこやまなかこ",
			"ふじごこさいこ", "ふじごこしょうじこ", "ふじごこもとすこ",
			"はこねあしのこ", "はこねおおわくだに", "はこねごうら", "はこねそううん",
			"あたみばいおんせん", "あたみきおんせん", "あたみふるかわ", "あたみいずさん",
			"いとうおんせんかいがん", "いとうおんせんちゅうしん", "いとうおんせんひがし", "いとうおんせんにし",
			"しゅぜんじおんせんちゅうしん", "しゅぜんじおんせんひがし", "しゅぜんじおんせんにし", "しゅぜんじおんせんみなみ",
			"かわづなのはなまつり", "かわづなのはなかいがん", "かわづなのはなおんせん", "かわづなのはなこうえん",
			"しもだかいひんこうえん", "しもだかいひんおんせん", "しもだかいひんすいぞくかん", "しもだかいひんろーぷうぇい",
			"いずきゅうこうかいがん", "いずきゅうこうおんせん", "いずきゅうこうこうえん", "いずきゅうこうどうぶつえん",
			"にっこうとうしょうぐう", "にっこうりんのうじ", "にっこうふたらさんじんじゃ", "にっこうちゅうぜんじ",
			"にっこうけごんのたき", "にっこうりゅうずのたき", "にっこうゆのこ", "にっこうおくにっこう",
			"きぬがわおんせんほてる", "きぬがわおんせんりょかん", "きぬがわおんせんかいがん", "きぬがわおんせんこうえん",
			"ゆもとおんせんほてる", "ゆもとおんせんりょかん", "ゆもとおんせんかいがん", "ゆもとおんせんこうえん",
			"ちゅうぜんじこはん", "ちゅうぜんじこひがし", "ちゅうぜんじこにし", "ちゅうぜんじこみなみ",
			"いろはざかいりぐち", "いろはざかちゅうふく", "いろはざかでぐち", "いろはざかてんぼうだい",
			"あしかがふらわーぱーく", "あしかががっこう", "あしかがばんばもりこうえん", "あしかがおりひめじんじゃ",
			"さのぷれみあむあうとれっと", "さのらーめん", "さのやきそば", "さのいもふらい",
			"おやまゆうえんち", "おやまじょうし", "おやまひがしこうこう", "おやまにしこうこう",
			"こがそうごうこうえん", "こがちゅうおうこうえん", "こがひがしこうえん", "こがにしこうえん",
			"ゆうきしりつびじゅつかん", "ゆうきしりつとしょかん", "ゆうきしりつたいいくかん", "ゆうきしりつぶんかかん",
			"つくばうちゅうせんたー", "つくばかがくはくぶつかん", "つくばしょくぶつえん", "つくばだいがく",
			"つくばみらいしやくしょ", "つくばみらいちゅうおうこうえん", "つくばみらいひがしこうえん", "つくばみらいにしこうえん",
		},
	},
}

// 英語の単語データ
var WORD_CATEGORIES_EN = map[string]map[int][]string{
	"food": {
		1: {
			// Basic foods (60 words)
			"rice", "bread", "meat", "fish", "egg", "milk", "water", "tea",
			"coffee", "juice", "apple", "banana", "orange", "grape", "lemon",
			"tomato", "potato", "onion", "carrot", "lettuce", "cheese", "butter",
			"sugar", "salt", "pepper", "oil", "sauce", "soup", "salad", "cake",
			"cookie", "pizza", "pasta", "burger", "chicken", "beef", "pork",
			"salmon", "tuna", "shrimp", "crab", "lobster", "oyster", "clam",
			"strawberry", "peach", "pear", "cherry", "plum", "melon", "kiwi",
			"pineapple", "mango", "avocado", "coconut", "walnut", "almond", "honey",
		},
		2: {
			// Dishes and desserts (66 words)
			"ramen", "sushi", "tempura", "curry", "sandwich", "hotdog", "taco",
			"burrito", "quesadilla", "enchilada", "nachos", "guacamole", "salsa",
			"chocolate", "vanilla", "strawberry", "caramel", "pudding", "jelly",
			"yogurt", "smoothie", "milkshake", "lemonade", "cappuccino", "espresso",
			"croissant", "bagel", "muffin", "pancake", "waffle", "french toast",
			"omelette", "scrambled", "fried rice", "noodles", "spaghetti", "lasagna",
			"ravioli", "gnocchi", "risotto", "paella", "steak", "roast", "grill",
			"barbecue", "kebab", "meatball", "sausage", "bacon", "ham", "turkey",
			"duck", "lamb", "venison", "rabbit", "quail", "pheasant", "octopus",
			"squid", "scallop", "mussel", "sardine", "mackerel", "cod", "halibut",
		},
		3: {
			// International cuisine (78 words)
			"spaghetti carbonara", "fettuccine alfredo", "penne arrabbiata", "linguine pesto",
			"chicken parmesan", "beef stroganoff", "fish and chips", "bangers and mash",
			"shepherd's pie", "cottage pie", "beef wellington", "chicken tikka masala",
			"butter chicken", "tandoori chicken", "biryani", "pad thai", "tom yum",
			"green curry", "red curry", "massaman curry", "pho", "banh mi",
			"spring rolls", "dumplings", "wontons", "dim sum", "peking duck",
			"kung pao chicken", "sweet and sour pork", "mapo tofu", "hot pot",
			"ratatouille", "bouillabaisse", "coq au vin", "beef bourguignon", "cassoulet",
			"quiche lorraine", "croque monsieur", "escargot", "foie gras", "borscht",
			"pierogi", "goulash", "schnitzel", "sauerbraten", "bratwurst", "pretzel",
			"paella valenciana", "gazpacho", "tapas", "churros", "flan", "tres leches",
			"tiramisu", "gelato", "cannoli", "bruschetta", "antipasto", "minestrone",
			"osso buco", "saltimbocca", "carbonara", "amatriciana", "puttanesca",
			"margherita", "quattro stagioni", "diavola", "capricciosa", "marinara",
			"bolognese", "aglio olio", "cacio e pepe", "all'arrabbiata", "alla norma",
		},
		4: {
			// Gourmet and specialty foods (84 words)
			"foie gras terrine", "caviar blini", "oysters rockefeller", "lobster thermidor",
			"beef tartare", "tuna tartare", "salmon gravlax", "prosciutto di parma",
			"jamón ibérico", "bresaola", "coppa", "pancetta", "guanciale", "mortadella",
			"burrata", "mozzarella di bufala", "parmigiano reggiano", "gorgonzola",
			"roquefort", "camembert", "brie de meaux", "comté", "gruyère", "manchego",
			"truffle risotto", "mushroom risotto", "seafood risotto", "asparagus risotto",
			"duck confit", "lamb tagine", "moroccan couscous", "lebanese hummus",
			"greek moussaka", "turkish kebab", "indian vindaloo", "thai green curry",
			"japanese kaiseki", "korean bulgogi", "chinese peking duck", "vietnamese pho",
			"french onion soup", "clam chowder", "lobster bisque", "gazpacho andaluz",
			"vichyssoise", "minestrone soup", "tom kha gai", "miso soup", "wonton soup",
			"crème brûlée", "chocolate soufflé", "lemon tart", "apple tarte tatin",
			"profiteroles", "éclairs", "macarons", "madeleine", "financier", "opera cake",
			"black forest cake", "red velvet cake", "carrot cake", "cheesecake",
			"panna cotta", "zabaglione", "affogato", "granita", "semifreddo", "gelato",
			"sorbet", "mousse", "bavarian cream", "charlotte russe", "trifle", "pavlova",
			"banoffee pie", "key lime pie", "pecan pie", "pumpkin pie", "apple pie",
			"cherry pie", "blueberry pie", "strawberry shortcake", "boston cream pie",
		},
		5: {
			// Ultra-gourmet and complex dishes (90 words)
			"molecular gastronomy spherification", "liquid nitrogen ice cream", "edible flower salad",
			"gold leaf chocolate truffle", "wagyu beef tasting menu", "omakase sushi experience",
			"michelin starred tasting menu", "farm to table seasonal menu", "artisanal cheese board",
			"wine pairing dinner course", "champagne and caviar service", "white truffle pasta",
			"black truffle risotto", "saffron infused paella", "aged balsamic vinegar tasting",
			"single origin chocolate tasting", "artisanal bread making workshop", "fermented vegetable medley",
			"house cured charcuterie board", "locally sourced oyster platter", "heritage breed pork belly",
			"grass fed beef tenderloin", "wild caught salmon teriyaki", "organic free range chicken",
			"heirloom tomato caprese salad", "burrata with truffle honey", "prosciutto wrapped asparagus",
			"duck liver mousse crostini", "smoked salmon bagel tower", "lobster mac and cheese",
			"uni sea urchin sashimi", "toro fatty tuna sashimi", "hamachi yellowtail sashimi",
			"ikura salmon roe gunkan", "chirashi bowl deluxe", "kaiseki multi course meal",
			"tempura omakase selection", "wagyu beef sukiyaki hot pot", "shabu shabu premium course",
			"korean barbecue premium set", "peking duck whole service", "dim sum chef selection",
			"thai royal cuisine banquet", "indian tandoor mixed grill", "moroccan tagine feast",
			"spanish tapas tasting menu", "italian antipasti selection", "french cheese course finale",
			"german beer and sausage fest", "british afternoon tea service", "american barbecue platter",
			"mexican mole poblano special", "peruvian ceviche tasting", "brazilian churrasco experience",
			"argentinian asado barbecue", "chilean wine country tour", "australian meat pie classic",
			"new zealand green mussel", "canadian maple syrup pancake", "scandinavian smorgasbord buffet",
			"russian caviar and vodka", "middle eastern mezze platter", "mediterranean diet showcase",
			"asian fusion tasting menu", "pacific rim cuisine journey", "global street food festival",
			"artisanal ice cream sundae", "gourmet chocolate fountain", "premium coffee cupping session",
			"craft beer tasting flight", "whiskey and cigar pairing", "sake and sushi omakase",
			"wine and cheese masterclass", "cocktail mixology workshop", "tea ceremony experience",
			"cooking class with celebrity chef", "food truck festival tour", "farmers market fresh picks",
			"organic garden to table", "sustainable seafood selection", "plant based protein alternatives",
			"gluten free gourmet options", "keto friendly meal prep", "paleo diet meal planning",
			"vegan fine dining experience", "raw food preparation class", "fermentation workshop intensive",
		},
	},
	"vehicle": {
		1: {
			// Basic vehicles (60 words)
			"car", "bus", "train", "plane", "ship", "bike", "truck", "taxi",
			"van", "boat", "ferry", "subway", "tram", "scooter", "motorcycle",
			"helicopter", "yacht", "canoe", "kayak", "raft", "sailboat", "speedboat",
			"ambulance", "firetruck", "police car", "garbage truck", "delivery truck",
			"pickup truck", "semi truck", "trailer", "camper", "rv", "limousine",
			"sedan", "coupe", "hatchback", "wagon", "suv", "crossover", "convertible",
			"minivan", "compact car", "sports car", "luxury car", "electric car",
			"hybrid car", "diesel car", "manual car", "automatic car", "four wheel drive",
			"all terrain vehicle", "go kart", "race car", "formula one", "nascar",
			"dragster", "monster truck", "fire engine", "school bus", "city bus",
		},
		2: {
			// Trains and specialized vehicles (66 words)
			"bullet train", "express train", "local train", "freight train", "steam train",
			"electric train", "diesel train", "monorail", "light rail", "cable car",
			"funicular", "trolley", "streetcar", "maglev train", "high speed rail",
			"intercity train", "commuter train", "passenger train", "cargo train", "tank car",
			"boxcar", "flatcar", "hopper car", "gondola car", "caboose", "locomotive",
			"electric locomotive", "diesel locomotive", "steam locomotive", "hybrid locomotive",
			"double decker train", "sleeper train", "dining car", "observation car",
			"baggage car", "mail car", "refrigerator car", "automobile carrier",
			"container car", "well car", "centerbeam car", "coil car", "bulkhead car",
			"covered hopper", "open hopper", "tank wagon", "depressed center car",
			"schnabel car", "idler car", "boom car", "crane car", "wrecker car",
			"inspection car", "track geometry car", "ballast car", "rail grinder",
			"tamping machine", "spike puller", "rail saw", "tie inserter", "ballast regulator",
			"undercutter", "shoulder cleaner", "rail heater", "thermite welding", "rail drill",
		},
		3: {
			// Aircraft and watercraft (78 words)
			"jet fighter", "bomber plane", "cargo plane", "passenger jet", "private jet",
			"business jet", "charter plane", "seaplane", "floatplane", "amphibian plane",
			"glider", "sailplane", "ultralight", "microlight", "paraglider", "hang glider",
			"hot air balloon", "weather balloon", "blimp", "airship", "zeppelin",
			"drone", "quadcopter", "helicopter drone", "military drone", "surveillance drone",
			"rescue helicopter", "medical helicopter", "police helicopter", "news helicopter",
			"transport helicopter", "attack helicopter", "scout helicopter", "utility helicopter",
			"heavy lift helicopter", "twin engine helicopter", "single engine helicopter",
			"cargo ship", "container ship", "cruise ship", "passenger ship", "ferry boat",
			"oil tanker", "gas tanker", "bulk carrier", "general cargo", "roll on roll off",
			"car carrier", "livestock carrier", "refrigerated ship", "research vessel",
			"fishing boat", "trawler", "longline boat", "purse seiner", "crab boat",
			"lobster boat", "shrimp boat", "tuna boat", "whale watching boat", "dive boat",
			"jet ski", "water ski", "wakeboard boat", "pontoon boat", "houseboat",
			"catamaran", "trimaran", "monohull", "racing yacht", "cruising yacht",
			"motor yacht", "sailing yacht", "day sailer", "dinghy", "tender",
			"inflatable boat", "rigid inflatable", "life raft", "rescue boat", "patrol boat",
		},
		4: {
			// Military and space vehicles (84 words)
			"space shuttle", "rocket ship", "satellite", "space station", "lunar module",
			"mars rover", "space probe", "orbital vehicle", "reentry vehicle", "capsule",
			"fighter jet", "stealth bomber", "reconnaissance plane", "transport plane",
			"refueling tanker", "early warning aircraft", "electronic warfare plane",
			"maritime patrol aircraft", "search and rescue plane", "firefighting plane",
			"crop duster", "banner tow plane", "aerobatic plane", "stunt plane",
			"experimental aircraft", "prototype vehicle", "concept car", "test vehicle",
			"main battle tank", "light tank", "heavy tank", "tank destroyer", "self propelled gun",
			"armored car", "infantry fighting vehicle", "armored personnel carrier",
			"multiple rocket launcher", "missile launcher", "anti aircraft gun",
			"howitzer", "mortar", "field gun", "anti tank gun", "machine gun",
			"assault rifle", "sniper rifle", "submachine gun", "pistol", "revolver",
			"shotgun", "grenade launcher", "rocket launcher", "flame thrower",
			"crossbow", "compound bow", "longbow", "recurve bow", "slingshot",
			"catapult", "trebuchet", "ballista", "cannon", "musket", "rifle",
			"carbine", "battle rifle", "designated marksman rifle", "anti materiel rifle",
			"light machine gun", "heavy machine gun", "general purpose machine gun",
			"squad automatic weapon", "personal defense weapon", "combat shotgun",
			"tactical shotgun", "pump action shotgun", "semi automatic shotgun",
			"double barrel shotgun", "single shot rifle", "bolt action rifle",
			"lever action rifle", "semi automatic rifle", "automatic rifle", "burst fire rifle",
		},
		5: {
			// Futuristic and ultra-specialized vehicles (90 words)
			"international space station", "apollo command module", "spacex falcon nine",
			"blue origin new shepard", "virgin galactic unity", "spacex dragon capsule",
			"boeing cst starliner", "airbus a three eighty neo", "boeing seven eight seven dreamliner",
			"airbus a three fifty xwb", "lockheed martin f twenty two raptor",
			"northrop grumman b two spirit", "boeing ah sixty four apache",
			"bell boeing v twenty two osprey", "sikorsky s sixty four black hawk",
			"boeing ch forty seven chinook", "eurocopter x three helicopter",
			"augusta westland aw one twenty nine", "airbus helicopters x three helicopter",
			"leonardo aw one twenty nine mangusta", "mil mi twenty four hind",
			"boeing ah sixty four longbow apache", "bell ah one cobra", "bell uh one huey",
			"bell oh fifty eight kiowa", "sikorsky s sixty four black hawk down",
			"boeing ch forty seven f chinook", "nasa space launch system", "spacex falcon heavy",
			"blue origin new glenn", "virgin orbit", "virgin galactic", "spacex starship",
			"blue origin new shepard suborbital", "amazon prime air", "google wing delivery drone",
			"amazon prime air drone", "uber air taxi", "lilium air mobility", "joby aviation",
			"ehang aviation", "volocopter", "airbus pop up", "boeing passenger air vehicle",
			"airbus cityairbus", "bell nexus", "robinson r forty four raven",
			"robinson r twenty two beta", "glasshoppers technologies ca twenty two",
			"magnix aerospace eplaner", "terrafugia transition", "pal v liberty", "moller international m four",
			"piper aircraft piper archer", "diamond aircraft diamond da forty",
			"cirrus aircraft cirrus sr twenty two", "lance aircraft lance evolution",
			"vans aircraft vans rv one", "glider rg one sixty", "alexander schleicher ask twenty one",
			"roland r twenty two beta", "pitts s twenty eight cruiser", "american champion seven aca",
			"extra one twenty three", "vans rv long ez", "glasshoppers technologies sportsman",
			"american champion rv long ez", "spacex falcon nine heavy", "spacex falcon heavy booster",
			"spacex dragon crew capsule", "boeing starliner crew capsule", "nasa orion spacecraft",
			"lockheed martin orion crew vehicle", "spacex starship super heavy",
			"blue origin new armstrong", "virgin galactic spaceship three", "virgin orbit launcher one",
			"rocket lab electron rocket", "astra space rocket three", "firefly aerospace alpha rocket",
			"relativity space terran one", "virgin galactic spaceship two", "scaled composites white knight two",
			"stratolaunch systems roc aircraft", "northrop grumman antares rocket",
			"united launch alliance atlas five", "united launch alliance delta four heavy",
			"spacex crew dragon endeavour", "spacex crew dragon resilience", "spacex crew dragon endurance",
			"boeing cst one hundred starliner", "nasa space shuttle atlantis", "nasa space shuttle discovery",
			"nasa space shuttle endeavour", "nasa space shuttle columbia", "nasa space shuttle challenger",
		},
	},
	"station": {
		1: {
			// Major cities and stations (60 words)
			"tokyo", "osaka", "kyoto", "yokohama", "nagoya", "sapporo", "fukuoka",
			"sendai", "hiroshima", "niigata", "kanazawa", "shizuoka", "hamamatsu",
			"gifu", "tsu", "otsu", "nara", "wakayama", "tottori", "matsue",
			"okayama", "yamaguchi", "tokushima", "takamatsu", "matsuyama", "kochi",
			"kitakyushu", "kumamoto", "oita", "miyazaki", "kagoshima", "naha",
			"aomori", "morioka", "akita", "yamagata", "fukushima", "mito",
			"utsunomiya", "maebashi", "kofu", "nagano", "toyama", "fukui",
			"tsuruga", "ogaki", "yokkaichi", "ise", "hikone", "ogaki",
			"shinjuku", "shibuya", "ikebukuro", "ueno", "akihabara", "ginza",
			"harajuku", "chiba", "saitama", "kobe",
		},
		2: {
			// Kanto region stations (66 words)
			"shinagawa", "hamamatsucho", "tamachi", "yurakucho", "shimbashi",
			"kanda", "nippori", "tabata", "sugamo", "otsuka", "ikebukuro",
			"shinjuku", "yoyogi", "harajuku", "ebisu", "osaki", "gotanda",
			"meguro", "nakameguro", "jiyugaoka", "denenchofu", "mizonokuchi",
			"noborito", "shinyurigaoka", "machida", "hachioji", "tachikawa",
			"kokubunji", "mitaka", "kichijoji", "shimokitazawa", "sangenjaya",
			"komazawadaigaku", "yoga", "futakotamagawa", "jiyugaoka", "oimachi",
			"omori", "kamata", "haneda airport", "shinkanazawa", "kanazawahakkei",
			"kanazawabunko", "kanazawa", "nogeyama", "minatomirai", "sakuragicho",
			"kannai chinatown", "ishikawacho", "yokohama chinatown", "tsurumi",
			"shintsurumi", "oguchi", "higashikanagawa", "kanagawashinmachi",
			"kohoku", "shinyokohama", "kikuna", "okurayama", "myorenji",
			"shirakura", "hiyoshi", "tsunashima", "okurayama", "midorigaoka",
			"nagatsuta", "midori", "nakayama", "kozukashiba", "azamino",
			"tamaplaza", "aoba", "fujigaoka",
		},
		3: {
			// Kansai and Chubu regions (78 words)
			"umeda", "namba", "tennoji", "shinosaka", "kyobashi", "tsuruhashi",
			"imamiya", "shinimamiya", "sumiyoshi", "sumiyoshitaisha", "abeno",
			"abeno harukas", "tennoji", "shinsekai", "dotonbori", "shinsaibashi",
			"namba parks", "namba city", "den den town", "kuromon", "kyoto station",
			"kiyomizu temple", "gion", "kawaramachi", "pontocho", "arashiyama",
			"kinkakuji", "ginkakuji", "fushimi inari", "uji", "nara", "kasuga",
			"todaiji", "kofukuji", "yakushiji", "horyuji", "ikaruga", "asuka",
			"yoshino", "kumano", "koya", "wakayama", "shirahama", "katsuura",
			"nachi", "kobe", "sannomiya", "motomachi", "chinatown", "harborland",
			"rokko", "arashiyama", "takarazuka", "nishinomiya", "amagasaki",
			"himeji", "akashi", "suma", "maiko", "awajishima", "nagoya",
			"sakae", "osu", "kanayama", "fushimi", "kinjofuto", "nagoya castle",
			"atsuta", "kanayama sogo", "chikusa", "shinyokohama", "kohoku",
			"higashikanagawa", "kanagawashinmachi", "tsurumi", "nakayama",
			"nagatsuta", "midori", "jujo", "higashijujo", "akabane", "uguisudani",
			"nishinippori",
		},
		4: {
			// Regional cities and tourist spots (84 words)
			"minamiurawa", "saitama shintoshin", "omiya", "tsuchiura", "hitachinaka",
			"mito", "utsunomiya", "oyama", "konosu", "kumagaya", "honjo",
			"takasaki", "maebashi", "kiryu", "nikko", "kinugawa onsen", "yumoto",
			"chuzenji", "iroha", "ashikaga", "sano", "oyama", "koga", "yuki",
			"tsukuba", "tsukuba mirai", "ryugasaki", "toride", "ishioka",
			"kasama", "hitachiota", "hitachiomiya", "takahagi", "iwaki",
			"aizuwakamatsu", "kitakata", "inawashiro", "bandai", "adatara",
			"fukushima", "koriyama", "shirakawa", "sukagawa", "iwase",
			"yamagata", "tsuruoka", "sakata", "yonezawa", "tendo", "murayama",
			"nagai", "obanazawa", "shinjo", "zao", "akita", "yokote",
			"daisen", "noshiro", "yuzawa", "kakunodate", "tazawako", "nyuto",
			"ogachi", "hachimantai", "morioka", "hanamaki", "kitakami",
			"ichinoseki", "mizusawa", "oshu", "hiraizumi", "geibi",
			"rikuchutakata", "ofunato", "miyako", "kuji", "ninohe", "hachinohe",
			"misawa", "aomori", "hirosaki", "goshogawara", "tsugaru", "mutsu",
			"hakodate", "otaru", "asahikawa", "obihiro", "kushiro", "nemuro",
			"kitami", "monbetsu", "wakkanai", "rumoi",
		},
		5: {
			// Long station names and tourist destinations (90 words)
			"minami alps apico", "chuo alps kamikochi", "kita alps kamitakachi",
			"fuji san gogome", "hakone yumoto", "atami onsen", "ito onsen",
			"shuzenji onsen", "kawazu nanohana", "shimoda kaihin", "izu kyuko",
			"minami alps chuo sen", "chuo alps kamikochi kogen",
			"kita alps kamitakachi kogen", "fujigoko kawaguchiko", "fujigoko yamanakako",
			"fujigoko saiko", "fujigoko shojiko", "fujigoko motosuko",
			"hakone ashinoko", "hakone owakudani", "hakone gora", "hakone soun",
			"atami bai onsen", "atami ki onsen", "atami furukawa", "atami izusan",
			"ito onsen kaigan", "ito onsen chushin", "ito onsen higashi", "ito onsen nishi",
			"shuzenji onsen chushin", "shuzenji onsen higashi", "shuzenji onsen nishi",
			"shuzenji onsen minami", "kawazu nanohana matsuri", "kawazu nanohana kaigan",
			"kawazu nanohana onsen", "kawazu nanohana koen", "shimoda kaihin koen",
			"shimoda kaihin onsen", "shimoda kaihin suizokukan", "shimoda kaihin ropeway",
			"izu kyuko kaigan", "izu kyuko onsen", "izu kyuko koen", "izu kyuko dobutsuen",
			"nikko toshogu", "nikko rinnoji", "nikko futarasan jinja", "nikko chuzenji",
			"nikko kegon no taki", "nikko ryuzu no taki", "nikko yunoko", "nikko oku nikko",
			"kinugawa onsen hotel", "kinugawa onsen ryokan", "kinugawa onsen kaigan",
			"kinugawa onsen koen", "yumoto onsen hotel", "yumoto onsen ryokan",
			"yumoto onsen kaigan", "yumoto onsen koen", "chuzenji kohan",
			"chuzenji ko higashi", "chuzenji ko nishi", "chuzenji ko minami",
			"iroha zaka iriguchi", "iroha zaka chufuku", "iroha zaka deguchi",
			"iroha zaka tenbodai", "ashikaga flower park", "ashikaga gakko",
			"ashikaga banbamori koen", "ashikaga orihime jinja", "sano premium outlet",
			"sano ramen", "sano yakisoba", "sano imo furai", "oyama yuenchi",
			"oyama joshi", "oyama higashi koko", "oyama nishi koko", "koga sogo koen",
			"koga chuo koen", "koga higashi koen", "koga nishi koen",
			"yuki shiritsu bijutsukan", "yuki shiritsu toshokan", "yuki shiritsu taiikukan",
			"yuki shiritsu bunkakan", "tsukuba uchu center", "tsukuba kagaku hakubutsukan",
			"tsukuba shokubutsuen", "tsukuba daigaku", "tsukuba mirai shiyakusho",
			"tsukuba mirai chuo koen", "tsukuba mirai higashi koen", "tsukuba mirai nishi koen",
		},
	},
}

var SPECIAL_WORDS_JP = map[string][]string{
	"bonus":  {"ぼーなす", "らっきー", "ぱーふぇくと", "すぺしゃる"},
	"debuff": {"とらっぷ", "でんじゃー", "はーど", "えくすとりーむ"},
}

var SPECIAL_WORDS_EN = map[string][]string{
	"bonus":  {"bonus", "lucky", "perfect", "special"},
	"debuff": {"trap", "danger", "hard", "extreme"},
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

	// 日本語の通常単語を挿入
	for category, rounds := range WORD_CATEGORIES_JP {
		for round, words := range rounds {
			for i, word := range words {
				item := WordItem{
					Category: category,
					WordID:   fmt.Sprintf("%s_jp_%d_%03d", category, round, i+1),
					Word:     word,
					Round:    round,
					Type:     "normal",
					Language: "jp",
				}

				av, err := attributevalue.MarshalMap(item)
				if err != nil {
					log.Printf("Failed to marshal JP word item %s: %v", word, err)
					continue
				}

				_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
					TableName: aws.String(tableName),
					Item:      av,
				})

				if err != nil {
					log.Printf("Failed to put JP word item %s: %v", word, err)
				} else {
					log.Printf("Added JP word: %s (Category: %s, Round %d)", word, category, round)
				}
			}
		}
	}

	// 英語の通常単語を挿入
	for category, rounds := range WORD_CATEGORIES_EN {
		for round, words := range rounds {
			for i, word := range words {
				item := WordItem{
					Category: category,
					WordID:   fmt.Sprintf("%s_en_%d_%03d", category, round, i+1),
					Word:     word,
					Round:    round,
					Type:     "normal",
					Language: "en",
				}

				av, err := attributevalue.MarshalMap(item)
				if err != nil {
					log.Printf("Failed to marshal EN word item %s: %v", word, err)
					continue
				}

				_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
					TableName: aws.String(tableName),
					Item:      av,
				})

				if err != nil {
					log.Printf("Failed to put EN word item %s: %v", word, err)
				} else {
					log.Printf("Added EN word: %s (Category: %s, Round %d)", word, category, round)
				}
			}
		}
	}

	// 日本語の特殊単語を挿入
	for wordType, words := range SPECIAL_WORDS_JP {
		for i, word := range words {
			item := WordItem{
				Category: "special",
				WordID:   fmt.Sprintf("special_jp_%s_%03d", wordType, i+1),
				Word:     word,
				Round:    0, // 特殊単語は全ラウンドで使用
				Type:     wordType,
				Language: "jp",
			}

			av, err := attributevalue.MarshalMap(item)
			if err != nil {
				log.Printf("Failed to marshal JP special word item %s: %v", word, err)
				continue
			}

			_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
				TableName: aws.String(tableName),
				Item:      av,
			})

			if err != nil {
				log.Printf("Failed to put JP special word item %s: %v", word, err)
			} else {
				log.Printf("Added JP special word: %s (%s)", word, wordType)
			}
		}
	}

	// 英語の特殊単語を挿入
	for wordType, words := range SPECIAL_WORDS_EN {
		for i, word := range words {
			item := WordItem{
				Category: "special",
				WordID:   fmt.Sprintf("special_en_%s_%03d", wordType, i+1),
				Word:     word,
				Round:    0, // 特殊単語は全ラウンドで使用
				Type:     wordType,
				Language: "en",
			}

			av, err := attributevalue.MarshalMap(item)
			if err != nil {
				log.Printf("Failed to marshal EN special word item %s: %v", word, err)
				continue
			}

			_, err = client.PutItem(context.TODO(), &dynamodb.PutItemInput{
				TableName: aws.String(tableName),
				Item:      av,
			})

			if err != nil {
				log.Printf("Failed to put EN special word item %s: %v", word, err)
			} else {
				log.Printf("Added EN special word: %s (%s)", word, wordType)
			}
		}
	}

	log.Println("Word initialization completed!")
}