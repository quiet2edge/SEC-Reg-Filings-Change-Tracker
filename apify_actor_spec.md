# SEC/EDGAR Regulatory Filings Change-Detection Scraper
## Apify Actor Specification v1.0

---

## Table of Contents

1. [Actor Overview](#actor-overview)
2. [Input Schema](#input-schema)
3. [Output Schema](#output-schema)
4. [Webhook Schema](#webhook-schema)
5. [AI Agent Integration](#ai-agent-integration)
6. [Use Cases](#use-cases)

---

## 1. Actor Overview

### Purpose
Continuously monitor SEC EDGAR filings for changes and deliver structured, AI-ready data to humans and automated systems.

### Key Features
- ✅ Real-time change detection across all SEC filing types
- ✅ AI-optimized structured output (JSON, CSV, RSS)
- ✅ Webhook notifications for immediate alerts
- ✅ Historical comparison and delta detection
- ✅ Natural language summaries (AI-generated)
- ✅ Company entity resolution and enrichment
- ✅ Sentiment analysis on MD&A sections
- ✅ API-first design for agent consumption

### Supported Filing Types
- **10-K** (Annual Reports)
- **10-Q** (Quarterly Reports)
- **8-K** (Current Events)
- **13F** (Institutional Holdings)
- **4** (Insider Trading)
- **DEF 14A** (Proxy Statements)
- **S-1** (IPO Registration)
- **424B** (Prospectus)
- **SC 13D/G** (Beneficial Ownership)

---

## 2. Input Schema

### Complete JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SEC/EDGAR Change Detection Scraper Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    
    "watchlist": {
      "title": "Company Watchlist",
      "type": "array",
      "description": "List of companies to monitor. Can be CIK, ticker, or company name.",
      "editor": "requestListSources",
      "example": [
        {"type": "cik", "value": "0000320193"},
        {"type": "ticker", "value": "AAPL"},
        {"type": "name", "value": "Apple Inc."}
      ],
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["cik", "ticker", "name", "cusip"],
            "default": "ticker"
          },
          "value": {
            "type": "string",
            "description": "Company identifier value"
          },
          "priority": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"],
            "default": "medium",
            "description": "Alert priority level"
          }
        },
        "required": ["type", "value"]
      }
    },
    
    "filingTypes": {
      "title": "Filing Types to Monitor",
      "type": "array",
      "description": "Which SEC filing types to track",
      "editor": "select",
      "default": ["10-K", "10-Q", "8-K"],
      "items": {
        "type": "string",
        "enum": [
          "10-K", "10-Q", "8-K", "13F", "4", "DEF 14A",
          "S-1", "S-3", "S-4", "424B", "SC 13D", "SC 13G",
          "ALL"
        ]
      }
    },
    
    "changeDetection": {
      "title": "Change Detection Settings",
      "type": "object",
      "description": "How to detect and report changes",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable change detection"
        },
        "compareAgainst": {
          "type": "string",
          "enum": ["previous_filing", "same_period_last_year", "custom_baseline"],
          "default": "previous_filing",
          "description": "What to compare against"
        },
        "threshold": {
          "type": "number",
          "default": 0.05,
          "minimum": 0,
          "maximum": 1,
          "description": "Minimum % change to report (0.05 = 5%)"
        },
        "sections": {
          "type": "array",
          "description": "Which sections to monitor for changes",
          "items": {
            "type": "string",
            "enum": [
              "all",
              "business_description",
              "risk_factors",
              "md_and_a",
              "financial_statements",
              "notes_to_financials",
              "legal_proceedings",
              "executive_compensation",
              "beneficial_ownership",
              "exhibits"
            ]
          },
          "default": ["all"]
        },
        "detectTypes": {
          "type": "array",
          "description": "Types of changes to detect",
          "items": {
            "type": "string",
            "enum": [
              "text_changes",
              "numeric_changes",
              "new_sections",
              "removed_sections",
              "sentiment_shifts",
              "risk_additions",
              "executive_changes",
              "financial_restatements"
            ]
          },
          "default": ["text_changes", "numeric_changes"]
        }
      }
    },
    
    "aiProcessing": {
      "title": "AI Processing Options",
      "type": "object",
      "description": "AI-powered analysis and enrichment",
      "properties": {
        "generateSummary": {
          "type": "boolean",
          "default": true,
          "description": "Generate natural language summary of changes"
        },
        "sentimentAnalysis": {
          "type": "boolean",
          "default": true,
          "description": "Perform sentiment analysis on MD&A"
        },
        "keyTopicsExtraction": {
          "type": "boolean",
          "default": true,
          "description": "Extract key topics and themes"
        },
        "riskScoring": {
          "type": "boolean",
          "default": true,
          "description": "Calculate risk score based on changes"
        },
        "entityExtraction": {
          "type": "boolean",
          "default": true,
          "description": "Extract entities (people, companies, products)"
        },
        "summaryLength": {
          "type": "string",
          "enum": ["brief", "medium", "detailed"],
          "default": "medium",
          "description": "Length of AI-generated summaries"
        }
      }
    },
    
    "outputFormats": {
      "title": "Output Format Options",
      "type": "object",
      "description": "How to format the output data",
      "properties": {
        "json": {
          "type": "boolean",
          "default": true,
          "description": "Output as JSON (AI-agent ready)"
        },
        "csv": {
          "type": "boolean",
          "default": false,
          "description": "Output as CSV (Excel-friendly)"
        },
        "rss": {
          "type": "boolean",
          "default": false,
          "description": "Generate RSS feed"
        },
        "markdown": {
          "type": "boolean",
          "default": false,
          "description": "Generate Markdown reports"
        },
        "includeRawHtml": {
          "type": "boolean",
          "default": false,
          "description": "Include raw HTML from filing"
        },
        "includePdfLinks": {
          "type": "boolean",
          "default": true,
          "description": "Include links to PDF versions"
        }
      }
    },
    
    "notifications": {
      "title": "Notification Settings",
      "type": "object",
      "description": "How to receive alerts",
      "properties": {
        "webhookUrl": {
          "type": "string",
          "editor": "textfield",
          "description": "Webhook URL for real-time notifications",
          "example": "https://your-api.com/webhook/sec-filings"
        },
        "webhookHeaders": {
          "type": "object",
          "description": "Custom headers for webhook requests",
          "editor": "json",
          "example": {
            "Authorization": "Bearer your_token_here",
            "X-Custom-Header": "value"
          }
        },
        "notifyOn": {
          "type": "array",
          "description": "When to send notifications",
          "items": {
            "type": "string",
            "enum": [
              "any_filing",
              "priority_filings_only",
              "material_changes_only",
              "critical_changes_only"
            ]
          },
          "default": ["material_changes_only"]
        },
        "emailNotifications": {
          "type": "boolean",
          "default": false,
          "description": "Send email notifications (requires email setup)"
        },
        "email": {
          "type": "string",
          "editor": "textfield",
          "description": "Email address for notifications"
        }
      }
    },
    
    "schedule": {
      "title": "Monitoring Schedule",
      "type": "object",
      "description": "How often to check for new filings",
      "properties": {
        "frequency": {
          "type": "string",
          "enum": [
            "realtime",
            "every_15_minutes",
            "hourly",
            "every_4_hours",
            "daily",
            "weekly"
          ],
          "default": "hourly",
          "description": "Check frequency"
        },
        "businessHoursOnly": {
          "type": "boolean",
          "default": false,
          "description": "Only check during market hours (9:30 AM - 4:00 PM ET)"
        },
        "timezone": {
          "type": "string",
          "default": "America/New_York",
          "description": "Timezone for scheduling"
        }
      }
    },
    
    "historicalData": {
      "title": "Historical Data Settings",
      "type": "object",
      "description": "Options for historical filing analysis",
      "properties": {
        "backfill": {
          "type": "boolean",
          "default": false,
          "description": "Backfill historical filings on first run"
        },
        "backfillPeriod": {
          "type": "string",
          "enum": ["1_month", "3_months", "6_months", "1_year", "all"],
          "default": "3_months",
          "description": "How far back to backfill"
        },
        "createBaseline": {
          "type": "boolean",
          "default": true,
          "description": "Create baseline for future comparisons"
        }
      }
    },
    
    "filtering": {
      "title": "Advanced Filtering",
      "type": "object",
      "description": "Filter filings by criteria",
      "properties": {
        "minimumMarketCap": {
          "type": "number",
          "description": "Minimum market cap in millions (USD)",
          "example": 100
        },
        "industries": {
          "type": "array",
          "description": "Filter by SIC industry codes",
          "items": {
            "type": "string"
          },
          "example": ["7372", "7370"]
        },
        "excludeAmended": {
          "type": "boolean",
          "default": false,
          "description": "Exclude amended filings"
        },
        "keywordFilter": {
          "type": "array",
          "description": "Only notify if filing contains these keywords",
          "items": {
            "type": "string"
          },
          "example": ["merger", "acquisition", "restructuring"]
        }
      }
    },
    
    "dataEnrichment": {
      "title": "Data Enrichment",
      "type": "object",
      "description": "Additional data to include",
      "properties": {
        "includeStockPrice": {
          "type": "boolean",
          "default": true,
          "description": "Include current stock price"
        },
        "includeMarketCap": {
          "type": "boolean",
          "default": true,
          "description": "Include market capitalization"
        },
        "includeAnalystRatings": {
          "type": "boolean",
          "default": false,
          "description": "Include analyst ratings summary"
        },
        "includeInsiderTrades": {
          "type": "boolean",
          "default": false,
          "description": "Include recent insider trades"
        },
        "includeCompetitorFilings": {
          "type": "boolean",
          "default": false,
          "description": "Include same-day filings from competitors"
        }
      }
    },
    
    "performance": {
      "title": "Performance Settings",
      "type": "object",
      "description": "Scraper performance configuration",
      "properties": {
        "maxConcurrency": {
          "type": "integer",
          "default": 10,
          "minimum": 1,
          "maximum": 50,
          "description": "Maximum concurrent requests"
        },
        "requestTimeout": {
          "type": "integer",
          "default": 60,
          "minimum": 10,
          "maximum": 300,
          "description": "Request timeout in seconds"
        },
        "retryOnError": {
          "type": "boolean",
          "default": true,
          "description": "Retry failed requests"
        },
        "maxRetries": {
          "type": "integer",
          "default": 3,
          "minimum": 0,
          "maximum": 10,
          "description": "Maximum retry attempts"
        }
      }
    },
    
    "debug": {
      "title": "Debug Options",
      "type": "object",
      "description": "Debugging and logging",
      "properties": {
        "verbose": {
          "type": "boolean",
          "default": false,
          "description": "Enable verbose logging"
        },
        "saveScreenshots": {
          "type": "boolean",
          "default": false,
          "description": "Save screenshots of filings"
        },
        "saveRawHtml": {
          "type": "boolean",
          "default": false,
          "description": "Save raw HTML to dataset"
        }
      }
    }
    
  },
  "required": ["watchlist"]
}
```

---

## 3. Output Schema

### Complete JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SEC/EDGAR Filing Change Detection Output",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    
    "metadata": {
      "type": "object",
      "description": "Scraper run metadata",
      "properties": {
        "scraperId": {
          "type": "string",
          "description": "Unique identifier for this scraper run"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "When this data was scraped (ISO 8601)"
        },
        "version": {
          "type": "string",
          "description": "Actor version"
        },
        "totalFilingsChecked": {
          "type": "integer",
          "description": "Number of filings checked"
        },
        "newFilingsFound": {
          "type": "integer",
          "description": "Number of new filings discovered"
        },
        "changesDetected": {
          "type": "integer",
          "description": "Number of changes detected"
        },
        "executionTime": {
          "type": "number",
          "description": "Execution time in seconds"
        }
      }
    },
    
    "company": {
      "type": "object",
      "description": "Company information",
      "properties": {
        "name": {
          "type": "string",
          "description": "Official company name",
          "example": "Apple Inc."
        },
        "ticker": {
          "type": "string",
          "description": "Stock ticker symbol",
          "example": "AAPL"
        },
        "cik": {
          "type": "string",
          "description": "SEC Central Index Key",
          "example": "0000320193"
        },
        "cusip": {
          "type": "string",
          "description": "CUSIP identifier",
          "example": "037833100"
        },
        "lei": {
          "type": "string",
          "description": "Legal Entity Identifier"
        },
        "sic": {
          "type": "string",
          "description": "Standard Industrial Classification code",
          "example": "3571"
        },
        "industry": {
          "type": "string",
          "description": "Industry name",
          "example": "Electronic Computers"
        },
        "sector": {
          "type": "string",
          "description": "Market sector",
          "example": "Technology"
        },
        "fiscalYearEnd": {
          "type": "string",
          "description": "Fiscal year end date (MMDD)",
          "example": "0930"
        },
        "stateOfIncorporation": {
          "type": "string",
          "example": "CA"
        },
        "website": {
          "type": "string",
          "format": "uri",
          "example": "https://www.apple.com"
        }
      }
    },
    
    "filing": {
      "type": "object",
      "description": "Filing details",
      "properties": {
        "accessionNumber": {
          "type": "string",
          "description": "SEC accession number",
          "example": "0000320193-24-000123"
        },
        "filingType": {
          "type": "string",
          "description": "Type of SEC filing",
          "example": "10-K"
        },
        "filingDate": {
          "type": "string",
          "format": "date",
          "description": "Date filing was submitted",
          "example": "2024-10-31"
        },
        "acceptanceDateTime": {
          "type": "string",
          "format": "date-time",
          "description": "When SEC accepted the filing"
        },
        "reportDate": {
          "type": "string",
          "format": "date",
          "description": "Period end date for the report",
          "example": "2024-09-30"
        },
        "fiscalYear": {
          "type": "integer",
          "example": 2024
        },
        "fiscalPeriod": {
          "type": "string",
          "enum": ["Q1", "Q2", "Q3", "Q4", "FY"],
          "example": "FY"
        },
        "isAmendment": {
          "type": "boolean",
          "description": "Whether this is an amended filing"
        },
        "amendmentNumber": {
          "type": "integer",
          "description": "Amendment number if applicable"
        },
        "effectiveDate": {
          "type": "string",
          "format": "date",
          "description": "Effective date if applicable"
        }
      }
    },
    
    "urls": {
      "type": "object",
      "description": "URLs for accessing the filing",
      "properties": {
        "edgarUrl": {
          "type": "string",
          "format": "uri",
          "description": "SEC EDGAR filing page",
          "example": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000320193"
        },
        "filingUrl": {
          "type": "string",
          "format": "uri",
          "description": "Direct link to filing document"
        },
        "htmlUrl": {
          "type": "string",
          "format": "uri",
          "description": "HTML version of filing"
        },
        "pdfUrl": {
          "type": "string",
          "format": "uri",
          "description": "PDF version of filing"
        },
        "xbrlUrl": {
          "type": "string",
          "format": "uri",
          "description": "XBRL data files"
        },
        "exhibitsUrl": {
          "type": "string",
          "format": "uri",
          "description": "Filing exhibits"
        }
      }
    },
    
    "changeDetection": {
      "type": "object",
      "description": "Changes detected vs previous filing",
      "properties": {
        "hasChanges": {
          "type": "boolean",
          "description": "Whether any changes were detected"
        },
        "changeScore": {
          "type": "number",
          "minimum": 0,
          "maximum": 1,
          "description": "Overall change magnitude (0-1)"
        },
        "changeSeverity": {
          "type": "string",
          "enum": ["minor", "moderate", "significant", "critical"],
          "description": "Severity classification"
        },
        "comparedTo": {
          "type": "object",
          "description": "What filing was used for comparison",
          "properties": {
            "accessionNumber": {
              "type": "string"
            },
            "filingDate": {
              "type": "string",
              "format": "date"
            },
            "filingType": {
              "type": "string"
            }
          }
        },
        "sections": {
          "type": "array",
          "description": "Changes by section",
          "items": {
            "type": "object",
            "properties": {
              "sectionName": {
                "type": "string",
                "example": "Risk Factors"
              },
              "sectionType": {
                "type": "string",
                "enum": [
                  "business_description",
                  "risk_factors",
                  "md_and_a",
                  "financial_statements",
                  "notes_to_financials",
                  "legal_proceedings",
                  "executive_compensation",
                  "other"
                ]
              },
              "changeType": {
                "type": "string",
                "enum": ["added", "removed", "modified", "unchanged"]
              },
              "changePercentage": {
                "type": "number",
                "description": "% of text changed"
              },
              "wordCountDelta": {
                "type": "integer",
                "description": "Change in word count"
              },
              "significantChanges": {
                "type": "array",
                "description": "List of significant changes",
                "items": {
                  "type": "object",
                  "properties": {
                    "type": {
                      "type": "string",
                      "enum": [
                        "new_risk_added",
                        "risk_removed",
                        "tone_change",
                        "numeric_change",
                        "policy_change",
                        "other"
                      ]
                    },
                    "description": {
                      "type": "string",
                      "description": "Human-readable description"
                    },
                    "oldText": {
                      "type": "string",
                      "description": "Previous text (if applicable)"
                    },
                    "newText": {
                      "type": "string",
                      "description": "New text"
                    },
                    "confidence": {
                      "type": "number",
                      "minimum": 0,
                      "maximum": 1,
                      "description": "Confidence score for this change"
                    }
                  }
                }
              }
            }
          }
        },
        "keyChanges": {
          "type": "array",
          "description": "Top 10 most significant changes",
          "items": {
            "type": "object",
            "properties": {
              "rank": {
                "type": "integer"
              },
              "category": {
                "type": "string"
              },
              "summary": {
                "type": "string"
              },
              "impact": {
                "type": "string",
                "enum": ["low", "medium", "high", "critical"]
              }
            }
          }
        }
      }
    },
    
    "financialData": {
      "type": "object",
      "description": "Key financial metrics (for 10-K/10-Q)",
      "properties": {
        "revenue": {
          "type": "object",
          "properties": {
            "current": {
              "type": "number",
              "description": "Revenue for current period"
            },
            "previous": {
              "type": "number",
              "description": "Revenue for comparison period"
            },
            "change": {
              "type": "number",
              "description": "Change in revenue"
            },
            "changePercent": {
              "type": "number",
              "description": "% change in revenue"
            },
            "currency": {
              "type": "string",
              "default": "USD"
            }
          }
        },
        "netIncome": {
          "type": "object",
          "properties": {
            "current": {"type": "number"},
            "previous": {"type": "number"},
            "change": {"type": "number"},
            "changePercent": {"type": "number"}
          }
        },
        "eps": {
          "type": "object",
          "description": "Earnings per share",
          "properties": {
            "basic": {"type": "number"},
            "diluted": {"type": "number"},
            "previous": {"type": "number"},
            "changePercent": {"type": "number"}
          }
        },
        "assets": {
          "type": "object",
          "properties": {
            "total": {"type": "number"},
            "current": {"type": "number"},
            "change": {"type": "number"}
          }
        },
        "liabilities": {
          "type": "object",
          "properties": {
            "total": {"type": "number"},
            "current": {"type": "number"},
            "change": {"type": "number"}
          }
        },
        "cashFlow": {
          "type": "object",
          "properties": {
            "operating": {"type": "number"},
            "investing": {"type": "number"},
            "financing": {"type": "number"}
          }
        },
        "keyRatios": {
          "type": "object",
          "properties": {
            "currentRatio": {"type": "number"},
            "debtToEquity": {"type": "number"},
            "returnOnEquity": {"type": "number"},
            "profitMargin": {"type": "number"}
          }
        }
      }
    },
    
    "aiAnalysis": {
      "type": "object",
      "description": "AI-generated analysis",
      "properties": {
        "summary": {
          "type": "string",
          "description": "Natural language summary of filing and changes",
          "example": "Apple filed its 10-K for fiscal year 2024, reporting 8% revenue growth. Key changes include new AI capabilities disclosure and updated supply chain risks."
        },
        "keyTakeaways": {
          "type": "array",
          "description": "Bullet-point key takeaways",
          "items": {
            "type": "string"
          },
          "example": [
            "Revenue grew 8% YoY to $394.3B",
            "Services revenue now 24% of total",
            "New AI strategy disclosed for first time",
            "Supply chain risk language strengthened"
          ]
        },
        "sentiment": {
          "type": "object",
          "description": "Sentiment analysis",
          "properties": {
            "overall": {
              "type": "string",
              "enum": ["very_positive", "positive", "neutral", "negative", "very_negative"]
            },
            "score": {
              "type": "number",
              "minimum": -1,
              "maximum": 1,
              "description": "Sentiment score (-1 to 1)"
            },
            "confidence": {
              "type": "number",
              "minimum": 0,
              "maximum": 1
            },
            "sentimentChange": {
              "type": "string",
              "description": "Change vs previous filing",
              "enum": ["more_positive", "unchanged", "more_negative"]
            },
            "bySection": {
              "type": "object",
              "description": "Sentiment by section",
              "additionalProperties": {
                "type": "number"
              }
            }
          }
        },
        "riskScore": {
          "type": "object",
          "description": "AI-calculated risk assessment",
          "properties": {
            "overall": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "Overall risk score (0-100)"
            },
            "category": {
              "type": "string",
              "enum": ["low", "moderate", "high", "critical"]
            },
            "factors": {
              "type": "array",
              "description": "Contributing risk factors",
              "items": {
                "type": "object",
                "properties": {
                  "factor": {"type": "string"},
                  "weight": {"type": "number"},
                  "description": {"type": "string"}
                }
              }
            },
            "trend": {
              "type": "string",
              "enum": ["increasing", "stable", "decreasing"]
            }
          }
        },
        "entities": {
          "type": "object",
          "description": "Extracted entities",
          "properties": {
            "people": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": {"type": "string"},
                  "role": {"type": "string"},
                  "mentions": {"type": "integer"}
                }
              }
            },
            "companies": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "name": {"type": "string"},
                  "relationship": {"type": "string"},
                  "mentions": {"type": "integer"}
                }
              }
            },
            "products": {
              "type": "array",
              "items": {
                "type": "string"
              }
            },
            "locations": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          }
        },
        "topics": {
          "type": "array",
          "description": "Key topics and themes",
          "items": {
            "type": "object",
            "properties": {
              "topic": {"type": "string"},
              "relevance": {"type": "number"},
              "trendDirection": {
                "type": "string",
                "enum": ["increasing", "stable", "decreasing"]
              }
            }
          }
        },
        "recommendations": {
          "type": "array",
          "description": "AI-generated action recommendations",
          "items": {
            "type": "object",
            "properties": {
              "action": {"type": "string"},
              "priority": {
                "type": "string",
                "enum": ["low", "medium", "high", "urgent"]
              },
              "rationale": {"type": "string"}
            }
          }
        }
      }
    },
    
    "marketData": {
      "type": "object",
      "description": "Market data at time of filing",
      "properties": {
        "stockPrice": {
          "type": "object",
          "properties": {
            "current": {"type": "number"},
            "change": {"type": "number"},
            "changePercent": {"type": "number"},
            "asOf": {"type": "string", "format": "date-time"}
          }
        },
        "marketCap": {
          "type": "number",
          "description": "Market capitalization in USD"
        },
        "volume": {
          "type": "integer",
          "description": "Trading volume"
        },
        "analystRatings": {
          "type": "object",
          "properties": {
            "strongBuy": {"type": "integer"},
            "buy": {"type": "integer"},
            "hold": {"type": "integer"},
            "sell": {"type": "integer"},
            "strongSell": {"type": "integer"},
            "consensus": {"type": "string"}
          }
        }
      }
    },
    
    "alerts": {
      "type": "array",
      "description": "Triggered alerts",
      "items": {
        "type": "object",
        "properties": {
          "alertId": {
            "type": "string"
          },
          "severity": {
            "type": "string",
            "enum": ["info", "warning", "critical"]
          },
          "category": {
            "type": "string",
            "example": "material_change"
          },
          "title": {
            "type": "string",
            "example": "Significant Risk Factor Addition"
          },
          "description": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "actionRequired": {
            "type": "boolean"
          }
        }
      }
    },
    
    "raw": {
      "type": "object",
      "description": "Raw data (optional)",
      "properties": {
        "html": {
          "type": "string",
          "description": "Raw HTML of filing (if requested)"
        },
        "text": {
          "type": "string",
          "description": "Extracted plain text"
        },
        "xbrl": {
          "type": "object",
          "description": "Parsed XBRL data"
        }
      }
    }
    
  },
  "required": ["metadata", "company", "filing", "urls"]
}
```

---

## 4. Webhook Schema

### Real-time Notification Payload

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SEC Filing Change Webhook Payload",
  "type": "object",
  "properties": {
    
    "webhookId": {
      "type": "string",
      "description": "Unique webhook delivery ID"
    },
    
    "timestamp": {
      "type": "string",
      "format": "date-time",
      "description": "When webhook was sent"
    },
    
    "event": {
      "type": "string",
      "enum": [
        "new_filing",
        "material_change_detected",
        "critical_alert",
        "insider_trade",
        "earnings_release"
      ],
      "description": "Event that triggered webhook"
    },
    
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "critical"],
      "description": "Alert priority level"
    },
    
    "company": {
      "type": "object",
      "properties": {
        "name": {"type": "string"},
        "ticker": {"type": "string"},
        "cik": {"type": "string"}
      }
    },
    
    "filing": {
      "type": "object",
      "properties": {
        "type": {"type": "string"},
        "date": {"type": "string", "format": "date"},
        "accessionNumber": {"type": "string"},
        "url": {"type": "string", "format": "uri"}
      }
    },
    
    "summary": {
      "type": "string",
      "description": "Brief summary of what changed",
      "example": "Apple 10-K filed. Key changes: +15% risk factors, new AI disclosure, supply chain updates."
    },
    
    "changeScore": {
      "type": "number",
      "description": "Magnitude of changes (0-1)"
    },
    
    "keyChanges": {
      "type": "array",
      "description": "Top 5 most significant changes",
      "items": {
        "type": "string"
      }
    },
    
    "riskScore": {
      "type": "number",
      "description": "AI-calculated risk score (0-100)"
    },
    
    "sentiment": {
      "type": "string",
      "enum": ["very_positive", "positive", "neutral", "negative", "very_negative"]
    },
    
    "actions": {
      "type": "array",
      "description": "Recommended actions",
      "items": {
        "type": "object",
        "properties": {
          "action": {"type": "string"},
          "priority": {"type": "string"},
          "url": {"type": "string"}
        }
      }
    },
    
    "dataUrl": {
      "type": "string",
      "format": "uri",
      "description": "URL to fetch full structured data",
      "example": "https://api.apify.com/v2/datasets/abc123/items"
    },
    
    "metadata": {
      "type": "object",
      "description": "Additional metadata",
      "properties": {
        "actorRunId": {"type": "string"},
        "datasetId": {"type": "string"}
      }
    }
    
  },
  "required": ["webhookId", "timestamp", "event", "company", "filing", "summary"]
}
```

### Webhook Example Payload

```json
{
  "webhookId": "wh_abc123def456",
  "timestamp": "2024-11-01T16:30:00Z",
  "event": "material_change_detected",
  "priority": "high",
  "company": {
    "name": "Apple Inc.",
    "ticker": "AAPL",
    "cik": "0000320193"
  },
  "filing": {
    "type": "10-K",
    "date": "2024-10-31",
    "accessionNumber": "0000320193-24-000123",
    "url": "https://www.sec.gov/cgi-bin/viewer?action=view&cik=320193&accession_number=0000320193-24-000123"
  },
  "summary": "Apple filed its fiscal 2024 10-K. Notable changes: Risk factors section increased 15%, new AI/ML disclosure added, supply chain risk language strengthened. Financial performance: Revenue +8% YoY, Services revenue now 24% of total.",
  "changeScore": 0.72,
  "keyChanges": [
    "New AI/ML capabilities disclosed in Business Description",
    "Supply chain risk language strengthened in Risk Factors",
    "Three new risk factors added related to geopolitical tensions",
    "Executive compensation structure modified",
    "Environmental initiatives expanded in sustainability section"
  ],
  "riskScore": 65,
  "sentiment": "neutral",
  "actions": [
    {
      "action": "Review new risk factor disclosures",
      "priority": "high",
      "url": "https://api.apify.com/v2/datasets/abc123/items?section=risk_factors"
    },
    {
      "action": "Analyze AI strategy implications",
      "priority": "medium",
      "url": "https://api.apify.com/v2/datasets/abc123/items?section=business"
    }
  ],
  "dataUrl": "https://api.apify.com/v2/datasets/abc123/items/001",
  "metadata": {
    "actorRunId": "run_123456",
    "datasetId": "abc123"
  }
}
```

---

## 5. AI Agent Integration

### Consumption Pattern for AI Agents

```python
# Example: AI Agent consuming SEC filing data from Apify

import requests
import json

class SECFilingAgent:
    """
    AI Agent that monitors SEC filings and takes automated actions
    """
    
    def __init__(self, apify_token: str, webhook_url: str):
        self.apify_token = apify_token
        self.webhook_url = webhook_url
        
    def setup_monitoring(self, companies: list):
        """
        Configure Apify actor to monitor companies
        """
        input_config = {
            "watchlist": [
                {"type": "ticker", "value": ticker, "priority": "high"}
                for ticker in companies
            ],
            "filingTypes": ["10-K", "10-Q", "8-K"],
            "changeDetection": {
                "enabled": True,
                "threshold": 0.05
            },
            "aiProcessing": {
                "generateSummary": True,
                "sentimentAnalysis": True,
                "riskScoring": True
            },
            "notifications": {
                "webhookUrl": self.webhook_url,
                "notifyOn": ["material_changes_only"]
            },
            "schedule": {
                "frequency": "hourly"
            }
        }
        
        # Start Apify actor
        response = requests.post(
            "https://api.apify.com/v2/acts/your-actor-id/runs",
            headers={"Authorization": f"Bearer {self.apify_token}"},
            json=input_config
        )
        
        return response.json()
    
    def process_webhook(self, webhook_data: dict):
        """
        Process incoming webhook from Apify
        AI agent decides what action to take
        """
        priority = webhook_data['priority']
        change_score = webhook_data['changeScore']
        risk_score = webhook_data['riskScore']
        
        # Fetch full structured data
        data_url = webhook_data['dataUrl']
        full_data = requests.get(
            data_url,
            headers={"Authorization": f"Bearer {self.apify_token}"}
        ).json()
        
        # AI decision logic
        if priority == "critical" or risk_score > 80:
            self.trigger_critical_alert(full_data)
        
        if change_score > 0.5:
            self.analyze_changes(full_data)
        
        if self.detect_trading_signal(full_data):
            self.execute_trade(full_data)
        
        # Store for historical analysis
        self.store_filing_data(full_data)
    
    def trigger_critical_alert(self, data):
        """Send alert to human analysts"""
        pass
    
    def analyze_changes(self, data):
        """Deep analysis of what changed and why"""
        pass
    
    def detect_trading_signal(self, data):
        """Determine if changes indicate trading opportunity"""
        pass
    
    def execute_trade(self, data):
        """Execute automated trade based on filing changes"""
        pass
```

### API-First Integration

```javascript
// Example: JavaScript/Node.js AI agent

const { ApifyClient } = require('apify-client');

class FilingMonitorAgent {
  constructor(apifyToken) {
    this.client = new ApifyClient({ token: apifyToken });
  }
  
  async startMonitoring(watchlist) {
    // Start the SEC filing scraper
    const run = await this.client.actor('your-actor-id').call({
      watchlist: watchlist.map(ticker => ({
        type: 'ticker',
        value: ticker,
        priority: 'high'
      })),
      filingTypes: ['10-K', '10-Q', '8-K'],
      aiProcessing: {
        generateSummary: true,
        sentimentAnalysis: true,
        riskScoring: true
      },
      outputFormats: {
        json: true
      }
    });
    
    // Get results
    const dataset = await this.client.dataset(run.defaultDatasetId);
    const { items } = await dataset.listItems();
    
    return items;
  }
  
  async processFilings(filings) {
    for (const filing of filings) {
      // AI agent processes each filing
      const analysis = await this.analyzeWithLLM(filing);
      
      // Take action based on analysis
      if (analysis.actionRequired) {
        await this.executeAction(analysis);
      }
    }
  }
  
  async analyzeWithLLM(filing) {
    // Send to LLM for deeper analysis
    const prompt = `
      Analyze this SEC filing and determine if action is needed:
      
      Company: ${filing.company.name}
      Filing: ${filing.filing.filingType}
      Changes: ${filing.aiAnalysis.summary}
      Risk Score: ${filing.aiAnalysis.riskScore.overall}
      
      Should we:
      1. Alert human analyst?
      2. Adjust portfolio positions?
      3. Flag for compliance review?
    `;
    
    // Call your LLM API
    return await callLLM(prompt);
  }
}
```

---

## 6. Use Cases

### Hedge Fund: Automated Portfolio Monitoring

```json
{
  "watchlist": [
    {"type": "ticker", "value": "AAPL", "priority": "critical"},
    {"type": "ticker", "value": "MSFT", "priority": "critical"},
    {"type": "ticker", "value": "GOOGL", "priority": "high"}
  ],
  "filingTypes": ["10-K", "10-Q", "8-K", "13F"],
  "changeDetection": {
    "enabled": true,
    "threshold": 0.03,
    "sections": ["risk_factors", "md_and_a", "legal_proceedings"],
    "detectTypes": ["text_changes", "sentiment_shifts", "risk_additions"]
  },
  "aiProcessing": {
    "generateSummary": true,
    "sentimentAnalysis": true,
    "riskScoring": true,
    "entityExtraction": true
  },
  "notifications": {
    "webhookUrl": "https://trading-system.hedgefund.com/api/sec-alerts",
    "notifyOn": ["material_changes_only", "critical_changes_only"]
  },
  "schedule": {
    "frequency": "realtime"
  }
}
```

### RIA: Client Portfolio Compliance

```json
{
  "watchlist": [
    {"type": "cusip", "value": "037833100", "priority": "high"}
  ],
  "filingTypes": ["10-K", "10-Q", "8-K", "DEF 14A"],
  "changeDetection": {
    "enabled": true,
    "sections": ["executive_compensation", "beneficial_ownership", "legal_proceedings"]
  },
  "notifications": {
    "webhookUrl": "https://compliance.ria.com/sec-webhook",
    "emailNotifications": true,
    "email": "compliance@ria.com"
  },
  "schedule": {
    "frequency": "daily",
    "businessHoursOnly": true
  }
}
```

### AI Research Agent: Market Intelligence

```json
{
  "watchlist": [
    {"type": "ticker", "value": "TSLA"},
    {"type": "ticker", "value": "RIVN"},
    {"type": "ticker", "value": "F"}
  ],
  "filingTypes": ["ALL"],
  "aiProcessing": {
    "generateSummary": true,
    "sentimentAnalysis": true,
    "keyTopicsExtraction": true,
    "entityExtraction": true,
    "summaryLength": "detailed"
  },
  "dataEnrichment": {
    "includeCompetitorFilings": true
  },
  "outputFormats": {
    "json": true,
    "markdown": true
  }
}
```

---

This specification provides production-ready schemas that are:
- ✅ AI-agent friendly (structured JSON)
- ✅ Human-readable (clear documentation)
- ✅ Webhook-enabled (real-time notifications)
- ✅ Flexible (extensive configuration options)
- ✅ Compliant (captures all SEC data points)
