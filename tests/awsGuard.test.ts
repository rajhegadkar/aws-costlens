import { describe, it, expect } from 'vitest';
import {
  executeSafeReadOnlyOperation,
  isOperationApproved,
  BlockedOperationError,
  APPROVED_READ_ONLY_OPERATIONS
} from '../server/security/awsGuard.js';

describe('AWS Read-Only Security Guard', () => {
  it('should allow explicitly approved read-only operations', async () => {
    expect(isOperationApproved('GetCostAndUsage')).toBe(true);
    expect(isOperationApproved('GetCallerIdentity')).toBe(true);
    expect(isOperationApproved('DescribeInstances')).toBe(true);
    expect(isOperationApproved('ListBuckets')).toBe(true);

    const result = await executeSafeReadOnlyOperation('GetCostAndUsage', async () => {
      return { cost: 100 };
    });
    expect(result).toEqual({ cost: 100 });
  });

  it('should strictly reject AWS write/mutation operations with BlockedOperationError', async () => {
    const forbiddenOps = [
      'StopInstances',
      'TerminateInstances',
      'StartInstances',
      'CreateBucket',
      'DeleteBucket',
      'PutObject',
      'ModifyDBInstance',
      'DeleteDBInstance',
      'CreateUser',
      'AttachRolePolicy',
      'RebootInstances',
      'UpdateStack',
      'AuthorizeSecurityGroupIngress'
    ];

    for (const op of forbiddenOps) {
      expect(isOperationApproved(op)).toBe(false);

      await expect(
        executeSafeReadOnlyOperation(op, async () => {
          return 'should never run';
        })
      ).rejects.toThrow(BlockedOperationError);
    }
  });

  it('should reject unlisted operations even if not explicitly matching the mutation regex', async () => {
    const unapprovedOp = 'SomeArbitraryUnapprovedAWSMethod';
    expect(isOperationApproved(unapprovedOp)).toBe(false);

    await expect(
      executeSafeReadOnlyOperation(unapprovedOp, async () => {
        return 'danger';
      })
    ).rejects.toThrow(BlockedOperationError);
  });

  it('verifies that all items in APPROVED_READ_ONLY_OPERATIONS are read-only prefixes', () => {
    for (const op of APPROVED_READ_ONLY_OPERATIONS) {
      const isReadOnly = op.startsWith('Get') || op.startsWith('Describe') || op.startsWith('List') || op.startsWith('Lookup');
      expect(isReadOnly).toBe(true);
    }
  });
});
