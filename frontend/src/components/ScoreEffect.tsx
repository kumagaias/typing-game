'use client'

import { useEffect, useState, useRef } from 'react'

interface ScoreEffectProps {
  scoreGain: number
  isVisible: boolean
  onComplete: () => void
}

export default function ScoreEffect({ scoreGain, isVisible, onComplete }: ScoreEffectProps) {
  const [animate, setAnimate] = useState(false)
  const hasStarted = useRef(false)

  // スコアに応じてサイズと色を決定
  const getEffectStyle = (score: number) => {
    if (score >= 300) {
      // 高スコア: 大きく、金色
      return {
        size: 'text-4xl',
        color: 'text-yellow-400',
        scale: 'scale-125'
      }
    } else if (score >= 150) {
      // 中スコア: 中サイズ、オレンジ
      return {
        size: 'text-3xl',
        color: 'text-orange-400',
        scale: 'scale-110'
      }
    } else {
      // 低スコア: 小さく、緑
      return {
        size: 'text-2xl',
        color: 'text-green-400',
        scale: 'scale-100'
      }
    }
  }

  const effectStyle = getEffectStyle(scoreGain)

  useEffect(() => {
    if (isVisible && scoreGain > 0 && !hasStarted.current) {
      hasStarted.current = true
      
      // 強制的にアニメーションをリセット
      setAnimate(false)
      
      // 少し遅延してからアニメーション開始
      const startTimer = setTimeout(() => {
        setAnimate(true)
      }, 10)
      
      const endTimer = setTimeout(() => {
        setAnimate(false)
        hasStarted.current = false
        onComplete()
      }, 1500) // 1.5秒でフェードアウト

      return () => {
        clearTimeout(startTimer)
        clearTimeout(endTimer)
        hasStarted.current = false
      }
    } else if (!isVisible) {
      setAnimate(false)
      hasStarted.current = false
    }
  }, [isVisible, scoreGain]) // onCompleteを依存配列から除外

  if (!isVisible || scoreGain <= 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      <div
        className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 transition-all duration-1500 ${
          animate 
            ? `opacity-0 -translate-y-12 ${effectStyle.scale}` 
            : `opacity-100 translate-y-0 ${effectStyle.scale}`
        }`}
        style={{
          animation: animate ? 'scoreFloat 1.5s ease-out forwards' : 'none'
        }}
      >
        <div className={`${effectStyle.size} font-bold ${effectStyle.color} drop-shadow-lg`}>
          +{scoreGain.toLocaleString()}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes scoreFloat {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
          30% {
            opacity: 1;
            transform: translateX(-50%) translateY(-15px) scale(1.15);
          }
          70% {
            opacity: 1;
            transform: translateX(-50%) translateY(-25px) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-45px) scale(1.05);
          }
        }
      `}</style>
    </div>
  )
}