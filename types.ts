
export interface MonthlySalary {
  month: string;
  amount: number;
}

export interface AnalysisResult {
  salaryTally: {
    matches: boolean;
    payslipNetPay: number;
    monthlyBreakdown: MonthlySalary[];
    remarks: string;
  };
  hiddenLoans: Array<{
    date: string;
    amount: number;
    description: string;
    probableLender: string;
  }>;
  commitments: Array<{
    description: string;
    amount: number;
    frequency: string;
    category: 'Loan' | 'Insurance' | 'Financing' | 'Other';
  }>;
  atmChecks: Array<{
    date: string;
    description: string;
    amount: number;
  }>;
  riskAssessment: {
    gamblingTransactions: number;
    status: 'Safe' | 'High Risk - Potential Gambling';
    details: string[];
    hasDebitCardUsage: boolean; // CRITICAL: Determines if we can collect the card
  };
  governmentAid: {
    detected: boolean;
    isGovServant: boolean;
    averageMonthlyAmount: number;
    remarks: string;
  };
  conclusion: {
    decision: 'Approve' | 'Reject' | 'Conditional';
    suggestedAmount: string;
    interestRate: string;
    monthlyRepayment: string;
    riskRewardRatio: string;
    explanation: string;
  };
  searchInsights: Array<{
    transaction: string;
    companyInfo: string;
    riskLevel: string;
  }>;
}

export interface FileData {
  name: string;
  type: string;
  base64: string;
}
