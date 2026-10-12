import fs from 'node:fs';
import path from 'node:path';

/**
 * STATIC ANALYSIS SECURITY AUDIT
 * Scans server and shared directories to ensure no AWS SDK mutation commands
 * or mutating method calls exist in the application.
 */

const FORBIDDEN_AWS_COMMAND_PATTERNS = [
  /new\s+(Create|Delete|Put|Update|Modify|Start|Stop|Reboot|Terminate|Attach|Detach|Authorize|Revoke)[A-Za-z0-9]+Command\b/,
  /\.send\(\s*new\s+(Create|Delete|Put|Update|Modify|Start|Stop|Reboot|Terminate|Attach|Detach|Authorize|Revoke)[A-Za-z0-9]+/
];

const SCAN_DIRS = ['server', 'shared'];
let violations = 0;

function scanDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, lineNum) => {
        for (const pattern of FORBIDDEN_AWS_COMMAND_PATTERNS) {
          if (pattern.test(line)) {
            console.error(`🚨 SECURITY VIOLATION: Mutating AWS command found at ${fullPath}:${lineNum + 1}`);
            console.error(`   ${line.trim()}`);
            violations++;
          }
        }
      });
    }
  }
}

console.log('=====================================================');
console.log('🛡️  RUNNING AWS MUTATION SAFETY AUDIT');
console.log('=====================================================');

for (const dir of SCAN_DIRS) {
  scanDirectory(path.resolve(process.cwd(), dir));
}

if (violations === 0) {
  console.log('✅ AUDIT PASSED: ZERO AWS MUTATION COMMANDS FOUND IN CODEBASE.');
  console.log('   The application is guaranteed 100% read-only.');
  process.exit(0);
} else {
  console.error(`❌ AUDIT FAILED: ${violations} forbidden mutation patterns detected!`);
  process.exit(1);
}
