# リソース

サーバーからLLMにデータとコンテンツを公開する

リソースは、Model Context Protocol (MCP)の中核的なプリミティブであり、サーバーがクライアントによって読み取られ、LLM対話のコンテキストとして使用できるデータとコンテンツを公開することを可能にします。

リソースは**アプリケーション制御**されるように設計されています。つまり、クライアントアプリケーションがそれらをどのように、いつ使用するかを決定できます。異なるMCPクライアントはリソースを異なる方法で処理する場合があります。例えば：

* Claude Desktopは現在、リソースを使用する前にユーザーが明示的にリソースを選択することを要求しています
* 他のクライアントはヒューリスティックに基づいてリソースを自動的に選択する場合があります
* 一部の実装では、AIモデル自体がどのリソースを使用するかを決定することもあります

サーバー作成者は、リソースサポートを実装する際にこれらの対話パターンのいずれかを処理できるように準備する必要があります。モデルに自動的にデータを公開するために、サーバー作成者は[ツール](./tools)などの**モデル制御**プリミティブを使用する必要があります。

## 概要

リソースは、MCPサーバーがクライアントに利用可能にしたいあらゆる種類のデータを表します。これには以下が含まれます：

* ファイルの内容
* データベースレコード
* APIレスポンス
* ライブシステムデータ
* スクリーンショットと画像
* ログファイル
* その他

各リソースは一意のURIで識別され、テキストまたはバイナリデータのいずれかを含むことができます。

## リソースURI

リソースは次の形式に従うURIを使用して識別されます：

```
[protocol]://[host]/[path]
```

例えば：

* `file:///home/user/documents/report.pdf`
* `postgres://database/customers/schema`
* `screen://localhost/display1`

プロトコルとパス構造はMCPサーバー実装によって定義されます。サーバーは独自のカスタムURIスキームを定義できます。

## リソースタイプ

リソースには2種類のコンテンツを含めることができます：

### テキストリソース

テキストリソースにはUTF-8でエンコードされたテキストデータが含まれます。これらは以下に適しています：

* ソースコード
* 設定ファイル
* ログファイル
* JSON/XMLデータ
* プレーンテキスト

### バイナリリソース

バイナリリソースにはbase64でエンコードされた生のバイナリデータが含まれます。これらは以下に適しています：

* 画像
* PDF
* 音声ファイル
* 動画ファイル
* その他の非テキスト形式

## リソースの発見

クライアントは主に2つの方法で利用可能なリソースを発見できます：

### 直接リソース

サーバーは`resources/list`エンドポイントを通じて具体的なリソースのリストを公開します。各リソースには以下が含まれます：

```json
{
  uri: string;           // リソースの一意の識別子
  name: string;          // 人間が読める名前
  description?: string;  // オプションの説明
  mimeType?: string;     // オプションのMIMEタイプ
}
```

### リソーステンプレート

動的リソースの場合、サーバーはクライアントが有効なリソースURIを構築するために使用できる[URIテンプレート](https://datatracker.ietf.org/doc/html/rfc6570)を公開できます：

```json
{
  uriTemplate: string;   // RFC 6570に従うURIテンプレート
  name: string;          // このタイプの人間が読める名前
  description?: string;  // オプションの説明
  mimeType?: string;     // 一致するすべてのリソースのオプションのMIMEタイプ
}
```

## リソースの読み取り

リソースを読み取るために、クライアントはリソースURIを含む`resources/read`リクエストを行います。

サーバーはリソースコンテンツのリストで応答します：

```json
{
  contents: [
    {
      uri: string;        // リソースのURI
      mimeType?: string;  // オプションのMIMEタイプ

      // 以下のいずれか：
      text?: string;      // テキストリソースの場合
      blob?: string;      // バイナリリソースの場合（base64エンコード）
    }
  ]
}
```

サーバーは1つの`resources/read`リクエストに対して複数のリソースを返すことがあります。これは例えば、ディレクトリが読み取られたときにディレクトリ内のファイルのリストを返すために使用できます。

## リソースの更新

MCPは2つのメカニズムを通じてリソースのリアルタイム更新をサポートしています：

### リスト変更

サーバーは`notifications/resources/list_changed`通知を通じて、利用可能なリソースのリストが変更されたときにクライアントに通知できます。

### コンテンツ変更

クライアントは特定のリソースの更新をサブスクライブできます：

1. クライアントはリソースURIを含む`resources/subscribe`を送信します
2. サーバーはリソースが変更されたときに`notifications/resources/updated`を送信します
3. クライアントは`resources/read`で最新のコンテンツを取得できます
4. クライアントは`resources/unsubscribe`でサブスクリプションを解除できます

## 実装例

以下はMCPサーバーでリソースサポートを実装する簡単な例です：

### TypeScript
```typescript
const server = new Server({
  name: "example-server",
  version: "1.0.0"
}, {
  capabilities: {
    resources: {}
  }
});

// 利用可能なリソースをリスト
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "file:///logs/app.log",
        name: "アプリケーションログ",
        mimeType: "text/plain"
      }
    ]
  };
});

// リソースコンテンツを読み取り
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "file:///logs/app.log") {
    const logContents = await readLogFile();
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: logContents
        }
      ]
    };
  }

  throw new Error("リソースが見つかりません");
});
```

### Python
```python
app = Server("example-server")

@app.list_resources()
async def list_resources() -> list[types.Resource]:
    return [
        types.Resource(
            uri="file:///logs/app.log",
            name="アプリケーションログ",
            mimeType="text/plain"
        )
    ]

@app.read_resource()
async def read_resource(uri: AnyUrl) -> str:
    if str(uri) == "file:///logs/app.log":
        log_contents = await read_log_file()
        return log_contents

    raise ValueError("リソースが見つかりません")

# サーバーを起動
async with stdio_server() as streams:
    await app.run(
        streams[0],
        streams[1],
        app.create_initialization_options()
    )
```

## ベストプラクティス

リソースサポートを実装する際には：

1. 明確で説明的なリソース名とURIを使用する
2. LLMの理解を導くための役立つ説明を含める
3. 既知の場合は適切なMIMEタイプを設定する
4. 動的コンテンツにはリソーステンプレートを実装する
5. 頻繁に変更されるリソースにはサブスクリプションを使用する
6. 明確なエラーメッセージでエラーを適切に処理する
7. 大きなリソースリストにはページネーションを検討する
8. 適切な場合はリソースコンテンツをキャッシュする
9. 処理前にURIを検証する
10. カスタムURIスキームをドキュメント化する

## セキュリティの考慮事項

リソースを公開する際には：

* すべてのリソースURIを検証する
* 適切なアクセス制御を実装する
* ディレクトリトラバーサルを防ぐためにファイルパスをサニタイズする
* バイナリデータの処理には注意する
* リソース読み取りのレート制限を検討する
* リソースアクセスを監査する
* 転送中の機密データを暗号化する
* MIMEタイプを検証する
* 長時間実行される読み取りにはタイムアウトを実装する
* リソースのクリーンアップを適切に処理する
