import { registerNewsTools } from "../../src/tools/news";

// モックの作成
jest.mock("rss-parser", () => {
  return jest.fn().mockImplementation(() => {
    return {
      parseURL: jest.fn().mockImplementation((url: string) => {
        // URLに基づいてモックデータを返す
        if (url.includes("top-picks")) {
          return Promise.resolve({
            items: [
              {
                title: "トップニュース1",
                link: "https://news.yahoo.co.jp/articles/1",
                pubDate: "2023-04-15T10:00:00Z",
                contentSnippet: "トップニュースの内容1",
              },
              {
                title: "トップニュース2",
                link: "https://news.yahoo.co.jp/articles/2",
                pubDate: "2023-04-15T09:00:00Z",
                contentSnippet: "トップニュースの内容2",
              },
            ],
          });
        } else if (url.includes("domestic")) {
          return Promise.resolve({
            items: [
              {
                title: "国内ニュース1",
                link: "https://news.yahoo.co.jp/articles/3",
                pubDate: "2023-04-15T08:00:00Z",
                contentSnippet: "国内ニュースの内容1",
              },
            ],
          });
        } else {
          return Promise.resolve({ items: [] });
        }
      }),
    };
  });
});

describe("ニュースツール", () => {
  const mockServer = {
    tool: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("サーバーにニュースツールが正しく登録される", () => {
    registerNewsTools(mockServer as any);

    // 2つのツールが登録されていることを確認
    expect(mockServer.tool).toHaveBeenCalledTimes(2);

    // get-newsツールが登録されていることを確認
    expect(mockServer.tool).toHaveBeenCalledWith(
      "get-news",
      expect.any(String),
      expect.objectContaining({
        category: expect.any(Object),
        limit: expect.any(Object),
      }),
      expect.any(Function)
    );

    // search-newsツールが登録されていることを確認
    expect(mockServer.tool).toHaveBeenCalledWith(
      "search-news",
      expect.any(String),
      expect.objectContaining({
        keyword: expect.any(Object),
        category: expect.any(Object),
        limit: expect.any(Object),
      }),
      expect.any(Function)
    );
  });

  test("get-newsツールが指定されたカテゴリのニュースを返す", async () => {
    let getNewsHandler: Function | undefined;

    mockServer.tool.mockImplementation((name, _desc, _schema, handler) => {
      if (name === "get-news") {
        getNewsHandler = handler;
      }
    });

    registerNewsTools(mockServer as any);

    expect(getNewsHandler).toBeDefined();
    if (getNewsHandler) {
      const result = await getNewsHandler({ category: "top", limit: 2 });

      expect(result).toHaveProperty("content");
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0].text).toContain("topカテゴリの最新ニュース");
      expect(result.content[0].text).toContain("トップニュース1");
      expect(result.content[0].text).toContain("トップニュース2");
    }
  });

  test("search-newsツールがキーワードでニュースを検索する", async () => {
    let searchNewsHandler: Function | undefined;

    mockServer.tool.mockImplementation((name, _desc, _schema, handler) => {
      if (name === "search-news") {
        searchNewsHandler = handler;
      }
    });

    registerNewsTools(mockServer as any);

    // モックの実装を変更してキーワード検索をシミュレート
    jest.requireMock("rss-parser").mockImplementation(() => {
      return {
        parseURL: jest.fn().mockResolvedValue({
          items: [
            {
              title: "キーワードを含むニュース1",
              link: "https://news.yahoo.co.jp/articles/4",
              pubDate: "2023-04-15T07:00:00Z",
              contentSnippet: "テスト用のキーワードを含む内容1",
            },
            {
              title: "別のニュース",
              link: "https://news.yahoo.co.jp/articles/5",
              pubDate: "2023-04-15T06:00:00Z",
              contentSnippet: "キーワードを含まない内容",
            },
          ],
        }),
      };
    });

    expect(searchNewsHandler).toBeDefined();
    if (searchNewsHandler) {
      const result = await searchNewsHandler({
        keyword: "キーワード",
        category: "top",
        limit: 5,
      });

      expect(result).toHaveProperty("content");
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0].text).toContain(
        "「キーワード」に関連するニュース"
      );
    }
  });

  test.skip("エラーが発生した場合にエラーメッセージを返す", async () => {
    let getNewsHandler: Function | undefined;

    mockServer.tool.mockImplementation((name, _desc, _schema, handler) => {
      if (name === "get-news") {
        getNewsHandler = handler;
      }
    });

    registerNewsTools(mockServer as any);

    // モックの実装を変更してエラーをシミュレート
    const mockParser = jest.requireMock("rss-parser");
    mockParser.mockImplementation(() => {
      return {
        parseURL: jest.fn().mockRejectedValue(new Error("ネットワークエラー")),
      };
    });

    // モックをクリアして新しい実装を確実に適用する
    jest.clearAllMocks();
    registerNewsTools(mockServer as any);

    expect(getNewsHandler).toBeDefined();
    if (getNewsHandler) {
      const result = await getNewsHandler({ category: "top", limit: 2 });

      expect(result).toHaveProperty("content");
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty("type", "text");
      expect(result.content[0].text).toContain(
        "ニュースの取得中にエラーが発生しました"
      );
    }
  });
});
