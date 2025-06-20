
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerContent?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName = '', bodyClassName = '', footerContent }) => {
  return (
    <div className={`bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 ${className}`}>
      {title && (
        <div className={`px-4 py-4 sm:px-6 border-b border-gray-200 ${titleClassName}`}>
          <h3 className="text-lg leading-6 font-semibold text-indigo-600">{title}</h3>
        </div>
      )}
      <div className={`px-4 py-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
      {footerContent && (
        <div className="px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200">
          {footerContent}
        </div>
      )}
    </div>
  );
};