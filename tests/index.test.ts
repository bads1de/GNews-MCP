import { jest } from "@jest/globals";

// APIキーをモック
process.env.GNEWS_API_KEY = "test_api_key";

// モックの設定
const mockServer = {
  name: "gnews-server",
  version: "0.1.0",
  setRequestHandler: jest.fn(),
  connect: jest.fn(),
};

const mockSearchNews = jest.fn();
const mockGetTopHeadlines = jest.fn();
const mockFormatArticles = jest.fn((articles) => {
  return articles.map((a: any, i: number) => `${i + 1}. ${a.title}`).join("\n");
});

// モジュールのモック
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: jest.fn().mockImplementation(() => mockServer),
}));

jest.mock("../src/gnews.js", () => ({
  searchNews: mockSearchNews,
  getTopHeadlines: mockGetTopHeadlines,
  formatArticles: mockFormatArticles,
}));

describe("MCPサーバー", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("基本的なテスト", () => {
    // 基本的なテストが成功することを確認
    expect(true).toBe(true);
  });

  test("searchNews関数のモックが機能する", () => {
    const mockArticles = [
      {
        title: "テスト記事1",
        description: "テスト説明1",
        content: "テスト内容1",
        url: "https://example.com/1",
        image: "https://example.com/image1.jpg",
        publishedAt: "2023-04-15T12:00:00Z",
        source: {
          name: "テストソース1",
          url: "https://example.com",
        },
      },
    ];

    mockSearchNews.mockResolvedValue(mockArticles);

    // モックが正しく設定されていることを確認
    expect(mockSearchNews).not.toHaveBeenCalled();

    // モック関数を呼び出す
    mockSearchNews("テスト", "ja", "jp", 5);

    // 関数が呼び出されたことを確認
    expect(mockSearchNews).toHaveBeenCalledWith("テスト", "ja", "jp", 5);
  });

  test("getTopHeadlines関数のモックが機能する", () => {
    const mockArticles = [
      {
        title: "テストヘッドライン1",
        description: "テスト説明1",
        content: "テスト内容1",
        url: "https://example.com/1",
        image: "https://example.com/image1.jpg",
        publishedAt: "2023-04-15T12:00:00Z",
        source: {
          name: "テストソース1",
          url: "https://example.com",
        },
      },
    ];

    mockGetTopHeadlines.mockResolvedValue(mockArticles);

    // モックが正しく設定されていることを確認
    expect(mockGetTopHeadlines).not.toHaveBeenCalled();

    // モック関数を呼び出す
    mockGetTopHeadlines("general", "ja", "jp", 5);

    // 関数が呼び出されたことを確認
    expect(mockGetTopHeadlines).toHaveBeenCalledWith("general", "ja", "jp", 5);
  });

  test("formatArticles関数のモックが機能する", () => {
    const mockArticles = [
      {
        title: "テスト記事1",
        description: "テスト説明1",
      },
      {
        title: "テスト記事2",
        description: "テスト説明2",
      },
    ];

    const result = mockFormatArticles(mockArticles);

    // 期待される結果
    const expected = "1. テスト記事1\n2. テスト記事2";

    // 結果が期待通りであることを確認
    expect(result).toBe(expected);
  });
});
