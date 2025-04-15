# GNews API 使用ガイド

GNews APIは、世界中の60,000以上のニュースソースから記事を検索できるRESTful APIです。このAPIを使用することで、キーワード検索や最新のトップヘッドラインを取得することができます。

## 目次

1. [概要](#概要)
2. [認証](#認証)
3. [検索エンドポイント](#検索エンドポイント)
   - [HTTPリクエスト](#httpリクエスト)
   - [クエリパラメータ](#クエリパラメータ)
   - [クエリ構文](#クエリ構文)
4. [トップヘッドラインエンドポイント](#トップヘッドラインエンドポイント)
   - [HTTPリクエスト](#httpリクエスト-1)
   - [クエリパラメータ](#クエリパラメータ-1)
5. [対応言語](#対応言語)
6. [対応国](#対応国)
7. [エラーコード](#エラーコード)
8. [実装例](#実装例)

## 概要

GNews APIは、現在および過去のニュース記事を検索するためのシンプルなRESTful APIです。このAPIを使用することで、以下のことが可能になります：

- キーワードによる記事検索
- 最新のトップヘッドライン記事の取得
- 言語や国によるフィルタリング
- 日付範囲による記事のフィルタリング

APIからのレスポンスは常にJSON形式で返されます。各記事には以下のプロパティが含まれます：

| プロパティ | 説明 |
|------------|------|
| title | 記事のメインタイトル |
| description | タイトルの下にある小さな段落 |
| content | 記事の全内容（有料サブスクリプションでのみ全文取得可能） |
| url | 記事のURL |
| image | 記事のメイン画像 |
| publishedAt | 記事の公開日（UTC時間） |
| source.name | ソース（出版社）の名前 |
| source.url | ソースのホームページ |

## 認証

GNews APIはAPIキーを使用して認証を行います。APIキーを取得するには、[GNews.io](https://gnews.io/register)でアカウントを作成する必要があります。

APIキーはHTTPリクエストのクエリ文字列に以下のように含める必要があります：

```
https://gnews.io/api/v4/{endpoint}?apikey=API_KEY
```

`API_KEY`は、ダッシュボードで確認できるAPIキーに置き換えてください。

## 検索エンドポイント

このエンドポイントを使用すると、キーワードの組み合わせによってニュース記事を検索できます。

### HTTPリクエスト

```
GET https://gnews.io/api/v4/search?q=example&apikey=API_KEY
```

### クエリパラメータ

| パラメータ名 | デフォルト値 | 説明 |
|--------------|--------------|------|
| q | なし | **必須パラメータ**。検索キーワードを指定します。論理演算子を使用することも可能です。 |
| lang | 任意 | 記事の言語を指定します。2文字の言語コードを設定します。 |
| country | 任意 | 記事が公開された国を指定します。2文字の国コードを設定します。 |
| max | 10 | 返される記事の数を指定します。最小値は1、最大値は100です。 |
| in | title,description | キーワードを検索する属性を選択します。設定可能な属性は**title**、**description**、**content**です。 |
| nullable | なし | null値を返すことを許可する属性を指定します。設定可能な属性は**description**、**content**、**image**です。 |
| from | なし | 指定した日付以降に公開された記事をフィルタリングします。形式：YYYY-MM-DDThh:mm:ssZ |
| to | なし | 指定した日付以前に公開された記事をフィルタリングします。形式：YYYY-MM-DDThh:mm:ssZ |
| sortby | publishedAt | 記事の並べ替え方法を選択します。**publishedAt**（公開日）または**relevance**（関連性）が設定可能です。 |
| page | 1 | **有料サブスクリプションのみ**。結果のページネーションを制御します。 |
| expand | なし | **有料サブスクリプションのみ**。記事の全文を取得するには**content**を設定します。 |

### クエリ構文

検索クエリでは以下の演算子を使用できます：

1. **フレーズ検索演算子**：引用符で囲まれたキーワードは、完全一致検索に使用されます。例：`"Apple iPhone"`

2. **論理AND演算子**：スペース文字はデフォルトでAND演算子として機能します。例：`Apple Microsoft`は`Apple AND Microsoft`と同等です。

3. **論理OR演算子**：キーワードaまたはキーワードbに一致する記事を取得します。例：`Apple OR Microsoft`

4. **論理NOT演算子**：指定したキーワードに一致する記事を結果から除外します。例：`Apple NOT iPhone`

**有効なクエリの例**：
- `Microsoft Windows 10`
- `Apple OR Microsoft`
- `Apple AND NOT iPhone`
- `(Windows 7) AND (Windows 10)`
- `"Apple iPhone 13" AND NOT "Apple iPhone 14"`
- `Intel AND (i7 OR i9)`

## トップヘッドラインエンドポイント

このエンドポイントを使用すると、現在のトレンド記事を検索できます。このエンドポイントによって返される記事は、Google Newsのランキングに基づいています。

### HTTPリクエスト

```
GET https://gnews.io/api/v4/top-headlines?category=general&apikey=API_KEY
```

### クエリパラメータ

| パラメータ名 | デフォルト値 | 説明 |
|--------------|--------------|------|
| category | general | カテゴリを変更します。利用可能なカテゴリ：**general**、**world**、**nation**、**business**、**technology**、**entertainment**、**sports**、**science**、**health** |
| lang | 任意 | 記事の言語を指定します。2文字の言語コードを設定します。 |
| country | 任意 | 記事が公開された国を指定します。2文字の国コードを設定します。 |
| max | 10 | 返される記事の数を指定します。最小値は1、最大値は100です。 |
| nullable | なし | null値を返すことを許可する属性を指定します。設定可能な属性は**description**、**content**、**image**です。 |
| from | なし | 指定した日付以降に公開された記事をフィルタリングします。形式：YYYY-MM-DDThh:mm:ssZ |
| to | なし | 指定した日付以前に公開された記事をフィルタリングします。形式：YYYY-MM-DDThh:mm:ssZ |
| q | なし | 結果を絞り込むための検索キーワードを指定します。 |
| page | 1 | **有料サブスクリプションのみ**。結果のページネーションを制御します。 |
| expand | なし | **有料サブスクリプションのみ**。記事の全文を取得するには**content**を設定します。 |

## 対応言語

APIでサポートされている言語（**lang**パラメータで使用）：

| 言語名 | 値 |
|--------|-----|
| アラビア語 | ar |
| 中国語 | zh |
| オランダ語 | nl |
| 英語 | en |
| フランス語 | fr |
| ドイツ語 | de |
| ギリシャ語 | el |
| ヘブライ語 | he |
| ヒンディー語 | hi |
| イタリア語 | it |
| 日本語 | ja |
| マラヤーラム語 | ml |
| マラーティー語 | mr |
| ノルウェー語 | no |
| ポルトガル語 | pt |
| ルーマニア語 | ro |
| ロシア語 | ru |
| スペイン語 | es |
| スウェーデン語 | sv |
| タミル語 | ta |
| テルグ語 | te |
| ウクライナ語 | uk |

## 対応国

APIでサポートされている国（**country**パラメータで使用）：

| 国名 | 値 |
|------|-----|
| オーストラリア | au |
| ブラジル | br |
| カナダ | ca |
| 中国 | cn |
| エジプト | eg |
| フランス | fr |
| ドイツ | de |
| ギリシャ | gr |
| 香港 | hk |
| インド | in |
| アイルランド | ie |
| イスラエル | il |
| イタリア | it |
| 日本 | jp |
| オランダ | nl |
| ノルウェー | no |
| パキスタン | pk |
| ペルー | pe |
| フィリピン | ph |
| ポルトガル | pt |
| ルーマニア | ro |
| ロシア連邦 | ru |
| シンガポール | sg |
| スペイン | es |
| スウェーデン | se |
| スイス | ch |
| 台湾 | tw |
| ウクライナ | ua |
| イギリス | gb |
| アメリカ合衆国 | us |

## エラーコード

APIは以下のエラーコードを使用します：

| エラーコード | 意味 |
|--------------|------|
| 400 | Bad Request - リクエストが無効です |
| 401 | Unauthorized - APIキーが間違っています |
| 403 | Forbidden - 日次クォータに達しました。次のリセットは00:00 UTCです |
| 429 | Too Many Requests - 許可されている以上のリクエストを行いました |
| 500 | Internal Server Error - サーバーに問題が発生しました |
| 503 | Service Unavailable - メンテナンスのため一時的にオフラインです |

## 実装例

### JavaScriptでの実装例

```javascript
const apikey = 'YOUR_API_KEY';
const url = `https://gnews.io/api/v4/search?q=example&lang=ja&country=jp&max=10&apikey=${apikey}`;

fetch(url)
  .then(function (response) {
    return response.json();
  })
  .then(function (data) {
    const articles = data.articles;
    
    for (let i = 0; i < articles.length; i++) {
      console.log("タイトル: " + articles[i].title);
      console.log("説明: " + articles[i].description);
      console.log("URL: " + articles[i].url);
      console.log("公開日: " + articles[i].publishedAt);
      console.log("ソース: " + articles[i].source.name);
      console.log("------------------------");
    }
  })
  .catch(function (error) {
    console.log("エラーが発生しました: " + error);
  });
```

### Node.jsでの実装例

```javascript
const https = require('https');

const apikey = 'YOUR_API_KEY';
const url = `https://gnews.io/api/v4/top-headlines?category=technology&lang=ja&country=jp&max=10&apikey=${apikey}`;

https.get(url, (response) => {
  let data = '';
  
  response.on('data', (chunk) => {
    data += chunk;
  });
  
  response.on('end', () => {
    const newsData = JSON.parse(data);
    const articles = newsData.articles;
    
    for (let i = 0; i < articles.length; i++) {
      console.log("タイトル: " + articles[i].title);
      console.log("説明: " + articles[i].description);
      console.log("URL: " + articles[i].url);
      console.log("公開日: " + articles[i].publishedAt);
      console.log("ソース: " + articles[i].source.name);
      console.log("------------------------");
    }
  });
}).on('error', (error) => {
  console.log("エラーが発生しました: " + error);
});
```

### Pythonでの実装例

```python
import json
import urllib.request

apikey = "YOUR_API_KEY"
url = f"https://gnews.io/api/v4/search?q=example&lang=ja&country=jp&max=10&apikey={apikey}"

with urllib.request.urlopen(url) as response:
    data = json.loads(response.read().decode("utf-8"))
    articles = data["articles"]
    
    for article in articles:
        print(f"タイトル: {article['title']}")
        print(f"説明: {article['description']}")
        print(f"URL: {article['url']}")
        print(f"公開日: {article['publishedAt']}")
        print(f"ソース: {article['source']['name']}")
        print("------------------------")
```

### TypeScriptでの実装例

```typescript
interface Source {
  name: string;
  url: string;
}

interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: Source;
}

interface NewsResponse {
  totalArticles: number;
  articles: Article[];
}

const apikey = 'YOUR_API_KEY';
const url = `https://gnews.io/api/v4/search?q=example&lang=ja&country=jp&max=10&apikey=${apikey}`;

fetch(url)
  .then((response) => response.json())
  .then((data: NewsResponse) => {
    const articles = data.articles;
    
    articles.forEach((article) => {
      console.log(`タイトル: ${article.title}`);
      console.log(`説明: ${article.description}`);
      console.log(`URL: ${article.url}`);
      console.log(`公開日: ${article.publishedAt}`);
      console.log(`ソース: ${article.source.name}`);
      console.log("------------------------");
    });
  })
  .catch((error) => {
    console.log(`エラーが発生しました: ${error}`);
  });
```

## 注意事項

1. 無料プランでは1日100リクエストまでの制限があります。
2. 無料プランでは商用利用はできません。
3. 記事の全文を取得するには有料サブスクリプションが必要です。
4. ページネーション機能を使用するには有料サブスクリプションが必要です。
5. APIキーは公開しないように注意してください。
