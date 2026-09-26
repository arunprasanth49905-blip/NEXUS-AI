/**
 * NEXUS-AI Phase 3 Multimodal Perception Service
 * Handles browser permissions, hardware device capture, push-to-talk speech recognition, and context dispatch.
 */

import { api } from './api';
import type { 
  NexusContextObject, 
  PerceptionStatusResponse, 
  ScreenCaptureRequest, 
  CameraCaptureRequest, 
  VoiceTranscriptionRequest,
  UnifiedMultimodalContext
} from '../types';

export const fallbackPerceptionStatus: PerceptionStatusResponse = {
  modalities: {
    text: { available: true, status: 'READY' },
    screen: { available: true, status: 'READY' },
    camera: { available: true, status: 'READY' },
    voice: { available: true, status: 'READY' },
    document: { available: true, status: 'READY' },
  },
  providers: {
    ocr: { 
      available: false, 
      status: 'NOT_AVAILABLE', 
      engine: 'Local Pattern / Structural Header Inspector',
      reason: 'OCR provider not installed; image dimensions inspected without fabricated text.' 
    },
    vision: { 
      available: true, 
      status: 'READY', 
      engine: 'Header & Structural Frame Inspector' 
    },
    speech: { 
      available: true, 
      status: 'READY', 
      engine: 'Browser Native SpeechRecognition' 
    },
  },
  privacy_guard: {
    active: true,
    enforce_zero_raw_retention: true,
    max_document_size_mb: 25,
  },
};

export class PerceptionService {
  /**
   * Fetches live perception engine status from backend or fallback
   */
  public static async fetchStatus(): Promise<PerceptionStatusResponse> {
    try {
      return await api.getPerceptionStatus();
    } catch {
      return fallbackPerceptionStatus;
    }
  }

  /**
   * Explicit Screen Capture: Triggers native getDisplayMedia prompt
   * Captures exactly ONE frame, extracts image data, and immediately stops media tracks
   */
  public static async captureScreen(): Promise<NexusContextObject> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Screen capture is not supported on this browser.');
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video stream acquired from display media.');
      }

      // Render single frame to an offscreen canvas
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize frame context.');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/png', 0.85);

      // Stop tracks immediately (Zero continuous recording)
      videoTrack.stop();
      stream.getTracks().forEach((t) => t.stop());

      const payload: ScreenCaptureRequest = {
        image_data_base64: base64Data,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date().toISOString(),
      };

      const res = await api.submitScreenCapture(payload);
      return res.context;
    } catch (err: unknown) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Screen sharing permission was denied or cancelled.');
        }
        throw new Error(err.message);
      }
      throw new Error('Screen capture could not be initialized.');
    }
  }

  /**
   * Explicit Camera Snapshot: Grabs a single camera frame from an active stream or prompts user
   */
  public static async captureCameraSnapshot(activeStream?: MediaStream): Promise<NexusContextObject> {
    let localStream: MediaStream | null = activeStream || null;
    let shouldCloseStream = false;

    try {
      if (!localStream) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this browser.');
        }
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        shouldCloseStream = true;
      }

      const video = document.createElement('video');
      video.srcObject = localStream;
      video.muted = true;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context.');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Data = canvas.toDataURL('image/jpeg', 0.85);

      if (shouldCloseStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }

      const payload: CameraCaptureRequest = {
        image_data_base64: base64Data,
        width: canvas.width,
        height: canvas.height,
        timestamp: new Date().toISOString(),
      };

      const res = await api.submitCameraCapture(payload);
      return res.context;
    } catch (err: unknown) {
      if (shouldCloseStream && localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Camera permission was denied. Please allow camera access in browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error('No camera hardware was detected on this device.');
        } else if (err.name === 'NotReadableError') {
          throw new Error('Camera could not be accessed. Another application may be using it.');
        }
        throw new Error(err.message);
      }
      throw new Error('Camera capture failed.');
    }
  }

  /**
   * Document Perception Upload: Validates file and dispatches for server-side structure & text extraction
   */
  public static async uploadDocument(file: File): Promise<NexusContextObject> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await api.submitDocument({
            filename: file.name,
            base64_data: base64Data,
            mime_type: file.type || undefined,
          });
          resolve(res.context);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Voice Transcription: Submits transcribed speech prompt to the perception engine
   */
  public static async submitVoiceTranscript(transcript: string, durationSeconds?: number): Promise<NexusContextObject> {
    const payload: VoiceTranscriptionRequest = {
      transcript,
      duration_seconds: durationSeconds,
      speech_engine: 'Browser Native SpeechRecognition',
    };
    const res = await api.submitVoiceTranscript(payload);
    return res.context;
  }

  /**
   * Merges multiple active perception contexts into unified multimodal context
   */
  public static async mergeContexts(contextIds: string[], query?: string): Promise<UnifiedMultimodalContext> {
    const res = await api.mergePerceptionContexts(contextIds, query);
    return res.unified_context;
  }
}
