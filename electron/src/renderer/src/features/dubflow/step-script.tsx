import { useTranslation } from 'react-i18next';
import { LanguagesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { PipelineFailure } from '@/components/pipeline-failure';
import { LanguagePicker } from '@/features/clone/language-picker';
import { useTranslationEngines } from '@/features/settings/translation-settings';
import {
  cancelDub,
  dismissDubError,
  editDubSegment,
  setDubMultiTargets,
  setDubTarget,
  translateDub,
  type DubSession,
} from '@/features/dub/dub-session';
import { formatClock } from '@/components/waveform-player';
import { LANG_CODES } from '@shared/utils/languages';
import { dubLanguage, scriptReady, setKeepLanguage, targetCode, useDubflow } from './dubflow-state';

const targetOptions = LANG_CODES.map((item) => item.label);

export function StepScript({ session }: { session: DubSession }) {
  const { t } = useTranslation();
  const flow = useDubflow();
  const engines = useTranslationEngines();
  const provider = engines.data?.engines.find((item) => item.id === engines.data?.active);
  const translationReady = Boolean(provider?.ready ?? provider?.installed);
  const code = targetCode(session);
  const busy = !['idle', 'editing', 'done'].includes(session.phase) || Boolean(session.recovery);
  const translating = session.phase === 'translating';
  const ready = scriptReady(session, flow);
  const translatedCount = code
    ? session.segments.filter((segment) => Boolean(segment.translations?.[code]?.trim())).length
    : 0;
  const current = Number(session.event?.current);
  const total = Number(session.event?.total);
  const percent =
    Number.isFinite(current) && Number.isFinite(total) && total > 0 ? (current / total) * 100 : null;
  const failedCount = code
    ? session.segments.filter((segment) => segment.translate_errors?.[code] || segment.translate_error).length
    : 0;
  return (
    <section data-slot="dubflow-step-script" className="flex min-h-0 flex-col gap-4">
      <header>
        <h2 className="text-base font-semibold">{t('dubflow.script_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('dubflow.script_hint')}</p>
      </header>
      {session.error && (
        <PipelineFailure failure={session.failure} fallback={session.error} onDismiss={dismissDubError} />
      )}
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/30 p-4 @md:grid-cols-[1fr_auto] @md:items-end">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">{t('dub.target_language')}</span>
          <LanguagePicker
            value={session.target}
            options={targetOptions}
            disabled={busy || flow.keepLanguage}
            recentsScope="dubflow"
            onValueChange={(language) => {
              const selected = LANG_CODES.find((item) => item.label === language)?.code;
              setDubTarget(language, selected);
              setDubMultiTargets([]);
            }}
          />
        </div>
        <Button
          disabled={busy || flow.keepLanguage || !code || !translationReady}
          onClick={() => code && provider && void translateDub(code, provider.id, { retryFailed: failedCount > 0 && translatedCount > 0 })}
        >
          <LanguagesIcon />
          {failedCount > 0 && translatedCount > 0
            ? t('dub.retry_failed', { count: failedCount })
            : translatedCount > 0
              ? t('dubflow.retranslate')
              : t('dub.translate')}
        </Button>
        <label className="flex items-center gap-2 text-sm @md:col-span-2">
          <Switch
            checked={flow.keepLanguage}
            disabled={busy}
            onCheckedChange={(checked) => setKeepLanguage(checked)}
          />
          <span>{t('dubflow.keep_language')}</span>
        </label>
        {provider && !translationReady && !flow.keepLanguage && (
          <PipelineFailure
            className="text-xs @md:col-span-2"
            fallback={provider.availability_reason || t('modelSettings.unavailable')}
          />
        )}
        {translating && (
          <div className="space-y-2 @md:col-span-2">
            <Progress value={percent} aria-label={t('dub.translating')}>
              <ProgressTrack>
                <ProgressIndicator />
              </ProgressTrack>
            </Progress>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('dub.translating')}</span>
              <Button size="xs" variant="ghost" onClick={() => void cancelDub()}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {flow.keepLanguage
          ? dubLanguage(session, flow)
            ? t('dubflow.script_same_language', { language: dubLanguage(session, flow)?.language })
            : t('dubflow.script_language_unknown')
          : ready
            ? t('dubflow.script_ready', { count: session.segments.length })
            : t('dubflow.script_pending', { done: translatedCount, total: session.segments.length })}
      </p>
      <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label={t('dubflow.lines')}>
        {session.segments.map((segment, index) => {
          const original = segment.text_original || segment.text;
          const showOriginal = !flow.keepLanguage && original !== segment.text;
          const error = code ? segment.translate_errors?.[code] || segment.translate_error : undefined;
          return (
            <li
              key={segment.id}
              className="grid gap-2 rounded-xl border border-border/50 bg-card/20 p-3 @md:grid-cols-[4.5rem_1fr]"
            >
              <div className="text-xs text-muted-foreground">
                <div className="font-medium tabular-nums text-foreground/80">{index + 1}</div>
                <div className="tabular-nums">{formatClock(segment.start)}</div>
                <div className="tabular-nums">{formatClock(segment.end)}</div>
              </div>
              <div className="min-w-0 space-y-1.5">
                {showOriginal && (
                  <p className="text-xs text-muted-foreground">{original}</p>
                )}
                <Textarea
                  value={segment.text}
                  rows={2}
                  disabled={busy}
                  aria-label={t('dubflow.line_n', { n: index + 1 })}
                  onChange={(event) => editDubSegment(segment.id, { text: event.target.value })}
                  className="min-h-0 resize-y text-sm"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
