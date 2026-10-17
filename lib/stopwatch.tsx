import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Phase = 'idle' | 'study' | 'break';

export type FinishedSession = {
  studyMs: number;
  breakMs: number;
  topicId: number | null;
};

type StopwatchContextValue = {
  phase: Phase;
  studyElapsed: number;
  breakElapsed: number;
  lastBreakMs: number;
  topicId: number | null;
  setTopicId: (id: number | null) => void;
  start: () => void;
  mola: () => void;
  finish: () => FinishedSession;
};

const StopwatchContext = createContext<StopwatchContextValue | null>(null);

export function StopwatchProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [studyBase, setStudyBase] = useState(0);
  const [breakBase, setBreakBase] = useState(0);
  const [segmentStartedAt, setSegmentStartedAt] = useState<number | null>(null);
  const [lastBreakMs, setLastBreakMs] = useState(0);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase === 'idle') return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [phase]);

  const studyElapsed = studyBase + (phase === 'study' && segmentStartedAt != null ? now - segmentStartedAt : 0);
  const breakElapsed = breakBase + (phase === 'break' && segmentStartedAt != null ? now - segmentStartedAt : 0);

  const value = useMemo<StopwatchContextValue>(
    () => ({
      phase,
      studyElapsed,
      breakElapsed,
      lastBreakMs,
      topicId,
      setTopicId,
      start: () => {
        const at = Date.now();
        if (phase === 'study') return;
        if (phase === 'break' && segmentStartedAt != null) {
          const gap = at - segmentStartedAt;
          setBreakBase((base) => base + gap);
          setLastBreakMs(gap);
        }
        setSegmentStartedAt(at);
        setPhase('study');
      },
      mola: () => {
        const at = Date.now();
        if (phase !== 'study' || segmentStartedAt == null) return;
        setStudyBase((base) => base + (at - segmentStartedAt));
        setSegmentStartedAt(at);
        setLastBreakMs(0);
        setPhase('break');
      },
      finish: () => {
        const at = Date.now();
        let study = studyBase;
        let paused = breakBase;
        if (phase === 'study' && segmentStartedAt != null) study += at - segmentStartedAt;
        if (phase === 'break' && segmentStartedAt != null) paused += at - segmentStartedAt;
        const snapshot = { studyMs: study, breakMs: paused, topicId };
        setPhase('idle');
        setStudyBase(0);
        setBreakBase(0);
        setSegmentStartedAt(null);
        setLastBreakMs(0);
        setTopicId(null);
        return snapshot;
      },
    }),
    [breakBase, breakElapsed, lastBreakMs, phase, segmentStartedAt, studyBase, studyElapsed, topicId],
  );

  return <StopwatchContext.Provider value={value}>{children}</StopwatchContext.Provider>;
}

export function useStopwatch() {
  const value = useContext(StopwatchContext);
  if (!value) throw new Error('Stopwatch is not ready.');
  return value;
}
