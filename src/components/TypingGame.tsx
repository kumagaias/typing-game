'use client'

import { useState, useEffect, useCallback } from 'react'
import ExplosionEffect from './ExplosionEffect'

// ラウンド別の単語リスト
const FOOD_WORDS = {
  1: [
    'うどん', 'そば', 'すし', 'ぱん', 'みそ', 'のり', 'たまご', 'みず',
    'ちゃ', 'こめ', 'にく', 'さかな', 'やさい', 'くだもの'
  ],
  2: [
    'らーめん', 'てんぷら', 'やきとり', 'おにぎり', 'かれー', 'ぴざ',
    'ぱすた', 'さらだ', 'すーぷ', 'けーき', 'あいす', 'ちょこれーと',
    'くっきー', 'どーなつ', 'ぷりん', 'はんばーがー'
  ],
  3: [
    'おこのみやき', 'たこやき', 'やきにく', 'しゃぶしゃぶ', 'すきやき',
    'ちらしずし', 'かつどん', 'おやこどん', 'てんどん', 'うなぎどん',
    'ちゃーはん', 'おむらいす', 'なぽりたん', 'みーとそーす',
    'かるぼなーら', 'ぺぺろんちーの', 'ちーずけーき', 'しょーとけーき'
  ]
}

// 敵のアイコンとタイトル、制限時間
const ENEMY_DATA = {
  1: { icon: '👹', name: '初級の鬼', timeLimit: 60 },
  2: { icon: '🐉', name: '中級の竜', timeLimit: 45 },
  3: { icon: '💀', name: '最終ボス', timeLimit: 30 }
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
}

interface EffectState {
  showExplosion: boolean
}

export default function TypingGame() {
  const [gameState, setGameState] = useState<GameState>({
    round: 1,
    playerHP: 100,
    enemyHP: 100,
    currentWord: '',
    userInput: '',
    timeLeft: 60,
    gameStatus: 'waiting',
    winner: null,
    wordsCompleted: 0
  })

  const [effectState, setEffectState] = useState<EffectState>({
    showExplosion: false
  })

  // ランダムな単語を生成（ラウンド別）
  const generateRandomWord = useCallback((round: number) => {
    const roundWords = FOOD_WORDS[round as keyof typeof FOOD_WORDS]
    const randomIndex = Math.floor(Math.random() * roundWords.length)
    return roundWords[randomIndex]
  }, [])

  // ゲーム開始
  const startRound = useCallback(() => {
    setGameState(prev => {
      const timeLimit = ENEMY_DATA[prev.round as keyof typeof ENEMY_DATA].timeLimit
      return {
        ...prev,
        currentWord: generateRandomWord(prev.round),
        userInput: '',
        timeLeft: timeLimit,
        gameStatus: 'playing',
        wordsCompleted: 0
      }
    })
  }, [generateRandomWord])

  // タイマー処理
  useEffect(() => {
    if (gameState.gameStatus === 'playing' && gameState.timeLeft > 0) {
      const timer = setTimeout(() => {
        setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }))
      }, 1000)
      return () => clearTimeout(timer)
    } else if (gameState.gameStatus === 'playing' && gameState.timeLeft === 0) {
      // 時間切れ - 敵の勝利
      setGameState(prev => ({
        ...prev,
        gameStatus: 'roundEnd',
        winner: 'enemy'
      }))
    }
  }, [gameState.gameStatus, gameState.timeLeft])

  // 入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setGameState(prev => ({ ...prev, userInput: input }))

    // 単語が完成した場合
    if (input === gameState.currentWord) {
      const newWordsCompleted = gameState.wordsCompleted + 1
      const damage = 20
      const newEnemyHP = Math.max(0, gameState.enemyHP - damage)
      
      if (newEnemyHP === 0) {
        // 爆発エフェクトを表示
        setEffectState(prev => ({ ...prev, showExplosion: true }))
        
        // 敵のHPを即座に0に設定（視覚的フィードバック）
        setGameState(prev => ({
          ...prev,
          enemyHP: 0,
          wordsCompleted: newWordsCompleted
        }))
        
        // プレイヤーの勝利（エフェクト後に設定）
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            gameStatus: 'roundEnd',
            winner: 'player'
          }))
        }, 1500) // より長い演出時間
      } else {
        // 次の単語へ
        setGameState(prev => ({
          ...prev,
          currentWord: generateRandomWord(prev.round),
          userInput: '',
          enemyHP: newEnemyHP,
          wordsCompleted: newWordsCompleted
        }))
      }
    }
  }

  // 次のラウンドへ
  const nextRound = () => {
    if (gameState.round >= 3) {
      setGameState(prev => ({ ...prev, gameStatus: 'gameEnd' }))
    } else {
      setGameState(prev => ({
        ...prev,
        round: prev.round + 1,
        playerHP: 100,
        enemyHP: 100,
        gameStatus: 'waiting'
      }))
    }
  }

  // 爆発エフェクト完了時の処理
  const handleExplosionComplete = () => {
    setEffectState(prev => ({ ...prev, showExplosion: false }))
  }

  // ゲームリセット
  const resetGame = () => {
    setGameState({
      round: 1,
      playerHP: 100,
      enemyHP: 100,
      currentWord: '',
      userInput: '',
      timeLeft: 60,
      gameStatus: 'waiting',
      winner: null,
      wordsCompleted: 0
    })
    setEffectState({
      showExplosion: false
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        タイピングゲーム
      </h1>
      
      {/* ラウンド表示 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold">ラウンド {gameState.round}/3</h2>
        <p className="text-lg text-gray-600 mt-2">
          {ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name} - 
          制限時間: {ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].timeLimit}秒
        </p>
      </div>

      {/* キャラクター表示 */}
      <div className="flex justify-between items-center mb-8">
        {/* プレイヤー */}
        <div className="text-center">
          <div className="w-32 h-32 bg-blue-300 rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-4xl">🧑</span>
          </div>
          <div className="text-lg font-semibold">プレイヤー</div>
          <div className="w-32 bg-gray-200 rounded-full h-4 mt-2">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${gameState.playerHP}%` }}
            ></div>
          </div>
          <div className="text-sm mt-1">HP: {gameState.playerHP}/100</div>
        </div>

        {/* VS */}
        <div className="text-4xl font-bold text-red-500">VS</div>

        {/* 敵 */}
        <div className="text-center relative">
          <div className="w-32 h-32 bg-red-300 rounded-full flex items-center justify-center mb-4 mx-auto relative">
            <span className="text-4xl">{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].icon}</span>
            <ExplosionEffect 
              isVisible={effectState.showExplosion} 
              onComplete={handleExplosionComplete}
            />
          </div>
          <div className="text-lg font-semibold">{ENEMY_DATA[gameState.round as keyof typeof ENEMY_DATA].name}</div>
          <div className="w-32 bg-gray-200 rounded-full h-4 mt-2">
            <div 
              className="bg-red-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${gameState.enemyHP}%` }}
            ></div>
          </div>
          <div className="text-sm mt-1">HP: {gameState.enemyHP}/100</div>
        </div>
      </div>

      {/* ゲーム画面 */}
      <div className="max-w-2xl mx-auto">
        {gameState.gameStatus === 'waiting' && (
          <div className="text-center">
            <button
              onClick={startRound}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              ラウンド {gameState.round} 開始！
            </button>
          </div>
        )}

        {gameState.gameStatus === 'playing' && (
          <div className="text-center">
            <div className="mb-4">
              <span className="text-lg">残り時間: </span>
              <span className="text-2xl font-bold text-red-500">{gameState.timeLeft}秒</span>
            </div>
            <div className="mb-4">
              <span className="text-lg">完了した単語: </span>
              <span className="text-xl font-bold">{gameState.wordsCompleted}</span>
            </div>
            <div className="mb-6">
              <div className="text-3xl font-bold mb-4 p-4 bg-yellow-100 rounded-lg">
                {gameState.currentWord}
              </div>
            </div>
            <input
              type="text"
              value={gameState.userInput}
              onChange={handleInputChange}
              className="w-full max-w-md px-4 py-3 text-xl border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="ここにタイピング..."
              autoFocus
            />
          </div>
        )}

        {gameState.gameStatus === 'roundEnd' && (
          <div className="text-center">
            <div className="mb-6">
              <h3 className="text-3xl font-bold mb-4">
                {gameState.winner === 'player' ? '🎉 あなたの勝利！' : '😢 敗北...'}
              </h3>
              <p className="text-lg">完了した単語数: {gameState.wordsCompleted}</p>
            </div>
            <button
              onClick={nextRound}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              {gameState.round >= 3 ? '結果を見る' : '次のラウンドへ'}
            </button>
          </div>
        )}

        {gameState.gameStatus === 'gameEnd' && (
          <div className="text-center">
            <h3 className="text-4xl font-bold mb-6">🏆 ゲーム終了！</h3>
            <button
              onClick={resetGame}
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl"
            >
              もう一度プレイ
            </button>
          </div>
        )}
      </div>
    </div>
  )
}