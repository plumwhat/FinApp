
// All amounts in AUD
import { RecurrenceFrequency } from './types';

// Superannuation Constants
export const SUPER_GUARANTEE_RATE = 0.115; // 11.5% for FY2024-2025. Set to 0.11 for FY23-24 or 0.12 for FY25-26
export const CONCESSIONAL_CONTRIBUTION_CAP = 27500; // For FY2024-2025
export const NON_CONCESSIONAL_CONTRIBUTION_CAP = 110000; // For FY2024-2025
// Note: Non-concessional cap can be $0 if Total Super Balance (TSB) >= $1.9M on 30 June of previous FY.
export const TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL = 1900000; // $1.9M TSB threshold for $0 NCC cap.
export const DIVISION_293_THRESHOLD = 250000; // Combined income and concessional contributions threshold for Div 293 tax.
export const CARRY_FORWARD_CONCESSIONAL_TSB_THRESHOLD = 500000; // TSB must be below this on 30 June of prev FY to use carry-forward.

// TSB thresholds for non-concessional bring-forward rule (as at 30 June of previous FY):
// These determine eligibility for 3-year, 2-year, or 1-year (standard) cap.
export const NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_3X = 1680000; // If TSB < $1.68M, can use 3x cap ($330k)
export const NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_2X = 1790000; // If TSB $1.68M to < $1.79M, can use 2x cap ($220k)
// If TSB $1.79M to < $1.9M, can use 1x cap ($110k). If TSB >= $1.9M, cap is $0.

export const SUPER_EARNINGS_TAX_RATE = 0.15; // 15% tax on earnings in accumulation phase

// Default values for forms
export const DEFAULT_SUPER_INPUTS = {
  currentAge: 30,
  retirementAge: 67,
  currentBalance: 50000,
  annualSalary: 80000,
  voluntaryConcessionalContribution: 0,
  voluntaryNonConcessionalContribution: 0,
  expectedReturnRate: 7, // %
  salaryGrowthRate: 3, // %
  inflationRate: 2.5, // %
};

export const DEFAULT_POST_RETIREMENT_INPUTS = {
  annualLivingExpenses: 60000,
  otherInvestmentIncome: 0,
};

// Charting
export const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

// Budgeting categories
export const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Bonus', 'Investment', 'Rental', 'Freelance', 'Other'];
export const DEFAULT_EXPENSE_CATEGORIES = ['Housing', 'Utilities', 'Groceries', 'Transport', 'Healthcare', 'Entertainment', 'Education', 'Debt Repayment', 'Savings/Investments', 'Personal Care', 'Other'];

export const RECURRENCE_FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: RecurrenceFrequency.DAILY, label: 'Daily' },
  { value: RecurrenceFrequency.WEEKLY, label: 'Weekly' },
  { value: RecurrenceFrequency.FORTNIGHTLY, label: 'Fortnightly' },
  { value: RecurrenceFrequency.MONTHLY, label: 'Monthly' },
  { value: RecurrenceFrequency.YEARLY, label: 'Yearly' },
];

// General
export const CURRENT_FINANCIAL_YEAR_START_MONTH = 7; // July
export const CURRENT_FINANCIAL_YEAR_START_DAY = 1;
