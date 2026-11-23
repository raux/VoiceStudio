import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, FilmIcon, UploadIcon, UsersRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileAvatar } from '@/components/profile-avatar';
import { WaveformPlayer } from '@/components/waveform-player';
import { useCreateCloneProfile, useProfiles } from '@/hooks/use-profiles';
import { ReferenceSourcePicker, ReferenceUsageNote } from '@/features/clone/reference-input';
import { apiPath } from '@/lib/api/client';
import { createObjectUrl, revokeObjectUrl } from '@/lib/audio/object-url';
import type { DubSession } from '@/features/dub/dub-session';
import { cn } from '@/lib/utils';
import { applyVoice, useDubflow, type VoiceSource } from './dubflow-state';

function SourceCard({
  icon: Icon,
  title,
  hint,
  selected,
  onSelect,
  children,
}: {
  icon: typeof FilmIcon;
  title: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-selected={selected || undefined}
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        selected ? 'border-primary/70 bg-primary/5' : 'border-border/60 bg-card/30',
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex w-full items-start gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset',
            selected ? 'bg-primary/15 text-primary ring-primary/30' : 'bg-muted text-muted-foreground ring-border/60',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
        </span>
        {selected && <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />}
      </button>
      {selected && children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function StepVoice({ session }: { session: DubSession }) {
  const { t } = useTranslation();
  const flow = useDubflow();
  const { data: profiles = [] } = useProfiles();
  const create = useCreateCloneProfile();
  const saved = profiles.filter((profile) => profile.kind === 'clone');
  const active = flow.jobId === session.jobId ? flow.voiceSource : null;
  const [choice, setChoice] = useState<VoiceSource>(active ?? 'video');
  const [reference, setReference] = useState<{ file: File; durationSeconds: number | null } | null>(null);
  const [name, setName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!reference) return;
    const url = createObjectUrl(reference.file);
    setPreviewUrl(url);
    return () => {
      revokeObjectUrl(url);
      setPreviewUrl(null);
    };
  }, [reference]);
  const busy = !['idle', 'editing', 'done'].includes(session.phase) || Boolean(session.recovery);
  const job = encodeURIComponent(session.jobId || '');
  const appliedProfile = active === 'saved' || active === 'upload'
    ? saved.find((profile) => profile.id === flow.profileId)
    : undefined;
  const saveReference = async () => {
    if (!reference || create.isPending) return;
    const label = name.trim() || reference.file.name.replace(/\.[^.]+$/, '') || t('dubflow.voice_default_name');
    const profile = await create.mutateAsync({ name: label, refAudio: reference.file, language: 'Auto' });
    applyVoice('upload', profile.id);
    setReference(null);
    setName('');
  };
  return (
    <section data-slot="dubflow-step-voice" className="space-y-4">
      <header>
        <h2 className="text-base font-semibold">{t('dubflow.voice_title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('dubflow.voice_hint')}</p>
      </header>
      <div className="grid gap-3">
        <SourceCard
          icon={FilmIcon}
          title={t('dubflow.voice_video')}
          hint={t('dubflow.voice_video_hint')}
          selected={choice === 'video'}
          onSelect={() => setChoice('video')}
        >
          {session.jobId && (
            <WaveformPlayer
              src={apiPath(`/dub/audio/${job}`)}
              source="dubflow-reference"
              height={48}
              compact
            />
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {active === 'video' ? t('dubflow.voice_applied') : t('dubflow.voice_video_note')}
            </p>
            <Button size="sm" disabled={busy || active === 'video'} onClick={() => applyVoice('video')}>
              {active === 'video' ? <CheckIcon /> : null}
              {t('dubflow.use_voice')}
            </Button>
          </div>
        </SourceCard>

        <SourceCard
          icon={UploadIcon}
          title={t('dubflow.voice_upload')}
          hint={t('dubflow.voice_upload_hint')}
          selected={choice === 'upload'}
          onSelect={() => setChoice('upload')}
        >
          {reference ? (
            <div className="space-y-3">
              {previewUrl && (
                <WaveformPlayer src={previewUrl} source="dubflow-reference" height={48} compact />
              )}
              <ReferenceUsageNote durationSeconds={reference.durationSeconds} />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t('dubflow.voice_name_placeholder')}
                  aria-label={t('clone.profile_name')}
                  className="min-w-40 flex-1"
                />
                <Button size="sm" variant="ghost" onClick={() => setReference(null)} disabled={create.isPending}>
                  {t('common.cancel')}
                </Button>
                <Button size="sm" disabled={busy || create.isPending} onClick={() => void saveReference()}>
                  {t('dubflow.use_voice')}
                </Button>
              </div>
            </div>
          ) : (
            <ReferenceSourcePicker
              onAccept={(file, durationSeconds) => setReference({ file, durationSeconds })}
            />
          )}
          {active === 'upload' && appliedProfile && !reference && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t('dubflow.voice_applied_named', { name: appliedProfile.name })}
            </p>
          )}
        </SourceCard>

        <SourceCard
          icon={UsersRoundIcon}
          title={t('dubflow.voice_saved')}
          hint={t('dubflow.voice_saved_hint')}
          selected={choice === 'saved'}
          onSelect={() => setChoice('saved')}
        >
          {saved.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('dubflow.voice_saved_empty')}</p>
          ) : (
            <ul className="grid gap-1" aria-label={t('clone.saved_profiles')}>
              {saved.map((profile) => {
                const isActive = active === 'saved' && flow.profileId === profile.id;
                return (
                  <li key={profile.id}>
                    <button
                      type="button"
                      aria-pressed={isActive}
                      disabled={busy}
                      onClick={() => applyVoice('saved', profile.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring',
                        isActive && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
                      )}
                    >
                      <ProfileAvatar name={profile.name} imageUrl={profile.image_url} />
                      <span className="min-w-0 flex-1 truncate text-sm">{profile.name}</span>
                      {isActive && <CheckIcon className="size-4 text-primary" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SourceCard>
      </div>
    </section>
  );
}
