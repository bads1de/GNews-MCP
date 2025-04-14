# コアアーキテクチャ

MCPがクライアント、サーバー、LLMをどのように接続するかを理解する

Model Context Protocol (MCP)は、LLMアプリケーションと統合間のシームレスな通信を可能にする柔軟で拡張可能なアーキテクチャに基づいています。このドキュメントでは、コアアーキテクチャコンポーネントと概念について説明します。

## 概要

MCPは以下のようなクライアント-サーバーアーキテクチャに従っています：

* **ホスト**は接続を開始するLLMアプリケーション（Claude DesktopやIDEなど）
* **クライアント**はホストアプリケーション内でサーバーとの1:1接続を維持
* **サーバー**はクライアントにコンテキスト、ツール、プロンプトを提供

## コアコンポーネント

### プロトコル層

プロトコル層は、メッセージフレーミング、リクエスト/レスポンスのリンク、高レベルの通信パターンを処理します。

```typescript
class Protocol<Request, Notification, Result> {
    // 受信リクエストを処理
    setRequestHandler<T>(schema: T, handler: (request: T, extra: RequestHandlerExtra) => Promise<r>): void

    // 受信通知を処理
    setNotificationHandler<T>(schema: T, handler: (notification: T) => Promise<void>): void

    // リクエストを送信し、応答を待機
    request<T>(request: Request, schema: T, options?: RequestOptions): Promise<T>

    // 一方向の通知を送信
    notification(notification: Notification): Promise<void>
}
```

```python
class Session(BaseSession[RequestT, NotificationT, ResultT]):
    async def send_request(
        self,
        request: RequestT,
        result_type: type[Result]
    ) -> Result:
        """リクエストを送信し、応答を待機。応答にエラーが含まれている場合はMcpErrorを発生させる。"""
        # リクエスト処理の実装

    async def send_notification(
        self,
        notification: NotificationT
    ) -> None:
        """応答を期待しない一方向の通知を送信。"""
        # 通知処理の実装

    async def _received_request(
        self,
        responder: RequestResponder[ReceiveRequestT, ResultT]
    ) -> None:
        """相手側からの受信リクエストを処理。"""
        # リクエスト処理の実装

    async def _received_notification(
        self,
        notification: ReceiveNotificationT
    ) -> None:
        """相手側からの受信通知を処理。"""
        # 通知処理の実装
```

主要なクラスには以下が含まれます：

* `Protocol`
* `Client`
* `Server`

### トランスポート層

トランスポート層は、クライアントとサーバー間の実際の通信を処理します。MCPは複数のトランスポートメカニズムをサポートしています：

1. **標準入出力トランスポート**
   * 通信に標準入出力を使用
   * ローカルプロセスに最適

2. **HTTP with SSEトランスポート**
   * サーバーからクライアントへのメッセージにServer-Sent Eventsを使用
   * クライアントからサーバーへのメッセージにHTTP POSTを使用

すべてのトランスポートは、メッセージの交換に[JSON-RPC](https://www.jsonrpc.org/) 2.0を使用します。Model Context Protocolのメッセージ形式に関する詳細情報は[仕様](/specification)を参照してください。

### メッセージタイプ

MCPには以下の主要なメッセージタイプがあります：

1. **リクエスト**は相手側からの応答を期待します：
   ```json
   interface Request {
     method: string;
     params?: { ... };
   }
   ```

2. **結果**はリクエストへの成功応答です：
   ```json
   interface Result {
     [key: string]: unknown;
   }
   ```

3. **エラー**はリクエストが失敗したことを示します：
   ```json
   interface Error {
     code: number;
     message: string;
     data?: unknown;
   }
   ```

4. **通知**は応答を期待しない一方向のメッセージです：
   ```json
   interface Notification {
     method: string;
     params?: { ... };
   }
   ```

## 接続ライフサイクル

### 1. 初期化

1. クライアントがプロトコルバージョンと機能を含む`initialize`リクエストを送信
2. サーバーがそのプロトコルバージョンと機能で応答
3. クライアントが確認として`initialized`通知を送信
4. 通常のメッセージ交換が開始

### 2. メッセージ交換

初期化後、以下のパターンがサポートされます：

* **リクエスト-レスポンス**：クライアントまたはサーバーがリクエストを送信し、相手が応答
* **通知**：どちらかがワンウェイメッセージを送信

### 3. 終了

どちらの側も接続を終了できます：

* `close()`によるクリーンなシャットダウン
* トランスポートの切断
* エラー条件

## エラー処理

MCPは以下の標準エラーコードを定義しています：

```typescript
enum ErrorCode {
  // 標準JSON-RPCエラーコード
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}
```

SDKとアプリケーションは-32000より上の独自のエラーコードを定義できます。

エラーは以下を通じて伝播されます：

* リクエストへのエラー応答
* トランスポート上のエラーイベント
* プロトコルレベルのエラーハンドラ

## 実装例

以下はMCPサーバーを実装する基本的な例です：

### TypeScript
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "example-server",
  version: "1.0.0"
}, {
  capabilities: {
    resources: {}
  }
});

// リクエストを処理
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "example://resource",
        name: "Example Resource"
      }
    ]
  };
});

// トランスポートを接続
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Python
```python
import asyncio
import mcp.types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("example-server")

@app.list_resources()
async def list_resources() -> list[types.Resource]:
    return [
        types.Resource(
            uri="example://resource",
            name="Example Resource"
        )
    ]

async def main():
    async with stdio_server() as streams:
        await app.run(
            streams[0],
            streams[1],
            app.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())
```

## ベストプラクティス

### トランスポートの選択

1. **ローカル通信**
   * ローカルプロセスには標準入出力トランスポートを使用
   * 同一マシン通信に効率的
   * シンプルなプロセス管理

2. **リモート通信**
   * HTTP互換性が必要なシナリオにはSSEを使用
   * 認証と認可を含むセキュリティの影響を考慮

### メッセージ処理

1. **リクエスト処理**
   * 入力を徹底的に検証
   * 型安全なスキーマを使用
   * エラーを適切に処理
   * タイムアウトを実装

2. **進捗報告**
   * 長い操作には進捗トークンを使用
   * 進捗を段階的に報告
   * 既知の場合は合計進捗を含める

3. **エラー管理**
   * 適切なエラーコードを使用
   * 役立つエラーメッセージを含める
   * エラー時にリソースをクリーンアップ

## セキュリティの考慮事項

1. **トランスポートセキュリティ**
   * リモート接続にはTLSを使用
   * 接続元を検証
   * 必要に応じて認証を実装

2. **メッセージ検証**
   * すべての受信メッセージを検証
   * 入力をサニタイズ
   * メッセージサイズ制限を確認
   * JSON-RPC形式を検証

3. **リソース保護**
   * アクセス制御を実装
   * リソースパスを検証
   * リソース使用量を監視
   * リクエストをレート制限

4. **エラー処理**
   * 機密情報を漏洩しない
   * セキュリティ関連のエラーをログに記録
   * 適切なクリーンアップを実装
   * DoSシナリオを処理

## デバッグとモニタリング

1. **ロギング**
   * プロトコルイベントをログに記録
   * メッセージフローを追跡
   * パフォーマンスを監視
   * エラーを記録

2. **診断**
   * ヘルスチェックを実装
   * 接続状態を監視
   * リソース使用量を追跡
   * パフォーマンスをプロファイル

3. **テスト**
   * 異なるトランスポートをテスト
   * エラー処理を検証
   * エッジケースをチェック
   * サーバーの負荷テスト
