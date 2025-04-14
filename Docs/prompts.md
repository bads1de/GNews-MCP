# プロンプト

再利用可能なプロンプトテンプレートとワークフローを作成する

プロンプトにより、サーバーは再利用可能なプロンプトテンプレートとワークフローを定義でき、クライアントはそれらをユーザーとLLMに簡単に提示することができます。これらは、一般的なLLM対話を標準化および共有するための強力な方法を提供します。

プロンプトは**ユーザー制御**されるように設計されています。つまり、ユーザーが明示的に使用するために選択できるようにサーバーからクライアントに公開されます。

## 概要

MCPのプロンプトは、以下のことができる事前定義されたテンプレートです：

* 動的な引数を受け入れる
* リソースからのコンテキストを含める
* 複数の対話をチェーンする
* 特定のワークフローを導く
* UIエレメント（スラッシュコマンドなど）として表示する

## プロンプト構造

各プロンプトは以下のように定義されます：

```json
{
  name: string;              // プロンプトの一意の識別子
  description?: string;      // 人間が読める説明
  arguments?: [              // オプションの引数リスト
    {
      name: string;          // 引数の識別子
      description?: string;  // 引数の説明
      required?: boolean;    // 引数が必須かどうか
    }
  ]
}
```

## プロンプトの発見

クライアントは`prompts/list`エンドポイントを通じて利用可能なプロンプトを発見できます：

```json
// リクエスト
{
  method: "prompts/list"
}

// レスポンス
{
  prompts: [
    {
      name: "analyze-code",
      description: "コードの潜在的な改善点を分析する",
      arguments: [
        {
          name: "language",
          description: "プログラミング言語",
          required: true
        }
      ]
    }
  ]
}
```

## プロンプトの使用

プロンプトを使用するために、クライアントは`prompts/get`リクエストを行います：

```json
// リクエスト
{
  method: "prompts/get",
  params: {
    name: "analyze-code",
    arguments: {
      language: "python"
    }
  }
}

// レスポンス
{
  description: "Pythonコードの潜在的な改善点を分析する",
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "以下のPythonコードの潜在的な改善点を分析してください：\n\n```python\ndef calculate_sum(numbers):\n    total = 0\n    for num in numbers:\n        total = total + num\n    return total\n\nresult = calculate_sum([1, 2, 3, 4, 5])\nprint(result)\n```"
      }
    }
  ]
}
```

## 動的プロンプト

プロンプトは動的であり、以下を含めることができます：

### 埋め込みリソースコンテキスト

```json
{
  "name": "analyze-project",
  "description": "プロジェクトログとコードを分析する",
  "arguments": [
    {
      "name": "timeframe",
      "description": "ログを分析する時間帯",
      "required": true
    },
    {
      "name": "fileUri",
      "description": "レビューするコードファイルのURI",
      "required": true
    }
  ]
}
```

`prompts/get`リクエストを処理する際：

```json
{
  "messages": [
    {
      "role": "user",
      "content": {
        "type": "text",
        "text": "これらのシステムログとコードファイルの問題を分析してください："
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "logs://recent?timeframe=1h",
          "text": "[2024-03-14 15:32:11] ERROR: Connection timeout in network.py:127\n[2024-03-14 15:32:15] WARN: Retrying connection (attempt 2/3)\n[2024-03-14 15:32:20] ERROR: Max retries exceeded",
          "mimeType": "text/plain"
        }
      }
    },
    {
      "role": "user",
      "content": {
        "type": "resource",
        "resource": {
          "uri": "file:///path/to/code.py",
          "text": "def connect_to_service(timeout=30):\n    retries = 3\n    for attempt in range(retries):\n        try:\n            return establish_connection(timeout)\n        except TimeoutError:\n            if attempt == retries - 1:\n                raise\n            time.sleep(5)\n\ndef establish_connection(timeout):\n    # Connection implementation\n    pass",
          "mimeType": "text/x-python"
        }
      }
    }
  ]
}
```

### 複数ステップのワークフロー

```javascript
const debugWorkflow = {
  name: "debug-error",
  async getMessages(error: string) {
    return [
      {
        role: "user",
        content: {
          type: "text",
          text: `私が見ているエラーはこれです：${error}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "このエラーの分析を手伝います。これまでに何を試しましたか？"
        }
      },
      {
        role: "user",
        content: {
          type: "text",
          text: "サービスを再起動してみましたが、エラーは続いています。"
        }
      }
    ];
  }
};
```

## 実装例

以下はMCPサーバーでプロンプトを実装する完全な例です：

### TypeScript
```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types";

const PROMPTS = {
  "git-commit": {
    name: "git-commit",
    description: "Gitコミットメッセージを生成する",
    arguments: [
      {
        name: "changes",
        description: "Git diffまたは変更の説明",
        required: true
      }
    ]
  },
  "explain-code": {
    name: "explain-code",
    description: "コードの動作を説明する",
    arguments: [
      {
        name: "code",
        description: "説明するコード",
        required: true
      },
      {
        name: "language",
        description: "プログラミング言語",
        required: false
      }
    ]
  }
};

const server = new Server({
  name: "example-prompts-server",
  version: "1.0.0"
}, {
  capabilities: {
    prompts: {}
  }
});

// 利用可能なプロンプトをリスト
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(PROMPTS)
  };
});

// 特定のプロンプトを取得
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const prompt = PROMPTS[request.params.name];
  if (!prompt) {
    throw new Error(`プロンプトが見つかりません: ${request.params.name}`);
  }

  if (request.params.name === "git-commit") {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `これらの変更に対する簡潔だが説明的なコミットメッセージを生成してください：\n\n${request.params.arguments?.changes}`
          }
        }
      ]
    };
  }

  if (request.params.name === "explain-code") {
    const language = request.params.arguments?.language || "不明";
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `この${language}コードがどのように動作するか説明してください：\n\n${request.params.arguments?.code}`
          }
        }
      ]
    };
  }

  throw new Error("プロンプト実装が見つかりません");
});
```

### Python
```python
from mcp.server import Server
import mcp.types as types

# 利用可能なプロンプトを定義
PROMPTS = {
    "git-commit": types.Prompt(
        name="git-commit",
        description="Gitコミットメッセージを生成する",
        arguments=[
            types.PromptArgument(
                name="changes",
                description="Git diffまたは変更の説明",
                required=True
            )
        ],
    ),
    "explain-code": types.Prompt(
        name="explain-code",
        description="コードの動作を説明する",
        arguments=[
            types.PromptArgument(
                name="code",
                description="説明するコード",
                required=True
            ),
            types.PromptArgument(
                name="language",
                description="プログラミング言語",
                required=False
            )
        ],
    )
}

# サーバーを初期化
app = Server("example-prompts-server")

@app.list_prompts()
async def list_prompts() -> list[types.Prompt]:
    return list(PROMPTS.values())

@app.get_prompt()
async def get_prompt(
    name: str, arguments: dict[str, str] | None = None
) -> types.GetPromptResult:
    if name not in PROMPTS:
        raise ValueError(f"プロンプトが見つかりません: {name}")

    if name == "git-commit":
        changes = arguments.get("changes") if arguments else ""
        return types.GetPromptResult(
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=f"これらの変更に対する簡潔だが説明的なコミットメッセージを"
                        f"生成してください：\n\n{changes}"
                    )
                )
            ]
        )

    if name == "explain-code":
        code = arguments.get("code") if arguments else ""
        language = arguments.get("language", "不明") if arguments else "不明"
        return types.GetPromptResult(
            messages=[
                types.PromptMessage(
                    role="user",
                    content=types.TextContent(
                        type="text",
                        text=f"この{language}コードがどのように動作するか説明してください：\n\n{code}"
                    )
                )
            ]
        )

    raise ValueError("プロンプト実装が見つかりません")
```

## ベストプラクティス

プロンプトを実装する際には：

1. 明確で説明的なプロンプト名を使用する
2. プロンプトと引数の詳細な説明を提供する
3. すべての必須引数を検証する
4. 欠落している引数を適切に処理する
5. プロンプトテンプレートのバージョン管理を検討する
6. 適切な場合は動的コンテンツをキャッシュする
7. エラー処理を実装する
8. 期待される引数形式をドキュメント化する
9. プロンプトの組み合わせ可能性を検討する
10. 様々な入力でプロンプトをテストする

## UI統合

プロンプトはクライアントUIで以下のように表示できます：

* スラッシュコマンド
* クイックアクション
* コンテキストメニュー項目
* コマンドパレットエントリ
* ガイド付きワークフロー
* インタラクティブフォーム

## 更新と変更

サーバーはプロンプトの変更についてクライアントに通知できます：

1. サーバー機能：`prompts.listChanged`
2. 通知：`notifications/prompts/list_changed`
3. クライアントがプロンプトリストを再取得

## セキュリティの考慮事項

プロンプトを実装する際には：

* すべての引数を検証する
* ユーザー入力をサニタイズする
* レート制限を検討する
* アクセス制御を実装する
* プロンプトの使用を監査する
* 機密データを適切に処理する
* 生成されたコンテンツを検証する
* タイムアウトを実装する
* プロンプトインジェクションのリスクを検討する
* セキュリティ要件をドキュメント化する
