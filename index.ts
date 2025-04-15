#!/usr/bin/env node

// Model Context Protocol (MCP) SDKからサーバー関連のクラスや型をインポート
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
// RSSフィードを解析するためのライブラリをインポート
import Parser from "rss-parser";
// データバリデーションライブラリZodをインポート
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// RSSパーサーのインスタンスを作成
const parser = new Parser();

// ニュースカテゴリとそのRSSフィードURLのマッピング
// Yahoo!ニュースのカテゴリ名と対応するRSSフィードURLをマッピングするオブジェクト
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
// Zodを使用してget-newsツールの入力引数のスキーマを定義
// category: 必須、enumで定義されたカテゴリのみ許可
// limit: オプション、数値型、最小1、最大20、デフォルト5
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

// Zodを使用してsearch-newsツールの入力引数のスキーマを定義
// keyword: 必須、文字列型、最小1文字
// category: オプション、enumで定義されたカテゴリのみ許可、デフォルト'top'
// limit: オプション、数値型、最小1、最大20、デフォルト5
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
// get-newsツールの定義オブジェクト
// name: ツール名
// description: ツールの説明
// inputSchema: 入力引数のスキーマ (JSON Schema形式)
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

// search-newsツールの定義オブジェクト
// name: ツール名
// description: ツールの説明
// inputSchema: 入力引数のスキーマ (JSON Schema形式)
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
// MCPサーバーのインスタンスを作成
// 第一引数: サーバーのメタデータ (名前、バージョン)
// 第二引数: サーバーの機能設定 (ここではツール機能のみ有効化)
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
// ListToolsリクエストに対するハンドラーを登録
// このハンドラーは、サーバーが提供するツールのリストを返す
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [GET_NEWS_TOOL, SEARCH_NEWS_TOOL],
}));

// CallToolリクエストに対するハンドラーを登録
// このハンドラーは、指定されたツール名に基づいて処理を分岐し、実行結果を返す
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("引数が提供されていません");
    }

    switch (name) {
      case "get-news": {
        // get-newsツールの場合、引数をGetNewsSchemaでパース・バリデーション
        const { category, limit } = GetNewsSchema.parse(args);
        const results = await getNews(category, limit);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }
      case "search-news": {
        // search-newsツールの場合、引数をSearchNewsSchemaでパース・バリデーション
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

/**
 * 指定されたカテゴリのニュースを取得する
 * @param {string} category - ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)
 * @param {number} [limit=5] - 取得する記事の数 (1-20)
 * @returns {Promise<string>} フォーマットされたニュース記事の文字列
 * @throws {Error} ニュース取得に失敗した場合
 */
async function getNews(category: string, limit: number = 5): Promise<string> {
  try {
    console.error(`[INFO] ${category}カテゴリのニュースを${limit}件取得します`);
    const url = newsCategoryUrls[category];
    // カテゴリに対応するURLからRSSフィードを取得・解析
    const feed = await parser.parseURL(url);

    // 指定された数の記事を取得
    // 取得した記事を指定されたlimit数に制限
    const articles = feed.items.slice(0, limit);
    console.error(`[INFO] ${articles.length}件の記事を取得しました`);

    // 記事を整形
    // 取得した記事を指定のフォーマットに整形
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

/**
 * 指定されたキーワードとカテゴリでニュースを検索する
 * @param {string} keyword - 検索キーワード
 * @param {string} category - ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)
 * @param {number} [limit=5] - 取得する記事の数 (1-20)
 * @returns {Promise<string>} フォーマットされたニュース記事の文字列
 * @throws {Error} ニュース検索に失敗した場合
 */
async function searchNews(
  keyword: string,
  category: string,
  limit: number = 5
): Promise<string> {
  try {
    console.error(`[INFO] ${category}カテゴリで「${keyword}」を検索します`);
    const url = newsCategoryUrls[category];
    // カテゴリに対応するURLからRSSフィードを取得・解析
    const feed = await parser.parseURL(url);

    // キーワードでフィルタリング
    // 取得した記事をキーワードでフィルタリング (タイトルまたは概要に含まれるか)
    // フィルタリング後、指定されたlimit数に制限
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
    // フィルタリングされた記事を指定のフォーマットに整形
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

/**
 * サーバーを起動する
 * @returns {Promise<void>}
 * @throws {Error} サーバー起動に失敗した場合
 */
async function runServer() {
  // 標準入出力 (stdio) を使用するトランスポートを作成
  const transport = new StdioServerTransport();
  // 作成したトランスポートを使用してサーバーを接続・起動
  await server.connect(transport);
  console.error("Yahoo News MCP Server running on stdio");
}

// サーバー起動関を実行し、致命的なエラーが発生した場合はログに出力してプロセスを終了
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
