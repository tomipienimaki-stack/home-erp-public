#!/usr/bin/env node
/**
 * Ajaa supabase/migrations/*.sql -tiedostot tietokantaan, jos niitä ei ole vielä ajettu.
 * Vercel ajaa tämän jokaisen buildin alussa (katso vercel.json).
 *
 * Yhteys: POSTGRES_URL_NON_POOLING, POSTGRES_URL tai DATABASE_URL. Vercelin
 * Supabase-integraatio asettaa nämä automaattisesti. Ilman yhteysosoitetta
 * migraatiot ohitetaan, ja skeema ajetaan käsin (supabase/schema.sql).
 */
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');
const TABLE = 'public.home_erp_migrations';

function connectionString(env = process.env) {
  return ['POSTGRES_URL_NON_POOLING', 'POSTGRES_URL', 'DATABASE_URL']
    .map((n) => env[n] && env[n].trim())
    .find(Boolean);
}

/** Supabase vaatii TLS:n. Uudemmat pg-versiot tulkitsevat sslmode=require-arvon tiukaksi varmennetarkistukseksi, joten asetetaan TLS itse. */
function clientConfig(url) {
  const u = new URL(url);
  const local = ['localhost', '127.0.0.1', '::1'].includes(u.hostname) || u.hostname.startsWith('/');
  const sslmode = u.searchParams.get('sslmode');
  ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'supa', 'pgbouncer'].forEach((k) => u.searchParams.delete(k));
  const ssl = sslmode === 'disable' || (local && !sslmode) ? false : { rejectUnauthorized: false };
  return { connectionString: u.toString(), ssl };
}

async function migrate({ url = connectionString(), dir = MIGRATIONS_DIR, log = console.log } = {}) {
  if (!url) {
    log('[migrate] Tietokantayhteyttä ei ole (POSTGRES_URL). Ohitetaan: aja supabase/schema.sql käsin.');
    return { applied: [], skipped: true };
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const client = new Client(clientConfig(url));
  await client.connect();
  try {
    await client.query(`create table if not exists ${TABLE} (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);
    // Ei käytäntöjä: taulu näkyy vain tietokannan ylläpitäjälle, ei Supabasen julkiselle rajapinnalle.
    await client.query(`alter table ${TABLE} enable row level security`);
    let done = new Set((await client.query(`select name from ${TABLE}`)).rows.map((r) => r.name));

    // Ennen tätä skriptiä käsin pystytetty kanta: oletetaan kaikki nykyiset migraatiot ajetuiksi.
    if (done.size === 0) {
      const { rows } = await client.query(`select to_regclass('public.pantry_items') is not null as exists`);
      if (rows[0].exists) {
        for (const f of files) await client.query(`insert into ${TABLE} (name) values ($1) on conflict do nothing`, [f]);
        log(`[migrate] Olemassa oleva kanta: merkittiin ${files.length} migraatiota ajetuiksi.`);
        done = new Set(files);
      }
    }

    const applied = [];
    for (const f of files) {
      if (done.has(f)) continue;
      log(`[migrate] Ajetaan ${f}`);
      // Tiedostot hallitsevat transaktionsa itse (begin/commit).
      await client.query(fs.readFileSync(path.join(dir, f), 'utf8'));
      await client.query(`insert into ${TABLE} (name) values ($1)`, [f]);
      applied.push(f);
    }
    log(applied.length ? `[migrate] Valmis: ${applied.length} migraatiota ajettu.` : '[migrate] Kanta on ajan tasalla.');
    return { applied, skipped: false };
  } finally {
    await client.end();
  }
}

module.exports = { migrate, connectionString, clientConfig };

if (require.main === module) {
  migrate().catch((err) => {
    console.error(`[migrate] Epäonnistui: ${err.message}`);
    process.exit(1);
  });
}
