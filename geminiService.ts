
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FileData } from "./types";

export async function analyzeDocuments(files: FileData[], preStudyNotes: string = ''): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("API_KEY is missing. Please ensure it is configured in the environment.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const fileParts = files.map(file => ({
    inlineData: {
      data: file.base64.split(',')[1],
      mimeType: file.type
    }
  }));

  const prompt = `
    Act as an Elite High-Risk Senior Loan Underwriter specialized in the Malaysian personal loan market. 
    Task: Conduct an exhaustive financial autopsy on the provided bank statements and payslips.
    
    AGENT PRE-STUDY NOTES (PRIORITY):
    ${preStudyNotes || 'None provided.'}
    Investigate every detail mentioned by the agent. If they suspect a specific lender, dig through the transactions.

    EXHAUSTIVE UNDERWRITING TASKS:
    1. DEEP SEARCH & ENTITY VERIFICATION:
       - Identify every credit inflow from non-standard entities (Enterprise, Trading, Resources, Capital).
       - Use Google Search to verify if these are licensed money lenders (Kredit Komuniti), debt collectors, or private loan providers.
       - Specifically look for known salary advance apps like Paywatch, Wagely, or similar.
    
    2. INCOME RECONSTRUCTION & AID:
       - Calculate exact monthly income. If payslips aren't provided (Government Aid cases), reconstruct income from credit entries.
       - Identify Government Aid (STR, SARA, BPN, JKM). 
       - Mention if the customer is a government servant or private sector.
    
    3. RIGOROUS RISK PROFILING:
       - SALARY ADVANCES: Identify source-deducted advances. This is a critical red flag.
       - ATM CUSTODY & PHYSICAL USAGE: Verify physical card presence via "SALE-DEBIT", "POS", or physical merchants (Shell, Petron, Mydin).
       - GAMBLING & LIQUIDITY: Detect frequency of e-wallet top-ups. >10 top-ups/month or gaming platforms = High Risk.
    
    4. LOAN STRUCTURING (10 MONTHS):
       - Private Sector: 8-10% interest/month.
       - Government/GLC: 6% interest/month.
       - Total Repayment = (Principal / 10) + (Principal * Monthly Rate).

    OUTPUT REQUIREMENTS:
    - Provide a hyper-detailed JSON response.
    - The "explanation" must be a 3-paragraph executive summary detailing Cashflow Stability, Risk Exposure (Lenders/Gambling), and Final Rationale.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: [...fileParts, { text: prompt }] },
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          salaryTally: {
            type: Type.OBJECT,
            properties: {
              matches: { type: Type.BOOLEAN },
              payslipNetPay: { type: Type.NUMBER },
              monthlyBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    month: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  }
                }
              },
              remarks: { type: Type.STRING }
            },
            required: ["monthlyBreakdown", "remarks"]
          },
          hiddenLoans: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                description: { type: Type.STRING },
                probableLender: { type: Type.STRING },
                searchVerification: { type: Type.STRING }
              }
            }
          },
          commitments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                frequency: { type: Type.STRING },
                category: { type: Type.STRING }
              }
            }
          },
          atmChecks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                description: { type: Type.STRING },
                amount: { type: Type.NUMBER }
              }
            }
          },
          riskAssessment: {
            type: Type.OBJECT,
            properties: {
              gamblingTransactions: { type: Type.NUMBER },
              status: { type: Type.STRING },
              details: { type: Type.ARRAY, items: { type: Type.STRING } },
              hasDebitCardUsage: { type: Type.BOOLEAN }
            }
          },
          governmentAid: {
            type: Type.OBJECT,
            properties: {
              detected: { type: Type.BOOLEAN },
              isGovServant: { type: Type.BOOLEAN },
              averageMonthlyAmount: { type: Type.NUMBER },
              remarks: { type: Type.STRING }
            }
          },
          conclusion: {
            type: Type.OBJECT,
            properties: {
              decision: { type: Type.STRING },
              suggestedAmount: { type: Type.STRING },
              interestRate: { type: Type.STRING },
              monthlyRepayment: { type: Type.STRING },
              riskRewardRatio: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["decision", "monthlyRepayment", "explanation"]
          },
          searchInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                transaction: { type: Type.STRING },
                companyInfo: { type: Type.STRING },
                riskLevel: { type: Type.STRING },
                sources: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("Model failed to generate a response text.");
  }

  return JSON.parse(response.text);
}
