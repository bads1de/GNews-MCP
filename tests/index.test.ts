import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { jest } from "@jest/globals";

jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined as never),
  })),
}));

// Server クラスのモック
jest.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        name: "yahoo-news-server",
        version: "0.1.0",
        setRequestHandler: jest.fn(),
        connect: jest.fn(),
      };
    }),
  };
});

describe("MCPサーバー", () => {
  test("Serverクラスが正しく初期化される", async () => {
    // index.ts をインポートして Server コンストラクタが呼ばれることを確認
    await import("../index.js");

    // Server コンストラクタが正しいパラメータで呼ばれたことを確認
    expect(Server).toHaveBeenCalledWith(
      {
        name: "yahoo-news-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  });
});
