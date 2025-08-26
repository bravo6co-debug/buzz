import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Camera, Flashlight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  onScanError?: (error: string) => void;
}

interface CameraDevice {
  id: string;
  label: string;
}

export function QRScanner({ isOpen, onClose, onScanSuccess, onScanError }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
      getCameras();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          id: device.deviceId,
          label: device.label || `카메라 ${device.deviceId.slice(0, 8)}`
        }));
      
      setCameras(videoDevices);
      
      if (videoDevices.length > 0 && !selectedCameraId) {
        // 후면 카메라를 우선적으로 선택
        const backCamera = videoDevices.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear')
        );
        setSelectedCameraId(backCamera?.id || videoDevices[0].id);
      }
    } catch (error) {
      console.error('카메라 목록을 가져올 수 없습니다:', error);
      setError('카메라 접근 권한이 필요합니다.');
    }
  };

  const initializeScanner = () => {
    if (!scannerElementRef.current || isScanning) return;

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: selectedCameraId ? {
        deviceId: selectedCameraId,
        facingMode: undefined
      } : {
        facingMode: 'environment'
      }
    };

    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      config,
      false // verbose
    );

    scannerRef.current.render(
      (decodedText) => {
        setIsScanning(false);
        onScanSuccess(decodedText);
        stopScanner();
      },
      (error) => {
        // QR 스캔 오류는 일반적이므로 로그만 남기고 UI에는 표시하지 않음
        if (onScanError && !error.includes('No MultiFormat Readers')) {
          onScanError(error);
        }
      }
    );

    setIsScanning(true);
    setError('');
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
          scannerRef.current.clear();
        }
      } catch (error) {
        console.error('스캐너 정리 중 오류:', error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setIsFlashlightOn(false);
  };

  const toggleFlashlight = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          deviceId: selectedCameraId,
          advanced: [{ torch: !isFlashlightOn } as any]
        }
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        setHasFlashlight(true);
        await track.applyConstraints({
          advanced: [{ torch: !isFlashlightOn }]
        });
        setIsFlashlightOn(!isFlashlightOn);
      }
      
      track.stop();
    } catch (error) {
      console.error('플래시 제어 오류:', error);
    }
  };

  const switchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(camera => camera.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIndex].id);
      
      // 스캐너 재시작
      stopScanner();
      setTimeout(() => {
        if (isOpen) {
          initializeScanner();
        }
      }, 100);
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto p-0 bg-black">
        <DialogHeader className="p-4 bg-white">
          <DialogTitle className="flex items-center justify-between">
            <span>QR 코드 스캔</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {error ? (
            <Card className="m-4">
              <CardContent className="p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => {
                  setError('');
                  getCameras();
                }}>
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div 
                ref={scannerElementRef}
                id="qr-reader"
                className="qr-scanner-container"
                style={{ width: '100%', minHeight: '400px' }}
              />

              {/* 스캔 오버레이 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="qr-scanner-frame">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white"></div>
                </div>
              </div>

              {/* 컨트롤 버튼들 */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
                {hasFlashlight && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleFlashlight}
                    className={cn(
                      "rounded-full bg-white/20 backdrop-blur-sm",
                      isFlashlightOn && "bg-yellow-500/50"
                    )}
                  >
                    <Flashlight className="h-5 w-5 text-white" />
                  </Button>
                )}

                {cameras.length > 1 && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={switchCamera}
                    className="rounded-full bg-white/20 backdrop-blur-sm"
                  >
                    <RotateCcw className="h-5 w-5 text-white" />
                  </Button>
                )}
              </div>

              {/* 안내 문구 */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                  QR 코드를 화면 중앙에 맞춰주세요
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}