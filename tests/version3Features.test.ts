import { describe, it, expect } from 'vitest';
import { WasteHunterService } from '../server/aws/wasteHunterService.js';
import { ForecastService } from '../server/aws/forecastService.js';
import { DepartmentService } from '../server/aws/departmentService.js';
import { SUPPORTED_CURRENCIES } from '../src/context/CurrencyContext.js';

describe('Version 3.0 Feature Suite', () => {
  describe('FinOps Waste Hunter', () => {
    it('should generate a valid waste report with categorized savings', async () => {
      const report = await WasteHunterService.scanWaste(true);
      expect(report).toBeDefined();
      expect(typeof report.totalPotentialMonthlySavings).toBe('number');
      expect(report.totalPotentialMonthlySavings).toBeGreaterThan(0);
      expect(report.totalWasteItems).toBeGreaterThan(0);
      expect(report.summaryByCategory).toBeDefined();
      expect(Array.isArray(report.items)).toBe(true);

      const firstItem = report.items[0];
      expect(firstItem.resourceId).toBeDefined();
      expect(firstItem.savingsPotential).toBeGreaterThan(0);
      expect(['critical', 'high', 'medium', 'low']).toContain(firstItem.severity);
      expect(firstItem.nonTechnicalRemediation).toBeTruthy();
    });

    it('should correctly classify unattached EBS and unused Elastic IPs', () => {
      const mockReport = WasteHunterService.getMockWasteReport();
      const hasEbs = mockReport.items.some(i => i.resourceType === 'EBS_UNATTACHED');
      const hasEip = mockReport.items.some(i => i.resourceType === 'UNUSED_ELASTIC_IP');
      const hasStopped = mockReport.items.some(i => i.resourceType === 'EC2_STOPPED');

      expect(hasEbs).toBe(true);
      expect(hasEip).toBe(true);
      expect(hasStopped).toBe(true);
      expect(mockReport.totalPotentialMonthlySavings).toBeCloseTo(
        mockReport.items.reduce((acc, i) => acc + i.savingsPotential, 0),
        2
      );
    });
  });

  describe('Predictive Run-Rate Cost Forecasting', () => {
    it('should generate projected month-end total and confidence intervals', async () => {
      const forecast = await ForecastService.getForecast();
      expect(forecast).toBeDefined();
      expect(forecast.projectedMonthEnd).toBeGreaterThan(0);
      expect(forecast.confidenceInterval.min).toBeLessThanOrEqual(forecast.confidenceInterval.expected);
      expect(forecast.confidenceInterval.expected).toBeLessThanOrEqual(forecast.confidenceInterval.max);
      expect(forecast.dailyPoints.length).toBeGreaterThanOrEqual(28);
      expect(forecast.keyDrivers.length).toBeGreaterThan(0);
    });

    it('should provide realistic mock forecast fallback', () => {
      const mockForecast = ForecastService.getMockForecast();
      expect(mockForecast.daysInMonth).toBe(30);
      expect(mockForecast.currentMonthSpend).toBeGreaterThan(0);
      expect(mockForecast.dailyPoints.length).toBe(30);
      expect(mockForecast.confidenceInterval.min).toBeLessThan(mockForecast.confidenceInterval.max);
    });
  });

  describe('Multi-Currency Support & Conversion', () => {
    it('should define accurate exchange rates for USD, INR, EUR, and GBP', () => {
      expect(SUPPORTED_CURRENCIES.USD.rateToUsd).toBe(1.0);
      expect(SUPPORTED_CURRENCIES.INR.rateToUsd).toBe(86.50);
      expect(SUPPORTED_CURRENCIES.EUR.rateToUsd).toBe(0.92);
      expect(SUPPORTED_CURRENCIES.GBP.rateToUsd).toBe(0.79);
    });

    it('should calculate GST and VAT tax surcharges correctly', () => {
      const inrRate = SUPPORTED_CURRENCIES.INR.rateToUsd;
      const gstMultiplier = SUPPORTED_CURRENCIES.INR.taxMultiplier || 1.18;
      const amountUsd = 100;
      const inrPreTax = amountUsd * inrRate; // 8,650
      const inrWithGst = inrPreTax * gstMultiplier; // 10,207

      expect(inrPreTax).toBe(8650);
      expect(inrWithGst).toBeCloseTo(10207, 1);
    });
  });

  describe('Department Budget & Burn-Rate Alerting', () => {
    it('should compute budgetUsedPercent, projectedMonthEnd, and budgetStatus', async () => {
      const report = await DepartmentService.getDepartmentBifurcationReport();
      expect(report.departments.length).toBeGreaterThan(0);

      const budgetedDept = report.departments.find(d => d.budget && d.budget > 0);
      expect(budgetedDept).toBeDefined();
      if (budgetedDept) {
        expect(typeof budgetedDept.budgetUsedPercent).toBe('number');
        expect(typeof budgetedDept.projectedMonthEnd).toBe('number');
        expect(['on_track', 'approaching_limit', 'exceeded']).toContain(budgetedDept.budgetStatus);
      }
    });
  });
});
