# GNews API MCP Server

An MCP server implementation that integrates with the GNews API, providing access to the latest news articles across various categories and languages.

## Features

- **Global News Coverage**: Access news from over 60,000 sources worldwide
- **Multiple Languages**: Support for 22 languages including Japanese, English, and more
- **Category-based News**: Access news from different categories like general, business, technology, sports, etc.
- **Keyword Search**: Search for news articles containing specific keywords
- **Customizable Results**: Control the number of results returned
- **Rich Content**: Get article titles, publication dates, links, and content snippets

## Tools

- **search-news**

  - Search for news articles containing specific keywords
  - Inputs:
    - `keyword` (string): Search term
    - `lang` (string, optional): Language code (default: ja)
    - `country` (string, optional): Country code (default: jp)
    - `max` (number, optional): Number of results to return (max 10, default 5)

- **get-top-headlines**
  - Retrieve the latest top headlines from a specified category
  - Inputs:
    - `category` (string, optional): News category (general, world, nation, business, technology, entertainment, sports, science, health)
    - `lang` (string, optional): Language code (default: ja)
    - `country` (string, optional): Country code (default: jp)
    - `max` (number, optional): Number of results to return (max 10, default 5)

## Setup

### API Key

You need to obtain an API key from [GNews.io](https://gnews.io/register). Once you have your API key, you'll need to provide it as an environment variable when running the server.

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

### Docker

```json
{
  "mcpServers": {
    "gnews": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/gnews"],
      "env": {
        "GNEWS_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "gnews": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gnews"],
      "env": {
        "GNEWS_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

## Build

### Local Build

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the server
npm start
```

### Docker Build

```bash
docker build -t mcp/gnews:latest .
# APIキーを環境変数として渡す
docker run -i --rm -e GNEWS_API_KEY=YOUR_API_KEY_HERE mcp/gnews
```

## Example Queries

Here are some example queries you can use with this server:

1. Search for news about a specific topic:

   ```
   Search for news about artificial intelligence
   ```

2. Get top headlines in the technology category:

   ```
   Get the latest technology headlines
   ```

3. Search for news in a specific language and country:

   ```
   Find news about climate change in English from the US
   ```

4. Get business news with a limit:
   ```
   Show me the top 3 business headlines
   ```

## Limitations

- The free plan of GNews API is limited to 100 requests per day
- The free plan does not include full article content
- Commercial use requires a paid subscription

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
