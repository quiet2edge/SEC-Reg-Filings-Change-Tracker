/**
 * SEC/EDGAR Filing Scraper
 * Handles all interactions with SEC EDGAR system
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';

export class SECFilingScraper {
    constructor(options = {}) {
        this.proxyConfiguration = options.proxyConfiguration;
        this.maxConcurrency = options.maxConcurrency || 5;
        this.debugMode = options.debugMode || false;
        
        // SEC requires User-Agent header
        this.userAgent = 'SEC Filing Scraper contact@yourcompany.com';
        this.baseUrl = 'https://www.sec.gov';
        this.dataUrl = 'https://data.sec.gov';
        
        // Rate limiting
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // 100ms between requests
    }
    
    /**
     * Resolve company identifier (ticker, CIK, name) to CIK
     */
    async resolveCompany(identifier) {
        // If it's already a 10-digit CIK, return company info
        if (/^\d{10}$/.test(identifier)) {
            return await this.getCompanyInfo(identifier);
        }
        
        // Try to resolve as ticker or name
        const cik = await this.lookupCIK(identifier);
        if (cik) {
            return await this.getCompanyInfo(cik);
        }
        
        return null;
    }
    
    /**
     * Look up CIK from ticker or company name
     */
    async lookupCIK(identifier) {
        try {
            await this.rateLimit();
            
            const url = `${this.dataUrl}/files/company_tickers.json`;
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            
            const companies = Object.values(response.data);
            
            // Try exact ticker match first
            const tickerMatch = companies.find(c => 
                c.ticker?.toUpperCase() === identifier.toUpperCase()
            );
            if (tickerMatch) {
                return String(tickerMatch.cik_str).padStart(10, '0');
            }
            
            // Try fuzzy name match
            const nameMatch = companies.find(c =>
                c.title?.toUpperCase().includes(identifier.toUpperCase())
            );
            if (nameMatch) {
                return String(nameMatch.cik_str).padStart(10, '0');
            }
            
            return null;
        } catch (error) {
            if (this.debugMode) {
                console.error('CIK lookup failed:', error);
            }
            return null;
        }
    }
    
    /**
     * Get company information from SEC
     */
    async getCompanyInfo(cik) {
        try {
            await this.rateLimit();
            
            const url = `${this.dataUrl}/submissions/CIK${cik}.json`;
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            
            const data = response.data;
            
            return {
                name: data.name,
                cik: cik,
                ticker: data.tickers?.[0] || null,
                sic: data.sic,
                industry: data.sicDescription,
                fiscalYearEnd: data.fiscalYearEnd,
                stateOfIncorporation: data.stateOfIncorporation
            };
        } catch (error) {
            if (this.debugMode) {
                console.error('Company info fetch failed:', error);
            }
            return null;
        }
    }
    
    /**
     * Get recent filings for a company
     */
    async getRecentFilings(cik, filingTypes = ['10-K', '10-Q', '8-K'], lookbackDays = 7) {
        try {
            await this.rateLimit();
            
            const url = `${this.dataUrl}/submissions/CIK${cik}.json`;
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            
            const recentFilings = response.data.filings?.recent;
            if (!recentFilings) {
                return [];
            }
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
            
            const filings = [];
            const length = recentFilings.accessionNumber?.length || 0;
            
            for (let i = 0; i < length; i++) {
                const filingType = recentFilings.form[i];
                const filingDate = new Date(recentFilings.filingDate[i]);
                
                // Filter by filing type
                if (filingTypes.length > 0 && 
                    !filingTypes.includes('ALL') && 
                    !filingTypes.includes(filingType)) {
                    continue;
                }
                
                // Filter by date
                if (filingDate < cutoffDate) {
                    continue;
                }
                
                filings.push({
                    accessionNumber: recentFilings.accessionNumber[i],
                    type: filingType,
                    filingDate: recentFilings.filingDate[i],
                    reportDate: recentFilings.reportDate?.[i] || null,
                    acceptanceDateTime: recentFilings.acceptanceDateTime?.[i] || null,
                    primaryDocument: recentFilings.primaryDocument?.[i] || null,
                    isAmendment: filingType.endsWith('/A'),
                    fiscalYear: this.extractFiscalYear(recentFilings.reportDate?.[i]),
                    fiscalPeriod: this.extractFiscalPeriod(filingType, recentFilings.reportDate?.[i])
                });
            }
            
            return filings;
        } catch (error) {
            if (this.debugMode) {
                console.error('Recent filings fetch failed:', error);
            }
            return [];
        }
    }
    
    /**
     * Get filing content (text and excerpts)
     */
    async getFilingContent(cik, accessionNumber) {
        try {
            await this.rateLimit();
            
            // Construct filing URL
            const accessionClean = accessionNumber.replace(/-/g, '');
            const url = `${this.baseUrl}/Archives/edgar/data/${parseInt(cik)}/${accessionClean}/${accessionNumber}-index.htm`;
            
            const response = await axios.get(url, {
                headers: { 'User-Agent': this.userAgent }
            });
            
            const dom = new JSDOM(response.data);
            const document = dom.window.document;
            
            // Extract text content
            const fullText = document.body.textContent || '';
            
            // Extract key sections (simplified - would need better parsing in production)
            const excerpts = {
                businessDescription: this.extractSection(fullText, 'BUSINESS'),
                riskFactors: this.extractSection(fullText, 'RISK FACTORS'),
                mdAndA: this.extractSection(fullText, "MANAGEMENT'S DISCUSSION"),
                legalProceedings: this.extractSection(fullText, 'LEGAL PROCEEDINGS')
            };
            
            return {
                fullText,
                excerpts
            };
        } catch (error) {
            if (this.debugMode) {
                console.error('Filing content fetch failed:', error);
            }
            return {
                fullText: '',
                excerpts: {}
            };
        }
    }
    
    /**
     * Get URLs for filing
     */
    getFilingUrls(cik, accessionNumber) {
        const accessionClean = accessionNumber.replace(/-/g, '');
        const cikNumber = parseInt(cik);
        
        return {
            edgarFiling: `${this.baseUrl}/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=exclude&count=100`,
            primaryDocument: `${this.baseUrl}/Archives/edgar/data/${cikNumber}/${accessionClean}/${accessionNumber}.htm`,
            htmlViewer: `${this.baseUrl}/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}`,
            xbrlData: `${this.baseUrl}/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accessionNumber}&xbrl_type=v`
        };
    }
    
    /**
     * Extract a section from filing text
     */
    extractSection(text, sectionName) {
        const regex = new RegExp(`ITEM\\s+\\d+[A-Z]?\\.?\\s+${sectionName}`, 'i');
        const match = text.match(regex);
        
        if (match) {
            const start = match.index;
            // Find next "ITEM" or take next 5000 chars
            const nextItem = text.indexOf('ITEM', start + 100);
            const end = nextItem > start ? nextItem : start + 5000;
            return text.substring(start, end).trim();
        }
        
        return '';
    }
    
    /**
     * Extract fiscal year from date
     */
    extractFiscalYear(dateStr) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.getFullYear();
    }
    
    /**
     * Extract fiscal period from filing type and date
     */
    extractFiscalPeriod(filingType, dateStr) {
        if (filingType === '10-K') return 'FY';
        if (filingType === '10-Q') {
            if (!dateStr) return 'Q1';
            const month = new Date(dateStr).getMonth();
            if (month <= 2) return 'Q1';
            if (month <= 5) return 'Q2';
            if (month <= 8) return 'Q3';
            return 'Q4';
        }
        return null;
    }
    
    /**
     * Rate limiting to be nice to SEC servers
     */
    async rateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        
        if (elapsed < this.minRequestInterval) {
            await new Promise(resolve => 
                setTimeout(resolve, this.minRequestInterval - elapsed)
            );
        }
        
        this.lastRequestTime = Date.now();
    }
}
