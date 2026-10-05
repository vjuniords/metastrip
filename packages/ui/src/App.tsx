import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Download,
  ExternalLink,
  ImagePlus,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { zipSync } from 'fflate';
import type { InspectReport } from '@metastrip/core';
import { KIND_LABEL, SIGNAL_LABEL, getDict, type Dict } from './i18n';
import {
  DEFAULT_OPTIONS,
  analyze,
  errorCode,
  formatBytes,
  processFile,
  triggerDownload,
  type OutputFormat,
  type ProcessOptions,
  type SizePreset,
} from './process';

interface Item {
  id: string;
  file: File;
  preview: string;
  status: 'analyzing' | 'ready' | 'error' | 'working';
  report?: InspectReport;
  error?: keyof Dict['errors'];
}

export interface MetaStripAppProps {
  variant?: 'popup' | 'sidepanel' | 'page';
  /** Shown in the header to open the full-tab view. */
  onOpenFull?: () => void;
}

const STORAGE_KEY = 'metastrip:options';
const ACCEPT = 'image/jpeg,image/png,image/webp';

function loadOptions(): ProcessOptions {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function MetaStripApp({ variant = 'page', onOpenFull }: MetaStripAppProps) {
  const t = useMemo(() => getDict(), []);
  const [items, setItems] = useState<Item[]>([]);
  const [opts, setOpts] = useState<ProcessOptions>(loadOptions);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompact = variant === 'popup' || variant === 'sidepanel';
  const isSidepanel = variant === 'sidepanel';

  useEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(opts)), [opts]);
  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const addFiles = useCallback((files: Iterable<File>) => {
    const next: Item[] = [...files]
      .filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(f.name))
      .map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file), status: 'analyzing' }));
    setItems((list) => [...next, ...list]);
    for (const item of next) {
      analyze(item.file)
        .then((report) => patch(item.id, { status: 'ready', report }))
        .catch((e) => patch(item.id, { status: 'error', error: errorCode(e) }));
    }
  }, []);

  const addFromUrl = useCallback(async (urlStr: string) => {
    try {
      const res = await fetch(urlStr);
      const blob = await res.blob();
      const rawName = urlStr.split('/').pop()?.split('?')[0] || 'image.png';
      const name = rawName.includes('.') ? rawName : `${rawName}.png`;
      const file = new File([blob], name, { type: blob.type || 'image/png' });
      addFiles([file]);
    } catch (err) {
      console.warn('[MetaStrip] Could not fetch dragged URL:', err);
    }
  }, [addFiles]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addFiles]);

  const download = async (item: Item) => {
    patch(item.id, { status: 'working' });
    try {
      const out = await processFile(item.file, opts);
      triggerDownload(out.blob, out.fileName);
      patch(item.id, { status: 'ready' });
    } catch (e) {
      patch(item.id, { status: 'error', error: errorCode(e) });
    }
  };

  const removeItem = (id: string) =>
    setItems((list) => {
      const it = list.find((i) => i.id === id);
      if (it) URL.revokeObjectURL(it.preview);
      return list.filter((i) => i.id !== id);
    });

  const ready = items.filter((i) => i.status === 'ready');
  const [zipping, setZipping] = useState(false);

  const downloadAllAsZip = async () => {
    if (ready.length === 0 || zipping) return;
    setZipping(true);
    try {
      const filesToZip: Record<string, Uint8Array> = {};
      const usedNames = new Set<string>();

      for (const item of ready) {
        patch(item.id, { status: 'working' });
        const out = await processFile(item.file, opts);
        let name = out.fileName;
        let counter = 1;
        while (usedNames.has(name)) {
          const dot = out.fileName.lastIndexOf('.');
          const base = dot > 0 ? out.fileName.slice(0, dot) : out.fileName;
          const ext = dot > 0 ? out.fileName.slice(dot) : '';
          name = `${base}_${counter}${ext}`;
          counter++;
        }
        usedNames.add(name);
        const buf = new Uint8Array(await out.blob.arrayBuffer());
        filesToZip[name] = buf;
        patch(item.id, { status: 'ready' });
      }

      const zipped = zipSync(filesToZip);
      const zipBlob = new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
      triggerDownload(zipBlob, `metastrip-limpas-${Date.now().toString().slice(-6)}.zip`);
    } catch (e) {
      console.error('[MetaStrip] Zip error:', e);
    } finally {
      setZipping(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-4 text-zinc-900 dark:text-zinc-100 ${
        isSidepanel
          ? 'w-full min-h-screen p-4 max-w-full'
          : variant === 'popup'
            ? 'w-[400px] p-4'
            : 'mx-auto w-full max-w-5xl p-4 sm:p-8'
      }`}
    >
      <header className="flex items-center justify-between gap-3 pb-1 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight">MetaStrip</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Local
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{t.tagline}</p>
          </div>
        </div>
        {onOpenFull && (
          <button onClick={onOpenFull} className="btn-ghost" title={t.openTab} aria-label={t.openTab}>
            <ExternalLink className="size-4" />
          </button>
        )}
      </header>

      <div className={isCompact ? 'flex flex-col gap-4' : 'grid gap-6 lg:grid-cols-[1fr_300px]'}>
        <div className="flex min-w-0 flex-col gap-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                addFiles(e.dataTransfer.files);
              } else {
                const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
                if (uri && (uri.startsWith('http') || uri.startsWith('blob:') || uri.startsWith('data:'))) {
                  await addFromUrl(uri);
                } else {
                  const html = e.dataTransfer.getData('text/html');
                  if (html) {
                    const match = html.match(/src=["'](.*?)["']/);
                    if (match && match[1]) await addFromUrl(match[1]);
                  }
                }
              }
            }}
            className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 text-center transition ${
              isCompact ? 'py-8' : 'py-14'
            } ${
              dragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-zinc-300 hover:border-emerald-400 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900/60'
            }`}
          >
            <span className="grid size-11 place-items-center rounded-full bg-zinc-100 text-zinc-600 transition group-hover:scale-105 group-hover:text-emerald-600 dark:bg-zinc-800 dark:text-zinc-300">
              <ImagePlus className="size-5" />
            </span>
            <span className="text-sm font-semibold">{t.drop}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.dropHint}</span>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{t.formats}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {items.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <span>
                  {ready.length === 0
                    ? t.processing
                    : ready.length === 1
                      ? '1 imagem pronta'
                      : `${ready.length} imagens prontas`}
                </span>
                <button onClick={() => items.forEach((i) => removeItem(i.id))} className="text-zinc-500 hover:text-red-500 transition text-[11px] flex items-center gap-1">
                  <Trash2 className="size-3" /> {t.clear}
                </button>
              </div>
              {ready.length > 0 && (
                <button
                  onClick={downloadAllAsZip}
                  disabled={zipping}
                  className="btn-primary w-full py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm"
                >
                  {zipping ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
                  {zipping
                    ? t.processing
                    : ready.length === 1
                      ? `${t.downloadZip}`
                      : `${t.downloadAllZip} (${ready.length})`}
                </button>
              )}
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <FileCard key={item.id} item={item} t={t} onDownload={() => download(item)} onRemove={() => removeItem(item.id)} />
            ))}
          </ul>
        </div>

        <aside className="flex flex-col gap-4">
          <OptionsPanel t={t} opts={opts} setOpts={setOpts} />
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">{t.disclaimer}</p>
        </aside>
      </div>
    </div>
  );
}

function FileCard({ item, t, onDownload, onRemove }: { item: Item; t: Dict; onDownload: () => void; onRemove: () => void }) {
  const r = item.report;
  const ai = r?.aiSignals ?? [];
  const removed = r?.entries.filter((e) => e.removed) ?? [];
  const kinds = [...new Set(removed.map((e) => e.kind))];

  return (
    <li className="card flex gap-3 p-3">
      <img src={item.preview} alt="" className="size-16 shrink-0 rounded-lg bg-zinc-100 object-cover dark:bg-zinc-800" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {r ? `${r.format.toUpperCase()} · ${formatBytes(r.fileSize)}` : formatBytes(item.file.size)}
              {r && removed.length > 0 && ` · ${removed.length} ${t.blocks} ${t.removed} (−${formatBytes(r.removableBytes)})`}
            </p>
          </div>
          <button onClick={onRemove} className="btn-ghost -mr-1 -mt-1 p-1" aria-label={t.remove}>
            <X className="size-4" />
          </button>
        </div>

        {item.status === 'analyzing' && <Status icon={<Loader2 className="size-3.5 animate-spin" />} text={t.processing} />}
        {item.status === 'error' && (
          <Status tone="red" icon={<AlertTriangle className="size-3.5" />} text={t.errors[item.error ?? 'UNKNOWN']} />
        )}

        {r && (
          <>
            {ai.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                <Status tone="amber" icon={<Sparkles className="size-3.5" />} text={t.aiFound} />
                {ai.map((s) => (
                  <span key={s} className="chip border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">{SIGNAL_LABEL[s]}</span>
                ))}
              </div>
            ) : (
              <Status tone="green" icon={<ShieldCheck className="size-3.5" />} text={removed.length ? t.noAi : t.nothing} />
            )}
            {r.exif?.hasGps && <Status tone="red" icon={<MapPin className="size-3.5" />} text={t.gpsFound} />}
            {(r.exif?.make || r.exif?.software) && (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {[r.exif.make && `${t.camera}: ${[r.exif.make, r.exif.model].filter(Boolean).join(' ')}`, r.exif.software && `${t.software}: ${r.exif.software}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {kinds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {kinds.map((k) => (
                  <span key={k} className="chip">{KIND_LABEL[k]}</span>
                ))}
              </div>
            )}
          </>
        )}

        {(item.status === 'ready' || item.status === 'working') && (
          <button onClick={onDownload} disabled={item.status === 'working'} className="btn-primary mt-1 self-start text-xs">
            {item.status === 'working' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {t.download}
          </button>
        )}
      </div>
    </li>
  );
}

function OptionsPanel({ t, opts, setOpts }: { t: Dict; opts: ProcessOptions; setOpts: (o: ProcessOptions) => void }) {
  const set = <K extends keyof ProcessOptions>(k: K, v: ProcessOptions[K]) => setOpts({ ...opts, [k]: v });
  return (
    <div className="card flex flex-col gap-4 p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="label">{t.mode}</legend>
        <Segmented
          value={opts.mode}
          onChange={(v) => set('mode', v)}
          options={[
            ['lossless', t.lossless],
            ['rerender', t.rerender],
          ]}
        />
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{opts.mode === 'lossless' ? t.losslessHint : t.rerenderHint}</p>
      </fieldset>

      {opts.mode === 'rerender' && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="label">{t.output}</legend>
            <Segmented<OutputFormat>
              value={opts.format}
              onChange={(v) => set('format', v)}
              options={[
                ['jpeg', 'JPG'],
                ['png', 'PNG'],
                ['webp', 'WebP'],
              ]}
            />
          </fieldset>
          <label className="flex flex-col gap-2">
            <span className="label">{t.size}</span>
            <select value={opts.size} onChange={(e) => set('size', e.target.value as SizePreset)} className="input">
              <option value="original">{t.original}</option>
              <option value="1080x1080">1080 × 1080 · Feed 1:1</option>
              <option value="1080x1350">1080 × 1350 · Feed 4:5</option>
              <option value="1080x1920">1080 × 1920 · Stories</option>
            </select>
          </label>
        </>
      )}

      {opts.mode === 'lossless' && (
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          {t.keepIcc}
          <input type="checkbox" checked={opts.keepIcc} onChange={(e) => set('keepIcc', e.target.checked)} className="size-4 accent-emerald-600" />
        </label>
      )}
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
            value === v ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Status({ icon, text, tone = 'zinc' }: { icon: React.ReactNode; text: string; tone?: 'zinc' | 'green' | 'amber' | 'red' }) {
  const c = {
    zinc: 'text-zinc-500 dark:text-zinc-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c}`}>
      {icon}
      {text}
    </span>
  );
}

export function Logo({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-zinc-900 dark:fill-white" />
      <path d="M8 22V10l8 8 8-8v12" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="stroke-white dark:stroke-zinc-900" />
      <path d="M6 16h20" strokeWidth="2.2" strokeLinecap="round" className="stroke-emerald-400" />
    </svg>
  );
}
