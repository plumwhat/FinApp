
import React, { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import useLocalStorage from '../hooks/useLocalStorage';
import { SuperannuationInputs, SuperYearProjection, PostRetirementInputs, PostRetirementYearProjection, BarChartDataPoint } from '../types';
import { Input } from './common/Input';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { Tooltip, InfoIcon } from './common/Tooltip';
import { formatCurrency, formatPercentage, formatNumberForAxis } from '../utils/formatting';
import { projectSuperannuationBalance, projectPostRetirement } from '../utils/superCalculations';
import { 
  DEFAULT_SUPER_INPUTS, 
  DEFAULT_POST_RETIREMENT_INPUTS,
  CONCESSIONAL_CONTRIBUTION_CAP,
  NON_CONCESSIONAL_CONTRIBUTION_CAP,
  TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL,
  DIVISION_293_THRESHOLD,
  CARRY_FORWARD_CONCESSIONAL_TSB_THRESHOLD,
  NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_3X,
  NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_2X,
  SUPER_GUARANTEE_RATE,
  CHART_COLORS
} from '../constants';

export const SuperannuationSection: React.FC = () => {
  const [inputs, setInputs] = useLocalStorage<SuperannuationInputs>('superInputs', DEFAULT_SUPER_INPUTS);
  const [postRetirementInputs, setPostRetirementInputs] = useLocalStorage<PostRetirementInputs>('postRetirementInputs', DEFAULT_POST_RETIREMENT_INPUTS);
  
  const [projections, setProjections] = useState<SuperYearProjection[]>([]);
  const [postRetirementProjections, setPostRetirementProjections] = useState<PostRetirementYearProjection[]>([]);

  const handleInputChange = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, field: keyof T) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setter(prev => ({ ...prev, [field]: value }));
  }, []);

  const runForecast = useCallback(() => {
    const preRetirement = projectSuperannuationBalance(inputs);
    setProjections(preRetirement);

    if (preRetirement.length > 0) {
      const finalBalance = preRetirement[preRetirement.length - 1].endingBalance;
      const postRetirement = projectPostRetirement(finalBalance, inputs.retirementAge, inputs, postRetirementInputs);
      setPostRetirementProjections(postRetirement);
    } else {
      setPostRetirementProjections([]);
    }
  }, [inputs, postRetirementInputs]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runForecast should only be called once on mount based on localStorage state or when user clicks button.
  React.useEffect(() => {
    runForecast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const chartData: BarChartDataPoint[] = useMemo(() => 
    projections.map(p => ({ name: p.age.toString(), balance: p.endingBalance }))
  , [projections]);

  const postRetirementChartData: BarChartDataPoint[] = useMemo(() =>
    postRetirementProjections.map(p => ({ name: p.age.toString(), balance: p.endingBalance }))
  , [postRetirementProjections]);

  const estimatedRetirementBalance = projections.length > 0 ? projections[projections.length - 1].endingBalance : inputs.currentBalance;
  const yearsInRetirement = postRetirementProjections.length;
  const superDepletesAtAge = postRetirementProjections.length > 0 && postRetirementProjections[postRetirementProjections.length-1].endingBalance <=0 ? postRetirementProjections[postRetirementProjections.length-1].age : null;

  const rechartsTooltipStyle = {
    contentStyle: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.375rem', color: '#374151', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' },
    itemStyle: { color: '#374151' },
    labelStyle: { color: '#111827', fontWeight: 'bold' }
  };

  const concessionalTooltipText = `Concessional contributions are made from pre-tax income (e.g., salary sacrifice, personal deductible contributions). They are generally taxed at 15% in the super fund.
Cap: ${formatCurrency(CONCESSIONAL_CONTRIBUTION_CAP)} p.a. (FY2024-25). This includes employer SG (${formatPercentage(SUPER_GUARANTEE_RATE * 100)} of salary).
Division 293 Tax: If your combined income and concessional contributions exceed ${formatCurrency(DIVISION_293_THRESHOLD)}, an additional 15% tax may apply to some or all of these contributions.
Exceeding Cap: Excess is included in your assessable income and taxed at your marginal rate (less 15% offset for tax paid by fund), plus an Excess Concessional Contributions charge.
Carry-Forward: If your Total Super Balance (TSB) was under ${formatCurrency(CARRY_FORWARD_CONCESSIONAL_TSB_THRESHOLD)} on 30 June of the previous financial year, you may be able to use unused cap amounts from the past 5 financial years. This projection uses the annual cap.`;

  const nonConcessionalTooltipText = `Non-concessional contributions are made from after-tax income.
Annual Cap: ${formatCurrency(NON_CONCESSIONAL_CONTRIBUTION_CAP)} p.a. (FY2024-25).
Total Super Balance (TSB) Limit: If your TSB was ${formatCurrency(TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL)} or more on 30 June of the previous financial year, your non-concessional cap is $0.
Bring-Forward Rule: If under 75 and TSB was below ${formatCurrency(TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL)} on 30 June of the previous FY, you might contribute more:
- TSB < ${formatCurrency(NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_3X)}: up to ${formatCurrency(NON_CONCESSIONAL_CONTRIBUTION_CAP * 3)} over 3 years.
- TSB ${formatCurrency(NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_3X)} to < ${formatCurrency(NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_2X)}: up to ${formatCurrency(NON_CONCESSIONAL_CONTRIBUTION_CAP * 2)} over 2 years.
- TSB ${formatCurrency(NON_CONCESSIONAL_BRING_FORWARD_TSB_THRESHOLD_2X)} to < ${formatCurrency(TOTAL_SUPER_BALANCE_LIMIT_FOR_NON_CONCESSIONAL)}: up to ${formatCurrency(NON_CONCESSIONAL_CONTRIBUTION_CAP)} (no bring-forward).
This projection uses the simplified annual cap.
Exceeding Cap: You can elect to release the excess plus 85% of associated earnings (earnings taxed at marginal rate). If not, excess contributions are taxed at 47%.`;


  return (
    <div className="space-y-8">
      <Card title="Superannuation Inputs & Assumptions">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <Input label="Current Age" id="currentAge" type="number" value={inputs.currentAge.toString()} onChange={handleInputChange(setInputs, 'currentAge')} unit="years" />
          <Input label="Planned Retirement Age" id="retirementAge" type="number" value={inputs.retirementAge.toString()} onChange={handleInputChange(setInputs, 'retirementAge')} unit="years" />
          <Input label="Current Super Balance" id="currentBalance" type="number" value={inputs.currentBalance.toString()} onChange={handleInputChange(setInputs, 'currentBalance')} unit="AUD" />
          <Input label="Current Annual Salary (Gross)" id="annualSalary" type="number" value={inputs.annualSalary.toString()} onChange={handleInputChange(setInputs, 'annualSalary')} unit="AUD" />
          
          <div className="relative">
            <Input 
              label="Voluntary Concessional Contribution (Annual, Pre-tax)" 
              id="voluntaryConcessionalContribution" 
              type="number" 
              value={inputs.voluntaryConcessionalContribution.toString()} 
              onChange={handleInputChange(setInputs, 'voluntaryConcessionalContribution')} 
              unit="AUD" 
            />
            <Tooltip text={concessionalTooltipText}>
              <InfoIcon className="absolute top-1 right-1" />
            </Tooltip>
          </div>

          <div className="relative">
            <Input 
              label="Voluntary Non-Concessional Contribution (Annual, Post-tax)" 
              id="voluntaryNonConcessionalContribution" 
              type="number" 
              value={inputs.voluntaryNonConcessionalContribution.toString()} 
              onChange={handleInputChange(setInputs, 'voluntaryNonConcessionalContribution')} 
              unit="AUD"
            />
             <Tooltip text={nonConcessionalTooltipText}>
              <InfoIcon className="absolute top-1 right-1" />
            </Tooltip>
          </div>
          
          <Input label="Expected Annual Return Rate (Net of fees)" id="expectedReturnRate" type="number" step="0.1" value={inputs.expectedReturnRate.toString()} onChange={handleInputChange(setInputs, 'expectedReturnRate')} unit="%" />
          <Input label="Expected Annual Salary Growth Rate" id="salaryGrowthRate" type="number" step="0.1" value={inputs.salaryGrowthRate.toString()} onChange={handleInputChange(setInputs, 'salaryGrowthRate')} unit="%" />
          <Input label="Expected Annual Inflation Rate" id="inflationRate" type="number" step="0.1" value={inputs.inflationRate.toString()} onChange={handleInputChange(setInputs, 'inflationRate')} unit="%" />
        </div>
        <div className="mt-6 text-center">
          <Button onClick={runForecast} variant="primary" size="lg">Update Forecast</Button>
        </div>
      </Card>

      {projections.length > 0 && (
        <Card title="Superannuation Growth Forecast (Pre-Retirement)">
          <div className="mb-4 text-center">
             <p className="text-xl text-gray-700">Estimated Balance at Retirement (Age {inputs.retirementAge}): 
                <span className="font-bold text-indigo-600 ml-2">{formatCurrency(estimatedRetirementBalance)}</span>
             </p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 30, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} stroke="#d1d5db"/>
              <XAxis dataKey="name" label={{ value: 'Age', position: 'insideBottom', dy:15, fill: '#4b5563' }} stroke="#6b7280" />
              <YAxis tickFormatter={(value) => formatNumberForAxis(value)} label={{ value: 'Balance (AUD)', angle: -90, position: 'insideLeft', dx:-5, fill: '#4b5563' }} stroke="#6b7280" />
              <RechartsTooltip formatter={(value: number) => formatCurrency(value)} {...rechartsTooltipStyle} />
              <Legend wrapperStyle={{paddingTop: '20px'}}/>
              <Line type="monotone" dataKey="balance" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} name="Projected Balance" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {projections.length > 0 && (
        <Card title="Post-Retirement Projection">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-6">
            <Input label="Planned Annual Living Expenses (in today's dollars, will be inflated)" id="annualLivingExpenses" type="number" value={postRetirementInputs.annualLivingExpenses.toString()} onChange={handleInputChange(setPostRetirementInputs, 'annualLivingExpenses')} unit="AUD" />
            <Input label="Other Annual Investment Income (Post-Retirement, not super)" id="otherInvestmentIncome" type="number" value={postRetirementInputs.otherInvestmentIncome.toString()} onChange={handleInputChange(setPostRetirementInputs, 'otherInvestmentIncome')} unit="AUD" />
          </div>
          {postRetirementProjections.length > 0 ? (
            <>
              <div className="mb-6 text-center space-y-2">
                <p className="text-lg text-gray-700">Your estimated super balance of <span className="font-semibold text-indigo-600">{formatCurrency(estimatedRetirementBalance)}</span>
                {' '}could last approximately <span className="font-semibold text-indigo-600">{yearsInRetirement} years</span> in retirement.</p>
                {superDepletesAtAge && (
                  <p className="text-lg text-amber-600">Your super is projected to be depleted by age <span className="font-semibold">{superDepletesAtAge}</span>.</p>
                )}
                 {!superDepletesAtAge && yearsInRetirement > 0 && (
                   <p className="text-lg text-green-600">Your super is projected to last beyond age <span className="font-semibold">{postRetirementProjections[postRetirementProjections.length - 1].age}</span>.</p>
                 )}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={postRetirementChartData} margin={{ top: 5, right: 20, left: 30, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} stroke="#d1d5db"/>
                  <XAxis dataKey="name" label={{ value: 'Age', position: 'insideBottom', dy:15, fill: '#4b5563' }} stroke="#6b7280" />
                  <YAxis tickFormatter={(value) => formatNumberForAxis(value)} label={{ value: 'Balance (AUD)', angle: -90, position: 'insideLeft', dx:-5, fill: '#4b5563' }} stroke="#6b7280" />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} {...rechartsTooltipStyle}/>
                  <Legend wrapperStyle={{paddingTop: '20px'}}/>
                  <Line type="monotone" dataKey="balance" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} name="Remaining Super Balance" />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p className="text-gray-500 text-center py-10">Enter post-retirement details and update forecast to see projection.</p>
          )}
        </Card>
      )}

      {projections.length > 0 && (
        <Card title="Detailed Projection Table (Pre-Retirement)" bodyClassName="overflow-x-auto max-h-[500px]">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {['Year', 'Age', 'Start Bal.', 'SG Cont.', 'Vol. Conc.', 'Vol. Non-Conc.', 'Total Conc.', 'Inv. Returns', 'Tax on Earn.', 'End Bal.', 'Conc. Excess?', 'Non-Conc. Excess?'].map(header => (
                  <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projections.map((p, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{p.year}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{p.age}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{formatCurrency(p.startingBalance)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{formatCurrency(p.sgContributions)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{formatCurrency(p.voluntaryConcessional)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-sky-600">{formatCurrency(p.voluntaryNonConcessional)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{formatCurrency(p.totalConcessional)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-teal-600">{formatCurrency(p.investmentReturns)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-orange-600">-{formatCurrency(p.taxOnEarnings)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-indigo-600">{formatCurrency(p.endingBalance)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm ${p.concessionalCapExceededBy ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{p.concessionalCapExceededBy ? `Yes (${formatCurrency(p.concessionalCapExceededBy)})` : 'No'}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm ${p.nonConcessionalCapExceededBy ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{p.nonConcessionalCapExceededBy ? `Yes (${formatCurrency(p.nonConcessionalCapExceededBy)})` : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
       {postRetirementProjections.length > 0 && (
        <Card title="Detailed Projection Table (Post-Retirement)" bodyClassName="overflow-x-auto max-h-[500px]">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {['Year', 'Age', 'Start Bal.', 'Inv. Returns', 'Drawdown', 'Other Income', 'Total Income', 'Shortfall?', 'End Bal.'].map(header => (
                  <th key={header} scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {postRetirementProjections.map((p, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 transition-colors duration-150 ${p.endingBalance <= 0 && idx < postRetirementProjections.length -1 ? 'opacity-70' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{p.year}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{p.age}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{formatCurrency(p.startingBalance)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-teal-600">{formatCurrency(p.investmentReturns)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-orange-600">-{formatCurrency(p.drawdown)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">{formatCurrency(p.otherIncome)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-sky-600">{formatCurrency(p.totalIncome)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap text-sm ${p.shortfall ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{p.shortfall ? `Yes (${formatCurrency(p.shortfall)})` : 'No'}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-semibold text-indigo-600">{formatCurrency(p.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
