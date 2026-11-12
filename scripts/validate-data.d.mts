export function isValidIsoCalendarDate(value: unknown): boolean;

export function validateCatalog(catalog: unknown): {
  valid: boolean;
  errors: string[];
  stats: {
    companies: number;
    lines: number;
    releases: number;
    lastVerified: string;
  } | null;
};
