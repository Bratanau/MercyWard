import React from 'react';
import { ItemId } from '../game/types';

export const WardCrestSvg: React.FC<{ className?: string }> = ({ className = 'w-14 h-14' }) => (
  <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
    <path
      d="M32 4L56 14V32C56 46.5 45.6 56.8 32 60C18.4 56.8 8 46.5 8 32V14L32 4Z"
      fill="#111b15"
      stroke="#5d7e67"
      strokeWidth="2.5"
    />
    <path
      d="M32 10L50 18V32C50 43.2 42.1 51.3 32 54C21.9 51.3 14 43.2 14 32V18L32 10Z"
      fill="#18271e"
      stroke="#364c3d"
      strokeWidth="1.5"
    />
    <path
      d="M27 20H37V28H45V38H37V46H27V38H19V28H27V20Z"
      fill="#7ec98d"
      stroke="#0c140f"
      strokeWidth="2"
    />
    <path d="M29 22H35V30H43V32H29V22Z" fill="#b4ebc0" opacity="0.45" />
  </svg>
);

export const ItemSvgIcon: React.FC<{ id: ItemId; className?: string }> = ({
  id,
  className = 'w-6 h-6',
}) => {
  if (id === 'ward_key') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="8" cy="12" r="4.5" fill="#d4a64a" stroke="#181409" strokeWidth="1.6" />
        <circle cx="8" cy="12" r="1.7" fill="#181409" />
        <path
          d="M12.2 11H21V13.5H19V16H16.5V13.5H12.2V11Z"
          fill="#d4a64a"
          stroke="#181409"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === 'bolt_cutters') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M5 19L10.5 11.5M19 19L13.5 11.5"
          stroke="#c45b4b"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M9.5 11L8.5 5.5L12 7L15.5 5.5L14.5 11H9.5Z"
          fill="#adb8b3"
          stroke="#141816"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="11.5" r="1.8" fill="#6f7a75" stroke="#141816" strokeWidth="1.2" />
      </svg>
    );
  }
  if (id === 'power_fuse') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="4" y="8" width="4" height="8" rx="1" fill="#c79e4a" stroke="#121814" strokeWidth="1.4" />
        <rect x="16" y="8" width="4" height="8" rx="1" fill="#c79e4a" stroke="#121814" strokeWidth="1.4" />
        <rect x="8" y="8.5" width="8" height="7" fill="#5ec9a8" stroke="#121814" strokeWidth="1.4" />
        <path d="M9.5 12H11L12.5 10L13.5 14L14.5 12" stroke="#eafff6" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" stroke="#c96f4b" strokeWidth="2.8" />
      <circle cx="12" cy="12" r="2.2" fill="#e08965" stroke="#18100c" strokeWidth="1.2" />
      <path d="M12 4.5V19.5M4.5 12H19.5" stroke="#c96f4b" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
};

export const VitalityPipSvg: React.FC<{ active: boolean; className?: string }> = ({
  active,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 21C12 21 4 15.2 4 9.2C4 6.2 6.3 4 9 4C10.6 4 11.5 4.8 12 5.7C12.5 4.8 13.4 4 15 4C17.7 4 20 6.2 20 9.2C20 15.2 12 21 12 21Z"
      fill={active ? '#7fd692' : '#18221b'}
      stroke={active ? '#0d1510' : '#4a5c50'}
      strokeWidth="1.8"
    />
    {!active && (
      <path d="M9 8L13 12L10.5 15.5L14 18" stroke="#6d4343" strokeWidth="1.7" strokeLinecap="round" />
    )}
  </svg>
);

export const SoundIconSvg: React.FC<{ muted: boolean; className?: string }> = ({
  muted,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M4 9.5H8.2L13.5 5V19L8.2 14.5H4V9.5Z"
      fill="#c9d6cc"
      stroke="#0c120e"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {muted ? (
      <path d="M16.5 9.5L21 14M21 9.5L16.5 14" stroke="#d97166" strokeWidth="2" strokeLinecap="round" />
    ) : (
      <path
        d="M16.5 8.8C17.6 9.8 18.2 10.9 18.2 12C18.2 13.1 17.6 14.2 16.5 15.2M19 6.5C20.8 8.1 21.6 10 21.6 12C21.6 14 20.8 15.9 19 17.5"
        stroke="#8ce68c"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const PauseIconSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="6.5" y="5" width="4" height="14" rx="1" fill="#c9d6cc" />
    <rect x="13.5" y="5" width="4" height="14" rx="1" fill="#c9d6cc" />
  </svg>
);

export const RestartIconSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M5.5 11.5C5.8 7.8 8.8 5 12.5 5C16.4 5 19.5 8.1 19.5 12C19.5 15.9 16.4 19 12.5 19C10 19 7.8 17.7 6.5 15.7"
      stroke="#c9d6cc"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M4 7.5L5.5 12L9.8 10.5" stroke="#c9d6cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SpectralGlassesSvg: React.FC<{ active?: boolean; className?: string }> = ({
  active = false,
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M2.5 11.5C2.5 9.8 3.8 8.5 5.5 8.5H9C10.2 8.5 11.2 9.4 11.5 10.5H12.5C12.8 9.4 13.8 8.5 15 8.5H18.5C20.2 8.5 21.5 9.8 21.5 11.5V13C21.5 14.9 19.9 16.5 18 16.5H15.2C13.7 16.5 12.6 15.5 12.2 14.1H11.8C11.4 15.5 10.3 16.5 8.8 16.5H6C4.1 16.5 2.5 14.9 2.5 13V11.5Z"
      fill={active ? 'rgba(56, 242, 255, 0.28)' : 'rgba(18, 28, 24, 0.7)'}
      stroke={active ? '#5bf4ff' : '#9fc9b0'}
      strokeWidth="1.7"
    />
    <circle cx="7.2" cy="12.5" r="1.4" fill={active ? '#7efaff' : '#80a88f'} />
    <circle cx="16.8" cy="12.5" r="1.4" fill={active ? '#7efaff' : '#80a88f'} />
  </svg>
);
