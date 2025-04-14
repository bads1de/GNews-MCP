# サーバー開発者向けガイド

Claude for Desktopやその他のクライアントで使用する独自のサーバーを構築する方法を学びましょう。

このチュートリアルでは、シンプルなMCP天気サーバーを構築し、ホスト（この場合はClaude for Desktop）に接続します。基本的なセットアップから始めて、より複雑なユースケースへと進みます。

## 構築するもの

多くのLLMは現在、天気予報や警報を取得する機能を持っていません。MCPを使ってこの問題を解決しましょう！

`get-alerts`と`get-forecast`という2つのツールを公開するサーバーを構築します。そしてそのサーバーをMCPホスト（この場合はClaude for Desktop）に接続します。

サーバーは任意のクライアントに接続できます。ここでは簡単のためにClaude for Desktopを選びましたが、[独自のクライアントを構築する](/quickstart/client)ガイドや[他のクライアントのリスト](/clients)もあります。

なぜClaude.aiではなくClaude for Desktopなのか？

サーバーはローカルで実行されるため、MCPは現在デスクトップホストのみをサポートしています。リモートホストは現在開発中です。

## MCPの中核概念

MCPサーバーは3つの主要な機能タイプを提供できます：

1. **リソース**：クライアントが読み取れるファイルのようなデータ（APIレスポンスやファイルコンテンツなど）
2. **ツール**：LLMが呼び出せる関数（ユーザーの承認付き）
3. **プロンプト**：ユーザーが特定のタスクを達成するのに役立つ事前に書かれたテンプレート

このチュートリアルでは主にツールに焦点を当てます。

## 実装例：Python版天気サーバー

### 前提知識

このクイックスタートでは以下に精通していることを前提としています：

* Python
* ClaudeなどのLLM

### システム要件

* Python 3.10以上がインストールされていること
* Python MCP SDK 1.2.0以上を使用すること

### 環境のセットアップ

まず、`uv`をインストールしてPythonプロジェクトと環境をセットアップします：

```bash
# MacOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# プロジェクト用の新しいディレクトリを作成
uv init weather
cd weather

# 仮想環境を作成してアクティブ化
uv venv
source .venv/bin/activate

# 依存関係をインストール
uv add "mcp[cli]" httpx

# サーバーファイルを作成
touch weather.py
```

### サーバーの構築

#### パッケージのインポートとインスタンスのセットアップ

`weather.py`の先頭に以下を追加します：

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

# FastMCPサーバーを初期化
mcp = FastMCP("weather")

# 定数
NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"
```

FastMCPクラスはPythonの型ヒントとdocstringを使用してツール定義を自動的に生成し、MCPツールの作成と保守を容易にします。

#### ヘルパー関数

次に、National Weather Service APIからデータを照会してフォーマットするためのヘルパー関数を追加します：

```python
async def make_nws_request(url: str) -> dict[str, Any] | None:
    """適切なエラー処理でNWS APIにリクエストを行う。"""
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/geo+json"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None

def format_alert(feature: dict) -> str:
    """アラート機能を読みやすい文字列にフォーマットする。"""
    props = feature["properties"]
    return f"""
Event: {props.get('event', 'Unknown')}
Area: {props.get('areaDesc', 'Unknown')}
Severity: {props.get('severity', 'Unknown')}
Description: {props.get('description', 'No description available')}
Instructions: {props.get('instruction', 'No specific instructions provided')}
"""
```

#### ツール実行の実装

ツール実行ハンドラは、各ツールのロジックを実際に実行する役割を担います：

```python
@mcp.tool()
async def get_alerts(state: str) -> str:
    """米国の州の気象警報を取得する。

    Args:
        state: 米国の州を表す2文字コード（例：CA, NY）
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)

    if not data or "features" not in data:
        return "警報を取得できないか、警報が見つかりません。"

    if not data["features"]:
        return "この州にはアクティブな警報はありません。"

    alerts = [format_alert(feature) for feature in data["features"]]
    return "\n---\n".join(alerts)

@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """場所の天気予報を取得する。

    Args:
        latitude: 場所の緯度
        longitude: 場所の経度
    """
    # まず予報グリッドエンドポイントを取得
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)

    if not points_data:
        return "この場所の予報データを取得できません。"

    # ポイントレスポンスから予報URLを取得
    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)

    if not forecast_data:
        return "詳細な予報を取得できません。"

    # 期間を読みやすい予報にフォーマット
    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for period in periods[:5]:  # 次の5期間のみ表示
        forecast = f"""
{period['name']}:
Temperature: {period['temperature']}°{period['temperatureUnit']}
Wind: {period['windSpeed']} {period['windDirection']}
Forecast: {period['detailedForecast']}
"""
        forecasts.append(forecast)

    return "\n---\n".join(forecasts)
```

#### サーバーの実行

最後に、サーバーを初期化して実行します：

```python
if __name__ == "__main__":
    # サーバーを初期化して実行
    mcp.run(transport='stdio')
```

サーバーが完成しました！`uv run weather.py`を実行して、すべてが正常に動作することを確認します。

## Claude for Desktopでサーバーをテストする

まず、Claude for Desktopがインストールされていることを確認してください。[最新バージョンはこちらからインストールできます。](https://claude.ai/download) すでにClaude for Desktopをお持ちの場合は、**最新バージョンに更新されていることを確認してください。**

使用したいMCPサーバーのためにClaude for Desktopを設定する必要があります。これを行うには、テキストエディタで`~/Library/Application Support/Claude/claude_desktop_config.json`にあるClaude for Desktopアプリの設定を開きます。ファイルが存在しない場合は作成してください。

例えば、[VS Code](https://code.visualstudio.com/)がインストールされている場合：

```bash
# MacOS/Linux
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
code $env:AppData\Claude\claude_desktop_config.json
```

次に、`mcpServers`キーにサーバーを追加します。少なくとも1つのサーバーが適切に設定されている場合にのみ、MCP UIエレメントがClaude for Desktopに表示されます。

この場合、単一の天気サーバーを次のように追加します：

```json
{
    "mcpServers": {
        "weather": {
            "command": "uv",
            "args": [
                "--directory",
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/weather",
                "run",
                "weather.py"
            ]
        }
    }
}
```

`command`フィールドに`uv`実行可能ファイルへのフルパスを入れる必要があるかもしれません。MacOS/Linuxでは`which uv`、Windowsでは`where uv`を実行することでこれを取得できます。

サーバーへの絶対パスを渡すようにしてください。

これはClaude for Desktopに以下を伝えます：

1. 「weather」という名前のMCPサーバーがある
2. `uv --directory /ABSOLUTE/PATH/TO/PARENT/FOLDER/weather run weather.py`を実行して起動する

ファイルを保存し、**Claude for Desktop**を再起動します。

## コマンドでテスト

Claude for Desktopが`weather`サーバーで公開した2つのツールを認識していることを確認しましょう。これはハンマーアイコンを探すことでできます。

ハンマーアイコンをクリックすると、2つのツールがリストされているはずです。

サーバーがClaude for Desktopに認識されない場合は、[トラブルシューティング](#troubleshooting)セクションに進んでデバッグのヒントを確認してください。

ハンマーアイコンが表示されたら、Claude for Desktopで以下のようなコマンドを実行してサーバーをテストできます：

* サクラメントの天気は？
* テキサス州のアクティブな気象警報は？

これは米国国立気象サービスなので、クエリは米国の場所でのみ機能します。

## 舞台裏で何が起きているか

質問をすると：

1. クライアントがあなたの質問をClaudeに送信
2. Claudeが利用可能なツールを分析し、どのツールを使用するかを決定
3. クライアントがMCPサーバーを通じて選択されたツールを実行
4. 結果がClaudeに送り返される
5. Claudeが自然言語の応答を作成
6. 応答があなたに表示される！

## トラブルシューティング

### Claude for Desktop統合の問題

**Claude for Desktopからログを取得する**

MCPに関連するClaude.appのログは`~/Library/Logs/Claude`のログファイルに書き込まれます：

* `mcp.log`にはMCP接続と接続失敗に関する一般的なログが含まれます。
* `mcp-server-SERVERNAME.log`という名前のファイルには、名前付きサーバーからのエラー（stderr）ログが含まれます。

以下のコマンドを実行して、最近のログをリストアップし、新しいログをフォローできます：

```bash
# Claudeのログでエラーを確認
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

**サーバーがClaudeに表示されない**

1. `claude_desktop_config.json`ファイルの構文を確認
2. プロジェクトへのパスが相対ではなく絶対であることを確認
3. Claude for Desktopを完全に再起動

**ツール呼び出しが静かに失敗する**

Claudeがツールを使用しようとしても失敗する場合：

1. Claudeのログでエラーを確認
2. サーバーがエラーなくビルドおよび実行されることを確認
3. Claude for Desktopの再起動を試みる

**何も機能しない場合**

より良いデバッグツールとより詳細なガイダンスについては、[デバッグガイド](/docs/tools/debugging)を参照してください。

### 天気API問題

**エラー：グリッドポイントデータの取得に失敗しました**

これは通常、以下のいずれかを意味します：

1. 座標が米国外
2. NWS APIに問題がある
3. レート制限されている

解決策：

* 米国の座標を使用していることを確認
* リクエスト間に小さな遅延を追加
* NWS APIステータスページを確認

**エラー：[STATE]にアクティブな警報はありません**

これはエラーではなく、その州に現在の気象警報がないことを意味します。別の州を試すか、悪天候時に確認してください。

より高度なトラブルシューティングについては、[MCPのデバッグ](/docs/tools/debugging)に関するガイドをチェックしてください。

## 次のステップ

- [クライアントの構築](/quickstart/client) - 自分のサーバーに接続できる独自のMCPクライアントを構築する方法を学ぶ
- [サーバーの例](/examples) - 公式MCPサーバーと実装のギャラリーをチェック
- [デバッグガイド](/docs/tools/debugging) - MCPサーバーと統合を効果的にデバッグする方法を学ぶ
- [LLMでMCPを構築](/tutorials/building-mcp-with-llms) - ClaudeなどのLLMを使用してMCP開発を加速する方法を学ぶ
