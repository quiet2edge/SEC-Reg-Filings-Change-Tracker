/**
 * SEC/EDGAR Regulatory Filings Change-Detection Scraper
 * AI-Agent-Ready Apify Actor
 * 
 * @author Your Team
 * @version 1.0.0
 */

import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { SECFilingScraper } from './src/sec-scraper.js';
import { ChangeDetector } from './src/change-detector.js';
import { AIAnalyzer } from './src/ai-analyzer.js';
import { WebhookNotifier } from './src/webhook-notifier.js';

await Actor.init();

try {
    // Get input configuration
    const input = await Actor.getInput();
    
    // Validate required input
    if (!input?.watchlist || input.watchlist.length === 0) {
        throw new Error('Watchlist is required and must contain at least one company');
    }
    
    Actor.log.info('Actor started', {
        companiesCount: input.watchlist.length,
        filingTypes: input.filingTypes,
        lookbackDays: input.lookbackDays,
        changeDetectionEnabled: input.enableChangeDetection,
        aiAnalysisEnabled: input.enableAiAnalysis,
    });
    
    // Initialize components
    const secScraper = new SECFilingScraper({
        proxyConfiguration: await Actor.createProxyConfiguration(input.proxyConfiguration),
        maxConcurrency: input.maxConcurrency || 5,
        debugMode: input.debugMode,
    });
    
    const changeDetector = input.enableChangeDetection 
        ? new ChangeDetector(input.changeThreshold) 
        : null;
    
    const aiAnalyzer = input.enableAiAnalysis && input.openaiApiKey
        ? new AIAnalyzer(input.openaiApiKey)
        : null;
    
    const webhookNotifier = input.webhookUrl
        ? new WebhookNotifier(input.webhookUrl, input.webhookHeaders)
        : null;
    
    // Statistics
    const stats = {
        companiesProcessed: 0,
        filingsFound: 0,
        changesDetected: 0,
        webhooksSent: 0,
        errors: 0,
    };
    
    // Process each company in watchlist
    for (const companyIdentifier of input.watchlist) {
        try {
            Actor.log.info(`Processing company: ${companyIdentifier}`);
            
            // Resolve company identifier to CIK
            const companyInfo = await secScraper.resolveCompany(companyIdentifier);
            
            if (!companyInfo) {
                Actor.log.warning(`Could not resolve company: ${companyIdentifier}`);
                stats.errors++;
                continue;
            }
            
            Actor.log.info(`Resolved to: ${companyInfo.name} (CIK: ${companyInfo.cik})`);
            
            // Get recent filings
            const filings = await secScraper.getRecentFilings(
                companyInfo.cik,
                input.filingTypes || ['10-K', '10-Q', '8-K'],
                input.lookbackDays || 7
            );
            
            Actor.log.info(`Found ${filings.length} filings for ${companyInfo.name}`);
            stats.filingsFound += filings.length;
            
            // Process each filing
            for (const filing of filings) {
                try {
                    Actor.log.info(`Processing filing: ${filing.type} from ${filing.filingDate}`);
                    
                    // Fetch filing content
                    const content = await secScraper.getFilingContent(
                        companyInfo.cik,
                        filing.accessionNumber
                    );
                    
                    // Build base output
                    const output = {
                        scrapedAt: new Date().toISOString(),
                        company: companyInfo,
                        filing: filing,
                        urls: secScraper.getFilingUrls(companyInfo.cik, filing.accessionNumber),
                        excerpts: content.excerpts,
                        metadata: {
                            actorRunId: Actor.getEnv().actorRunId,
                            datasetId: Actor.getEnv().defaultDatasetId,
                        },
                    };
                    
                    // Include full text if requested
                    if (input.includeFullText) {
                        output.fullText = content.fullText;
                    }
                    
                    // Change detection
                    if (changeDetector) {
                        const previousFiling = await changeDetector.getPreviousFiling(
                            companyInfo.cik,
                            filing.type
                        );
                        
                        if (previousFiling) {
                            Actor.log.info('Detecting changes vs previous filing...');
                            output.changeDetection = await changeDetector.detectChanges(
                                content,
                                previousFiling
                            );
                            
                            if (output.changeDetection.hasChanges) {
                                stats.changesDetected++;
                            }
                        }
                        
                        // Cache this filing for future comparisons
                        await changeDetector.cacheFiling(
                            companyInfo.cik,
                            filing.type,
                            content
                        );
                    }
                    
                    // AI analysis
                    if (aiAnalyzer) {
                        Actor.log.info('Running AI analysis...');
                        try {
                            output.aiAnalysis = await aiAnalyzer.analyze(
                                content,
                                output.changeDetection
                            );
                        } catch (error) {
                            Actor.log.error('AI analysis failed', { error: error.message });
                            // Continue without AI analysis
                        }
                    }
                    
                    // Push to dataset
                    await Actor.pushData(output);
                    
                    // Send webhook notification
                    if (webhookNotifier && shouldNotify(output, input)) {
                        Actor.log.info('Sending webhook notification...');
                        try {
                            await webhookNotifier.notify(output);
                            stats.webhooksSent++;
                        } catch (error) {
                            Actor.log.error('Webhook failed', { error: error.message });
                        }
                    }
                    
                    // Rate limiting - be nice to SEC servers
                    await Actor.sleep(200);
                    
                } catch (error) {
                    Actor.log.error(`Error processing filing ${filing.accessionNumber}`, {
                        error: error.message,
                        stack: error.stack,
                    });
                    stats.errors++;
                }
            }
            
            stats.companiesProcessed++;
            
        } catch (error) {
            Actor.log.error(`Error processing company ${companyIdentifier}`, {
                error: error.message,
                stack: error.stack,
            });
            stats.errors++;
        }
    }
    
    // Log final statistics
    Actor.log.info('Actor finished', stats);
    
    // Set output for Actor UI
    await Actor.setValue('OUTPUT', {
        status: 'success',
        statistics: stats,
        completedAt: new Date().toISOString(),
    });
    
} catch (error) {
    Actor.log.error('Actor failed', {
        error: error.message,
        stack: error.stack,
    });
    
    await Actor.setValue('OUTPUT', {
        status: 'error',
        error: error.message,
        completedAt: new Date().toISOString(),
    });
    
    throw error;
}

await Actor.exit();

/**
 * Determine if webhook notification should be sent
 */
function shouldNotify(output, input) {
    // Always notify if no change detection
    if (!output.changeDetection) {
        return true;
    }
    
    // Notify on material changes
    if (output.changeDetection.changeSeverity === 'significant' ||
        output.changeDetection.changeSeverity === 'critical') {
        return true;
    }
    
    // Notify on high risk scores
    if (output.aiAnalysis?.riskScore?.overall > 70) {
        return true;
    }
    
    return false;
}
