'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ExplosionEffect from './ExplosionEffect'
import DamageEffect from './DamageEffect'
import ComboEffect from './ComboEffect'
import EnemyDamageEffect from './EnemyDamageEffect'
import ScoreEffect from './ScoreEffect'
import Leaderboard from './Leaderboard'
import ScoreSubmission from './ScoreSubmission'
import CategorySelection from './CategorySelection'
import { apiClient, WordItem } from '../lib/api'
import { error } from 'console'

// ラウンド別の単語リスト（難易度アップ）
const FOOD_WORDS = {
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
const SPECIAL_WORDS = {
  bonus: ['ぼーなす', 'らっきー', 'ぱーふぇくと', 'すぺしゃる'],
  debuff: ['とらっぷ', 'でんじゃー', 'はーど', 'えくすとりーむ']
}

// 敵のアイコンとタイトル、制限時間、背景（難易度アップ）
const ENEMY_DATA = {
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

interface GameState {
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

interface EffectState {
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
type TextKey = 'round' | 'score' | 'combo' | 'timeLeft' | 'seconds' | 'victory' | 'defeat' |
  'gameStart' | 'roundStart' | 'categorySelect' | 'nextRound' | 'retry' |
  'gameComplete' | 'bonusEffect' | 'debuffEffect' | 'instructions' | 'comboTip' |
  'wordsCompleted' | 'timeLimit' | 'allEnemiesDefeated' |
  'defeatedEnemy' | 'nextEnemy' | 'hp' | 'defeated' | 'words' | 'completed' | 'placeholder' |
  'typingGameRanking' | 'player' | 'time' | 'spaceKeyTip' | 'nextRoundButton' | 'gameCompleteButton'

const getLocalizedText = (key: TextKey, language: 'jp' | 'en'): string => {
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

export default function TypingGame() {
  // ローカルストレージから表示言語を読み込み（ハイドレーション対応）
  const getInitialDisplayLanguage = (): 'jp' | 'en' => {
    // サーバーサイドでは常に日本語を返してハイドレーションエラーを防ぐ
    return 'jp'
  }

  const [gameState, setGameState] = useState<GameState>({
    round: 1,
    playerHP: 100,
    enemyHP: ENEMY_DATA[1].maxHP,
    currentWord: '',
    currentWordItem: null,
    currentWordTranslation: null,
    userInput: '',
    timeLeft: 45,
    gameStatus: 'categorySelection',
    winner: null,
    wordsCompleted: 0,
    combo: 0,
    isSpecialWord: false,
    specialType: 'normal',
    lastWord: '',
    score: 0,
    maxCombo: 0,
    roundStartTime: 0,
    totalTime: 1, // 最小1秒
    roundStartScore: 0,
    availableWords: [],
    wordsLoading: false,
    selectedCategory: '',
    usedWords: new Set<string>(),
    questionLanguage: 'jp',  // お題の言語
    answerLanguage: 'jp',    // 回答の言語
    displayLanguage: getInitialDisplayLanguage()    // UI表示言語
  })

  const [effectState, setEffectState] = useState<EffectState>({
    showExplosion: false,
    explosionSkippable: false,
    showDamage: false,
    showEnemyDamage: false,
    lastDamage: 0,
    showScoreEffect: false,
    lastScoreGain: 0,
    scoreEffectKey: 0
  })

  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showScoreSubmission, setShowScoreSubmission] = useState(false)
  const [showCategorySelection, setShowCategorySelection] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const [isComposing, setIsComposing] = useState(false)

  // コンポーネントのマウント状態を管理
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // クライアントサイドでローカルストレージから言語設定を読み込み
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('typingGameDisplayLanguage')
        if (saved === 'en' || saved === 'jp') {
          setGameState(prev => ({ ...prev, displayLanguage: saved }))
        }
      } catch (error) {
        console.warn('Failed to read display language from localStorage:', error)
      }
    }
  }, [isMounted])

  // 表示言語の変更をローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('typingGameDisplayLanguage', gameState.displayLanguage)
      } catch (error) {
        console.warn('Failed to save display language to localStorage:', error)
      }
    }
  }, [gameState.displayLanguage])

  // スコア計算関数
  const calculateScore = (damage: number, combo: number, specialType: string, timeBonus: number = 0) => {
    let baseScore = damage * 10 // 基本スコア

    // コンボボーナス
    const comboBonus = combo >= 3 ? Math.pow(combo - 2, 1.5) * 50 : 0

    // 特殊単語ボーナス
    let specialBonus = 0
    if (specialType === 'bonus') specialBonus = 200
    if (specialType === 'debuff') specialBonus = 100 // デバフでも少しボーナス

    // 時間ボーナス
    const timeBonusScore = timeBonus * 20

    return Math.floor(baseScore + comboBonus + specialBonus + timeBonusScore)
  }

  // 簡単な翻訳辞書
  const getSimpleTranslation = (word: string, fromLang: 'jp' | 'en', toLang: 'jp' | 'en'): string | null => {
    if (fromLang === toLang) return word

    const translations: Record<string, Record<string, string>> = {
      // 日本語 → 英語
      'りんご': { en: 'apple' },
      'みかん': { en: 'orange' },
      'バナナ': { en: 'banana' },
      'いちご': { en: 'strawberry' },
      'ぶどう': { en: 'grape' },
      'すし': { en: 'sushi' },
      'ラーメン': { en: 'ramen' },
      'うどん': { en: 'udon' },
      'そば': { en: 'soba' },
      'カレー': { en: 'curry' },
      'てんぷら': { en: 'tempura' },
      'やきとり': { en: 'yakitori' },
      'おにぎり': { en: 'onigiri' },
      'みそしる': { en: 'miso soup' },
      'とんかつ': { en: 'tonkatsu' },
      'みず': { en: 'water' },
      'お茶': { en: 'tea' },
      'コーヒー': { en: 'coffee' },
      'ジュース': { en: 'juice' },
      'ビール': { en: 'beer' },
      'わいん': { en: 'wine' },
      'ウイスキー': { en: 'whiskey' },
      'ブランデー': { en: 'brandy' },
      'ウォッカ': { en: 'vodka' },
      'パン': { en: 'bread' },
      'ごはん': { en: 'rice' },
      'やさい': { en: 'vegetables' },
      'にく': { en: 'meat' },
      'さかな': { en: 'fish' },
      'たまご': { en: 'egg' },
      'ぎゅうにゅう': { en: 'milk' },
      'しお': { en: 'salt' },
      'さとう': { en: 'sugar' },
      'あぶら': { en: 'oil' },
      'バター': { en: 'butter' },
      'チーズ': { en: 'cheese' },
      'ヨーグルト': { en: 'yogurt' },
      'アイス': { en: 'ice cream' },
      'ケーキ': { en: 'cake' },
      'クッキー': { en: 'cookie' },
      'チョコレート': { en: 'chocolate' },
      'キャンディー': { en: 'candy' },
      'しょうゆ': { en: 'soy sauce' },
      'みそ': { en: 'miso' },
      'まんごー': { en: 'mango' },
      'ばなな': { en: 'banana' },
      'ぱいなっぷる': { en: 'pineapple' },
      'おれんじ': { en: 'orange' },
      'れもん': { en: 'lemon' },
      'ぐれーぷふるーつ': { en: 'grapefruit' },
      'きうい': { en: 'kiwi' },
      'めろん': { en: 'melon' },
      'すいか': { en: 'watermelon' },
      'もも': { en: 'peach' },
      'なし': { en: 'pear' },
      'さくらんぼ': { en: 'cherry' },
      'こしょう': { en: 'pepper' },
      'にんにく': { en: 'garlic' },
      'しょうが': { en: 'ginger' },
      'わさび': { en: 'wasabi' },
      'のり': { en: 'seaweed' },
      'こんぶ': { en: 'kelp' },
      'とうふ': { en: 'tofu' },
      'なっとう': { en: 'natto' },
      'みりん': { en: 'mirin' },
      'さけ': { en: 'sake' },
      'ビーフ': { en: 'beef' },
      'ポーク': { en: 'pork' },
      'チキン': { en: 'chicken' },
      'サラダ': { en: 'salad' },
      'スープ': { en: 'soup' },
      'ピザ': { en: 'pizza' },
      'ハンバーガー': { en: 'hamburger' },
      'サンドイッチ': { en: 'sandwich' },
      'パスタ': { en: 'pasta' },
      'ステーキ': { en: 'steak' },
      'フライドポテト': { en: 'french fries' },
      'オムレツ': { en: 'omelet' },
      'ホットドッグ': { en: 'hot dog' },
      'ドーナツ': { en: 'donut' },
      'マフィン': { en: 'muffin' },
      'クロワッサン': { en: 'croissant' },
      'ワッフル': { en: 'waffle' },
      'パンケーキ': { en: 'pancake' },
      '車': { en: 'car' },
      '電車': { en: 'train' },
      'バス': { en: 'bus' },
      '飛行機': { en: 'airplane' },
      '自転車': { en: 'bicycle' },
      'タクシー': { en: 'taxi' },
      '船': { en: 'ship' },
      'バイク': { en: 'motorcycle' },
      '新宿': { en: 'shinjuku' },
      '渋谷': { en: 'shibuya' },
      '東京': { en: 'tokyo' },
      '大阪': { en: 'osaka' },
      '京都': { en: 'kyoto' },
      '横浜': { en: 'yokohama' },
      '名古屋': { en: 'nagoya' },
      '福岡': { en: 'fukuoka' },
      // 英語 → 日本語
      'apple': { jp: 'りんご' },
      'orange': { jp: 'みかん' },
      'banana': { jp: 'バナナ' },
      'strawberry': { jp: 'いちご' },
      'grape': { jp: 'ぶどう' },
      'sushi': { jp: 'すし' },
      'ramen': { jp: 'ラーメン' },
      'udon': { jp: 'うどん' },
      'soba': { jp: 'そば' },
      'curry': { jp: 'カレー' },
      'tempura': { jp: 'てんぷら' },
      'yakitori': { jp: 'やきとり' },
      'onigiri': { jp: 'おにぎり' },
      'miso soup': { jp: 'みそしる' },
      'tonkatsu': { jp: 'とんかつ' },
      'water': { jp: 'みず' },
      'tea': { jp: 'お茶' },
      'coffee': { jp: 'コーヒー' },
      'juice': { jp: 'ジュース' },
      'beer': { jp: 'ビール' },
      'wine': { jp: 'わいん' },
      'whiskey': { jp: 'ウイスキー' },
      'brandy': { jp: 'ブランデー' },
      'vodka': { jp: 'ウォッカ' },
      'bread': { jp: 'パン' },
      'rice': { jp: 'ごはん' },
      'vegetables': { jp: 'やさい' },
      'meat': { jp: 'にく' },
      'fish': { jp: 'さかな' },
      'egg': { jp: 'たまご' },
      'milk': { jp: 'ぎゅうにゅう' },
      'salt': { jp: 'しお' },
      'sugar': { jp: 'さとう' },
      'oil': { jp: 'あぶら' },
      'butter': { jp: 'バター' },
      'cheese': { jp: 'チーズ' },
      'yogurt': { jp: 'ヨーグルト' },
      'ice cream': { jp: 'アイス' },
      'cake': { jp: 'ケーキ' },
      'cookie': { jp: 'クッキー' },
      'chocolate': { jp: 'チョコレート' },
      'candy': { jp: 'キャンディー' },
      'soy sauce': { jp: 'しょうゆ' },
      'miso': { jp: 'みそ' },
      'mango': { jp: 'まんごー' },
      'pineapple': { jp: 'ぱいなっぷる' },
      'lemon': { jp: 'れもん' },
      'grapefruit': { jp: 'ぐれーぷふるーつ' },
      'kiwi': { jp: 'きうい' },
      'melon': { jp: 'めろん' },
      'watermelon': { jp: 'すいか' },
      'peach': { jp: 'もも' },
      'pear': { jp: 'なし' },
      'cherry': { jp: 'さくらんぼ' },
      'pepper': { jp: 'こしょう' },
      'garlic': { jp: 'にんにく' },
      'ginger': { jp: 'しょうが' },
      'wasabi': { jp: 'わさび' },
      'seaweed': { jp: 'のり' },
      'kelp': { jp: 'こんぶ' },
      'tofu': { jp: 'とうふ' },
      'natto': { jp: 'なっとう' },
      'mirin': { jp: 'みりん' },
      'sake': { jp: 'さけ' },
      'beef': { jp: 'ビーフ' },
      'pork': { jp: 'ポーク' },
      'chicken': { jp: 'チキン' },
      'salad': { jp: 'サラダ' },
      'soup': { jp: 'スープ' },
      'pizza': { jp: 'ピザ' },
      'hamburger': { jp: 'ハンバーガー' },
      'sandwich': { jp: 'サンドイッチ' },
      'pasta': { jp: 'パスタ' },
      'steak': { jp: 'ステーキ' },
      'french fries': { jp: 'フライドポテト' },
      'omelet': { jp: 'オムレツ' },
      'hot dog': { jp: 'ホットドッグ' },
      'donut': { jp: 'ドーナツ' },
      'muffin': { jp: 'マフィン' },
      'croissant': { jp: 'クロワッサン' },
      'waffle': { jp: 'ワッフル' },
      'pancake': { jp: 'パンケーキ' },
      'car': { jp: '車' },
      'train': { jp: '電車' },
      'bus': { jp: 'バス' },
      'airplane': { jp: '飛行機' },
      'bicycle': { jp: '自転車' },
      'taxi': { jp: 'タクシー' },
      'ship': { jp: '船' },
      'motorcycle': { jp: 'バイク' },
      'shinjuku': { jp: '新宿' },
      'shibuya': { jp: '渋谷' },
      'tokyo': { jp: '東京' },
      'osaka': { jp: '大阪' },
      'kyoto': { jp: '京都' },
      'yokohama': { jp: '横浜' },
      'nagoya': { jp: '名古屋' },
      'fukuoka': { jp: '福岡' }
    }

    return translations[word]?.[toLang] || null
  }

  // 現在の単語の翻訳を取得する関数
  const getWordTranslation = async (currentWordItem: WordItem, targetLanguage: 'jp' | 'en'): Promise<string | null> => {
    console.log(`=== getWordTranslation Debug ===`)
    console.log(`Looking for translation of: "${currentWordItem.word}" (${currentWordItem.language})`)
    console.log(`Target language: ${targetLanguage}`)
    console.log(`Word ID: ${currentWordItem.word_id}`)

    // まず簡単な翻訳辞書を試す（フォールバック用）
    const simpleTranslation = getSimpleTranslation(currentWordItem.word, currentWordItem.language, targetLanguage)
    if (simpleTranslation) {
      console.log(`✅ Simple translation found: ${currentWordItem.word} -> ${simpleTranslation}`)
      return simpleTranslation
    }

    // word_idが存在する場合はDynamoDBから翻訳を取得
    if (currentWordItem.word_id && currentWordItem.word_id !== 'undefined') {
      try {
        console.log(`Fetching translation from DynamoDB for word_id: ${currentWordItem.word_id}`)
        const response = await apiClient.getTranslation(currentWordItem.word_id, targetLanguage)
        
        if (response.data && response.data.translation) {
          console.log(`✅ DynamoDB translation found: ${currentWordItem.word} -> ${response.data.translation}`)
          return response.data.translation
        }
      } catch (error) {
        console.warn(`❌ DynamoDB translation not found for word_id: ${currentWordItem.word_id}`, error)
      }
    }

    // DynamoDBで見つからない場合は従来の方法を試す
    try {
      // 対応する言語のword_idを生成（例: beginner_words_jp_1_043 -> beginner_words_en_1_043）
      const currentLang = currentWordItem.language || (currentWordItem.word_id.includes('_jp_') ? 'jp' : 'en')
      const targetLangCode = targetLanguage === 'jp' ? 'jp' : 'en'
      const expectedWordId = currentWordItem.word_id.replace(`_${currentLang}_`, `_${targetLangCode}_`)
      
      console.log(`Looking for corresponding word_id: ${currentWordItem.word_id} -> ${expectedWordId}`)
      
      // 対応する言語の単語を取得
      console.log(`Fetching words for category: ${currentWordItem.category}, round: ${currentWordItem.round}, language: ${targetLanguage}`)
      const response = await apiClient.getWords(currentWordItem.category, currentWordItem.round, targetLanguage)
      const translatedWords = response.words || []

      console.log(`Found ${translatedWords.length} words in target language`)
      console.log(`Sample translated words:`, translatedWords.slice(0, 3).map(w => `${w.word}(${w.word_id})`))

      // 対応するword_idの単語を探す
      const translatedWord = translatedWords.find(word => word.word_id === expectedWordId)

      if (translatedWord) {
        console.log(`✅ API translation found: ${currentWordItem.word} -> ${translatedWord.word}`)
        return translatedWord.word
      } else {
        console.warn(`❌ No translation found for expected word_id: ${expectedWordId}`)
        return null
      }
    } catch (error) {
      console.error('Error fetching translation:', error)
      return null
    }
  }

  // 単語と翻訳を設定する関数
  const setWordWithTranslation = async (word: string, wordItem: WordItem | null, questionLang: 'jp' | 'en', answerLang: 'jp' | 'en') => {
    let translation: string | null = null

    // お題の言語と回答の言語が異なる場合のみ翻訳を取得
    if (questionLang !== answerLang && wordItem) {
      translation = await getWordTranslation(wordItem, answerLang)
      console.log(`Translation for hint: ${word} -> ${translation}`)
    }

    return {
      word,
      wordItem,
      translation
    }
  }

  // 単語を取得する関数
  const fetchWordsForRound = async (category: string, round: number, language: 'jp' | 'en' = 'jp', abortSignal?: AbortSignal): Promise<void> => {
    if (!category) {
      console.warn('No category selected')
      return
    }

    // 既にキャンセルされている場合は処理を中断
    if (abortSignal?.aborted) {
      return
    }

    setGameState(prev => ({ ...prev, wordsLoading: true }))
    try {
      // 言語パラメータ付きでAPIを呼び出し
      console.log(`Fetching words for ${category}, round ${round}, language ${language}`)
      
      // キャンセルチェック
      if (abortSignal?.aborted) {
        return
      }
      
      const response = await apiClient.getWords(category, round, language)
      const allWords = response.words || []

      // 特殊単語の取得は一時的に無効化（specialカテゴリーが存在しないため）
      // try {
      //   const specialResponse = await apiClient.getWords('special', 0, language)
      //   const specialWords = specialResponse.words || []
      //   console.log(`Fetched ${specialWords.length} special words`)
      //   allWords.push(...specialWords)
      // } catch (error) {
      //   console.warn('Failed to fetch special words:', error)
      // }

      // 言語でフィルタリング（バックエンドが対応していない場合の対策）
      console.log(`API returned ${allWords.length} words for ${category} round ${round}`)
      console.log('Sample words:', allWords.slice(0, 3))

      // 言語プロパティを持つ単語の数をチェック
      const wordsWithLanguage = allWords.filter(word => word.language)
      console.log(`Words with language property: ${wordsWithLanguage.length}`)

      let filteredWords = allWords

      // 言語プロパティを持つ単語が存在する場合のみフィルタリング
      if (wordsWithLanguage.length > 0) {
        filteredWords = allWords.filter(word => word.language === language)
        console.log(`After filtering for ${language}: ${filteredWords.length} words`)

        // 指定言語の単語がない場合は、言語プロパティを持つすべての単語を表示
        if (filteredWords.length === 0) {
          console.warn(`No words found for ${language}, showing available languages:`)
          const languageSet = new Set(wordsWithLanguage.map(w => w.language))
          const availableLanguages = Array.from(languageSet)
          console.log('Available languages:', availableLanguages)
        }
      } else {
        console.log('Words do not have language property, inferring language from content')

        // 単語の内容から言語を推定してフィルタリング
        filteredWords = allWords.filter(word => {
          const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word.word)
          const isEnglish = /^[a-zA-Z\s]+$/.test(word.word)

          if (language === 'jp') {
            return isJapanese
          } else if (language === 'en') {
            return isEnglish
          }
          return false
        })

        console.log(`After language inference for ${language}: ${filteredWords.length} words`)
        console.log('Sample filtered words:', filteredWords.slice(0, 3).map(w => w.word))
      }

      // フィルタリング後に単語がない場合はフォールバックを使用
      if (filteredWords.length === 0) {
        console.warn(`No words found for language ${language}, using fallback`)
        throw new Error('No words found for selected language')
      }

      return new Promise((resolve) => {
        // キャンセルチェック
        if (abortSignal?.aborted) {
          resolve()
          return
        }
        
        setGameState(prev => ({
          ...prev,
          availableWords: filteredWords,
          wordsLoading: false
        }))
        console.log(`Loaded ${filteredWords.length} words for category ${category}, round ${round}, language ${language}`)
        // 状態更新完了を待つ
        setTimeout(resolve, 50)
      })
    } catch (error) {
      console.error(`Failed to fetch words for category ${category}, round ${round}:`, error)
      // フォールバック: 新しいカテゴリーと言語に応じたハードコードされた単語を使用
      let fallbackWords: string[] = []

      if (language === 'jp') {
        if (category === 'beginner_words') {
          fallbackWords = ['みず', 'たべもの', 'のみもの', 'いえ', 'がっこう', 'しごと', 'ともだち', 'かぞく', 'いぬ', 'ねこ']
        } else if (category === 'intermediate_words') {
          fallbackWords = ['かんきょう', 'おんだんか', 'こうがい', 'りさいくる', 'しぜん', 'どうぶつ', 'しょくぶつ', 'せいたいけい', 'ちきゅう', 'うちゅう']
        } else if (category === 'beginner_conversation') {
          fallbackWords = ['おはよう', 'こんにちは', 'こんばんは', 'おやすみ', 'はじめまして', 'よろしく', 'ありがとう', 'すみません', 'ごめんなさい', 'いいえ']
        } else if (category === 'intermediate_conversation') {
          fallbackWords = ['おひさしぶりです', 'げんきでしたか', 'おかげさまで', 'いかがですか', 'どうされましたか', 'なにかありましたか', 'しんぱいしています', 'だいじょうぶでしょうか', 'てつだいましょうか', 'なにかできることは']
        } else {
          // 古いカテゴリーの場合
          if (category === 'food') {
            fallbackWords = FOOD_WORDS[round as keyof typeof FOOD_WORDS] || []
          } else if (category === 'vehicle') {
            fallbackWords = ['くるま', 'でんしゃ', 'ばす', 'ひこうき', 'ふね']
          } else if (category === 'station') {
            fallbackWords = ['とうきょう', 'しんじゅく', 'しぶや', 'いけぶくろ', 'うえの']
          } else {
            fallbackWords = ['みず', 'たべもの', 'のみもの', 'いえ', 'がっこう']
          }
        }
      } else {
        // 英語のフォールバック単語
        if (category === 'beginner_words') {
          fallbackWords = ['water', 'food', 'drink', 'house', 'school', 'work', 'friend', 'family', 'dog', 'cat']
        } else if (category === 'intermediate_words') {
          fallbackWords = ['environment', 'global warming', 'pollution', 'recycle', 'nature', 'animal', 'plant', 'ecosystem', 'earth', 'space']
        } else if (category === 'beginner_conversation') {
          fallbackWords = ['good morning', 'hello', 'good evening', 'good night', 'nice to meet you', 'please treat me well', 'thank you', 'excuse me', 'sorry', 'no']
        } else if (category === 'intermediate_conversation') {
          fallbackWords = ['long time no see', 'how have you been', 'thanks to you', 'how are things', 'what happened', 'did something happen', 'i am worried', 'will it be okay', 'shall i help', 'is there anything i can do']
        } else {
          // 古いカテゴリーの場合
          if (category === 'food') {
            fallbackWords = ['rice', 'bread', 'meat', 'fish', 'egg', 'milk', 'water', 'tea']
          } else if (category === 'vehicle') {
            fallbackWords = ['car', 'train', 'bus', 'plane', 'ship']
          } else if (category === 'station') {
            fallbackWords = ['tokyo', 'osaka', 'kyoto', 'yokohama', 'nagoya']
          } else {
            fallbackWords = ['water', 'food', 'drink', 'house', 'school']
          }
        }
      }

      const wordItems: WordItem[] = fallbackWords.map((word, index) => ({
        category: category,
        word_id: `fallback_${round}_${index}`,
        word: word,
        round: round,
        type: 'normal' as const,
        language: language
      }))

      return new Promise((resolve) => {
        // キャンセルチェック
        if (abortSignal?.aborted) {
          resolve()
          return
        }
        
        setGameState(prev => ({
          ...prev,
          availableWords: wordItems,
          wordsLoading: false
        }))
        // 状態更新完了を待つ
        setTimeout(resolve, 50)
      })
    }
  }

  // ランダムな単語を生成（重複回避）
  const generateRandomWord = useCallback((lastWord: string = '') => {
    console.log(`generateRandomWord called, available words: ${gameState.availableWords.length}`)
    if (gameState.availableWords.length === 0) {
      console.warn('No words available for current round')
      return {
        word: 'えらー',
        type: 'normal' as const,
        wordItem: null
      }
    }

    // 未使用の単語から選択
    let normalWords = gameState.availableWords.filter(w => w.type === 'normal' && !gameState.usedWords.has(w.word))
    let bonusWords = gameState.availableWords.filter(w => w.type === 'bonus' && !gameState.usedWords.has(w.word))
    let debuffWords = gameState.availableWords.filter(w => w.type === 'debuff' && !gameState.usedWords.has(w.word))
    
    // 全ての単語を使い切った場合はリセット
    if (normalWords.length === 0 && bonusWords.length === 0 && debuffWords.length === 0) {
      console.log('All words used, resetting used words set')
      // usedWordsをクリアして再度フィルタリング
      const allNormalWords = gameState.availableWords.filter(w => w.type === 'normal')
      const allBonusWords = gameState.availableWords.filter(w => w.type === 'bonus')
      const allDebuffWords = gameState.availableWords.filter(w => w.type === 'debuff')
      normalWords = allNormalWords
      bonusWords = allBonusWords
      debuffWords = allDebuffWords
      
      // usedWordsをリセット（この関数内では直接変更できないので、戻り値で通知）
      return {
        word: 'RESET_USED_WORDS',
        type: 'normal' as const,
        wordItem: null,
        resetUsedWords: true
      }
    }

    console.log(`Available word counts - normal: ${normalWords.length}, bonus: ${bonusWords.length}, debuff: ${debuffWords.length}`)

    let selectedWord: WordItem
    let wordType: 'normal' | 'bonus' | 'debuff' = 'normal'

    // 20%の確率で特殊単語
    if (Math.random() < 0.2 && (bonusWords.length > 0 || debuffWords.length > 0)) {
      const isBonus = Math.random() < 0.6 // 60%でボーナス、40%でデバフ
      const specialWords = isBonus ? bonusWords : debuffWords
      wordType = isBonus ? 'bonus' : 'debuff'
      selectedWord = specialWords[Math.floor(Math.random() * specialWords.length)]
    } else {
      selectedWord = normalWords[Math.floor(Math.random() * normalWords.length)]
    }

    return {
      word: selectedWord.word,
      type: wordType,
      wordItem: selectedWord
    }
  }, [gameState.availableWords, gameState.usedWords])

  // ゲーム開始
  const startRound = useCallback(async () => {
    console.log(`Starting round ${gameState.round} with category: ${gameState.selectedCategory}`)
    
    // AbortControllerを作成
    const abortController = new AbortController()
    
    try {
      // まず単語を取得してからゲームを開始
      await fetchWordsForRound(gameState.selectedCategory, gameState.round, gameState.questionLanguage, abortController.signal)

    const timeLimit = ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].timeLimit
    let wordData = generateRandomWord(gameState.lastWord)
    
    // 使用済み単語のリセットが必要な場合
    if (wordData.word === 'RESET_USED_WORDS') {
      setGameState(prev => ({ ...prev, usedWords: new Set<string>() }))
      wordData = generateRandomWord(gameState.lastWord) // 再度生成
    }
    
    const newWord = typeof wordData === 'string' ? wordData : wordData.word
    const newWordItem = typeof wordData !== 'string' ? wordData.wordItem : null

    console.log(`=== Selected Word Debug ===`)
    console.log(`Selected word: "${newWord}"`)
    console.log(`Word item:`, newWordItem)
    console.log(`Question language: ${gameState.questionLanguage}`)
    console.log(`Answer language: ${gameState.answerLanguage}`)
    console.log(`=== End Selected Word Debug ===`)

      // キャンセルチェック
      if (abortController.signal.aborted) {
        return
      }

      // 翻訳を取得
      const wordWithTranslation = await setWordWithTranslation(newWord, newWordItem, gameState.questionLanguage, gameState.answerLanguage)

      // 再度キャンセルチェック
      if (abortController.signal.aborted) {
        return
      }

      setGameState(prev => {
      // 使用済み単語に追加
      const newUsedWords = new Set(prev.usedWords)
      newUsedWords.add(newWord)

      return {
        ...prev,
        currentWord: wordWithTranslation.word,
        currentWordItem: wordWithTranslation.wordItem,
        currentWordTranslation: wordWithTranslation.translation,
        userInput: '',
        timeLeft: timeLimit,
        gameStatus: 'playing',
        wordsCompleted: 0,
        combo: 0,
        isSpecialWord: typeof wordData !== 'string',
        specialType: typeof wordData === 'string' ? 'normal' : wordData.type,
        lastWord: newWord,
        roundStartTime: Date.now(),
        roundStartScore: prev.score,
        usedWords: newUsedWords
      }
    })

    // 入力フィールドにフォーカス
    setTimeout(() => {
      if (inputRef.current) {
        try {
          inputRef.current.focus()
        } catch (error) {
          console.log('Focus error:', error)
        }
      }
    }, 100)
    } catch (error) {
      console.error('Error in startRound:', error)
      // エラー時は安全にゲーム状態をリセット
      setGameState(prev => ({
        ...prev,
        gameStatus: 'categorySelection',
        wordsLoading: false
      }))
    }
  }, [generateRandomWord])

  // タイマー処理
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && gameState.timeLeft > 0 && gameState.enemyHP > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }))
      }, 1000)
      return () => clearTimeout(timer)
    } else if (gameState.gameStatus === 'playing' && gameState.timeLeft === 0 && gameState.enemyHP > 0) {
      // 時間切れ - 敵の勝利（敵がまだ生きている場合のみ）
      setGameState(prev => ({
        ...prev,
        gameStatus: 'gameEnd',
        winner: 'enemy'
      }))
      // 敗北時もスコア送信画面を表示
      if (gameState.score > 0) {
        setShowScoreSubmission(true)
      }
    }
  }, [gameState.gameStatus, gameState.timeLeft, gameState.enemyHP])

  // 入力処理（変換中は判定しない）
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // スコア送信画面やリーダーボード表示中は入力を無効にする
    if (showScoreSubmission || showLeaderboard) {
      return
    }

    const input = e.target.value
    setGameState(prev => ({ ...prev, userInput: input }))
  }

  // 入力フィールドをクリアする関数
  const clearInput = () => {
    // 少し遅延させてクリア
    setTimeout(() => {
      setGameState(prev => ({ ...prev, userInput: '' }))
      if (inputRef.current) {
        try {
          inputRef.current.value = ''
          inputRef.current.focus()
        } catch (error) {
          console.log('Input clear error:', error)
        }
      }
    }, 50)
  }

  // 日本語変換開始
  const handleCompositionStart = () => {
    // スコア送信画面やリーダーボード表示中は変換を無効にする
    if (showScoreSubmission || showLeaderboard) {
      return
    }
    setIsComposing(true)
  }

  // 日本語変換終了
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    // スコア送信画面やリーダーボード表示中は変換を無効にする
    if (showScoreSubmission || showLeaderboard) {
      return
    }

    setIsComposing(false)
    // 変換確定後に判定
    setTimeout(async () => {
      if (e.currentTarget && e.currentTarget.value !== undefined) {
        await checkAnswer(e.currentTarget.value)
      }
    }, 10)
  }

  // 答えが正しいかどうかをチェックして結果を返す関数
  const checkAnswerAndReturnResult = async (input: string): Promise<boolean> => {
    const currentWord = gameState.currentWord
    const currentWordItem = gameState.currentWordItem

    console.log(`=== checkAnswerAndReturnResult Debug ===`)
    console.log(`Input: "${input}"`)
    console.log(`Current word: "${currentWord}"`)
    console.log(`Question language: ${gameState.questionLanguage}`)
    console.log(`Answer language: ${gameState.answerLanguage}`)
    console.log(`Current word item:`, currentWordItem)

    let isCorrect = false

    // お題の言語と回答の言語が同じ場合
    if (gameState.questionLanguage === gameState.answerLanguage) {
      isCorrect = input === currentWord
      console.log(`Same language check: ${input} === ${currentWord} ? ${isCorrect}`)
    } else {
      console.log(`Different languages, attempting translation...`)
      // お題の言語と回答の言語が異なる場合、翻訳をチェック
      if (currentWordItem) {
        console.log(`Getting translation for word_id: ${currentWordItem.word_id}`)
        const translation = await getWordTranslation(currentWordItem, gameState.answerLanguage)
        if (translation) {
          isCorrect = input === translation
          console.log(`Translation check: ${input} === ${translation} ? ${isCorrect}`)
        } else {
          // 翻訳が見つからない場合は、元の単語でもチェック
          isCorrect = input === currentWord
          console.log(`No translation found, fallback check: ${input} === ${currentWord} ? ${isCorrect}`)
        }
      } else {
        console.log(`No currentWordItem available, using original word`)
        isCorrect = input === currentWord
      }
    }

    console.log(`Final result: ${isCorrect}`)
    console.log(`=== End Debug ===`)

    return isCorrect
  }

  // 答えをチェックして処理を実行する関数
  const checkAnswer = async (input: string) => {
    const isCorrect = await checkAnswerAndReturnResult(input)

    // 単語が完成した場合
    if (isCorrect) {
      const newWordsCompleted = gameState.wordsCompleted + 1
      const newCombo = gameState.combo + 1

      // 特殊効果の処理
      let damage = 15 // 基本ダメージを下げる
      let playerHPChange = 0
      let timeBonus = 0

      if (gameState.specialType === 'bonus') {
        damage = 30 // ボーナス単語は大ダメージ
        playerHPChange = 10 // HP回復
        timeBonus = 5 // 時間ボーナス
      } else if (gameState.specialType === 'debuff') {
        damage = 10 // デバフ単語は低ダメージ
        playerHPChange = -5 // HP減少
      }

      // コンボボーナス
      if (newCombo >= 3) {
        damage += Math.floor(newCombo / 3) * 5
      }

      const newEnemyHP = Math.max(0, gameState.enemyHP - damage)
      const newPlayerHP = Math.min(100, Math.max(0, gameState.playerHP + playerHPChange))
      const newTimeLeft = Math.min(ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].timeLimit, gameState.timeLeft + timeBonus)

      // スコア計算
      const scoreGain = calculateScore(damage, newCombo, gameState.specialType, timeBonus)
      const newScore = gameState.score + scoreGain
      const newMaxCombo = Math.max(gameState.maxCombo, newCombo)

      // 敵ダメージエフェクトとスコアエフェクトを表示
      setEffectState(prev => ({
        ...prev,
        showEnemyDamage: true,
        lastDamage: damage,
        showScoreEffect: true,
        lastScoreGain: scoreGain,
        scoreEffectKey: Date.now() // 一意のキーを生成
      }))

      // 入力をクリア
      clearInput()

      if (newEnemyHP === 0) {
        // ラウンド完了時の時間ボーナス計算
        const roundTime = Math.max(0, (Date.now() - gameState.roundStartTime) / 1000)
        const timeLimit = ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].timeLimit
        const timeBonusScore = Math.max(0, Math.floor((timeLimit - roundTime) * 10))
        const finalScore = newScore + timeBonusScore

        // 爆発エフェクトを表示
        setEffectState(prev => ({ ...prev, showExplosion: true, explosionSkippable: false }))

        // 敵のHPを即座に0に設定（視覚的フィードバック）
        const newTotalTime = Math.max(1, gameState.totalTime + roundTime) // 最小1秒を保証
        console.log('Round completed:', {
          round: gameState.round,
          roundTime,
          totalTime: newTotalTime,
          score: finalScore
        })

        setGameState(prev => ({
          ...prev,
          enemyHP: 0,
          playerHP: newPlayerHP,
          wordsCompleted: newWordsCompleted,
          combo: newCombo,
          score: finalScore,
          maxCombo: newMaxCombo,
          totalTime: newTotalTime
        }))

        // 0.5秒後にスキップ可能にする
        setTimeout(() => {
          setEffectState(prev => ({ ...prev, explosionSkippable: true }))
        }, 500)

        // プレイヤーの勝利（エフェクト後に設定）
        setTimeout(() => {
          handleExplosionComplete()
          setGameState(prev => ({
            ...prev,
            gameStatus: 'roundEnd',
            winner: 'player'
          }))
        }, 1500)
      } else {
        // 次の単語へ
        let wordData = generateRandomWord(gameState.currentWord)
        
        // 使用済み単語のリセットが必要な場合
        if (wordData.word === 'RESET_USED_WORDS') {
          setGameState(prev => ({ ...prev, usedWords: new Set<string>() }))
          wordData = generateRandomWord(gameState.currentWord) // 再度生成
        }
        
        const newWord = typeof wordData === 'string' ? wordData : wordData.word
        const newWordItem = typeof wordData !== 'string' ? wordData.wordItem : null

        // 翻訳を取得
        const wordWithTranslation = await setWordWithTranslation(newWord, newWordItem, gameState.questionLanguage, gameState.answerLanguage)

        setGameState(prev => {
          // 使用済み単語に追加
          const newUsedWords = new Set(prev.usedWords)
          newUsedWords.add(prev.currentWord)

          return {
            ...prev,
            currentWord: wordWithTranslation.word,
            currentWordItem: wordWithTranslation.wordItem,
            currentWordTranslation: wordWithTranslation.translation,
            enemyHP: newEnemyHP,
            playerHP: newPlayerHP,
            timeLeft: newTimeLeft,
            wordsCompleted: newWordsCompleted,
            combo: newCombo,
            score: newScore,
            maxCombo: newMaxCombo,
            isSpecialWord: typeof wordData !== 'string',
            specialType: typeof wordData === 'string' ? 'normal' : wordData.type,
            lastWord: newWord,
            usedWords: newUsedWords
          }
        })
      }
    }
  }

  // キーボードイベント処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // スコア送信画面やリーダーボード表示中は入力を無効にする
    if (showScoreSubmission || showLeaderboard) {
      return
    }

    if (e.key === 'Enter' && !isComposing) {
      const input = gameState.userInput

      if (input.length > 0) {
        // 入力があれば常にcheckAnswerを呼び出し
        const handleAnswer = async () => {
          const isCorrect = await checkAnswerAndReturnResult(input)

          if (isCorrect) {
            // 正解の場合はcheckAnswerで処理
            await checkAnswer(input)
          } else {
            // 間違った入力 - プレイヤーのHPを減らす & コンボリセット
            const damage = 15 // ダメージ増加
            const newPlayerHP = Math.max(0, gameState.playerHP - damage)

            // 入力をクリア
            clearInput()

            // ダメージエフェクトを表示
            setEffectState(prev => ({ ...prev, showDamage: true }))

            setGameState(prev => ({
              ...prev,
              playerHP: newPlayerHP,
              combo: 0 // コンボリセット
            }))

            // プレイヤーのHPが0になった場合
            if (newPlayerHP === 0) {
              setGameState(prev => ({
                ...prev,
                gameStatus: 'gameEnd',
                winner: 'enemy'
              }))
              // 敗北時もスコア送信画面を表示
              if (gameState.score > 0) {
                setShowScoreSubmission(true)
              } else {
                resetGameDirectly()
              }
            }
          }
        }

        handleAnswer()
      }
    }
  }

  // グローバルキーボードイベント処理（ゲーム進行用）
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // スコア送信画面やリーダーボード表示中はキーボードイベントを無効にする
      if (showScoreSubmission || showLeaderboard) {
        return
      }

      // 入力フィールドにフォーカスがある場合は、グローバルイベントを無視
      if (document.activeElement === inputRef.current) {
        return
      }

      // スペースキーの処理
      if (e.code === 'Space') {
        // スクロールを防ぐ
        e.preventDefault()

        if (gameState.gameStatus === 'categorySelection') {
          setShowCategorySelection(true)
        } else if (gameState.gameStatus === 'waiting') {
          startRound()
        } else if (gameState.gameStatus === 'roundEnd') {
          if (gameState.winner === 'player') {
            nextRound()
          } else {
            retryRound()
          }
        } else if (gameState.gameStatus === 'gameEnd') {
          // ゲーム終了時は、スコア送信画面が表示されていない場合のみresetGameを呼ぶ
          if (!showScoreSubmission) {
            resetGame()
          }
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [gameState.gameStatus, gameState.winner, showScoreSubmission, showLeaderboard])

  // 次のラウンドへ
  const nextRound = () => {
    if (gameState.round >= 5) {
      setGameState(prev => ({ ...prev, gameStatus: 'gameEnd' }))
      setShowScoreSubmission(true)
    } else {
      const nextRoundNum = gameState.round + 1
      const nextEnemyData = ENEMY_DATA[nextRoundNum as keyof typeof ENEMY_DATA]
      setGameState(prev => ({
        ...prev,
        round: nextRoundNum,
        playerHP: Math.min(100, prev.playerHP + 20),
        enemyHP: nextEnemyData.maxHP,
        gameStatus: 'waiting',
        roundStartScore: prev.score,
        usedWords: new Set<string>() // 新しいラウンドで使用済み単語をリセット
      }))
    }
  }

  // 爆発エフェクト完了時の処理
  const handleExplosionComplete = () => {
    setEffectState(prev => ({ ...prev, showExplosion: false, explosionSkippable: false }))
  }

  // ダメージエフェクト完了時の処理
  const handleDamageComplete = () => {
    setEffectState(prev => ({ ...prev, showDamage: false }))
  }

  // 敵ダメージエフェクト完了時の処理
  const handleEnemyDamageComplete = () => {
    setEffectState(prev => ({ ...prev, showEnemyDamage: false, lastDamage: 0 }))
  }

  // スコアエフェクト完了時の処理
  const handleScoreEffectComplete = () => {
    setEffectState(prev => ({ ...prev, showScoreEffect: false, lastScoreGain: 0 }))
  }

  // 爆発エフェクトをスキップ
  const skipExplosion = () => {
    if (effectState.explosionSkippable && gameState.enemyHP === 0) {
      handleExplosionComplete()
      setGameState(prev => ({
        ...prev,
        gameStatus: 'roundEnd',
        winner: 'player'
      }))
    }
  }

  // ラウンドリトライ（同じラウンドをやり直し）
  const retryRound = () => {
    setGameState(prev => ({
      ...prev,
      playerHP: 100,
      enemyHP: currentEnemyData.maxHP,
      currentWord: '',
      userInput: '',
      timeLeft: ENEMY_DATA[prev.round as keyof typeof ENEMY_DATA].timeLimit,
      gameStatus: 'waiting',
      winner: null,
      wordsCompleted: 0,
      combo: 0,
      isSpecialWord: false,
      specialType: 'normal',
      lastWord: '', // リトライ時は前の単語をリセット
      score: prev.roundStartScore, // スコアをラウンド開始時に戻す
      maxCombo: 0,
      roundStartTime: 0
    }))
    setEffectState({
      showExplosion: false,
      explosionSkippable: false,
      showDamage: false,
      showEnemyDamage: false,
      lastDamage: 0,
      showScoreEffect: false,
      lastScoreGain: 0,
      scoreEffectKey: 0
    })
  }

  // スコア送信が必要かチェックしてからリセット
  const resetGame = () => {
    // スコアが0より大きい場合はスコア送信画面を表示
    if (gameState.score > 0) {
      setShowScoreSubmission(true)
    } else {
      resetGameDirectly()
    }
  }

  // ゲームリセット（最初から）- 直接実行
  const resetGameDirectly = () => {
    console.log('Resetting game directly')
    const currentDisplayLanguage = gameState.displayLanguage // 現在の表示言語を保持
    setGameState({
      round: 1,
      playerHP: 100,
      enemyHP: ENEMY_DATA[1].maxHP,
      currentWord: '',
      currentWordItem: null,
      currentWordTranslation: null,
      userInput: '',
      timeLeft: 45,
      gameStatus: 'categorySelection',
      winner: null,
      wordsCompleted: 0,
      combo: 0,
      isSpecialWord: false,
      specialType: 'normal',
      lastWord: '', // リセット時は前の単語をクリア
      score: 0,
      maxCombo: 0,
      roundStartTime: 0,
      totalTime: 1, // 最小1秒
      roundStartScore: 0,
      availableWords: [],
      wordsLoading: false,
      selectedCategory: '',
      usedWords: new Set<string>(),
      questionLanguage: 'jp',
      answerLanguage: 'jp',
      displayLanguage: currentDisplayLanguage
    })
    setEffectState({
      showExplosion: false,
      explosionSkippable: false,
      showDamage: false,
      showEnemyDamage: false,
      lastDamage: 0,
      showScoreEffect: false,
      lastScoreGain: 0,
      scoreEffectKey: 0
    })
    setShowScoreSubmission(false)
    setShowLeaderboard(false)
  }

  // 現在の敵に応じた背景とテーマを取得
  const currentEnemyData = ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA]
  const theme = currentEnemyData.theme

  // ハイドレーション完了まで何も表示しない
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600/40 via-indigo-600/30 to-black/50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen transition-all duration-1000 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${currentEnemyData.backgroundImage})` }}
    >
      {/* 背景オーバーレイ */}
      <div className={`absolute inset-0 transition-all duration-1000 ${currentEnemyData.backgroundOverlay}`}></div>

      {/* コンテンツ */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {/* ヘッダー部分 */}
          <div className="flex flex-col sm:flex-row items-center mb-4 gap-2">
            {/* 左側のボタン群 */}
            <div className="flex justify-start w-full sm:w-1/3 order-2 sm:order-1">
              <button
                onClick={() => setShowLeaderboard(true)}
                disabled={showScoreSubmission}
                className={`font-bold py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm transition-colors ${showScoreSubmission
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  }`}
              >
                🏆 {gameState.displayLanguage === 'jp' ? 'ランキング' : 'Ranking'}
              </button>
            </div>

            {/* 中央のタイトル */}
            <div className="flex justify-center w-full sm:w-1/3 order-1 sm:order-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg text-center">
                {gameState.displayLanguage === 'jp' ? 'タイピングゲーム' : 'Typing Game'}
              </h1>
            </div>

            {/* 右側の表示言語トグル */}
            <div className="flex justify-end w-full sm:w-1/3 order-3 sm:order-3">
              <div className="flex bg-white/20 rounded-lg p-1">
                <button
                  onClick={() => {
                    // 言語切り替え時にゲームをリセットして安全に切り替える
                    const currentDisplayLanguage = 'jp'
                    setGameState({
                      round: 1,
                      playerHP: 100,
                      enemyHP: ENEMY_DATA[1].maxHP,
                      currentWord: '',
                      currentWordItem: null,
                      currentWordTranslation: null,
                      userInput: '',
                      timeLeft: 45,
                      gameStatus: 'categorySelection',
                      winner: null,
                      wordsCompleted: 0,
                      combo: 0,
                      isSpecialWord: false,
                      specialType: 'normal',
                      lastWord: '',
                      score: 0,
                      maxCombo: 0,
                      roundStartTime: 0,
                      totalTime: 1,
                      roundStartScore: 0,
                      availableWords: [],
                      wordsLoading: false,
                      selectedCategory: '',
                      usedWords: new Set<string>(),
                      questionLanguage: 'jp',
                      answerLanguage: 'jp',
                      displayLanguage: currentDisplayLanguage
                    })
                    setEffectState({
                      showExplosion: false,
                      explosionSkippable: false,
                      showDamage: false,
                      showEnemyDamage: false,
                      lastDamage: 0,
                      showScoreEffect: false,
                      lastScoreGain: 0,
                      scoreEffectKey: 0
                    })
                  }}
                  className={`px-2 py-1 rounded-md transition-colors text-xs ${gameState.displayLanguage === 'jp'
                    ? 'bg-purple-500 text-white'
                    : 'text-white hover:text-gray-200'
                    }`}
                  title={gameState.displayLanguage === 'jp' ? '表示言語: 日本語' : 'Display Language: Japanese'}
                >
                  🇯🇵
                </button>
                <button
                  onClick={() => {
                    // 言語切り替え時にゲームをリセットして安全に切り替える
                    const currentDisplayLanguage = 'en'
                    setGameState({
                      round: 1,
                      playerHP: 100,
                      enemyHP: ENEMY_DATA[1].maxHP,
                      currentWord: '',
                      currentWordItem: null,
                      currentWordTranslation: null,
                      userInput: '',
                      timeLeft: 45,
                      gameStatus: 'categorySelection',
                      winner: null,
                      wordsCompleted: 0,
                      combo: 0,
                      isSpecialWord: false,
                      specialType: 'normal',
                      lastWord: '',
                      score: 0,
                      maxCombo: 0,
                      roundStartTime: 0,
                      totalTime: 1,
                      roundStartScore: 0,
                      availableWords: [],
                      wordsLoading: false,
                      selectedCategory: '',
                      usedWords: new Set<string>(),
                      questionLanguage: 'jp',
                      answerLanguage: 'jp',
                      displayLanguage: currentDisplayLanguage
                    })
                    setEffectState({
                      showExplosion: false,
                      explosionSkippable: false,
                      showDamage: false,
                      showEnemyDamage: false,
                      lastDamage: 0,
                      showScoreEffect: false,
                      lastScoreGain: 0,
                      scoreEffectKey: 0
                    })
                  }}
                  className={`px-2 py-1 rounded-md transition-colors text-xs ${gameState.displayLanguage === 'en'
                    ? 'bg-purple-500 text-white'
                    : 'text-white hover:text-gray-200'
                    }`}
                  title={gameState.displayLanguage === 'jp' ? '表示言語: 英語' : 'Display Language: English'}
                >
                  🇺🇸
                </button>
              </div>
            </div>
          </div>

          {/* ラウンド表示 */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">
              {getLocalizedText('round', gameState.displayLanguage)} {gameState.round}/5
            </h2>
            <p className="text-base mt-1 text-white drop-shadow-lg relative">
              {getLocalizedText('score', gameState.displayLanguage)}: <span className="text-green-300">{(gameState.score || 0).toLocaleString()}</span>
              <ScoreEffect
                key={effectState.scoreEffectKey}
                scoreGain={effectState.lastScoreGain}
                isVisible={effectState.showScoreEffect}
                onComplete={handleScoreEffectComplete}
              />
            </p>
          </div>

          {/* キャラクター表示 */}
          <div className="relative flex justify-between items-center mb-4">
            {/* プレイヤー */}
            <div className="text-center relative flex-1">
              <div className="w-32 h-32 bg-blue-300 rounded-full flex items-center justify-center mb-2 mx-auto relative">
                <span className="text-7xl">
                  {gameState.playerHP === 0 && gameState.gameStatus === 'roundEnd' && gameState.winner === 'enemy'
                    ? '😵'
                    : '🧑'}
                </span>
                <DamageEffect
                  isVisible={effectState.showDamage}
                  onComplete={handleDamageComplete}
                />
              </div>
              <div className="text-lg font-semibold text-white drop-shadow-lg">{getLocalizedText('player', gameState.displayLanguage)}</div>
              <div className="flex justify-center">
                <div className="w-32 bg-gray-200 rounded-full h-4 mt-2">
                  <div
                    className={`h-4 rounded-full transition-all duration-300 ${gameState.playerHP > 50 ? 'bg-green-500' :
                      gameState.playerHP > 20 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${gameState.playerHP}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm mt-1 text-white drop-shadow-lg">HP: {gameState.playerHP}/100</div>
            </div>

            {/* VS - 絶対中央配置 */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-red-500 z-10">
              VS
              <ComboEffect
                combo={gameState.combo}
                isVisible={gameState.gameStatus === 'playing'}
              />
            </div>

            {/* 敵 */}
            <div className="text-center relative flex-1">
              <div
                className="w-32 h-32 bg-red-300 rounded-full flex items-center justify-center mb-2 mx-auto relative cursor-pointer"
                onClick={skipExplosion}
              >
                <span className="text-7xl">
                  {gameState.enemyHP === 0 && gameState.gameStatus === 'roundEnd' && gameState.winner === 'player'
                    ? ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].defeatedIcon
                    : ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].icon}
                </span>
                <ExplosionEffect
                  isVisible={effectState.showExplosion}
                  onComplete={handleExplosionComplete}
                  skippable={effectState.explosionSkippable}
                />
              </div>
              <div className="text-lg font-semibold text-white drop-shadow-lg">
                {ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name[gameState.questionLanguage]}
              </div>
              <div className="flex justify-center">
                <div
                  className="bg-gray-200 rounded-full h-4 mt-2 transition-all duration-300"
                  style={{ width: `${Math.max(128, (ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP / 100) * 128)}px` }}
                >
                  <div
                    className="bg-red-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${(gameState.enemyHP / ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-sm mt-1 text-white drop-shadow-lg">HP: {gameState.enemyHP}/{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP}</div>
            </div>
          </div>

          {/* 爆発中のスキップ領域 */}
          {effectState.showExplosion && effectState.explosionSkippable && (
            <div
              className="fixed inset-0 z-50 cursor-pointer flex items-center justify-center"
              onClick={skipExplosion}
            >
              <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg animate-pulse">
                画面をクリックしてスキップ
              </div>
            </div>
          )}

          {/* ゲーム画面 */}
          <div className="max-w-xl mx-auto flex-1 flex flex-col justify-center">
            {gameState.gameStatus === 'categorySelection' && (
              <div className="text-center">
                {/* 言語選択 */}
                <div className="mb-8 space-y-6">
                  {/* お題の言語選択 */}
                  <div className="text-center">
                    <h3 className="text-white font-medium mb-3 drop-shadow-lg">
                      📝 {gameState.displayLanguage === 'jp' ? 'お題の言語' : 'Question Language'}
                    </h3>
                    <div className="flex bg-white/20 rounded-lg p-1 max-w-xs mx-auto">
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, questionLanguage: 'jp' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.questionLanguage === 'jp'
                          ? 'bg-blue-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇯🇵 日本語
                      </button>
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, questionLanguage: 'en' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.questionLanguage === 'en'
                          ? 'bg-blue-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇺🇸 English
                      </button>
                    </div>
                  </div>

                  {/* 回答の言語選択 */}
                  <div className="text-center">
                    <h3 className="text-white font-medium mb-3 drop-shadow-lg">
                      ⌨️ {gameState.displayLanguage === 'jp' ? '回答の言語' : 'Answer Language'}
                    </h3>
                    <div className="flex bg-white/20 rounded-lg p-1 max-w-xs mx-auto">
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, answerLanguage: 'jp' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.answerLanguage === 'jp'
                          ? 'bg-green-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇯🇵 日本語
                      </button>
                      <button
                        onClick={() => setGameState(prev => ({ ...prev, answerLanguage: 'en' }))}
                        className={`px-4 py-2 rounded-md transition-colors flex-1 ${gameState.answerLanguage === 'en'
                          ? 'bg-green-500 text-white'
                          : 'text-white hover:text-gray-200'
                          }`}
                      >
                        🇺🇸 English
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCategorySelection(true)}
                  className="font-bold py-4 px-8 rounded-lg text-xl bg-purple-500 hover:bg-purple-600 text-white transition-colors"
                >
                  🎯 {gameState.displayLanguage === 'jp' ? 'ゲーム開始' : 'Start Game'}
                </button>
              </div>
            )}

            {gameState.gameStatus === 'waiting' && (
              <div className="text-center">
                {gameState.round === 1 ? (
                  // ラウンド1の場合はカテゴリー選択を促す
                  <div>
                    <button
                      onClick={() => setShowCategorySelection(true)}
                      disabled={showScoreSubmission || showLeaderboard}
                      className={`font-bold py-4 px-8 rounded-lg text-xl transition-colors ${showScoreSubmission || showLeaderboard
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                        }`}
                    >
                      🎯 カテゴリーを選んでゲーム開始！
                    </button>
                    <div className="mt-4 text-sm text-white drop-shadow-lg">
                      <div className="mb-2">現在のカテゴリー: <span className="font-bold">
                        {gameState.selectedCategory === 'beginner_words' ? '📚 初級単語' :
                          gameState.selectedCategory === 'intermediate_words' ? '🎓 中級単語' :
                            gameState.selectedCategory === 'beginner_conversation' ? '💬 初級会話' :
                              gameState.selectedCategory === 'intermediate_conversation' ? '🗣️ 中級会話' : '📚 初級単語'}
                      </span></div>
                      <div>💡 カテゴリーを変更するか、そのまま開始できます</div>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={startRound}
                        disabled={showScoreSubmission || showLeaderboard}
                        className={`font-bold py-2 px-6 rounded-lg text-base transition-colors ${showScoreSubmission || showLeaderboard
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-blue-500 hover:bg-blue-700 text-white'
                          }`}
                      >
                        このカテゴリーで開始
                      </button>
                    </div>
                  </div>
                ) : (
                  // ラウンド2以降は通常の開始ボタン
                  <div>
                    <button
                      onClick={startRound}
                      disabled={showScoreSubmission || showLeaderboard}
                      className={`font-bold py-4 px-8 rounded-lg text-xl transition-colors ${showScoreSubmission || showLeaderboard
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-500 hover:bg-blue-700 text-white'
                        }`}
                    >
                      {getLocalizedText('roundStart', gameState.displayLanguage).replace('{round}', gameState.round.toString())}
                    </button>
                    <div className="mt-2 text-sm text-white drop-shadow-lg">
                      💡 スペースキーでも開始できます
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameState.gameStatus === 'playing' && (
              <div className="text-center">
                <div className="mb-3">
                  <span className="text-base text-white drop-shadow-lg">
                    {getLocalizedText('timeLeft', gameState.displayLanguage)}:
                  </span>
                  <span className="text-xl font-bold text-red-400 drop-shadow-lg">
                    {gameState.timeLeft}{getLocalizedText('seconds', gameState.displayLanguage)}
                  </span>
                </div>
                <div className="mb-3 flex justify-center space-x-3">
                  <div>
                    <span className="text-xs text-white drop-shadow-lg">
                      {getLocalizedText('completed', gameState.displayLanguage)}:
                    </span>
                    <span className="text-base font-bold text-white drop-shadow-lg">{gameState.wordsCompleted}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white drop-shadow-lg">
                      {getLocalizedText('combo', gameState.displayLanguage)}:
                    </span>
                    <span className={`text-base font-bold drop-shadow-lg ${gameState.combo >= 3 ? 'text-yellow-300' : 'text-blue-300'}`}>
                      {gameState.combo}
                      {gameState.combo >= 3 && '🔥'}
                    </span>
                  </div>

                </div>
                <div className="mb-4">
                  <div className={`text-2xl font-bold mb-3 p-3 rounded-lg ${gameState.specialType === 'bonus' ? 'bg-green-100 border-2 border-green-400' :
                    gameState.specialType === 'debuff' ? 'bg-red-100 border-2 border-red-400' :
                      'bg-yellow-100'
                    }`}>
                    {gameState.specialType === 'bonus' && '✨ '}
                    {gameState.specialType === 'debuff' && '⚠️ '}
                    {gameState.currentWord}
                    {gameState.specialType === 'bonus' && ' ✨'}
                    {gameState.specialType === 'debuff' && ' ⚠️'}
                  </div>

                  {/* 翻訳ヒント表示 */}
                  {gameState.questionLanguage !== gameState.answerLanguage && gameState.currentWordTranslation && (
                    <div className="text-sm text-blue-600 mb-2 bg-blue-50 px-2 py-1 rounded">
                      💡 {gameState.displayLanguage === 'jp' ? '答え' : 'Answer'}: {gameState.currentWordTranslation}
                    </div>
                  )}

                  {gameState.specialType === 'bonus' && (
                    <div className="text-xs text-green-600 mb-2">
                      🎁 {getLocalizedText('bonusEffect', gameState.displayLanguage)}
                    </div>
                  )}
                  {gameState.specialType === 'debuff' && (
                    <div className="text-xs text-red-600 mb-2">
                      💀 デバフ: 低ダメージ + HP減少
                    </div>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={gameState.userInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  disabled={showScoreSubmission || showLeaderboard}
                  className={`w-full max-w-sm px-3 py-2 text-lg border-2 rounded-lg focus:outline-none transition-colors ${effectState.showDamage
                    ? 'border-red-500 bg-red-50'
                    : showScoreSubmission || showLeaderboard
                      ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                      : 'border-gray-300 focus:border-blue-500'
                    }`}
                  placeholder={getLocalizedText('placeholder', gameState.displayLanguage)}
                  autoFocus
                />
                <div className="mt-2 text-xs text-white drop-shadow-lg space-y-1">
                  <div>{getLocalizedText('instructions', gameState.displayLanguage)}</div>
                  <div>{getLocalizedText('comboTip', gameState.displayLanguage)}</div>
                </div>
              </div>
            )}

            {gameState.gameStatus === 'roundEnd' && (
              <div className="text-center">
                {gameState.winner === 'player' ? (
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-green-600">
                      🎉 {getLocalizedText('victory', gameState.displayLanguage)}
                    </h3>

                    <div className="flex justify-center space-x-4 mb-4">
                      {/* 倒した敵の情報 */}
                      <div className="bg-gray-100 rounded-lg p-3 flex-1 max-w-xs">
                        <h4 className="text-sm font-semibold mb-2">
                          {getLocalizedText('defeatedEnemy', gameState.displayLanguage)}
                        </h4>
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-12 h-12 bg-red-300 rounded-full flex items-center justify-center mr-2 opacity-50">
                            <span className="text-xl">{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].defeatedIcon}</span>
                          </div>
                          <div className="text-left text-xs">
                            <div className="font-semibold">
                              {ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name[gameState.questionLanguage]}
                            </div>
                            <div className="text-gray-600">
                              {getLocalizedText('hp', gameState.displayLanguage)}: 0/{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP} ({getLocalizedText('defeated', gameState.displayLanguage)})
                            </div>
                            <div className="text-blue-600">
                              {getLocalizedText('words', gameState.displayLanguage)}: {gameState.wordsCompleted}
                            </div>
                            <div className="text-green-600">
                              {getLocalizedText('score', gameState.displayLanguage)}: {(gameState.score || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 次の敵の予告 */}
                      {gameState.round < 5 ? (
                        <div className="bg-blue-50 rounded-lg p-3 flex-1 max-w-xs">
                          <h4 className="text-sm font-semibold mb-2">
                            {getLocalizedText('nextEnemy', gameState.displayLanguage)}
                          </h4>
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mr-2 animate-pulse">
                              <span className="text-xl">❓</span>
                            </div>
                            <div className="text-left text-xs">
                              <div className="font-semibold">
                                {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].name[gameState.questionLanguage]}
                              </div>
                              <div className="text-gray-600">
                                {getLocalizedText('hp', gameState.displayLanguage)}: {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].maxHP}/{ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].maxHP}
                              </div>
                              <div className="text-red-600">
                                {getLocalizedText('timeLimit', gameState.displayLanguage)}: {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].timeLimit}{getLocalizedText('seconds', gameState.displayLanguage)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-3 flex-1 max-w-xs">
                          <h4 className="text-sm font-bold mb-2 text-yellow-800">
                            🏆 {getLocalizedText('allEnemiesDefeated', gameState.displayLanguage)}
                          </h4>
                          <div className="text-3xl mb-2">🎊</div>
                          <p className="text-xs text-yellow-700">
                            {getLocalizedText('gameComplete', gameState.displayLanguage)}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={nextRound}
                      disabled={showScoreSubmission || showLeaderboard}
                      className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors ${showScoreSubmission || showLeaderboard
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : gameState.round >= 5
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-700 text-white'
                        }`}
                    >
                      {gameState.round >= 5 ? getLocalizedText('gameCompleteButton', gameState.displayLanguage) : getLocalizedText('nextRoundButton', gameState.displayLanguage)}
                    </button>
                    <div className="mt-2 text-xs text-white drop-shadow-lg">
                      {getLocalizedText('spaceKeyTip', gameState.displayLanguage)}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-bold mb-3 text-red-600">😢 敗北...</h3>
                    <div className="bg-gray-100 rounded-lg p-4 mb-4 max-w-sm mx-auto">
                      <div className="space-y-1 text-sm mb-2">
                        <div className="flex justify-between">
                          <span>完了単語数:</span>
                          <span className="font-bold">{gameState.wordsCompleted}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>現在のスコア:</span>
                          <span className="font-bold text-green-600">{(gameState.score || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>最大コンボ:</span>
                          <span className="font-bold text-blue-600">{gameState.maxCombo}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600">このラウンドから再挑戦するか、最初からやり直せます</p>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={retryRound}
                        disabled={showScoreSubmission || showLeaderboard}
                        className={`font-bold py-3 px-6 rounded-lg text-lg w-full transition-colors ${showScoreSubmission || showLeaderboard
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                      >
                        🔄 ラウンド {gameState.round} から再挑戦
                      </button>
                      <button
                        onClick={resetGame}
                        disabled={showScoreSubmission || showLeaderboard}
                        className={`font-bold py-2 px-4 rounded-lg text-base w-full transition-colors ${showScoreSubmission || showLeaderboard
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : 'bg-blue-500 hover:bg-blue-700 text-white'
                          }`}
                      >
                        {gameState.score > 0 ? '🏠 最初から（スコア記録）' : '🏠 最初から'}
                      </button>
                      <div className="mt-2 text-xs text-white drop-shadow-lg">
                        💡 スペースキーで再挑戦できます
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {gameState.gameStatus === 'gameEnd' && (
              <div className="text-center">
                <h3 className="text-3xl font-bold mb-4 text-white drop-shadow-lg">🏆 ゲーム終了！</h3>

                {/* 最終スコア表示 */}
                <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-4 mb-4 max-w-sm mx-auto">
                  <h4 className="text-lg font-bold text-yellow-800 mb-3">最終スコア</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>総スコア:</span>
                      <span className="font-bold text-green-600">{(gameState.score || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最大コンボ:</span>
                      <span className="font-bold text-blue-600">{gameState.maxCombo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>総プレイ時間:</span>
                      <span className="font-bold text-purple-600">{Math.floor(gameState.totalTime)}秒</span>
                    </div>
                    <div className="flex justify-between">
                      <span>平均スコア/秒:</span>
                      <span className="font-bold text-orange-600">
                        {gameState.totalTime > 0 ? Math.floor(gameState.score / gameState.totalTime) : 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    disabled={showScoreSubmission}
                    className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors ${showScoreSubmission
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      }`}
                  >
                    🏆 {gameState.displayLanguage === 'jp' ? 'ランキング' : 'Ranking'}
                  </button>
                  <button
                    onClick={() => {
                      // ゲームをラウンド1にリセットしてからカテゴリー選択を表示
                      setGameState(prev => ({
                        ...prev,
                        round: 1,
                        playerHP: 100,
                        enemyHP: ENEMY_DATA[1].maxHP,
                        currentWord: '',
                        userInput: '',
                        timeLeft: 45,
                        gameStatus: 'categorySelection',
                        winner: null,
                        wordsCompleted: 0,
                        combo: 0,
                        isSpecialWord: false,
                        specialType: 'normal',
                        lastWord: '',
                        score: 0,
                        maxCombo: 0,
                        roundStartTime: 0,
                        totalTime: 1,
                        roundStartScore: 0,
                        availableWords: [],
                        selectedCategory: ''
                      }))
                      setEffectState({
                        showExplosion: false,
                        explosionSkippable: false,
                        showDamage: false,
                        showEnemyDamage: false,
                        lastDamage: 0,
                        showScoreEffect: false,
                        lastScoreGain: 0,
                        scoreEffectKey: 0
                      })
                    }}
                    disabled={showScoreSubmission}
                    className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors ${showScoreSubmission
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                  >
                    🎯 カテゴリー変更
                  </button>
                  <button
                    onClick={resetGame}
                    disabled={showScoreSubmission}
                    className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors ${showScoreSubmission
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                  >
                    🔄 もう一度プレイ
                  </button>
                </div>
                <div className="mt-2 text-sm text-white drop-shadow-lg">
                  💡 スペースキーでも再開できます
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* リーダーボード */}
      <Leaderboard
        isVisible={showLeaderboard}
        language={gameState.displayLanguage}
        onClose={() => {
          setShowLeaderboard(false)
          resetGameDirectly()
        }}
        currentScore={gameState.score}
      />

      {/* カテゴリー選択 */}
      <CategorySelection
        isVisible={showCategorySelection}
        selectedLanguage={gameState.displayLanguage}
        onCategorySelect={(categoryId) => {
          console.log(`Category selected: ${categoryId}`)
          // 現在の言語設定を保存
          const currentQuestionLanguage = gameState.questionLanguage
          const currentAnswerLanguage = gameState.answerLanguage
          const currentDisplayLanguage = gameState.displayLanguage

          setGameState(prev => ({
            ...prev,
            selectedCategory: categoryId,
            availableWords: [], // 単語をクリア
            round: 1,
            score: 0,
            playerHP: 100,
            enemyHP: ENEMY_DATA[1].maxHP,
            currentWord: '',
            currentWordItem: null,
            currentWordTranslation: null,
            userInput: '',
            timeLeft: 45,
            gameStatus: 'categorySelection', // カテゴリー選択後は自動開始準備
            winner: null,
            wordsCompleted: 0,
            combo: 0,
            isSpecialWord: false,
            specialType: 'normal',
            lastWord: '',
            maxCombo: 0,
            roundStartTime: 0,
            totalTime: 1,
            roundStartScore: 0,
            // 言語設定を保持
            questionLanguage: currentQuestionLanguage,
            answerLanguage: currentAnswerLanguage,
            displayLanguage: currentDisplayLanguage
          }))

          // カテゴリー選択後、即座にゲームを自動開始
          setTimeout(async () => {
            console.log(`Auto-starting game with category: ${categoryId}, question language: ${currentQuestionLanguage}`)

            // まず単語を取得（お題の言語を使用）
            await fetchWordsForRound(categoryId, 1, currentQuestionLanguage)

            // 状態更新を待つために少し遅延
            setTimeout(async () => {
              // 最新の状態を取得
              setGameState(currentState => {
                // 単語が取得できているかチェック
                if (currentState.availableWords.length === 0) {
                  console.warn('No words available after fetch, using fallback')
                  return currentState
                }

                const timeLimit = ENEMY_DATA[1].timeLimit

                // 利用可能な単語から選択
                const normalWords = currentState.availableWords.filter(w => w.type === 'normal')
                const bonusWords = currentState.availableWords.filter(w => w.type === 'bonus')
                const debuffWords = currentState.availableWords.filter(w => w.type === 'debuff')

                let selectedWord: WordItem
                let wordType: 'normal' | 'bonus' | 'debuff' = 'normal'

                // 20%の確率で特殊単語
                if (Math.random() < 0.2 && (bonusWords.length > 0 || debuffWords.length > 0)) {
                  const isBonus = Math.random() < 0.6
                  const specialWords = isBonus ? bonusWords : debuffWords
                  wordType = isBonus ? 'bonus' : 'debuff'
                  selectedWord = specialWords[Math.floor(Math.random() * specialWords.length)]
                } else {
                  selectedWord = normalWords[Math.floor(Math.random() * normalWords.length)]
                }

                const newWord = selectedWord.word

                // 翻訳を取得（非同期処理）
                setWordWithTranslation(newWord, selectedWord, currentQuestionLanguage, currentAnswerLanguage).then(wordWithTranslation => {
                  console.log(`=== Auto-start Word Debug ===`)
                  console.log(`Selected word: "${newWord}"`)
                  console.log(`Translation: "${wordWithTranslation.translation}"`)
                  console.log(`Question language: ${currentQuestionLanguage}`)
                  console.log(`Answer language: ${currentAnswerLanguage}`)
                  console.log(`=== End Auto-start Word Debug ===`)

                  setGameState(prev => {
                    // 使用済み単語に追加
                    const newUsedWords = new Set(prev.usedWords)
                    newUsedWords.add(newWord)

                    return {
                      ...prev,
                      currentWord: wordWithTranslation.word,
                      currentWordItem: wordWithTranslation.wordItem,
                      currentWordTranslation: wordWithTranslation.translation,
                      userInput: '',
                      timeLeft: timeLimit,
                      gameStatus: 'playing',
                      wordsCompleted: 0,
                      combo: 0,
                      isSpecialWord: wordType !== 'normal',
                      specialType: wordType,
                      lastWord: newWord,
                      roundStartTime: Date.now(),
                      roundStartScore: prev.score,
                      usedWords: newUsedWords
                    }
                  })

                  // 入力フィールドにフォーカス
                  setTimeout(() => {
                    if (inputRef.current) {
                      try {
                        inputRef.current.focus()
                      } catch (error) {
                        console.warn('Failed to focus input:', error)
                      }
                    }
                  }, 100)
                })

                return currentState
              })
            }, 200) // 状態更新を待つ
          }, 100) // 0.1秒後に自動開始
        }}
        onClose={() => setShowCategorySelection(false)}
      />

      {/* スコア送信 */}
      <ScoreSubmission
        isVisible={showScoreSubmission}
        score={gameState.score}
        round={gameState.round}
        totalTime={gameState.totalTime}
        category={gameState.selectedCategory}
        onClose={() => {
          // スコア送信をスキップした場合はゲームをリセット
          setShowScoreSubmission(false)
          resetGameDirectly()
        }}
        onSubmitted={() => {
          // スコア送信後にリーダーボードを表示
          setShowScoreSubmission(false)
          setShowLeaderboard(true)
        }}
      />
    </div>
  )
}
