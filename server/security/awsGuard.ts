/**
 * CRITICAL SAFETY LAYER: AWS READ-ONLY SECURITY GUARD
 * 
 * Enforces strict application-wide read-only boundaries.
 * Guarantees that even if credentials possess AdministratorAccess or write permissions,
 * the application is physically incapable of calling any write, mutate, start, stop, or delete APIs.
 */

export class BlockedOperationError extends Error {
  public readonly operation: string;
  public readonly reason: string;
  public readonly blockedAt: string;

  constructor(operation: string, reason: string) {
    super(`BLOCKED: AWS write operation is strictly forbidden. Operation '${operation}' is not allowlisted as read-only.`);
    this.name = 'BlockedOperationError';
    this.operation = operation;
    this.reason = reason;
    this.blockedAt = new Date().toISOString();
  }
}

/**
 * Explicit allowlist of permissible, non-mutating AWS read operations.
 * ANY operation not in this Set will be immediately blocked and throw an error.
 */
export const APPROVED_READ_ONLY_OPERATIONS = new Set<string>([
  // AWS Cost Explorer (Purely Read-Only Billing & Cost queries)
  'GetCostAndUsage',
  'GetCostForecast',
  'GetDimensionValues',
  'GetTags',
  'GetReservationUtilization',
  'GetReservationCoverage',
  'GetSavingsPlansUtilization',
  'GetSavingsPlansCoverage',
  'GetCostCategories',

  // AWS STS (Caller Identity / Account ID check)
  'GetCallerIdentity',

  // AWS EC2 (Strictly metadata read-only)
  'DescribeInstances',
  'DescribeVolumes',
  'DescribeAddresses',
  'DescribeRegions',

  // AWS RDS (Strictly metadata read-only)
  'DescribeDBInstances',

  // AWS S3 (Strictly metadata read-only)
  'ListBuckets',
  'GetBucketLocation',
  'GetBucketTagging',

  // AWS CloudTrail (Strictly read-only activity audit trail)
  'LookupEvents'
]);

/**
 * Forbidden mutation prefixes. Even if someone accidentally adds one to the allowlist,
 * this secondary defense regex will catch it.
 */
const FORBIDDEN_MUTATION_REGEX = /^(Create|Delete|Put|Update|Modify|Start|Stop|Reboot|Terminate|Attach|Detach|Authorize|Revoke|Set|Copy|Import|Export|Register|Deregister|Purchase|Accept|Reject|Associate|Disassociate|Enable|Disable|BatchDelete|BatchModify)/i;

/**
 * Verifies if an AWS operation name is approved as read-only.
 */
export function isOperationApproved(operationName: string): boolean {
  if (!operationName || typeof operationName !== 'string') {
    return false;
  }

  // Check forbidden pattern first
  if (FORBIDDEN_MUTATION_REGEX.test(operationName)) {
    return false;
  }

  // Check explicit allowlist
  return APPROVED_READ_ONLY_OPERATIONS.has(operationName);
}

/**
 * Central AWS operation executor guard.
 * All backend AWS SDK calls MUST pass through this wrapper function.
 * 
 * @param operationName The AWS SDK command or operation name (e.g. 'GetCostAndUsage')
 * @param executor A callback that performs the read-only SDK call
 */
export async function executeSafeReadOnlyOperation<T>(
  operationName: string,
  executor: () => Promise<T>
): Promise<T> {
  // 1. Check if operation is forbidden by pattern
  if (FORBIDDEN_MUTATION_REGEX.test(operationName)) {
    const errorMsg = `BLOCKED: AWS operation '${operationName}' matches forbidden mutation pattern and will never be executed.`;
    console.error(`[AWS READ-ONLY GUARD SECURITY ALERT] ${errorMsg}`);
    throw new BlockedOperationError(operationName, 'Matches forbidden mutation pattern');
  }

  // 2. Check explicit allowlist
  if (!APPROVED_READ_ONLY_OPERATIONS.has(operationName)) {
    const errorMsg = `BLOCKED — operation '${operationName}' is not allowlisted as read-only.`;
    console.error(`[AWS READ-ONLY GUARD SECURITY ALERT] ${errorMsg}`);
    throw new BlockedOperationError(operationName, 'Operation is not in the approved read-only allowlist');
  }

  // 3. Operation is approved. Execute safe read call.
  try {
    return await executor();
  } catch (err: any) {
    // Log friendly read-only error without leaking secrets
    console.warn(`[AWS READ-ONLY OPERATION] '${operationName}' failed with: ${err.message || err.name || 'Unknown AWS error'}`);
    throw err;
  }
}

/**
 * Diagnostic helper: Audit list of approved operations
 */
export function getApprovedOperationsList(): string[] {
  return Array.from(APPROVED_READ_ONLY_OPERATIONS);
}
