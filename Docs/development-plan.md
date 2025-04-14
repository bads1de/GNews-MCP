# MCPサーバー開発計画 (TypeScript)

## 1. プロジェクトの目的と概要

MCPサーバー（Model Context Protocol）は、LLMと会話するためのプロトコルを実装するサーバーです。このプロジェクトでは、TypeScriptを使用してMCPサーバーを実装し、LLMとの対話を可能にします。

MCPは、Anthropicが開発したオープンプロトコルで、アプリケーションがLLMにコンテキストを提供する方法を標準化します。MCPはAIアプリケーション用のUSB-Cポートのようなものと考えることができます。USB-Cがデバイスを様々な周辺機器やアクセサリに接続するための標準化された方法を提供するように、MCPはAIモデルを異なるデータソースやツールに接続するための標準化された方法を提供します。

## 2. 技術スタック

- **言語**: TypeScript
- **ランタイム**: Node.js
- **パッケージマネージャー**: npm または yarn
- **テストフレームワーク**: Jest
- **MCP SDK**: @modelcontextprotocol/sdk

## 3. プロジェクト構造

```
mcp-server/
├── src/
│   ├── server.ts         # MCPサーバーのメイン実装
│   ├── tools/            # ツール実装ディレクトリ
│   │   ├── index.ts      # ツールのエクスポート
│   │   └── ...          # 各ツールの実装
│   ├── resources/        # リソース実装ディレクトリ
│   │   ├── index.ts      # リソースのエクスポート
│   │   └── ...          # 各リソースの実装
│   └── utils/            # ユーティリティ関数
├── tests/
│   ├── server.test.ts    # サーバーのテスト
│   ├── tools/            # ツールのテスト
│   └── resources/        # リソースのテスト
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## 4. 開発フェーズ

### フェーズ1: プロジェクトセットアップとMCP基本実装

1. **プロジェクト初期化**
   - TypeScriptプロジェクトの設定
   - 必要な依存関係のインストール
   - 設定ファイルの作成（tsconfig.json, jest.config.js）

2. **基本的なMCPサーバー実装**
   - MCP SDKを使用した基本サーバーの実装
   - サーバー起動と接続処理の実装
   - 基本的なエラーハンドリング

3. **テスト環境の構築**
   - Jestの設定
   - 基本的なサーバーテストの実装

### フェーズ2: ツールとリソースの実装

1. **基本ツールの実装**
   - シンプルなツール（例：エコーツール、計算ツールなど）の実装
   - ツール登録メカニズムの実装
   - ツールのテスト実装

2. **リソースの実装**
   - 基本的なリソース（例：テキストファイル、JSONデータなど）の実装
   - リソースアクセスメカニズムの実装
   - リソースのテスト実装

### フェーズ3: LLM対話機能の実装

1. **LLM対話プロトコルの実装**
   - メッセージフォーマットの定義
   - 会話履歴の管理
   - プロンプト処理の実装

2. **対話フローのテスト**
   - 会話シナリオのテスト
   - エッジケースの処理

### フェーズ4: 拡張機能と最適化

1. **高度なツールの実装**
   - 外部APIとの連携
   - データ処理ツールの実装

2. **パフォーマンス最適化**
   - 応答時間の改善
   - メモリ使用量の最適化

3. **セキュリティ強化**
   - 入力検証の強化
   - 認証・認可メカニズムの実装（必要に応じて）

## 5. テスト戦略

TDD（テスト駆動開発）アプローチを採用します：

1. **ユニットテスト**
   - 各コンポーネント（ツール、リソース、ユーティリティ）の個別テスト
   - モックとスタブを使用した依存関係の分離

2. **統合テスト**
   - サーバーとコンポーネントの連携テスト
   - エンドツーエンドのフロー検証

3. **パフォーマンステスト**
   - 負荷テスト（必要に応じて）
   - メモリリークのチェック

## 6. 実装詳細

### MCPサーバーの基本構造

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// サーバーインスタンスの作成
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// ツールの登録
server.tool(
  "echo",
  "入力されたメッセージをエコーバックする",
  {
    message: z.string().describe("エコーバックするメッセージ"),
  },
  async ({ message }) => {
    return {
      content: [
        {
          type: "text",
          text: `エコー: ${message}`,
        },
      ],
    };
  }
);

// サーバーの起動
const transport = new StdioServerTransport();
server.connect(transport);
```

### ツール実装の例

```typescript
// src/tools/calculator.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerCalculatorTool(server: McpServer) {
  server.tool(
    "calculate",
    "基本的な算術演算を実行する",
    {
      operation: z.enum(["add", "subtract", "multiply", "divide"]).describe("実行する演算"),
      a: z.number().describe("最初のオペランド"),
      b: z.number().describe("2番目のオペランド"),
    },
    async ({ operation, a, b }) => {
      let result: number;
      
      switch (operation) {
        case "add":
          result = a + b;
          break;
        case "subtract":
          result = a - b;
          break;
        case "multiply":
          result = a * b;
          break;
        case "divide":
          if (b === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "エラー: ゼロによる除算",
                },
              ],
            };
          }
          result = a / b;
          break;
      }
      
      return {
        content: [
          {
            type: "text",
            text: `結果: ${result}`,
          },
        ],
      };
    }
  );
}
```

## 7. 今後の拡張可能性

1. **プラグインシステム**
   - 外部ツールやリソースを簡単に追加できるプラグインアーキテクチャ

2. **WebSocketサポート**
   - リアルタイム通信のためのWebSocketトランスポート実装

3. **UI連携**
   - フロントエンドとの連携のためのAPIエンドポイント

4. **多言語サポート**
   - 複数言語での対話サポート

## 8. 開発スケジュール案

1. **フェーズ1**: 1週間
2. **フェーズ2**: 2週間
3. **フェーズ3**: 2週間
4. **フェーズ4**: 3週間

合計: 約8週間（スケジュールは調整可能）

## 9. 学習リソース

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [TypeScript SDK ドキュメント](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP サーバー実装例](https://github.com/modelcontextprotocol/quickstart-resources/tree/main/weather-server-typescript)

## 10. 実装ステップ詳細

### ステップ1: プロジェクト初期化

1. プロジェクトディレクトリを作成
   ```bash
   mkdir mcp-server
   cd mcp-server
   ```

2. npmプロジェクトを初期化
   ```bash
   npm init -y
   ```

3. 必要な依存関係をインストール
   ```bash
   npm install @modelcontextprotocol/sdk zod
   npm install --save-dev typescript @types/node jest ts-jest @types/jest
   ```

4. TypeScript設定ファイルを作成
   ```bash
   npx tsc --init
   ```

5. Jest設定ファイルを作成
   ```bash
   echo "module.exports = { preset: 'ts-jest', testEnvironment: 'node' };" > jest.config.js
   ```

### ステップ2: 基本的なサーバー実装

1. サーバーの基本構造を実装
   - `src/server.ts` ファイルを作成
   - MCPサーバーインスタンスを設定
   - 標準入出力トランスポートを設定

2. エラーハンドリングを実装
   - 例外処理の追加
   - エラーログの実装

3. サーバー起動スクリプトを実装
   - package.jsonにスクリプトを追加
   - 起動コマンドを実装

### ステップ3: 基本ツールの実装

1. エコーツールを実装
   - `src/tools/echo.ts` ファイルを作成
   - ツール登録関数を実装
   - サーバーにツールを登録

2. 計算ツールを実装
   - `src/tools/calculator.ts` ファイルを作成
   - 基本的な算術演算を実装
   - サーバーにツールを登録

### ステップ4: テストの実装

1. サーバーのテストを実装
   - `tests/server.test.ts` ファイルを作成
   - サーバー初期化のテスト
   - エラーハンドリングのテスト

2. ツールのテストを実装
   - `tests/tools/echo.test.ts` ファイルを作成
   - `tests/tools/calculator.test.ts` ファイルを作成
   - ツール機能のテスト

### ステップ5: リソースの実装

1. テキストリソースを実装
   - `src/resources/text.ts` ファイルを作成
   - テキストリソース管理を実装
   - サーバーにリソースハンドラを登録

2. リソースのテストを実装
   - `tests/resources/text.test.ts` ファイルを作成
   - リソースアクセスのテスト

### ステップ6: LLM対話機能の実装

1. メッセージフォーマットを定義
   - `src/utils/message.ts` ファイルを作成
   - メッセージ型を定義

2. 会話履歴管理を実装
   - `src/utils/conversation.ts` ファイルを作成
   - 会話履歴の保存と取得を実装

3. プロンプト処理を実装
   - `src/prompts/index.ts` ファイルを作成
   - プロンプトテンプレートを実装

### ステップ7: 高度なツールの実装

1. 外部API連携ツールを実装
   - `src/tools/api.ts` ファイルを作成
   - 外部APIリクエスト処理を実装

2. データ処理ツールを実装
   - `src/tools/data.ts` ファイルを作成
   - データ変換・分析機能を実装

### ステップ8: パフォーマンス最適化とセキュリティ強化

1. パフォーマンス最適化
   - キャッシュメカニズムの実装
   - 非同期処理の最適化

2. セキュリティ強化
   - 入力検証の強化
   - レート制限の実装
   - ログのサニタイズ

この計画は、MCPサーバーの開発を体系的に進めるためのガイドラインです。実際の開発過程で調整や変更が必要になる場合があります。
