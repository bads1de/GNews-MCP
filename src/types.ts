import { z } from "zod";

// [EN] Input schema for the search news tool
// [JA] 検索ニュースツールの入力スキーマ
export const SearchNewsSchema = z.object({
  keyword: z.string().min(1).describe("Search keyword"),
  lang: z
    .string()
    .length(2)
    .default("ja")
    .describe("Language code (e.g. ja, en, fr)"),
  country: z
    .string()
    .length(2)
    .default("jp")
    .describe("Country code (e.g. jp, us, gb)"),
  max: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe("Number of news articles to retrieve (max 10, default 5)"),
});

// [EN] Input schema for the top headlines tool
// [JA] トップヘッドラインツールの入力スキーマ
export const TopHeadlinesSchema = z.object({
  category: z
    .enum([
      "general",
      "world",
      "nation",
      "business",
      "technology",
      "entertainment",
      "sports",
      "science",
      "health",
    ])
    .default("general")
    .describe("News category"),
  lang: z
    .string()
    .length(2)
    .default("ja")
    .describe("Language code (e.g. ja, en, fr)"),
  country: z
    .string()
    .length(2)
    .default("jp")
    .describe("Country code (e.g. jp, us, gb)"),
  max: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe("Number of news articles to retrieve (max 10, default 5)"),
});

// [EN] Input type for the search news tool
// [JA] 検索ニュースツールの入力型
export type SearchNewsInput = z.infer<typeof SearchNewsSchema>;

// [EN] Input type for the top headlines tool
// [JA] トップヘッドラインツールの入力型
export type TopHeadlinesInput = z.infer<typeof TopHeadlinesSchema>;
