import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  AbsoluteFill,
} from 'remotion';
import { BRAND, VSCODE_DARK } from '../shared/colors';
import { VSCodeMockup } from '../shared/VSCodeMockup';
import { CodeEditor, CodeLine } from '../shared/CodeEditor';
import { spring, easeOutCubic } from '../shared/easing';
import { loadFonts } from '../shared/fonts';

loadFonts();

// easeOutCubic used in terminal-slide-out calculation
void easeOutCubic;

// ---------------------------------------------------------------------------
// Code fixtures
// ---------------------------------------------------------------------------

const WORKING_CODE: CodeLine[] = [
  { content: 'import { useState, useEffect } from "react"' },
  { content: 'import { api } from "./api"' },
  { content: '' },
  { content: 'export function HeroSection() {' },
  { content: 'const [headline, setHeadline] = useState("")', indent: 1 },
  { content: 'const [loaded, setLoaded] = useState(false)', indent: 1 },
  { content: '' },
  { content: 'useEffect(() => {', indent: 1 },
  { content: 'api.content.getHero().then(d => {', indent: 2 },
  { content: 'setHeadline(d.headline)', indent: 3 },
  { content: 'setLoaded(true)', indent: 3 },
  { content: '})', indent: 2 },
  { content: '}, [])', indent: 1 },
  { content: '' },
  { content: 'return <section>{loaded && <h1>{headline}</h1>}</section>', indent: 1 },
  { content: '}' },
];

const EXPERIMENT_CODE: CodeLine[] = [
  { content: 'import { useState, useEffect } from "react"' },
  { content: 'import { api } from "./api"' },
  { content: '' },
  { content: 'export function HeroSection() {' },
  { content: 'const [headline, setHeadline] = useState("")', indent: 1 },
  { content: '' },
  { content: '// trying a totally different layout', indent: 1 },
  { content: 'return (', indent: 1 },
  { content: '<section className="hero-v2">', indent: 2 },
  { content: '<video src="/hero.mp4" autoPlay />', indent: 3 },
  { content: '<h1 className="overlay-textt">{headline}</h1>', indent: 3 },
  { content: '</section>', indent: 2 },
  { content: ')', indent: 1 },
  { content: '}' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface OverlayTextProps {
  main: string;
  sub?: string;
  enterFrame: number;
  align?: 'left' | 'center';
}

const OverlayText: React.FC<OverlayTextProps> = ({
  main,
  sub,
  enterFrame,
  align = 'left',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring(Math.max(0, frame - enterFrame), fps, {
    damping: 14,
    stiffness: 120,
  });
  const translateY = interpolate(s, [0, 1], [16, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
        left: align === 'left' ? 64 : '50%',
        transform:
          align === 'left'
            ? `translateY(${translateY}px)`
            : `translateX(-50%) translateY(${translateY}px)`,
        opacity: s,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        textAlign: align === 'center' ? 'center' : 'left',
      }}
    >
      <div
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 42,
          fontWeight: 700,
          color: '#ffffff',
          backgroundColor: 'rgba(10,61,31,0.92)',
          padding: '14px 28px',
          borderRadius: 8,
          lineHeight: 1.3,
        }}
      >
        {main}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 18,
            color: BRAND.muted,
            backgroundColor: 'rgba(15,23,42,0.82)',
            padding: '5px 14px',
            borderRadius: 6,
            alignSelf: align === 'center' ? 'center' : 'flex-start',
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

// Ghost terminal component — dark sliding terminal panel
interface GhostTerminalProps {
  lines: Array<{ text: string; isError?: boolean }>;
  slideInFrame: number;
  slideOutFrame?: number;
  charsPerFrame?: number;
}

const GhostTerminal: React.FC<GhostTerminalProps> = ({
  lines,
  slideInFrame,
  slideOutFrame,
  charsPerFrame = 4,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const slideIn = spring(Math.max(0, frame - slideInFrame), fps, {
    damping: 18,
    stiffness: 100,
  });
  const slideInY = interpolate(slideIn, [0, 1], [height * 0.35, 0]);

  const slideOutY = slideOutFrame
    ? interpolate(frame, [slideOutFrame, slideOutFrame + 20], [0, height * 0.35], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  const translateY = slideInY + slideOutY;

  const totalChars = lines.reduce((acc, l) => acc + l.text.length, 0);
  const charsShown = Math.min(
    totalChars,
    Math.max(0, (frame - slideInFrame) * charsPerFrame)
  );

  let accumulated = 0;
  const renderedLines = lines.map((line) => {
    const lineStart = accumulated;
    accumulated += line.text.length;
    const show = Math.max(0, Math.min(line.text.length, charsShown - lineStart));
    return { ...line, displayText: line.text.slice(0, show) };
  });

  const cursorBlink = Math.floor(frame / 15) % 2 === 0;
  const lastVisibleIdx = renderedLines.reduce(
    (idx, l, i) => (l.displayText.length > 0 ? i : idx),
    -1
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        transform: `translateY(${translateY}px)`,
        backgroundColor: '#141414',
        borderTop: `2px solid #3e3e42`,
        padding: '16px 32px 24px',
        fontFamily: 'DM Mono, monospace',
        fontSize: 14,
        lineHeight: 1.7,
        zIndex: 20,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#555555',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 10,
        }}
      >
        TERMINAL
      </div>
      {renderedLines.map((line, i) =>
        line.displayText.length === 0 ? null : (
          <div
            key={i}
            style={{
              color: line.isError ? '#f87171' : '#94a3b8',
              marginBottom: 2,
            }}
          >
            {line.displayText}
            {i === lastVisibleIdx && cursorBlink && (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 14,
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

const TERMINAL_LINES = [
  { text: '$ git status' },
  { text: 'On branch main' },
  { text: 'Changes not staged for commit:' },
  { text: '  modified: src/App.tsx' },
  { text: '  modified: src/utils.ts' },
  { text: '' },
  { text: '$ git add .' },
  { text: '$ git commit -m "fixed stuff"' },
  { text: '[main 3a7f2c1] fixed stuff' },
  { text: '$ git push origin main' },
  { text: "Enumerating objects: 7, done." },
  { text: "Writing objects: 100% (7/7), done." },
];

// ---------------------------------------------------------------------------
// Click ripple
// ---------------------------------------------------------------------------

const ClickRipple: React.FC<{ triggerFrame: number; x: string; y: string }> = ({
  triggerFrame,
  x,
  y,
}) => {
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
        width: progress * 72,
        height: progress * 72,
        borderRadius: '50%',
        border: '2px solid rgba(74,222,128,0.7)',
        opacity: 1 - progress,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    />
  );
};

// ---------------------------------------------------------------------------
// Rocket logo (inline)
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
// Comparison scene (frames 750–870)
// ---------------------------------------------------------------------------

const GIT_COMMANDS = [
  '$ git init',
  '$ git add .',
  '$ git commit -m "init"',
  '$ git checkout -b experiment/hero-redesign',
  '  # ... write code ...',
  '$ git add .',
  '$ git commit -m "try new hero"',
  '$ git checkout main',
  '$ git branch -D experiment/hero-redesign',
  '$ git push origin main',
  '$ git log --oneline',
  '$ git stash',
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const CoreProductDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ------------------------------------------------------------------
  // Frame 0–60: Hook — working code, scary git icon, overlay question
  // ------------------------------------------------------------------
  if (frame < 60) {
    const fadeIn = interpolate(frame, [0, 20], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const textS = spring(Math.max(0, frame - 20), fps, {
      damping: 14,
      stiffness: 120,
    });
    const textY = interpolate(textS, [0, 1], [16, 0]);

    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628', opacity: fadeIn }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel={false}
            activePanel="explorer"
          >
            <CodeEditor filename="App.tsx" lines={WORKING_CODE} />
          </VSCodeMockup>
        </div>
        {/* "3 changes" badge on the source control icon — overlaid on activity bar */}
        <div
          style={{
            position: 'absolute',
            top: height * 0.09 + 24 * 2 + 14,
            left: width * 0.075 + 26,
            backgroundColor: '#007acc',
            color: '#fff',
            fontFamily: 'DM Mono, monospace',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 8,
            padding: '1px 4px',
            zIndex: 10,
          }}
        >
          3
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 64,
            left: '50%',
            transform: `translateX(-50%) translateY(${textY}px)`,
            opacity: textS,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 26,
            fontWeight: 700,
            color: '#ffffff',
            backgroundColor: 'rgba(10,61,31,0.9)',
            padding: '10px 24px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          Your code works. Now how do you save it?
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 60–150: The Git problem — ghost terminal slides in
  // ------------------------------------------------------------------
  if (frame < 150) {
    const terminalVisible = frame >= 70;
    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel={false}
            activePanel="explorer"
          >
            <CodeEditor filename="App.tsx" lines={WORKING_CODE} />
          </VSCodeMockup>
        </div>
        {terminalVisible && (
          <GhostTerminal
            lines={TERMINAL_LINES}
            slideInFrame={70}
            slideOutFrame={145}
            charsPerFrame={5}
          />
        )}
        <OverlayText main="Just to save your work." enterFrame={100} />
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 150–210: The reveal — terminal out, panel slides in
  // ------------------------------------------------------------------
  if (frame < 210) {
    const panelSlide = spring(Math.max(0, frame - 160), fps, {
      damping: 14,
      stiffness: 80,
    });
    const panelX = interpolate(panelSlide, [0, 1], [-60, 0]);
    const textS = spring(Math.max(0, frame - 175), fps, {
      damping: 14,
      stiffness: 120,
    });
    const textY = interpolate(textS, [0, 1], [16, 0]);

    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translateX(${panelX}px)`,
            opacity: panelSlide,
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{ isDirty: true, snapshotCount: 0 }}
          >
            <CodeEditor filename="App.tsx" lines={WORKING_CODE} />
          </VSCodeMockup>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 64,
            left: '50%',
            transform: `translateX(-50%) translateY(${textY}px)`,
            opacity: textS,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            backgroundColor: 'rgba(10,61,31,0.92)',
            padding: '10px 24px',
            borderRadius: 8,
            textAlign: 'center',
          }}
        >
          There&apos;s a better way.
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 210–330: Core action 1 — Snapshot
  // ------------------------------------------------------------------
  if (frame < 330) {
    const sceneFrame = frame - 210;
    const clickFrame = 40;
    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickFrame
        ? 'idle'
        : sceneFrame < clickFrame + 25
        ? 'loading'
        : 'success';

    const pulseGlow =
      buttonState === 'idle'
        ? 0.5 + 0.5 * Math.sin((sceneFrame / fps) * Math.PI * 3)
        : 0;

    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: 'snapshot',
              buttonState,
              snapshotCount: buttonState === 'success' ? 1 : 0,
              isDirty: buttonState === 'idle',
            }}
          >
            <CodeEditor
              filename="App.tsx"
              lines={WORKING_CODE}
              highlightLines={[5, 9, 10]}
            />
          </VSCodeMockup>
        </div>
        <ClickRipple
          triggerFrame={frame >= 210 + clickFrame ? 210 + clickFrame : 99999}
          x="16%"
          y="38%"
        />
        {buttonState === 'success' && (
          <OverlayText
            main="📸 Take a snapshot. That's it."
            sub="(that was git add + git commit)"
            enterFrame={210 + clickFrame + 30}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 330–480: Core action 2 — Experiment
  // ------------------------------------------------------------------
  if (frame < 480) {
    const sceneFrame = frame - 330;
    const clickFrame = 50;
    const experimentStarted = sceneFrame >= clickFrame + 25;

    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickFrame
        ? 'idle'
        : sceneFrame < clickFrame + 25
        ? 'loading'
        : 'success';

    const branchName = experimentStarted ? 'experiment/hero-redesign' : 'main';

    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        {sceneFrame < 20 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 28,
                fontWeight: 700,
                color: '#ffffff',
                opacity: interpolate(sceneFrame, [0, 20], [1, 0], {
                  extrapolateRight: 'clamp',
                }),
                textAlign: 'center',
                padding: '0 80px',
              }}
            >
              Want to try something? Afraid to break it?
            </div>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: interpolate(sceneFrame, [10, 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: experimentStarted ? undefined : 'experiment',
              buttonState: experimentStarted ? 'idle' : buttonState,
              snapshotCount: 1,
              branchName,
              isDirty: false,
            }}
          >
            <CodeEditor filename="App.tsx" lines={WORKING_CODE} />
          </VSCodeMockup>
        </div>
        {buttonState === 'success' && (
          <OverlayText
            main="🧪 Start an experiment. Work freely."
            sub="(that was git checkout -b experiment/hero-redesign)"
            enterFrame={330 + clickFrame + 25}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 480–600: Experiment work + abandon
  // ------------------------------------------------------------------
  if (frame < 600) {
    const sceneFrame = frame - 480;
    const abandonClickFrame = 60;
    const abandoned = sceneFrame >= abandonClickFrame + 25;

    const abandonState: 'idle' | 'loading' | 'success' =
      sceneFrame < abandonClickFrame
        ? 'idle'
        : sceneFrame < abandonClickFrame + 25
        ? 'loading'
        : 'success';

    const branchName = abandoned ? 'main' : 'experiment/hero-redesign';
    const showErrors = sceneFrame >= 20 && !abandoned;

    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: abandoned ? undefined : 'abandon',
              buttonState: abandonState,
              snapshotCount: 1,
              branchName,
              isDirty: !abandoned,
            }}
          >
            <CodeEditor
              filename="App.tsx"
              lines={EXPERIMENT_CODE}
              errorLines={showErrors ? [11] : []}
              animateTyping={sceneFrame >= 0 && sceneFrame < 50}
              typingFrame={480}
            />
          </VSCodeMockup>
        </div>
        {!abandoned && sceneFrame >= 20 && sceneFrame < abandonClickFrame && (
          <OverlayText main="Changed your mind? No sweat." enterFrame={500} />
        )}
        {abandonState === 'success' && (
          <OverlayText
            main="🗑️ Abandoned. Back to where you were."
            sub="(that was git checkout main && git branch -D)"
            enterFrame={480 + abandonClickFrame + 25}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 600–750: Core action 3 — Send to GitHub
  // ------------------------------------------------------------------
  if (frame < 750) {
    const sceneFrame = frame - 600;
    const clickFrame = 45;
    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickFrame
        ? 'idle'
        : sceneFrame < clickFrame + 30
        ? 'loading'
        : 'success';

    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VSCodeMockup
            width={width * 0.85}
            height={height * 0.82}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{
              highlightedButton: 'send',
              buttonState,
              snapshotCount: 2,
              branchName: 'main',
              isDirty: false,
            }}
          >
            <CodeEditor filename="App.tsx" lines={WORKING_CODE} />
          </VSCodeMockup>
        </div>
        <ClickRipple
          triggerFrame={frame >= 600 + clickFrame ? 600 + clickFrame : 99999}
          x="16%"
          y="41%"
        />
        {buttonState === 'success' && (
          <OverlayText
            main="☁️ Send to GitHub. Backed up forever."
            sub="(that was git push origin main)"
            enterFrame={600 + clickFrame + 30}
          />
        )}
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 750–870: Side-by-side comparison
  // ------------------------------------------------------------------
  if (frame < 870) {
    const sceneFrame = frame - 750;
    const slideIn = spring(Math.max(0, sceneFrame - 5), fps, {
      damping: 14,
      stiffness: 80,
    });

    const scrollOffset = interpolate(sceneFrame, [20, 90], [0, GIT_COMMANDS.length * 22], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    const buttonPulse = [0, 1, 2].map((i) => {
      const start = 60 + i * 20;
      return spring(Math.max(0, sceneFrame - start), fps, {
        damping: 10,
        stiffness: 200,
      });
    });

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          opacity: slideIn,
        }}
      >
        {/* Title */}
        <div
          style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 36,
            color: '#ffffff',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          Git. vs. Go Git It.
        </div>

        {/* Split panels */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            width: width * 0.88,
          }}
        >
          {/* Left — Git terminal */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                color: BRAND.muted,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              What Git requires
            </div>
            <div
              style={{
                backgroundColor: '#141414',
                borderRadius: 8,
                border: '1px solid #3e3e42',
                padding: '16px 20px',
                height: 340,
                overflow: 'hidden',
                fontFamily: 'DM Mono, monospace',
                fontSize: 13,
                lineHeight: 1.7,
                position: 'relative',
              }}
            >
              <div
                style={{
                  transform: `translateY(-${scrollOffset}px)`,
                  transition: 'none',
                }}
              >
                {GIT_COMMANDS.map((cmd, i) => (
                  <div key={i} style={{ color: '#94a3b8', marginBottom: 2 }}>
                    {cmd}
                  </div>
                ))}
                {/* repeat for scroll effect */}
                {GIT_COMMANDS.map((cmd, i) => (
                  <div key={`b${i}`} style={{ color: '#94a3b8', marginBottom: 2 }}>
                    {cmd}
                  </div>
                ))}
              </div>
              {/* fade bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                  background: 'linear-gradient(transparent, #141414)',
                }}
              />
            </div>
          </div>

          {/* Right — Go Git It panel */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                color: BRAND.commit,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              What you click
            </div>
            <div
              style={{
                height: 340,
                backgroundColor: VSCODE_DARK.sidebar,
                borderRadius: 8,
                border: `1px solid ${BRAND.pine}`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px 0',
                gap: 8,
              }}
            >
              {[
                { emoji: '📸', label: 'Snapshot', idx: 0 },
                { emoji: '🧪', label: 'Start experiment', idx: 1 },
                { emoji: '☁️', label: 'Send to GitHub', idx: 2 },
              ].map(({ emoji, label, idx }) => {
                const pulse = buttonPulse[idx];
                const glow = interpolate(pulse, [0, 1], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                });
                return (
                  <div
                    key={label}
                    style={{
                      margin: '0 12px',
                      height: 48,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '0 16px',
                      borderRadius: 6,
                      backgroundColor: interpolate(glow, [0, 1], [0, 1]) > 0.1
                        ? BRAND.forest
                        : VSCODE_DARK.panel,
                      border: `1px solid rgba(74,222,128,${interpolate(glow, [0, 1], [0.1, 0.6])})`,
                      color: BRAND.commit,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 15,
                      fontWeight: 600,
                      boxShadow: `0 0 ${glow * 10}px rgba(74,222,128,0.3)`,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 870–1020: End card
  // ------------------------------------------------------------------
  if (frame < 1020) {
    const sceneFrame = frame - 870;
    const fadeIn = interpolate(sceneFrame, [0, 20], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const logoS = spring(Math.max(0, sceneFrame - 10), fps, {
      damping: 14,
      stiffness: 100,
    });
    const logoY = interpolate(logoS, [0, 1], [40, 0]);
    const logoFloat = Math.sin(sceneFrame * 0.04) * 5;

    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${BRAND.pine} 0%, ${BRAND.forest} 60%, #050f0a 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            transform: `translateY(${logoY + logoFloat}px) scale(${interpolate(logoS, [0, 1], [0.5, 1])})`,
            opacity: logoS,
          }}
        >
          <RocketLogo size={64} />
        </div>
        <div
          style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 56,
            color: '#ffffff',
            opacity: logoS,
          }}
        >
          Go Git It
        </div>
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 22,
            color: BRAND.commit,
            fontWeight: 600,
            opacity: logoS,
            textAlign: 'center',
            maxWidth: 600,
          }}
        >
          Version control for builders who just want to build.
        </div>
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 14,
            color: BRAND.muted,
            opacity: interpolate(logoS, [0, 1], [0, 0.8]),
          }}
        >
          Free on VS Code Marketplace
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frame 1020–1800: Hold on end card with slow particle animation
  // ------------------------------------------------------------------
  const holdFrame = frame - 1020;
  const logoFloat = Math.sin(holdFrame * 0.025) * 6;

  // Generate stable particles
  const particles = Array.from({ length: 16 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.7) % 100,
    size: 2 + (i % 3),
    speed: 0.2 + (i % 5) * 0.08,
    offset: (i * 42) % 100,
  }));

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
      }}
    >
      {/* Slow-moving particles */}
      {particles.map((p, i) => {
        const floatY = Math.sin((holdFrame * p.speed + p.offset) * 0.04) * 10;
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
              opacity: 0.12,
              pointerEvents: 'none',
            }}
          />
        );
      })}
      <div
        style={{
          transform: `translateY(${logoFloat}px)`,
        }}
      >
        <RocketLogo size={64} />
      </div>
      <div
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 56,
          color: '#ffffff',
        }}
      >
        Go Git It
      </div>
      <div
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 22,
          color: BRAND.commit,
          fontWeight: 600,
          textAlign: 'center',
          maxWidth: 600,
        }}
      >
        Version control for builders who just want to build.
      </div>
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 14,
          color: BRAND.muted,
          opacity: 0.8,
        }}
      >
        Free on VS Code Marketplace
      </div>
    </AbsoluteFill>
  );
};
