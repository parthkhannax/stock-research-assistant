/**
 * Gemini AI Service for Stock Analysis
 *
 * Provides AI-powered explanations and insights for stock data:
 * - Fundamental analysis
 * - Risk assessment
 * - Investment thesis generation
 * - Interactive Q&A
 */

import { GoogleGenAI } from "@google/genai";
import type { CompanyOverview, StockQuote } from '../types/stock';

let ai: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }
  return ai;
};

// System instruction for stock analysis
const STOCK_ANALYST_CONTEXT = `
You are a professional financial analyst AI assistant. Your role is to:
1. Explain complex financial metrics in simple, actionable language
2. Provide context for P/E ratios, EPS, market cap, and other fundamentals
3. Identify potential risks and opportunities based on data
4. Compare company performance to industry averages
5. Avoid giving direct investment advice ("buy" or "sell"), but provide analytical insights

Keep responses concise (2-3 paragraphs max), professional, and data-driven.
When discussing metrics, always provide context (e.g., "A P/E of 25 is above the industry average of 18, suggesting investors expect higher growth").
Use clear, simple language that a retail investor can understand.
`;

/**
 * Generate simplified explanation of company fundamentals
 */
export const explainFundamentals = async (
  symbol: string,
  companyData: CompanyOverview
): Promise<string> => {
  try {
    const client = getAIClient();
    const model = client.models;

    const marketCap = parseFloat(companyData.MarketCapitalization) / 1e9;
    const revenue = parseFloat(companyData.RevenueTTM) / 1e9;

    const prompt = `
Analyze the following company and explain its key financial metrics in simple terms:

Company: ${companyData.Name} (${symbol})
Sector: ${companyData.Sector}
Industry: ${companyData.Industry}

Key Metrics:
- Market Cap: $${marketCap.toFixed(2)}B
- P/E Ratio: ${companyData.PERatio || 'N/A'}
- Forward P/E: ${companyData.ForwardPE || 'N/A'}
- EPS: $${companyData.EPS}
- Revenue (TTM): $${revenue.toFixed(2)}B
- Profit Margin: ${companyData.ProfitMargin || 'N/A'}
- Dividend Yield: ${companyData.DividendYield || '0'}%
- Beta: ${companyData.Beta || 'N/A'}

Provide a concise analysis covering:
1. What these metrics tell us about the company's valuation
2. How it compares to typical companies in its sector
3. Key strengths or concerns from a fundamental perspective
`;

    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: STOCK_ANALYST_CONTEXT,
        maxOutputTokens: 500,
        temperature: 0.4, // Lower temp for more factual responses
      },
    });

    return response.text || "Analysis unavailable at this time.";
  } catch (error) {
    console.error("Gemini Error (fundamentals):", error);
    return "Unable to generate analysis. Please check your API configuration.";
  }
};

/**
 * Generate risk assessment for a stock
 */
export const assessRisk = async (
  symbol: string,
  companyData: CompanyOverview
): Promise<string> => {
  try {
    const client = getAIClient();
    const model = client.models;

    const prompt = `
Assess the risk profile of ${symbol} (${companyData.Name}):

Risk Indicators:
- Beta: ${companyData.Beta || 'N/A'}
- Sector: ${companyData.Sector}
- Profit Margin: ${companyData.ProfitMargin || 'N/A'}
- Quarterly Revenue Growth: ${companyData.QuarterlyRevenueGrowthYOY || 'N/A'}

Explain what this means for a retail investor in 2-3 sentences. Focus on:
1. How volatile this stock is compared to the broader market
2. What type of investor this suits (conservative, moderate, aggressive)
3. Key risk factors to be aware of
`;

    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: STOCK_ANALYST_CONTEXT,
        maxOutputTokens: 200,
        temperature: 0.4,
      },
    });

    return response.text || "Risk analysis unavailable.";
  } catch (error) {
    console.error("Gemini Error (risk):", error);
    return "Unable to assess risk at this time.";
  }
};

/**
 * Interactive chat for stock research questions
 */
export const chatAboutStock = async (
  userMessage: string,
  stockContext: string
): Promise<string> => {
  try {
    const client = getAIClient();
    const model = client.models;

    const systemContext = `${STOCK_ANALYST_CONTEXT}

Current Stock Context:
${stockContext}

Answer the user's question based on this data. If you don't have enough information, say so clearly.
`;

    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemContext,
        maxOutputTokens: 300,
        temperature: 0.6,
      },
    });

    return response.text || "I'm currently unable to process that question.";
  } catch (error) {
    console.error("Gemini Error (chat):", error);
    return "Connection error. Please try again.";
  }
};

/**
 * Generate investment thesis summary
 */
export const generateInvestmentThesis = async (
  symbol: string,
  companyData: CompanyOverview,
  quote?: StockQuote
): Promise<string> => {
  try {
    const client = getAIClient();
    const model = client.models;

    const marketCap = parseFloat(companyData.MarketCapitalization) / 1e9;

    const prompt = `
Generate a brief investment thesis for ${companyData.Name} (${symbol}):

Company Overview:
${companyData.Description}

Sector: ${companyData.Sector} | Industry: ${companyData.Industry}

Financials:
- Market Cap: $${marketCap.toFixed(2)}B
- P/E: ${companyData.PERatio || 'N/A'}
- EPS: $${companyData.EPS}
- Revenue Growth (QoQ): ${companyData.QuarterlyRevenueGrowthYOY || 'N/A'}
- Earnings Growth (QoQ): ${companyData.QuarterlyEarningsGrowthYOY || 'N/A'}
${quote ? `- Current Price: $${quote.price.toFixed(2)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)` : ''}

Provide a balanced investment thesis covering:
1. Bull case (2-3 key strengths)
2. Bear case (2-3 key concerns)
3. Overall outlook (neutral assessment)

Keep it under 250 words.
`;

    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: STOCK_ANALYST_CONTEXT,
        maxOutputTokens: 600,
        temperature: 0.5,
      },
    });

    return response.text || "Unable to generate investment thesis.";
  } catch (error) {
    console.error("Gemini Error (thesis):", error);
    return "Analysis generation failed.";
  }
};

/**
 * Compare two stocks
 */
export const compareStocks = async (
  stock1: { symbol: string; data: CompanyOverview },
  stock2: { symbol: string; data: CompanyOverview }
): Promise<string> => {
  try {
    const client = getAIClient();
    const model = client.models;

    const prompt = `
Compare these two stocks:

**${stock1.symbol} (${stock1.data.Name})**
- Sector: ${stock1.data.Sector}
- P/E: ${stock1.data.PERatio}
- Market Cap: $${(parseFloat(stock1.data.MarketCapitalization) / 1e9).toFixed(2)}B
- Profit Margin: ${stock1.data.ProfitMargin}
- Beta: ${stock1.data.Beta}

**${stock2.symbol} (${stock2.data.Name})**
- Sector: ${stock2.data.Sector}
- P/E: ${stock2.data.PERatio}
- Market Cap: $${(parseFloat(stock2.data.MarketCapitalization) / 1e9).toFixed(2)}B
- Profit Margin: ${stock2.data.ProfitMargin}
- Beta: ${stock2.data.Beta}

Provide a brief comparison (3-4 sentences) highlighting:
1. Key similarities and differences
2. Which might appeal to different investor profiles
3. Relative valuation and risk
`;

    const response = await model.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: STOCK_ANALYST_CONTEXT,
        maxOutputTokens: 300,
        temperature: 0.5,
      },
    });

    return response.text || "Unable to compare stocks.";
  } catch (error) {
    console.error("Gemini Error (compare):", error);
    return "Comparison failed.";
  }
};
