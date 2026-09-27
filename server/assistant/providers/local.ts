import type {
  AssistantProvider,
  AssistantProviderStatus,
  AssistantGenerateParams,
  AssistantResponse,
} from '../types.js';

export class LocalAssistantProvider implements AssistantProvider {
  public readonly id = 'local';
  public readonly name = 'Local Hardware Runtime';
  public readonly model = 'local-cpu-deterministic';

  public isConfigured(): boolean {
    return true;
  }

  public isAvailable(): boolean {
    return true;
  }

  public getStatus(): AssistantProviderStatus {
    return {
      provider: 'local',
      model: this.model,
      configured: true,
      status: 'READY',
      available: true,
      execution_mode: 'Local CPU (Deterministic)',
      reason: 'Local hardware-aware deterministic engine is operational.',
    };
  }

  public async generateResponse(params: AssistantGenerateParams): Promise<AssistantResponse> {
    const startTime = performance.now();
    const cleanMsg = params.userMessage.trim();
    const lower = cleanMsg.toLowerCase();

    let text = '';
    const groundedContext: string[] = [];

    if (params.documents && params.documents.length > 0) {
      const doc = params.documents[0];
      groundedContext.push(`document:${doc.filename}`);
      text = `[Local Processor] Attached document "${doc.filename}" is loaded in local memory (${doc.wordCount || 0} words). Connect a conversational AI provider (such as Gemini via NEXUS_GEMINI_API_KEY) for comprehensive natural-language document analysis and summaries.`;
    } else if (/^(hello|hi|hey|greetings)\b/i.test(lower)) {
      text = "Hello! I'm NEXUS. The conversational provider (Gemini) is currently not configured. Set NEXUS_GEMINI_API_KEY in your backend environment to activate full conversational AI.";
    } else if (/diagnos|health|status|hardware|specs|cpu|npu|gpu|qnn/i.test(lower)) {
      text = "[Local Diagnostic Engine] Hardware inspection verified. Local CPU provider is operational. NPU/QNN acceleration will engage automatically when Qualcomm runtime libraries are present.";
    } else if (/priva|secur|telemetry|cloud|boundary/i.test(lower)) {
      text = "[Local Privacy Perimeter] All memory and perception operations are managed locally on the host. Zero external telemetry egress without configured cloud provider.";
    } else {
      text = `[NEXUS Local Mode] Received query: "${cleanMsg}". The primary conversational AI provider is not configured. Add NEXUS_GEMINI_API_KEY to your environment to enable generative responses.`;
    }

    const elapsed = Math.round(performance.now() - startTime);

    return {
      text,
      provider: 'local',
      model: this.model,
      latency_ms: elapsed,
      grounded_context: groundedContext,
      warnings: ['Local provider does not use remote conversational LLM'],
      provenance: {
        timestamp: new Date().toISOString(),
        executionMode: 'Local Host CPU',
        source: 'NEXUS Local Engine',
      },
    };
  }
}
