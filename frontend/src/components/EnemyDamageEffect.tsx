'use client'

import { useEffect, useState } from 'react'

interface EnemyDamageEffectProps {
  isVisible: boolean
  damage: number
  onComplete: () => void
}

export default function EnemyDamageEffect({ isVisible, damage, onComplete }: EnemyDamageEffectProps) {
  const [hitParticles, setHitParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    if (isVisible) {
      // ダメージ量に応じてパーティクル数を調整
      const particleCount = Math.min(Math.floor(damage / 5) + 3, 8)
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 80, // -40px to 40px
        y: (Math.random() - 0.5) * 80,
        delay: Math.random() * 0.3
      }))
      setHitParticles(newParticles)

      const timer = setTimeout(() => {
        onComplete()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, damage, onComplete])

  if (!isVisible) return null

  const getDamageLevel = () => {
    if (damage >= 30) return { level: 'critical', color: '#ff0000', text: 'CRITICAL!' }
    if (damage >= 20) return { level: 'heavy', color: '#ff4500', text: 'HIT!' }
    return { level: 'normal', color: '#ff8c00', text: 'HIT!' }
  }

  const damageData = getDamageLevel()

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ダメージ数値 */}
      <div 
        className="damage-number"
        style={{ '--damage-color': damageData.color } as React.CSSProperties}
      >
        -{damage}
      </div>

      {/* ダメージテキスト */}
      <div 
        className="damage-text"
        style={{ '--damage-color': damageData.color } as React.CSSProperties}
      >
        {damageData.text}
      </div>

      {/* ヒットパーティクル */}
      {hitParticles.map((particle) => (
        <div
          key={particle.id}
          className="hit-particle"
          style={{
            '--particle-x': `${particle.x}px`,
            '--particle-y': `${particle.y}px`,
            '--delay': `${particle.delay}s`
          } as React.CSSProperties}
        >
          💥
        </div>
      ))}

      {/* 敵の震え効果 */}
      <div className={`enemy-shake shake-${damageData.level}`}></div>

      {/* ヒットフラッシュ */}
      <div className={`hit-flash flash-${damageData.level}`}></div>

      <style jsx>{`
        .damage-number {
          position: absolute;
          top: -20px;
          right: -10px;
          color: var(--damage-color);
          font-size: 1.5rem;
          font-weight: bold;
          text-shadow: 0 0 8px var(--damage-color);
          animation: damage-number-float 1s ease-out forwards;
          z-index: 10;
        }

        .damage-text {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          color: var(--damage-color);
          font-size: 1rem;
          font-weight: bold;
          text-shadow: 0 0 6px var(--damage-color);
          animation: damage-text-bounce 0.8s ease-out forwards;
          z-index: 10;
        }

        .hit-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.2rem;
          animation: particle-burst 0.8s ease-out forwards;
          animation-delay: var(--delay);
        }

        .enemy-shake {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }

        .shake-normal {
          animation: shake-light 0.3s ease-in-out;
        }

        .shake-heavy {
          animation: shake-medium 0.4s ease-in-out;
        }

        .shake-critical {
          animation: shake-heavy 0.5s ease-in-out;
        }

        .hit-flash {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          animation: hit-flash-anim 0.3s ease-out;
        }

        .flash-normal {
          background: radial-gradient(circle, rgba(255, 140, 0, 0.4) 0%, transparent 70%);
        }

        .flash-heavy {
          background: radial-gradient(circle, rgba(255, 69, 0, 0.6) 0%, transparent 70%);
        }

        .flash-critical {
          background: radial-gradient(circle, rgba(255, 0, 0, 0.8) 0%, transparent 70%);
        }

        @keyframes damage-number-float {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 1;
            transform: translateY(-15px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(1);
          }
        }

        @keyframes damage-text-bounce {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.5);
          }
          50% {
            opacity: 1;
            transform: translateX(-50%) scale(1.3);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes particle-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--particle-x)), calc(-50% + var(--particle-y))) scale(0.3);
          }
        }

        @keyframes shake-light {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        @keyframes shake-medium {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }

        @keyframes shake-heavy {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-5px) rotate(-1deg); }
          20% { transform: translateX(5px) rotate(1deg); }
          30% { transform: translateX(-5px) rotate(-1deg); }
          40% { transform: translateX(5px) rotate(1deg); }
          50% { transform: translateX(-3px); }
          60% { transform: translateX(3px); }
          70% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          90% { transform: translateX(-1px); }
        }

        @keyframes hit-flash-anim {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}