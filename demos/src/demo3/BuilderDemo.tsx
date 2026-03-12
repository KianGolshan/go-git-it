import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from 'remotion';
import { BRAND, VSCODE_DARK } from '../shared/colors';
import { TextScene } from '../shared/TextScene';
import { VSCodeMockup } from '../shared/VSCodeMockup';
import { CodeEditor, CodeLine } from '../shared/CodeEditor';
import { spring } from '../shared/easing';
import { loadFonts } from '../shared/fonts';

loadFonts();

// ---------------------------------------------------------------------------
// Code fixtures
// ---------------------------------------------------------------------------

const CLEAN_CODE: CodeLine[] = [
  { content: 'import { useState } from "react"' },
  { content: 'import { api } from "./api"' },
  { content: '' },
  { content: 'export function LoginPage() {' },
  { content: 'const [email, setEmail] = useState("")', indent: 1 },
  { content: 'const [password, setPassword] = useState("")', indent: 1 },
  { content: '' },
  { content: 'async function handleLogin() {', indent: 1 },
  { content: 'const result = await api.auth.login({ email, password })', indent: 2 },
  { content: 'if (result.ok) window.location.href = "/dashboard"', indent: 2 },
  { content: '}', indent: 1 },
  { content: '' },
  { content: 'return <form onSubmit={handleLogin}>{/* form fields */}</form>', indent: 1 },
  { content: '}' },
];

const BROKEN_CODE: CodeLine[] = [
  { content: 'import { useState } from "react"' },
  { content: 'import { api } from "./api"' },
  { content: '' },
  { content: 'export function LoginPage() {' },
  { content: 'const [email, setEmail] = useState("")', indent: 1 },
  { content: 'const [password, setPassword] = useState("")', indent: 1 },
  { content: '' },
  { content: 'async function handleLoginn() {', indent: 1 },
  { content: 'const result = await api.auth.lgoin({ email, password })', indent: 2 },
  { content: 'if (result.ok) window.location.href = "/dashbord"', indent: 2 },
  { content: '}', indent: 1 },
  { content: '' },
  { content: 'return <form onSubmit={handleLoginn}>{/* form fields */}</form>', indent: 1 },
  { content: '}' },
];

const EXPERIMENT_CODE: CodeLine[] = [
  { content: 'import { useState } from "react"' },
  { content: 'import { api } from "./api"' },
  { content: '' },
  { content: 'export function LoginPage() {' },
  { content: 'const [email, setEmail] = useState("")', indent: 1 },
  { content: '' },
  { content: '// trying new nav', indent: 1 },
  { content: 'return (', indent: 1 },
  { content: '<div className="new-nav-layoutt">', indent: 2 },
  { content: '<nav>{/* ??? */}</nav>', indent: 3 },
  { content: '<form>{/* broken form */}</form>', indent: 3 },
  { content: '</div>', indent: 2 },
  { content: ')', indent: 1 },
  { content: '}' },
];

// ---------------------------------------------------------------------------
// Terminal component (AI output stream)
// ---------------------------------------------------------------------------

interface TerminalLine {
  type: 'prompt' | 'success' | 'error';
  text: string;
}

const AITerminal: React.FC<{
  lines: TerminalLine[];
  animateFrom: number;
  height: number;
}> = ({ lines, animateFrom, height }) => {
  const frame = useCurrentFrame();
  const charsPerFrame = 3;

  let accumulated = 0;
  const renderedLines = lines.map((line) => {
    const start = accumulated;
    accumulated += line.text.length;
    const show = Math.max(
      0,
      Math.min(line.text.length, (frame - animateFrom) * charsPerFrame - start)
    );
    return { ...line, displayText: line.text.slice(0, show) };
  });

  const cursorBlink = Math.floor(frame / 15) % 2 === 0;
  const lastVisible = renderedLines.reduce(
    (idx, l, i) => (l.displayText.length > 0 ? i : idx),
    -1
  );

  return (
    <div
      style={{
        height,
        backgroundColor: '#111111',
        borderTop: `1px solid ${VSCODE_DARK.border}`,
        padding: '8px 16px',
        fontFamily: 'DM Mono, monospace',
        fontSize: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 6,
        }}
      >
        TERMINAL
      </div>
      {renderedLines.map((line, i) =>
        line.displayText.length === 0 ? null : (
          <div
            key={i}
            style={{
              color:
                line.type === 'prompt'
                  ? BRAND.goGreen
                  : line.type === 'success'
                  ? BRAND.commit
                  : '#f87171',
              lineHeight: 1.6,
              marginBottom: 2,
            }}
          >
            {line.displayText}
            {i === lastVisible && cursorBlink && (
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 13,
                  backgroundColor: '#888',
                  verticalAlign: 'middle',
                  marginLeft: 2,
                }}
              />
            )}
          </div>
        )
      )}
    </div>
  );
};

const GIT_CONFUSED_LINES: TerminalLine[] = [
  { type: 'prompt', text: '$ git log --oneline' },
  {
    type: 'error',
    text: "fatal: your current branch 'main' does not have any commits yet",
  },
  { type: 'prompt', text: '$ git status' },
  { type: 'prompt', text: 'On branch main' },
  { type: 'prompt', text: 'Untracked files: (use "git add <file>..." to include)' },
  { type: 'prompt', text: '$ git stash' },
  { type: 'error', text: 'No local changes to save' },
];

const AI_BUILD_LINES_1: TerminalLine[] = [
  { type: 'prompt', text: '> Generating login page...' },
  { type: 'success', text: '✓ 8 files created' },
  { type: 'prompt', text: '> Refactoring API layer...' },
  { type: 'success', text: '✓ Updated 12 files' },
];

const AI_BUILD_LINES_2: TerminalLine[] = [
  { type: 'prompt', text: '> Generating login page...' },
  { type: 'success', text: '✓ 8 files created' },
  { type: 'prompt', text: '> Refactoring API layer...' },
  { type: 'success', text: '✓ Updated 12 files' },
  { type: 'prompt', text: '> Adding auth validation...' },
  { type: 'success', text: '✓ Updated 5 more files' },
  { type: 'error', text: '✗ TypeScript error in 6 files' },
];

// ---------------------------------------------------------------------------
// Overlay text helper
// ---------------------------------------------------------------------------

const Overlay: React.FC<{
  text: string;
  color?: string;
  bg?: string;
  enterFrame: number;
  fontSize?: number;
}> = ({ text, color = '#ffffff', bg = 'rgba(10,61,31,0.92)', enterFrame, fontSize = 36 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring(Math.max(0, frame - enterFrame), fps, {
    damping: 14,
    stiffness: 120,
  });
  const y = interpolate(s, [0, 1], [12, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: `translateX(-50%) translateY(${y}px)`,
        opacity: s,
        backgroundColor: bg,
        color,
        fontFamily: 'DM Sans, sans-serif',
        fontSize,
        fontWeight: 700,
        padding: '14px 32px',
        borderRadius: 8,
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Rocket logo
// ---------------------------------------------------------------------------

const RocketLogo: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      fill={BRAND.commit}
      fillRule="evenodd"
      d="M12 2 C13 5 14.5 8 14.5 10.5 L14.5 14 L17 17 L14.5 15.5 L15 19 L9 19 L9.5 15.5 L7 17 L9.5 14 L9.5 10.5 C9.5 8 11 5 12 2 Z M10.2 12.5 A1.8 1.8 0 1 0 13.8 12.5 A1.8 1.8 0 1 0 10.2 12.5 Z"
    />
    <path fill={BRAND.commit} d="M9 19 L8 21.5 L16 21.5 L15 19 Z" />
  </svg>
);

// ---------------------------------------------------------------------------
// Click ripple
// ---------------------------------------------------------------------------

const ClickRipple: React.FC<{
  triggerFrame: number;
  x: string;
  y: string;
  color?: string;
}> = ({ triggerFrame, x, y, color = 'rgba(74,222,128,0.7)' }) => {
  const frame = useCurrentFrame();
  const progress =
    frame >= triggerFrame
      ? interpolate(frame - triggerFrame, [0, 14], [0, 1], {
          extrapolateRight: 'clamp',
        })
      : 0;

  if (progress <= 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: x,
        width: progress * 64,
        height: progress * 64,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        opacity: 1 - progress,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const BuilderDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const mockupWidth = width * 0.88;
  const mockupHeight = height * 0.52;
  const terminalHeight = height * 0.18;

  // ------------------------------------------------------------------
  // Frame 0–75: Hook text
  // ------------------------------------------------------------------
  if (frame < 75) {
    const redTint = interpolate(frame, [0, 30, 75], [0, 0.04, 0.02], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill>
        <TextScene
          lines={["You've been building for 3 hours.", 'Is any of it saved?']}
          accentLine={1}
          background="dark"
          enterFrame={0}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(239,68,68,${redTint})`,
            pointerEvents: 'none',
          }}
        />
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 75–210: The panic moment
  // ------------------------------------------------------------------
  if (frame < 210) {
    const sceneFrame = frame - 75;
    const slideIn = spring(Math.max(0, sceneFrame), fps, {
      damping: 14,
      stiffness: 80,
    });
    const translateY = interpolate(slideIn, [0, 1], [50, 0]);

    const showSecondOverlay = sceneFrame >= 80;
    const overlayText = showSecondOverlay
      ? 'You have no idea what\'s in them.'
      : '52 uncommitted changes.';

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div
          style={{
            transform: `translateY(${translateY}px)`,
            opacity: slideIn,
            width: mockupWidth,
          }}
        >
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel={false}
            activePanel="explorer"
          >
            <CodeEditor filename="login.tsx" lines={CLEAN_CODE} />
          </VSCodeMockup>
        </div>
        <div
          style={{
            width: mockupWidth,
            opacity: slideIn,
          }}
        >
          <div
            style={{
              height: terminalHeight,
              backgroundColor: '#111111',
              borderTop: `1px solid ${VSCODE_DARK.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Simulate "52 changes" badge */}
            <div
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: 15,
                color: '#f87171',
                fontWeight: 700,
              }}
            >
              ⎇ main  ·  52 changes not saved
            </div>
          </div>
        </div>
        <Overlay text={overlayText} enterFrame={75 + (showSecondOverlay ? 80 : 10)} />
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 210–300: "The old way" — terminal confusion
  // ------------------------------------------------------------------
  if (frame < 300) {
    const sceneFrame = frame - 210;

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div style={{ width: mockupWidth }}>
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel={false}
            activePanel="explorer"
          >
            <CodeEditor filename="login.tsx" lines={CLEAN_CODE} />
          </VSCodeMockup>
        </div>
        <div style={{ width: mockupWidth }}>
          <AITerminal
            lines={GIT_CONFUSED_LINES}
            animateFrom={210}
            height={terminalHeight}
          />
        </div>
        {sceneFrame >= 60 && (
          <Overlay text="This doesn't help you." enterFrame={270} />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 300–390: Go Git It appears — first snapshot
  // ------------------------------------------------------------------
  if (frame < 390) {
    const sceneFrame = frame - 300;
    const panelS = spring(Math.max(0, sceneFrame), fps, {
      damping: 14,
      stiffness: 80,
    });
    const panelX = interpolate(panelS, [0, 1], [-50, 0]);

    const clickFrame = 45;
    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickFrame
        ? 'idle'
        : sceneFrame < clickFrame + 25
        ? 'loading'
        : 'success';

    const greenFlash =
      buttonState === 'success'
        ? interpolate(sceneFrame - clickFrame - 25, [0, 3, 10], [0, 0.08, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        : 0;

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div
          style={{
            transform: `translateX(${panelX}px)`,
            opacity: panelS,
            width: mockupWidth,
          }}
        >
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: 'snapshot',
              buttonState,
              snapshotCount: buttonState === 'success' ? 1 : 0,
              isDirty: buttonState !== 'success',
            }}
          >
            <CodeEditor filename="login.tsx" lines={CLEAN_CODE} />
          </VSCodeMockup>
        </div>
        <div
          style={{
            width: mockupWidth,
            height: terminalHeight,
            backgroundColor: '#111111',
            borderTop: `1px solid ${VSCODE_DARK.border}`,
            opacity: panelS,
          }}
        />
        {/* Green flash on success */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: BRAND.goGreen,
            opacity: greenFlash,
            pointerEvents: 'none',
          }}
        />
        <ClickRipple
          triggerFrame={frame >= 300 + clickFrame ? 300 + clickFrame : 99999}
          x="16%"
          y="38%"
        />
        {sceneFrame < clickFrame && sceneFrame >= 15 && (
          <Overlay
            text="Three hours of work. One click to save it."
            enterFrame={315}
          />
        )}
        {buttonState === 'success' && (
          <Overlay text="✅ Snapshot saved" enterFrame={300 + clickFrame + 25} />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 390–510: AI keeps building (fast montage)
  // ------------------------------------------------------------------
  if (frame < 510) {
    const sceneFrame = frame - 390;

    // Three quick snapshot clicks at frames 0, 30, 60 (relative to scene)
    const snapCount = sceneFrame < 30 ? 1 : sceneFrame < 60 ? 2 : 3;
    const currentClickOffset = sceneFrame % 30;
    const isInClick = currentClickOffset < 30;
    const clickPhaseFrame = currentClickOffset;

    const buttonState: 'idle' | 'loading' | 'success' =
      !isInClick || clickPhaseFrame < 10
        ? 'idle'
        : clickPhaseFrame < 22
        ? 'loading'
        : 'success';

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div style={{ width: mockupWidth }}>
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: 'snapshot',
              buttonState,
              snapshotCount: snapCount,
              isDirty: buttonState !== 'success',
            }}
          >
            <CodeEditor
              filename="login.tsx"
              lines={CLEAN_CODE}
              animateTyping={sceneFrame >= 0 && sceneFrame < 80}
              typingFrame={390}
            />
          </VSCodeMockup>
        </div>
        <div style={{ width: mockupWidth }}>
          <AITerminal
            lines={AI_BUILD_LINES_1}
            animateFrom={390}
            height={terminalHeight}
          />
        </div>
        {sceneFrame >= 10 && (
          <Overlay text="Click. Click. Click. Keep going." enterFrame={400} />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 510–600: Something breaks
  // ------------------------------------------------------------------
  if (frame < 600) {
    const sceneFrame = frame - 510;
    const redFlash = interpolate(sceneFrame, [0, 5, 20], [0.06, 0, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div style={{ width: mockupWidth }}>
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel={false}
            activePanel="explorer"
          >
            <CodeEditor
              filename="login.tsx"
              lines={BROKEN_CODE}
              errorLines={[8, 9, 13]}
            />
          </VSCodeMockup>
        </div>
        <div style={{ width: mockupWidth }}>
          <AITerminal
            lines={AI_BUILD_LINES_2}
            animateFrom={510}
            height={terminalHeight}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(239,68,68,${redFlash})`,
            pointerEvents: 'none',
          }}
        />
        {sceneFrame >= 20 && (
          <Overlay
            text="AI broke it."
            bg="rgba(127,29,29,0.95)"
            color="#fca5a5"
            enterFrame={530}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 600–720: The rewind
  // ------------------------------------------------------------------
  if (frame < 720) {
    const sceneFrame = frame - 600;
    const clickFrame = 50;
    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickFrame
        ? 'idle'
        : sceneFrame < clickFrame + 25
        ? 'loading'
        : 'success';
    const isRestored = buttonState === 'success';

    const greenFlash = isRestored
      ? interpolate(sceneFrame - clickFrame - 25, [0, 3, 10], [0, 0.08, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0;

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div style={{ width: mockupWidth }}>
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: isRestored ? undefined : 'snapshot',
              buttonState: isRestored ? 'idle' : buttonState,
              snapshotCount: 3,
              showTimeline: true,
              isDirty: false,
            }}
          >
            <CodeEditor
              filename="login.tsx"
              lines={isRestored ? CLEAN_CODE : BROKEN_CODE}
              errorLines={isRestored ? [] : [8, 9, 13]}
            />
          </VSCodeMockup>
        </div>
        <div
          style={{
            width: mockupWidth,
            height: terminalHeight,
            backgroundColor: '#111111',
            borderTop: `1px solid ${VSCODE_DARK.border}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: BRAND.goGreen,
            opacity: greenFlash,
            pointerEvents: 'none',
          }}
        />
        <ClickRipple
          triggerFrame={frame >= 600 + clickFrame ? 600 + clickFrame : 99999}
          x="16%"
          y="42%"
        />
        {!isRestored && (
          <Overlay text="Go back to when it worked." enterFrame={610} />
        )}
        {isRestored && (
          <Overlay text="One click. Back to clean." enterFrame={600 + clickFrame + 25} />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 720–870: The "experiment" safety net
  // ------------------------------------------------------------------
  if (frame < 870) {
    const sceneFrame = frame - 720;

    // Experiment click at sceneFrame 30
    const expClickFrame = 30;
    const expDone = sceneFrame >= expClickFrame + 25;
    const expState: 'idle' | 'loading' | 'success' =
      sceneFrame < expClickFrame
        ? 'idle'
        : sceneFrame < expClickFrame + 25
        ? 'loading'
        : 'success';

    // Abandon click at sceneFrame 100
    const abandonClickFrame = 100;
    const abandonDone = sceneFrame >= abandonClickFrame + 25;
    const abandonState: 'idle' | 'loading' | 'success' =
      sceneFrame < abandonClickFrame
        ? 'idle'
        : sceneFrame < abandonClickFrame + 25
        ? 'loading'
        : 'success';

    const branchName = abandonDone
      ? 'main'
      : expDone
      ? 'experiment/try-new-nav'
      : 'main';

    const showAbandon = expDone && !abandonDone;
    const isAbandoned = abandonDone;

    const currentHighlight =
      isAbandoned
        ? undefined
        : showAbandon
        ? ('abandon' as const)
        : ('experiment' as const);

    const currentButtonState = isAbandoned
      ? 'idle'
      : showAbandon
      ? abandonState
      : expState;

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 32,
        }}
      >
        <div style={{ width: mockupWidth }}>
          <VSCodeMockup
            width={mockupWidth}
            height={mockupHeight}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: currentHighlight,
              buttonState: currentButtonState,
              snapshotCount: 3,
              branchName,
              isDirty: expDone && !abandonDone,
            }}
          >
            <CodeEditor
              filename="login.tsx"
              lines={expDone && !abandonDone ? EXPERIMENT_CODE : CLEAN_CODE}
              errorLines={expDone && !abandonDone ? [9, 10] : []}
              animateTyping={expDone && sceneFrame < 80}
              typingFrame={720 + expClickFrame + 25}
            />
          </VSCodeMockup>
        </div>
        <div
          style={{
            width: mockupWidth,
            height: terminalHeight,
            backgroundColor: '#111111',
            borderTop: `1px solid ${VSCODE_DARK.border}`,
          }}
        />
        {!expDone && sceneFrame >= 5 && (
          <Overlay text="Want to try something risky?" enterFrame={725} />
        )}
        {expDone && !abandonDone && sceneFrame >= expClickFrame + 30 && (
          <Overlay text="Experiment all you want." enterFrame={720 + expClickFrame + 30} />
        )}
        {isAbandoned && (
          <Overlay text="Your main work is untouched." enterFrame={720 + abandonClickFrame + 25} />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 870–960: Text scene
  // ------------------------------------------------------------------
  if (frame < 960) {
    return (
      <AbsoluteFill>
        <TextScene
          lines={[
            'No more lost work.',
            'No more git commands.',
            'Just build.',
          ]}
          accentLine={1}
          background="dark"
          enterFrame={0}
        />
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 960–1200: End card
  // ------------------------------------------------------------------
  const endFrame = frame - 960;
  const logoS = spring(Math.max(0, endFrame - 10), fps, {
    damping: 14,
    stiffness: 100,
  });
  const logoFloat = Math.sin(endFrame * 0.03) * 5;
  const fadeIn = interpolate(endFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${BRAND.pine} 0%, ${BRAND.forest} 60%, #050f0a 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        overflow: 'hidden',
        opacity: fadeIn,
      }}
    >
      {/* Branch/net SVG at bottom */}
      <svg
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          opacity: 0.15,
        }}
        width={width}
        height={200}
        viewBox={`0 0 ${width} 200`}
      >
        <path
          d={`M 0 100 Q ${width * 0.25} 50 ${width * 0.5} 100 Q ${width * 0.75} 150 ${width} 100`}
          stroke={BRAND.pine}
          strokeWidth={2}
          fill="none"
        />
        <path
          d={`M ${width * 0.1} 60 L ${width * 0.3} 140 M ${width * 0.4} 60 L ${width * 0.6} 140 M ${width * 0.7} 60 L ${width * 0.9} 140`}
          stroke={BRAND.pine}
          strokeWidth={1.5}
          fill="none"
        />
      </svg>

      <div
        style={{
          transform: `translateY(${logoFloat}px) scale(${interpolate(logoS, [0, 1], [0.5, 1])})`,
          opacity: logoS,
        }}
      >
        <RocketLogo size={64} />
      </div>
      <div
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 42,
          color: '#ffffff',
          opacity: logoS,
          transform: `translateY(${logoFloat * 0.5}px)`,
        }}
      >
        Go Git It
      </div>
      <div
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 20,
          color: BRAND.commit,
          fontWeight: 600,
          opacity: logoS,
        }}
      >
        Safety net for AI builders
      </div>
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 14,
          color: BRAND.branch,
          opacity: interpolate(logoS, [0, 1], [0, 0.85]),
        }}
      >
        Install free — VS Code Marketplace
      </div>
    </AbsoluteFill>
  );
};
