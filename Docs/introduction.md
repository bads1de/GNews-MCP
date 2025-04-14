# イントロダクション

Model Context Protocol (MCP) の使い方を学びましょう

C# SDKがリリースされました！[その他の新機能をチェック](/development/updates)してください。

MCPは、アプリケーションがLLMにコンテキストを提供する方法を標準化するオープンプロトコルです。MCPはAIアプリケーション用のUSB-Cポートのようなものと考えてください。USB-Cがデバイスを様々な周辺機器やアクセサリに接続するための標準化された方法を提供するように、MCPはAIモデルを異なるデータソースやツールに接続するための標準化された方法を提供します。

## なぜMCPなのか？

MCPは、LLM上にエージェントや複雑なワークフローを構築するのに役立ちます。LLMはしばしばデータやツールと統合する必要があり、MCPは以下を提供します：

* LLMが直接接続できる既製の統合リストの拡大
* LLMプロバイダーやベンダー間の切り替えの柔軟性
* インフラストラクチャ内でデータを保護するためのベストプラクティス

### 一般的なアーキテクチャ

MCPの核心は、ホストアプリケーションが複数のサーバーに接続できるクライアント-サーバーアーキテクチャに従っています：

* **MCPホスト**：Claude Desktop、IDE、またはMCPを通じてデータにアクセスしたいAIツールなどのプログラム
* **MCPクライアント**：サーバーとの1:1接続を維持するプロトコルクライアント
* **MCPサーバー**：標準化されたModel Context Protocolを通じて特定の機能を公開する軽量プログラム
* **ローカルデータソース**：MCPサーバーが安全にアクセスできるコンピュータのファイル、データベース、サービス
* **リモートサービス**：MCPサーバーが接続できるインターネット経由で利用可能な外部システム（APIなど）

## 始め方

あなたのニーズに最も合った方法を選んでください：

#### クイックスタート

[サーバー開発者向け](/quickstart/server)
MCPサーバーを構築してClaude Desktopなどのクライアントで使用する方法を学びます

[クライアント開発者向け](/quickstart/client)
すべてのMCPサーバーと統合できる独自のクライアントの構築方法を学びます

[Claude Desktopユーザー向け](/quickstart/user)
Claude Desktopで既製のサーバーを使用する方法を学びます

#### 例

[サーバーの例](/examples)
公式MCPサーバーと実装のギャラリーをチェックしてください

[クライアントの例](/clients)
MCP統合をサポートするクライアントのリストを表示します

## チュートリアル

[LLMでMCPを構築する](/tutorials/building-mcp-with-llms)
ClaudeなどのLLMを使用してMCP開発を加速する方法を学びます

[デバッグガイド](/docs/tools/debugging)
MCPサーバーと統合を効果的にデバッグする方法を学びます

[MCPインスペクター](/docs/tools/inspector)
インタラクティブなデバッグツールでMCPサーバーをテストおよび検査します

[MCPワークショップ（ビデオ、2時間）](https://www.youtube.com/watch?v=kQmXtrmQ5Zg)

## MCPを探索する

MCPの中核概念と機能についてさらに詳しく学びましょう：

[コアアーキテクチャ](/docs/concepts/architecture)
MCPがクライアント、サーバー、LLMをどのように接続するかを理解します

[リソース](/docs/concepts/resources)
サーバーからLLMにデータとコンテンツを公開します

[プロンプト](/docs/concepts/prompts)
再利用可能なプロンプトテンプレートとワークフローを作成します

[ツール](/docs/concepts/tools)
LLMがサーバーを通じてアクションを実行できるようにします

[サンプリング](/docs/concepts/sampling)
サーバーがLLMから補完をリクエストできるようにします

[トランスポート](/docs/concepts/transports)
MCPの通信メカニズムについて学びます

## 貢献する

貢献したいですか？MCPの改善に協力する方法を学ぶために[貢献ガイド](/development/contributing)をチェックしてください。

## サポートとフィードバック

ヘルプを得たり、フィードバックを提供したりする方法は次のとおりです：

* MCP仕様、SDK、またはドキュメント（オープンソース）に関するバグレポートと機能リクエストについては、[GitHubイシューを作成](https://github.com/modelcontextprotocol)してください
* MCP仕様に関するディスカッションやQ&Aには、[仕様ディスカッション](https://github.com/modelcontextprotocol/specification/discussions)を使用してください
* 他のMCPオープンソースコンポーネントに関するディスカッションやQ&Aには、[組織ディスカッション](https://github.com/orgs/modelcontextprotocol/discussions)を使用してください
* Claude.appとclaude.aiのMCP統合に関するバグレポート、機能リクエスト、質問については、Anthropicの[サポートを受ける方法](https://support.anthropic.com/en/articles/9015913-how-to-get-support)ガイドを参照してください
