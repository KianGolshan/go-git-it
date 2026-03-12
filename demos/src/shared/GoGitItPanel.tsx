import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND, VSCODE_DARK } from './colors';
import { spring } from './easing';

export type ButtonId = 'snapshot' | 'send' | 'pull' | 'experiment' | 'finish' | 'abandon' | 'help';

export interface GoGitItPanelProps {
  highlightedButton?: ButtonId;
  buttonState?: 'idle' | 'loading' | 'success' | 'error';
  snapshotCount?: number;
  branchName?: string;
  isDirty?: boolean;
  showTimeline?: boolean;
}

const BUTTONS: Array<{ id: ButtonId; emoji: string; label: string }> = [
  { id: 'snapshot', emoji: '📸', label: 'Snapshot' },
  { id: 'send', emoji: '☁️', label: 'Send to GitHub' },
  { id: 'pull', emoji: '⬇️', label: 'Get latest from GitHub' },
  { id: 'experiment', emoji: '🧪', label: 'Start experiment' },
  { id: 'finish', emoji: '✅', label: 'Finish experiment' },
  { id: 'abandon', emoji: '🗑️', label: 'Abandon experiment' },
  { id: 'help', emoji: '❓', label: "What's going on?" },
];

const RocketLogo: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fill={BRAND.commit}
      fillRule="evenodd"
      d="M12 2 C13 5 14.5 8 14.5 10.5 L14.5 14 L17 17 L14.5 15.5 L15 19 L9 19 L9.5 15.5 L7 17 L9.5 14 L9.5 10.5 C9.5 8 11 5 12 2 Z M10.2 12.5 A1.8 1.8 0 1 0 13.8 12.5 A1.8 1.8 0 1 0 10.2 12.5 Z"
    />
    <path fill={BRAND.commit} d="M9 19 L8 21.5 L16 21.5 L15 19 Z" />
    <path fill="none" stroke={VSCODE_DARK.sidebar} strokeWidth="0.85" strokeLinecap="round"
      d="M13.2 12.5 A1.2 1.2 0 1 1 13.2 12.04" />
    <line x1="12" y1="12.5" x2="13.2" y2="12.5"
      stroke={VSCODE_DARK.sidebar} strokeWidth="0.85" strokeLinecap="round" />
  </svg>
);

export const GoGitItPanel: React.FC<GoGitItPanelProps> = ({
  highlightedButton,
  buttonState = 'idle',
  snapshotCount = 0,
  branchName = 'main',
  isDirty = false,
  showTimeline = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Use spring for the unused fps variable to avoid lint errors
  void spring;

  const dirtyPulse = isDirty
    ? 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2)
    : 1;

  const loadingPulse = buttonState === 'loading'
    ? 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 3)
    : 1;

  const successFlash = buttonState === 'success'
    ? interpolate(frame % 30, [0, 5, 20], [0, 1, 0], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' })
    : 0;

  const isExperiment = branchName.startsWith('experiment/');
  const experimentName = isExperiment ? branchName.replace('experiment/', '') : '';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: VSCODE_DARK.sidebar,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'DM Sans, system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 12px 8px',
        borderBottom: `1px solid ${VSCODE_DARK.border}`,
      }}>
        <RocketLogo size={16} />
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: '#bbbbbb',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          Go Git It
        </span>
      </div>

      {/* Branch / status */}
      <div style={{
        padding: '8px 12px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'DM Mono, monospace',
          color: '#888888',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {isExperiment ? `🧪 experiment/${experimentName}` : '🌿 Main line'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: VSCODE_DARK.text,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: isDirty ? '#eab308' : BRAND.goGreen,
            opacity: isDirty ? dirtyPulse : 1,
          }} />
          <span>
            {snapshotCount === 0
              ? 'No snapshots yet'
              : `${snapshotCount} snapshot${snapshotCount !== 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Timeline (if shown) */}
      {showTimeline && (
        <div style={{
          margin: '4px 12px 8px',
          padding: '8px 10px',
          backgroundColor: VSCODE_DARK.panel,
          borderRadius: 4,
          borderLeft: `3px solid ${BRAND.goGreen}`,
          fontSize: 11,
          color: VSCODE_DARK.text,
        }}>
          <div style={{ color: BRAND.commit, fontWeight: 600, marginBottom: 2 }}>⏱ 2 minutes ago</div>
          <div style={{ color: '#888888', fontSize: 10 }}>clean state · last snapshot</div>
        </div>
      )}

      {/* Section label */}
      <div style={{
        padding: '8px 12px 4px',
        fontSize: 10,
        fontFamily: 'DM Mono, monospace',
        color: '#888888',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Actions
      </div>

      {/* Button list */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '0 8px',
        flex: 1,
        overflow: 'hidden',
      }}>
        {BUTTONS.map((btn) => {
          const isHighlighted = highlightedButton === btn.id;
          const isSuccess = isHighlighted && buttonState === 'success';
          const isLoading = isHighlighted && buttonState === 'loading';

          return (
            <div
              key={btn.id}
              style={{
                height: 36,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                borderRadius: 4,
                backgroundColor: isSuccess
                  ? BRAND.pine
                  : isHighlighted
                  ? BRAND.forest
                  : VSCODE_DARK.panel,
                borderLeft: isHighlighted ? `3px solid ${BRAND.commit}` : '3px solid transparent',
                color: isHighlighted ? BRAND.commit : VSCODE_DARK.text,
                fontSize: 13,
                cursor: 'pointer',
                opacity: isLoading ? loadingPulse : 1,
                transition: 'background-color 0.1s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Success flash overlay */}
              {isSuccess && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: BRAND.pine,
                  opacity: successFlash,
                  borderRadius: 4,
                }} />
              )}
              <span style={{ fontSize: 15, lineHeight: 1 }}>{btn.emoji}</span>
              <span style={{ fontWeight: isHighlighted ? 600 : 400, fontSize: 13 }}>
                {isSuccess ? `${btn.label} ✓` : btn.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom padding */}
      <div style={{ height: 12 }} />
    </div>
  );
};
