/**
 * NEXUS-AI Phase 6: Tool Registry
 * Dynamic source of truth for all registered tools.
 */

import type { BaseTool } from './base.js';
import type { ToolCategory, ToolInfo } from './types.js';

export class ToolRegistry {
  private static instance: ToolRegistry | null = null;
  private tools: Map<string, BaseTool> = new Map();

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  public static resetInstance(): void {
    ToolRegistry.instance = null;
  }

  public register(tool: BaseTool): void {
    this.tools.set(tool.tool_id, tool);
  }

  public unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  public get(toolId: string): BaseTool | undefined {
    return this.tools.get(toolId);
  }

  public list(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  public listInfos(): ToolInfo[] {
    return this.list().map((t) => t.getInfo());
  }

  public find_by_capability(capability: string): BaseTool | undefined {
    for (const tool of this.tools.values()) {
      if (tool.enabled && tool.hasCapability(capability)) {
        return tool;
      }
    }
    return undefined;
  }

  public find_all_by_capability(capability: string): BaseTool[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.enabled && t.hasCapability(capability)
    );
  }

  public find_by_category(category: ToolCategory): BaseTool[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.enabled && t.category === category
    );
  }

  public getRegisteredCount(): number {
    return this.tools.size;
  }

  public getEnabledCount(): number {
    return Array.from(this.tools.values()).filter((t) => t.enabled).length;
  }

  public clear(): void {
    this.tools.clear();
  }
}
