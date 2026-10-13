import React from 'react';

// Wobbly pencil-line filter, defined once and used by CSS (filter: url(#pencil)) and the mascot.
export function PencilDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" />
        </filter>
        <filter id="pencil-soft" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2" />
        </filter>
      </defs>
    </svg>
  );
}

export const Back = () => (
  <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><path d="M21 13 H6 M12 6 L5 13 L12 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const SpeakerIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
    <path d="M4 10 H8 L14 5 V21 L8 16 H4Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M17.5 9 Q20.5 13 17.5 17 M20.5 6.5 Q25 13 20.5 19.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
export const BackspaceIcon = () => (
  <svg width="28" height="22" viewBox="0 0 28 22" aria-hidden="true"><path d="M9 2 H25 V20 H9 L2 11Z M13 7 L20 15 M20 7 L13 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
export const SkipIcon = () => (
  <svg width="26" height="22" viewBox="0 0 26 22" aria-hidden="true"><path d="M3 4 L13 11 L3 18Z M14 4 L24 11 L14 18Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
);
export const Squiggle = ({ color = 'currentColor', width = 180 }) => (
  <svg width={width} height="14" viewBox="0 0 180 14" aria-hidden="true" preserveAspectRatio="none"><path d="M2 8 Q12 1 22 8 T42 8 T62 8 T82 8 T102 8 T122 8 T142 8 T162 8 T178 7" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" /></svg>
);
export const MicIcon = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
    <rect x="9" y="3" width="8" height="13" rx="4" fill="currentColor" />
    <path d="M6 12 Q6 19 13 19 Q20 19 20 12 M13 19 V23 M9 23 H17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
export const PlayIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"><path d="M7 4 L22 13 L7 22Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
);
export const CheckIcon = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true"><path d="M4 14 L10 20 L22 6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
