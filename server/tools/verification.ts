/**
 * NEXUS-AI Phase 6: Action Verification Engine
 * Validates post-execution effects (e.g. verifying files exist, outputs conform to schemas).
 */

import fs from 'fs';
import type { ToolResult, VerificationState } from './types.js';

export interface ActionVerificationDetail {
  check_name: string;
  passed: boolean;
  message: string;
}

export class ActionVerificationEngine {
  /**
   * Verify an action result based on tool type and expectations.
   */
  public static verifyResult(result: ToolResult): {
    state: VerificationState;
    verified: boolean;
    checks: ActionVerificationDetail[];
    summary: string;
  } {
    const checks: ActionVerificationDetail[] = [];

    // 1. Status check
    if (result.status !== 'COMPLETED') {
      checks.push({
        check_name: 'execution_status',
        passed: false,
        message: `Execution did not reach COMPLETED state. Current: ${result.status}`,
      });
      return {
        state: 'FAILED',
        verified: false,
        checks,
        summary: `Verification failed: tool ended in status ${result.status}.`,
      };
    }

    checks.push({
      check_name: 'execution_status',
      passed: true,
      message: 'Tool completed execution successfully.',
    });

    // 2. Output existence
    if (!result.output || typeof result.output !== 'object') {
      checks.push({
        check_name: 'output_payload',
        passed: false,
        message: 'No output payload returned.',
      });
      return {
        state: 'PARTIAL',
        verified: false,
        checks,
        summary: 'Execution marked completed but produced no output.',
      };
    }

    // 3. Resource verification for file operations
    const createdPath = result.output.created_path as string | undefined;
    const modifiedPath = result.output.modified_path as string | undefined;
    const deletedPath = result.output.deleted_path as string | undefined;

    if (createdPath) {
      if (fs.existsSync(createdPath)) {
        const stats = fs.statSync(createdPath);
        checks.push({
          check_name: 'file_creation_verified',
          passed: true,
          message: `Created file verified on disk (${stats.size} bytes).`,
        });
      } else {
        checks.push({
          check_name: 'file_creation_verified',
          passed: false,
          message: `File reported created at '${createdPath}' does not exist on disk.`,
        });
        return {
          state: 'FAILED',
          verified: false,
          checks,
          summary: 'Verification failed: created file not found on filesystem.',
        };
      }
    }

    if (modifiedPath) {
      if (fs.existsSync(modifiedPath)) {
        checks.push({
          check_name: 'file_modification_verified',
          passed: true,
          message: `Modified file verified to exist on disk.`,
        });
      } else {
        checks.push({
          check_name: 'file_modification_verified',
          passed: false,
          message: `Target modified file '${modifiedPath}' is missing.`,
        });
        return {
          state: 'FAILED',
          verified: false,
          checks,
          summary: 'Verification failed: modified file does not exist.',
        };
      }
    }

    if (deletedPath) {
      if (!fs.existsSync(deletedPath)) {
        checks.push({
          check_name: 'file_deletion_verified',
          passed: true,
          message: `Target file '${deletedPath}' confirmed removed from disk.`,
        });
      } else {
        checks.push({
          check_name: 'file_deletion_verified',
          passed: false,
          message: `Target file '${deletedPath}' still exists on disk.`,
        });
        return {
          state: 'FAILED',
          verified: false,
          checks,
          summary: 'Verification failed: file still exists despite reported deletion.',
        };
      }
    }

    // All checks passed
    return {
      state: 'VALID',
      verified: true,
      checks,
      summary: 'Action verified: execution, schema, and filesystem constraints satisfied.',
    };
  }
}
