import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VideoPlayer } from '@/components/video-player';
import { WaveformPlayer } from '@/components/waveform-player';
import { videoSource as nativeVideoSource } from '@/components/media-player';
import { Button } from '@/components/ui/button';
import { apiPath } from '@/lib/api/client';
import { formatClock } from '@/components/waveform-player';
import type { DubSession } from '@/features/dub/dub-session';
import { dubLanguage, useDubflow } from './dubflow-state';
import { cn } from '@/lib/utils';

/**
 * The footage stays on screen for every step so each decision is made against
 * it. Once a dubbed track exists the pane can switch between original and dub.
 */
export function MediaPane({ session, className }: { session: DubSession; className?: string }) {
  const { t } = useTranslation();
  const flow = useDubflow();
  const job = encodeURIComponent(session.jobId || '');
  const dub = dubLanguage(session, flow);
  const code = dub?.code;
  const dubbed = Boolean(session.phase === 'done' && code && session.tracks.includes(code));
  const [track, setTrack] = useState<'original' | 'dub'>('original');
  const active = dubbed && track === 'dub' ? 'dub' : 'original';
  // The upload is still being prepared/transcribed while `jobId` is set, so
  // the media URL 404s until then; mounting the player early would cache that
  // failure. Wait for the segments (or a finished render) before loading.
  const mediaReady =
    Boolean(session.jobId) &&
    (session.segments.length > 0 || ['editing', 'done'].includes(session.phase));
  const source = useMemo(() => {
    if (!mediaReady) return null;
    if (session.inputType === 'audio')
      return apiPath(
        active === 'original'
          ? `/dub/audio/${job}`
          : `/dub/download-audio/${job}?lang=${encodeURIComponent(code || '')}`,
      );
    return apiPath(
      active === 'original'
        ? `/dub/media/${job}`
        : `/dub/preview-video/${job}?mix=surgical2&lang=${encodeURIComponent(code || '')}`,
    );
  }, [active, code, job, mediaReady, session.inputType]);
  const videoSrc = useMemo(
    () =>
      source && active === 'original'
        ? nativeVideoSource(source, session.filename, 'video/mp4')
        : source
          ? { src: source, type: 'video/mp4' as const }
          : null,
    [active, session.filename, source],
  );
  const lines = session.segments.length;
  return (
    <aside
      data-slot="dubflow-media"
      className={cn('flex min-h-0 flex-col gap-3 rounded-2xl border border-border/60 bg-card/30 p-3', className)}
    >
      {!source ? (
        <div className="grid aspect-video place-items-center rounded-xl bg-muted/40 text-xs text-muted-foreground">
          {t('dubflow.no_media')}
        </div>
      ) : session.inputType === 'audio' ? (
        <WaveformPlayer key={source} src={source} source="dubflow-media" height={72} />
      ) : (
        videoSrc && (
          <VideoPlayer
            key={active}
            src={videoSrc}
            source="dubflow-media"
            load="visible"
            poster={apiPath(`/dub/thumb/${job}`)}
          />
        )
      )}
      {dubbed && (
        <div className="flex gap-1 rounded-lg bg-background/40 p-1" role="group" aria-label={t('dub.preview_language')}>
          <Button
            size="xs"
            variant={active === 'original' ? 'secondary' : 'ghost'}
            className="flex-1"
            onClick={() => setTrack('original')}
          >
            {t('dub.original_audio')}
          </Button>
          <Button
            size="xs"
            variant={active === 'dub' ? 'secondary' : 'ghost'}
            className="flex-1"
            onClick={() => setTrack('dub')}
          >
            {dub?.language}
          </Button>
        </div>
      )}
      {session.filename && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <dt className="sr-only">{t('dubflow.file')}</dt>
          <dd className="col-span-2 truncate font-medium text-foreground">{session.filename}</dd>
          {Boolean(session.duration) && (
            <>
              <dt>{t('dubflow.duration')}</dt>
              <dd>{formatClock(session.duration || 0)}</dd>
            </>
          )}
          {session.sourceLang && (
            <>
              <dt>{t('dub.source_language')}</dt>
              <dd>{session.sourceLang}</dd>
            </>
          )}
          {lines > 0 && (
            <>
              <dt>{t('dubflow.lines')}</dt>
              <dd>{lines}</dd>
            </>
          )}
        </dl>
      )}
    </aside>
  );
}
