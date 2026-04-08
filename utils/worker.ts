let chunks: Uint8Array[] = [];
let totalExpectedChunks = 0;
let receivedCount = 0;
let fileMimeType = "application/octet-stream";

self.addEventListener("message", (event) => {
  const data = event.data;

  // 1. Initialize State
  if (data.status === "fileInfo") {
    totalExpectedChunks = data.totalChunks;
    fileMimeType = data.fileType || fileMimeType;
    chunks = new Array(totalExpectedChunks); // Pre-allocate array slots
    receivedCount = 0;
  } 
  
  // 2. Audit & Assemble
  else if (data === "check_missing") {
    if (receivedCount === totalExpectedChunks) {
      // 100% Integrity Confirmed. Build the file.
      const blob = new Blob(chunks, { type: fileMimeType });
      self.postMessage({ blob: blob });
      chunks = []; // Free memory
    } else {
      // Find holes in the array and NACK the sender
      const missingIds = [];
      for (let i = 0; i < totalExpectedChunks; i++) {
        if (!chunks[i]) missingIds.push(i);
      }
      self.postMessage({ request_retries: true, missingIds });
    }
  } 
  
  // 3. Unpack Binary Frames
  else if (data.chunk) {
    const payload = data.chunk as Uint8Array;
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    
    // Read the Chunk ID from the first 4 bytes
    const chunkId = view.getUint32(0, true);
    
    // Prevent double-counting if a chunk arrives twice during a retry storm
    if (!chunks[chunkId]) {
      // Slice out the 4-byte header to get the pure file data
      chunks[chunkId] = payload.slice(4); 
      receivedCount++;
      
      const progress = Math.floor((receivedCount / totalExpectedChunks) * 100);
      self.postMessage({ progress });
    }
  }
});
