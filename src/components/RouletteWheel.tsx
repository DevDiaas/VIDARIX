import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Sparkles } from 'lucide-react';
import { MediaItem } from '../types';
import { soundFx } from '../utils/soundEffects';

interface RouletteWheelProps {
  candidates: MediaItem[];
  soundEnabled: boolean;
  onSpinEnd: (winner: MediaItem) => void;
}

const SEGMENT_COLORS = [
  '#D52253',
  '#E7353C',
  '#C92261',
  '#A51F7A',
  '#82218A',
  '#66218F',
  '#752093',
  '#A82082'
];

function clampLabel(title: string, segmentCount: number): string {
  const limit = segmentCount >= 14 ? 11 : segmentCount >= 11 ? 14 : segmentCount >= 8 ? 17 : 21;
  const clean = title.trim();
  return clean.length > limit ? `${clean.slice(0, Math.max(1, limit - 1)).trim()}…` : clean;
}

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number) {
  const angle = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function annularSegmentPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const outerStart = polarPoint(cx, cy, outerRadius, startAngle);
  const outerEnd = polarPoint(cx, cy, outerRadius, endAngle);
  const innerEnd = polarPoint(cx, cy, innerRadius, endAngle);
  const innerStart = polarPoint(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z'
  ].join(' ');
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  candidates,
  soundEnabled,
  onSpinEnd
}) => {
  const uid = useId().replace(/:/g, '');
  const wheelCandidates = useMemo(() => candidates.slice(0, 16), [candidates]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const spinTokenRef = useRef(0);

  const segmentCount = Math.max(wheelCandidates.length, 1);
  const anglePerSegment = 360 / segmentCount;

  useEffect(() => () => {
    spinTokenRef.current += 1;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const spin = () => {
    if (isSpinning || wheelCandidates.length < 2) return;

    const token = ++spinTokenRef.current;
    const winner = Math.floor(Math.random() * wheelCandidates.length);
    const winnerItem = wheelCandidates[winner];
    const winnerCenter = -90 + winner * anglePerSegment + anglePerSegment / 2;
    const desiredNormalizedRotation = ((-90 - winnerCenter) % 360 + 360) % 360;
    const currentNormalizedRotation = ((rotation % 360) + 360) % 360;
    const correction = (desiredNormalizedRotation - currentNormalizedRotation + 360) % 360;
    const extraTurns = 6 + Math.floor(Math.random() * 3);
    const targetRotation = rotation + extraTurns * 360 + correction;
    const startRotation = rotation;
    const distance = targetRotation - startRotation;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const duration = reducedMotion ? 260 : 5400;
    const start = performance.now();
    let lastTick = -1;

    setWinnerIndex(null);
    setIsSpinning(true);
    soundFx.enabled = soundEnabled;

    const animate = (now: number) => {
      if (token !== spinTokenRef.current) return;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 4.2);
      const nextRotation = startRotation + distance * eased;
      setRotation(nextRotation);

      if (!reducedMotion) {
        const pointerAngle = ((-90 - nextRotation) % 360 + 360) % 360;
        const tickIndex = Math.floor(((pointerAngle + 90) % 360) / anglePerSegment);
        if (tickIndex !== lastTick) {
          lastTick = tickIndex;
          soundFx.playTick(0.9 + progress * 0.35);
        }
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }

      setRotation(targetRotation);
      setWinnerIndex(winner);
      setIsSpinning(false);
      soundFx.playWinnerChime();

      if (!reducedMotion) {
        try {
          confetti({
            particleCount: 70,
            spread: 64,
            startVelocity: 26,
            origin: { y: 0.58 },
            colors: ['#6b6592', '#8b84b7', '#d8d5e7', '#ffffff']
          });
        } catch {
          // The roulette remains fully functional when confetti is unavailable.
        }
      }

      window.setTimeout(() => onSpinEnd(winnerItem), reducedMotion ? 120 : 650);
    };

    frameRef.current = requestAnimationFrame(animate);
  };

  const size = 560;
  const center = size / 2;
  const outerRadius = 244;
  const innerRadius = 82;
  const labelRadius = 166;

  return (
    <section className="vidarix-wheel-stage" aria-labelledby="roulette-wheel-title">
      <div className="vidarix-wheel-caption">
        <span className="vidarix-wheel-caption__eyebrow">
          <Sparkles aria-hidden="true" /> Seleção cinematográfica
        </span>
        <h2 id="roulette-wheel-title">Gire e deixe a VIDARIX escolher</h2>
        <p>{wheelCandidates.length} opções participando deste sorteio</p>
      </div>

      <div className="vidarix-wheel-wrap">
        <div className="vidarix-wheel-ambient" aria-hidden="true" />

        <div className={`vidarix-wheel-pointer ${isSpinning ? 'is-ticking' : ''}`} aria-hidden="true">
          <span className="vidarix-wheel-pointer__cap" />
          <span className="vidarix-wheel-pointer__blade" />
        </div>

        <div className="vidarix-wheel-shell">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="vidarix-wheel-svg"
            role="img"
            aria-label={`Roleta com ${wheelCandidates.length} opções`}
          >
            <defs>
              <radialGradient id={`${uid}-rim`} cx="40%" cy="28%" r="75%">
                <stop offset="0%" stopColor="#332139" />
                <stop offset="50%" stopColor="#17111f" />
                <stop offset="100%" stopColor="#07080d" />
              </radialGradient>
              <radialGradient id={`${uid}-hub`} cx="36%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#29172f" />
                <stop offset="58%" stopColor="#120d18" />
                <stop offset="100%" stopColor="#07080d" />
              </radialGradient>
              <linearGradient id={`${uid}-segment-shine`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="48%" stopColor="#ffffff" stopOpacity="0.01" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
              </linearGradient>
              <filter id={`${uid}-winner-glow`} x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#ff4b82" floodOpacity="0.5" />
              </filter>
            </defs>

            <circle cx={center} cy={center} r="272" fill={`url(#${uid}-rim)`} stroke="#353846" strokeWidth="2" />
            <circle cx={center} cy={center} r="259" fill="#0d0f16" stroke="rgba(255,255,255,.08)" strokeWidth="2" />

            {Array.from({ length: 32 }).map((_, index) => {
              const angle = -90 + index * (360 / 32);
              const inner = polarPoint(center, center, index % 4 === 0 ? 251 : 254, angle);
              const outer = polarPoint(center, center, 263, angle);
              return (
                <line
                  key={`marker-${index}`}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={index % 4 === 0 ? '#aaa5c4' : 'rgba(255,255,255,.2)'}
                  strokeWidth={index % 4 === 0 ? 2 : 1}
                  strokeLinecap="round"
                />
              );
            })}

            <g transform={`rotate(${rotation} ${center} ${center})`} style={{ willChange: 'transform' }}>
              {wheelCandidates.length === 0 ? (
                <>
                  <circle cx={center} cy={center} r={outerRadius} fill="#20222c" stroke="#3a3d4b" strokeWidth="2" />
                  <text x={center} y={center} fill="#b8bac5" fontSize="17" fontWeight="700" textAnchor="middle">
                    Adicione opções para girar
                  </text>
                </>
              ) : (
                wheelCandidates.map((item, index) => {
                  const startAngle = -90 + index * anglePerSegment;
                  const endAngle = startAngle + anglePerSegment;
                  const middleAngle = startAngle + anglePerSegment / 2;
                  const labelPoint = polarPoint(center, center, labelRadius, middleAngle);
                  const normalized = ((middleAngle % 360) + 360) % 360;
                  const flip = normalized > 90 && normalized < 270;
                  const textRotation = flip ? middleAngle + 180 : middleAngle;
                  const winner = winnerIndex === index;
                  const muted = winnerIndex !== null && !winner;
                  const path = annularSegmentPath(center, center, innerRadius, outerRadius, startAngle, endAngle);
                  const label = clampLabel(item.title || item.name || 'Sem título', wheelCandidates.length);

                  return (
                    <g key={`${item.media_type}-${item.id}-${index}`} className={winner ? 'is-winner' : ''}>
                      <path
                        d={path}
                        fill={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                        stroke={winner ? '#FFD0DE' : 'rgba(255,255,255,.16)'}
                        strokeWidth={winner ? 3 : 1.25}
                        opacity={muted ? 0.42 : 1}
                        filter={winner ? `url(#${uid}-winner-glow)` : undefined}
                      />
                      <path d={path} fill={`url(#${uid}-segment-shine)`} opacity={muted ? 0.35 : 1} pointerEvents="none" />
                      <text
                        x={labelPoint.x}
                        y={labelPoint.y}
                        fill={winner ? '#ffffff' : '#ececf2'}
                        fontSize={wheelCandidates.length >= 14 ? 11 : wheelCandidates.length >= 11 ? 12 : 13.5}
                        fontWeight="700"
                        fontFamily="Inter, Manrope, system-ui, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation} ${labelPoint.x} ${labelPoint.y})`}
                        opacity={muted ? 0.48 : 1}
                        style={{ letterSpacing: '-0.015em', textShadow: '0 1px 2px rgba(0,0,0,.55)' }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })
              )}
            </g>

            <circle cx={center} cy={center} r="82" fill={`url(#${uid}-hub)`} stroke="#ef3c79" strokeWidth="3" />
            <circle cx={center} cy={center} r="66" fill="#0b0c12" stroke="rgba(255,255,255,.12)" strokeWidth="1.5" />
            <image href="/brand/vidarix-symbol.png" x={center - 38} y={center - 38} width="76" height="76" preserveAspectRatio="xMidYMid meet" />
          </svg>
        </div>

        <div className="vidarix-wheel-base" aria-hidden="true" />
      </div>

      <button
        type="button"
        className="vidarix-wheel-spin-button"
        onClick={spin}
        disabled={isSpinning || wheelCandidates.length < 2}
        aria-live="polite"
      >
        {isSpinning ? <RotateCcw className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        <span>{isSpinning ? 'Sorteando…' : 'Girar a roleta'}</span>
      </button>

      <p className="vidarix-wheel-helper" role="status" aria-live="polite">
        {winnerIndex !== null && !isSpinning
          ? `Selecionado: ${wheelCandidates[winnerIndex]?.title || wheelCandidates[winnerIndex]?.name}`
          : wheelCandidates.length < 2
            ? 'Adicione pelo menos duas opções para iniciar.'
            : 'O resultado é definido de forma aleatória antes da animação.'}
      </p>
    </section>
  );
};
