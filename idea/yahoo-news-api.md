# ヤフーニュースAPI実装アイデア

## 概要

MCPサーバーにヤフーニュースの情報を取得して表示する機能を実装するためのアイデアと実装方法をまとめています。

## ヤフーニュースのAPI状況

ヤフーニュースは公式のAPIを提供していません。しかし、以下の代替方法でニュース情報を取得することが可能です。

## ニュース取得の代替方法

### 1. RSS/Atomフィードを利用する

ヤフーニュースはRSSフィードを提供しています。これを利用して最新のニュースを取得できます。

**ヤフーニュースのRSSフィードURL例:**
- 主要ニュース: `https://news.yahoo.co.jp/rss/topics/top-picks.xml`
- 国内: `https://news.yahoo.co.jp/rss/categories/domestic.xml`
- 国際: `https://news.yahoo.co.jp/rss/categories/world.xml`
- 経済: `https://news.yahoo.co.jp/rss/categories/business.xml`
- エンタメ: `https://news.yahoo.co.jp/rss/categories/entertainment.xml`
- スポーツ: `https://news.yahoo.co.jp/rss/categories/sports.xml`
- IT: `https://news.yahoo.co.jp/rss/categories/it.xml`
- 科学: `https://news.yahoo.co.jp/rss/categories/science.xml`

TypeScriptでRSSフィードを解析するには、`rss-parser`などのライブラリを使用できます。

### 2. ニュースAPI

ヤフーニュースの代わりに、以下のような公開APIを使用することもできます：

1. **NewsAPI**: 様々なニュースソースから記事を取得できる
   - URL: https://newsapi.org/
   - 無料プランあり（リクエスト制限あり）

2. **GNEWS API**: グローバルニュースを提供
   - URL: https://gnews.io/
   - 無料プランあり（リクエスト制限あり）

3. **MediaStack**: 世界中のニュースを提供
   - URL: https://mediastack.com/
   - 無料プランあり（リクエスト制限あり）

### 3. Webスクレイピング

最後の手段として、Webスクレイピングを使用することもできますが、以下の点に注意が必要です：
- ヤフーニュースの利用規約に違反する可能性がある
- サイト構造の変更に弱い
- IPブロックなどの対策がある場合がある

## 実装例: RSSフィードを使用したニュース取得

RSSフィードを使用する方法が最も簡単で安全です。以下に、TypeScriptでRSSフィードを解析する実装例を示します：

### 必要なパッケージのインストール

```bash
npm install rss-parser
```

### ニュース取得ツールの実装

```typescript
import Parser from 'rss-parser';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// RSSパーサーのインスタンスを作成
const parser = new Parser();

// ニュースカテゴリとそのRSSフィードURLのマッピング
const newsCategoryUrls: Record<string, string> = {
  "top": "https://news.yahoo.co.jp/rss/topics/top-picks.xml",
  "domestic": "https://news.yahoo.co.jp/rss/categories/domestic.xml",
  "world": "https://news.yahoo.co.jp/rss/categories/world.xml",
  "business": "https://news.yahoo.co.jp/rss/categories/business.xml",
  "entertainment": "https://news.yahoo.co.jp/rss/categories/entertainment.xml",
  "sports": "https://news.yahoo.co.jp/rss/categories/sports.xml",
  "it": "https://news.yahoo.co.jp/rss/categories/it.xml",
  "science": "https://news.yahoo.co.jp/rss/categories/science.xml"
};

// ニュース取得ツールをサーバーに登録する関数
export function registerNewsTools(server: McpServer) {
  server.tool(
    "get-news",
    "指定されたカテゴリの最新ニュースを取得する",
    {
      category: z.enum(["top", "domestic", "world", "business", "entertainment", "sports", "it", "science"])
        .describe("ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)"),
      limit: z.number().min(1).max(20).default(5)
        .describe("取得するニュース記事の数 (最大20)"),
    },
    async ({ category, limit }) => {
      try {
        const url = newsCategoryUrls[category];
        const feed = await parser.parseURL(url);
        
        // 指定された数の記事を取得
        const articles = feed.items.slice(0, limit);
        
        // 記事を整形
        const formattedArticles = articles.map((item, index) => {
          return `${index + 1}. ${item.title}\n   発行日: ${item.pubDate}\n   リンク: ${item.link}\n   ${item.contentSnippet || ''}\n`;
        }).join('\n');
        
        return {
          content: [
            {
              type: "text",
              text: `${category}カテゴリの最新ニュース:\n\n${formattedArticles}`,
            },
          ],
        };
      } catch (error) {
        console.error("ニュース取得エラー:", error);
        return {
          content: [
            {
              type: "text",
              text: `ニュースの取得中にエラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "search-news",
    "キーワードでニュースを検索する",
    {
      keyword: z.string().min(1).describe("検索キーワード"),
      category: z.enum(["top", "domestic", "world", "business", "entertainment", "sports", "it", "science"])
        .default("top")
        .describe("ニュースカテゴリ (top, domestic, world, business, entertainment, sports, it, science)"),
      limit: z.number().min(1).max(20).default(5)
        .describe("取得するニュース記事の数 (最大20)"),
    },
    async ({ keyword, category, limit }) => {
      try {
        const url = newsCategoryUrls[category];
        const feed = await parser.parseURL(url);
        
        // キーワードでフィルタリング
        const filteredArticles = feed.items
          .filter(item => 
            (item.title && item.title.includes(keyword)) || 
            (item.contentSnippet && item.contentSnippet.includes(keyword))
          )
          .slice(0, limit);
        
        if (filteredArticles.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `「${keyword}」に関連するニュースは見つかりませんでした。`,
              },
            ],
          };
        }
        
        // 記事を整形
        const formattedArticles = filteredArticles.map((item, index) => {
          return `${index + 1}. ${item.title}\n   発行日: ${item.pubDate}\n   リンク: ${item.link}\n   ${item.contentSnippet || ''}\n`;
        }).join('\n');
        
        return {
          content: [
            {
              type: "text",
              text: `「${keyword}」に関連するニュース:\n\n${formattedArticles}`,
            },
          ],
        };
      } catch (error) {
        console.error("ニュース検索エラー:", error);
        return {
          content: [
            {
              type: "text",
              text: `ニュースの検索中にエラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
```

### 実装されるツール

このコードでは、以下の2つのツールを実装しています：

1. `get-news`: 指定されたカテゴリの最新ニュースを取得
2. `search-news`: キーワードでニュースを検索

これらのツールをMCPサーバーに登録することで、LLMがニュースを取得・検索できるようになります。

## 注意点

1. RSSフィードには記事の全文が含まれていないことが多いため、タイトルと概要のみが取得できます。
2. 一部のRSSフィードは更新頻度が低い場合があります。
3. 商用利用の場合は、各サービスの利用規約を確認してください。

より詳細な記事内容が必要な場合は、NewsAPIなどの有料APIの使用を検討するか、記事のURLから追加情報を取得する機能を実装する必要があるかもしれません。

## 今後の拡張アイデア

1. **記事の全文取得**: 記事のURLから全文を取得する機能を追加
2. **画像の取得**: 記事に関連する画像を取得して表示
3. **複数ソースの統合**: 複数のニュースソースから情報を取得して統合
4. **パーソナライズ**: ユーザーの興味に基づいてニュースをフィルタリング
5. **要約機能**: LLMを使用して長い記事を要約
6. **関連記事の推奨**: 特定のニュースに関連する他の記事を推奨
