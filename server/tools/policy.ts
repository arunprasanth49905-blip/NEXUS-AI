/**
 * NEXUS-AI Phase 6: Action Policy Engine
 * Evaluates whether a tool request is allowed, denied, or requires human approval.
 */

import type { ToolRequest, PolicyEvaluationResult, ActionRiskLevel } from './types.js';
import type { BaseTool } from './base.js';
import { FilesystemSandbox } from './sandbox.js';

export interface PolicyEngineOptions {
  filesystem_enabled?: boolean;
  network_enabled?: boolean;
  browser_enabled?: boolean;
  external_api_enabled?: boolean;
  auto_execute_safe_tasks?: boolean;
  approval_required_for_high_risk?: boolean;
}

export class PolicyEngine {
  private static instance: PolicyEngine | null = null;

  public filesystem_enabled: boolean = true;
  public network_enabled: boolean = false; // Safe default
  public browser_enabled: boolean = false; // Safe default
  public external_api_enabled: boolean = false; // Safe default
  public auto_execute_safe_tasks: boolean = false;
  public approval_required_for_high_risk: boolean = true;

  constructor(options?: PolicyEngineOptions) {
    if (options) {
      if (options.filesystem_enabled !== undefined) this.filesystem_enabled = options.filesystem_enabled;
      if (options.network_enabled !== undefined) this.network_enabled = options.network_enabled;
      if (options.browser_enabled !== undefined) this.browser_enabled = options.browser_enabled;
      if (options.external_api_enabled !== undefined) this.external_api_enabled = options.external_api_enabled;
      if (options.auto_execute_safe_tasks !== undefined) this.auto_execute_safe_tasks = options.auto_execute_safe_tasks;
      if (options.approval_required_for_high_risk !== undefined) this.approval_required_for_high_risk = options.approval_required_for_high_risk;
    } else {
      // Read environment variables if available
      this.filesystem_enabled = process.env.NEXUS_TOOL_FILESYSTEM_ENABLED !== 'false';
      this.network_enabled = process.env.NEXUS_TOOL_NETWORK_ENABLED === 'true';
      this.browser_enabled = process.env.NEXUS_TOOL_BROWSER_ENABLED === 'true';
      this.external_api_enabled = process.env.NEXUS_TOOL_EXTERNAL_API_ENABLED === 'true';
      this.auto_execute_safe_tasks = process.env.NEXUS_TOOL_AUTO_EXECUTE_SAFE_TASKS === 'true';
      this.approval_required_for_high_risk = process.env.NEXUS_TOOL_APPROVAL_REQUIRED !== 'false';
    }
  }

  public static getInstance(options?: PolicyEngineOptions): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine(options);
    }
    return PolicyEngine.instance;
  }

  public static resetInstance(): void {
    PolicyEngine.instance = null;
  }

  /**
   * Central evaluation of a tool execution request.
   * Returns ALLOW, DENY, or REQUIRE_APPROVAL along with technical rationale.
   */
  public evaluate(request: ToolRequest, tool: BaseTool): PolicyEvaluationResult {
    const rulesTriggered: string[] = [];

    // 1. Tool availability / enabled check
    if (!tool.enabled) {
      return {
        decision: 'DENY',
        reason: `Tool '${tool.name}' is currently disabled by system administrator.`,
        risk_level: tool.risk_level,
        requires_approval: false,
        rules_triggered: ['RULE_TOOL_DISABLED'],
      };
    }

    // 2. Capability matching check
    if (!tool.hasCapability(request.capability)) {
      return {
        decision: 'DENY',
        reason: `Tool '${tool.name}' does not provide requested capability '${request.capability}'.`,
        risk_level: tool.risk_level,
        requires_approval: false,
        rules_triggered: ['RULE_CAPABILITY_MISMATCH'],
      };
    }

    // 3. Category policy enforcement
    if (tool.category === 'NETWORK' && !this.network_enabled) {
      return {
        decision: 'DENY',
        reason: 'Network tools are disabled by policy (NEXUS_TOOL_NETWORK_ENABLED=false).',
        risk_level: tool.risk_level,
        requires_approval: false,
        rules_triggered: ['RULE_NETWORK_DISABLED'],
      };
    }

    if (tool.category === 'BROWSER' && !this.browser_enabled) {
      return {
        decision: 'DENY',
        reason: 'Browser tools are disabled by policy (NEXUS_TOOL_BROWSER_ENABLED=false).',
        risk_level: tool.risk_level,
        requires_approval: false,
        rules_triggered: ['RULE_BROWSER_DISABLED'],
      };
    }

    if (tool.category === 'EXTERNAL_API' && !this.external_api_enabled) {
      return {
        decision: 'DENY',
        reason: 'External API tools are disabled by policy (NEXUS_TOOL_EXTERNAL_API_ENABLED=false).',
        risk_level: tool.risk_level,
        requires_approval: false,
        rules_triggered: ['RULE_EXTERNAL_API_DISABLED'],
      };
    }

    if (tool.category === 'FILE' && !this.filesystem_enabled) {
      return {
        decision: 'DENY',
        reason: 'Filesystem tools are disabled by policy (NEXUS_TOOL_FILESYSTEM_ENABLED=false).',
        risk_level: tool.risk_level,
        requires_approval: false,
        rules_triggered: ['RULE_FILESYSTEM_DISABLED'],
      };
    }

    // 4. Filesystem path inspection & sandbox validation if path provided in input
    const inputPath = (request.input?.path as string) || (request.input?.filePath as string) || (request.input?.target_path as string);
    if (inputPath && (tool.category === 'FILE' || tool.category === 'DOCUMENT')) {
      const sandboxCheck = FilesystemSandbox.validatePath(inputPath);
      if (!sandboxCheck.allowed) {
        return {
          decision: 'DENY',
          reason: sandboxCheck.reason || `Path '${inputPath}' violates filesystem sandbox boundaries.`,
          risk_level: tool.risk_level,
          requires_approval: false,
          rules_triggered: ['RULE_PATH_SANDBOX_VIOLATION'],
        };
      }
    }

    // 5. Risk Assessment & Approval Gates
    const riskLevel: ActionRiskLevel = tool.risk_level;

    // Destructive operations ALWAYS require human approval regardless of settings
    if (riskLevel === 'DESTRUCTIVE') {
      rulesTriggered.push('RULE_DESTRUCTIVE_ACTION');
      return {
        decision: 'REQUIRE_APPROVAL',
        reason: `Destructive action (${tool.name}) permanently deletes or modifies resources. User confirmation is strictly required.`,
        risk_level: riskLevel,
        requires_approval: true,
        rules_triggered: rulesTriggered,
      };
    }

    // High risk or external side effect operations require approval by policy
    if (riskLevel === 'HIGH_RISK' || riskLevel === 'EXTERNAL_SIDE_EFFECT') {
      rulesTriggered.push('RULE_HIGH_RISK_ACTION');
      if (this.approval_required_for_high_risk) {
        return {
          decision: 'REQUIRE_APPROVAL',
          reason: `High-risk action (${tool.name}) requires explicit human approval before execution.`,
          risk_level: riskLevel,
          requires_approval: true,
          rules_triggered: rulesTriggered,
        };
      }
    }

    // Low risk file creation requires approval by default unless safe auto-execute is enabled
    if (riskLevel === 'LOW_RISK') {
      if (tool.approval_required && !this.auto_execute_safe_tasks) {
        rulesTriggered.push('RULE_LOW_RISK_APPROVAL_DEFAULT');
        return {
          decision: 'REQUIRE_APPROVAL',
          reason: `Action (${tool.name}) creates persistent assets on disk. Approval requested.`,
          risk_level: riskLevel,
          requires_approval: true,
          rules_triggered: rulesTriggered,
        };
      }
    }

    // READ_ONLY actions are safe to execute directly
    rulesTriggered.push('RULE_READ_ONLY_SAFE');
    return {
      decision: 'ALLOW',
      reason: 'Action is read-only and within safe policy limits.',
      risk_level: riskLevel,
      requires_approval: false,
      rules_triggered: rulesTriggered,
    };
  }
}
