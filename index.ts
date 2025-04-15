#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import Parser from "rss-parser";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// RSSパーサーのインスタンスを作成
const parser = new Parser();

// ニュースカテゴリとそのRSSフィードURLのマッピング
const newsCategoryUrls: Record<string, string> = {
  top: "https://news.yahoo.co.jp/rss/topics/top-picks.xml",
  domestic: "https://news.yahoo.co.jp/rss/categories/domestic.xml",
  world: "https://news.yahoo.co.jp/rss/categories/world.xml",
  business: "https://news.yahoo.co.jp/rss/categories/business.xml",
  entertainment: "https://news.yahoo.co.jp/rss/categories/entertainment.xml",
  sports: "https://news.yahoo.co.jp/rss/categories/sports.xml",
  it: "https://news.yahoo.co.jp/rss/categories/it.xml",
  science: "https://news.yahoo.co.jp/rss/categories/science.xml",
};

// Zodスキーマの定義
const GetNewsSchema = z.object({
  category: z
    .enum([
      "top",
      "domestic",
      "world",
      "business",
      "entertainment",
      "sports",
      "it",
      "science",
    ])
    .describe(
      "ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)"
    ),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe("取得するニュース記事の数 (最大20)"),
});

const SearchNewsSchema = z.object({
  keyword: z.string().min(1).describe("検索キーワード"),
  category: z
    .enum([
      "top",
      "domestic",
      "world",
      "business",
      "entertainment",
      "sports",
      "it",
      "science",
    ])
    .default("top")
    .describe(
      "ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)"
    ),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe("取得するニュース記事の数 (最大20)"),
});

// ツール定義
const GET_NEWS_TOOL: Tool = {
  name: "get-news",
  description:
    "指定されたカテゴリの最新ニュースを取得する。Yahoo!ニュースのRSSフィードから情報を取得し、タイトル、発行日、リンク、概要を含む記事のリストを返します。",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [
          "top",
          "domestic",
          "world",
          "business",
          "entertainment",
          "sports",
          "it",
          "science",
        ],
        description:
          "ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 20,
        default: 5,
        description: "取得するニュース記事の数 (最大20)",
      },
    },
    required: ["category"],
  },
};

const SEARCH_NEWS_TOOL: Tool = {
  name: "search-news",
  description:
    "キーワードでニュースを検索する。指定されたカテゴリ内でキーワードに一致する記事を検索し、タイトル、発行日、リンク、概要を含む記事のリストを返します。",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        minLength: 1,
        description: "検索キーワード",
      },
      category: {
        type: "string",
        enum: [
          "top",
          "domestic",
          "world",
          "business",
          "entertainment",
          "sports",
          "it",
          "science",
        ],
        default: "top",
        description:
          "ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 20,
        default: 5,
        description: "取得するニュース記事の数 (最大20)",
      },
    },
    required: ["keyword"],
  },
};

// サーバーインスタンスの作成
const server = new Server(
  {
    name: "yahoo-news-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [GET_NEWS_TOOL, SEARCH_NEWS_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("引数が提供されていません");
    }

    switch (name) {
      case "get-news": {
        const { category, limit } = GetNewsSchema.parse(args);
        const results = await getNews(category, limit);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }
      case "search-news": {
        const { keyword, category, limit } = SearchNewsSchema.parse(args);
        const results = await searchNews(keyword, category, limit);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }
      default:
        return {
          content: [{ type: "text", text: `未知のツール: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    console.error("ツール実行エラー:", error);
    return {
      content: [
        {
          type: "text",
          text: `エラー: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// ニュース取得関数
async function getNews(category: string, limit: number = 5): Promise<string> {
  try {
    console.error(`[INFO] ${category}カテゴリのニュースを${limit}件取得します`);
    const url = newsCategoryUrls[category];
    const feed = await parser.parseURL(url);

    // 指定された数の記事を取得
    const articles = feed.items.slice(0, limit);
    console.error(`[INFO] ${articles.length}件の記事を取得しました`);

    // 記事を整形
    const formattedArticles = articles
      .map((item, index) => {
        return `${index + 1}. ${item.title}\n   発行日: ${
          item.pubDate
        }\n   リンク: ${item.link}\n   ${item.contentSnippet || ""}\n`;
      })
      .join("\n");

    return `${category}カテゴリの最新ニュース:\n\n${formattedArticles}`;
  } catch (error) {
    console.error("ニュース取得エラー:", error);
    throw new Error(
      `ニュースの取得中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// ニュース検索関数
async function searchNews(
  keyword: string,
  category: string,
  limit: number = 5
): Promise<string> {
  try {
    console.error(`[INFO] ${category}カテゴリで「${keyword}」を検索します`);
    const url = newsCategoryUrls[category];
    const feed = await parser.parseURL(url);

    // キーワードでフィルタリング
    const filteredArticles = feed.items
      .filter(
        (item) =>
          (item.title && item.title.includes(keyword)) ||
          (item.contentSnippet && item.contentSnippet.includes(keyword))
      )
      .slice(0, limit);

    console.error(
      `[INFO] ${filteredArticles.length}件の関連記事が見つかりました`
    );

    if (filteredArticles.length === 0) {
      return `「${keyword}」に関連するニュースは見つかりませんでした。`;
    }

    // 記事を整形
    const formattedArticles = filteredArticles
      .map((item, index) => {
        return `${index + 1}. ${item.title}\n   発行日: ${
          item.pubDate
        }\n   リンク: ${item.link}\n   ${item.contentSnippet || ""}\n`;
      })
      .join("\n");

    return `「${keyword}」に関連するニュース:\n\n${formattedArticles}`;
  } catch (error) {
    console.error("ニュース検索エラー:", error);
    throw new Error(
      `ニュースの検索中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// サーバーの起動
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Yahoo News MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
