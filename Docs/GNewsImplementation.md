# GNews APIを使用したMCPサーバーの実装ガイド

このドキュメントでは、GNews APIを使用してMCPサーバーを実装する方法について説明します。Model Context Protocol (MCP)サーバーを使用することで、LLMとの会話の中でニュース情報を取得する機能を提供できます。

## 目次

1. [前提条件](#前提条件)
2. [プロジェクト構成](#プロジェクト構成)
3. [実装手順](#実装手順)
   - [依存関係のインストール](#依存関係のインストール)
   - [GNews APIクライアントの実装](#gnews-apiクライアントの実装)
   - [MCPツールの定義](#mcpツールの定義)
   - [サーバーの実装](#サーバーの実装)
4. [テスト](#テスト)
5. [デプロイ](#デプロイ)
6. [使用例](#使用例)

## 前提条件

- Node.js (v16以上)
- TypeScript
- GNews APIのAPIキー（[GNews.io](https://gnews.io/register)で取得可能）
- MCP SDKの基本的な理解

## プロジェクト構成

```
mcp-gnews-server/
├── src/
│   ├── index.ts        # メインサーバーファイル
│   ├── gnews.ts        # GNews APIクライアント
│   └── types.ts        # 型定義
├── tests/
│   └── index.test.ts   # テストファイル
├── Docs/
│   ├── GNewsAPI.md     # GNews APIドキュメント
│   └── GNewsImplementation.md # 実装ガイド
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 実装手順

### 依存関係のインストール

まず、必要な依存関係をインストールします。

```bash
npm init -y
npm install @modelcontextprotocol/sdk axios dotenv zod
npm install --save-dev typescript @types/node jest ts-jest @types/jest
```

`package.json`に以下のスクリプトを追加します：

```json
"scripts": {
  "build": "tsc && shx chmod +x dist/*.js",
  "start": "node dist/index.js",
  "dev": "tsc -w",
  "test": "jest"
}
```

### GNews APIクライアントの実装

`src/gnews.ts`ファイルを作成し、GNews APIとの通信を処理するクライアントを実装します：

```typescript
// src/gnews.ts
import axios from 'axios';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// GNews APIのベースURL
const GNEWS_API_BASE_URL = 'https://gnews.io/api/v4';

// APIキーの取得（環境変数から）
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

// GNews APIのレスポンス型
export interface GNewsResponse {
  totalArticles: number;
  articles: Article[];
}

// 記事の型
export interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

/**
 * キーワードでニュース記事を検索する
 * @param keyword 検索キーワード
 * @param lang 言語コード（デフォルト: ja）
 * @param country 国コード（デフォルト: jp）
 * @param max 取得する記事の最大数（デフォルト: 5）
 * @returns 検索結果の記事配列
 */
export async function searchNews(
  keyword: string,
  lang: string = 'ja',
  country: string = 'jp',
  max: number = 5
): Promise<Article[]> {
  try {
    if (!GNEWS_API_KEY) {
      throw new Error('GNews APIキーが設定されていません。');
    }

    console.error(`[INFO] キーワード「${keyword}」で検索します`);
    
    const url = `${GNEWS_API_BASE_URL}/search`;
    const response = await axios.get<GNewsResponse>(url, {
      params: {
        q: keyword,
        lang,
        country,
        max,
        apikey: GNEWS_API_KEY
      }
    });

    console.error(`[INFO] ${response.data.articles.length}件の記事が見つかりました`);
    return response.data.articles;
  } catch (error) {
    console.error('ニュース検索エラー:', error);
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error('APIの日次クォータに達しました。明日再試行してください。');
    }
    throw new Error(
      `ニュースの検索中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * トップヘッドラインのニュース記事を取得する
 * @param category カテゴリ（デフォルト: general）
 * @param lang 言語コード（デフォルト: ja）
 * @param country 国コード（デフォルト: jp）
 * @param max 取得する記事の最大数（デフォルト: 5）
 * @returns トップヘッドラインの記事配列
 */
export async function getTopHeadlines(
  category: string = 'general',
  lang: string = 'ja',
  country: string = 'jp',
  max: number = 5
): Promise<Article[]> {
  try {
    if (!GNEWS_API_KEY) {
      throw new Error('GNews APIキーが設定されていません。');
    }

    console.error(`[INFO] カテゴリ「${category}」のトップヘッドラインを取得します`);
    
    const url = `${GNEWS_API_BASE_URL}/top-headlines`;
    const response = await axios.get<GNewsResponse>(url, {
      params: {
        category,
        lang,
        country,
        max,
        apikey: GNEWS_API_KEY
      }
    });

    console.error(`[INFO] ${response.data.articles.length}件の記事が見つかりました`);
    return response.data.articles;
  } catch (error) {
    console.error('トップヘッドライン取得エラー:', error);
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error('APIの日次クォータに達しました。明日再試行してください。');
    }
    throw new Error(
      `トップヘッドラインの取得中にエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 記事を整形された文字列に変換する
 * @param articles 記事の配列
 * @returns 整形された記事の文字列
 */
export function formatArticles(articles: Article[]): string {
  if (articles.length === 0) {
    return '記事が見つかりませんでした。';
  }

  return articles
    .map((article, index) => {
      return `${index + 1}. ${article.title}\n   発行日: ${
        article.publishedAt
      }\n   ソース: ${article.source.name}\n   リンク: ${article.url}\n   ${
        article.description || ''
      }\n`;
    })
    .join('\n');
}
```

### MCPツールの定義

`src/types.ts`ファイルを作成し、MCPツールの型定義を行います：

```typescript
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
```

### サーバーの実装

`src/index.ts`ファイルを作成し、MCPサーバーを実装します：

```typescript
#!/usr/bin/env node

// src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { searchNews, getTopHeadlines, formatArticles } from './gnews.js';
import { SearchNewsSchema, TopHeadlinesSchema } from './types.js';

// ツール定義
const SEARCH_NEWS_TOOL: Tool = {
  name: 'search-news',
  description:
    'キーワードでニュースを検索する。指定されたキーワードに一致する記事を検索し、タイトル、発行日、リンク、概要を含む記事のリストを返します。',
  inputSchema: zodToJsonSchema(SearchNewsSchema),
};

const TOP_HEADLINES_TOOL: Tool = {
  name: 'get-top-headlines',
  description:
    '指定されたカテゴリの最新トップヘッドラインニュースを取得する。タイトル、発行日、リンク、概要を含む記事のリストを返します。',
  inputSchema: zodToJsonSchema(TopHeadlinesSchema),
};

// サーバーインスタンスの作成
const server = new Server(
  {
    name: 'gnews-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールハンドラー
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [SEARCH_NEWS_TOOL, TOP_HEADLINES_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    if (!args) {
      throw new Error('引数が提供されていません');
    }

    switch (name) {
      case 'search-news': {
        const { keyword, lang, country, max } = SearchNewsSchema.parse(args);
        const articles = await searchNews(keyword, lang, country, max);
        const results = formatArticles(articles);
        return {
          content: [{ type: 'text', text: results }],
          isError: false,
        };
      }
      case 'get-top-headlines': {
        const { category, lang, country, max } = TopHeadlinesSchema.parse(args);
        const articles = await getTopHeadlines(category, lang, country, max);
        const results = formatArticles(articles);
        return {
          content: [{ type: 'text', text: results }],
          isError: false,
        };
      }
      default:
        return {
          content: [{ type: 'text', text: `未知のツール: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    console.error('ツール実行エラー:', error);
    return {
      content: [
        {
          type: 'text',
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
  console.error('GNews MCP Server running on stdio');
}

// サーバー起動
runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
```

## テスト

`tests/index.test.ts`ファイルを作成し、サーバーのテストを実装します：

```typescript
// tests/index.test.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { jest } from '@jest/globals';
import { searchNews, getTopHeadlines } from '../src/gnews.js';

// モック
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined as never),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        name: 'gnews-server',
        version: '0.1.0',
        setRequestHandler: jest.fn(),
        connect: jest.fn(),
      };
    }),
  };
});

jest.mock('../src/gnews.js', () => ({
  searchNews: jest.fn(),
  getTopHeadlines: jest.fn(),
  formatArticles: jest.fn().mockImplementation((articles) => {
    return articles.map((a, i) => `${i + 1}. ${a.title}`).join('\n');
  }),
}));

describe('MCPサーバー', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Serverクラスが正しく初期化される', async () => {
    await import('../src/index.js');

    expect(Server).toHaveBeenCalledWith(
      {
        name: 'gnews-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  });

  test('searchNews関数が正しく呼び出される', async () => {
    const mockArticles = [
      {
        title: 'テスト記事1',
        description: 'テスト説明1',
        content: 'テスト内容1',
        url: 'https://example.com/1',
        image: 'https://example.com/image1.jpg',
        publishedAt: '2023-04-15T12:00:00Z',
        source: {
          name: 'テストソース1',
          url: 'https://example.com',
        },
      },
    ];

    (searchNews as jest.Mock).mockResolvedValue(mockArticles);

    // テスト実装
  });

  test('getTopHeadlines関数が正しく呼び出される', async () => {
    const mockArticles = [
      {
        title: 'テストヘッドライン1',
        description: 'テスト説明1',
        content: 'テスト内容1',
        url: 'https://example.com/1',
        image: 'https://example.com/image1.jpg',
        publishedAt: '2023-04-15T12:00:00Z',
        source: {
          name: 'テストソース1',
          url: 'https://example.com',
        },
      },
    ];

    (getTopHeadlines as jest.Mock).mockResolvedValue(mockArticles);

    // テスト実装
  });
});
```

## デプロイ

### 環境変数の設定

`.env`ファイルを作成し、GNews APIキーを設定します：

```
GNEWS_API_KEY=your_api_key_here
```

### ビルドと実行

```bash
# ビルド
npm run build

# 実行
npm start
```

### Docker化

`Dockerfile`を作成します：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルドファイルのコピー
COPY dist/ ./dist/

# 環境変数の設定
ENV NODE_ENV=production

# サーバーの実行
ENTRYPOINT ["node", "dist/index.js"]
```

Dockerイメージのビルドと実行：

```bash
docker build -t mcp/gnews:latest .
docker run -i --rm -e GNEWS_API_KEY=your_api_key_here mcp/gnews
```

## 使用例

### Claude Desktopでの設定

`claude_desktop_config.json`に以下を追加します：

```json
{
  "mcpServers": {
    "gnews": {
      "command": "node",
      "args": ["path/to/dist/index.js"]
    }
  }
}
```

### 使用例

1. ニュース検索：
   ```
   日本の経済に関する最新ニュースを検索してください
   ```

2. トップヘッドライン取得：
   ```
   テクノロジーカテゴリの最新ヘッドラインを3件取得してください
   ```

3. 特定の言語・国のニュース：
   ```
   アメリカのビジネスニュースを英語で取得してください
   ```

## 注意事項

1. GNews APIの無料プランでは1日100リクエストまでの制限があります。
2. APIキーは環境変数として設定し、コード内にハードコーディングしないでください。
3. 商用利用の場合は、GNews APIの有料プランを検討してください。
4. エラーハンドリングを適切に行い、APIの制限に達した場合のフォールバック処理を実装することをお勧めします。
