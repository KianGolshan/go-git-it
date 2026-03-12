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
import { GitTerminalGhost } from '../shared/GitTerminalGhost';
import { spring } from '../shared/easing';
import { loadFonts } from '../shared/fonts';

loadFonts();

// Suppress unused import
void VSCODE_DARK;

// ---------------------------------------------------------------------------
// Timing constants  (1050 frames = 35 s @ 30 fps)
// ---------------------------------------------------------------------------
//  0 –  90  Phrase 1
// 90 – 180  Phrase 2
// 180– 270  Phrase 3
// 270– 420  Brand reveal
// 420– 510  VS Code slides in
// 510– 690  Scene 1 — Snapshot
// 690– 870  Scene 2 — Experiment
// 870–1050  Scene 3 — Send + end card

// ---------------------------------------------------------------------------
// Code fixtures
// ---------------------------------------------------------------------------

const CLEAN_CODE: CodeLine[] = [
  { content: 'import { useState } from "react"' },
  { content: '' },
  { content: 'export function App() {' },
  { content: 'const [count, setCount] = useState(0)', indent: 1 },
  { content: '' },
  { content: 'return (', indent: 1 },
  { content: '<div>', indent: 2 },
  { content: '<h1>Count: {count}</h1>', indent: 3 },
  { content: '<button onClick={() => setCount(c => c + 1)}>', indent: 3 },
  { content: 'Increment', indent: 4 },
  { content: '</button>', indent: 3 },
  { content: '</div>', indent: 2 },
  { content: ')', indent: 1 },
  { content: '}' },
];

const FEATURE_CODE: CodeLine[] = [
  ...CLEAN_CODE,
  { content: '' },
  { content: '// new header experiment' },
  { content: 'function NewHeader() {' },
  { content: 'return <header className="new-header">My App v2</header>', indent: 1 },
  { content: '}' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fade a number in over `duration` frames starting at `start` */
function fadeIn(frame: number, start: number, duration = 12): number {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Fade a number out over `duration` frames ending at `end` */
function fadeOut(frame: number, end: number, duration = 12): number {
  return interpolate(frame, [end - duration, end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// ---------------------------------------------------------------------------
// Intro phrase card
// ---------------------------------------------------------------------------

interface PhraseCardProps {
  line1: string;
  line1Color?: string;
  line2?: string;
  line2Color?: string;
  /** Global frame this phrase becomes visible */
  showAt: number;
  /** Global frame this phrase starts fading out */
  hideAt: number;
}

const PhraseCard: React.FC<PhraseCardProps> = ({
  line1,
  line1Color = '#ffffff',
  line2,
  line2Color = BRAND.commit,
  showAt,
  hideAt,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const inSpring = spring(Math.max(0, frame - showAt), fps, { damping: 16, stiffness: 100 });
  const outOpacity = fadeOut(frame, hideAt, 10);
  const opacity = Math.min(inSpring, outOpacity);
  const translateY = interpolate(inSpring, [0, 1], [28, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '0 80px',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: 64,
          color: line1Color,
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {line1}
      </div>
      {line2 && (
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 700,
            fontSize: 40,
            color: line2Color,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {line2}
        </div>
      )}
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
// Comparison row — git command pill + reaction text
// ---------------------------------------------------------------------------

interface ComparisonSectionProps {
  gitCommand: string;
  strikethrough: boolean;
  reactionText: string;
  showReaction: boolean;
  reactionEnterFrame: number;
}

const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  gitCommand,
  strikethrough,
  reactionText,
  showReaction,
  reactionEnterFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const reactionS = showReaction
    ? spring(Math.max(0, frame - reactionEnterFrame), fps, { damping: 14, stiffness: 120 })
    : 0;
  const reactionY = interpolate(reactionS, [0, 1], [18, 0]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        marginTop: 24,
      }}
    >
      {/* Git command */}
      <GitTerminalGhost
        command={gitCommand}
        strikethrough={strikethrough}
        opacity={strikethrough ? 0.35 : 0.9}
        fontSize={22}
      />

      {/* Reaction */}
      {showReaction && (
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 52,
            fontWeight: 800,
            color: BRAND.commit,
            transform: `translateY(${reactionY}px)`,
            opacity: reactionS,
            textAlign: 'center',
            lineHeight: 1.15,
          }}
        >
          {reactionText}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Scene layout wrapper — VS Code + comparison section below
// ---------------------------------------------------------------------------

interface SceneLayoutProps {
  panelProps: React.ComponentProps<typeof VSCodeMockup>['panelProps'];
  code: CodeLine[];
  animateTyping?: boolean;
  typingFrame?: number;
  gitCommand: string;
  strikethrough: boolean;
  reactionText: string;
  showReaction: boolean;
  reactionEnterFrame: number;
}

const SceneLayout: React.FC<SceneLayoutProps> = ({
  panelProps,
  code,
  animateTyping = false,
  typingFrame = 0,
  gitCommand,
  strikethrough,
  reactionText,
  showReaction,
  reactionEnterFrame,
}) => {
  const { width } = useVideoConfig();
  const mockupWidth = Math.min(width * 0.88, 880);
  const mockupHeight = 580;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a1628',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        paddingTop: 24,
      }}
    >
      <VSCodeMockup
        width={mockupWidth}
        height={mockupHeight}
        showGoGitItPanel
        activePanel="gogitit"
        panelProps={panelProps}
      >
        <CodeEditor
          filename="index.ts"
          lines={code}
          animateTyping={animateTyping}
          typingFrame={typingFrame}
        />
      </VSCodeMockup>

      <ComparisonSection
        gitCommand={gitCommand}
        strikethrough={strikethrough}
        reactionText={reactionText}
        showReaction={showReaction}
        reactionEnterFrame={reactionEnterFrame}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const FeatureDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // ------------------------------------------------------------------
  // Frames 0–270: Three intro phrases
  // ------------------------------------------------------------------
  if (frame < 270) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#0a1628' }}>
        <PhraseCard
          line1="AI moves fast."
          line2="Git slows you down."
          line2Color="#f87171"
          showAt={0}
          hideAt={82}
        />
        <PhraseCard
          line1="You don't know what's saved"
          line2="and what isn't."
          line2Color="#fbbf24"
          showAt={90}
          hideAt={172}
        />
        <PhraseCard
          line1="There's no undo button"
          line2="in the terminal."
          line2Color="#f87171"
          showAt={180}
          hideAt={265}
        />
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frames 270–420: Brand reveal
  // ------------------------------------------------------------------
  if (frame < 420) {
    const sceneFrame = frame - 270;
    const logoS = spring(Math.max(0, sceneFrame - 5), fps, { damping: 14, stiffness: 90 });
    const titleS = spring(Math.max(0, sceneFrame - 18), fps, { damping: 14, stiffness: 100 });
    const taglineS = spring(Math.max(0, sceneFrame - 34), fps, { damping: 14, stiffness: 100 });
    const marketplaceS = spring(Math.max(0, sceneFrame - 50), fps, { damping: 14, stiffness: 100 });

    const fadeInOpacity = fadeIn(frame, 270, 10);

    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${BRAND.pine} 0%, ${BRAND.forest} 55%, #050f0a 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          opacity: fadeInOpacity,
        }}
      >
        <div
          style={{
            transform: `translateY(${interpolate(logoS, [0, 1], [30, 0])}px) scale(${interpolate(logoS, [0, 1], [0.6, 1])})`,
            opacity: logoS,
          }}
        >
          <RocketLogo size={80} />
        </div>
        <div
          style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: 72,
            color: '#ffffff',
            opacity: titleS,
            transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
          }}
        >
          Go Git It
        </div>
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 600,
            fontSize: 28,
            color: BRAND.commit,
            opacity: taglineS,
            transform: `translateY(${interpolate(taglineS, [0, 1], [16, 0])}px)`,
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Version control for people who just want to build things.
        </div>
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 22,
            fontWeight: 600,
            color: BRAND.branch,
            opacity: marketplaceS,
            transform: `translateY(${interpolate(marketplaceS, [0, 1], [12, 0])}px)`,
            letterSpacing: '0.02em',
          }}
        >
          Free — VS Code Marketplace
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frames 420–510: VS Code slides in
  // ------------------------------------------------------------------
  if (frame < 510) {
    const sceneFrame = frame - 420;
    const slideIn = spring(Math.max(0, sceneFrame), fps, { damping: 14, stiffness: 70 });
    const translateY = interpolate(slideIn, [0, 1], [80, 0]);
    const mockupWidth = Math.min(width * 0.88, 880);

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0a1628',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 24,
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
            height={580}
            showGoGitItPanel
            activePanel="gogitit"
            panelProps={{ snapshotCount: 0, isDirty: true }}
          >
            <CodeEditor filename="index.ts" lines={CLEAN_CODE} />
          </VSCodeMockup>
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 22,
            fontWeight: 600,
            color: BRAND.muted,
            opacity: slideIn,
          }}
        >
          Your project. Your work. Let's save it.
        </div>
      </AbsoluteFill>
    );
  }

  // ------------------------------------------------------------------
  // Frames 510–690: Scene 1 — Snapshot  (180 frames = 6 s)
  // ------------------------------------------------------------------
  if (frame < 690) {
    const sceneFrame = frame - 510;
    // Click at frame 70 of scene → plenty of time to read
    const clickAt = 70;
    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickAt
        ? 'idle'
        : sceneFrame < clickAt + 28
        ? 'loading'
        : 'success';
    const didSucceed = buttonState === 'success';
    const reactionEnterFrame = 510 + clickAt + 28;

    return (
      <SceneLayout
        panelProps={{
          highlightedButton: 'snapshot',
          buttonState,
          snapshotCount: didSucceed ? 1 : 0,
          isDirty: !didSucceed,
        }}
        code={CLEAN_CODE}
        gitCommand="git add . && git commit -m 'progress'"
        strikethrough={didSucceed}
        reactionText="One click. Done."
        showReaction={didSucceed}
        reactionEnterFrame={reactionEnterFrame}
      />
    );
  }

  // ------------------------------------------------------------------
  // Frames 690–870: Scene 2 — Experiment  (180 frames = 6 s)
  // ------------------------------------------------------------------
  if (frame < 870) {
    const sceneFrame = frame - 690;
    const clickAt = 70;
    const buttonState: 'idle' | 'loading' | 'success' =
      sceneFrame < clickAt
        ? 'idle'
        : sceneFrame < clickAt + 28
        ? 'loading'
        : 'success';
    const didSucceed = buttonState === 'success';
    const branchName = didSucceed ? 'experiment/new-header' : 'main';
    const reactionEnterFrame = 690 + clickAt + 28;

    return (
      <SceneLayout
        panelProps={{
          highlightedButton: didSucceed ? undefined : 'experiment',
          buttonState: didSucceed ? 'idle' : buttonState,
          snapshotCount: 1,
          branchName,
          isDirty: false,
        }}
        code={didSucceed ? FEATURE_CODE : CLEAN_CODE}
        animateTyping={didSucceed && sceneFrame < clickAt + 90}
        typingFrame={690 + clickAt + 28}
        gitCommand="git checkout -b experiment/new-header"
        strikethrough={didSucceed}
        reactionText="No branch names. Just build."
        showReaction={didSucceed}
        reactionEnterFrame={reactionEnterFrame}
      />
    );
  }

  // ------------------------------------------------------------------
  // Frames 870–1050: Scene 3 — Send + end card  (180 frames = 6 s)
  // ------------------------------------------------------------------
  const sceneFrame = frame - 870;
  const clickAt = 70;
  const buttonState: 'idle' | 'loading' | 'success' =
    sceneFrame < clickAt
      ? 'idle'
      : sceneFrame < clickAt + 28
      ? 'loading'
      : 'success';
  const didSucceed = buttonState === 'success';
  const reactionEnterFrame = 870 + clickAt + 28;

  // After reaction has been up for ~50 frames, fade to end card
  const endCardStart = 870 + clickAt + 28 + 60;
  const endCardOpacity = frame >= endCardStart
    ? interpolate(frame, [endCardStart, endCardStart + 20], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  if (endCardOpacity >= 1) {
    // Pure end card
    const ef = frame - (endCardStart + 20);
    const logoS = spring(Math.max(0, ef), fps, { damping: 14, stiffness: 100 });
    const logoFloat = Math.sin(ef * 0.04) * 4;

    return (
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, ${BRAND.pine} 0%, ${BRAND.forest} 60%, #050f0a 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <div style={{ transform: `translateY(${logoFloat}px)`, opacity: logoS }}>
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
            fontSize: 26,
            fontWeight: 600,
            color: BRAND.commit,
            opacity: logoS,
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Version control for people who just want to build things.
        </div>
        <div
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 22,
            fontWeight: 600,
            color: BRAND.branch,
            opacity: logoS,
            marginTop: 8,
            letterSpacing: '0.02em',
          }}
        >
          Free — VS Code Marketplace
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneLayout
        panelProps={{
          highlightedButton: 'send',
          buttonState,
          snapshotCount: 2,
          branchName: 'main',
          isDirty: false,
        }}
        code={CLEAN_CODE}
        gitCommand="git push origin main"
        strikethrough={didSucceed}
        reactionText="Your work. Backed up."
        showReaction={didSucceed}
        reactionEnterFrame={reactionEnterFrame}
      />
      {/* End card cross-fade overlay */}
      {endCardOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, ${BRAND.pine} 0%, ${BRAND.forest} 60%, #050f0a 100%)`,
            opacity: endCardOpacity,
          }}
        />
      )}
    </div>
  );
};
