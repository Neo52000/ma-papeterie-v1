// Backfill text-embedding-3-small (1536-dim) for every displayable product
// without an embedding yet. Usage:
//   node scripts/backfill-embeddings.mjs           # backfill all NULL
//   node scripts/backfill-embeddings.mjs --limit=500
//
// Batches of 100 inputs per OpenAI call (well within the 2048 cap).
// Coût text-embedding-3-small ≈ 0.02$ / 1M tokens. ~50 tokens / produit
// → 11.5k produits ≈ 0.01$.
//
// KNOWN LIMITATION (2026-04-30): Supabase free tier hits 'canceling
// statement due to statement timeout' (Postgres 57014) after ~500-6000
// successful updates per long-running connection. Rerun the script —
// it picks up where it left off (filter `embedding IS NULL`). For full
// catalogue (11.5k), expect 2-3 reruns.
// Root cause likely the HNSW index maintenance per update; long-term
// fix is to drop the index, bulk-update, recreate. Not worth it since
// reco IA is JIT-cached on first /api/products/[id]/similar call.

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase env vars');
if (!OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    }),
);
const HARD_LIMIT = args.limit ? Number(args.limit) : Infinity;
const BATCH = 100;

function buildSource(p) {
  return [p.name, p.brand ?? '', p.category ?? '', (p.description ?? '').slice(0, 200)]
    .filter((s) => s.length > 0)
    .join(' | ');
}

async function fetchBatch() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, category, description')
    .eq('is_active', true)
    .eq('is_vendable', true)
    .not('slug', 'is', null)
    .not('image_url', 'is', null)
    .is('embedding', null)
    .limit(BATCH);
  if (error) throw error;
  return data ?? [];
}

async function embedBatch(rows) {
  const inputs = rows.map((r) => buildSource(r));
  const resp = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: inputs,
  });
  return resp.data.map((d, i) => ({ id: rows[i].id, embedding: d.embedding }));
}

async function persistBatch(updates) {
  // pgvector + 1536-dim arrays + 100 parallel updates were enough to
  // tip Supabase into "57014 canceling statement due to statement
  // timeout" after a few minutes. Throttle to 10 in flight to keep
  // server pressure low. Slower but won't crash mid-run.
  const PARALLEL = 10;
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < updates.length; i += PARALLEL) {
    const slice = updates.slice(i, i + PARALLEL);
    const results = await Promise.allSettled(
      slice.map(({ id, embedding }) =>
        supabase
          .from('products')
          .update({ embedding, embedding_updated_at: new Date().toISOString() })
          .eq('id', id),
      ),
    );
    for (const r of results) {
      if (r.status === 'rejected' || r.value?.error) failed += 1;
      else ok += 1;
    }
  }
  return { ok, failed };
}

async function main() {
  let processed = 0;
  let totalOk = 0;
  let totalFail = 0;
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (processed >= HARD_LIMIT) break;
    const batch = await fetchBatch();
    if (batch.length === 0) break;
    const slice = batch.slice(0, Math.min(batch.length, HARD_LIMIT - processed));

    let updates;
    try {
      updates = await embedBatch(slice);
    } catch (err) {
      console.error('OpenAI batch failed:', err.message);
      // Brief pause and retry once before bailing.
      await new Promise((r) => setTimeout(r, 2000));
      try {
        updates = await embedBatch(slice);
      } catch (err2) {
        console.error('Retry also failed, aborting:', err2.message);
        break;
      }
    }

    const { ok, failed } = await persistBatch(updates);
    totalOk += ok;
    totalFail += failed;
    processed += slice.length;

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `[${processed}] +${ok} ok, ${failed} fail (cumul ${totalOk}/${totalFail}) — ${elapsed}s`,
    );
  }

  console.log(`\nDone. Processed ${processed}, ok ${totalOk}, fail ${totalFail}`);
  console.log(`Elapsed ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
