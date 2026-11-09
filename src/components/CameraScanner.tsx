import { useRef } from "react";
import Modal from "./Modal";
import { useBarcodeCamera } from "../lib/useBarcodeCamera";

/** A pop-up that reads one barcode with the camera (used when adding a product). */
export default function CameraScanner({ title, onDetected, onClose }: { title: string; onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, error } = useBarcodeCamera(videoRef, onDetected);

  return (
    <Modal title={title} subtitle="Hold the barcode inside the frame" onClose={onClose}>
      <div className="p-5 flex flex-col gap-3">
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-scan">
          <video ref={videoRef} muted playsInline className="w-full h-full object-cover" aria-label="Camera view" />
          {state === "on" && <div className="absolute left-[12%] right-[12%] top-1/2 h-0.5 bg-coral" aria-hidden="true" />}
          {state === "starting" && <p className="absolute inset-0 flex items-center justify-center text-sm text-white">Starting the camera…</p>}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
