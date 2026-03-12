import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND } from './colors';
import { spring } from './easing';

export interface TextSceneProps {
  lines: string[];
  accentLine?: number;
  background?: 'dark' | 'green' | 'transparent';
  enterFrame?: number;
  exitFrame?: number;
  totalFrames?: number;
}

const RocketLogo: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill={BRAND.commit}
      fillRule="evenodd"
      d="M12 2 C13 5 14.5 8 14.5 10.5 L14.5 14 L17 17 L14.5 15.5 L15 19 L9 19 L9.5 15.5 L7 17 L9.5 14 L9.5 10.5 C9.5 8 11 5 12 2 Z M10.2 12.5 A1.8 1.8 0 1 0 13.8 12.5 A1.8 1.8 0 1 0 10.2 12.5 Z"
    />
    <path fill={BRAND.commit} d="M9 19 L8 21.5 L16 21.5 L15 19 Z" />
  </svg>
);

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  offset: number;
}

const PARTICLES: Particle[] = Array.from({ length: 12 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 73.7) % 100,
  size: 2 + (i % 3),
  speed: 0.3 + (i % 5) * 0.1,
  offset: (i * 42) % 100,
}));

export const TextScene: React.FC<TextSceneProps> = ({
  lines,
  accentLine,
  background = 'dark',
  enterFrame = 0,
  exitFrame,
  totalFrames: _totalFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const bgColor = background === 'green' ? BRAND.forest : '#0a1628';

  const exitOpacity = exitFrame
    ? interpolate(frame, [exitFrame - 6, exitFrame], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <div style={{
      width,
      height,
      backgroundColor: bgColor,
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Particle dots */}
      {PARTICLES.map((p, i) => {
        const floatY = Math.sin((frame * p.speed + p.offset) * 0.05) * 8;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translateY(${floatY}px)`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: BRAND.goGreen,
              opacity: 0.15,
            }}
          />
        );
      })}

      {/* Text lines */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '0 80px',
        textAlign: 'center',
        opacity: exitOpacity,
      }}>
        {lines.map((line, i) => {
          const lineEnterFrame = enterFrame + i * 8;
          const s = spring(Math.max(0, frame - lineEnterFrame), fps, { damping: 14, stiffness: 120 });
          const translateY = interpolate(s, [0, 1], [20, 0]);
          const opacity = interpolate(s, [0, 1], [0, 1]);
          const isAccent = accentLine === i;

          return (
            <div
              key={i}
              style={{
                transform: `translateY(${translateY}px)`,
                opacity,
                fontFamily: isAccent ? 'DM Sans, system-ui, sans-serif' : 'Instrument Serif, serif',
                fontWeight: isAccent ? 600 : 400,
                fontSize: isAccent ? 48 : 52,
                color: isAccent ? BRAND.commit : '#ffffff',
                lineHeight: 1.15,
                maxWidth: 900,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* Bottom-right logo */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        right: 32,
        opacity: 0.6,
      }}>
        <RocketLogo size={24} />
      </div>
    </div>
  );
};
