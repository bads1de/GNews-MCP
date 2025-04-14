# Discord 翻訳 MCP サーバー構想

## 概要

BOT を登録できない他人のサーバーや公式サーバーの Discord チャット履歴を翻訳するための MCP サーバーの実装アイデアをまとめています。

## 課題

- BOT を登録できない他人のサーバーや公式サーバーのチャット履歴を翻訳したい
- 通常の Discord BOT では、BOT をサーバーに招待する必要がある
- 自分が管理者でないサーバーでは BOT を追加できない

## 実装アプローチ

### 1. Discord User Token を使用したアプローチ

**注意**: このアプローチは Discord の利用規約に違反する可能性があります。教育目的での説明であり、実際の実装は推奨されません。

Discord User Token を使用して、通常のユーザーアカウントとして API にアクセスする方法です。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Client } from "discord.js-selfbot-v13"; // 非公式ライブラリ

// ユーザートークンを使用したクライアント
const client = new Client({
  checkUpdate: false,
});

// 翻訳APIクライアント
const translateText = async (text: string, targetLang: string) => {
  // 翻訳APIの実装（Google Translate APIなど）
  // ...
};

// Discord翻訳ツールをサーバーに登録する関数
export function registerDiscordTranslationTools(server: McpServer) {
  // サーバーにログイン
  client.login("USER_TOKEN_HERE"); // 実際のトークンに置き換える

  server.tool(
    "translate-discord-messages",
    "指定されたDiscordチャンネルのメッセージを翻訳する",
    {
      channelId: z.string().describe("翻訳したいDiscordチャンネルのID"),
      targetLanguage: z
        .string()
        .default("ja")
        .describe("翻訳先の言語コード（例: ja, en, fr）"),
      messageLimit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("取得するメッセージ数（最大50）"),
    },
    async ({ channelId, targetLanguage, messageLimit }) => {
      try {
        // チャンネルを取得
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.isText()) {
          return {
            content: [
              {
                type: "text",
                text: `チャンネルが見つからないか、テキストチャンネルではありません: ${channelId}`,
              },
            ],
          };
        }

        // メッセージを取得
        const messages = await channel.messages.fetch({ limit: messageLimit });

        // メッセージを翻訳
        const translatedMessages = await Promise.all(
          [...messages.values()].map(async (msg) => {
            const translatedContent = await translateText(
              msg.content,
              targetLanguage
            );
            return {
              author: msg.author.tag,
              originalContent: msg.content,
              translatedContent,
              timestamp: msg.createdAt.toISOString(),
            };
          })
        );

        // 結果をフォーマット
        const formattedMessages = translatedMessages
          .map((msg) => {
            return `**${msg.author}** (${msg.timestamp})\n原文: ${msg.originalContent}\n翻訳: ${msg.translatedContent}\n`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `チャンネル ${channel.name} のメッセージ翻訳結果:\n\n${formattedMessages}`,
            },
          ],
        };
      } catch (error) {
        console.error("Discord翻訳エラー:", error);
        return {
          content: [
            {
              type: "text",
              text: `メッセージの翻訳中にエラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
```

**問題点**:

- Discord 利用規約違反の可能性（ユーザーアカウントの自動化は禁止されています）
- アカウント停止のリスク
- セキュリティリスク（ユーザートークンの漏洩）

### 2. Discord 公式 API と Webhook を使用したアプローチ

このアプローチでは、ユーザーが Discord の Web アプリケーションを使用して手動でメッセージをコピーし、MCP サーバーに提供します。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// 翻訳APIクライアント
const translateText = async (text: string, targetLang: string) => {
  // 翻訳APIの実装（Google Translate APIなど）
  // ...
};

// Discord翻訳ツールをサーバーに登録する関数
export function registerDiscordTranslationTools(server: McpServer) {
  server.tool(
    "translate-discord-text",
    "コピーしたDiscordメッセージを翻訳する",
    {
      messages: z.string().describe("翻訳したいDiscordメッセージ（複数行可）"),
      targetLanguage: z
        .string()
        .default("ja")
        .describe("翻訳先の言語コード（例: ja, en, fr）"),
    },
    async ({ messages, targetLanguage }) => {
      try {
        // メッセージを行ごとに分割
        const messageLines = messages
          .split("\n")
          .filter((line) => line.trim() !== "");

        // 各行を翻訳
        const translatedLines = await Promise.all(
          messageLines.map(async (line) => {
            const translatedLine = await translateText(line, targetLanguage);
            return {
              original: line,
              translated: translatedLine,
            };
          })
        );

        // 結果をフォーマット
        const formattedTranslation = translatedLines
          .map((item) => {
            return `原文: ${item.original}\n翻訳: ${item.translated}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `翻訳結果:\n\n${formattedTranslation}`,
            },
          ],
        };
      } catch (error) {
        console.error("翻訳エラー:", error);
        return {
          content: [
            {
              type: "text",
              text: `メッセージの翻訳中にエラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
```

**利点**:

- Discord 利用規約に違反しない
- ユーザートークンを使用しないため安全
- 実装が比較的簡単

**欠点**:

- ユーザーが手動でメッセージをコピーする必要がある
- リアルタイム翻訳ではない
- メッセージの構造（送信者情報など）が失われる可能性がある

### 3. Discord 公式 API と OAuth を使用したアプローチ

このアプローチでは、Discord の OAuth2 認証を使用して、ユーザーの代わりに API にアクセスします。

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import express from "express";
import axios from "axios";

// Express.jsアプリケーションの設定
const app = express();
const PORT = 3000;

// Discord OAuth2の設定
const CLIENT_ID = "YOUR_CLIENT_ID";
const CLIENT_SECRET = "YOUR_CLIENT_SECRET";
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPES = ["identify", "guilds", "messages.read"];

// トークン保存用
let accessToken = null;

// OAuth2認証ページへのリダイレクト
app.get("/login", (req, res) => {
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&response_type=code&scope=${SCOPES.join("%20")}`;
  res.redirect(authUrl);
});

// コールバック処理
app.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.send("認証コードがありません");
  }

  try {
    // アクセストークンを取得
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code.toString(),
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    accessToken = tokenResponse.data.access_token;
    res.send("認証成功！このページを閉じて、MCPサーバーを使用してください。");
  } catch (error) {
    console.error("トークン取得エラー:", error);
    res.send("認証に失敗しました。");
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`認証サーバーが http://localhost:${PORT} で起動しました`);
});

// 翻訳APIクライアント
const translateText = async (text: string, targetLang: string) => {
  // 翻訳APIの実装（Google Translate APIなど）
  // ...
};

// Discord翻訳ツールをサーバーに登録する関数
export function registerDiscordTranslationTools(server: McpServer) {
  server.tool(
    "authenticate-discord",
    "Discord APIへの認証を行う",
    {},
    async () => {
      return {
        content: [
          {
            type: "text",
            text: `以下のURLにアクセスして、Discordアカウントで認証してください:\n\nhttp://localhost:${PORT}/login`,
          },
        ],
      };
    }
  );

  server.tool(
    "translate-discord-channel",
    "指定されたDiscordチャンネルのメッセージを翻訳する",
    {
      channelId: z.string().describe("翻訳したいDiscordチャンネルのID"),
      targetLanguage: z
        .string()
        .default("ja")
        .describe("翻訳先の言語コード（例: ja, en, fr）"),
      messageLimit: z
        .number()
        .min(1)
        .max(50)
        .default(10)
        .describe("取得するメッセージ数（最大50）"),
    },
    async ({ channelId, targetLanguage, messageLimit }) => {
      try {
        if (!accessToken) {
          return {
            content: [
              {
                type: "text",
                text: "Discord APIに認証されていません。まず `authenticate-discord` ツールを使用して認証してください。",
              },
            ],
          };
        }

        // チャンネルのメッセージを取得
        const messagesResponse = await axios.get(
          `https://discord.com/api/v10/channels/${channelId}/messages?limit=${messageLimit}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const messages = messagesResponse.data;

        // メッセージを翻訳
        const translatedMessages = await Promise.all(
          messages.map(async (msg) => {
            if (!msg.content) return null;
            const translatedContent = await translateText(
              msg.content,
              targetLanguage
            );
            return {
              author: msg.author.username,
              originalContent: msg.content,
              translatedContent,
              timestamp: new Date(msg.timestamp).toISOString(),
            };
          })
        );

        // 結果をフォーマット
        const formattedMessages = translatedMessages
          .filter((msg) => msg !== null)
          .map((msg) => {
            return `**${msg.author}** (${msg.timestamp})\n原文: ${msg.originalContent}\n翻訳: ${msg.translatedContent}\n`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `チャンネルのメッセージ翻訳結果:\n\n${formattedMessages}`,
            },
          ],
        };
      } catch (error) {
        console.error("Discord翻訳エラー:", error);
        return {
          content: [
            {
              type: "text",
              text: `メッセージの翻訳中にエラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
```

**利点**:

- Discord 利用規約に準拠
- ユーザーの認証情報を安全に扱える
- API を通じて正確なデータにアクセス可能

**欠点**:

- 実装が複雑
- OAuth2 認証フローの設定が必要
- Discord の API レート制限に注意が必要
- ユーザーがアクセスできるチャンネルのみ翻訳可能

### 4. ブラウザ拡張機能と連携するアプローチ

このアプローチでは、Discord のウェブクライアントで動作するブラウザ拡張機能を作成し、MCP サーバーと連携させます。

1. ブラウザ拡張機能が Discord のウェブクライアント上のメッセージを読み取る
2. 拡張機能が MCP サーバーにメッセージを送信
3. MCP サーバーがメッセージを翻訳して返す
4. 拡張機能が Discord の UI に翻訳結果を表示

**利点**:

- BOT を登録せずに翻訳機能を提供できる
- ユーザーインターフェースを直接拡張できる
- リアルタイム翻訳が可能

**欠点**:

- ブラウザ拡張機能の開発が必要
- Discord のウェブクライアントの変更に脆弱
- 拡張機能のインストールが必要

## 推奨アプローチ

上記の方法を比較すると、以下のアプローチが最も実用的で安全です：

1. **短期的な解決策**: アプローチ 2（手動コピー＋翻訳）

   - 最も簡単に実装でき、Discord 利用規約に違反しない
   - ユーザーが手動でメッセージをコピーする必要があるが、すぐに使用可能

2. **中長期的な解決策**: アプローチ 3（OAuth2 認証）またはアプローチ 4（ブラウザ拡張機能）
   - より良いユーザーエクスペリエンスを提供
   - 実装が複雑だが、より持続可能なソリューション

## 翻訳オプション

### LLM を使用した翻訳

LLM（大規模言語モデル）を使用して翻訳を行うアプローチは、特に Discord のようなカジュアルな会話の翻訳に適しています。

**利点**:

- 文脈を理解した自然な翻訳が可能
- スラングやインターネット用語の翻訳に強い
- 複数言語間の翻訳をシームレスに処理
- MCP の機能を活用して直接 LLM と連携可能

**実装例**:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Discord翻訳ツールをサーバーに登録する関数
export function registerDiscordTranslationTools(server: McpServer) {
  server.tool(
    "translate-discord-text",
    "コピーしたDiscordメッセージをLLMを使用して翻訳する",
    {
      messages: z.string().describe("翻訳したいDiscordメッセージ（複数行可）"),
      sourceLanguage: z
        .string()
        .optional()
        .describe("元の言語（自動検出する場合は省略可）"),
      targetLanguage: z
        .string()
        .default("ja")
        .describe("翻訳先の言語（例: 日本語, 英語, フランス語）"),
    },
    async ({ messages, sourceLanguage, targetLanguage }) => {
      try {
        // MCPのサンプリング機能を使用してLLMに翻訳をリクエスト
        const samplingResult = await server.createMessage({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `以下のテキストを${
                  sourceLanguage ? sourceLanguage + "から" : ""
                }${targetLanguage}に翻訳してください。元のテキストの意味とニュアンスを保ちつつ、自然な${targetLanguage}になるようにしてください。特にDiscordのチャットで使われる略語やスラングの意味を理解して適切に翻訳してください。\n\n${messages}`,
              },
            },
          ],
          maxTokens: 2000,
        });

        return {
          content: [
            {
              type: "text",
              text: `翻訳結果:\n\n${samplingResult.content.text}`,
            },
          ],
        };
      } catch (error) {
        console.error("翻訳エラー:", error);
        return {
          content: [
            {
              type: "text",
              text: `メッセージの翻訳中にエラーが発生しました: ${error.message}`,
            },
          ],
        };
      }
    }
  );
}
```

### 従来の翻訳 API

従来の翻訳 API も選択肢として考慮できます：

1. **Google Cloud Translation API**

   - 高品質な翻訳
   - 多数の言語をサポート
   - 有料（無料枠あり）

2. **DeepL API**

   - 非常に高品質な翻訳
   - 主要言語をサポート
   - 有料（無料枠あり）

3. **Microsoft Translator API**

   - Azure Cognitive Services の一部
   - 多数の言語をサポート
   - 有料（無料枠あり）

4. **LibreTranslate**
   - オープンソースの翻訳 API
   - セルフホスト可能
   - 無料

## 実装ステップ

### 短期的な解決策（手動コピー＋翻訳）の実装手順

1. MCP サーバープロジェクトをセットアップ
2. LLM を使用した翻訳機能を実装
3. テキスト翻訳ツールを実装
4. テストとデバッグ
5. ドキュメントの作成

### 中長期的な解決策（OAuth2 認証）の実装手順

1. Discord Developer Portal でアプリケーションを作成
2. OAuth2 認証フローを実装
3. Discord API クライアントを実装
4. LLM を使用した翻訳機能を実装
5. MCP ツールを実装
6. テストとデバッグ
7. ドキュメントの作成

## 注意点

1. Discord 利用規約を遵守すること
2. ユーザーのプライバシーとセキュリティを保護すること
3. API レート制限に注意すること
4. エラー処理を適切に実装すること
5. LLM の利用規約と料金に注意すること
