#!/usr/bin/env node

/**
 * Environment Variable Security Checker
 * 
 * This script ensures that:
 * 1. Client code only uses VITE_ prefixed environment variables
 * 2. Server code uses process.env appropriately
 * 3. No secrets are accidentally exposed to the client bundle
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Secrets that should NEVER appear in client code
const FORBIDDEN_SECRETS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'SMTP_PASSWORD',
  'DATABASE_URL',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'API_SECRET',
  'PRIVATE_KEY'
];

// Patterns to check
const CLIENT_ENV_PATTERN = /import\.meta\.env\.(?!VITE_)(\w+)/g;
const PROCESS_ENV_PATTERN = /process\.env\.(\w+)/g;
const SECRET_PATTERN = new RegExp(`(${FORBIDDEN_SECRETS.join('|')})`, 'gi');

interface ViolationResult {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

async function findFiles(dir: string, extensions: string[]): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath);
      } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function checkFile(filePath: string): Promise<ViolationResult[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: ViolationResult[] = [];
  const isClientFile = filePath.includes('/src/') && !filePath.includes('/supabase/');
  const isServerFile = filePath.includes('/supabase/') || filePath.includes('/scripts/');

  lines.forEach((line, lineIndex) => {
    // Check for secrets in any file
    let match;
    while ((match = SECRET_PATTERN.exec(line)) !== null) {
      violations.push({
        file: filePath,
        line: lineIndex + 1,
        column: match.index + 1,
        message: `Potential secret "${match[0]}" found in code. Ensure this is not exposed to client.`,
        severity: isClientFile ? 'error' : 'warning'
      });
    }

    // Check client files for non-VITE env vars
    if (isClientFile) {
      CLIENT_ENV_PATTERN.lastIndex = 0;
      while ((match = CLIENT_ENV_PATTERN.exec(line)) !== null) {
        violations.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          message: `Client code must only use VITE_ prefixed env vars. Found: import.meta.env.${match[1]}`,
          severity: 'error'
        });
      }

      // Check for process.env in client files
      PROCESS_ENV_PATTERN.lastIndex = 0;
      while ((match = PROCESS_ENV_PATTERN.exec(line)) !== null) {
        // Allow NODE_ENV check
        if (match[1] !== 'NODE_ENV') {
          violations.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            message: `Client code should not use process.env.${match[1]}. Use import.meta.env.VITE_${match[1]} instead.`,
            severity: 'error'
          });
        }
      }
    }
  });

  return violations;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const srcFiles = await findFiles(path.join(projectRoot, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
  const supabaseFiles = await findFiles(path.join(projectRoot, 'supabase'), ['.ts', '.js']);
  
  console.log('🔍 Checking environment variable usage...\n');
  
  let hasErrors = false;
  let hasWarnings = false;
  
  const allFiles = [...srcFiles, ...supabaseFiles];
  
  for (const file of allFiles) {
    const violations = await checkFile(file);
    
    for (const violation of violations) {
      const relativePath = path.relative(projectRoot, violation.file);
      const icon = violation.severity === 'error' ? '❌' : '⚠️';
      
      console.log(`${icon} ${relativePath}:${violation.line}:${violation.column}`);
      console.log(`   ${violation.message}\n`);
      
      if (violation.severity === 'error') {
        hasErrors = true;
      } else {
        hasWarnings = true;
      }
    }
  }
  
  if (hasErrors) {
    console.log('❌ Environment variable security check FAILED!');
    console.log('Fix the errors above before proceeding.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  Environment variable security check completed with warnings.');
    console.log('Review the warnings above to ensure no secrets are exposed.\n');
  } else {
    console.log('✅ Environment variable security check PASSED!');
    console.log('All environment variables are properly secured.\n');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}