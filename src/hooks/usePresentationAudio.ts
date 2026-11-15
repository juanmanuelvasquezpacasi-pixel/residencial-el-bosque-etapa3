import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESENTATION_AUDIO_URL } from '../data/lotes';

export function usePresentationAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = new Audio(PRESENTATION_AUDIO_URL);
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = 0.8;
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      setHasEnded(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setHasEnded(true);
    };
    const handleError = () => {
      setIsPlaying(false);
      setHasError(true);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(async (fromStart = false) => {
    const audio = audioRef.current;
    if (!audio) return false;
    try {
      audio.volume = 0.8;
      if (fromStart) {
        audio.currentTime = 0;
      }
      await audio.play();
      setIsPlaying(true);
      setHasEnded(false);
      setHasError(false);
      return true;
    } catch {
      return false;
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      pause();
    } else {
      await play(hasEnded);
    }
  }, [isPlaying, hasEnded, pause, play]);

  const restart = useCallback(async () => {
    await play(true);
  }, [play]);

  return {
    isPlaying,
    hasEnded,
    hasError,
    play,
    pause,
    toggle,
    restart,
  };
}
