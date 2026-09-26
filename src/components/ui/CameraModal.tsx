import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera as CameraIcon, 
  X, 
  Play, 
  Square, 
  Camera, 
  AlertTriangle 
} from 'lucide-react';
import { Button } from './Button';
import { PerceptionService } from '../../services/perception';
import type { NexusContextObject } from '../../types';
import './CameraModal.css';

export interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureSuccess: (context: NexusContextObject) => void;
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCaptureSuccess,
  onAddToast,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'STOPPED' | 'READY' | 'ACTIVE' | 'ERROR'>('STOPPED');
  const [statusMessage, setStatusMessage] = useState<string>('Camera is idle. Click "Start Camera" to initialize.');
  const [isCapturing, setIsCapturing] = useState(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('STOPPED');
    setStatusMessage('Camera stream stopped. Zero background capture.');
  }, [stream]);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, stream]);

  const startCamera = async () => {
    setStatusMessage('Requesting camera permission from browser...');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setCameraStatus('ACTIVE');
      setStatusMessage('Camera is ACTIVE. Click "Capture Frame" to snapshot this view.');
      onAddToast('Camera Active', 'Stream is active locally. No frames sent to cloud.', 'info');
    } catch (err: unknown) {
      setCameraStatus('ERROR');
      const msg = err instanceof Error ? err.message : 'Camera could not be accessed.';
      setStatusMessage(msg);
      onAddToast('Camera Access Error', msg, 'error');
    }
  };

  const handleCaptureFrame = async () => {
    if (!stream) {
      onAddToast('No Stream', 'Start the camera before capturing.', 'warning');
      return;
    }

    setIsCapturing(true);
    try {
      const context = await PerceptionService.captureCameraSnapshot(stream);
      onAddToast('Frame Captured', 'Visual context generated and attached.', 'success');
      onCaptureSuccess(context);
      stopCamera();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Capture failed';
      onAddToast('Snapshot Error', msg, 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="nexus-camera-modal-backdrop" role="dialog" aria-modal="true" aria-label="Camera Perception">
      <div className="nexus-camera-modal animate-fade-in">
        <div className="nexus-camera-header">
          <div className="nexus-camera-title-wrap">
            <CameraIcon size={18} className="text-cyan" />
            <h2 className="nexus-camera-title">CAMERA PERCEPTION</h2>
          </div>
          <button
            type="button"
            className="nexus-camera-close-btn"
            onClick={() => { stopCamera(); onClose(); }}
            aria-label="Close camera modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Preview Viewport */}
        <div className="nexus-camera-viewport">
          <video
            ref={videoRef}
            className={`nexus-camera-video ${cameraStatus === 'ACTIVE' ? 'nexus-video-visible' : 'nexus-video-hidden'}`}
            autoPlay
            playsInline
            muted
          />

          {cameraStatus !== 'ACTIVE' && (
            <div className="nexus-camera-empty-overlay">
              <Camera size={42} className="text-tertiary" />
              <p className="nexus-camera-overlay-text">{statusMessage}</p>
            </div>
          )}

          {cameraStatus === 'ACTIVE' && (
            <div className="nexus-camera-badge">
              <span className="nexus-camera-badge-dot animate-pulse-subtle" />
              <span>LIVE PREVIEW (ON-DEMAND)</span>
            </div>
          )}
        </div>

        {/* Privacy Note */}
        <div className="nexus-camera-privacy-note">
          <AlertTriangle size={13} className="text-amber flex-shrink-0" />
          <span>
            <strong>Privacy Guard Active:</strong> Camera frames are processed strictly on demand. No video is permanently recorded or sent to cloud servers.
          </span>
        </div>

        {/* Control Actions */}
        <div className="nexus-camera-actions">
          {cameraStatus === 'ACTIVE' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Square size={13} />}
                onClick={stopCamera}
              >
                Stop Camera
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isCapturing}
                leftIcon={<Camera size={14} />}
                onClick={handleCaptureFrame}
              >
                Capture Frame
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { stopCamera(); onClose(); }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Play size={14} />}
                onClick={startCamera}
              >
                Start Camera
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
