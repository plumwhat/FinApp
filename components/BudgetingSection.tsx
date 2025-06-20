import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import useLocalStorage from '../hooks/useLocalStorage';
import { Transaction, TransactionType, ChartDataPoint, BarChartDataPoint, RecurrenceFrequency, ProjectedBudgetYear } from '../types';
import { Input } from './common/Input';
import { Button } from './common/Button';
import { Card } from './common/Card';
import { Tooltip, InfoIcon } from './common/Tooltip';
import { formatDate, formatCurrency, generateId, formatNumberForAxis, formatMonthYear } from '../utils/formatting';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, CHART_COLORS, RECURRENCE_FREQUENCIES, CURRENT_FINANCIAL_YEAR_START_MONTH, CURRENT_FINANCIAL_YEAR_START_DAY } from '../constants';
import { PlusCircleIcon, TrashIcon, RepeatIcon, TrendingUpIcon as ForecastIcon, EditIcon, ChevronDownIcon, ChevronRightIcon } from './common/Icons';

interface TransactionFormState {
  type: TransactionType;
  category: string;
  amount: string;
  date: string;
  description: string;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceEndDate?: string;
}

const initialFormState: TransactionFormState = {
  type: TransactionType.EXPENSE,
  category: DEFAULT_EXPENSE_CATEGORIES[0],
  amount: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
  isRecurring: false,
  recurrenceFrequency: RecurrenceFrequency.MONTHLY,
  recurrenceEndDate: '',
};

interface BudgetForecastInputs {
  baselineSource: 'manual' | 'transactions';
  baselineAnnualIncome: number;
  baselineAnnualExpenses: number;
  forecastYears: number;
  incomeGrowthRate: number;
  expenseGrowthRate: number;
}

const initialForecastInputs: BudgetForecastInputs = {
  baselineSource: 'manual',
  baselineAnnualIncome: 60000,
  baselineAnnualExpenses: 40000,
  forecastYears: 5,
  incomeGrowthRate: 2, // %
  expenseGrowthRate: 3, // %
};

type TimeFilterOption = 'currentMonth' | 'fytd' | 'allTime';

export const BudgetingSection: React.FC = () => {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('transactions', []);
  const [formState, setFormState] = useState<TransactionFormState>(initialFormState);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [forecastInputs, setForecastInputs] = useLocalStorage<BudgetForecastInputs>('budgetForecastInputs', initialForecastInputs);
  const [projectedBudgetData, setProjectedBudgetData] = useState<ProjectedBudgetYear[] | null>(null);
  
  const [annualizedIncomeFromTransactions, setAnnualizedIncomeFromTransactions] = useState<number | null>(null);
  const [annualizedExpensesFromTransactions, setAnnualizedExpensesFromTransactions] = useState<number | null>(null);
  const [annualizationMessage, setAnnualizationMessage] = useState<string>('');

  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [activeTimeFilter, setActiveTimeFilter] = useLocalStorage<TimeFilterOption>('budgetTimeFilter', 'allTime');

  const filteredTransactions = useMemo(() => {
    const now = new Date(); // Local current time

    if (activeTimeFilter === 'currentMonth') {
      const currentYearStr = now.getFullYear().toString();
      const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0'); // MM format
      const monthPrefix = `${currentYearStr}-${currentMonthStr}`; // YYYY-MM
      return transactions.filter(t => t.date.startsWith(monthPrefix)); 
    }

    if (activeTimeFilter === 'fytd') {
      const currentCalendarYear = now.getFullYear();
      const currentMonth0Indexed = now.getMonth(); // 0-5 is Jan-Jun, 6-11 is Jul-Dec

      let fyStartYear: number;
      // CURRENT_FINANCIAL_YEAR_START_MONTH is 1-indexed (e.g., 7 for July)
      if (currentMonth0Indexed >= (CURRENT_FINANCIAL_YEAR_START_MONTH - 1)) { 
        // Current date is July or later, so FY started this calendar year
        fyStartYear = currentCalendarYear;
      } else {
        // Current date is Jan-June, so FY started last calendar year
        fyStartYear = currentCalendarYear - 1;
      }
      
      const fyStartDateStr = `${fyStartYear}-${String(CURRENT_FINANCIAL_YEAR_START_MONTH).padStart(2, '0')}-${String(CURRENT_FINANCIAL_YEAR_START_DAY).padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format for today

      return transactions.filter(t => {
        // t.date is YYYY-MM-DD. String comparison works.
        return t.date >= fyStartDateStr && t.date <= todayStr;
      });
    }
    
    // 'allTime'
    return transactions;
  }, [transactions, activeTimeFilter]);


  const toggleMonthExpansion = useCallback((monthYearKey: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthYearKey]: !prev[monthYearKey]
    }));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormState(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormState(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'type') {
      setFormState(prev => ({
        ...prev,
        category: value === TransactionType.INCOME ? DEFAULT_INCOME_CATEGORIES[0] : DEFAULT_EXPENSE_CATEGORIES[0],
      }));
    }
  }, []);

  const handleEditTransaction = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormState({
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toString(),
      date: transaction.date,
      description: transaction.description,
      isRecurring: transaction.isRecurring || false,
      recurrenceFrequency: transaction.recurrenceFrequency || RecurrenceFrequency.MONTHLY,
      recurrenceEndDate: transaction.recurrenceEndDate || '',
    });
    setShowForm(true);
    // Expand the month of the transaction being edited
    const monthYearKey = transaction.date.substring(0, 7);
    setExpandedMonths(prev => ({ ...prev, [monthYearKey]: true }));
  }, [setFormState, setShowForm, setEditingTransaction, setExpandedMonths]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.category || !formState.amount || !formState.date) {
      alert('Please fill in category, amount, and date.');
      return;
    }

    const baseTransactionDetails = {
        type: formState.type,
        category: formState.category,
        amount: parseFloat(formState.amount),
        date: formState.date,
        description: formState.description,
    };

    let completeTransactionData: Transaction;
    const transactionMonthYearKey = formState.date.substring(0, 7);

    if (editingTransaction) {
        completeTransactionData = {
            ...baseTransactionDetails,
            id: editingTransaction.id,
            isRecurring: formState.isRecurring,
        };
        if (formState.isRecurring) {
            completeTransactionData.recurrenceFrequency = formState.recurrenceFrequency;
            if (formState.recurrenceEndDate) {
                completeTransactionData.recurrenceEndDate = formState.recurrenceEndDate;
            } else {
                delete completeTransactionData.recurrenceEndDate; 
            }
        } else {
            delete completeTransactionData.recurrenceFrequency;
            delete completeTransactionData.recurrenceEndDate;
        }
        
        setTransactions(prev =>
            prev.map(t =>
                t.id === editingTransaction.id ? completeTransactionData : t
            ) 
        ); 
        setEditingTransaction(null);
    } else {
        completeTransactionData = {
            ...baseTransactionDetails,
            id: generateId(),
            isRecurring: formState.isRecurring,
        };
        if (formState.isRecurring) {
            completeTransactionData.recurrenceFrequency = formState.recurrenceFrequency;
            if (formState.recurrenceEndDate) {
                completeTransactionData.recurrenceEndDate = formState.recurrenceEndDate;
            }
        }
        setTransactions(prev => [...prev, completeTransactionData]); 
    }
    
    setExpandedMonths(prev => ({ ...prev, [transactionMonthYearKey]: true }));
    setFormState(initialFormState);
    setShowForm(false);
  }, [formState, setTransactions, editingTransaction, setEditingTransaction, setShowForm, setExpandedMonths]);


  const handleDeleteTransaction = useCallback((id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  }, [setTransactions]);

  // Group ALL transactions by month for the detailed list view
  const groupedAllTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
      const monthYear = t.date.substring(0, 7); // YYYY-MM
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(t);
    });
    for (const key in groups) {
        groups[key].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return groups;
  }, [transactions]);

  const sortedAllMonthYearKeys = useMemo(() => {
    return Object.keys(groupedAllTransactions).sort((a, b) => b.localeCompare(a)); // Sorts YYYY-MM descending
  }, [groupedAllTransactions]);

  useEffect(() => {
    if (sortedAllMonthYearKeys.length > 0) {
      const mostRecentMonthKey = sortedAllMonthYearKeys[0];
      const isAnyMonthExpanded = Object.values(expandedMonths).some(isExpanded => isExpanded);
      if (!isAnyMonthExpanded && expandedMonths[mostRecentMonthKey] === undefined) {
           setExpandedMonths(prev => ({...prev, [mostRecentMonthKey]: true }));
      }
    }
  }, [sortedAllMonthYearKeys, expandedMonths]);


  // Calculations based on filteredTransactions for overview and charts
  const totalIncome = useMemo(() => filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);
  const totalExpenses = useMemo(() => filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0), [filteredTransactions]);
  const netBalance = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  const expenseChartData: ChartDataPoint[] = useMemo(() => {
    const expenseByCategory = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
    return Object.entries(expenseByCategory).map(([name, value], index) => ({ name, value, fill: CHART_COLORS[index % CHART_COLORS.length] }));
  }, [filteredTransactions]);
  
  const incomeExpenseChartData: BarChartDataPoint[] = useMemo(() => {
    const monthlyData: Record<string, { income: number; expenses: number }> = {};
    filteredTransactions.forEach(t => {
      const monthYear = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { income: 0, expenses: 0 };
      }
      if (t.type === TransactionType.INCOME) {
        monthlyData[monthYear].income += t.amount;
      } else {
        monthlyData[monthYear].expenses += t.amount;
      }
    });
    return Object.entries(monthlyData)
      .map(([monthYear, data]) => ({ name: formatMonthYear(monthYear), income: data.income, expenses: data.expenses }))
      .sort((a,b) => a.name.localeCompare(b.name)); // Sorting by formatted month name might need care; sorting by YYYY-MM before formatting is safer if order matters.
                                                // Let's sort by YYYY-MM string (original key)
  }, [filteredTransactions]);

  // For incomeExpenseChartData, sort by YYYY-MM string to ensure chronological order
   const sortedIncomeExpenseChartData = useMemo(() => {
    const monthlyData: Record<string, { income: number; expenses: number; monthYearKey: string }> = {};
    filteredTransactions.forEach(t => {
      const monthYearKey = t.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthYearKey]) {
        monthlyData[monthYearKey] = { income: 0, expenses: 0, monthYearKey };
      }
      if (t.type === TransactionType.INCOME) {
        monthlyData[monthYearKey].income += t.amount;
      } else {
        monthlyData[monthYearKey].expenses += t.amount;
      }
    });
    return Object.values(monthlyData)
      .sort((a,b) => a.monthYearKey.localeCompare(b.monthYearKey)) // Sort by YYYY-MM
      .map(data => ({ name: formatMonthYear(data.monthYearKey), income: data.income, expenses: data.expenses }));
  }, [filteredTransactions]);


  useEffect(() => {
    if (transactions.length === 0) {
      setAnnualizedIncomeFromTransactions(null);
      setAnnualizedExpensesFromTransactions(null);
      setAnnualizationMessage("No transactions available to calculate annualized figures.");
      return;
    }
    const allDatesValid = transactions.every(t => !isNaN(new Date(t.date).getTime()));
    if (!allDatesValid) {
        setAnnualizedIncomeFromTransactions(0); 
        setAnnualizedExpensesFromTransactions(0); 
        setAnnualizationMessage("Some transaction dates are invalid. Cannot calculate annualized figures.");
        return;
    }
    
    const incomeTx = transactions.filter(t => t.type === TransactionType.INCOME);
    const expenseTx = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const allDates = transactions.map(t => new Date(t.date + 'T00:00:00').getTime()); // Treat as local time
    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    
    let daysInRange = (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1; 
    if (minDate === maxDate) { 
        daysInRange = 1;
    }

    const totalTrackedIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
    const totalTrackedExpenses = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    
    const calculatedAnnualizedIncome = daysInRange > 0 ? (totalTrackedIncome / daysInRange) * 365.25 : totalTrackedIncome * 365.25;
    const calculatedAnnualizedExpenses = daysInRange > 0 ? (totalTrackedExpenses / daysInRange) * 365.25 : totalTrackedExpenses * 365.25;

    setAnnualizedIncomeFromTransactions(calculatedAnnualizedIncome);
    setAnnualizedExpensesFromTransactions(calculatedAnnualizedExpenses);

    if (daysInRange < 7 && daysInRange >=1) {
      setAnnualizationMessage(`Annualized figures based on ${Math.round(daysInRange)} day(s) of transaction data. Projections may be less accurate.`);
    } else if (daysInRange >= 7) {
      setAnnualizationMessage(`Annualized figures based on approx. ${Math.round(daysInRange)} days of transaction data.`);
    } else { 
       setAnnualizationMessage("Calculated annualized figures from transaction data.");
    }
  }, [transactions]);


  const handleForecastInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'baselineSource') {
        setForecastInputs(prev => ({ ...prev, baselineSource: value as 'manual' | 'transactions' }));
    } else {
        const parsedValue = value === '' ? 0 : parseFloat(value);
        setForecastInputs(prev => ({ ...prev, [name]: isNaN(parsedValue) ? 0 : parsedValue }));
    }
  }, [setForecastInputs]);


  const handleGenerateForecast = useCallback(() => {
    const projections: ProjectedBudgetYear[] = [];
    let baseIncome: number;
    let baseExpenses: number;

    if (forecastInputs.baselineSource === 'transactions') {
        if (annualizedIncomeFromTransactions !== null && annualizedExpensesFromTransactions !== null && transactions.length > 0) {
            baseIncome = annualizedIncomeFromTransactions;
            baseExpenses = annualizedExpensesFromTransactions;
        } else {
             alert("Cannot use annualized transactions. Please add transactions or switch to manual input if no transactions are available.");
             setProjectedBudgetData(null);
             return;
        }
    } else { 
        baseIncome = forecastInputs.baselineAnnualIncome;
        baseExpenses = forecastInputs.baselineAnnualExpenses;
    }
    
    let currentIncome = baseIncome;
    let currentExpenses = baseExpenses;
    const currentActualYear = new Date().getFullYear();

    for (let i = 0; i < forecastInputs.forecastYears; i++) {
      if (i > 0) { 
          currentIncome *= (1 + forecastInputs.incomeGrowthRate / 100);
          currentExpenses *= (1 + forecastInputs.expenseGrowthRate / 100);
      }
      
      const net = currentIncome - currentExpenses;
      projections.push({
        year: i + 1, 
        actualYear: currentActualYear + i,
        projectedIncome: currentIncome,
        projectedExpenses: currentExpenses,
        projectedNetBalance: net,
      });
    }
    setProjectedBudgetData(projections);
  }, [forecastInputs, annualizedIncomeFromTransactions, annualizedExpensesFromTransactions, transactions]);
  
  const getTimeFilterSuffix = useCallback(() => {
    if (activeTimeFilter === 'currentMonth') return '(Current Month)';
    if (activeTimeFilter === 'fytd') return '(Financial Year to Date)';
    return '(All Time)';
  }, [activeTimeFilter]);

  const projectedBudgetDataForChart = useMemo(() => {
    if (!projectedBudgetData) return [];
    return projectedBudgetData.map(item => ({
      name: `Year ${item.year} (${item.actualYear})`,
      Income: item.projectedIncome,
      Expenses: item.projectedExpenses,
      "Net Balance": item.projectedNetBalance,
    }));
  }, [projectedBudgetData]);


  return (
    <div className="space-y-8">
      <div className="mb-6 flex flex-wrap justify-center items-center gap-2 p-3 bg-white border border-gray-200 rounded-xl shadow-md">
        <span className="text-sm font-medium text-gray-700 mr-2">Show data for:</span>
        {([
          { label: 'Current Month', value: 'currentMonth' },
          { label: 'FYTD', value: 'fytd' },
          { label: 'All Time', value: 'allTime' },
        ] as { label: string; value: TimeFilterOption }[]).map(filter => (
          <Button
            key={filter.value}
            variant={activeTimeFilter === filter.value ? 'primary' : 'outline'}
            onClick={() => setActiveTimeFilter(filter.value)}
            size="sm"
            className="text-xs sm:text-sm"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card title={`Budget Overview ${getTimeFilterSuffix()}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Total Income</p>
            <p className="text-2xl font-semibold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Total Expenses</p>
            <p className="text-2xl font-semibold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-500">Net Balance</p>
            <p className={`text-2xl font-semibold ${netBalance >= 0 ? 'text-sky-600' : 'text-amber-500'}`}>{formatCurrency(netBalance)}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title={`Expense Breakdown ${getTimeFilterSuffix()}`}>
          {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expenseChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} 
                     label={({ name, percent, value }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {expenseChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)} 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.375rem', color: '#374151' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-10">No expense data for this period.</p>}
        </Card>
        <Card title={`Income vs. Expenses ${getTimeFilterSuffix()}`}>
          {sortedIncomeExpenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedIncomeExpenseChartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} stroke="#d1d5db"/>
                <XAxis dataKey="name" stroke="#6b7280"/>
                <YAxis stroke="#6b7280" tickFormatter={(value) => formatNumberForAxis(value)} />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.375rem', color: '#374151' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend />
                <Bar dataKey="income" fill={CHART_COLORS[1]} name="Income" />
                <Bar dataKey="expenses" fill={CHART_COLORS[0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-500 text-center py-10">No income vs. expenses data for this period.</p>}
        </Card>
      </div>
      
      <Card 
        title={editingTransaction ? "Edit Transaction" : (showForm ? "Add New Transaction" : "Transaction History (All Time)")}
        footerContent={!showForm && 
          <Button 
            onClick={() => {
              setEditingTransaction(null);
              setFormState(initialFormState);
              setShowForm(true);
            }} 
            leftIcon={<PlusCircleIcon className="w-5 h-5"/>}
          >
            Add Transaction
          </Button>
        }
      >
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50/50 rounded-md mb-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select id="type" name="type" value={formState.type} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900">
                  <option value={TransactionType.EXPENSE}>Expense</option>
                  <option value={TransactionType.INCOME}>Income</option>
                </select>
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select id="category" name="category" value={formState.category} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900">
                  {(formState.type === TransactionType.INCOME ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <Input label="Amount" id="amount" name="amount" type="number" step="0.01" value={formState.amount} onChange={handleInputChange} required unit="AUD" />
            <Input label="Date" id="date" name="date" type="date" value={formState.date} onChange={handleInputChange} required />
            <Input label="Description" id="description" name="description" value={formState.description} onChange={handleInputChange} />
            
            <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="flex items-center mb-3">
                    <input 
                        id="isRecurring" 
                        name="isRecurring" 
                        type="checkbox" 
                        checked={formState.isRecurring} 
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 bg-gray-50"
                    />
                    <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
                        Is this a recurring transaction?
                    </label>
                </div>

                {formState.isRecurring && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-300 ml-2">
                        <div>
                            <label htmlFor="recurrenceFrequency" className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                            <select 
                                id="recurrenceFrequency" 
                                name="recurrenceFrequency" 
                                value={formState.recurrenceFrequency} 
                                onChange={handleInputChange}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                            >
                                {RECURRENCE_FREQUENCIES.map(freq => (
                                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                                ))}
                            </select>
                        </div>
                        <Input 
                            label="Repeats Until (Optional)" 
                            id="recurrenceEndDate" 
                            name="recurrenceEndDate" 
                            type="date" 
                            value={formState.recurrenceEndDate || ''} 
                            onChange={handleInputChange}
                            containerClassName="mb-0"
                        />
                         <p className="text-xs text-gray-500 mt-1">If no end date, it repeats indefinitely for display purposes.</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { setEditingTransaction(null); setFormState(initialFormState); setShowForm(false); }}>Cancel</Button>
              <Button type="submit" variant="primary">{editingTransaction ? 'Update Transaction' : 'Save Transaction'}</Button>
            </div>
          </form>
        )}

        {sortedAllMonthYearKeys.length > 0 ? (
          <div className="space-y-4 mt-4">
            {sortedAllMonthYearKeys.map(monthYearKey => {
              const monthTransactions = groupedAllTransactions[monthYearKey];
              const incomeThisMonth = monthTransactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
              const expensesThisMonth = monthTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
              const netThisMonth = incomeThisMonth - expensesThisMonth;
              const isExpanded = !!expandedMonths[monthYearKey];

              return (
                <div key={monthYearKey} className="border border-gray-200 rounded-lg">
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-100/70 hover:bg-gray-200/70 cursor-pointer rounded-t-lg"
                    onClick={() => toggleMonthExpansion(monthYearKey)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleMonthExpansion(monthYearKey);}}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isExpanded}
                    aria-controls={`transactions-${monthYearKey}`}
                  >
                    <div className="flex items-center">
                      {isExpanded ? <ChevronDownIcon className="w-5 h-5 mr-2 text-indigo-600" /> : <ChevronRightIcon className="w-5 h-5 mr-2 text-indigo-600" />}
                      <h4 className="font-semibold text-indigo-700">{formatMonthYear(monthYearKey)}</h4>
                    </div>
                    <div className="text-xs sm:text-sm space-x-2 sm:space-x-4 text-right">
                        <span className="text-green-600" title="Income this month">{formatCurrency(incomeThisMonth)}</span>
                        <span className="text-red-600" title="Expenses this month">{formatCurrency(expensesThisMonth)}</span>
                        <span className={`${netThisMonth >= 0 ? 'text-sky-600' : 'text-amber-600'} font-medium`} title="Net this month">{formatCurrency(netThisMonth)}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div id={`transactions-${monthYearKey}`} className="overflow-x-auto p-1 sm:p-2 bg-white rounded-b-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Recurring</th>
                            <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {monthTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{formatDate(t.date)}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === TransactionType.INCOME ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {t.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{t.category}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={t.description}>{t.description || '-'}</td>
                              <td className={`px-3 py-2 whitespace-nowrap text-sm text-right font-medium ${t.type === TransactionType.INCOME ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(t.amount)}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center text-sm text-gray-600">
                                {t.isRecurring ? (
                                  <Tooltip text={`${RECURRENCE_FREQUENCIES.find(f => f.value === t.recurrenceFrequency)?.label || ''}${t.recurrenceEndDate ? ` until ${formatDate(t.recurrenceEndDate)}` : ' indefinitely'}`}>
                                    <RepeatIcon className="w-5 h-5 text-indigo-500 inline-block" />
                                  </Tooltip>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-medium space-x-1">
                                <Button variant="outline" size="sm" onClick={() => handleEditTransaction(t)} className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-300 hover:border-indigo-400">
                                  <EditIcon className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleDeleteTransaction(t.id)} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300 hover:border-red-400">
                                  <TrashIcon className="w-4 h-4"/>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          !showForm && <p className="text-gray-500 text-center py-10">No transactions yet. Click "Add Transaction" to get started.</p>
        )}
      </Card>

      <Card title="Budget Forecast">
        <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baseline Figures Source</label>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="baselineSource"
                    value="manual"
                    checked={forecastInputs.baselineSource === 'manual'}
                    onChange={handleForecastInputChange}
                    className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enter Manually</span>
                </label>
                <label className={`flex items-center ${transactions.length === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="baselineSource"
                    value="transactions"
                    checked={forecastInputs.baselineSource === 'transactions'}
                    onChange={handleForecastInputChange}
                    disabled={transactions.length === 0}
                    className="form-radio h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:bg-gray-200"
                  />
                  <span className="ml-2 text-sm text-gray-700">Use Annualized Transactions</span>
                </label>
              </div>
            </div>

            {forecastInputs.baselineSource === 'manual' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
                <Input label="Baseline Annual Income" id="baselineAnnualIncome" name="baselineAnnualIncome" type="number" value={forecastInputs.baselineAnnualIncome.toString()} onChange={handleForecastInputChange} unit="AUD" />
                <Input label="Baseline Annual Expenses" id="baselineAnnualExpenses" name="baselineAnnualExpenses" type="number" value={forecastInputs.baselineAnnualExpenses.toString()} onChange={handleForecastInputChange} unit="AUD" />
              </div>
            )}

            {forecastInputs.baselineSource === 'transactions' && (
              <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                {annualizedIncomeFromTransactions !== null && annualizedExpensesFromTransactions !== null && transactions.length > 0 ? (
                  <>
                    <p className="text-sm text-indigo-700">
                      Using annualized figures from transactions:
                    </p>
                    <p className="text-sm font-semibold text-indigo-700">
                      Est. Annual Income: {formatCurrency(annualizedIncomeFromTransactions)}
                    </p>
                    <p className="text-sm font-semibold text-indigo-700">
                      Est. Annual Expenses: {formatCurrency(annualizedExpensesFromTransactions)}
                    </p>
                    {annualizationMessage && <p className="text-xs text-indigo-600 mt-1">{annualizationMessage}</p>}
                  </>
                ) : (
                  <p className="text-sm text-orange-600">{annualizationMessage || "No transactions to annualize."}</p>
                )}
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6 pt-2 border-t border-gray-200">
          <Input label="Forecast Period" id="forecastYears" name="forecastYears" type="number" value={forecastInputs.forecastYears.toString()} onChange={handleForecastInputChange} unit="years" />
          <Input label="Annual Income Growth" id="incomeGrowthRate" name="incomeGrowthRate" type="number" step="0.1" value={forecastInputs.incomeGrowthRate.toString()} onChange={handleForecastInputChange} unit="%" />
          <Input label="Annual Expense Growth" id="expenseGrowthRate" name="expenseGrowthRate" type="number" step="0.1" value={forecastInputs.expenseGrowthRate.toString()} onChange={handleForecastInputChange} unit="%" />
        </div>
        <div className="text-center mb-6">
          <Button onClick={handleGenerateForecast} variant="primary" leftIcon={<ForecastIcon className="w-5 h-5"/>}>Generate Forecast</Button>
        </div>

        {projectedBudgetData && projectedBudgetData.length > 0 && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-gray-700 mb-4">Forecast Projection Chart</h4>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={projectedBudgetDataForChart} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} stroke="#d1d5db" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis tickFormatter={(value) => formatNumberForAxis(value)} stroke="#6b7280" />
                <RechartsTooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.375rem', color: '#374151' }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Income" stroke={CHART_COLORS[1]} strokeWidth={2} activeDot={{ r: 6 }} name="Projected Income" />
                <Line type="monotone" dataKey="Expenses" stroke={CHART_COLORS[0]} strokeWidth={2} activeDot={{ r: 6 }} name="Projected Expenses" />
                <Line type="monotone" dataKey="Net Balance" stroke={CHART_COLORS[2]} strokeWidth={2} activeDot={{ r: 6 }} name="Projected Net Balance" />
              </LineChart>
            </ResponsiveContainer>

            <h4 className="text-lg font-semibold text-gray-700 mt-8 mb-4">Forecast Projection Table</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Year</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actual Year</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Projected Income</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Projected Expenses</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Projected Net Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projectedBudgetData.map(item => (
                    <tr key={item.year} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.actualYear}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(item.projectedIncome)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(item.projectedExpenses)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${item.projectedNetBalance >= 0 ? 'text-sky-600' : 'text-amber-500'}`}>
                        {formatCurrency(item.projectedNetBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
         {(!projectedBudgetData || projectedBudgetData.length === 0) && <p className="text-gray-500 text-center py-10">Click "Generate Forecast" to see projections based on your selected inputs.</p>}
      </Card>

    </div>
  );
};