
export enum AppView {
  BUDGETING = 'budgeting',
  SUPERANNUATION = 'superannuation',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  FORTNIGHTLY = 'fortnightly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  recurrenceEndDate?: string; // YYYY-MM-DD
}

export interface IncomeSource extends Transaction {
  type: TransactionType.INCOME;
}

export interface Expense extends Transaction {
  type: TransactionType.EXPENSE;
}

export interface SuperannuationInputs {
  currentAge: number;
  retirementAge: number;
  currentBalance: number;
  annualSalary: number;
  voluntaryConcessionalContribution: number; // Before-tax
  voluntaryNonConcessionalContribution: number; // After-tax
  expectedReturnRate: number; // Percentage, e.g., 7 for 7%
  salaryGrowthRate: number; // Percentage
  inflationRate: number; // Percentage
}

export interface PostRetirementInputs {
  annualLivingExpenses: number;
  otherInvestmentIncome: number; // Annual
  superDrawdownRate?: number; // Optional, for fixed drawdown strategies
}

export interface SuperYearProjection {
  year: number;
  age: number;
  startingBalance: number;
  sgContributions: number;
  voluntaryConcessional: number;
  voluntaryNonConcessional: number;
  totalConcessional: number;
  investmentReturns: number;
  taxOnEarnings: number;
  endingBalance: number;
  concessionalCapExceededBy?: number;
  nonConcessionalCapExceededBy?: number;
}

export interface PostRetirementYearProjection {
  year: number;
  age: number;
  startingBalance: number;
  investmentReturns: number; // On remaining balance
  drawdown: number;
  otherIncome: number;
  totalIncome: number;
  shortfall?: number; // If drawdown + otherIncome < expenses
  endingBalance: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any; // For additional properties like fill color for pie charts
}

export interface BarChartDataPoint {
  name: string; // Typically year or category
  income?: number;
  expenses?: number;
  balance?: number; // For super projection
}

export interface ProjectedBudgetYear {
  year: number; // Year number of the forecast (1, 2, ...)
  actualYear: number; // Actual calendar year (e.g., 2025)
  projectedIncome: number;
  projectedExpenses: number;
  projectedNetBalance: number;
}

// For useLocalStorage hook
export type SetValue<T> = (value: T | ((val: T) => T)) => void;