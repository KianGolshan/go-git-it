import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';

export interface GitTerminalGhostProps {
  command: string;
  strikethrough?: boolean;
  opacity?: number;
  fontSize?: number;
}

export const GitTerminalGhost: React.FC<GitTerminalGhostProps> = ({
  command,
  strikethrough = false,
  opacity: opacityProp,
  fontSize = 13,
}) => {
  const frame = useCurrentFrame();

  const fadeOutOpacity = strikethrough
    ? interpolate(frame % 60, [0, 30, 60], [1, 0.5, 0.3], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  const resolvedOpacity = opacityProp !== undefined ? opacityProp : fadeOutOpacity;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        opacity: resolvedOpacity,
      }}
    >
      <div
        style={{
          backgroundColor: strikethrough ? 'rgba(127,29,29,0.85)' : 'rgba(15,23,42,0.88)',
          border: `1px solid ${strikethrough ? 'rgba(239,68,68,0.4)' : 'rgba(100,116,139,0.4)'}`,
          borderRadius: 6,
          padding: '8px 16px',
          fontFamily: 'DM Mono, monospace',
          fontSize,
          color: strikethrough ? '#fca5a5' : '#94a3b8',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: strikethrough ? '#f87171' : '#4ade80', marginRight: 6 }}>$</span>
        {command}
      </div>
      {/* Strikethrough line */}
      {strikethrough && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 2,
            backgroundColor: '#ef4444',
            borderRadius: 2,
            transform: 'translateY(-50%)',
          }}
        />
      )}
    </div>
  );
};
