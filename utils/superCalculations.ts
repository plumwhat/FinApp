
import { SuperannuationInputs, SuperYearProjection, PostRetirementInputs, PostRetirementYearProjection } from '../types';
import { 
  SUPER_GUARANTEE_RATE, 
  CONCESSIONAL_CONTRIBUTION_CAP, 
  NON_CONCESSIONAL_CONTRIBUTION_CAP,
  SUPER_EARNINGS_TAX_RATE,
  TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL
} from '../constants';

export const projectSuperannuationBalance = (inputs: SuperannuationInputs): SuperYearProjection[] => {
  const projections: SuperYearProjection[] = [];
  let currentBalance = inputs.currentBalance;
  let currentSalary = inputs.annualSalary;

  for (let age = inputs.currentAge; age < inputs.retirementAge; age++) {
    const year = new Date().getFullYear() + (age - inputs.currentAge);
    
    const sgContributions = currentSalary * SUPER_GUARANTEE_RATE;
    const voluntaryConcessional = inputs.voluntaryConcessionalContribution;
    const totalConcessional = sgContributions + voluntaryConcessional;
    
    let concessionalCapExceededBy: number | undefined = undefined;
    if (totalConcessional > CONCESSIONAL_CONTRIBUTION_CAP) {
      concessionalCapExceededBy = totalConcessional - CONCESSIONAL_CONTRIBUTION_CAP;
      // Simplified: excess is assumed to be taxed outside super or handled by ATO directly.
      // For projection, we assume the capped amount effectively contributes.
      // Or, could reduce the actual concessional amount added to super in this model.
      // For simplicity, we'll note the excess but assume the full amount is "attempted".
    }

    const voluntaryNonConcessional = inputs.voluntaryNonConcessionalContribution;
    let nonConcessionalCapExceededBy: number | undefined = undefined;
    const currentNonConcessionalCap = currentBalance >= TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL ? 0 : NON_CONCESSIONAL_CONTRIBUTION_CAP;

    if (voluntaryNonConcessional > currentNonConcessionalCap) {
      nonConcessionalCapExceededBy = voluntaryNonConcessional - currentNonConcessionalCap;
      // Simplified: assume only the capped amount is contributed.
    }
    const effectiveNonConcessional = Math.min(voluntaryNonConcessional, currentNonConcessionalCap);

    // Contributions are typically added throughout the year. For simplicity, add at start/mid-year.
    // Let's assume contributions are made, then returns are calculated on the new balance.
    // A more accurate model might average balances or apply returns to contributions proportionally.
    const balanceBeforeReturns = currentBalance + totalConcessional + effectiveNonConcessional;
    
    const investmentReturns = balanceBeforeReturns * (inputs.expectedReturnRate / 100);
    const taxOnEarnings = investmentReturns > 0 ? investmentReturns * SUPER_EARNINGS_TAX_RATE : 0; // Tax only on positive returns
    
    const endingBalance = balanceBeforeReturns + investmentReturns - taxOnEarnings;

    projections.push({
      year,
      age,
      startingBalance: currentBalance,
      sgContributions,
      voluntaryConcessional,
      voluntaryNonConcessional: effectiveNonConcessional, // Show actual contributed amount
      totalConcessional,
      investmentReturns,
      taxOnEarnings,
      endingBalance,
      concessionalCapExceededBy,
      nonConcessionalCapExceededBy,
    });

    currentBalance = endingBalance;
    currentSalary *= (1 + inputs.salaryGrowthRate / 100); 
  }
  return projections;
};


export const projectPostRetirement = (
  startingRetirementBalance: number,
  retirementAge: number,
  superInputs: SuperannuationInputs,
  postRetirementInputs: PostRetirementInputs,
  maxYears: number = 35 // Project for a reasonable maximum, e.g., up to age 100
): PostRetirementYearProjection[] => {
  const projections: PostRetirementYearProjection[] = [];
  let currentBalance = startingRetirementBalance;
  let currentAnnualLivingExpenses = postRetirementInputs.annualLivingExpenses;

  for (let i = 0; i < maxYears; i++) {
    const age = retirementAge + i;
    if (currentBalance <= 0 && i > 0) break; // Stop if balance depleted (after first year)

    const year = new Date().getFullYear() + (age - superInputs.currentAge); // Aligns with pre-retirement years for consistency

    const investmentReturns = currentBalance * (superInputs.expectedReturnRate / 100); 
    // No tax on earnings in pension phase (up to transfer balance cap, simplified here)

    let drawdown = currentAnnualLivingExpenses - postRetirementInputs.otherInvestmentIncome;
    if (drawdown < 0) drawdown = 0; // If other income covers expenses

    // Ensure drawdown doesn't exceed balance
    drawdown = Math.min(drawdown, currentBalance + investmentReturns); 
    // If drawdown comes from currentBalance + returns made in the year
    // A common model is to calculate returns on starting balance, then withdraw.

    const balanceAfterReturns = currentBalance + investmentReturns;
    drawdown = Math.min(currentAnnualLivingExpenses - postRetirementInputs.otherInvestmentIncome, balanceAfterReturns);
    if(drawdown < 0) drawdown = 0;
    
    const endingBalance = balanceAfterReturns - drawdown;
    const totalIncomeAvailable = drawdown + postRetirementInputs.otherInvestmentIncome;
    const shortfall = currentAnnualLivingExpenses > totalIncomeAvailable ? currentAnnualLivingExpenses - totalIncomeAvailable : undefined;

    projections.push({
      year,
      age,
      startingBalance: currentBalance,
      investmentReturns,
      drawdown,
      otherIncome: postRetirementInputs.otherInvestmentIncome,
      totalIncome: totalIncomeAvailable,
      shortfall,
      endingBalance: Math.max(0, endingBalance), // Balance cannot be negative
    });

    if (endingBalance <= 0) break;

    currentBalance = endingBalance;
    currentAnnualLivingExpenses *= (1 + superInputs.inflationRate / 100); // Inflate living expenses
    // Other investment income could also be inflated if desired, simplified for now
  }

  return projections;
};
