import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrencyCode, CurrencyConfig } from '../../shared/types.js';

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    rateToUsd: 1.0,
    taxMultiplier: 1.0,
    taxLabel: 'Excl. Tax'
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    label: 'INR (₹)',
    rateToUsd: 86.50,
    taxMultiplier: 1.18,
    taxLabel: 'Incl. 18% GST'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    label: 'EUR (€)',
    rateToUsd: 0.92,
    taxMultiplier: 1.20,
    taxLabel: 'Incl. 20% VAT'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    label: 'GBP (£)',
    rateToUsd: 0.79,
    taxMultiplier: 1.20,
    taxLabel: 'Incl. 20% VAT'
  }
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  includeTax: boolean;
  setIncludeTax: (val: boolean) => void;
  activeConfig: CurrencyConfig;
  formatCurrency: (amountInUsd: number, decimals?: number) => string;
  convertAmount: (amountInUsd: number) => number;
  availableCurrencies: CurrencyConfig[];
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('aws_costlens_currency') as CurrencyCode;
    return saved && SUPPORTED_CURRENCIES[saved] ? saved : 'USD';
  });

  const [includeTax, setIncludeTax] = useState<boolean>(() => {
    return localStorage.getItem('aws_costlens_currency_tax') === 'true';
  });

  const setCurrency = (code: CurrencyCode) => {
    if (SUPPORTED_CURRENCIES[code]) {
      setCurrencyState(code);
      localStorage.setItem('aws_costlens_currency', code);
    }
  };

  const handleSetIncludeTax = (val: boolean) => {
    setIncludeTax(val);
    localStorage.setItem('aws_costlens_currency_tax', String(val));
  };

  const activeConfig = SUPPORTED_CURRENCIES[currency];

  const convertAmount = (amountInUsd: number): number => {
    if (!Number.isFinite(amountInUsd)) return 0;
    const baseConverted = amountInUsd * activeConfig.rateToUsd;
    if (includeTax && activeConfig.taxMultiplier && activeConfig.code !== 'USD') {
      return baseConverted * activeConfig.taxMultiplier;
    }
    return baseConverted;
  };

  const formatCurrency = (amountInUsd: number, decimals = 2): string => {
    if (!Number.isFinite(amountInUsd)) return `${activeConfig.symbol}0.00`;
    const converted = convertAmount(amountInUsd);
    const formattedNum = converted.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return `${activeConfig.symbol}${formattedNum}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        includeTax,
        setIncludeTax: handleSetIncludeTax,
        activeConfig,
        formatCurrency,
        convertAmount,
        availableCurrencies: Object.values(SUPPORTED_CURRENCIES)
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      currency: 'USD',
      setCurrency: () => {},
      includeTax: false,
      setIncludeTax: () => {},
      activeConfig: SUPPORTED_CURRENCIES.USD,
      formatCurrency: (n) => `$${(n || 0).toFixed(2)}`,
      convertAmount: (n) => n || 0,
      availableCurrencies: Object.values(SUPPORTED_CURRENCIES)
    };
  }
  return ctx;
}
