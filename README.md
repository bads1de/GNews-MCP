# Yahoo News MCP Server

An MCP server implementation that integrates Yahoo News RSS feeds, providing access to the latest news articles across various categories in Japanese.

## Features

- **Category-based News**: Access news from different categories like top stories, domestic, world, business, etc.
- **Keyword Search**: Search for news articles containing specific keywords
- **Customizable Results**: Control the number of results returned
- **Rich Content**: Get article titles, publication dates, links, and content snippets
- **No API Key Required**: Uses publicly available RSS feeds

## Tools

- **get-news**

  - Retrieve the latest news from a specified category
  - Inputs:
    - `category` (string): News category (top, domestic, world, business, entertainment, sports, it, science)
    - `limit` (number, optional): Number of results to return (max 20, default 5)

- **search-news**
  - Search for news articles containing specific keywords
  - Inputs:
    - `keyword` (string): Search term
    - `category` (string, optional): Category to search within (default: top)
    - `limit` (number, optional): Number of results to return (max 20, default 5)

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

### Docker

```json
{
  "mcpServers": {
    "yahoo-news": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcp/yahoo-news"]
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "yahoo-news": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-yahoo-news"]
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
docker build -t mcp/yahoo-news:latest .
```

## Example Queries

Here are some example queries you can use with this server:

1. Get the latest top news:

   ```
   Get me the latest top news headlines from Yahoo Japan
   ```

2. Get business news:

   ```
   What's happening in the Japanese business world today?
   ```

3. Search for specific news:

   ```
   Find Japanese news about climate change
   ```

4. Get sports news with a limit:
   ```
   Show me the top 3 sports news articles from Yahoo Japan
   ```

**Note**: The news articles will be in Japanese, as they are sourced from Yahoo Japan's RSS feeds.

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
