let chunks: any = [];
let startTime: any;
let fileSize: number;
let chunkSize = 64000;
let currentChunk = 0;
let totalChunks: any;
let prevProgress = 0;

self.addEventListener("message", (event) => {
  if (event.data.status === "fileInfo") {
    fileSize = event.data.fileSize;
    chunkSize = event.data.chunkSize || 64000; 
    totalChunks = Math.ceil(fileSize / chunkSize);
  } 
  else if (event.data === "download") {
    const blob = new Blob(chunks, { type: "application/octet-stream" });
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;

    self.postMessage({
      blob: blob,
      timeTaken: elapsedTime,
    });

    chunks = [];
    currentChunk = 0;
    prevProgress = 0; 
    startTime = null;
  } 
  else {
    if (!startTime) {
      startTime = performance.now();
    }

    // ULTIMATE ZERO-COPY: Push the memory pointer directly into the array.
    chunks.push(event.data);

    currentChunk++;
    const progress = (currentChunk / totalChunks) * 100;

    const roundedProgress = Math.min(100, Math.floor(progress));
    if (roundedProgress !== prevProgress) {
      prevProgress = roundedProgress;
      self.postMessage({
        progress: prevProgress,
      });
    }
  }
});