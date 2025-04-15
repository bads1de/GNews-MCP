import { server } from "../src/server";

jest.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("MCPサーバー", () => {
  test.skip("サーバーが正しく設定されている", () => {
    expect(server).toBeDefined();
    expect(server.implementation).toBeDefined();
    expect(server.implementation.name).toBe("yahoo-news-server");
    expect(server.implementation.version).toBe("1.0.0");
  });
});
