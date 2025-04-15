// src/index.ts
// =========================
// [EN] Entry point for GNews MCP Server
// Provides news search and top headlines retrieval tools as an MCP server
//
// [JA] GNews MCPサーバーのエントリーポイント
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
 * [EN] Definition of the news search tool
 *
 * - name: Tool name
 * - description: Tool description
 * - inputSchema: Input parameter schema
 *
 * [JA] ニュース検索ツールの定義
 *
 * - name: ツール名
 * - description: ツールの説明
 * - inputSchema: 入力パラメータのスキーマ
 */
const SEARCH_NEWS_TOOL: Tool = {
  name: "search-news",
  description:
    "Search for news articles by keyword. Returns a list of articles matching the specified keyword, including title, publication date, link, and description.",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        minLength: 1,
        description: "Search keyword",
      },
      lang: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "ja",
        description: "Language code (e.g. ja, en, fr)",
      },
      country: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "jp",
        description: "Country code (e.g. jp, us, gb)",
      },
      max: {
        type: "number",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "Number of news articles to retrieve (max 10, default 5)",
      },
    },
    required: ["keyword"],
  },
};

/**
 * [EN] Definition of the top headlines tool
 *
 * - name: Tool name
 * - description: Tool description
 * - inputSchema: Input parameter schema
 *
 * [JA] トップヘッドライン取得ツールの定義
 *
 * - name: ツール名
 * - description: ツールの説明
 * - inputSchema: 入力パラメータのスキーマ
 */
const TOP_HEADLINES_TOOL: Tool = {
  name: "get-top-headlines",
  description:
    "Get the latest top headline news for the specified category. Returns a list of articles including title, publication date, link, and description.",
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
        description: "News category",
      },
      lang: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "ja",
        description: "Language code (e.g. ja, en, fr)",
      },
      country: {
        type: "string",
        minLength: 2,
        maxLength: 2,
        default: "jp",
        description: "Country code (e.g. jp, us, gb)",
      },
      max: {
        type: "number",
        minimum: 1,
        maximum: 10,
        default: 5,
        description: "Number of news articles to retrieve (max 10, default 5)",
      },
    },
  },
};

/**
 * [EN] Create server instance
 * Initialize MCP server. capabilities.tools is initialized empty, and tools are registered later with setRequestHandler.
 *
 * [JA] サーバーインスタンスの作成
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
// [EN] Critical point: API key existence check
// If GNEWS_API_KEY is not set before server startup, exit immediately with an error.
// This prevents unexpected behavior when API key is not set.
//
// [JA] 難所: APIキーの存在チェック
// サーバー起動前にGNEWS_API_KEYが設定されていない場合は即座にエラー終了する。
// ここで止めることで、APIキー未設定時の予期せぬ挙動を防ぐ。
// =========================
if (!process.env.GNEWS_API_KEY) {
  console.error("Error: GNEWS_API_KEY environment variable is required");
  process.exit(1);
}

/**
 * [EN] Handler for list tools request
 * Returns available tools in response to ListToolsRequestSchema.
 *
 * [JA] ツール一覧リクエストのハンドラー
 * ListToolsRequestSchemaに対して、利用可能なツールを返す。
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEARCH_NEWS_TOOL, TOP_HEADLINES_TOOL],
}));

/**
 * [EN] Handler for call tool request
 *
 * - name: Name of the tool to call
 * - arguments: Arguments to the tool
 *
 * Critical point: Validate input with schema for each tool,
 *        return errors via catch block if validation fails.
 *        Design uses exception handling to return error details to the user.
 *
 * [JA] ツール呼び出しリクエストのハンドラー
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
      throw new Error("No arguments provided");
    }

    switch (name) {
      case "search-news": {
        // [EN] Critical point: Input validation (zod schema)
        // If input is invalid, an exception will be thrown
        // [JA] 難所: 入力バリデーション（zodスキーマ）
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
        // [EN] Critical point: Input validation (zod schema)
        // [JA] 難所: 入力バリデーション（zodスキーマ）
        const { category, lang, country, max } = TopHeadlinesSchema.parse(args);

        const articles = await getTopHeadlines(category, lang, country, max);
        const results = formatArticles(articles);

        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }

      default:
        // [EN] Error response for unknown tool name
        // [JA] 未知のツール名が指定された場合のエラー応答
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    // [EN] Critical point: Error handling for exceptions
    // Branch message based on whether error is Error type
    // [JA] 難所: 例外発生時のエラーハンドリング
    // errorがError型かどうかでメッセージを分岐
    console.error("Tool execution error:", error);

    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * [EN] Function to start the server
 *
 * Critical point: Start server with stdio transport,
 *       wait for connection completion asynchronously.
 *       Log fatal errors with catch block.
 *
 * [JA] サーバーを起動する関数
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
// [EN] Server startup
// Catch errors from runServer(),
// and exit the process as a fatal error.
//
// [JA] サーバー起動
// runServer()のエラーはcatchで捕捉し、
// 致命的エラーとしてプロセスを終了する。
// =========================
runServer().catch((error) => {
  console.error("Fatal error running server:", error);

  process.exit(1);
});
