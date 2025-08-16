import { WordItem } from '../lib/api'

// ラウンド別の単語リスト（難易度アップ）
export const FOOD_WORDS = {
  1: [
    'うどん', 'そば', 'すし', 'ぱん', 'みそ', 'のり', 'たまご', 'みず',
    'ちゃ', 'こめ', 'にく', 'さかな', 'やさい', 'くだもの', 'びーる',
    'わいん', 'こーひー', 'じゅーす', 'みるく', 'よーぐると'
  ],
  2: [
    'らーめん', 'てんぷら', 'やきとり', 'おにぎり', 'かれー', 'ぴざ',
    'ぱすた', 'さらだ', 'すーぷ', 'けーき', 'あいす', 'ちょこれーと',
    'くっきー', 'どーなつ', 'ぷりん', 'はんばーがー', 'ふらいどちきん',
    'おむれつ', 'ぐらたん', 'りぞっと', 'ぱえりあ', 'たぴおか'
  ],
  3: [
    'おこのみやき', 'たこやき', 'やきにく', 'しゃぶしゃぶ', 'すきやき',
    'ちらしずし', 'かつどん', 'おやこどん', 'てんどん', 'うなぎどん',
    'ちゃーはん', 'おむらいす', 'なぽりたん', 'みーとそーす',
    'かるぼなーら', 'ぺぺろんちーの', 'ちーずけーき', 'しょーとけーき',
    'てぃらみす', 'ぱんなこった', 'くれーむぶりゅれ', 'まかろん',
    'えくれあ', 'みるふぃーゆ', 'ろーるけーき', 'もんぶらん'
  ],
  4: [
    'れいぞうこ', 'せんたくき', 'でんしれんじ', 'えあこん', 'てれび', 'らじお',
    'そうじき', 'すいはんき', 'とーすたー', 'どらいやー', 'あいろん', 'でんきぽっと',
    'こーひーめーかー', 'じゅーさーみきさー', 'ほっとぷれーと', 'おーぶんとーすたー',
    'でんきけとる', 'ふーどぷろせっさー', 'はんどみきさー', 'よーぐるとめーかー',
    'あいすくりーむめーかー', 'ぱんやきき', 'たこやきき', 'ほっとさんどめーかー',
    'でんきぐりる', 'すちーむおーぶん', 'でんきなべ', 'いんだくしょんひーたー'
  ],
  5: [
    'おひつじざ', 'おうしざ', 'ふたござ', 'かにざ', 'ししざ', 'おとめざ',
    'てんびんざ', 'さそりざ', 'いてざ', 'やぎざ', 'みずがめざ', 'うおざ',
    'はくちょうざ', 'わしざ', 'こぐまざ', 'おおぐまざ', 'りゅうざ',
    'ぺがすすざ', 'あんどろめだざ', 'かしおぺあざ', 'おりおんざ',
    'こいぬざ', 'おおいぬざ', 'うさぎざ', 'はとざ', 'からすざ',
    'きりんざ', 'ろくぶんぎざ', 'ぼうえんきょうざ', 'とけいざ', 'みなみじゅうじざ'
  ]
}

// 特殊効果の単語（ボーナス・デバフ）
export const SPECIAL_WORDS = {
  bonus: ['ぼーなす', 'らっきー', 'ぱーふぇくと', 'すぺしゃる'],
  debuff: ['とらっぷ', 'でんじゃー', 'はーど', 'えくすとりーむ']
}

// 敵のアイコンとタイトル、制限時間、背景（難易度アップ）
export const ENEMY_DATA = {
  1: {
    icon: '👹',
    defeatedIcon: '❌',
    name: { jp: '初級の鬼', en: 'Beginner Oni' },
    timeLimit: 50,
    maxHP: 100,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-orange-500/20 via-red-500/10 to-pink-500/20',
    theme: 'fire'
  },
  2: {
    icon: '🐺',
    defeatedIcon: '❌',
    name: { jp: '野獣の狼', en: 'Beast Wolf' },
    timeLimit: 45,
    maxHP: 120,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-gray-500/20 via-slate-500/10 to-stone-500/20',
    theme: 'beast'
  },
  3: {
    icon: '🐉',
    defeatedIcon: '❌',
    name: { jp: '古龍', en: 'Ancient Dragon' },
    timeLimit: 40,
    maxHP: 150,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/20',
    theme: 'dragon'
  },
  4: {
    icon: '⚡',
    defeatedIcon: '❌',
    name: { jp: '雷神', en: 'Thunder God' },
    timeLimit: 35,
    maxHP: 200,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-orange-500/30',
    theme: 'thunder'
  },
  5: {
    icon: '🌟',
    defeatedIcon: '❌',
    name: { jp: '星の支配者', en: 'Star Ruler' },
    timeLimit: 30,
    maxHP: 300,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50',
    theme: 'cosmic'
  }
}

export interface GameState {
  round: number
  playerHP: number
  enemyHP: number
  currentWord: string
  currentWordItem: WordItem | null
  currentWordTranslation: string | null  // 翻訳されたヒント
  userInput: string
  timeLeft: number
  gameStatus: 'categorySelection' | 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'
  winner: 'player' | 'enemy' | null
  wordsCompleted: number
  combo: number
  isSpecialWord: boolean
  specialType: 'normal' | 'bonus' | 'debuff'
  lastWord: string
  score: number
  maxCombo: number
  roundStartTime: number
  totalTime: number
  roundStartScore: number
  availableWords: WordItem[]
  wordsLoading: boolean
  selectedCategory: string
  usedWords: Set<string>
  questionLanguage: 'jp' | 'en'  // お題の言語
  answerLanguage: 'jp' | 'en'    // 回答の言語
  displayLanguage: 'jp' | 'en'   // UI表示言語
}

export interface EffectState {
  showExplosion: boolean
  explosionSkippable: boolean
  showDamage: boolean
  showEnemyDamage: boolean
  lastDamage: number
  showScoreEffect: boolean
  lastScoreGain: number
  scoreEffectKey: number
}

// 多言語テキスト
export type TextKey = 'round' | 'score' | 'combo' | 'timeLeft' | 'seconds' | 'victory' | 'defeat' |
  'gameStart' | 'roundStart' | 'categorySelect' | 'nextRound' | 'retry' |
  'gameComplete' | 'bonusEffect' | 'debuffEffect' | 'instructions' | 'comboTip' |
  'wordsCompleted' | 'timeLimit' | 'allEnemiesDefeated' |
  'defeatedEnemy' | 'nextEnemy' | 'hp' | 'defeated' | 'words' | 'completed' | 'placeholder' |
  'typingGameRanking' | 'player' | 'time' | 'spaceKeyTip' | 'nextRoundButton' | 'gameCompleteButton'

export const getLocalizedText = (key: TextKey, language: 'jp' | 'en'): string => {
  const texts: Record<'jp' | 'en', Record<TextKey, string>> = {
    jp: {
      round: 'ラウンド',
      score: 'スコア',
      combo: 'コンボ',
      timeLeft: '残り時間',
      seconds: '秒',
      victory: '勝利！',
      defeat: '敗北...',
      gameStart: 'ゲーム開始',
      roundStart: 'ラウンド {round} 開始！',
      categorySelect: 'カテゴリーを選択してください',
      nextRound: '次のラウンドへ',
      retry: 'リトライ',
      gameComplete: '全ラウンドクリア！',
      bonusEffect: 'ボーナス: 大ダメージ + HP回復 + 時間ボーナス',
      debuffEffect: 'デバフ: 低ダメージ',
      instructions: '💡 変換確定時に自動判定 / Enter でも判定',
      comboTip: '🔥 コンボ3以上でボーナス ✨ 緑=ボーナス ⚠️ 赤=デバフ',
      wordsCompleted: '単語',
      timeLimit: '時間',
      allEnemiesDefeated: '全敵撃破！',
      defeatedEnemy: '倒した敵',
      nextEnemy: '次の敵',
      hp: 'HP',
      defeated: '撃破',
      words: '単語',
      completed: '完了',
      placeholder: 'ここにタイピング...',
      typingGameRanking: 'タイピングゲームランキング',
      player: 'プレイヤー',
      time: '時間',
      spaceKeyTip: '💡 スペースキーでも進めます',
      nextRoundButton: '⚔️ 次のラウンドへ',
      gameCompleteButton: '🏆 ゲーム完了'
    },
    en: {
      round: 'Round',
      score: 'Score',
      combo: 'Combo',
      timeLeft: 'Time Left',
      seconds: 's',
      victory: 'Victory!',
      defeat: 'Defeat...',
      gameStart: 'Start Game',
      roundStart: 'Start Round {round}!',
      categorySelect: 'Please select a category',
      nextRound: 'Next Round',
      retry: 'Retry',
      gameComplete: 'All Rounds Complete!',
      bonusEffect: 'Bonus: High Damage + HP Recovery + Time Bonus',
      debuffEffect: 'Debuff: Low Damage',
      instructions: '💡 Auto-judge on conversion / Press Enter to judge',
      comboTip: '🔥 Combo 3+ for bonus ✨ Green=Bonus ⚠️ Red=Debuff',
      wordsCompleted: 'Words',
      timeLimit: 'Time',
      allEnemiesDefeated: 'All Enemies Defeated!',
      defeatedEnemy: 'Defeated Enemy',
      nextEnemy: 'Next Enemy',
      hp: 'HP',
      defeated: 'Defeated',
      words: 'Words',
      completed: 'Completed',
      placeholder: 'Type here...',
      typingGameRanking: 'Typing Game Ranking',
      player: 'Player',
      time: 'Time',
      spaceKeyTip: '💡 Press Space to continue',
      nextRoundButton: '⚔️ Next Round',
      gameCompleteButton: '🏆 Game Complete'
    }
  }

  return texts[language][key] || texts.jp[key]
}