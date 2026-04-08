let chunks:any = [];
let startTime:any;
let fileSize;
let chunkSize = 16000; // default, will be overwritten by sender
let currentChunk = 0;
let totalChunks:any;
let prevProgress = 0;

self.addEventListener("message", (event) => {
  if (event.data.status === "fileInfo") {
    fileSize = event.data.fileSize;
    // Dynamically get the exact chunk size from the sender to fix the math!
    chunkSize = event.data.chunkSize || 16000; 
    totalChunks = Math.ceil(fileSize / chunkSize);
  } else if (event.data === "download") {
    const blob = new Blob(chunks, { type: "application/octet-stream" });
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;

    self.postMessage({
      blob: blob,
      timeTaken: elapsedTime,
    });

    // Reset everything for the next file transfer
    chunks = [];
    currentChunk = 0;
    prevProgress = 0; 
    startTime = null;
  } else {
    if (!startTime) {
      startTime = performance.now();
    }

    chunks.push(new Uint8Array(event.data));

    currentChunk++;
    const progress = (currentChunk / totalChunks) * 100;

    // Cap at 100 and only send updates when the integer changes to save performance
    const roundedProgress = Math.min(100, Math.floor(progress));
    if (roundedProgress !== prevProgress) {
      prevProgress = roundedProgress;
      self.postMessage({
        progress: prevProgress,
      });
    }
  }
});