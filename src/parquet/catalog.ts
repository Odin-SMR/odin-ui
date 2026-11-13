import { z } from "zod";

const text = z.string().trim().min(1).max(4000);
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
const httpsUrl = z.string().max(4096).url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
}, "Use a permanent HTTPS URL without credentials, query parameters or fragments.");
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "Use a valid calendar date.");
const count = z.number().int().nonnegative().safe();

export const parquetFileSchema = z.object({
  url: httpsUrl.refine((value) => new URL(value).pathname.endsWith(".parquet"), "Expected a Parquet object URL."),
  s3_uri: z.string().regex(/^s3:\/\/[a-z0-9][a-z0-9.-]+\/[^?#\r\n]+\.parquet$/).optional(),
  region: z.string().regex(/^[a-z]{2}(?:-[a-z]+)+-\d+$/).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size_bytes: count.positive(),
  row_count: count,
  observation_start: date.nullable(),
  observation_end: date.nullable(),
}).strict().superRefine((file, context) => {
  if ((file.observation_start === null) !== (file.observation_end === null)) context.addIssue({ code: "custom", message: "Unknown coverage requires both dates to be null." });
  if (file.observation_start !== null && file.observation_end !== null && file.observation_start > file.observation_end) context.addIssue({ code: "custom", message: "File coverage is reversed." });
  if (Boolean(file.s3_uri) !== Boolean(file.region)) context.addIssue({ code: "custom", message: "S3 URI and region must be supplied together." });
});

export const datasetSchema = z.object({
  id,
  title: text,
  level: z.enum(["L0", "L1", "L2", "L2I"]),
  project: text,
  product: text,
  frequency_mode: count.optional(),
  inversion_mode: text.optional(),
  schema_url: httpsUrl,
  description: text,
  columns: z.array(z.object({
    name: z.string().min(1).max(128).refine((value) => ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) && !value.startsWith("_odin_"), "Invalid or reserved column name."),
    type: text,
    unit: text.optional(),
    description: text,
  }).strict()).min(1).max(1000),
  notes: z.array(text).max(100),
  files: z.array(parquetFileSchema).min(1).max(10000),
}).strict().superRefine((dataset, context) => {
  if (new Set(dataset.files.map((file) => file.observation_start === null)).size > 1) context.addIssue({ code: "custom", message: "Separate dated and undated files into different datasets." });
  if (new Set(dataset.columns.map((column) => column.name)).size !== dataset.columns.length) context.addIssue({ code: "custom", message: "Duplicate column names." });
  if (new Set(dataset.files.map((file) => file.url)).size !== dataset.files.length) context.addIssue({ code: "custom", message: "Duplicate file URLs." });
  for (const field of ["size_bytes", "row_count"] as const) {
    if (!Number.isSafeInteger(dataset.files.reduce((sum, file) => sum + file[field], 0))) context.addIssue({ code: "custom", message: `Dataset ${field} total exceeds safe integer precision.` });
  }
});

export const releaseSchema = z.object({
  id,
  title: text,
  published_at: date,
  license: z.object({ name: text, url: httpsUrl }).strict(),
  citation: text,
  documentation_url: httpsUrl,
  datasets: z.array(datasetSchema).min(1).max(1000),
}).strict().superRefine((release, context) => {
  if (new Set(release.datasets.map((dataset) => dataset.id)).size !== release.datasets.length) context.addIssue({ code: "custom", message: "Duplicate dataset IDs." });
  const urls = release.datasets.flatMap((dataset) => dataset.files.map((file) => file.url));
  if (new Set(urls).size !== urls.length) context.addIssue({ code: "custom", message: "One file cannot have conflicting dataset identities within a release." });
});

export const catalogSchema = z.object({
  schema_version: z.literal(1),
  status: z.enum(["planned", "published"]),
  message: text,
  releases: z.array(releaseSchema).max(100),
}).strict().superRefine((catalog, context) => {
  if ((catalog.status === "published") !== (catalog.releases.length > 0)) context.addIssue({ code: "custom", message: "Published catalogs need releases; planned catalogs must have none." });
  if (new Set(catalog.releases.map((release) => release.id)).size !== catalog.releases.length) context.addIssue({ code: "custom", message: "Duplicate release IDs." });
});

export type ParquetFile = z.infer<typeof parquetFileSchema>;
export type Dataset = z.infer<typeof datasetSchema>;
export type Release = z.infer<typeof releaseSchema>;
export type Catalog = z.infer<typeof catalogSchema>;

/** This validates metadata, not scientific acceptance or live object availability. */
export function parseCatalog(value: unknown): Catalog {
  return catalogSchema.parse(value);
}

/** Inclusive date overlap selects whole files, never promises row-level filtering. */
export function filterFiles(dataset: Dataset, start = "", end = ""): ParquetFile[] {
  if ((start && !date.safeParse(start).success) || (end && !date.safeParse(end).success) || (start && end && start > end)) return [];
  return dataset.files.filter((file) => file.observation_start === null || file.observation_end === null
    ? !start && !end
    : (!start || file.observation_end >= start) && (!end || file.observation_start <= end));
}
