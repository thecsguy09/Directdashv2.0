import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

const CHUNK_SIZE = 64 * 1024; // 64KB

export const useFileTransfer = () => {
  const workerRef = useRef<Worker>();
  const outgoingFileRef = useRef<File | null>(null);
  const activePeerRef = useRef<any>(null);
  
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const cancelRef = useRef<boolean>(false);
  const currentTransferIdRef = useRef<number>(0);
  const retryMapRef = useRef<Map<number, number>>(new Map()); 

  const [fileUploadProgress, setfileUploadProgress] = useState(0);
  const [fileDownloadProgress, setfileDownloadProgress] = useState(0);
  const [fileSending, setfileSending] = useState(false);
  const [fileReceiving, setfileReceiving] = useState(false);
  const [fileNameState, setfileNameState] = useState("");
  const [downloadFile, setdownloadFile] = useState<any>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
  }, []);

  const resetWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      toast.error("Transfer stalled or peer disconnected.");
      cancelTransfer();
    }, 15000); 
  }, [clearWatchdog]);

  useEffect(() => {
    workerRef.current = new Worker(new URL("./worker.ts", import.meta.url));
    
    workerRef.current.onmessage = (event) => {
      if (event.data.progress) {
        setfileDownloadProgress(event.data.progress);
        resetWatchdog();
      } 
      else if (event.data.blob) {
        clearWatchdog();
        setdownloadFile(event.data.blob);
        setfileDownloadProgress(0);
        setfileReceiving(false);
        activePeerRef.current?.write(JSON.stringify({ type: "done" }));
      } 
      else if (event.data.type === "request_retries") {
        activePeerRef.current?.write(JSON.stringify({ 
          type: "request_retries", 
          missingIds: event.data.missingIds 
        }));
      }
    };

    return () => {
      workerRef.current?.terminate();
      clearWatchdog();
    };
  }, [clearWatchdog, resetWatchdog]);

  const cancelTransfer = () => {
    cancelRef.current = true;
    setfileSending(false);
    setfileReceiving(false);
    setdownloadFile(null); 
    clearWatchdog();
    workerRef.current?.postMessage({ type: "reset" }); 
    activePeerRef.current?.write(JSON.stringify({ type: "cancelled" }));
  };

  const sendFile = async (peer: any, file: File) => {
    outgoingFileRef.current = file;
    activePeerRef.current = peer;
    cancelRef.current = false;
    retryMapRef.current.clear();
    
    setfileSending(true);
    setfileUploadProgress(0);

    // Cryptographically secure 32-bit ID
    currentTransferIdRef.current = window.crypto.getRandomValues(new Uint32Array(1))[0];

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    peer.write(JSON.stringify({ 
      type: "info", 
      transferId: currentTransferIdRef.current,
      totalChunks, 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    }));

    const stream = file.stream();
    const reader = stream.getReader();
    
    let chunkId = 0;
    let inFlight = 0;
    const MAX_IN_FLIGHT = 5;
    let pumping = false; 

    const pump = async () => {
      if (pumping || cancelRef.current) return;
      pumping = true;

      while (inFlight < MAX_IN_FLIGHT) {
        if (cancelRef.current) break;

        inFlight++;
        reader.read().then(({ done, value }) => {
          inFlight--;
          if (cancelRef.current) return;

          if (done) {
            if (inFlight === 0) peer.write(JSON.stringify({ type: "check_missing" }));
            return;
          }

          const payload = new Uint8Array(8 + value.byteLength);
          const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
          view.setUint32(0, currentTransferIdRef.current, true);
          view.setUint32(4, chunkId, true);
          payload.set(value, 8);

          const canContinue = peer.write(payload);
          chunkId++;
          setfileUploadProgress(Math.floor((chunkId / totalChunks) * 100));

          if (canContinue) pump();
          else peer.once("drain", pump);
        });
      }
      pumping = false; 
    };
    pump();
  };

  const handleRetries = async (missingIds: number[]) => {
    if (cancelRef.current) return;
    
    const file = outgoingFileRef.current;
    const peer = activePeerRef.current;
    if (!file || !peer) return;

    const BATCH_SIZE = 50; 
    let failedPermanently = false;

    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      if (cancelRef.current) return;
      const batch = missingIds.slice(i, i + BATCH_SIZE);

      for (const id of batch) {
        const retryCount = (retryMapRef.current.get(id) || 0) + 1;
        retryMapRef.current.set(id, retryCount);
        
        if (retryCount > 5) {
          failedPermanently = true;
          continue; 
        }

        const start = id * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        
        const sliceBuffer = await file.slice(start, end).arrayBuffer();
        const rawChunk = new Uint8Array(sliceBuffer);

        const payload = new Uint8Array(8 + rawChunk.byteLength);
        const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
        view.setUint32(0, currentTransferIdRef.current, true);
        view.setUint32(4, id, true);
        payload.set(rawChunk, 8);

        const canContinue = peer.write(payload);
        if (!canContinue) {
          await new Promise(resolve => peer.once("drain", resolve));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 5)); 
    }

    if (failedPermanently) {
      toast.error("Network too unstable. Transfer failed.");
      cancelTransfer();
    } else {
      peer.write(JSON.stringify({ type: "check_missing" }));
    }
  };

  const receiveMeta = (parsedData: any, peer: any) => {
    activePeerRef.current = peer;
    resetWatchdog(); 
    
    if (parsedData.type === "info") {
      setfileNameState(parsedData.fileName);
      setfileReceiving(true);
      workerRef.current?.postMessage({ 
        type: "info", 
        transferId: parsedData.transferId,
        totalChunks: parsedData.totalChunks,
        fileType: parsedData.fileType
      });
    } 
    else if (parsedData.type === "check_missing") {
      workerRef.current?.postMessage({ type: "check_missing" });
    }
    else if (parsedData.type === "request_retries") {
      handleRetries(parsedData.missingIds);
    }
    else if (parsedData.type === "done") {
      setfileUploadProgress(100);
      setfileSending(false);
      clearWatchdog();
      toast.success("File sent successfully!");
    }
    else if (parsedData.type === "cancelled") {
      clearWatchdog();
      setfileSending(false);
      setfileReceiving(false);
      setdownloadFile(null); 
      workerRef.current?.postMessage({ type: "reset" });
      toast.error("Peer cancelled the transfer");
    }
  };

  const receiveChunk = (data: any) => {
    if (!fileReceiving) setfileReceiving(true);
    resetWatchdog(); 
    
    // Safely extract buffer for web worker transfer
    const buffer = data instanceof Uint8Array ? data.buffer : data;
    workerRef.current?.postMessage({ type: "chunk", chunk: data }, [buffer]);
  };

  const resetDownload = () => setdownloadFile(null);

  return { sendFile, receiveMeta, receiveChunk, cancelTransfer, fileUploadProgress, fileDownloadProgress, fileSending, fileReceiving, fileNameState, downloadFile, resetDownload };
};
