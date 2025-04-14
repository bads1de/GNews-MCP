# ツール

サーバーを通じてLLMがアクションを実行できるようにする

ツールは、Model Context Protocol (MCP)の強力なプリミティブであり、サーバーがクライアントに実行可能な機能を公開することを可能にします。ツールを通じて、LLMは外部システムと対話し、計算を実行し、現実世界でアクションを取ることができます。

ツールは**モデル制御**されるように設計されています。つまり、ツールはサーバーからクライアントに公開され、AIモデルが自動的に呼び出すことができるようになっています（承認を与えるための人間が介在します）。

## 概要

MCPのツールにより、サーバーはクライアントによって呼び出され、LLMがアクションを実行するために使用できる実行可能な関数を公開することができます。ツールの主な側面には以下が含まれます：

* **発見**：クライアントは`tools/list`エンドポイントを通じて利用可能なツールをリストアップできます
* **呼び出し**：ツールは`tools/call`エンドポイントを使用して呼び出され、サーバーは要求された操作を実行し結果を返します
* **柔軟性**：ツールは単純な計算から複雑なAPI対話まで多岐にわたります

[リソース](/docs/concepts/resources)と同様に、ツールは一意の名前で識別され、その使用方法を導くための説明を含めることができます。ただし、リソースとは異なり、ツールは状態を変更したり外部システムと対話したりできる動的な操作を表します。

## ツール定義構造

各ツールは以下の構造で定義されます：

```json
{
  name: string;          // ツールの一意の識別子
  description?: string;  // 人間が読める説明
  inputSchema: {         // ツールのパラメータのJSONスキーマ
    type: "object",
    properties: { ... }  // ツール固有のパラメータ
  },
  annotations?: {        // ツールの動作に関するオプションのヒント
    title?: string;      // ツールの人間が読めるタイトル
    readOnlyHint?: boolean;    // trueの場合、ツールは環境を変更しない
    destructiveHint?: boolean; // trueの場合、ツールは破壊的な更新を実行する可能性がある
    idempotentHint?: boolean;  // trueの場合、同じ引数での繰り返し呼び出しは追加の効果がない
    openWorldHint?: boolean;   // trueの場合、ツールは外部エンティティと対話する
  }
}
```

## ツールの実装

以下はMCPサーバーで基本的なツールを実装する例です：

### TypeScript
```typescript
const server = new Server({
  name: "example-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// 利用可能なツールを定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "calculate_sum",
      description: "2つの数値を足し合わせる",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" }
        },
        required: ["a", "b"]
      }
    }]
  };
});

// ツール実行を処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "calculate_sum") {
    const { a, b } = request.params.arguments;
    return {
      content: [
        {
          type: "text",
          text: String(a + b)
        }
      ]
    };
  }
  throw new Error("ツールが見つかりません");
});
```

### Python
```python
app = Server("example-server")

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="calculate_sum",
            description="2つの数値を足し合わせる",
            inputSchema={
                "type": "object",
                "properties": {
                    "a": {"type": "number"},
                    "b": {"type": "number"}
                },
                "required": ["a", "b"]
            }
        )
    ]

@app.call_tool()
async def call_tool(
    name: str,
    arguments: dict
) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
    if name == "calculate_sum":
        a = arguments["a"]
        b = arguments["b"]
        result = a + b
        return [types.TextContent(type="text", text=str(result))]
    raise ValueError(f"ツールが見つかりません: {name}")
```

## ツールパターンの例

サーバーが提供できるツールの種類の例をいくつか紹介します：

### システム操作

ローカルシステムと対話するツール：

```json
{
  name: "execute_command",
  description: "シェルコマンドを実行する",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      args: { type: "array", items: { type: "string" } }
    }
  }
}
```

### API統合

外部APIをラップするツール：

```json
{
  name: "github_create_issue",
  description: "GitHubイシューを作成する",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      labels: { type: "array", items: { type: "string" } }
    }
  }
}
```

### データ処理

データを変換または分析するツール：

```json
{
  name: "analyze_csv",
  description: "CSVファイルを分析する",
  inputSchema: {
    type: "object",
    properties: {
      filepath: { type: "string" },
      operations: {
        type: "array",
        items: {
          enum: ["sum", "average", "count"]
        }
      }
    }
  }
}
```

## ベストプラクティス

ツールを実装する際には：

1. 明確で説明的な名前と説明を提供する
2. パラメータの詳細なJSONスキーマ定義を使用する
3. モデルがどのように使用すべきかを示すために、ツールの説明に例を含める
4. 適切なエラー処理と検証を実装する
5. 長い操作には進捗報告を使用する
6. ツール操作を焦点を絞って原子的に保つ
7. 期待される戻り値構造をドキュメント化する
8. 適切なタイムアウトを実装する
9. リソース集約的な操作にはレート制限を検討する
10. デバッグとモニタリングのためにツールの使用をログに記録する

## セキュリティの考慮事項

ツールを公開する際には：

### 入力検証

* すべてのパラメータをスキーマに対して検証する
* ファイルパスとシステムコマンドをサニタイズする
* URLと外部識別子を検証する
* パラメータのサイズと範囲をチェックする
* コマンドインジェクションを防止する

### アクセス制御

* 必要に応じて認証を実装する
* 適切な認可チェックを使用する
* ツールの使用を監査する
* リクエストをレート制限する
* 悪用を監視する

### エラー処理

* 内部エラーをクライアントに公開しない
* セキュリティ関連のエラーをログに記録する
* タイムアウトを適切に処理する
* エラー後にリソースをクリーンアップする
* 戻り値を検証する

## ツールの発見と更新

MCPは動的なツール発見をサポートしています：

1. クライアントはいつでも利用可能なツールをリストアップできる
2. サーバーはツールが変更されたときに`notifications/tools/list_changed`を使用してクライアントに通知できる
3. ツールは実行時に追加または削除できる
4. ツール定義は更新できる（ただし、これは慎重に行うべき）

## エラー処理

ツールのエラーは、MCPプロトコルレベルのエラーとしてではなく、結果オブジェクト内で報告する必要があります。これにより、LLMはエラーを確認し、潜在的に処理することができます。ツールがエラーに遭遇した場合：

1. 結果で`isError`を`true`に設定する
2. `content`配列にエラーの詳細を含める

以下はツールの適切なエラー処理の例です：

### TypeScript
```typescript
try {
  // ツール操作
  const result = performOperation();
  return {
    content: [
      {
        type: "text",
        text: `操作成功: ${result}`
      }
    ]
  };
} catch (error) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `エラー: ${error.message}`
      }
    ]
  };
}
```

### Python
```python
try:
    # ツール操作
    result = perform_operation()
    return types.CallToolResult(
        content=[
            types.TextContent(
                type="text",
                text=f"操作成功: {result}"
            )
        ]
    )
except Exception as error:
    return types.CallToolResult(
        isError=True,
        content=[
            types.TextContent(
                type="text",
                text=f"エラー: {str(error)}"
            )
        ]
    )
```

このアプローチにより、LLMはエラーが発生したことを確認し、潜在的に修正アクションを取ったり人間の介入を要求したりすることができます。

## ツールアノテーション

ツールアノテーションは、ツールの動作に関する追加のメタデータを提供し、クライアントがツールをどのように表示および管理するかを理解するのに役立ちます。これらのアノテーションは、ツールの性質と影響を説明するヒントですが、セキュリティ決定のために依存すべきではありません。

### ツールアノテーションの目的

ツールアノテーションはいくつかの主要な目的を果たします：

1. モデルコンテキストに影響を与えずにUX固有の情報を提供する
2. クライアントがツールを適切に分類および表示するのを支援する
3. ツールの潜在的な副作用に関する情報を伝える
4. ツール承認のための直感的なインターフェースの開発を支援する

### 利用可能なツールアノテーション

MCP仕様は、ツールに対して以下のアノテーションを定義しています：

| アノテーション | 型 | デフォルト | 説明 |
|--------------|-----|---------|------------|
| `title` | string | - | UI表示に役立つツールの人間が読めるタイトル |
| `readOnlyHint` | boolean | false | trueの場合、ツールが環境を変更しないことを示す |
| `destructiveHint` | boolean | true | trueの場合、ツールは破壊的な更新を実行する可能性がある（`readOnlyHint`がfalseの場合のみ意味がある） |
| `idempotentHint` | boolean | false | trueの場合、同じ引数でツールを繰り返し呼び出しても追加の効果はない（`readOnlyHint`がfalseの場合のみ意味がある） |
| `openWorldHint` | boolean | true | trueの場合、ツールは外部エンティティの「オープンワールド」と対話する可能性がある |

### 使用例

異なるシナリオのためにアノテーション付きのツールを定義する方法は次のとおりです：

```javascript
// 読み取り専用の検索ツール
{
  name: "web_search",
  description: "情報をウェブで検索する",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" }
    },
    required: ["query"]
  },
  annotations: {
    title: "ウェブ検索",
    readOnlyHint: true,
    openWorldHint: true
  }
}

// 破壊的なファイル削除ツール
{
  name: "delete_file",
  description: "ファイルシステムからファイルを削除する",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string" }
    },
    required: ["path"]
  },
  annotations: {
    title: "ファイル削除",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false
  }
}

// 非破壊的なデータベースレコード作成ツール
{
  name: "create_record",
  description: "データベースに新しいレコードを作成する",
  inputSchema: {
    type: "object",
    properties: {
      table: { type: "string" },
      data: { type: "object" }
    },
    required: ["table", "data"]
  },
  annotations: {
    title: "データベースレコード作成",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  }
}
```

### サーバー実装でのアノテーションの統合

#### TypeScript
```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [{
      name: "calculate_sum",
      description: "2つの数値を足し合わせる",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" }
        },
        required: ["a", "b"]
      },
      annotations: {
        title: "合計計算",
        readOnlyHint: true,
        openWorldHint: false
      }
    }]
  };
});
```

#### Python
```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("example-server")

@mcp.tool(
    annotations={
        "title": "合計計算",
        "readOnlyHint": True,
        "openWorldHint": False
    }
)
async def calculate_sum(a: float, b: float) -> str:
    """2つの数値を足し合わせる。
    
    Args:
        a: 足す最初の数値
        b: 足す2番目の数値
    """
    result = a + b
    return str(result)
```

### ツールアノテーションのベストプラクティス

1. **副作用について正確に記述する**：ツールが環境を変更するかどうか、およびそれらの変更が破壊的かどうかを明確に示します。

2. **説明的なタイトルを使用する**：ツールの目的を明確に説明する人間に優しいタイトルを提供します。

3. **べき等性を適切に示す**：同じ引数での繰り返し呼び出しが本当に追加の効果がない場合にのみ、ツールをべき等としてマークします。

4. **適切なオープン/クローズドワールドヒントを設定する**：ツールがクローズドシステム（データベースなど）またはオープンシステム（ウェブなど）と対話するかどうかを示します。

5. **アノテーションはヒントであることを忘れない**：ToolAnnotationsのすべてのプロパティはヒントであり、ツールの動作の忠実な説明を提供することは保証されていません。クライアントはアノテーションのみに基づいてセキュリティ上重要な決定を行うべきではありません。

## ツールのテスト

MCPツールの包括的なテスト戦略は以下をカバーする必要があります：

* **機能テスト**：ツールが有効な入力で正しく実行され、無効な入力を適切に処理することを検証する
* **統合テスト**：実際のモックの両方の依存関係を使用して、外部システムとのツール対話をテストする
* **セキュリティテスト**：認証、認可、入力サニタイズ、レート制限を検証する
* **パフォーマンステスト**：負荷下での動作、タイムアウト処理、リソースのクリーンアップをチェックする
* **エラー処理**：ツールがMCPプロトコルを通じて適切にエラーを報告し、リソースをクリーンアップすることを確認する
