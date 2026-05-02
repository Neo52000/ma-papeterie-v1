import { useMemo, useState } from 'react';
import { Stage, Layer, Rect, Ellipse, Circle, Text } from 'react-konva';
import {
  DEFAULT_TAMPON,
  TAMPON_FONTS,
  TAMPON_SHAPES,
  type TamponDesign,
  type TamponLine,
  type TamponShape,
} from '@/types/tampon';

// Canvas size — fixed 300x300 design coordinate space. Lines are positioned
// relative to this so the customer's preview matches what the manufacturer
// will engrave (scaled to physical mm at production time).
const CANVAS_SIZE = 300;
const STROKE = 3;

// Compute the y-offset for line N out of total, vertically centered.
const lineY = (idx: number, total: number, lineHeight: number): number => {
  const totalHeight = total * lineHeight;
  const startY = (CANVAS_SIZE - totalHeight) / 2 + lineHeight / 2;
  return startY + idx * lineHeight;
};

const cloneLines = (lines: TamponLine[]): TamponLine[] => lines.map((l) => ({ ...l }));

interface TamponCanvasProps {
  design: TamponDesign;
}

function TamponCanvas({ design }: TamponCanvasProps) {
  const { shape, borderColor, lines } = design;

  // Average line gap — generous so longer lines breathe. The widest font
  // size in the set wins so two adjacent lines never overlap.
  const maxFont = lines.reduce((m, l) => Math.max(m, l.fontSize), 16);
  const lineHeight = maxFont * 1.4;

  return (
    <Stage width={CANVAS_SIZE} height={CANVAS_SIZE}>
      <Layer>
        {shape === 'rond' && (
          <Circle
            x={CANVAS_SIZE / 2}
            y={CANVAS_SIZE / 2}
            radius={CANVAS_SIZE / 2 - STROKE}
            stroke={borderColor}
            strokeWidth={STROKE}
          />
        )}
        {shape === 'ovale' && (
          <Ellipse
            x={CANVAS_SIZE / 2}
            y={CANVAS_SIZE / 2}
            radiusX={CANVAS_SIZE / 2 - STROKE}
            radiusY={CANVAS_SIZE / 3}
            stroke={borderColor}
            strokeWidth={STROKE}
          />
        )}
        {shape === 'rectangle' && (
          <Rect
            x={STROKE}
            y={CANVAS_SIZE / 4}
            width={CANVAS_SIZE - STROKE * 2}
            height={CANVAS_SIZE / 2}
            stroke={borderColor}
            strokeWidth={STROKE}
            cornerRadius={6}
          />
        )}
        {shape === 'carre' && (
          <Rect
            x={STROKE}
            y={STROKE}
            width={CANVAS_SIZE - STROKE * 2}
            height={CANVAS_SIZE - STROKE * 2}
            stroke={borderColor}
            strokeWidth={STROKE}
            cornerRadius={6}
          />
        )}
        {lines.map((line, idx) => {
          const y = lineY(idx, lines.length, lineHeight);
          return (
            <Text
              key={idx}
              text={line.text}
              x={0}
              y={y - line.fontSize / 2}
              width={CANVAS_SIZE}
              align="center"
              fontFamily={line.fontFamily}
              fontSize={line.fontSize}
              fontStyle={line.bold ? 'bold' : 'normal'}
              fill={borderColor}
            />
          );
        })}
      </Layer>
    </Stage>
  );
}

interface SubmitState {
  state: 'idle' | 'submitting' | 'submitted' | 'error';
  message?: string;
}

export default function TamponDesigner() {
  const [design, setDesign] = useState<TamponDesign>(DEFAULT_TAMPON);
  const [contact, setContact] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [submit, setSubmit] = useState<SubmitState>({ state: 'idle' });

  const canSubmit = useMemo(
    () =>
      contact.company.trim().length >= 2 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) &&
      design.lines.some((l) => l.text.trim().length > 0),
    [contact, design.lines],
  );

  const updateShape = (shape: TamponShape) => {
    const preset = TAMPON_SHAPES.find((s) => s.value === shape);
    setDesign((d) => ({ ...d, shape, diameterMm: preset?.defaultDiameterMm ?? d.diameterMm }));
  };

  const updateLine = <K extends keyof TamponLine>(idx: number, key: K, value: TamponLine[K]) => {
    setDesign((d) => {
      const lines = cloneLines(d.lines);
      lines[idx] = { ...lines[idx], [key]: value };
      return { ...d, lines };
    });
  };

  const addLine = () => {
    if (design.lines.length >= 5) return;
    setDesign((d) => ({
      ...d,
      lines: [
        ...cloneLines(d.lines),
        { text: '', fontFamily: 'Inter, sans-serif', fontSize: 16, bold: false },
      ],
    }));
  };

  const removeLine = (idx: number) => {
    setDesign((d) => ({ ...d, lines: d.lines.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmit({ state: 'submitting' });
    try {
      const res = await fetch('/api/tampon/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ design, contact }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSubmit({ state: 'error', message: json.error ?? `HTTP ${res.status}` });
        return;
      }
      setSubmit({ state: 'submitted' });
    } catch (err) {
      setSubmit({
        state: 'error',
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  };

  if (submit.state === 'submitted') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-card border border-emerald-200 bg-emerald-50 p-8 text-center"
      >
        <p className="font-display text-xl font-semibold text-emerald-900">✓ Demande envoyée !</p>
        <p className="mt-2 text-sm text-emerald-800">
          Nous revenons vers vous sous 24-48h ouvrées avec un devis personnalisé.
        </p>
        <a
          href="/"
          className="mt-4 inline-flex h-10 items-center rounded-btn bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
        >
          Retour à l'accueil
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"
    >
      <section className="space-y-5">
        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-primary">Forme du tampon</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TAMPON_SHAPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => updateShape(s.value)}
                aria-pressed={design.shape === s.value}
                className={`inline-flex h-10 items-center justify-center rounded-btn border text-xs font-medium transition-colors ${
                  design.shape === s.value
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-primary/15 bg-white text-primary/70 hover:border-accent/50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Taille (mm)
            <input
              type="number"
              min={20}
              max={120}
              value={design.diameterMm}
              onChange={(e) =>
                setDesign((d) => ({
                  ...d,
                  diameterMm: Math.max(20, Math.min(120, Number(e.target.value) || 40)),
                }))
              }
              className="mt-1 h-9 w-32 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Couleur encre
            <input
              type="color"
              value={design.borderColor}
              onChange={(e) => setDesign((d) => ({ ...d, borderColor: e.target.value }))}
              className="mt-1 block h-9 w-20 cursor-pointer rounded-btn border border-primary/15"
            />
          </label>
        </div>

        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-primary">Lignes de texte</h2>
            <button
              type="button"
              onClick={addLine}
              disabled={design.lines.length >= 5}
              className="inline-flex h-8 items-center rounded-btn border border-accent/30 bg-accent/5 px-3 text-xs font-medium text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Ajouter une ligne ({design.lines.length}/5)
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {design.lines.map((line, idx) => (
              <div key={idx} className="rounded-card border border-primary/5 bg-bg-soft p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={line.text}
                    onChange={(e) => updateLine(idx, 'text', e.target.value)}
                    maxLength={60}
                    placeholder={`Ligne ${idx + 1}`}
                    className="h-9 flex-1 rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    aria-label={`Supprimer la ligne ${idx + 1}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-btn text-primary/40 hover:bg-danger/10 hover:text-danger"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <select
                    value={line.fontFamily}
                    onChange={(e) => updateLine(idx, 'fontFamily', e.target.value)}
                    aria-label={`Police ligne ${idx + 1}`}
                    className="h-8 rounded-btn border border-primary/15 bg-white px-2 text-xs text-primary"
                  >
                    {TAMPON_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-primary/70">
                    Taille
                    <input
                      type="range"
                      min={10}
                      max={40}
                      value={line.fontSize}
                      onChange={(e) => updateLine(idx, 'fontSize', Number(e.target.value))}
                      aria-label={`Taille texte ligne ${idx + 1}`}
                      className="flex-1"
                    />
                    <span className="w-7 text-right tabular-nums">{line.fontSize}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-primary/70">
                    <input
                      type="checkbox"
                      checked={line.bold}
                      onChange={(e) => updateLine(idx, 'bold', e.target.checked)}
                    />
                    Gras
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-primary">Vos coordonnées</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary/60">
              Société *
              <input
                type="text"
                required
                value={contact.company}
                onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))}
                maxLength={120}
                className="mt-1 h-10 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-primary/60">
              Nom du contact
              <input
                type="text"
                value={contact.name}
                onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                maxLength={100}
                className="mt-1 h-10 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-primary/60">
              Email *
              <input
                type="email"
                required
                value={contact.email}
                onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                maxLength={150}
                className="mt-1 h-10 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-primary/60">
              Téléphone
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                maxLength={30}
                className="mt-1 h-10 w-full rounded-btn border border-primary/15 bg-white px-3 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-primary/60">
            Précisions (optionnel)
            <textarea
              rows={3}
              value={contact.notes}
              onChange={(e) => setContact((c) => ({ ...c, notes: e.target.value }))}
              maxLength={1000}
              placeholder="Quantité, délai souhaité, type de manche…"
              className="mt-1 w-full rounded-btn border border-primary/15 bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/60">Aperçu</p>
          <div className="mt-3 flex justify-center rounded-btn bg-bg-soft p-4">
            <div className="rounded bg-white p-2 shadow-inner">
              <TamponCanvas design={design} />
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-primary/50">
            Aperçu indicatif. Le rendu final sera ajusté par notre atelier.
          </p>
        </div>

        <div className="rounded-card border border-primary/10 bg-white p-5 shadow-card">
          <button
            type="submit"
            disabled={!canSubmit || submit.state === 'submitting'}
            className="inline-flex h-12 w-full items-center justify-center rounded-btn bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submit.state === 'submitting' ? 'Envoi…' : 'Demander mon devis'}
          </button>
          {submit.state === 'error' && (
            <p className="mt-2 text-xs text-danger">Erreur : {submit.message}</p>
          )}
          <p className="mt-3 text-xs text-primary/50">
            Devis gratuit, sans engagement. Réponse sous 24-48h ouvrées.
          </p>
        </div>
      </aside>
    </form>
  );
}
