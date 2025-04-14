# MCPサーバー実装例

このドキュメントでは、TypeScriptを使用した基本的なMCPサーバーの実装例を紹介します。この例は、LLMとの会話を可能にする簡単なエコーツールを提供するサーバーを実装しています。

## プロジェクト構造

```
mcp-server/
├── src/
│   ├── server.ts         # MCPサーバーのメイン実装
│   ├── tools/            # ツール実装ディレクトリ
│   │   ├── index.ts      # ツールのエクスポート
│   │   └── echo.ts       # エコーツールの実装
│   └── utils/            # ユーティリティ関数
├── tests/
│   ├── server.test.ts    # サーバーのテスト
│   └── tools/            # ツールのテスト
│       └── echo.test.ts  # エコーツールのテスト
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 依存関係

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.4.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.30",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.2",
    "typescript": "^5.4.2"
  }
}
```

## サーバーの実装

### src/server.ts

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEchoTool } from "./tools/echo.js";

// サーバーインスタンスの作成
const server = new McpServer({
  name: "mcp-conversation-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// ツールの登録
registerEchoTool(server);

// サーバーの起動
async function startServer() {
  try {
    console.log("MCPサーバーを起動しています...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("MCPサーバーが起動しました");
  } catch (error) {
    console.error("サーバーの起動中にエラーが発生しました:", error);
    process.exit(1);
  }
}

// メイン関数
if (require.main === module) {
  startServer();
}

export { server };
```

### src/tools/echo.ts

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * エコーツールをサーバーに登録する関数
 * @param server MCPサーバーインスタンス
 */
export function registerEchoTool(server: McpServer) {
  server.tool(
    "echo",
    "入力されたメッセージをそのまま返すシンプルなツール",
    {
      message: z.string().describe("エコーバックするメッセージ"),
    },
    async ({ message }) => {
      console.log(`エコーツールが呼び出されました: "${message}"`);
      
      return {
        content: [
          {
            type: "text",
            text: `エコー: ${message}`,
          },
        ],
      };
    },
    {
      annotations: {
        title: "エコー",
        readOnlyHint: true,
        openWorldHint: false,
      }
    }
  );
}
```

### src/tools/index.ts

```typescript
export * from "./echo.js";
```

## テストの実装

### tests/tools/echo.test.ts

```typescript
import { registerEchoTool } from "../../src/tools/echo";

describe("エコーツール", () => {
  const mockServer = {
    tool: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("サーバーにエコーツールが正しく登録される", () => {
    registerEchoTool(mockServer as any);
    
    expect(mockServer.tool).toHaveBeenCalledTimes(1);
    expect(mockServer.tool).toHaveBeenCalledWith(
      "echo",
      expect.any(String),
      expect.objectContaining({
        message: expect.any(Object),
      }),
      expect.any(Function),
      expect.objectContaining({
        annotations: expect.objectContaining({
          title: "エコー",
          readOnlyHint: true,
          openWorldHint: false,
        }),
      })
    );
  });

  test("エコーツールが入力メッセージを正しく返す", async () => {
    let toolHandler: Function;
    
    mockServer.tool.mockImplementation((name, desc, schema, handler) => {
      toolHandler = handler;
    });
    
    registerEchoTool(mockServer as any);
    
    const result = await toolHandler({ message: "テストメッセージ" });
    
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "エコー: テストメッセージ",
        },
      ],
    });
  });
});
```

### tests/server.test.ts

```typescript
import { server } from "../src/server";

jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("MCPサーバー", () => {
  test("サーバーが正しく設定されている", () => {
    expect(server).toBeDefined();
    expect(server.implementation.name).toBe("mcp-conversation-server");
    expect(server.implementation.version).toBe("1.0.0");
  });
});
```

## 設定ファイル

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
};
```

## 使用方法

1. プロジェクトをセットアップする：

```bash
mkdir mcp-server
cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install --save-dev @types/jest @types/node jest ts-jest typescript
```

2. 上記のファイルを適切なディレクトリに作成する

3. TypeScriptをコンパイルする：

```bash
npx tsc
```

4. サーバーを実行する：

```bash
node dist/server.js
```

5. テストを実行する：

```bash
npx jest
```

## 拡張方法

このシンプルなサーバーは、以下のように拡張できます：

1. 新しいツールの追加：
   - `src/tools/` ディレクトリに新しいツールファイルを作成
   - `registerXxxTool` 関数を実装
   - `src/tools/index.ts` からエクスポート
   - `src/server.ts` でツールを登録

2. リソースの追加：
   - リソースリストとリソース読み取りのハンドラを実装
   - サーバーの機能にリソースを追加

3. プロンプトの追加：
   - プロンプトリストとプロンプト実行のハンドラを実装
   - サーバーの機能にプロンプトを追加

4. 認証の追加：
   - 認証メカニズムを実装
   - リクエストハンドラで認証チェックを行う

5. ロギングの改善：
   - 構造化ロギングを実装
   - ログレベルを設定可能にする

## まとめ

この実装例は、TypeScriptを使用したシンプルなMCPサーバーの基本構造を示しています。このサーバーは、LLMとの会話を可能にするエコーツールを提供します。この基本的な構造を拡張して、より複雑なツール、リソース、プロンプトを追加することができます。
