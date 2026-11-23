import { useTranslation } from 'react-i18next';
import { SparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { PipelineFailure } from '@/components/pipeline-failure';
import { EngineNotice } from '@/components/engine-notice';
import { useTtsReadiness } from '@/hooks/use-tts-readiness';
import {
  cancelDub,
  dismissDubError,
  generateDub,
  setDubQuality,
  type DubSession,
} from '@/features/dub/dub-session';
import { cn } from '@/lib/utils';
import { dubLanguage, useDubflow } from './dubflow-state';

const QUALITIES = [
  { id: 'fast', label: 'dub.fast_quality', hint: 'dubflow.quality_fast_hint' },
  { id: 'autofit', label: 'dub.autofit_quality', hint: 'dubflow.quality_autofit_hint' },
  { id: 'cinematic', label: 'dub.cinematic_quality', hint: 'dubflow.quality_cinematic_hint' },
] as const;

export function StepGenerate({ session }: { session: DubSession }) {
  const { t } = useTranslation();
  const flow = useDubflow();
  const ttsBlocker = useTtsReadiness('dub');
  const dub = dubLanguage(session, flow);
  const busy = !['idle', 'editing', 'done'].includes(session.phase) || Boolean(session.recovery);
  const generating = session.phase === 'generating';
  const done = Boolean(dub && session.phase === 'done' && session.tracks.includes(dub.code));
  const current = Number(session.event?.current);
  const total = Number(session.event?.total);
  const percent =
    typeof session.event?.percent === 'number'
      ? session.event.percent
      : Number.isFinite(current) && Number.isFinite(total) && total > 0
        ? (current / total) * 100
        : null;
  const lines = session.segments.filter((segment) => segment.text.trim()).length;
  const quality = session.quality === 'agent' ? 'cinematic' : session.quality;
  return (
    <section data-slot="dubflow-step-generate" className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">{t('dubflow.generate_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('dubflow.generate_hint')}</p>
      </header>
      {session.error && (
        <PipelineFailure failure={session.failure} fallback={session.error} onDismiss={dismissDubError} />
      )}
      <EngineNotice operation="dub" />
      <fieldset className="grid gap-2 @md:grid-cols-3" disabled={busy}>
        <legend className="mb-2 text-xs font-medium text-muted-foreground">{t('dub.quality_label')}</legend>
        {QUALITIES.map((option) => {
          const selected = quality === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setDubQuality(option.id)}
              className={cn(
                'rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60',
                selected ? 'border-primary/70 bg-primary/5' : 'border-border/60 bg-card/30 hover:bg-accent/40',
              )}
            >
              <span className="block text-sm font-medium">{t(option.label)}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{t(option.hint)}</span>
            </button>
          );
        })}
      </fieldset>
      <div className="rounded-2xl border border-border/60 bg-card/30 p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm @md:grid-cols-3">
          <dt className="text-muted-foreground">{t('dubflow.lines')}</dt>
          <dd className="tabular-nums @md:col-span-2">{lines}</dd>
          <dt className="text-muted-foreground">{t('dub.target_language')}</dt>
          <dd className="@md:col-span-2">{dub?.language || '—'}</dd>
          <dt className="text-muted-foreground">{t('clone.voice_kicker')}</dt>
          <dd className="@md:col-span-2">
            {flow.voiceSource === 'video' ? t('dubflow.voice_video') : flow.profileId || '—'}
          </dd>
        </dl>
        {generating ? (
          <div className="mt-4 space-y-2">
            <Progress value={percent} aria-label={t('dub_workflow.generating_dub')}>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t('dub_workflow.generating_dub')}
                {Number.isFinite(current) && Number.isFinite(total) && total > 0
                  ? ` · ${current}/${total}`
                  : ''}
              </span>
              <Button size="xs" variant="ghost" onClick={() => void cancelDub()}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {done ? t('dubflow.generate_done') : t('dubflow.generate_note')}
            </p>
            <Button
              size="lg"
              disabled={busy || !dub || ttsBlocker !== null || lines === 0}
              onClick={() => dub && void generateDub(dub.language, dub.code)}
            >
              <SparklesIcon />
              {done ? t('dubflow.regenerate') : t('dub.generate_dub')}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
