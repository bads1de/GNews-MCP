import { jest } from "@jest/globals";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { searchNews, getTopHeadlines } from "../src/gnews.js";

// モック
jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined as never),
  })),
}));

jest.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        name: "gnews-server",
        version: "0.1.0",
        setRequestHandler: jest.fn(),
        connect: jest.fn(),
      };
    }),
  };
});

jest.mock("../src/gnews.js", () => ({
  searchNews: jest.fn(),
  getTopHeadlines: jest.fn(),
  formatArticles: jest.fn().mockImplementation((articles) => {
    return articles
      .map((a: any, i: number) => `${i + 1}. ${a.title}`)
      .join("\n");
  }),
}));

describe("MCPサーバー", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Serverクラスが正しく初期化される", async () => {
    await import("../src/index.js");

    expect(Server).toHaveBeenCalledWith(
      {
        name: "gnews-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  });

  test("searchNews関数が正しく呼び出される", async () => {
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

    (searchNews as jest.Mock).mockResolvedValue(mockArticles);

    // テスト実装
  });

  test("getTopHeadlines関数が正しく呼び出される", async () => {
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

    (getTopHeadlines as jest.Mock).mockResolvedValue(mockArticles);

    // テスト実装
  });
});
