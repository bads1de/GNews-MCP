#!/usr/bin/env node

// src/index.ts
// =========================
// GNews MCPサーバーのエントリーポイント
// ニュース検索・トップヘッドライン取得のツールをMCPサーバーとして提供
// =========================

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { searchNews, getTopHeadlines, formatArticles } from "./gnews.js";
import { SearchNewsSchema, TopHeadlinesSchema } from "./types.js";

/**
 * ニュース検索ツールの定義
 *
 * - name: ツール名
 * - description: ツールの説明
 * - inputSchema: 入力パラメータのスキーマ
 */
const SEARCH_NEWS_TOOL: Tool = {
  name: "search-news",
  description:
    "キーワードでニュースを検索する。指定されたキーワードに一致する記事を検索し、タイトル、発行日、リンク、概要を含む記事のリストを返します。",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        minLength: 1,
        description: "検索キーワード",
      },
      lang: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "ja",
        description: "言語コード（例: ja, en, fr）",
      },
      country: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "jp",
        description: "国コード（例: jp, us, gb）",
      },
      max: {
        type: "number",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "取得するニュース記事の数（最大10）",
      },
    },
    required: ["keyword"],
  },
};

/**
 * トップヘッドライン取得ツールの定義
 *
 * - name: ツール名
 * - description: ツールの説明
 * - inputSchema: 入力パラメータのスキーマ
 */
const TOP_HEADLINES_TOOL: Tool = {
  name: "get-top-headlines",
  description:
    "指定されたカテゴリの最新トップヘッドラインニュースを取得する。タイトル、発行日、リンク、概要を含む記事のリストを返します。",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: [
          "general",
          "world",
          "nation",
          "business",
          "technology",
          "entertainment",
          "sports",
          "science",
          "health",
        ],
        default: "general",
        description: "ニュースカテゴリ",
      },
      lang: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "ja",
        description: "言語コード（例: ja, en, fr）",
      },
      country: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "jp",
        description: "国コード（例: jp, us, gb）",
      },
      max: {
        type: "number",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "取得するニュース記事の数（最大10）",
      },
    },
  },
};

/**
 * サーバーインスタンスの作成
 * MCPサーバーの初期化。capabilities.toolsは空で初期化し、後でsetRequestHandlerでツールを登録する。
 */
const server = new Server(
  {
    name: "gnews-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// =========================
// 難所: APIキーの存在チェック
// サーバー起動前にGNEWS_API_KEYが設定されていない場合は即座にエラー終了する。
// ここで止めることで、APIキー未設定時の予期せぬ挙動を防ぐ。
// =========================
if (!process.env.GNEWS_API_KEY) {
  console.error("Error: GNEWS_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * ツール一覧リクエストのハンドラー
 * ListToolsRequestSchemaに対して、利用可能なツールを返す。
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEARCH_NEWS_TOOL, TOP_HEADLINES_TOOL],
}));

/**
 * ツール呼び出しリクエストのハンドラー
 *
 * - name: 呼び出すツール名
 * - arguments: ツールへの引数
 *
 * 難所: ツールごとに入力スキーマでバリデーションし、
 *        失敗時はcatchでエラーを返す。
 *        例外処理でエラー内容をユーザーに返す設計。
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("引数が提供されていません");
    }

    switch (name) {
      case "search-news": {
        // 難所: 入力バリデーション（zodスキーマ）
        // 入力値が不正な場合は例外が投げられる
        const { keyword, lang, country, max } = SearchNewsSchema.parse(args);
        const articles = await searchNews(keyword, lang, country, max);
        const results = formatArticles(articles);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }
      case "get-top-headlines": {
        // 難所: 入力バリデーション（zodスキーマ）
        const { category, lang, country, max } = TopHeadlinesSchema.parse(args);
        const articles = await getTopHeadlines(category, lang, country, max);
        const results = formatArticles(articles);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }
      default:
        // 未知のツール名が指定された場合のエラー応答
        return {
          content: [{ type: "text", text: `未知のツール: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    // 難所: 例外発生時のエラーハンドリング
    // errorがError型かどうかでメッセージを分岐
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
 * サーバーを起動する関数
 *
 * 難所: stdioトランスポートでサーバーを起動し、
 *       非同期で接続完了を待つ。
 *       エラー時はcatchで致命的エラーとしてログ出力。
 */
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GNews MCP Server running on stdio");
}

// =========================
// サーバー起動
// runServer()のエラーはcatchで捕捉し、
// 致命的エラーとしてプロセスを終了する。
// =========================
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
