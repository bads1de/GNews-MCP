# トランスポート

MCPの通信メカニズムについて学ぶ

Model Context Protocol (MCP)のトランスポートは、クライアントとサーバー間の通信の基盤を提供します。トランスポートは、メッセージがどのように送受信されるかの基本的なメカニズムを処理します。

## メッセージフォーマット

MCPは[JSON-RPC](https://www.jsonrpc.org/) 2.0をワイヤーフォーマットとして使用します。トランスポート層は、MCPプロトコルメッセージを送信用のJSON-RPC形式に変換し、受信したJSON-RPCメッセージをMCPプロトコルメッセージに戻す役割を担います。

使用されるJSON-RPCメッセージには3つのタイプがあります：

### リクエスト

```json
{
  jsonrpc: "2.0",
  id: number | string,
  method: string,
  params?: object
}
```

### レスポンス

```json
{
  jsonrpc: "2.0",
  id: number | string,
  result?: object,
  error?: {
    code: number,
    message: string,
    data?: unknown
  }
}
```

### 通知

```json
{
  jsonrpc: "2.0",
  method: string,
  params?: object
}
```

## 組み込みトランスポートタイプ

MCPには2つの標準トランスポート実装が含まれています：

### 標準入出力（stdio）

stdioトランスポートは、標準入出力ストリームを通じた通信を可能にします。これは特にローカル統合やコマンドラインツールに役立ちます。

以下の場合にstdioを使用します：

* コマンドラインツールの構築
* ローカル統合の実装
* シンプルなプロセス通信が必要な場合
* シェルスクリプトでの作業

#### TypeScript（サーバー）
```typescript
const server = new Server({
  name: "example-server",
  version: "1.0.0"
}, {
  capabilities: {}
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### TypeScript（クライアント）
```typescript
const client = new Client({
  name: "example-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

const transport = new StdioClientTransport({
  command: "./server",
  args: ["--option", "value"]
});
await client.connect(transport);
```

#### Python（サーバー）
```python
app = Server("example-server")

async with stdio_server() as streams:
    await app.run(
        streams[0],
        streams[1],
        app.create_initialization_options()
    )
```

#### Python（クライアント）
```python
params = StdioServerParameters(
    command="./server",
    args=["--option", "value"]
)

async with stdio_client(params) as streams:
    async with ClientSession(streams[0], streams[1]) as session:
        await session.initialize()
```

### サーバー送信イベント（SSE）

SSEトランスポートは、サーバーからクライアントへのストリーミングと、クライアントからサーバーへの通信にHTTP POSTリクエストを使用することを可能にします。

以下の場合にSSEを使用します：

* サーバーからクライアントへのストリーミングのみが必要な場合
* 制限されたネットワークでの作業
* シンプルな更新の実装

#### セキュリティ警告：DNSリバインディング攻撃

SSEトランスポートは、適切に保護されていない場合、DNSリバインディング攻撃に対して脆弱になる可能性があります。これを防ぐには：

1. **常に受信SSE接続のOriginヘッダーを検証**して、それらが予期されるソースからのものであることを確認する
2. **ローカルで実行する場合、サーバーをすべてのネットワークインターフェース（0.0.0.0）にバインドしないようにする** - 代わりにlocalhostのみ（127.0.0.1）にバインドする
3. **すべてのSSE接続に適切な認証を実装する**

これらの保護がなければ、攻撃者はDNSリバインディングを使用してリモートウェブサイトからローカルMCPサーバーと対話する可能性があります。

#### TypeScript（サーバー）
```typescript
import express from "express";

const app = express();

const server = new Server({
  name: "example-server",
  version: "1.0.0"
}, {
  capabilities: {}
});

let transport: SSEServerTransport | null = null;

app.get("/sse", (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  server.connect(transport);
});

app.post("/messages", (req, res) => {
  if (transport) {
    transport.handlePostMessage(req, res);
  }
});

app.listen(3000);
```

#### TypeScript（クライアント）
```typescript
const client = new Client({
  name: "example-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

const transport = new SSEClientTransport(
  new URL("http://localhost:3000/sse")
);
await client.connect(transport);
```

#### Python（サーバー）
```python
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.routing import Route

app = Server("example-server")
sse = SseServerTransport("/messages")

async def handle_sse(scope, receive, send):
    async with sse.connect_sse(scope, receive, send) as streams:
        await app.run(streams[0], streams[1], app.create_initialization_options())

async def handle_messages(scope, receive, send):
    await sse.handle_post_message(scope, receive, send)

starlette_app = Starlette(
    routes=[
        Route("/sse", endpoint=handle_sse),
        Route("/messages", endpoint=handle_messages, methods=["POST"]),
    ]
)
```

#### Python（クライアント）
```python
async with sse_client("http://localhost:8000/sse") as streams:
    async with ClientSession(streams[0], streams[1]) as session:
        await session.initialize()
```

## カスタムトランスポート

MCPは特定のニーズに合わせたカスタムトランスポートの実装を容易にします。どのトランスポート実装もTransportインターフェースに準拠する必要があります：

以下のためにカスタムトランスポートを実装できます：

* カスタムネットワークプロトコル
* 特殊な通信チャネル
* 既存システムとの統合
* パフォーマンス最適化

### TypeScript
```typescript
interface Transport {
  // メッセージの処理を開始
  start(): Promise<void>;

  // JSON-RPCメッセージを送信
  send(message: JSONRPCMessage): Promise<void>;

  // 接続を閉じる
  close(): Promise<void>;

  // コールバック
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
}
```

### Python
MCPサーバーはしばしばasyncioで実装されますが、トランスポートのような低レベルインターフェースは、より広い互換性のために`anyio`で実装することをお勧めします。

```python
@contextmanager
async def create_transport(
    read_stream: MemoryObjectReceiveStream[JSONRPCMessage | Exception],
    write_stream: MemoryObjectSendStream[JSONRPCMessage]
):
    """
    MCPのトランスポートインターフェース。

    Args:
        read_stream: 受信メッセージを読み取るストリーム
        write_stream: 送信メッセージを書き込むストリーム
    """
    async with anyio.create_task_group() as tg:
        try:
            # メッセージ処理を開始
            tg.start_soon(lambda: process_messages(read_stream))

            # メッセージを送信
            async with write_stream:
                yield write_stream

        except Exception as exc:
            # エラーを処理
            raise exc
        finally:
            # クリーンアップ
            tg.cancel_scope.cancel()
            await write_stream.aclose()
            await read_stream.aclose()
```

## エラー処理

トランスポート実装は様々なエラーシナリオを処理する必要があります：

1. 接続エラー
2. メッセージ解析エラー
3. プロトコルエラー
4. ネットワークタイムアウト
5. リソースのクリーンアップ

エラー処理の例：

### TypeScript
```typescript
class ExampleTransport implements Transport {
  async start() {
    try {
      // 接続ロジック
    } catch (error) {
      this.onerror?.(new Error(`接続に失敗しました: ${error}`));
      throw error;
    }
  }

  async send(message: JSONRPCMessage) {
    try {
      // 送信ロジック
    } catch (error) {
      this.onerror?.(new Error(`メッセージの送信に失敗しました: ${error}`));
      throw error;
    }
  }
}
```

### Python
MCPサーバーはしばしばasyncioで実装されますが、トランスポートのような低レベルインターフェースは、より広い互換性のために`anyio`で実装することをお勧めします。

```python
@contextmanager
async def example_transport(scope: Scope, receive: Receive, send: Send):
    try:
        # 双方向通信用のストリームを作成
        read_stream_writer, read_stream = anyio.create_memory_object_stream(0)
        write_stream, write_stream_reader = anyio.create_memory_object_stream(0)

        async def message_handler():
            try:
                async with read_stream_writer:
                    # メッセージ処理ロジック
                    pass
            except Exception as exc:
                logger.error(f"メッセージの処理に失敗しました: {exc}")
                raise exc

        async with anyio.create_task_group() as tg:
            tg.start_soon(message_handler)
            try:
                # 通信用のストリームを提供
                yield read_stream, write_stream
            except Exception as exc:
                logger.error(f"トランスポートエラー: {exc}")
                raise exc
            finally:
                tg.cancel_scope.cancel()
                await write_stream.aclose()
                await read_stream.aclose()
    except Exception as exc:
        logger.error(f"トランスポートの初期化に失敗しました: {exc}")
        raise exc
```

## ベストプラクティス

MCPトランスポートを実装または使用する際には：

1. 接続ライフサイクルを適切に処理する
2. 適切なエラー処理を実装する
3. 接続終了時にリソースをクリーンアップする
4. 適切なタイムアウトを使用する
5. 送信前にメッセージを検証する
6. デバッグ用にトランスポートイベントをログに記録する
7. 適切な場合は再接続ロジックを実装する
8. メッセージキューのバックプレッシャーを処理する
9. 接続の健全性を監視する
10. 適切なセキュリティ対策を実装する

## セキュリティの考慮事項

トランスポートを実装する際には：

### 認証と認可

* 適切な認証メカニズムを実装する
* クライアント認証情報を検証する
* 安全なトークン処理を使用する
* 認可チェックを実装する

### データセキュリティ

* ネットワークトランスポートにTLSを使用する
* 機密データを暗号化する
* メッセージの整合性を検証する
* メッセージサイズ制限を実装する
* 入力データをサニタイズする

### ネットワークセキュリティ

* レート制限を実装する
* 適切なタイムアウトを使用する
* サービス拒否シナリオを処理する
* 異常なパターンを監視する
* 適切なファイアウォールルールを実装する
* SSEトランスポートの場合、DNSリバインディング攻撃を防ぐためにOriginヘッダーを検証する
* ローカルSSEサーバーの場合、すべてのインターフェース（0.0.0.0）ではなくlocalhostのみ（127.0.0.1）にバインドする

## トランスポートのデバッグ

トランスポートの問題をデバッグするためのヒント：

1. デバッグログを有効にする
2. メッセージフローを監視する
3. 接続状態を確認する
4. メッセージフォーマットを検証する
5. エラーシナリオをテストする
6. ネットワーク分析ツールを使用する
7. ヘルスチェックを実装する
8. リソース使用量を監視する
9. エッジケースをテストする
10. 適切なエラー追跡を使用する
