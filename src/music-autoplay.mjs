import React from 'react';

export const useMusicAutoplay = ({
  delayMs,
  tracksLength,
  pendingAutoplayRef,
  attemptAutoplay,
}) => {
  const tracksLenRef = React.useRef(0);
  const autoplayReadyRef = React.useRef(false);
  const autoplayAttemptedRef = React.useRef(false);

  React.useEffect(() => {
    tracksLenRef.current = tracksLength;
  }, [tracksLength]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      autoplayReadyRef.current = true;
      if (autoplayAttemptedRef.current) return;
      if (tracksLenRef.current <= 0) return;
      autoplayAttemptedRef.current = true;
      attemptAutoplay(false);
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [attemptAutoplay, delayMs]);

  React.useEffect(() => {
    if (!autoplayReadyRef.current) return;
    if (autoplayAttemptedRef.current) return;
    if (!tracksLength) return;
    autoplayAttemptedRef.current = true;
    attemptAutoplay(false);
  }, [attemptAutoplay, tracksLength]);

  React.useEffect(() => {
    if (!pendingAutoplayRef?.current) return;
    const handler = () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
      attemptAutoplay(true);
    };
    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [attemptAutoplay, pendingAutoplayRef, tracksLength]);
};

