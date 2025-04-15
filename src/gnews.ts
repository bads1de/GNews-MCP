// src/gnews.ts
import axios from "axios";

// GNews APIのベースURL
const GNEWS_API_BASE_URL = "https://gnews.io/api/v4";

// APIキーの取得（環境変数から）
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

// GNews APIのレスポンス型
export interface GNewsResponse {
  totalArticles: number;
  articles: Article[];
}

// 記事の型
export interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

/**
 * キーワードでニュース記事を検索する
 * @param keyword 検索キーワード
 * @param lang 言語コード（デフォルト: ja）
 * @param country 国コード（デフォルト: jp）
 * @param max 取得する記事の最大数（デフォルト: 5）
 * @returns 検索結果の記事配列
 */
export async function searchNews(
  keyword: string,
  lang: string = "ja",
  country: string = "jp",
  max: number = 5
): Promise<Article[]> {
  try {
    if (!GNEWS_API_KEY) {
      throw new Error("GNews API key is not set.");
    }

    console.error(`[INFO] Searching with keyword "${keyword}"`);

    const url = `${GNEWS_API_BASE_URL}/search`;

    const response = await axios.get<GNewsResponse>(url, {
      params: {
        q: keyword,
        lang,
        country,
        max,
        apikey: GNEWS_API_KEY,
      },
    });

    console.error(`[INFO] Found ${response.data.articles.length} articles`);

    return response.data.articles;
  } catch (error) {
    console.error("News search error:", error);

    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error("API daily quota reached. Please try again tomorrow.");
    }

    throw new Error(
      `Error occurred while searching for news: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * トップヘッドラインのニュース記事を取得する
 * @param category カテゴリ（デフォルト: general）
 * @param lang 言語コード（デフォルト: ja）
 * @param country 国コード（デフォルト: jp）
 * @param max 取得する記事の最大数（デフォルト: 5）
 * @returns トップヘッドラインの記事配列
 */
export async function getTopHeadlines(
  category: string = "general",
  lang: string = "ja",
  country: string = "jp",
  max: number = 5
): Promise<Article[]> {
  try {
    if (!GNEWS_API_KEY) {
      throw new Error("GNews API key is not set.");
    }

    console.error(`[INFO] Fetching top headlines for category "${category}"`);

    const url = `${GNEWS_API_BASE_URL}/top-headlines`;

    const response = await axios.get<GNewsResponse>(url, {
      params: {
        category,
        lang,
        country,
        max,
        apikey: GNEWS_API_KEY,
      },
    });

    console.error(`[INFO] Found ${response.data.articles.length} articles`);

    return response.data.articles;
  } catch (error) {
    console.error("Top headlines fetch error:", error);

    if (axios.isAxiosError(error) && error.response?.status === 403) {
      throw new Error("API daily quota reached. Please try again tomorrow.");
    }

    throw new Error(
      `Error occurred while fetching top headlines: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * 記事を整形された文字列に変換する
 * @param articles 記事の配列
 * @returns 整形された記事の文字列
 */
export function formatArticles(articles: Article[]): string {
  if (articles.length === 0) {
    return "No articles found.";
  }

  return articles
    .map((article, index) => {
      return `${index + 1}. ${article.title}\n   Published: ${
        article.publishedAt
      }\n   Source: ${article.source.name}\n   Link: ${article.url}\n   ${
        article.description || ""
      }\n`;
    })
    .join("\n");
}
