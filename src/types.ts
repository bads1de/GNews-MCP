// src/types.ts
import { z } from 'zod';

// 検索ニュースツールの入力スキーマ
export const SearchNewsSchema = z.object({
  keyword: z.string().min(1).describe('検索キーワード'),
  lang: z
    .string()
    .length(2)
    .default('ja')
    .describe('言語コード（例: ja, en, fr）'),
  country: z
    .string()
    .length(2)
    .default('jp')
    .describe('国コード（例: jp, us, gb）'),
  max: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('取得するニュース記事の数（最大10）'),
});

// トップヘッドラインツールの入力スキーマ
export const TopHeadlinesSchema = z.object({
  category: z
    .enum(['general', 'world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'])
    .default('general')
    .describe('ニュースカテゴリ'),
  lang: z
    .string()
    .length(2)
    .default('ja')
    .describe('言語コード（例: ja, en, fr）'),
  country: z
    .string()
    .length(2)
    .default('jp')
    .describe('国コード（例: jp, us, gb）'),
  max: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('取得するニュース記事の数（最大10）'),
});

// 検索ニュースツールの入力型
export type SearchNewsInput = z.infer<typeof SearchNewsSchema>;

// トップヘッドラインツールの入力型
export type TopHeadlinesInput = z.infer<typeof TopHeadlinesSchema>;
