'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import ExplosionEffect from './ExplosionEffect'
import DamageEffect from './DamageEffect'
import ComboEffect from './ComboEffect'
import EnemyDamageEffect from './EnemyDamageEffect'
import ScoreEffect from './ScoreEffect'
import Leaderboard from './Leaderboard'
import ScoreSubmission from './ScoreSubmission'
import { apiClient, WordItem } from '../lib/api'

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
    name: '初級の鬼',
    timeLimit: 50,
    maxHP: 100,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-orange-500/20 via-red-500/10 to-pink-500/20',
    theme: 'fire'
  },
  2: {
    icon: '🐺',
    defeatedIcon: '❌',
    name: '野獣の狼',
    timeLimit: 45,
    maxHP: 120,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-gray-500/20 via-slate-500/10 to-stone-500/20',
    theme: 'beast'
  },
  3: {
    icon: '🐉',
    defeatedIcon: '❌',
    name: '古龍',
    timeLimit: 40,
    maxHP: 150,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/20',
    theme: 'dragon'
  },
  4: {
    icon: '⚡',
    defeatedIcon: '❌',
    name: '雷神',
    timeLimit: 35,
    maxHP: 200,
    backgroundImage: '/images/background/mountain.png',
    backgroundOverlay: 'bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-orange-500/30',
    theme: 'thunder'
  },
  5: {
    icon: '🌟',
    defeatedIcon: '❌',
    name: '星の支配者',
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
  userInput: string
  timeLeft: number
  gameStatus: 'waiting' | 'playing' | 'roundEnd' | 'gameEnd'
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

export default function TypingGame() {
  const [gameState, setGameState] = useState<GameState>({
    round: 1,
    playerHP: 100,
    enemyHP: ENEMY_DATA[1].maxHP,
    currentWord: '',
    userInput: '',
    timeLeft: 45,
    gameStatus: 'waiting',
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
    wordsLoading: false
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

  const inputRef = useRef<HTMLInputElement>(null)
  const [isComposing, setIsComposing] = useState(false)

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

  // 単語を取得する関数
  const fetchWordsForRound = async (round: number) => {
    setGameState(prev => ({ ...prev, wordsLoading: true }))
    try {
      const response = await apiClient.getWords(round)
      const words = response.words || []
      setGameState(prev => ({ 
        ...prev, 
        availableWords: words,
        wordsLoading: false 
      }))
      console.log(`Loaded ${words.length} words for round ${round}`)
    } catch (error) {
      console.error(`Failed to fetch words for round ${round}:`, error)
      // フォールバック: ハードコードされた単語を使用
      const fallbackWords = FOOD_WORDS[round as keyof typeof FOOD_WORDS] || []
      const wordItems: WordItem[] = fallbackWords.map((word, index) => ({
        category: 'food',
        word_id: `fallback_${round}_${index}`,
        word: word,
        round: round,
        type: 'normal' as const
      }))
      setGameState(prev => ({ 
        ...prev, 
        availableWords: wordItems,
        wordsLoading: false 
      }))
    }
  }

  // ランダムな単語を生成（特殊効果付き、重複回避）
  const generateRandomWord = useCallback((lastWord: string = '') => {
    if (gameState.availableWords.length === 0) {
      console.warn('No words available for current round')
      return { word: 'えらー', type: 'normal' as const }
    }

    // 通常の単語と特殊単語を分ける
    const normalWords = gameState.availableWords.filter(w => w.type === 'normal')
    const bonusWords = gameState.availableWords.filter(w => w.type === 'bonus')
    const debuffWords = gameState.availableWords.filter(w => w.type === 'debuff')
    
    let selectedWord: WordItem
    let wordType: 'normal' | 'bonus' | 'debuff' = 'normal'

    // 20%の確率で特殊単語
    if (Math.random() < 0.2 && (bonusWords.length > 0 || debuffWords.length > 0)) {
      const isBonus = Math.random() < 0.6 // 60%でボーナス、40%でデバフ
      const specialWords = isBonus ? bonusWords : debuffWords
      wordType = isBonus ? 'bonus' : 'debuff'

      // 特殊単語から選択（重複回避）
      let attempts = 0
      do {
        const randomIndex = Math.floor(Math.random() * specialWords.length)
        selectedWord = specialWords[randomIndex]
        attempts++
      } while (selectedWord.word === lastWord && attempts < 10)
    } else {
      // 通常単語から選択（重複回避）
      let attempts = 0
      do {
        const randomIndex = Math.floor(Math.random() * normalWords.length)
        selectedWord = normalWords[randomIndex]
        attempts++
      } while (selectedWord.word === lastWord && attempts < 10)
    }

    return {
      word: selectedWord.word,
      type: wordType
    }
  }, [gameState.availableWords])

  // ゲーム開始
  const startRound = useCallback(() => {
    // まず単語を取得してからゲームを開始
    fetchWordsForRound(gameState.round).then(() => {
      setGameState(prev => {
        const timeLimit = ENEMY_DATA[prev.round as keyof typeof ENEMY_DATA].timeLimit
        const wordData = generateRandomWord(prev.lastWord)
        const newWord = typeof wordData === 'string' ? wordData : wordData.word
        return {
          ...prev,
          currentWord: newWord,
          userInput: '',
          timeLeft: timeLimit,
          gameStatus: 'playing',
          wordsCompleted: 0,
          combo: 0,
          isSpecialWord: typeof wordData !== 'string',
          specialType: typeof wordData === 'string' ? 'normal' : wordData.type,
          lastWord: newWord,
          roundStartTime: Date.now(),
          roundStartScore: prev.score
        }
      })
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
    setTimeout(() => {
      if (e.currentTarget && e.currentTarget.value !== undefined) {
        checkAnswer(e.currentTarget.value)
      }
    }, 10)
  }

  // 答えをチェックする関数
  const checkAnswer = (input: string) => {
    const currentWord = gameState.currentWord

    // 単語が完成した場合
    if (input === currentWord) {
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
        const wordData = generateRandomWord(gameState.currentWord)
        const newWord = typeof wordData === 'string' ? wordData : wordData.word
        setGameState(prev => ({
          ...prev,
          currentWord: newWord,
          enemyHP: newEnemyHP,
          playerHP: newPlayerHP,
          timeLeft: newTimeLeft,
          wordsCompleted: newWordsCompleted,
          combo: newCombo,
          score: newScore,
          maxCombo: newMaxCombo,
          isSpecialWord: typeof wordData !== 'string',
          specialType: typeof wordData === 'string' ? 'normal' : wordData.type,
          lastWord: newWord
        }))
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
      const currentWord = gameState.currentWord

      // 単語が完成した場合
      if (input === currentWord) {
        checkAnswer(input)
      } else if (input.length > 0) {
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
          }
        }
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

      // スペースキーでゲーム進行
      if (e.code === 'Space') {
        e.preventDefault() // スクロールを防ぐ

        if (gameState.gameStatus === 'waiting') {
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
        roundStartScore: prev.score
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
    setGameState({
      round: 1,
      playerHP: 100,
      enemyHP: ENEMY_DATA[1].maxHP,
      currentWord: '',
      userInput: '',
      timeLeft: 45,
      gameStatus: 'waiting',
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
      wordsLoading: false
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
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowLeaderboard(true)}
              disabled={showScoreSubmission}
              className={`font-bold py-2 px-4 rounded-lg text-sm transition-colors ${
                showScoreSubmission
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
            >
              🏆 ランキング
            </button>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              タイピングゲーム
            </h1>
            <div className="w-24"></div> {/* スペーサー */}
          </div>

          {/* ラウンド表示 */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">ラウンド {gameState.round}/5</h2>
            <p className="text-base mt-1 text-white drop-shadow-lg relative">
              スコア: <span className="text-green-300">{(gameState.score || 0).toLocaleString()}</span>
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
              <div className="text-lg font-semibold text-white drop-shadow-lg">プレイヤー</div>
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
              <div className="text-lg font-semibold text-white drop-shadow-lg">{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name}</div>
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
            {gameState.gameStatus === 'waiting' && (
              <div className="text-center">
                <button
                  onClick={startRound}
                  disabled={showScoreSubmission || showLeaderboard}
                  className={`font-bold py-4 px-8 rounded-lg text-xl transition-colors ${
                    showScoreSubmission || showLeaderboard
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-500 hover:bg-blue-700 text-white'
                  }`}
                >
                  ラウンド {gameState.round} 開始！
                </button>
                <div className="mt-2 text-sm text-white drop-shadow-lg">
                  💡 スペースキーでも開始できます
                </div>
              </div>
            )}

            {gameState.gameStatus === 'playing' && (
              <div className="text-center">
                <div className="mb-3">
                  <span className="text-base text-white drop-shadow-lg">残り時間: </span>
                  <span className="text-xl font-bold text-red-400 drop-shadow-lg">{gameState.timeLeft}秒</span>
                </div>
                <div className="mb-3 flex justify-center space-x-3">
                  <div>
                    <span className="text-xs text-white drop-shadow-lg">完了: </span>
                    <span className="text-base font-bold text-white drop-shadow-lg">{gameState.wordsCompleted}</span>
                  </div>
                  <div>
                    <span className="text-xs text-white drop-shadow-lg">コンボ: </span>
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
                  {gameState.specialType === 'bonus' && (
                    <div className="text-xs text-green-600 mb-2">
                      🎁 ボーナス: 大ダメージ + HP回復 + 時間ボーナス
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
                  placeholder="ここにタイピング..."
                  autoFocus
                />
                <div className="mt-2 text-xs text-white drop-shadow-lg space-y-1">
                  <div>💡 変換確定時に自動判定 / Enter でも判定</div>
                  <div>🔥 コンボ3以上でボーナス ✨ 緑=ボーナス ⚠️ 赤=デバフ</div>
                </div>
              </div>
            )}

            {gameState.gameStatus === 'roundEnd' && (
              <div className="text-center">
                {gameState.winner === 'player' ? (
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-green-600">🎉 勝利！</h3>

                    <div className="flex justify-center space-x-4 mb-4">
                      {/* 倒した敵の情報 */}
                      <div className="bg-gray-100 rounded-lg p-3 flex-1 max-w-xs">
                        <h4 className="text-sm font-semibold mb-2">倒した敵</h4>
                        <div className="flex items-center justify-center mb-2">
                          <div className="w-12 h-12 bg-red-300 rounded-full flex items-center justify-center mr-2 opacity-50">
                            <span className="text-xl">{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].defeatedIcon}</span>
                          </div>
                          <div className="text-left text-xs">
                            <div className="font-semibold">{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name}</div>
                            <div className="text-gray-600">HP: 0/{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].maxHP} (撃破)</div>
                            <div className="text-blue-600">単語: {gameState.wordsCompleted}</div>
                            <div className="text-green-600">スコア: {(gameState.score || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      {/* 次の敵の予告 */}
                      {gameState.round < 5 ? (
                        <div className="bg-blue-50 rounded-lg p-3 flex-1 max-w-xs">
                          <h4 className="text-sm font-semibold mb-2">次の敵</h4>
                          <div className="flex items-center justify-center mb-2">
                            <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center mr-2 animate-pulse">
                              <span className="text-xl">❓</span>
                            </div>
                            <div className="text-left text-xs">
                              <div className="font-semibold">{ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].name}</div>
                              <div className="text-gray-600">HP: {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].maxHP}/{ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].maxHP}</div>
                              <div className="text-red-600">時間: {ENEMY_DATA[(gameState.round + 1) as keyof typeof ENEMY_DATA].timeLimit}秒</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-lg p-3 flex-1 max-w-xs">
                          <h4 className="text-sm font-bold mb-2 text-yellow-800">🏆 全敵撃破！</h4>
                          <div className="text-3xl mb-2">🎊</div>
                          <p className="text-xs text-yellow-700">全ラウンド<br />クリア！</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={nextRound}
                      disabled={showScoreSubmission || showLeaderboard}
                      className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors ${
                        showScoreSubmission || showLeaderboard
                          ? 'bg-gray-400 cursor-not-allowed text-white'
                          : gameState.round >= 5
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-700 text-white'
                        }`}
                    >
                      {gameState.round >= 5 ? '🏆 ゲーム完了' : '⚔️ 次のラウンドへ'}
                    </button>
                    <div className="mt-2 text-xs text-white drop-shadow-lg">
                      💡 スペースキーでも進めます
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
                        className={`font-bold py-3 px-6 rounded-lg text-lg w-full transition-colors ${
                          showScoreSubmission || showLeaderboard
                            ? 'bg-gray-400 cursor-not-allowed text-white'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        🔄 ラウンド {gameState.round} から再挑戦
                      </button>
                      <button
                        onClick={resetGame}
                        disabled={showScoreSubmission || showLeaderboard}
                        className={`font-bold py-2 px-4 rounded-lg text-base w-full transition-colors ${
                          showScoreSubmission || showLeaderboard
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

                <div className="space-y-3">
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    disabled={showScoreSubmission}
                    className={`font-bold py-3 px-6 rounded-lg text-lg mr-3 transition-colors ${
                      showScoreSubmission
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    }`}
                  >
                    🏆 ランキング
                  </button>
                  <button
                    onClick={resetGame}
                    disabled={showScoreSubmission}
                    className={`font-bold py-3 px-6 rounded-lg text-lg transition-colors ${
                      showScoreSubmission
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-purple-500 hover:bg-purple-700 text-white'
                    }`}
                  >
                    もう一度プレイ
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
        onClose={() => {
          setShowLeaderboard(false)
          resetGameDirectly()
        }}
        currentScore={gameState.score}
      />

      {/* スコア送信 */}
      <ScoreSubmission
        isVisible={showScoreSubmission}
        score={gameState.score}
        round={gameState.round}
        totalTime={gameState.totalTime}
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
