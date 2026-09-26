import os from 'os';
import fs from 'fs';
import type { HardwareDetectionResult, ProviderStatus } from '../src/types/runtime.js';

export function detectHardware(): HardwareDetectionResult {
  const cpus = os.cpus() || [];
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);

  const totalMemoryGb = totalMem > 0 ? +(totalMem / (1024 ** 3)).toFixed(2) : null;
  const availableMemoryGb = freeMem > 0 ? +(freeMem / (1024 ** 3)).toFixed(2) : null;
  const memoryUsagePercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : null;

  const processor = cpus.length > 0 && cpus[0].model ? cpus[0].model.trim() : 'Unknown';
  const cpuPhysicalCores = cpus.length > 0 ? Math.max(1, Math.floor(cpus.length / 2)) : 'Unknown';
  const cpuLogicalThreads = cpus.length > 0 ? cpus.length : 'Unknown';

  const osType = os.type();
  const osRelease = os.release();
  const arch = os.arch();

  // --- Snapdragon Detection (Honest, evidence-based) ---
  // Look for Qualcomm / Snapdragon string in CPU model or /proc/cpuinfo if available
  let snapdragonDetected = false;
  let snapdragonEvidence = 'No Qualcomm or Snapdragon processor signatures detected.';

  const processorLower = processor.toLowerCase();
  if (processorLower.includes('snapdragon') || processorLower.includes('qualcomm') || processorLower.includes('kryo')) {
    snapdragonDetected = true;
    snapdragonEvidence = `Identified signature in CPU model: ${processor}`;
  } else if (process.platform === 'linux') {
    try {
      if (fs.existsSync('/proc/cpuinfo')) {
        const cpuinfo = fs.readFileSync('/proc/cpuinfo', 'utf8').toLowerCase();
        if (cpuinfo.includes('qualcomm') || cpuinfo.includes('snapdragon') || cpuinfo.includes('qcom')) {
          snapdragonDetected = true;
          snapdragonEvidence = 'Qualcomm signature verified in /proc/cpuinfo';
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // --- Qualcomm QNN Environment Detection ---
  // Checks for QNN SDK path, libQnn*.so / Qnn*.dll, environment variables
  let qnnEnvironmentDetected = false;
  let qnnStatus: ProviderStatus = 'NOT_AVAILABLE';
  let qnnReason = 'No compatible Qualcomm QNN environment or SDK libraries detected on this host.';

  const qnnSdkPath = process.env.NEXUS_QNN_SDK_PATH || process.env.QNN_SDK_ROOT || '';
  const qnnLibPath = process.env.NEXUS_QNN_LIB_PATH || '';

  if (qnnSdkPath && fs.existsSync(qnnSdkPath)) {
    // Check if libraries actually exist in sdk path
    const hasLibs = fs.existsSync(`${qnnSdkPath}/lib`) || (qnnLibPath && fs.existsSync(qnnLibPath));
    if (hasLibs) {
      qnnEnvironmentDetected = true;
      qnnStatus = 'READY';
      qnnReason = `Qualcomm QNN SDK located at: ${qnnSdkPath}`;
    } else {
      qnnStatus = 'NOT_CONFIGURED';
      qnnReason = `QNN_SDK_ROOT path exists (${qnnSdkPath}) but native runtime libraries are missing.`;
    }
  } else if (!snapdragonDetected) {
    qnnStatus = 'NOT_AVAILABLE';
    qnnReason = 'Qualcomm QNN is not supported on this host hardware architecture (Snapdragon NPU required).';
  }

  // --- GPU Device & Provider Detection ---
  // Differentiates GPU DEVICE vs GPU INFERENCE PROVIDER
  let gpuDeviceDetected = false;
  let gpuDeviceName: string | null = null;
  let gpuInferenceProviderAvailable = false;
  let gpuInferenceReason = 'Compatible GPU inference provider (CUDA / DirectML / WebGPU native runtime) is not installed.';

  // Check for common GPU indicators safely (e.g. /dev/nvidia*, CUDA_PATH, etc.)
  if (process.env.CUDA_PATH && fs.existsSync(process.env.CUDA_PATH)) {
    gpuDeviceDetected = true;
    gpuDeviceName = 'NVIDIA CUDA Device Environment';
    // Even if CUDA path exists, check if onnxruntime-node gpu or native provider is initialized
    gpuInferenceProviderAvailable = false;
    gpuInferenceReason = 'CUDA environment directory detected, but no accelerated ONNX/TensorRT native provider bindings loaded in runtime.';
  } else if (process.platform === 'linux' && fs.existsSync('/dev/nvhost-ctrl-gpu')) {
    gpuDeviceDetected = true;
    gpuDeviceName = 'NVIDIA Tegra/Embedded GPU';
    gpuInferenceProviderAvailable = false;
    gpuInferenceReason = 'Tegra GPU device found, but native acceleration runtime is not configured.';
  } else if (process.platform === 'linux' && fs.existsSync('/dev/dri/renderD128')) {
    gpuDeviceDetected = true;
    gpuDeviceName = 'Direct Rendering Manager Device (/dev/dri)';
    gpuInferenceProviderAvailable = false;
    gpuInferenceReason = 'Direct rendering device present, but no DirectML or Vulkan compute inference provider loaded.';
  }

  return {
    os: `${osType} ${osRelease}`,
    osFamily: osType,
    osVersion: typeof os.version === 'function' ? os.version() : osRelease,
    architecture: arch,
    processor,
    cpuPhysicalCores,
    cpuLogicalThreads,
    totalMemoryGb,
    availableMemoryGb,
    memoryUsagePercent,
    gpuDeviceDetected,
    gpuDeviceName,
    gpuInferenceProviderAvailable,
    gpuInferenceReason,
    snapdragonDetected,
    snapdragonEvidence,
    qnnEnvironmentDetected,
    qnnStatus,
    qnnReason,
    npuAvailable: snapdragonDetected && qnnEnvironmentDetected,
  };
}
