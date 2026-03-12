import React from 'react';
import { useCurrentFrame } from 'remotion';
import { VSCODE_DARK } from './colors';

export interface CodeLine {
  content: string;
  indent?: number;
}

export interface CodeEditorProps {
  filename: string;
  lines: CodeLine[];
  highlightLines?: number[];
  errorLines?: number[];
  animateTyping?: boolean;
  typingFrame?: number;
}

function tokenize(content: string): React.ReactNode {
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'default', 'from', 'async', 'await', 'class', 'interface', 'type', 'extends', 'implements', 'new', 'this', 'typeof', 'void', 'try', 'catch', 'throw', 'readonly'];
  const types = ['string', 'number', 'boolean', 'null', 'undefined', 'any', 'never', 'unknown', 'Promise', 'Array', 'Record', 'Partial', 'Required', 'Pick', 'Omit'];

  if (content.trim().startsWith('//')) {
    return <span style={{ color: VSCODE_DARK.commentGreen }}>{content}</span>;
  }

  // Simple regex-based tokenizer
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  while (remaining.length > 0) {
    // String
    const strMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/);
    if (strMatch) {
      parts.push(<span key={key++} style={{ color: VSCODE_DARK.stringOrange }}>{strMatch[0]}</span>);
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Number
    const numMatch = remaining.match(/^\b(\d+\.?\d*)\b/);
    if (numMatch) {
      parts.push(<span key={key++} style={{ color: VSCODE_DARK.numberGold }}>{numMatch[0]}</span>);
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    // Word (keyword, type, or identifier)
    const wordMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (wordMatch) {
      const word = wordMatch[0];
      let color: string = VSCODE_DARK.text;
      if (keywords.includes(word)) color = VSCODE_DARK.keywordBlue;
      else if (types.includes(word)) color = VSCODE_DARK.typeTeal;
      else if (/^[A-Z]/.test(word)) color = VSCODE_DARK.typeTeal;
      parts.push(<span key={key++} style={{ color }}>{word}</span>);
      remaining = remaining.slice(word.length);
      continue;
    }

    // Punctuation / operator
    const punctMatch = remaining.match(/^([^\w\s'"``]|\s+)/);
    if (punctMatch) {
      parts.push(<span key={key++} style={{ color: VSCODE_DARK.text }}>{punctMatch[0]}</span>);
      remaining = remaining.slice(punctMatch[0].length);
      continue;
    }

    // Fallback: advance one character
    parts.push(<span key={key++} style={{ color: VSCODE_DARK.text }}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filename,
  lines,
  highlightLines = [],
  errorLines = [],
  animateTyping = false,
  typingFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const charsPerFrame = 3;
  const totalChars = lines.reduce((acc, l) => acc + l.content.length, 0);
  const charsToShow = animateTyping
    ? Math.min(totalChars, Math.max(0, (frame - typingFrame) * charsPerFrame))
    : totalChars;

  const cursorBlink = Math.floor(frame / 15) % 2 === 0;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: VSCODE_DARK.background,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'DM Mono, monospace',
      overflow: 'hidden',
    }}>
      {/* File tab */}
      <div style={{
        height: 35,
        backgroundColor: VSCODE_DARK.background,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '0 0 0 0',
        borderBottom: `1px solid ${VSCODE_DARK.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          height: 35,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          backgroundColor: VSCODE_DARK.background,
          borderTop: `1px solid #007acc`,
          fontSize: 13,
          color: VSCODE_DARK.text,
          gap: 6,
        }}>
          <span style={{ color: VSCODE_DARK.typeTeal }}>TS</span>
          <span>{filename}</span>
          {errorLines.length > 0 && (
            <div style={{
              backgroundColor: '#f44747',
              color: '#fff',
              borderRadius: 8,
              fontSize: 10,
              padding: '1px 5px',
              fontWeight: 700,
            }}>
              {errorLines.length}
            </div>
          )}
        </div>
      </div>

      {/* Code area */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 0',
      }}>
        {lines.map((line, i) => {
          const lineNum = i + 1;
          const isHighlighted = highlightLines.includes(lineNum);
          const isError = errorLines.includes(lineNum);

          let displayContent: string;
          if (!animateTyping) {
            displayContent = line.content;
          } else {
            const lineStart = lines.slice(0, i).reduce((acc, l) => acc + l.content.length, 0);
            const lineLen = line.content.length;
            const lineChars = Math.max(0, Math.min(lineLen, charsToShow - lineStart));
            displayContent = line.content.slice(0, lineChars);
          }

          const indent = line.indent ?? 0;

          // Find the currently-being-typed line index
          let typingLineIndex = -1;
          if (animateTyping) {
            let accumulated = 0;
            for (let idx = 0; idx < lines.length; idx++) {
              accumulated += lines[idx].content.length;
              if (accumulated > charsToShow) {
                typingLineIndex = idx;
                break;
              }
            }
          }

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 22,
                backgroundColor: isHighlighted ? 'rgba(255,255,255,0.04)' : 'transparent',
                position: 'relative',
                borderBottom: isError ? '2px solid rgba(244, 71, 71, 0.6)' : 'none',
                flexShrink: 0,
              }}
            >
              {/* Line number gutter */}
              <div style={{
                width: 48,
                textAlign: 'right',
                paddingRight: 12,
                color: isError ? '#f44747' : VSCODE_DARK.lineNumber,
                fontSize: 12,
                flexShrink: 0,
                userSelect: 'none',
              }}>
                {isError ? '●' : lineNum}
              </div>

              {/* Code content */}
              <div style={{
                paddingLeft: indent * 16,
                fontSize: 13,
                whiteSpace: 'pre',
                color: VSCODE_DARK.text,
                flex: 1,
              }}>
                {tokenize(displayContent)}
                {animateTyping && i === typingLineIndex && cursorBlink && (
                  <span style={{
                    display: 'inline-block',
                    width: 2,
                    height: 14,
                    backgroundColor: VSCODE_DARK.text,
                    verticalAlign: 'middle',
                    marginLeft: 1,
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
