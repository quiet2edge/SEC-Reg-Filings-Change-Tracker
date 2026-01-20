"""
SEC/EDGAR Regulatory Filings Change-Detection Scraper
Apify Actor Implementation

Author: Apify Development Team
Version: 1.0
"""

from apify import Actor
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import hashlib
import json
from difflib import SequenceMatcher

# AI processing imports
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


class SECFilingScraper:
    """
    Main scraper class for SEC EDGAR filings
    """
    
    BASE_URL = "https://www.sec.gov"
    EDGAR_API = "https://data.sec.gov"
    USER_AGENT = "SEC Filing Scraper contact@yourdomain.com"
    
    def __init__(self, actor_input: dict):
        self.input = actor_input
        self.session = None
        self.filing_cache = {}
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            headers={"User-Agent": self.USER_AGENT}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def normalize_identifier(self, identifier: dict) -> str:
        """
        Normalize company identifier (CIK, ticker, name)
        Returns: CIK (10-digit with leading zeros)
        """
        id_type = identifier['type']
        value = identifier['value'].strip().upper()
        
        if id_type == 'cik':
            # Ensure 10 digits with leading zeros
            return value.zfill(10)
        
        elif id_type == 'ticker':
            # Look up CIK from ticker
            return self.ticker_to_cik(value)
        
        elif id_type == 'name':
            # Search company name
            return self.name_to_cik(value)
        
        elif id_type == 'cusip':
            # Look up CIK from CUSIP
            return self.cusip_to_cik(value)
        
        raise ValueError(f"Unknown identifier type: {id_type}")
    
    async def ticker_to_cik(self, ticker: str) -> str:
        """Convert ticker symbol to CIK"""
        # Use SEC's company tickers JSON
        url = f"{self.EDGAR_API}/files/company_tickers.json"
        
        async with self.session.get(url) as response:
            data = await response.json()
            
            # Search for ticker
            for company in data.values():
                if company.get('ticker', '').upper() == ticker:
                    return str(company['cik_str']).zfill(10)
        
        raise ValueError(f"Ticker not found: {ticker}")
    
    async def name_to_cik(self, name: str) -> str:
        """Convert company name to CIK using fuzzy matching"""
        url = f"{self.EDGAR_API}/files/company_tickers.json"
        
        async with self.session.get(url) as response:
            data = await response.json()
            
            # Fuzzy search for name
            best_match = None
            best_ratio = 0
            
            for company in data.values():
                company_name = company.get('title', '').upper()
                ratio = SequenceMatcher(None, name.upper(), company_name).ratio()
                
                if ratio > best_ratio:
                    best_ratio = ratio
                    best_match = company
            
            if best_ratio > 0.8:  # 80% similarity
                return str(best_match['cik_str']).zfill(10)
        
        raise ValueError(f"Company not found: {name}")
    
    async def get_company_info(self, cik: str) -> Dict[str, Any]:
        """
        Get company information from SEC
        """
        url = f"{self.EDGAR_API}/submissions/CIK{cik}.json"
        
        async with self.session.get(url) as response:
            if response.status != 200:
                raise ValueError(f"Company not found: CIK {cik}")
            
            data = await response.json()
            
            return {
                'name': data.get('name'),
                'cik': cik,
                'sic': data.get('sic'),
                'sicDescription': data.get('sicDescription'),
                'fiscalYearEnd': data.get('fiscalYearEnd'),
                'stateOfIncorporation': data.get('stateOfIncorporation'),
                'ticker': data.get('tickers', [None])[0] if data.get('tickers') else None,
                'category': data.get('category'),
                'entityType': data.get('entityType')
            }
    
    async def get_recent_filings(
        self,
        cik: str,
        filing_types: List[str],
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get recent filings for a company
        """
        url = f"{self.EDGAR_API}/submissions/CIK{cik}.json"
        
        async with self.session.get(url) as response:
            data = await response.json()
            
            # Extract recent filings
            recent = data.get('filings', {}).get('recent', {})
            
            filings = []
            for i in range(len(recent.get('accessionNumber', []))):
                filing_type = recent['form'][i]
                
                # Filter by filing type
                if filing_types != ['ALL'] and filing_type not in filing_types:
                    continue
                
                filing = {
                    'accessionNumber': recent['accessionNumber'][i],
                    'filingType': filing_type,
                    'filingDate': recent['filingDate'][i],
                    'reportDate': recent['reportDate'][i] if 'reportDate' in recent else None,
                    'acceptanceDateTime': recent.get('acceptanceDateTime', [None])[i],
                    'primaryDocument': recent.get('primaryDocument', [None])[i],
                    'primaryDocDescription': recent.get('primaryDocDescription', [None])[i],
                    'isAmendment': filing_type.endswith('/A'),
                }
                
                filings.append(filing)
                
                if len(filings) >= limit:
                    break
            
            return filings
    
    async def get_filing_content(self, cik: str, accession_number: str) -> Dict[str, Any]:
        """
        Download and parse filing content
        """
        # Remove dashes from accession number for URL
        accession_clean = accession_number.replace('-', '')
        
        # Construct filing URL
        url = f"{self.BASE_URL}/cgi-bin/viewer?action=view&cik={cik}&accession_number={accession_number}&xbrl_type=v"
        
        async with self.session.get(url) as response:
            html = await response.text()
        
        # Parse HTML
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract text
        text = soup.get_text(separator='\n', strip=True)
        
        # Extract sections (simplified)
        sections = self._extract_sections(text)
        
        return {
            'html': html,
            'text': text,
            'sections': sections,
            'url': url
        }
    
    def _extract_sections(self, text: str) -> Dict[str, str]:
        """
        Extract major sections from filing text
        """
        sections = {}
        
        # Common section patterns (for 10-K/10-Q)
        patterns = {
            'business': r'ITEM\s+1\.?\s+BUSINESS',
            'risk_factors': r'ITEM\s+1A\.?\s+RISK\s+FACTORS',
            'md_and_a': r'ITEM\s+7\.?\s+MANAGEMENT.*DISCUSSION',
            'financial_statements': r'ITEM\s+8\.?\s+FINANCIAL\s+STATEMENTS',
        }
        
        for section_name, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                start = match.start()
                # Find next section or end of text
                next_match = re.search(r'ITEM\s+\d+', text[start+100:], re.IGNORECASE)
                end = start + 100 + next_match.start() if next_match else len(text)
                
                sections[section_name] = text[start:end]
        
        return sections
    
    def detect_changes(
        self,
        current_filing: Dict[str, Any],
        previous_filing: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect changes between filings
        """
        changes = {
            'hasChanges': False,
            'changeScore': 0.0,
            'sections': []
        }
        
        if not previous_filing:
            return changes
        
        current_sections = current_filing.get('sections', {})
        previous_sections = previous_filing.get('sections', {})
        
        total_change = 0
        section_count = 0
        
        for section_name in current_sections:
            if section_name not in previous_sections:
                # New section added
                changes['sections'].append({
                    'sectionName': section_name,
                    'changeType': 'added',
                    'changePercentage': 100.0
                })
                total_change += 100
                section_count += 1
                continue
            
            # Calculate similarity
            current_text = current_sections[section_name]
            previous_text = previous_sections[section_name]
            
            similarity = SequenceMatcher(None, previous_text, current_text).ratio()
            change_pct = (1 - similarity) * 100
            
            if change_pct > 5:  # More than 5% change
                changes['sections'].append({
                    'sectionName': section_name,
                    'changeType': 'modified',
                    'changePercentage': change_pct,
                    'wordCountDelta': len(current_text.split()) - len(previous_text.split())
                })
            
            total_change += change_pct
            section_count += 1
        
        # Check for removed sections
        for section_name in previous_sections:
            if section_name not in current_sections:
                changes['sections'].append({
                    'sectionName': section_name,
                    'changeType': 'removed',
                    'changePercentage': 100.0
                })
                total_change += 100
                section_count += 1
        
        # Calculate overall change score
        if section_count > 0:
            changes['changeScore'] = total_change / section_count / 100  # Normalize to 0-1
            changes['hasChanges'] = changes['changeScore'] > 0.05
        
        # Classify severity
        if changes['changeScore'] > 0.5:
            changes['changeSeverity'] = 'critical'
        elif changes['changeScore'] > 0.3:
            changes['changeSeverity'] = 'significant'
        elif changes['changeScore'] > 0.1:
            changes['changeSeverity'] = 'moderate'
        else:
            changes['changeSeverity'] = 'minor'
        
        return changes
    
    async def ai_analysis(self, filing_content: str, changes: Dict) -> Dict[str, Any]:
        """
        AI-powered analysis of filing
        """
        if not HAS_OPENAI or not self.input.get('aiProcessing', {}).get('generateSummary'):
            return {}
        
        # Truncate content for API (GPT-4 has token limits)
        content_preview = filing_content[:4000]
        
        prompt = f"""
        Analyze this SEC filing excerpt and provide:
        1. A brief summary (2-3 sentences)
        2. Key takeaways (3-5 bullet points)
        3. Overall sentiment (positive/neutral/negative)
        4. Risk score (0-100)
        
        Filing excerpt:
        {content_preview}
        
        Changes detected:
        {json.dumps(changes, indent=2)}
        
        Respond in JSON format.
        """
        
        try:
            # Call OpenAI API (simplified)
            # In production, use proper error handling and rate limiting
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            ai_response = json.loads(response.choices[0].message.content)
            
            return {
                'summary': ai_response.get('summary', ''),
                'keyTakeaways': ai_response.get('keyTakeaways', []),
                'sentiment': {
                    'overall': ai_response.get('sentiment', 'neutral'),
                    'score': 0.0,  # Calculate from sentiment
                    'confidence': 0.8
                },
                'riskScore': {
                    'overall': ai_response.get('riskScore', 50),
                    'category': 'moderate'
                }
            }
        except Exception as e:
            Actor.log.error(f"AI analysis failed: {e}")
            return {}
    
    async def process_company(self, identifier: dict) -> List[Dict[str, Any]]:
        """
        Process all filings for a company
        """
        results = []
        
        try:
            # Normalize identifier
            cik = await self.normalize_identifier(identifier)
            
            Actor.log.info(f"Processing company CIK: {cik}")
            
            # Get company info
            company_info = await self.get_company_info(cik)
            
            # Get recent filings
            filing_types = self.input.get('filingTypes', ['10-K', '10-Q', '8-K'])
            filings = await self.get_recent_filings(cik, filing_types, limit=10)
            
            Actor.log.info(f"Found {len(filings)} filings for {company_info['name']}")
            
            # Process each filing
            for filing in filings:
                # Get filing content
                content = await self.get_filing_content(cik, filing['accessionNumber'])
                
                # Check cache for previous filing
                cache_key = f"{cik}_{filing['filingType']}"
                previous_filing = self.filing_cache.get(cache_key)
                
                # Detect changes
                changes = self.detect_changes(content, previous_filing)
                
                # AI analysis
                ai_analysis = await self.ai_analysis(content['text'], changes)
                
                # Build output
                output = {
                    'metadata': {
                        'scraperId': Actor.get_env().get('actor_run_id'),
                        'timestamp': datetime.utcnow().isoformat(),
                        'version': '1.0'
                    },
                    'company': company_info,
                    'filing': filing,
                    'urls': {
                        'edgarUrl': f"{self.BASE_URL}/cgi-bin/browse-edgar?action=getcompany&CIK={cik}",
                        'filingUrl': content['url'],
                        'htmlUrl': content['url'],
                    },
                    'changeDetection': changes,
                    'aiAnalysis': ai_analysis
                }
                
                # Cache this filing for future comparisons
                self.filing_cache[cache_key] = content
                
                results.append(output)
        
        except Exception as e:
            Actor.log.error(f"Error processing company: {e}")
        
        return results


async def main():
    """
    Main Apify Actor entry point
    """
    async with Actor:
        # Get input
        actor_input = await Actor.get_input() or {}
        
        Actor.log.info(f"Actor started with input: {actor_input}")
        
        # Validate input
        watchlist = actor_input.get('watchlist', [])
        if not watchlist:
            raise ValueError("watchlist is required")
        
        # Initialize scraper
        async with SECFilingScraper(actor_input) as scraper:
            
            # Process all companies in watchlist
            all_results = []
            
            for company in watchlist:
                results = await scraper.process_company(company)
                all_results.extend(results)
                
                # Push results to dataset
                for result in results:
                    await Actor.push_data(result)
                
                # Respect rate limits
                await asyncio.sleep(0.1)
            
            Actor.log.info(f"Scraped {len(all_results)} filings total")
            
            # Send webhook notifications if configured
            webhook_url = actor_input.get('notifications', {}).get('webhookUrl')
            if webhook_url:
                await scraper.send_webhook_notifications(webhook_url, all_results)


# Run the actor
if __name__ == "__main__":
    asyncio.run(main())
