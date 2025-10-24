// src/content/types.ts
export type NewsMeta = {
  title: string;
  date: string; // ISO "YYYY-MM-DD" recommended
  image?: string;
  draft?: boolean;
  tags?: string[];
};

export type NewsItem = NewsMeta & {
  slug: string;
  body: string; // markdown body
  sourcePath: string; // file path or URL
};
