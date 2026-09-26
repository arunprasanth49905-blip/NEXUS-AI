/**
 * NEXUS-AI Phase 5: Debug Agent
 * Analyzes errors, identifies root causes, explains failures, and suggests actionable fixes.
 */

import { BaseAgent } from '../base.js';
import type { AgentExecutionContext, AgentExecutionOutput } from '../types.js';
import type { RuntimeManager } from '../../manager.js';

export class DebugAgent extends BaseAgent {
  public readonly agent_id = 'debug-agent';
  public readonly name = 'Debug Agent';
  public readonly description = 'Analyzes technical errors and stack traces, identifies possible root causes, and structures debugging remediation.';
  public readonly capabilities = [
    'analyze_errors',
    'identify_possible_causes',
    'explain_failures',
    'suggest_fixes',
    'structure_debugging_tasks',
  ];
  public readonly supported_task_types = [
    'debug',
    'error_analysis',
    'troubleshooting',
    'fix_suggestion',
    'error',
  ];
  public readonly required_context_types = ['error', 'stack_trace', 'project_context'];
  public readonly risk_level = 'READ_ONLY';

  private runtimeManager?: RuntimeManager;

  constructor(runtimeManager?: RuntimeManager) {
    super();
    this.runtimeManager = runtimeManager;
  }

  public async execute(context: AgentExecutionContext): Promise<AgentExecutionOutput> {
    const errorInput = context.input_text;
    const projectContext = context.scoped_context.project as Record<string, unknown> | undefined;

    let debugPrompt = `[NEXUS Debug Agent]\nFailure / Error Log:\n${errorInput}\n`;
    if (projectContext) {
      debugPrompt += `Project Framework / Stack: ${JSON.stringify(projectContext)}\n`;
    }

    if (this.runtimeManager) {
      try {
        const infResult = await this.runtimeManager.infer({
          input: `${debugPrompt}\nProvide: 1. Root Cause Diagnosis, 2. Explanatory Context, 3. Step-by-Step Fix.`,
          requestedProvider: 'auto',
        });
        return {
          text: infResult.result.text,
          structured_data: {
            agent_id: this.agent_id,
            error_detected: true,
            provider: infResult.provider,
            latency_ms: infResult.latency_ms,
          },
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Inference error';
        return {
          text: `[Debug Agent Fallback]\nIdentified Error: ${errorInput}\nPotential Cause: Missing symbol or dependency.\nRecommended Action: Verify import paths and tsconfig scope.`,
          warnings: [msg],
        };
      }
    }

    // Deterministic diagnostic heuristic
    let cause = 'Syntax or runtime exception';
    let fix = 'Check variable initialization and symbol scoping.';
    if (errorInput.includes('Cannot find name') || errorInput.includes('is not defined')) {
      cause = 'Missing import or undeclared variable in current scope.';
      fix = 'Ensure the missing symbol is imported from its module or declared with appropriate types.';
    } else if (errorInput.includes('TypeError') || errorInput.includes('undefined')) {
      cause = 'Attempted property access or invocation on null/undefined reference.';
      fix = 'Add optional chaining (?.) or defensive null guards before property access.';
    } else if (errorInput.includes('404') || errorInput.includes('ECONNREFUSED')) {
      cause = 'Target service or endpoint unreachable or unconfigured.';
      fix = 'Verify server port, URL routing, and service initialization status.';
    }

    return {
      text: `[Debug Agent Diagnostic Report]\nIssue: ${errorInput.slice(0, 150)}\n\n1. Technical Root Cause:\n${cause}\n\n2. Suggested Fix:\n${fix}\n\n3. Verification:\nRun build or test check to confirm resolution.`,
      structured_data: {
        agent_id: this.agent_id,
        diagnosed_cause: cause,
        suggested_remediation: fix,
      },
    };
  }
}
