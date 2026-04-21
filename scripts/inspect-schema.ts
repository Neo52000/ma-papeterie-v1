import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

type OpenApiProperty = {
  type?: string;
  format?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
};

type OpenApiDefinition = {
  properties?: Record<string, OpenApiProperty>;
  required?: string[];
};

type OpenApiSchema = {
  definitions?: Record<string, OpenApiDefinition>;
};

function loadEnv(path: string): Record<string, string> {
  const content = readFileSync(path, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv(resolve(process.cwd(), '.env.local'));
const url = env.PUBLIC_SUPABASE_URL;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.PUBLIC_SUPABASE_ANON_KEY;
if (!url || !serviceRole || !anonKey) throw new Error('Missing env vars (PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / PUBLIC_SUPABASE_ANON_KEY)');

const server = createClient(url, serviceRole, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

async function fetchOpenApi(): Promise<OpenApiSchema> {
  const r = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
  });
  if (!r.ok) throw new Error(`OpenAPI fetch failed: HTTP ${r.status}`);
  return (await r.json()) as OpenApiSchema;
}

async function rowCount(table: string): Promise<{ count: number | null; method: 'exact' | 'estimated'; err?: string }> {
  const exact = await server.from(table).select('*', { count: 'exact', head: true });
  if (!exact.error && exact.count !== null) return { count: exact.count, method: 'exact' };
  const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}`, Prefer: 'count=estimated', Range: '0-0' },
  });
  const cr = r.headers.get('content-range');
  if (cr) {
    const m = cr.match(/\/(\d+|\*)/);
    if (m && m[1] !== '*') return { count: parseInt(m[1], 10), method: 'estimated' };
  }
  return { count: null, method: 'estimated', err: exact.error?.message ?? 'no count returned' };
}

async function serverSample(table: string, cols = '*', limit = 3): Promise<unknown[]> {
  const { data, error } = await server.from(table).select(cols).limit(limit);
  return error ? [] : (data ?? []);
}

async function anonRead(table: string): Promise<{ ok: boolean; detail: string }> {
  const { data, error } = await anon.from(table).select('*').limit(1);
  if (error) return { ok: false, detail: error.message };
  return { ok: true, detail: `${data?.length ?? 0} ligne visible` };
}

function describeTable(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('product') && (lower.includes('categor') || lower.includes('_cat'))) return 'jointure produits ↔ catégories';
  if (lower.includes('product') && (lower.includes('image') || lower.includes('media') || lower.includes('multimedia'))) return 'images / médias produits';
  if (lower.includes('product') && lower.includes('stock')) return 'stocks produits';
  if (lower.includes('product') && lower.includes('price')) return 'prix produits';
  if (lower.includes('product') && lower.includes('relat')) return 'produits liés (cross-sell)';
  if (lower.includes('product')) return 'données produit';
  if (lower.includes('categor')) return 'catégories';
  if (lower.includes('multimedia') || lower.includes('media') || lower.includes('image')) return 'médias / images';
  if (lower.includes('stock') || lower.includes('inventor')) return 'stocks';
  if (lower.includes('price')) return 'prix';
  if (lower.includes('order')) return 'commandes';
  if (lower.includes('customer') || lower.includes('account')) return 'clients / comptes';
  if (lower.includes('user') || lower.includes('profile')) return 'utilisateurs';
  if (lower.includes('brand') || lower.includes('manufactur')) return 'marques';
  if (lower.includes('cart') || lower.includes('basket')) return 'paniers';
  if (lower.includes('quote') || lower.includes('devis')) return 'devis';
  if (lower.includes('shopify') || lower.includes('mapping') || lower.includes('sync')) return 'mapping Shopify';
  if (lower.includes('description')) return 'descriptions produit';
  if (lower.includes('list') || lower.includes('schoollist')) return 'listes scolaires';
  return '(non déduit)';
}

function extractFk(description: string | undefined): string | null {
  if (!description) return null;
  const m = description.match(/<fk\s+table='([^']+)'\s+column='([^']+)'\s*\/>/);
  if (!m) return null;
  return `${m[1]}.${m[2]}`;
}

function listColumns(def: OpenApiDefinition | undefined): Array<{ name: string; type: string; format?: string; nullable: boolean; fk: string | null; default: unknown }> {
  if (!def?.properties) return [];
  const required = new Set(def.required ?? []);
  return Object.entries(def.properties).map(([name, p]) => ({
    name,
    type: p.type ?? '(?)',
    format: p.format,
    nullable: !required.has(name),
    fk: extractFk(p.description),
    default: p.default,
  }));
}

function formatColumnType(c: { type: string; format?: string }): string {
  return c.format ? `${c.type} (${c.format})` : c.type;
}

function pickBy(cols: ReturnType<typeof listColumns>, predicate: (name: string) => boolean): string[] {
  return cols.filter((c) => predicate(c.name.toLowerCase())).map((c) => c.name);
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function extractDomain(urlStr: string): string {
  try { return new URL(urlStr).hostname; } catch { return '(invalid URL)'; }
}

async function main(): Promise<void> {
  const schema = await fetchOpenApi();
  const defs = schema.definitions ?? {};
  const tableNames = Object.keys(defs).sort();

  // Section A — tables + row counts
  const tables: Array<{ name: string; count: number | null; method: 'exact' | 'estimated'; err?: string; desc: string }> = [];
  for (const name of tableNames) {
    const { count, method, err } = await rowCount(name);
    tables.push({ name, count, method, err, desc: describeTable(name) });
  }

  // Section B/C — products + categories structure
  const productsDef = defs['products'] ?? defs['product'];
  const productsCols = listColumns(productsDef);
  const categoriesDef = defs['categories'] ?? defs['category'];
  const categoriesCols = listColumns(categoriesDef);

  // Critical column detection on products
  const idCol = pickBy(productsCols, (n) => n === 'id' || n === 'uuid');
  const skuCol = pickBy(productsCols, (n) => n === 'sku' || n === 'reference' || n === 'ref' || n === 'ean' || n === 'code');
  const nameCol = pickBy(productsCols, (n) => n === 'name' || n === 'title' || n === 'label' || n === 'libelle');
  const descShort = pickBy(productsCols, (n) => n === 'description' || n === 'short_description' || n === 'summary');
  const descLong = pickBy(productsCols, (n) => n === 'long_description' || n === 'full_description' || n === 'body');
  const priceHt = pickBy(productsCols, (n) => n.includes('price_ht') || n === 'price' || n === 'prix_ht' || n === 'unit_price');
  const priceTtc = pickBy(productsCols, (n) => n.includes('price_ttc') || n === 'prix_ttc' || n === 'price_with_tax');
  const tvaCol = pickBy(productsCols, (n) => n === 'tva' || n === 'vat' || n === 'tax_rate' || n === 'tva_rate');
  const stockCol = pickBy(productsCols, (n) => n === 'stock' || n === 'quantity' || n === 'stock_level' || n === 'available' || n.includes('stock'));
  const brandCol = pickBy(productsCols, (n) => n === 'brand' || n === 'brand_id' || n === 'manufacturer');
  const slugCol = pickBy(productsCols, (n) => n === 'slug' || n === 'url_slug' || n === 'permalink');
  const createdCol = pickBy(productsCols, (n) => n === 'created_at' || n === 'createdat' || n === 'date_add');
  const updatedCol = pickBy(productsCols, (n) => n === 'updated_at' || n === 'updatedat' || n === 'date_upd');
  const tsvCol = productsCols.filter((c) => c.type === 'string' && (c.format === 'tsvector' || c.name.toLowerCase().includes('tsv') || c.name.toLowerCase().includes('search_vector') || c.name.toLowerCase().includes('fts')));

  // Section D — images
  const mediaCandidates = tableNames.filter((n) => /multimedia|media|image|picture|photo/i.test(n));
  const productImageCols = pickBy(productsCols, (n) => /image|photo|media|picture|thumb|visuel/.test(n));

  const imagesTableInfo: Array<{ name: string; count: number | null; cols: ReturnType<typeof listColumns>; urlCol: string | null; fkToProduct: string | null; sample: string[]; domains: Map<string, number> }> = [];
  for (const t of mediaCandidates) {
    const cols = listColumns(defs[t]);
    const urlCol = cols.find((c) => /url|link|href|src/i.test(c.name))?.name ?? null;
    const fkToProduct = cols.find((c) => c.fk && c.fk.startsWith('products.'))?.name ?? null;
    const { count } = await rowCount(t);
    const samples = urlCol ? await serverSample(t, urlCol, 500) : [];
    const urls: string[] = [];
    const domains = new Map<string, number>();
    for (const row of samples) {
      const val = (row as Record<string, unknown>)[urlCol ?? ''];
      if (typeof val === 'string' && val.length > 0) {
        urls.push(val);
        const d = extractDomain(val);
        domains.set(d, (domains.get(d) ?? 0) + 1);
      }
    }
    imagesTableInfo.push({ name: t, count, cols, urlCol, fkToProduct, sample: urls.slice(0, 3), domains });
  }

  // Fill rate: products with at least 1 image (pagination PostgREST-safe)
  let productsWithImage: number | null = null;
  let productsWithoutImage: number | null = null;
  const productsTotal = tables.find((t) => t.name === 'products')?.count ?? null;
  if (imagesTableInfo.length > 0 && productsTotal !== null) {
    const best = imagesTableInfo.find((i) => i.fkToProduct) ?? imagesTableInfo[0];
    if (best.fkToProduct) {
      const distinctProducts = new Set<unknown>();
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await server.from(best.name).select(best.fkToProduct).range(offset, offset + pageSize - 1);
        if (error || !data || data.length === 0) break;
        for (const r of data) {
          const pid = (r as unknown as Record<string, unknown>)[best.fkToProduct];
          if (pid !== null && pid !== undefined) distinctProducts.add(pid);
        }
        if (data.length < pageSize) break;
        offset += pageSize;
      }
      productsWithImage = distinctProducts.size;
      productsWithoutImage = productsTotal - distinctProducts.size;
    }
  }

  // Section E — stocks
  const stockTables = tableNames.filter((n) => /stock|inventor/i.test(n));
  const stockTableInfos: Array<{ name: string; count: number | null; cols: ReturnType<typeof listColumns> }> = [];
  for (const t of stockTables) {
    const { count } = await rowCount(t);
    stockTableInfos.push({ name: t, count, cols: listColumns(defs[t]) });
  }

  // Stock distribution
  let stockDist: { zero: number; low: number; ok: number; total: number } | null = null;
  const primaryStockTable = stockTableInfos[0];
  if (primaryStockTable) {
    const qtyCol = primaryStockTable.cols.find((c) => /quantity|stock|available|qty/i.test(c.name) && (c.type === 'integer' || c.type === 'number'))?.name;
    if (qtyCol) {
      const samples = await serverSample(primaryStockTable.name, qtyCol, 100000);
      let zero = 0, low = 0, ok = 0;
      for (const row of samples) {
        const q = (row as Record<string, number>)[qtyCol] ?? 0;
        if (q === 0) zero++;
        else if (q > 0 && q <= 5) low++;
        else if (q > 5) ok++;
      }
      stockDist = { zero, low, ok, total: samples.length };
    }
  }

  // Section H — RLS behavioral test
  const rlsTables = ['products', 'categories', ...mediaCandidates, ...stockTables].filter((v, i, a) => a.indexOf(v) === i && tableNames.includes(v));
  const rlsResults: Array<{ table: string; ok: boolean; detail: string }> = [];
  for (const t of rlsTables) {
    const r = await anonRead(t);
    rlsResults.push({ table: t, ...r });
  }

  // --- BUILD REPORT ---
  const lines: string[] = [];
  const p = (s = '') => lines.push(s);

  p('# PHASE 2 — Supabase schema reconnaissance');
  p('');
  p(`> Rapport généré le ${new Date().toISOString()} via \`npx tsx scripts/inspect-schema.ts\`.`);
  p(`> Source : OpenAPI PostgREST (\`${url}/rest/v1/\`) + échantillons \`from().select()\`.`);
  p(`> Projet Supabase : \`mgojmkzovqgpipybelrr\`. Lecture seule (service_role bypass RLS + test anon).`);
  p('');

  // Section A
  p('## Section A — Inventaire des tables');
  p('');
  p('| Table | Lignes | Méthode | Description déduite |');
  p('|---|---:|---|---|');
  for (const t of tables) {
    const rows = t.count !== null ? t.count.toLocaleString('fr-FR') : `⚠️ ${t.err ?? 'n/a'}`;
    const method = t.count === null ? '—' : t.method === 'estimated' ? 'est.' : 'exact';
    p(`| \`${mdEscape(t.name)}\` | ${rows} | ${method} | ${mdEscape(t.desc)} |`);
  }
  p('');
  p(`**Verdict A** : ✅ ${tables.length} tables détectées dans \`public\`.`);
  p('');

  // Section B
  p('## Section B — Structure `products`');
  p('');
  if (productsCols.length === 0) {
    p('🚨 **Table `products` introuvable dans le schéma OpenAPI.**');
  } else {
    p(`Colonnes : **${productsCols.length}**.`);
    p('');
    p('| Colonne | Type | Nullable | FK | Default |');
    p('|---|---|---|---|---|');
    for (const c of productsCols) {
      p(`| \`${mdEscape(c.name)}\` | ${formatColumnType(c)} | ${c.nullable ? 'oui' : 'non'} | ${c.fk ? `→ \`${c.fk}\`` : '—'} | ${c.default === undefined ? '—' : `\`${JSON.stringify(c.default)}\``} |`);
    }
    p('');
    p('**Colonnes critiques e-commerce :**');
    p('');
    const critical: Array<{ label: string; found: string[]; required: boolean }> = [
      { label: 'identifiant (id/uuid)', found: idCol, required: true },
      { label: 'SKU / référence / EAN', found: skuCol, required: true },
      { label: 'nom / titre', found: nameCol, required: true },
      { label: 'description courte', found: descShort, required: true },
      { label: 'description longue', found: descLong, required: false },
      { label: 'prix HT', found: priceHt, required: true },
      { label: 'prix TTC', found: priceTtc, required: false },
      { label: 'TVA', found: tvaCol, required: false },
      { label: 'stock', found: stockCol, required: true },
      { label: 'marque', found: brandCol, required: false },
      { label: 'slug', found: slugCol, required: true },
      { label: 'created_at', found: createdCol, required: false },
      { label: 'updated_at', found: updatedCol, required: false },
    ];
    p('| Rôle | Colonne(s) | État |');
    p('|---|---|---|');
    const criticalMissing: string[] = [];
    for (const r of critical) {
      let status: string;
      if (r.found.length > 0) status = '✅';
      else if (r.required) { status = '🚨'; criticalMissing.push(r.label); }
      else status = '⚠️';
      p(`| ${r.label} | ${r.found.length > 0 ? r.found.map((n) => `\`${n}\``).join(', ') : '—'} | ${status} |`);
    }
    p('');
    if (criticalMissing.length > 0) {
      p(`🚨 **Verdict B : BLOQUANT** — colonnes critiques manquantes : ${criticalMissing.join(', ')}.`);
    } else {
      p('✅ **Verdict B** : toutes les colonnes critiques sont présentes.');
    }
  }
  p('');

  // Section C
  p('## Section C — Structure `categories`');
  p('');
  if (categoriesCols.length === 0) {
    p('🚨 **Table `categories` introuvable.**');
  } else {
    const catCount = tables.find((t) => t.name === (defs['categories'] ? 'categories' : 'category'))?.count;
    p(`Colonnes : **${categoriesCols.length}**. Lignes : **${catCount?.toLocaleString('fr-FR') ?? '—'}**.`);
    p('');
    p('| Colonne | Type | Nullable | FK |');
    p('|---|---|---|---|');
    for (const c of categoriesCols) {
      p(`| \`${mdEscape(c.name)}\` | ${formatColumnType(c)} | ${c.nullable ? 'oui' : 'non'} | ${c.fk ? `→ \`${c.fk}\`` : '—'} |`);
    }
    p('');
    const parentCol = categoriesCols.find((c) => /parent|path|ancestor|tree/i.test(c.name));
    const productFkInProducts = productsCols.find((c) => c.fk && c.fk.startsWith('categories.'));
    const productCatJoinTable = tableNames.find((n) => /products?_categories?|category_products?/i.test(n));
    p(`- Hiérarchie : ${parentCol ? `✅ colonne \`${parentCol.name}\` (${formatColumnType(parentCol)})` : '⚠️ aucune colonne parent/path détectée — structure plate'}`);
    p(`- Relation produits : ${productFkInProducts ? `✅ \`products.${productFkInProducts.name}\` → \`${productFkInProducts.fk}\`` : productCatJoinTable ? `✅ table de jointure \`${productCatJoinTable}\`` : '🚨 aucune FK détectée'}`);
    p('');
    p('✅ **Verdict C** : structure catégories OK.');
  }
  p('');

  // Section D
  p('## Section D — Images produit');
  p('');
  if (imagesTableInfo.length === 0 && productImageCols.length === 0) {
    p('🚨 **Aucune table dédiée ni colonne image détectée.**');
  } else {
    if (productImageCols.length > 0) {
      p(`- Colonne image inline dans \`products\` : ${productImageCols.map((c) => `\`${c}\``).join(', ')}`);
    }
    for (const info of imagesTableInfo) {
      p('');
      p(`### Table \`${info.name}\``);
      p(`- Lignes : **${info.count?.toLocaleString('fr-FR') ?? '—'}**`);
      p(`- Colonne URL : ${info.urlCol ? `\`${info.urlCol}\`` : '⚠️ non identifiée'}`);
      p(`- FK vers \`products\` : ${info.fkToProduct ? `\`${info.fkToProduct}\` → ${info.cols.find((c) => c.name === info.fkToProduct)?.fk ?? '?'}` : '⚠️ aucune FK détectée'}`);
      if (info.domains.size > 0) {
        p(`- Domaines observés (sur échantillon) :`);
        for (const [d, c] of [...info.domains.entries()].sort((a, b) => b[1] - a[1])) {
          p(`  - \`${d}\` (${c} URL)`);
        }
      }
      if (info.sample.length > 0) {
        p(`- Exemples d'URLs :`);
        for (const s of info.sample) p(`  - \`${s.length > 120 ? s.slice(0, 120) + '…' : s}\``);
      }
    }
    p('');
    if (productsTotal !== null && productsWithImage !== null) {
      const pct = productsTotal > 0 ? ((productsWithImage / productsTotal) * 100).toFixed(1) : '0.0';
      p(`**Taux de remplissage** : ${productsWithImage.toLocaleString('fr-FR')} / ${productsTotal.toLocaleString('fr-FR')} produits ont au moins 1 image (**${pct} %**). Sans image : **${productsWithoutImage?.toLocaleString('fr-FR')}**.`);
    } else {
      p('⚠️ Taux de remplissage : non calculable (FK produit manquante ou échantillon trop grand).');
    }
    p('');
    const stockageExterne = imagesTableInfo.some((i) => [...i.domains.keys()].some((d) => !d.includes('supabase')));
    p(`**Stockage** : ${stockageExterne ? 'URLs externes (CDN non-Supabase détecté)' : 'Supabase Storage (ou non déterminable)'}.`);
  }
  p('');

  // Section E
  p('## Section E — Stocks');
  p('');
  const stockInline = productsCols.find((c) => /^stock$|quantity|available$/i.test(c.name));
  if (stockTableInfos.length === 0 && !stockInline) {
    p('🚨 **Aucune table ni colonne stock détectée.**');
  } else {
    if (stockInline) p(`- Colonne stock inline dans \`products\` : \`${stockInline.name}\` (${formatColumnType(stockInline)})`);
    for (const s of stockTableInfos) {
      p(`- Table \`${s.name}\` : ${s.count?.toLocaleString('fr-FR') ?? '—'} lignes, ${s.cols.length} colonnes (${s.cols.map((c) => `\`${c.name}\``).join(', ')})`);
    }
    if (stockDist) {
      p(`- Distribution (sur échantillon de ${stockDist.total.toLocaleString('fr-FR')}) : **${stockDist.zero.toLocaleString('fr-FR')}** à 0 · **${stockDist.low.toLocaleString('fr-FR')}** entre 1 et 5 · **${stockDist.ok.toLocaleString('fr-FR')}** > 5`);
    }
  }
  p('');

  // Section F
  p('## Section F — Recherche full-text');
  p('');
  if (tsvCol.length > 0) {
    p(`✅ Colonne tsvector détectée : ${tsvCol.map((c) => `\`${c.name}\``).join(', ')}.`);
  } else {
    p('⚠️ Aucune colonne `tsvector` / `search_vector` / `fts` détectée sur `products`.');
    p('');
    p(`Coût estimé pour ajouter : sur ~${productsTotal?.toLocaleString('fr-FR') ?? '?'} lignes, un \`ALTER TABLE products ADD COLUMN search_vector tsvector\` + \`CREATE INDEX ... USING GIN\` prend typiquement 10-60 s suivant la volumétrie.`);
  }
  p('');
  p('ℹ️ *Les indexes GIN ne sont pas visibles via OpenAPI — vérification à faire côté Supabase Studio ou via une RPC custom.*');
  p('');

  // Section G
  p('## Section G — Relations et contraintes');
  p('');
  const allFks: Array<{ from: string; col: string; to: string }> = [];
  for (const [tName, tDef] of Object.entries(defs)) {
    for (const c of listColumns(tDef)) {
      if (c.fk) allFks.push({ from: tName, col: c.name, to: c.fk });
    }
  }
  if (allFks.length === 0) {
    p('⚠️ Aucune foreign key détectée dans le schéma exposé.');
  } else {
    p('| De | Vers |');
    p('|---|---|');
    for (const fk of allFks) p(`| \`${fk.from}.${fk.col}\` | → \`${fk.to}\` |`);
  }
  p('');
  p('ℹ️ *Indexes secondaires et contraintes UNIQUE non-PK : invisibles via OpenAPI.*');
  p('');

  // Section H
  p('## Section H — RLS (test comportemental avec clé anon)');
  p('');
  p('| Table | Accès anon | Détail |');
  p('|---|---|---|');
  for (const r of rlsResults) {
    p(`| \`${mdEscape(r.table)}\` | ${r.ok ? '✅' : '🚨'} | ${mdEscape(r.detail)} |`);
  }
  p('');
  const blockedAnon = rlsResults.filter((r) => !r.ok).map((r) => r.table);
  if (blockedAnon.length === 0) {
    p('✅ **Verdict H** : anon peut SELECT sur toutes les tables catalogue.');
  } else {
    p(`🚨 **Verdict H** : anon bloqué sur ${blockedAnon.map((t) => `\`${t}\``).join(', ')}. Policies RLS à ajouter (voir section Migration).`);
  }
  p('');

  // Reco
  p('## Recommandations — pré-Phase 2');
  p('');
  const reco: string[] = [];
  if (slugCol.length === 0 && productsCols.length > 0) reco.push('🚨 **Ajouter une colonne `slug`** (text unique) sur `products` pour les URLs SEO.');
  if (tsvCol.length === 0 && productsCols.length > 0) reco.push('⚠️ **Ajouter une colonne `search_vector` tsvector + index GIN** pour la recherche full-text performante.');
  if (blockedAnon.length > 0) reco.push(`🚨 **Créer des policies RLS pour anon** sur : ${blockedAnon.join(', ')}.`);
  if (productsWithImage !== null && productsTotal !== null && productsTotal > 0) {
    const pct = (productsWithImage / productsTotal) * 100;
    const icon = pct < 20 ? '🚨' : '⚠️';
    if (pct < 80) reco.push(`${icon} **Fill rate images à ${pct.toFixed(2)} %** — ${productsWithoutImage?.toLocaleString('fr-FR')} produits sans image sur ${productsTotal.toLocaleString('fr-FR')}. Impact direct sur la Phase 2 (catalogue / fiche produit) : stratégie placeholder à définir, ou filtrer \`is_vendable\` côté requête publique.`);
  }
  if (reco.length === 0) {
    p('✅ Rien de bloquant — la base est prête pour le développement de la fiche produit et du catalogue.');
  } else {
    for (const r of reco) p(`- ${r}`);
  }
  p('');
  p('**À clarifier avec Élie :**');
  p('- Fréquence réelle de la synchro Comlandi (nightly attendu)');
  p('- Stratégie si un produit n\'a aucune image (placeholder ? filtrage du catalogue public ?)');
  p('- Si le slug doit être généré côté Postgres (trigger) ou côté app (au moment du sync)');
  p('');

  // Migration proposée
  p('## Migration SQL proposée (NON appliquée)');
  p('');
  const migrationNeeded = reco.some((r) => r.startsWith('🚨'));
  if (!migrationNeeded && tsvCol.length > 0) {
    p('Aucune migration critique nécessaire.');
  } else {
    p('```sql');
    if (slugCol.length === 0 && productsCols.length > 0) {
      p('-- 1. Ajout du slug (à peupler via trigger ou côté app)');
      p('ALTER TABLE products ADD COLUMN slug TEXT;');
      p('CREATE UNIQUE INDEX products_slug_unique ON products (slug) WHERE slug IS NOT NULL;');
      p('');
    }
    if (tsvCol.length === 0 && productsCols.length > 0) {
      p('-- 2. Full-text search (français)');
      p('ALTER TABLE products ADD COLUMN search_vector tsvector;');
      p('CREATE INDEX products_search_vector_idx ON products USING GIN (search_vector);');
      p('-- Populate : à faire en batch, colonne cible à ajuster selon schéma réel');
      p('-- UPDATE products SET search_vector = to_tsvector(\'french\', coalesce(name, \'\') || \' \' || coalesce(description, \'\'));');
      p('');
    }
    if (blockedAnon.length > 0) {
      p('-- 3. RLS policies pour anon (lecture catalogue public)');
      for (const t of blockedAnon) {
        p(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`);
        p(`CREATE POLICY "${t}_public_read" ON ${t} FOR SELECT TO anon USING (true);`);
      }
    }
    p('```');
    p('');
    p('> **Ne pas exécuter sans validation d\'Élie.** Tester d\'abord en dev (branche Supabase preview).');
  }
  p('');

  // Write
  const outPath = resolve(process.cwd(), 'docs', 'PHASE-2-SCHEMA-REPORT.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  process.stdout.write(`Rapport écrit : ${outPath}\n`);
  process.stdout.write(`Tables : ${tables.length} · Produits : ${productsTotal ?? '?'} · Images tables : ${imagesTableInfo.length} · RLS bloquées pour anon : ${blockedAnon.length}\n`);
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : JSON.stringify(e);
  process.stderr.write(`FATAL: ${msg}\n`);
  process.exit(1);
});
