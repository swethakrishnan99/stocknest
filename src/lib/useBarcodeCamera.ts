import { useEffect, useRef, useState, type RefObject } from "react";

// Reads barcodes from the camera. Uses the browser's own barcode detector where there is one
// (Chrome on Android, Safari on newer iPhones) and the ZXing library everywhere else.

interface NativeDetector {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorConstructor = new (options: { formats: string[] }) => NativeDetector;

const FORMATS = ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39", "qr_code", "itf"];

export type CameraState = "starting" | "on" | "error";

function cameraError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access is off. Allow the camera for this site in your browser settings, or type the code instead.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device. Type the code instead.";
  if (name === "NotReadableError") return "The camera is being used by another app. Close it and try again.";
  return "The camera couldn't start. Type the code instead.";
}

/**
 * Shows the back camera in `videoRef` and calls `onDetected` with each new code it reads
 * (the same code isn't reported twice in a row within 2 seconds).
 */
export function useBarcodeCamera(videoRef: RefObject<HTMLVideoElement | null>, onDetected: (code: string) => void, enabled = true) {
  const [state, setState] = useState<CameraState>("starting");
  const [error, setError] = useState("");
  const [torch, setTorchState] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const callback = useRef(onDetected);
  useEffect(() => {
    callback.current = onDetected;
  });

  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    let stopped = false;
    let stream: MediaStream | null = null;
    let stopZxing: (() => void) | null = null;
    let last = { code: "", at: 0 };

    const report = (code: string) => {
      const now = Date.now();
      if (code === last.code && now - last.at < 2000) return;
      last = { code, at: now };
      callback.current(code);
    };

    async function start() {
      if (!video) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("error");
        setError(window.isSecureContext ? "This browser can't use the camera. Type the code instead." : "The camera only works on a secure (https) page. Type the code instead.");
        return;
      }
      setState("starting");
      try {
        const Native = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play().catch(() => {});
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorchState({ supported: !!caps.torch, on: false });
        setState("on");

        if (Native) {
          const detector = new Native({ formats: FORMATS });
          const tick = async () => {
            if (stopped) return;
            try {
              const found = await detector.detect(video);
              if (found[0]?.rawValue) report(found[0].rawValue);
            } catch {
              // a frame that can't be read; try the next one
            }
            window.setTimeout(tick, 150);
          };
          tick();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          if (stopped) return;
          const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 600 });
          const controls = await reader.decodeFromStream(stream, video, (result) => {
            if (result) report(result.getText());
          });
          stopZxing = () => controls.stop();
          if (stopped) stopZxing();
        }
      } catch (err) {
        if (stopped) return;
        setState("error");
        setError(cameraError(err));
      }
    }

    start();
    return () => {
      stopped = true;
      stopZxing?.();
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [videoRef, enabled]);

  const setTorch = async (on: boolean) => {
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      setTorchState((t) => ({ ...t, on }));
    } catch {
      setTorchState({ supported: false, on: false });
    }
  };

  return { state, error, torch, setTorch };
}
