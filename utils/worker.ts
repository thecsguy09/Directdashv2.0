let chunks: Uint8Array[] = [];
let totalExpectedChunks = 0;
let receivedCount = 0;
let fileMimeType = "application/octet-stream";
let currentTransferId: number | null = null; 

self.addEventListener("message", (event) => {
  const data = event.data;

  if (data.type === "info") {
    currentTransferId = data.transferId;
    totalExpectedChunks = data.totalChunks;
    fileMimeType = data.fileType || "application/octet-stream";
    chunks = new Array(totalExpectedChunks);
    receivedCount = 0;
  } 
  else if (data.type === "chunk") {
    const payload = data.chunk as Uint8Array;
    
    // Safe DataView bound to exact offset and length
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    
    const transferId = view.getUint32(0, true);
    const chunkId = view.getUint32(4, true);
    
    if (transferId !== currentTransferId) return;
    
    if (!chunks[chunkId]) {
      chunks[chunkId] = payload.slice(8); 
      receivedCount++;
      
      const progress = Math.floor((receivedCount / totalExpectedChunks) * 100);
      self.postMessage({ progress });
    }
  } 
  else if (data.type === "check_missing") {
    if (receivedCount === totalExpectedChunks) {
      const blob = new Blob(chunks, { type: fileMimeType });
      self.postMessage({ blob: blob });
      chunks.length = 0; // Free memory instantly
    } else {
      const missingIds = [];
      for (let i = 0; i < totalExpectedChunks; i++) {
        if (!chunks[i]) missingIds.push(i);
      }
      self.postMessage({ type: "request_retries", missingIds });
    }
  }
  else if (data.type === "reset") {
    chunks.length = 0;
    receivedCount = 0;
    currentTransferId = null;
  }
});
