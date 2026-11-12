#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = path.resolve(__dirname, '../src/data/models.json');

const VALID_CATEGORIES = new Set(['frontier', 'workhorse', 'fast', 'coding', 'multimodal']);
const VALID_ACCESS = new Set(['proprietary', 'open-weights']);
const VALID_LIFECYCLES = new Set(['active', 'consolidated']);

export function isValidIsoCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function validateCatalog(catalog) {
  const errors = [];

  if (!catalog || typeof catalog !== 'object') {
    return { valid: false, errors: ['Catalog root must be a JSON object.'], stats: null };
  }

  if (!isValidIsoCalendarDate(catalog.lastVerified)) {
    errors.push(`Invalid lastVerified ISO date: "${catalog.lastVerified}"`);
  }

  if (!Array.isArray(catalog.companies) || catalog.companies.length === 0) {
    errors.push('companies must be a non-empty array.');
  }

  if (!Array.isArray(catalog.lines) || catalog.lines.length === 0) {
    errors.push('lines must be a non-empty array.');
  }

  const companyIds = new Set();
  for (const company of catalog.companies ?? []) {
    if (!company.id || !/^[a-z0-9-]+$/.test(company.id)) {
      errors.push(`Invalid company id: "${company.id}"`);
    } else if (companyIds.has(company.id)) {
      errors.push(`Duplicate company id: "${company.id}"`);
    } else {
      companyIds.add(company.id);
    }

    if (!company.name?.trim()) errors.push(`Company "${company.id}" missing name.`);
    if (!company.shortName?.trim()) errors.push(`Company "${company.id}" missing shortName.`);
    if (!company.website?.startsWith('https://')) {
      errors.push(`Company "${company.id}" website must use https://.`);
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(company.accent ?? '')) {
      errors.push(`Company "${company.id}" accent must be a 6-digit hex color.`);
    }
  }

  const lineIds = new Set();
  const referencedCompanies = new Set();
  let totalReleases = 0;

  for (const line of catalog.lines ?? []) {
    if (!line.id || !/^[a-z0-9-]+$/.test(line.id)) {
      errors.push(`Invalid line id: "${line.id}"`);
    } else if (lineIds.has(line.id)) {
      errors.push(`Duplicate line id: "${line.id}"`);
    } else {
      lineIds.add(line.id);
    }

    if (!companyIds.has(line.companyId)) {
      errors.push(`Line "${line.id}" references unknown companyId "${line.companyId}".`);
    } else {
      referencedCompanies.add(line.companyId);
    }

    if (!VALID_CATEGORIES.has(line.category)) {
      errors.push(`Line "${line.id}" has invalid category "${line.category}".`);
    }
    if (!VALID_ACCESS.has(line.access)) {
      errors.push(`Line "${line.id}" has invalid access "${line.access}".`);
    }
    if (!VALID_LIFECYCLES.has(line.lifecycle)) {
      errors.push(`Line "${line.id}" has invalid lifecycle "${line.lifecycle}".`);
    }
    if (line.lifecycle === 'consolidated' && !line.lifecycleNote?.trim()) {
      errors.push(`Consolidated line "${line.id}" must include a lifecycleNote.`);
    }
    if (!line.name?.trim()) errors.push(`Line "${line.id}" missing name.`);
    if (!line.summary?.trim()) errors.push(`Line "${line.id}" missing summary.`);

    if (!Array.isArray(line.releases) || line.releases.length === 0) {
      errors.push(`Line "${line.id}" must contain at least one release.`);
      continue;
    }

    const seenVersions = new Set();
    const seenDates = new Set();
    let prevDate = null;

    for (const rel of line.releases) {
      totalReleases += 1;
      const vKey = (rel.version ?? '').trim().toLowerCase();
      if (!vKey) {
        errors.push(`Line "${line.id}" has a release with empty version.`);
      } else if (seenVersions.has(vKey)) {
        errors.push(`Line "${line.id}" has duplicate version "${rel.version}".`);
      } else {
        seenVersions.add(vKey);
      }

      if (!isValidIsoCalendarDate(rel.releasedAt)) {
        errors.push(`Line "${line.id}" release "${rel.version}" has invalid date "${rel.releasedAt}".`);
      } else {
        if (seenDates.has(rel.releasedAt)) {
          errors.push(
            `Line "${line.id}" has two releases on the exact same date (${rel.releasedAt}); combine or separate lineages to avoid 0-day interval distortion.`
          );
        }
        seenDates.add(rel.releasedAt);

        if (prevDate && rel.releasedAt <= prevDate) {
          errors.push(
            `Line "${line.id}" releases out of chronological order: "${rel.version}" (${rel.releasedAt}) <= previous (${prevDate}).`
          );
        }
        prevDate = rel.releasedAt;
      }

      if (!rel.highlights?.trim()) {
        errors.push(`Line "${line.id}" release "${rel.version}" missing highlights.`);
      }
      if (!rel.sourceUrl?.startsWith('https://')) {
        errors.push(`Line "${line.id}" release "${rel.version}" sourceUrl must start with https://.`);
      }
      if (rel.aaUrl !== undefined && !rel.aaUrl.startsWith('https://')) {
        errors.push(`Line "${line.id}" release "${rel.version}" aaUrl must start with https://.`);
      }
      if (rel.arenaUrl !== undefined && !rel.arenaUrl.startsWith('https://')) {
        errors.push(`Line "${line.id}" release "${rel.version}" arenaUrl must start with https://.`);
      }
    }
  }

  for (const cid of companyIds) {
    if (!referencedCompanies.has(cid)) {
      errors.push(`Company "${cid}" has zero model lines in catalog.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      companies: companyIds.size,
      lines: lineIds.size,
      releases: totalReleases,
      lastVerified: catalog.lastVerified,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DATA_PATH;
  const raw = fs.readFileSync(targetPath, 'utf8');
  const parsed = JSON.parse(raw);
  const result = validateCatalog(parsed);

  if (!result.valid) {
    console.error(`Data validation FAILED (${result.errors.length} error(s)):`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `Catalog OK: ${result.stats.companies} companies, ${result.stats.lines} model lines, ${result.stats.releases} verified releases (lastVerified ${result.stats.lastVerified}).`
  );
}
