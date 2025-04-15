#!/usr/bin/env node

// src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { searchNews, getTopHeadlines, formatArticles } from "./gnews.js";
import { SearchNewsSchema, TopHeadlinesSchema } from "./types.js";

// ツール定義
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

// サーバーインスタンスの作成
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

// APIキーのチェック
if (!process.env.GNEWS_API_KEY) {
  console.error("Error: GNEWS_API_KEY environment variable is required");
  process.exit(1);
}

// ツールハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEARCH_NEWS_TOOL, TOP_HEADLINES_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error("引数が提供されていません");
    }

    switch (name) {
      case "search-news": {
        const { keyword, lang, country, max } = SearchNewsSchema.parse(args);
        const articles = await searchNews(keyword, lang, country, max);
        const results = formatArticles(articles);
        return {
          content: [{ type: "text", text: results }],
          isError: false,
        };
      }
      case "get-top-headlines": {
        const { category, lang, country, max } = TopHeadlinesSchema.parse(args);
        const articles = await getTopHeadlines(category, lang, country, max);
        const results = formatArticles(articles);
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
 * サーバーを起動する
 */
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GNews MCP Server running on stdio");
}

// サーバー起動
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
