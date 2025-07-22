'use client'

import { useEffect, useState } from 'react'

interface ExplosionEffectProps {
  isVisible: boolean
  onComplete: () => void
  skippable?: boolean
}

export default function ExplosionEffect({ isVisible, onComplete, skippable = false }: ExplosionEffectProps) {
  const [particles, setParticles] = useState<Array<{ 
    id: number; 
    x: number; 
    y: number; 
    delay: number; 
    size: number;
    rotation: number;
  }>>([])

  useEffect(() => {
    if (isVisible) {
      // 大量のパーティクルを生成
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 400 - 200, // -200px to 200px (より広範囲)
        y: Math.random() * 400 - 200,
        delay: Math.random() * 0.5, // 0-0.5秒の遅延
        size: Math.random() * 1.5 + 0.5, // 0.5-2倍のサイズ
        rotation: Math.random() * 1440 // 0-1440度の回転
      }))
      setParticles(newParticles)

      // エフェクト終了後にコールバック実行
      const timer = setTimeout(() => {
        onComplete()
      }, 2500) // より長い演出時間

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  if (!isVisible) return null

  const explosionEmojis = ['💥', '🔥', '💢', '⚡']
  const particleEmojis = ['⭐', '✨', '💫', '🔥', '💥', '🌟', '⚡', '💢', '🎆', '🎇']

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* スキップ可能な場合のヒント */}
      {skippable && (
        <div className="skip-hint">
          クリックでスキップ
        </div>
      )}
      
      {/* 画面全体の閃光エフェクト */}
      <div className="screen-flash"></div>
      
      {/* 複数の爆発エフェクト */}
      {explosionEmojis.map((emoji, index) => (
        <div 
          key={`explosion-${index}`}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        >
          <div 
            className="explosion-main"
            style={{
              '--explosion-delay': `${index * 0.1}s`,
              '--explosion-scale': `${2 + index * 0.5}`
            } as React.CSSProperties}
          >
            {emoji}
          </div>
        </div>
      ))}

      {/* 衝撃波 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="shockwave"></div>
        <div className="shockwave shockwave-2"></div>
      </div>

      {/* パーティクル */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            '--particle-x': `${particle.x}px`,
            '--particle-y': `${particle.y}px`,
            '--delay': `${particle.delay}s`,
            '--size': particle.size,
            '--rotation': `${particle.rotation}deg`
          } as React.CSSProperties}
        >
          <div className="particle">
            {particleEmojis[particle.id % particleEmojis.length]}
          </div>
        </div>
      ))}

      <style jsx>{`
        .skip-hint {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 0.8rem;
          animation: pulse 1s infinite;
          pointer-events: none;
          z-index: 1001;
          white-space: nowrap;
          min-width: fit-content;
        }

        .screen-flash {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
          animation: flash 0.3s ease-out;
          pointer-events: none;
          z-index: 1000;
        }

        .explosion-main {
          font-size: 6rem;
          animation: mega-explode 1.2s ease-out forwards;
          animation-delay: var(--explosion-delay);
          filter: drop-shadow(0 0 20px rgba(255, 100, 0, 0.8));
        }

        .shockwave {
          width: 20px;
          height: 20px;
          border: 4px solid rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: shockwave-expand 1s ease-out forwards;
        }

        .shockwave-2 {
          animation-delay: 0.2s;
          border-color: rgba(255, 200, 0, 0.6);
        }

        .particle {
          font-size: calc(1.5rem * var(--size));
          animation: mega-particle-fly 2s ease-out forwards;
          animation-delay: var(--delay);
          filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.6));
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        @keyframes flash {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes mega-explode {
          0% {
            transform: scale(0) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 20px rgba(255, 100, 0, 0.8)) hue-rotate(0deg);
          }
          25% {
            transform: scale(var(--explosion-scale)) rotate(90deg);
            opacity: 1;
            filter: drop-shadow(0 0 30px rgba(255, 100, 0, 1)) hue-rotate(90deg);
          }
          50% {
            transform: scale(calc(var(--explosion-scale) * 1.2)) rotate(180deg);
            opacity: 0.8;
            filter: drop-shadow(0 0 40px rgba(255, 200, 0, 0.8)) hue-rotate(180deg);
          }
          100% {
            transform: scale(calc(var(--explosion-scale) * 1.5)) rotate(360deg);
            opacity: 0;
            filter: drop-shadow(0 0 50px rgba(255, 255, 255, 0)) hue-rotate(360deg);
          }
        }

        @keyframes shockwave-expand {
          0% {
            width: 20px;
            height: 20px;
            opacity: 1;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }

        @keyframes mega-particle-fly {
          0% {
            transform: translate(0, 0) scale(var(--size)) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.6)) hue-rotate(0deg);
          }
          50% {
            opacity: 1;
            filter: drop-shadow(0 0 15px rgba(255, 100, 0, 0.8)) hue-rotate(180deg);
          }
          100% {
            transform: translate(var(--particle-x), var(--particle-y)) scale(0) rotate(var(--rotation));
            opacity: 0;
            filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0)) hue-rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}