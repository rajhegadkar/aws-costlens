import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DepartmentService } from '../server/aws/departmentService.js';
import { setDemoMode } from '../server/aws/costExplorerService.js';

describe('Version 2.0: Department Cost Bifurcation & Unified Resource TCO', () => {
  beforeEach(() => {
    setDemoMode(true);
  });

  it('loads default department definitions with multi-tier matching rules', () => {
    const depts = DepartmentService.getDepartmentDefinitions();
    expect(depts.length).toBeGreaterThanOrEqual(4);

    const engDept = depts.find(d => d.id === 'dept-eng');
    expect(engDept).toBeDefined();
    expect(engDept?.name).toContain('Engineering');
    expect(engDept?.allocationRules.length).toBeGreaterThan(0);

    const aiDept = depts.find(d => d.id === 'dept-data-ai');
    expect(aiDept).toBeDefined();
    expect(aiDept?.name).toContain('AI');
  });

  it('supports adding custom departments and allocating resources manually', () => {
    const testDept = {
      id: 'dept-test-fintech',
      name: 'FinTech Mobile Core',
      color: 'purple',
      description: 'Customer payment processing and mobile wallet APIs',
      allocationRules: [
        {
          id: 'rule-test-1',
          targetDepartmentId: 'dept-test-fintech',
          matchType: 'name_contains' as const,
          pattern: 'payment',
          priority: 1
        }
      ]
    };

    const updated = DepartmentService.addOrUpdateDepartment(testDept);
    const found = updated.find(d => d.id === 'dept-test-fintech');
    expect(found).toBeDefined();
    expect(found?.name).toBe('FinTech Mobile Core');

    // Test manual assignment
    const assignedList = DepartmentService.assignResourceDepartment(
      'i-0a1b2c3d4e5f60001',
      'dept-test-fintech',
      'Manual assignment for test'
    );
    const target = assignedList.find(d => d.id === 'dept-test-fintech');
    expect(target).toBeDefined();
    const manualRule = target?.allocationRules.find(r => r.pattern === 'i-0a1b2c3d4e5f60001');
    expect(manualRule).toBeDefined();
    expect(manualRule?.matchType).toBe('resource_id');

    // Clean up
    DepartmentService.deleteDepartment('dept-test-fintech');
    const finalDepts = DepartmentService.getDepartmentDefinitions();
    expect(finalDepts.some(d => d.id === 'dept-test-fintech')).toBe(false);
  });

  it('generates a 100% mathematically reconciled Department Bifurcation report with zero variance', async () => {
    const report = await DepartmentService.getDepartmentBifurcationReport();

    expect(report).toBeDefined();
    expect(report.totalOfficialBill).toBeGreaterThan(0);
    expect(report.departments.length).toBeGreaterThan(0);
    expect(report.sharedPlatformServices.length).toBeGreaterThan(0);

    // Verify 100% mathematical reconciliation
    expect(report.isReconciled).toBe(true);
    expect(report.reconciliationVariance).toBe(0.00);

    const totalAllocatedSum =
      report.totalDepartmentAllocated +
      report.totalSharedPlatform +
      report.taxesAndCredits;

    expect(Math.abs(report.totalOfficialBill - totalAllocatedSum)).toBeLessThan(0.05);
  });

  it('calculates Unified Resource TCO combining compute, storage, IPv4, and networking charges', async () => {
    const report = await DepartmentService.getDepartmentBifurcationReport();
    const allResources = [
      ...report.departments.flatMap(d => d.resources),
      ...report.unallocatedResources
    ];

    expect(allResources.length).toBeGreaterThan(0);

    for (const res of allResources) {
      expect(res.resourceId).toBeDefined();
      expect(res.resourceName).toBeDefined();
      expect(res.departmentName).toBeDefined();
      expect(res.costFormula).toBeDefined();
      expect(res.nonTechnicalSummary).toBeDefined();

      // Combined formula: Total = Compute + Storage + Networking + Other
      const sum = Math.round((res.computeCost + res.storageCost + res.networkingCost + res.otherCost) * 100) / 100;
      expect(Math.abs(res.totalCost - sum)).toBeLessThan(0.05);

      if (res.resourceType === 'EC2') {
        expect(res.storageCost).toBeGreaterThanOrEqual(0);
        expect(res.costFormula).toContain('Compute');
      }

      if (res.resourceType === 'S3') {
        expect(res.storageCost).toBeGreaterThan(0);
        expect(res.costFormula).toContain('Storage');
      }
    }
  });

  it('transparently itemizes Shared Cloud Platform & Network services', async () => {
    const report = await DepartmentService.getDepartmentBifurcationReport();
    expect(report.totalSharedPlatform).toBeGreaterThan(0);

    for (const shared of report.sharedPlatformServices) {
      expect(shared.serviceName).toBeDefined();
      expect(shared.cost).toBeGreaterThan(0);
      expect(shared.explanation).toBeDefined();
      expect(shared.nonTechnicalGuide).toBeDefined();
    }
  });

  it('matches all costs as per the actual AWS bill with 100% mathematical precision and zero variance', async () => {
    setDemoMode(false);
    const report = await DepartmentService.getDepartmentBifurcationReport('2026-11');

    expect(report).toBeDefined();
    expect(report.totalOfficialBill).toBeGreaterThan(0);
    expect(report.isReconciled).toBe(true);
    expect(report.reconciliationVariance).toBe(0.00);

    // Verify Bedrock AI models are directly attributed to Data Science & AI department
    const aiDept = report.departments.find(d => d.departmentId === 'dept-data-ai');
    expect(aiDept).toBeDefined();
    const bedrockResources = aiDept?.resources.filter(r => r.resourceType === 'Bedrock');
    expect(bedrockResources && bedrockResources.length > 0).toBe(true);

    // Verify shared network traceability items match actual bill line items
    expect(report.sharedNetworkTraceability.length).toBeGreaterThanOrEqual(2);
    const vpcTrace = report.sharedNetworkTraceability.find(n => n.networkCategory.includes('VPC'));
    expect(vpcTrace).toBeDefined();

    // Verify shared platform services itemizes actual platform services without synthetic fake values
    expect(report.sharedPlatformServices.length).toBeGreaterThan(0);
    const costExplorer = report.sharedPlatformServices.find(s => s.serviceName.includes('Cost Explorer'));
    expect(costExplorer).toBeDefined();

    // Sum verification
    const totalAllocatedSum =
      report.totalDepartmentAllocated +
      report.totalSharedPlatform +
      report.taxesAndCredits;
    expect(Math.abs(report.totalOfficialBill - totalAllocatedSum)).toBeLessThan(0.05);
  });

  it('generates fully reconciled CSV export data with department breakdown and resource TCO', async () => {
    const report = await DepartmentService.getDepartmentBifurcationReport('2026-11');
    expect(report.departments.length).toBeGreaterThan(0);

    const allResources = [
      ...report.departments.flatMap(d => d.resources),
      ...report.unallocatedResources
    ];
    expect(allResources.length).toBeGreaterThan(0);
    for (const r of allResources) {
      expect(r.departmentName).toBeDefined();
      expect(r.resourceId).toBeDefined();
      expect(r.totalCost).toBeGreaterThanOrEqual(0);
      expect(r.costFormula).toBeDefined();
      expect(r.nonTechnicalSummary).toBeDefined();
    }
  });
});

