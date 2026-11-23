import { useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FilmIcon, LinkIcon, UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { PipelineFailure } from '@/components/pipeline-failure';
import {
  cancelDub,
  dismissDubError,
  ingestDubUrl,
  isDubUrl,
  resumeDub,
  uploadDub,
  type DubSession,
} from '@/features/dub/dub-session';
import { cn } from '@/lib/utils';
import { resetDubflow } from './dubflow-state';

function stageKey(session: DubSession) {
  if (session.phase === 'preparing') {
    const type = typeof session.event?.type === 'string' ? session.event.type : '';
    if (type.startsWith('download')) return 'dub.prep_download';
    if (type.startsWith('extract')) return 'dub.prep_extract';
    if (type.startsWith('demucs')) return 'dub.prep_demucs';
    return 'dub.prep_preparing';
  }
  if (session.phase === 'transcribing') return 'dub_workflow.transcribing_audio';
  return 'common.loading';
}

export function StepVideo({ session }: { session: DubSession }) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState('');
  const busy = !['idle', 'editing', 'done'].includes(session.phase);
  const locked = busy || Boolean(session.recovery);
  const current = Number(session.event?.current);
  const total = Number(session.event?.total);
  const percent =
    typeof session.event?.percent === 'number'
      ? session.event.percent
      : Number.isFinite(current) && Number.isFinite(total) && total > 0
        ? (current / total) * 100
        : null;
  const start = (file: File) => {
    resetDubflow();
    void uploadDub(file);
  };
  return (
    <section data-slot="dubflow-step-video" className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">{t('dubflow.video_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('dubflow.video_hint')}</p>
      </header>
      {session.failure || session.error ? (
        <PipelineFailure
          failure={session.failure}
          fallback={session.error || ''}
          onDismiss={dismissDubError}
        />
      ) : null}
      {session.recovery ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
          <span className="flex-1">{t('dubflow.recovery')}</span>
          <Button size="sm" onClick={() => void resumeDub()}>
            {t(session.recovery === 'transcribing' ? 'common.retry' : 'common.resume')}
          </Button>
        </div>
      ) : busy ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{session.filename || t(stageKey(session))}</span>
            <span className="shrink-0 text-muted-foreground">{t(stageKey(session))}</span>
          </div>
          <Progress value={percent} aria-label={t(stageKey(session))}>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => void cancelDub()}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            data-dragging={dragging || undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center transition-colors',
              dragging && 'border-primary/60 bg-primary/5',
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!locked) setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                setDragging(false);
            }}
            onDrop={(event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file && !locked) start(file);
            }}
          >
            <FilmIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm">{t('dub.drop_here')}</p>
            <p className="text-xs text-muted-foreground">{t('dub.supported_formats')}</p>
            <input
              ref={input}
              type="file"
              accept="audio/*,video/*,.mkv,.mov,.mp4,.wav,.mp3"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) start(file);
              }}
            />
            <Button disabled={locked} onClick={() => input.current?.click()}>
              <UploadIcon />
              {t('settings.audio_tools_choose_file')}
            </Button>
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (locked || !isDubUrl(url)) return;
              resetDubflow();
              void ingestDubUrl(url);
              setUrl('');
            }}
          >
            <LinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              aria-label={t('dub.paste_url')}
              placeholder={t('dub.paste_url')}
              disabled={locked}
              className="flex-1"
            />
            <Button type="submit" variant="secondary" disabled={locked || !isDubUrl(url)}>
              {t('dub.ingest')}
            </Button>
          </form>
          {session.jobId && session.segments.length > 0 && (
            <p className="text-xs text-muted-foreground">{t('dubflow.replace_hint')}</p>
          )}
        </>
      )}
    </section>
  );
}
