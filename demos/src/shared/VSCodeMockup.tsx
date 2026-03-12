import React from 'react';
import { BRAND, VSCODE_DARK } from './colors';
import { GoGitItPanel, GoGitItPanelProps } from './GoGitItPanel';

export interface VSCodeMockupProps {
  width: number;
  height: number;
  showGoGitItPanel?: boolean;
  activePanel?: 'explorer' | 'gogitit';
  panelProps?: GoGitItPanelProps;
  children?: React.ReactNode;
}

const RocketActivityIcon: React.FC<{ active?: boolean }> = ({ active = false }) => (
  <div style={{
    position: 'relative',
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeft: active ? `2px solid #ffffff` : '2px solid transparent',
    opacity: active ? 1 : 0.5,
  }}>
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <path
        fill={active ? BRAND.commit : '#cccccc'}
        fillRule="evenodd"
        d="M12 2 C13 5 14.5 8 14.5 10.5 L14.5 14 L17 17 L14.5 15.5 L15 19 L9 19 L9.5 15.5 L7 17 L9.5 14 L9.5 10.5 C9.5 8 11 5 12 2 Z M10.2 12.5 A1.8 1.8 0 1 0 13.8 12.5 A1.8 1.8 0 1 0 10.2 12.5 Z"
      />
      <path fill={active ? BRAND.commit : '#cccccc'} d="M9 19 L8 21.5 L16 21.5 L15 19 Z" />
    </svg>
  </div>
);

const ActivityBarIcon: React.FC<{ active?: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <div style={{
    width: 48,
    height: 48,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: active ? 1 : 0.4,
    borderLeft: active ? '2px solid #fff' : '2px solid transparent',
    color: active ? '#ffffff' : '#cccccc',
    fontSize: 20,
    cursor: 'pointer',
  }}>
    {children}
  </div>
);

export const VSCodeMockup: React.FC<VSCodeMockupProps> = ({
  width,
  height,
  showGoGitItPanel = false,
  activePanel = 'gogitit',
  panelProps = {},
  children,
}) => {
  const sidebarWidth = (showGoGitItPanel || activePanel === 'explorer') ? 240 : 0;
  const activityBarWidth = 48;
  const titleBarHeight = 32;
  const statusBarHeight = 22;
  const editorHeight = height - titleBarHeight - statusBarHeight;

  // Suppress unused variable warning
  void activityBarWidth;

  return (
    <div style={{
      width,
      height,
      backgroundColor: VSCODE_DARK.background,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'DM Sans, system-ui, sans-serif',
      overflow: 'hidden',
      borderRadius: 8,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      {/* Title bar */}
      <div style={{
        height: titleBarHeight,
        backgroundColor: VSCODE_DARK.titleBar,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
        </div>
        {/* Filename */}
        <div style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: '#cccccc',
        }}>
          Go Git It — VS Code
        </div>
      </div>

      {/* Main area */}
      <div style={{
        height: editorHeight,
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* Activity bar */}
        <div style={{
          width: 48,
          backgroundColor: VSCODE_DARK.activityBar,
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: `1px solid ${VSCODE_DARK.border}`,
        }}>
          <ActivityBarIcon active={activePanel === 'explorer'}>📁</ActivityBarIcon>
          <ActivityBarIcon>🔍</ActivityBarIcon>
          <ActivityBarIcon>⎇</ActivityBarIcon>
          <RocketActivityIcon active={activePanel === 'gogitit'} />
          <div style={{ flex: 1 }} />
          <ActivityBarIcon>⚙️</ActivityBarIcon>
        </div>

        {/* Sidebar */}
        {sidebarWidth > 0 && (
          <div style={{
            width: sidebarWidth,
            backgroundColor: VSCODE_DARK.sidebar,
            flexShrink: 0,
            borderRight: `1px solid ${VSCODE_DARK.border}`,
            overflow: 'hidden',
          }}>
            <GoGitItPanel {...panelProps} />
          </div>
        )}

        {/* Editor area */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          backgroundColor: VSCODE_DARK.background,
        }}>
          {children}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        height: statusBarHeight,
        backgroundColor: VSCODE_DARK.statusBar,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        flexShrink: 0,
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>⎇</span>
          <span>main</span>
        </span>
        <span style={{ fontSize: 11, color: '#ffffff' }}>TypeScript</span>
      </div>
    </div>
  );
};
