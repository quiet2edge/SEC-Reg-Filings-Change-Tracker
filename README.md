# SEC/EDGAR Filing Change Detector 🚀

**AI-Agent-Ready SEC filing monitor with change detection and real-time alerts**

[![Apify Store](https://img.shields.io/badge/Apify-Store-03A9F4)](https://apify.com)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Monitor SEC EDGAR filings with AI-powered analysis, perfect for hedge funds, RIAs, and automated trading systems.

## Quick Start

\`\`\`json
{
  "watchlist": ["AAPL", "MSFT", "GOOGL"],
  "filingTypes": ["10-K", "10-Q", "8-K"],
  "enableChangeDetection": true,
  "webhookUrl": "https://your-api.com/webhook"
}
\`\`\`

## Features

- ✅ Monitor unlimited companies (CIK, ticker, or name)
- ✅ All filing types (10-K, 10-Q, 8-K, 13F, 4, DEF 14A, S-1, etc.)
- ✅ AI-powered change detection and diff analysis
- ✅ GPT-4 summaries, sentiment, and risk scoring
- ✅ Real-time webhook notifications
- ✅ Structured JSON output (AI-agent ready)

## For AI Agents

Perfect for LangChain, AutoGPT, and custom AI systems:

\`\`\`python
from apify_client import ApifyClient

client = ApifyClient("YOUR_TOKEN")
run = client.actor("yourusername/sec-edgar-scraper").call({
    "watchlist": ["AAPL"],
    "enableAiAnalysis": true
})
items = client.dataset(run["defaultDatasetId"]).list_items().items
print(items[0]["aiAnalysis"]["summary"])
\`\`\`

## Documentation

- [Input Schema](./INPUT_SCHEMA.json) - Complete input configuration
- [Output Schema](./OUTPUT_SCHEMA.json) - Output data structure
- [Examples](./examples/) - Integration examples

## Pricing

- **Starter**: $79/month - 5 companies, daily checks
- **Professional**: $299/month - 50 companies, hourly checks ⭐
- **Institutional**: $999/month - Unlimited, real-time

[Start Free Trial →](https://apify.com/yourusername/sec-edgar-scraper)
