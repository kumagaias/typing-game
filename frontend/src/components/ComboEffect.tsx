'use client'

import { useEffect, useState } from 'react'

interface ComboEffectProps {
  combo: number
  isVisible: boolean
}

export default function ComboEffect({ combo, isVisible }: ComboEffectProps) {
  const [particles, setParticles] = useState<Array<{ id: number; delay: number }>>([])

  useEffect(() => {
    if (isVisible && combo >= 3) {
      // パーティクル数をコンボ数に応じて調整
      const particleCount = Math.min(combo, 8)
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        delay: i * 0.1
      }))
      setParticles(newParticles)
    }
  }, [combo, isVisible])

  if (!isVisible || combo < 3) return null

  const getComboLevel = () => {
    if (combo >= 10) return { level: 'legendary', color: 'purple', text: 'LEGENDARY!' }
    if (combo >= 7) return { level: 'epic', color: 'gold', text: 'EPIC!' }
    if (combo >= 5) return { level: 'super', color: 'orange', text: 'SUPER!' }
    return { level: 'fire', color: 'red', text: 'FIRE!' }
  }

  const comboData = getComboLevel()

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {/* コンボテキスト（VSの上） */}
      <div className="combo-text" style={{ '--combo-color': comboData.color } as React.CSSProperties}>
        {combo} {comboData.text}
      </div>

      {/* 左右の炎エフェクト */}
      <div className="side-flames">
        {particles.map((particle) => (
          <div key={`left-${particle.id}`} className="flame-left" style={{ '--delay': `${particle.delay}s` } as React.CSSProperties}>
            🔥
          </div>
        ))}
        {particles.map((particle) => (
          <div key={`right-${particle.id}`} className="flame-right" style={{ '--delay': `${particle.delay + 0.2}s` } as React.CSSProperties}>
            🔥
          </div>
        ))}
      </div>

      {/* 下部の星エフェクト */}
      <div className="bottom-stars">
        {Array.from({ length: 6 }, (_, i) => (
          <div 
            key={i} 
            className="star-particle" 
            style={{ 
              '--delay': `${i * 0.15}s`,
              '--x-pos': `${(i - 2.5) * 15}px`
            } as React.CSSProperties}
          >
            ⭐
          </div>
        ))}
      </div>

      {/* 背景の光る効果（拡大） */}
      <div className={`combo-glow combo-glow-${comboData.level}`}></div>

      {/* 画面全体の光る効果 */}
      <div className={`screen-flash screen-flash-${comboData.level}`}></div>

      <style jsx>{`
        .combo-text {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.4rem;
          font-weight: bold;
          color: var(--combo-color);
          text-shadow: 0 0 15px currentColor, 0 0 30px currentColor;
          animation: combo-mega-pulse 1s ease-out;
          z-index: 10;
          white-space: nowrap;
        }

        .side-flames {
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          height: 60px;
        }

        .flame-left {
          position: absolute;
          left: -40px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2rem;
          animation: flame-dance-left 1.2s ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .flame-right {
          position: absolute;
          right: -40px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 2rem;
          animation: flame-dance-right 1.2s ease-in-out infinite;
          animation-delay: var(--delay);
        }

        .bottom-stars {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 20px;
        }

        .star-particle {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          font-size: 1.2rem;
          animation: star-twinkle 1.5s ease-in-out infinite;
          animation-delay: var(--delay);
          left: calc(50% + var(--x-pos));
        }

        .combo-glow {
          position: absolute;
          top: -30px;
          left: -30px;
          right: -30px;
          bottom: -30px;
          border-radius: 50%;
          animation: mega-glow-pulse 1.5s ease-in-out infinite alternate;
        }

        .combo-glow-fire {
          background: radial-gradient(circle, rgba(255, 69, 0, 0.4) 0%, rgba(255, 140, 0, 0.2) 50%, transparent 80%);
        }

        .combo-glow-super {
          background: radial-gradient(circle, rgba(255, 165, 0, 0.5) 0%, rgba(255, 215, 0, 0.3) 50%, transparent 80%);
        }

        .combo-glow-epic {
          background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, rgba(255, 255, 0, 0.4) 50%, transparent 80%);
        }

        .combo-glow-legendary {
          background: radial-gradient(circle, rgba(128, 0, 128, 0.7) 0%, rgba(255, 0, 255, 0.5) 50%, transparent 80%);
        }

        .screen-flash {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 5;
          animation: screen-flash-anim 0.5s ease-out;
        }

        .screen-flash-fire {
          background: radial-gradient(circle at center, rgba(255, 69, 0, 0.1) 0%, transparent 60%);
        }

        .screen-flash-super {
          background: radial-gradient(circle at center, rgba(255, 165, 0, 0.15) 0%, transparent 60%);
        }

        .screen-flash-epic {
          background: radial-gradient(circle at center, rgba(255, 215, 0, 0.2) 0%, transparent 60%);
        }

        .screen-flash-legendary {
          background: radial-gradient(circle at center, rgba(128, 0, 128, 0.25) 0%, transparent 60%);
        }

        @keyframes combo-mega-pulse {
          0% {
            transform: translateX(-50%) scale(0.3) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: translateX(-50%) scale(1.3) rotate(5deg);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        @keyframes flame-dance-left {
          0%, 100% {
            transform: translateY(-50%) rotate(-10deg) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-60%) rotate(10deg) scale(1.2);
            opacity: 1;
          }
        }

        @keyframes flame-dance-right {
          0%, 100% {
            transform: translateY(-50%) rotate(10deg) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-60%) rotate(-10deg) scale(1.2);
            opacity: 1;
          }
        }

        @keyframes star-twinkle {
          0%, 100% {
            transform: translateX(-50%) scale(0.5) rotate(0deg);
            opacity: 0.6;
          }
          50% {
            transform: translateX(-50%) scale(1.2) rotate(180deg);
            opacity: 1;
          }
        }

        @keyframes mega-glow-pulse {
          0% {
            opacity: 0.4;
            transform: scale(1) rotate(0deg);
          }
          100% {
            opacity: 0.8;
            transform: scale(1.3) rotate(10deg);
          }
        }

        @keyframes screen-flash-anim {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}