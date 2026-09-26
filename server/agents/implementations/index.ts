/**
 * NEXUS-AI Phase 5: Agent Implementations Export & Factory
 */

import { AgentRegistry } from '../registry.js';
import type { RuntimeManager } from '../../manager.js';
import { KnowledgeAgent } from './knowledge.js';
import { ProductivityAgent } from './productivity.js';
import { StudyAgent } from './study.js';
import { VisionAgent } from './vision.js';
import { DocumentAgent } from './document.js';
import { DebugAgent } from './debug.js';
import { ResearchAgent } from './research.js';

export {
  KnowledgeAgent,
  ProductivityAgent,
  StudyAgent,
  VisionAgent,
  DocumentAgent,
  DebugAgent,
  ResearchAgent,
};

export function registerDefaultAgents(registry: AgentRegistry, runtimeManager?: RuntimeManager): void {
  registry.register(new KnowledgeAgent(runtimeManager));
  registry.register(new ProductivityAgent(runtimeManager));
  registry.register(new StudyAgent(runtimeManager));
  registry.register(new VisionAgent());
  registry.register(new DocumentAgent(runtimeManager));
  registry.register(new DebugAgent(runtimeManager));
  registry.register(new ResearchAgent(runtimeManager));
}
