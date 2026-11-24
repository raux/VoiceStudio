import { Store, useStore } from '@tanstack/react-store';
import { autoProfileId, castSpeakers } from '@shared/utils/segments';
import { LANG_CODES } from '@shared/utils/languages';
import {
  dubSession,
  editDubSegments,
  setDubProduction,
  type DubSession,
} from '@/features/dub/dub-session';

export type VoiceSource = 'video' | 'upload' | 'saved';
export type DubflowStep = 1 | 2 | 3 | 4 | 5;

interface DubflowState {
  /** Which step the user is looking at. Clamped to what the session allows. */
  step: DubflowStep;
  voiceSource: VoiceSource | null;
  /** Profile applied to every line; `auto:*` when cloned from the footage. */
  profileId: string | null;
  /** Explicit "dub in the spoken language" choice — skips translation. */
  keepLanguage: boolean;
  /** Job the voice/script choices belong to; a new upload resets them. */
  jobId: string | null;
}

const KEY = 'voicestudio.dubflow';
const initial: DubflowState = {
  step: 1,
  voiceSource: null,
  profileId: null,
  keepLanguage: false,
  jobId: null,
};

function read(): DubflowState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as Partial<DubflowState>;
    return { ...initial, ...parsed, step: clampStep(parsed.step) };
  } catch {
    return initial;
  }
}
function clampStep(value: unknown): DubflowStep {
  const n = Number(value);
  return n >= 1 && n <= 5 ? (Math.round(n) as DubflowStep) : 1;
}

export const dubflow = new Store<DubflowState>(read());
dubflow.subscribe(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(dubflow.state));
  } catch {
    // Storage may be unavailable; the flow still works for the session.
  }
});
const patch = (value: Partial<DubflowState>) =>
  dubflow.setState((current) => ({ ...current, ...value }));

export const useDubflow = () => useStore(dubflow);

/** Highest step the session can show right now. */
export function reachableStep(session: DubSession, flow: DubflowState): DubflowStep {
  const ready = Boolean(session.jobId) && session.segments.length > 0;
  // In-flight phases pin the flow to the step that started them, so a
  // translation or render in progress never bounces the user backwards.
  if (!ready || ['preparing', 'transcribing', 'importing'].includes(session.phase)) return 1;
  if (!flow.profileId || flow.jobId !== session.jobId) return 2;
  if (['translating', 'cleaning'].includes(session.phase)) return 3;
  if (!scriptReady(session, flow)) return 3;
  const dub = dubLanguage(session, flow);
  if (session.phase !== 'done' || !dub || !session.tracks.includes(dub.code)) return 4;
  return 5;
}

export function targetCode(session: DubSession): string | undefined {
  return LANG_CODES.find((item) => item.label === session.target)?.code;
}

/**
 * The language the dub is rendered in: the chosen target, or — when keeping
 * the spoken language — whatever the transcription detected.
 */
export function dubLanguage(
  session: DubSession,
  flow: Pick<DubflowState, 'keepLanguage'>,
): { language: string; code: string } | null {
  if (flow.keepLanguage) {
    const spoken = (session.sourceLang || session.sourceLanguage || '').toLowerCase();
    const entry = LANG_CODES.find(
      (item) => item.code.toLowerCase() === spoken || item.label.toLowerCase() === spoken,
    );
    return entry ? { language: entry.label, code: entry.code } : null;
  }
  const code = targetCode(session);
  return code ? { language: session.target, code } : null;
}

/** The script is ready once every spoken line has words in the dub language. */
export function scriptReady(session: DubSession, flow: DubflowState): boolean {
  if (flow.keepLanguage) return dubLanguage(session, flow) !== null;
  const code = targetCode(session);
  if (!code) return false;
  return session.segments.every(
    (segment) => !segment.text.trim() || Boolean(segment.translations?.[code]?.trim()),
  );
}

export function goToStep(step: DubflowStep) {
  const limit = reachableStep(dubSession.state, dubflow.state);
  patch({ step: step > limit ? limit : step });
}

/** Keep the visible step inside what the session allows (e.g. after a reset). */
export function syncStep() {
  const limit = reachableStep(dubSession.state, dubflow.state);
  if (dubflow.state.step > limit) patch({ step: limit });
}

export function setKeepLanguage(keepLanguage: boolean) {
  patch({ keepLanguage });
}

/**
 * Single-speaker dubbing: one profile on every line. `auto:<speaker>` makes the
 * backend clone the footage's own voice; any other id is a saved reference.
 */
export function applyVoice(source: VoiceSource, profileId?: string) {
  const session = dubSession.state;
  if (!session.jobId || !session.segments.length) return;
  const speakers = castSpeakers(session.segments) as string[];
  const id =
    source === 'video' ? autoProfileId(speakers[0] || session.segments[0]?.speaker_id || 'speaker') : profileId;
  if (!id) return;
  setDubProduction({ voiceMatch: 'consistent', numSpeakers: 1 });
  editDubSegments(new Set(session.segments.map((segment) => segment.id)), { profile_id: id });
  patch({ voiceSource: source, profileId: id, jobId: session.jobId });
}

export function resetDubflow() {
  dubflow.setState(() => initial);
}
