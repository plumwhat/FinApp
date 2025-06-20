
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  error?: string;
  unit?: string;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  id, 
  type = 'text', 
  containerClassName = 'mb-4', 
  labelClassName = 'block text-sm font-medium text-gray-700 mb-1',
  inputClassName = `mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm 
                    focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 placeholder-gray-400`,
  error,
  unit,
  ...props 
}) => {
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <input type={type} id={id} name={id} className={`${inputClassName} ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${unit ? 'pr-12' : ''}`} {...props} />
        {unit && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">{unit}</span>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};