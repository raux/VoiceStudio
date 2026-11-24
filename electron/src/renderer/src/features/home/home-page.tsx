import { HomeFeatureIcon } from './home-feature-icon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getBridge } from '@/components/bridge';
import { runRendererTask } from '@/lib/global-error-recovery';
import { HomeContributors } from './home-contributors';
import './home-page.css';
import { WorkspaceHeader } from '@/components/app-shell/workspace-header';
import { ProfileAvatar } from '@/components/profile-avatar';
import { Button } from '@/components/ui/button';
import { useProfiles } from '@/hooks/use-profiles';
import { brandArtwork } from '@/lib/brand';
import { selectCloneProfile } from '@/lib/store/reference';
import { openDubProject } from '@/features/dub/dub-session';
import type { DubProject } from '@/features/projects/project-format';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api/client';
import { ArrowRightIcon, FilmIcon, FolderOpenIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Destination {
  to: '/dub' | '/clone' | '/personas';
  label: string;
  description: string;
}

interface ExportRecord {
  id: string;
  filename: string;
  destination_path: string;
  mode?: string;
}

const iconTones: Record<Destination['to'], string> = {
  '/dub':
    'bg-teal-100 text-teal-700 ring-teal-300/60 dark:bg-teal-400/15 dark:text-teal-300 dark:ring-teal-300/30',
  '/clone':
    'bg-sky-100 text-sky-700 ring-sky-300/60 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-300/30',
  '/personas':
    'bg-violet-100 text-violet-700 ring-violet-300/60 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-300/30',
};

/** Landing page for the clone → dub flow: start a dub, manage the voices that feed it, reopen past work. */
export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: allProfiles = [] } = useProfiles();
  // Voice design is out of scope for this build; only cloned/reference voices are offered.
  const profiles = allProfiles.filter((profile) => profile.kind !== 'design');
  const { data: exports = [] } = useQuery({
    queryKey: ['export-history'],
    queryFn: ({ signal }) => apiJson<ExportRecord[]>('/export/history', { signal }),
    staleTime: 30_000,
  });
  const { data: dubProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: ({ signal }) => apiJson<DubProject[]>('/projects', { signal }),
  });
  const destinations: Destination[] = [
    { to: '/dub', label: t('dubWorkspace.title'), description: t('homeUi.dub') },
    { to: '/clone', label: t('nav.clone'), description: t('clone.reference_hint') },
    { to: '/personas', label: t('clone.saved_profiles'), description: t('homeUi.voices') },
  ];
  const recentProjects = [...dubProjects]
    .map((project) => ({
      project,
      updatedAt:
        (project.updated_at || 0) < 1e12
          ? (project.updated_at || 0) * 1000
          : project.updated_at || 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 4);
  const openProject = async (item: { project: DubProject }) => {
    const project = await apiJson<DubProject>('/projects/' + encodeURIComponent(item.project.id));
    if (openDubProject(project)) await navigate({ to: '/dub' });
  };
  const useProfile = async (profile: (typeof profiles)[number]) => {
    selectCloneProfile(profile);
    await navigate({ to: '/dub' });
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkspaceHeader>
        <h1 className="text-sm font-medium">{t('nav.home')}</h1>
        <Link
          to="/projects"
          className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <FolderOpenIcon className="size-4" />
          {t('projects.title')}
        </Link>
      </WorkspaceHeader>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="home-content mx-auto w-full max-w-6xl">
          <section aria-labelledby="home-new-projects">
            <div className="home-heading relative isolate overflow-hidden">
              <img
                src={brandArtwork}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-1/2 object-cover object-right opacity-25 [mask-image:linear-gradient(90deg,transparent,black)]"
              />
              <div className="home-heading-row">
                <h2
                  id="home-new-projects"
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 text-3xl font-semibold tracking-[-0.035em]"
                >
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a
                          href="https://voicestudio.sh"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                          onClick={(event) => {
                            const browser = getBridge()?.browser;
                            if (!browser) return;
                            event.preventDefault();
                            event.currentTarget.focus();
                            runRendererTask('Preview official website', () =>
                              browser.open('https://voicestudio.sh'),
                            );
                          }}
                        />
                      }
                    >
                      {t('homeUi.title')}
                    </TooltipTrigger>
                    <TooltipContent surface="theme" side="bottom">
                      {t('siteBrowser.preview')}
                    </TooltipContent>
                  </Tooltip>
                </h2>
                <HomeContributors />
              </div>
              <p className="mt-3 max-w-[80ch] text-sm leading-relaxed text-foreground/65">
                {t('homeUi.focusSubtitle')}
              </p>
              <div className="mt-5">
                <Link
                  to="/dub"
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <PlusIcon className="size-4" aria-hidden="true" />
                  {t('homeUi.newDub')}
                </Link>
              </div>
            </div>
            <div className="home-destinations home-destinations--primary grid grid-cols-1 gap-3 @xl:grid-cols-2 @3xl:grid-cols-3">
              {destinations.map(({ to, label, description }) => (
                <Link
                  key={to}
                  to={to}
                  data-destination={to}
                  className="home-destination home-destination--primary group"
                >
                  <div
                    className={`home-destination-icon flex size-10 items-center justify-center rounded-xl ring-1 ring-inset shadow-[inset_0_1px_0_rgb(255_255_255/10%)] ${iconTones[to]}`}
                  >
                    <HomeFeatureIcon destination={to} />
                  </div>
                  <svg className="home-card-art" viewBox="0 0 160 72" fill="none" aria-hidden="true">
                    {to === '/clone' ? (
                      <path d="M8 36h12m8-10v20m10-32v44m10-24v4m10-30v56m10-42v28m10-36v44m10-22h12m8-10v20m10-32v44m10-24v4m10-16v28m10-18h6" />
                    ) : to === '/personas' ? (
                      <>
                        <circle cx="40" cy="28" r="12" />
                        <path d="M16 64c0-14 11-22 24-22s24 8 24 22" />
                        <circle cx="110" cy="28" r="12" />
                        <path d="M86 64c0-14 11-22 24-22s24 8 24 22" />
                      </>
                    ) : (
                      <>
                        <rect x="15" y="12" width="88" height="31" rx="8" />
                        <rect x="57" y="31" width="88" height="31" rx="8" />
                        <path d="M29 27h12m6 0h28m-4 19h23m6 0h29" />
                      </>
                    )}
                  </svg>
                  <div className="home-destination-copy">
                    <h3>{label}</h3>
                    <p>{description}</p>
                  </div>
                  <ArrowRightIcon className="home-destination-arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          {recentProjects.length > 0 && (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <FilmIcon className="size-4 text-muted-foreground" />
                  {t('projects.dub_projects')}
                </h2>
                <Link
                  to="/projects"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('projects.all')}
                </Link>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2">
                {recentProjects.map((item) => (
                  <button
                    key={item.project.id}
                    type="button"
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/50 bg-card/20 px-3 py-2.5 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => void openProject(item)}
                  >
                    <FilmIcon className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.project.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {t('projects.dub_projects')}
                      </span>
                    </span>
                    <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {exports.length > 0 && (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="flex items-center gap-2 text-sm font-medium">
                  <FolderOpenIcon className="size-4 text-muted-foreground" />
                  {t('projects.exports')}
                </h2>
                <Link
                  to="/projects"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('projects.all')}
                </Link>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2">
                {exports.slice(0, 4).map((record) => (
                  <Link
                    key={record.id}
                    to="/projects"
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/50 bg-card/20 px-3 py-2.5 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <FolderOpenIcon className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {record.filename ||
                          record.destination_path.split(/[\\/]/).pop() ||
                          t('projects.export')}
                      </span>
                      {record.mode && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {record.mode}
                        </span>
                      )}
                    </span>
                    <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {profiles.length > 0 && (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-sm font-medium">{t('clone.saved_profiles')}</h2>
                <Link
                  to="/personas"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('projects.all')}
                </Link>
              </div>
              <div className="grid gap-1 rounded-2xl border border-border/70 bg-card/30 p-2 @3xl:grid-cols-2">
                {profiles.slice(0, 4).map((profile) => (
                  <div
                    key={profile.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl px-2.5 py-2 hover:bg-accent/50"
                  >
                    <ProfileAvatar name={profile.name} imageUrl={profile.image_url} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {profile.name}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => void useProfile(profile)}>
                      {t('clone.select_profile')}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
