// src/content/loadLocalNews.ts
import fm from "front-matter";
import type { NewsItem, NewsMeta } from "./types";

const files = import.meta.glob("/src/content/news/**/*.md", {
  query: "raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function toSlug(p: string) {
  return p.split("/").pop()!.replace(/\.md$/, "").toLowerCase();
}

export function loadLocalNews(): NewsItem[] {
  const items: NewsItem[] = Object.entries(files).map(([path, raw]) => {
    const parsed = fm<NewsMeta>(raw);
    if (!parsed.attributes?.title) throw new Error(`Missing title in ${path}`);
    if (!parsed.attributes?.date) throw new Error(`Missing date in ${path}`);
    return {
      ...parsed.attributes,
      slug: toSlug(path),
      body: parsed.body,
      sourcePath: path,
    };
  });

  // filter drafts only in prod (optional)
  const filtered = import.meta.env.DEV
    ? items
    : items.filter((i) => i.draft !== true);

  // sort by date desc
  filtered.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return filtered;
}
