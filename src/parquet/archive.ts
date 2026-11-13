import { z } from "zod";

const text = z.string().trim().min(1).max(4000);
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
const count = z.number().int().nonnegative().safe();
const timestamp = z.string().datetime({ offset: true });
const fileUrl = z.string().url().max(4096).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname.endsWith(".parquet");
}, "Expected a permanent anonymous HTTPS Parquet URL.");

const groupSchema = z.object({
  id, project: text, product: text, level: z.enum(["L0", "L1", "L2", "L2I"]),
  frequency_mode: count.optional(), inversion_mode: text.optional(),
  file_count: count.positive(), size_bytes: count.positive(),
  index_url: z.string().regex(/^\/parquet\/archive\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.json$/),
}).strict();

const indexSchema = z.object({
  schema_version: z.literal(1), snapshot_id: id, generated_at: timestamp,
  description: text, source_scope: text,
  groups: z.array(groupSchema).min(1).max(1000),
}).strict().superRefine((index, context) => {
  if (new Set(index.groups.map((group) => group.id)).size !== index.groups.length) context.addIssue({ code: "custom", message: "Duplicate archive group IDs." });
  for (const group of index.groups) {
    if (group.index_url !== `/parquet/archive/${index.snapshot_id}/${group.id}.json`) context.addIssue({ code: "custom", message: "Archive group path does not match its snapshot and identity." });
  }
  for (const field of ["file_count", "size_bytes"] as const) {
    if (!Number.isSafeInteger(index.groups.reduce((total, group) => total + group[field], 0))) context.addIssue({ code: "custom", message: `Archive ${field} exceeds safe integer precision.` });
  }
});

const fileSchema = z.object({
  url: fileUrl, size_bytes: count.positive(),
  year: z.number().int().min(1).max(9999), month: z.number().int().min(1).max(12),
  etag: z.string().min(1).max(256), last_modified: timestamp,
}).strict();

const shardSchema = z.object({
  schema_version: z.literal(1), snapshot_id: id, group_id: id,
  files: z.array(fileSchema).min(1).max(100000),
}).strict();

export type ArchiveIndex = z.infer<typeof indexSchema>;
export type ArchiveGroup = z.infer<typeof groupSchema>;
export type ArchiveFile = z.infer<typeof fileSchema>;
export type ArchiveShard = z.infer<typeof shardSchema>;

export function parseArchiveIndex(value: unknown): ArchiveIndex {
  return indexSchema.parse(value);
}

/** Checks index identity and listed-object metadata, not scientific completeness. */
export function parseArchiveShard(value: unknown, index: ArchiveIndex, group: ArchiveGroup): ArchiveShard {
  const shard = shardSchema.parse(value);
  if (shard.snapshot_id !== index.snapshot_id || shard.group_id !== group.id) throw new Error("Archive snapshot or group identity changed.");
  if (shard.files.length !== group.file_count || shard.files.reduce((total, file) => total + file.size_bytes, 0) !== group.size_bytes) throw new Error("Archive file counts or sizes do not match the index.");
  if (new Set(shard.files.map((file) => file.url)).size !== shard.files.length) throw new Error("Archive file URLs are duplicated.");
  return shard;
}

/** These are storage partition labels, not measured observation coverage. */
export function archivePartitionFiles(files: ArchiveFile[], year: number, month: number): ArchiveFile[] {
  return files.filter((file) => file.year === year && file.month === month);
}
