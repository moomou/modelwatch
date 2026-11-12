#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateCatalog, isValidIsoCalendarDate } from './validate-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.resolve(PROJECT_ROOT, 'src/data/models.json');

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    }
  }
  return flags;
}

function usage() {
  console.log(`ModelWatch Catalog CLI

Commands:
  npm run model:list
      List all company IDs, model line IDs, and their latest release.

  npm run model:add -- --line <lineId> --version "<Model Name>" --date YYYY-MM-DD --url "https://..." --highlights "<Summary>" [--dry-run]
      Append or insert a verified release into an existing model line, auto-sort chronologically,
      bump lastVerified, and validate all data-quality invariants before writing.

  npm run model:add -- --new-line --line <lineId> --company <companyId> --name "<Line Name>" --tier "<Tier Label>" --category <frontier|workhorse|fast|coding|multimodal> --access <proprietary|open-weights> --summary "<Line Summary>" --version "<Model Name>" --date YYYY-MM-DD --url "https://..." --highlights "<Summary>"
      Create a brand-new model line with its inaugural release.
`);
}

const [, , subcommand = 'help', ...rest] = process.argv;
const flags = parseFlags(rest);

if (subcommand === 'help' || flags.help) {
  usage();
  process.exit(0);
}

const catalog = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

if (subcommand === 'list') {
  console.log(`ModelWatch Lines (${catalog.lines.length} total, verified ${catalog.lastVerified}):\n`);
  for (const line of catalog.lines) {
    const latest = line.releases[line.releases.length - 1];
    console.log(
      `  ${line.id.padEnd(26)} | ${line.companyId.padEnd(10)} | ${latest.releasedAt} | ${latest.version}`
    );
  }
  process.exit(0);
}

if (subcommand === 'add') {
  const lineId = flags.line;
  const version = flags.version;
  const releasedAt = flags.date;
  const sourceUrl = flags.url;
  const highlights = flags.highlights;

  if (!lineId || !version || !releasedAt || !sourceUrl || !highlights) {
    console.error('Missing required flags: --line, --version, --date, --url, --highlights\n');
    usage();
    process.exit(1);
  }

  if (!isValidIsoCalendarDate(releasedAt)) {
    console.error(`Invalid --date "${releasedAt}" (expected valid YYYY-MM-DD).`);
    process.exit(1);
  }

  const newRelease = {
    version: String(version).trim(),
    releasedAt: String(releasedAt).trim(),
    highlights: String(highlights).trim(),
    sourceUrl: String(sourceUrl).trim(),
  };

  if (flags['new-line']) {
    if (catalog.lines.some((l) => l.id === lineId)) {
      console.error(`Line "${lineId}" already exists. Omit --new-line to add a release to it.`);
      process.exit(1);
    }
    catalog.lines.push({
      id: String(lineId).trim(),
      companyId: String(flags.company ?? '').trim(),
      name: String(flags.name ?? '').trim(),
      tierLabel: String(flags.tier ?? 'Frontier').trim(),
      category: String(flags.category ?? 'frontier').trim(),
      access: String(flags.access ?? 'proprietary').trim(),
      lifecycle: 'active',
      summary: String(flags.summary ?? '').trim(),
      releases: [newRelease],
    });
  } else {
    const targetLine = catalog.lines.find((l) => l.id === lineId);
    if (!targetLine) {
      console.error(`Unknown line "${lineId}". Run "npm run model:list" to see existing IDs, or pass --new-line.`);
      process.exit(1);
    }
    targetLine.releases.push(newRelease);
    targetLine.releases.sort((a, b) => a.releasedAt.localeCompare(b.releasedAt));
    if (targetLine.lifecycle === 'consolidated' && flags.reactivate) {
      targetLine.lifecycle = 'active';
      delete targetLine.lifecycleNote;
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (todayIso > catalog.lastVerified) {
    catalog.lastVerified = todayIso;
  }
  if (releasedAt > catalog.lastVerified) {
    catalog.lastVerified = releasedAt;
  }

  const check = validateCatalog(catalog);
  if (!check.valid) {
    console.error('Refusing to write catalog because validation failed:');
    for (const err of check.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (flags['dry-run']) {
    console.log(`[dry-run] Validated addition of "${newRelease.version}" (${newRelease.releasedAt}) to ${lineId}.`);
    process.exit(0);
  }

  fs.writeFileSync(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  console.log(`Added "${newRelease.version}" (${newRelease.releasedAt}) to "${lineId}" and validated catalog.`);

  if (!flags['no-build']) {
    const viteBin = path.resolve(PROJECT_ROOT, 'node_modules/.bin/vite');
    if (fs.existsSync(viteBin)) {
      execFileSync(viteBin, ['build', '--logLevel', 'warn'], {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
      });
      console.log('Rebuilt dist/ with updated model catalog.');
    }
  }
  process.exit(0);
}

console.error(`Unknown subcommand "${subcommand}".`);
usage();
process.exit(1);
