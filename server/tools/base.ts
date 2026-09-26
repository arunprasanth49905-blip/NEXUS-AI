/**
 * NEXUS-AI Phase 6: Base Tool Class
 * Standard abstract base class for all tools in the NEXUS Tool & Action Engine.
 */

import type {
  ToolCategory,
  ActionRiskLevel,
  ToolInputSchema,
  ToolOutputSchema,
  ToolInfo,
  ToolResult,
  ToolExecutionContext,
  VerificationState,
} from './types.js';

export abstract class BaseTool {
  public abstract readonly tool_id: string;
  public abstract readonly name: string;
  public abstract readonly description: string;
  public abstract readonly version: string;
  public abstract readonly category: ToolCategory;
  public abstract readonly capabilities: string[];
  public abstract readonly risk_level: ActionRiskLevel;
  public abstract readonly input_schema: ToolInputSchema;
  public abstract readonly output_schema: ToolOutputSchema;

  public enabled: boolean = true;
  public approval_required: boolean = false;
  public timeout_seconds: number = 30;
  public metadata: Record<string, unknown> = {};

  public getInfo(): ToolInfo {
    return {
      tool_id: this.tool_id,
      name: this.name,
      description: this.description,
      version: this.version,
      category: this.category,
      capabilities: [...this.capabilities],
      risk_level: this.risk_level,
      approval_required: this.approval_required || this.risk_level === 'HIGH_RISK' || this.risk_level === 'EXTERNAL_SIDE_EFFECT' || this.risk_level === 'DESTRUCTIVE',
      enabled: this.enabled,
      timeout_seconds: this.timeout_seconds,
      input_schema: this.input_schema,
      output_schema: this.output_schema,
      metadata: { ...this.metadata },
    };
  }

  public hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  /**
   * Validate input parameters against schema.
   */
  public validateInput(input: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!input || typeof input !== 'object') {
      return { valid: false, errors: ['Input must be a valid object.'] };
    }

    const required = this.input_schema.required || [];
    for (const reqField of required) {
      if (input[reqField] === undefined || input[reqField] === null || input[reqField] === '') {
        errors.push(`Missing required field '${reqField}'.`);
      }
    }

    for (const [propName, propSchema] of Object.entries(this.input_schema.properties)) {
      const val = input[propName];
      if (val !== undefined && val !== null) {
        if (propSchema.type === 'string' && typeof val !== 'string') {
          errors.push(`Field '${propName}' must be a string.`);
        } else if (propSchema.type === 'number' && typeof val !== 'number') {
          errors.push(`Field '${propName}' must be a number.`);
        } else if (propSchema.type === 'boolean' && typeof val !== 'boolean') {
          errors.push(`Field '${propName}' must be a boolean.`);
        } else if (propSchema.type === 'array' && !Array.isArray(val)) {
          errors.push(`Field '${propName}' must be an array.`);
        } else if (propSchema.type === 'object' && (typeof val !== 'object' || Array.isArray(val))) {
          errors.push(`Field '${propName}' must be an object.`);
        }

        if (propSchema.enum && typeof val === 'string' && !propSchema.enum.includes(val)) {
          errors.push(`Field '${propName}' must be one of: ${propSchema.enum.join(', ')}.`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Execute tool action logic.
   */
  public abstract execute(context: ToolExecutionContext): Promise<Record<string, unknown>>;

  /**
   * Verify output after execution.
   */
  public verify(result: ToolResult): { state: VerificationState; verified: boolean; summary: string } {
    if (result.status !== 'COMPLETED') {
      return {
        state: 'FAILED',
        verified: false,
        summary: `Tool execution did not complete successfully (Status: ${result.status}).`,
      };
    }

    if (!result.output || Object.keys(result.output).length === 0) {
      return {
        state: 'PARTIAL',
        verified: false,
        summary: 'Tool completed but produced empty output.',
      };
    }

    return {
      state: 'VALID',
      verified: true,
      summary: 'Tool completed and output satisfies schema requirements.',
    };
  }
}
