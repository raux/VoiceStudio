import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({ apiJson: vi.fn(), apiFetch: vi.fn(), apiPath: (p: string) => p }));
vi.mock('@/lib/api/event-stream', () => ({ consumeTaskStream: vi.fn() }));

import { dubSession, type DubSegment, type DubSession } from '@/features/dub/dub-session';
import {
  applyVoice,
  dubLanguage,
  dubflow,
  goToStep,
  reachableStep,
  resetDubflow,
  scriptReady,
  setKeepLanguage,
} from './dubflow-state';

const segment = (id: string, extra: Partial<DubSegment> = {}): DubSegment => ({
  id,
  start: 0,
  end: 1,
  text: `line ${id}`,
  text_original: `line ${id}`,
  speaker_id: 'SPEAKER_00',
  ...extra,
});

const session = (extra: Partial<DubSession>): DubSession => ({
  ...dubSession.state,
  jobId: 'job-1',
  phase: 'editing',
  segments: [segment('a'), segment('b')],
  sourceLang: 'en',
  target: 'Spanish',
  tracks: [],
  recovery: null,
  ...extra,
});

beforeEach(() => {
  resetDubflow();
  dubSession.setState(() => session({}));
});

it('unlocks steps one at a time as the session progresses', () => {
  expect(reachableStep(session({ jobId: null, segments: [] }), dubflow.state)).toBe(1);
  expect(reachableStep(session({ phase: 'transcribing' }), dubflow.state)).toBe(1);
  // Transcribed, but no voice chosen yet.
  expect(reachableStep(session({}), dubflow.state)).toBe(2);
  applyVoice('video');
  expect(reachableStep(dubSession.state, dubflow.state)).toBe(3);
  // Translated into Spanish → generate unlocks.
  dubSession.setState((current) => ({
    ...current,
    segments: current.segments.map((item) => ({ ...item, translations: { es: 'hola' } })),
  }));
  expect(reachableStep(dubSession.state, dubflow.state)).toBe(4);
  dubSession.setState((current) => ({ ...current, phase: 'done', tracks: ['es'] }));
  expect(reachableStep(dubSession.state, dubflow.state)).toBe(5);
});

it('clones the footage speaker as one consistent voice on every line', () => {
  applyVoice('video');
  const { segments, voiceMatch, numSpeakers } = dubSession.state;
  expect(segments.map((item) => item.profile_id)).toEqual(['auto:speaker00', 'auto:speaker00']);
  expect(voiceMatch).toBe('consistent');
  expect(numSpeakers).toBe(1);
  expect(dubflow.state).toMatchObject({ voiceSource: 'video', profileId: 'auto:speaker00', jobId: 'job-1' });
});

it('applies a saved or uploaded profile to every line and forgets it for a new job', () => {
  applyVoice('saved', 'profile-7');
  expect(dubSession.state.segments.every((item) => item.profile_id === 'profile-7')).toBe(true);
  expect(reachableStep(dubSession.state, dubflow.state)).toBe(3);
  dubSession.setState((current) => ({ ...current, jobId: 'job-2' }));
  expect(reachableStep(dubSession.state, dubflow.state)).toBe(2);
});

it('keeps the spoken language when asked and resolves it from the transcription', () => {
  applyVoice('video');
  expect(scriptReady(dubSession.state, dubflow.state)).toBe(false);
  setKeepLanguage(true);
  expect(scriptReady(dubSession.state, dubflow.state)).toBe(true);
  expect(dubLanguage(dubSession.state, dubflow.state)).toEqual({ language: 'English', code: 'en' });
  dubSession.setState((current) => ({ ...current, sourceLang: '' }));
  expect(dubLanguage(dubSession.state, dubflow.state)).toBeNull();
  expect(scriptReady(dubSession.state, dubflow.state)).toBe(false);
});

it('never lets the visible step run ahead of what is reachable', () => {
  goToStep(5);
  expect(dubflow.state.step).toBe(2);
  applyVoice('video');
  goToStep(3);
  expect(dubflow.state.step).toBe(3);
  goToStep(1);
  expect(dubflow.state.step).toBe(1);
});
