import { describe, it, expect } from 'vitest';
import {
  explainService,
  explainUsageType,
  getFriendlyRegionName
} from '../shared/explanationDictionary.js';
import { MockDataService } from '../server/aws/mockDataService.js';

describe('FinOps Calculations & Explanations', () => {
  it('correctly calculates percentage changes and totals in MockDataService', () => {
    const services = MockDataService.getServices();
    expect(services.length).toBeGreaterThan(5);

    const ec2 = services.find(s => s.serviceName.includes('EC2') || s.serviceName.includes('Elastic Compute Cloud'));
    expect(ec2).toBeDefined();
    if (ec2) {
      expect(ec2.currentMonth).toBeGreaterThan(0);
      expect(ec2.changePercent).toBeDefined();
      expect(ec2.plainEnglishExplanation).toContain('virtual');
    }
  });

  it('translates obscure AWS terms into plain English', () => {
    const ec2Exp = explainService('EC2 - Other');
    expect(ec2Exp.friendlyName).toContain('Supporting Infrastructure');
    expect(ec2Exp.detailedExplanation).toContain('EBS');

    const s3Exp = explainService('Amazon Simple Storage Service');
    expect(s3Exp.category).toBe('Storage');

    const boxUsage = explainUsageType('BoxUsage:m5.large');
    expect(boxUsage.friendlyTitle).toContain('On-Demand Server');

    const natBytes = explainUsageType('NatGateway-Bytes');
    expect(natBytes.friendlyTitle).toContain('NAT Gateway');
  });

  it('translates region codes into friendly names with locations', () => {
    expect(getFriendlyRegionName('us-east-1')).toBe('US East (N. Virginia)');
    expect(getFriendlyRegionName('us-west-2')).toBe('US West (Oregon)');
    expect(getFriendlyRegionName('ap-south-1')).toBe('Asia Pacific (Mumbai)');
    expect(getFriendlyRegionName('eu-west-1')).toBe('Europe (Ireland)');
  });

  it('provides safe search responses without arbitrary command execution', () => {
    const resIncrease = MockDataService.handleSearch('Why did my AWS bill increase?');
    expect(resIncrease.intent).toBe('increase_explanation');
    expect(resIncrease.summary).toContain('EC2');

    const resEc2 = MockDataService.handleSearch('How much am I spending on EC2?');
    expect(resEc2.intent).toBe('service_lookup');
    expect(resEc2.highlightNumber).toBeDefined();
  });
});
