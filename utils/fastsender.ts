
export const sendFileFast = async (
  file: File,
  peer: any,
  onProgress: (progress: number) => void,
  onComplete: () => void
) => {
  const CHUNK_SIZE = 64 * 1024; 
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  
  // 1. Let the receiver know exactly how many chunks to expect
  peer.send(
    JSON.stringify({
      info: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      totalChunks: totalChunks 
    })
  );

  // 2. The Framed Binary Pump
  const sendChunks = async (chunkIdsToSend: number[]) => {
    for (let i = 0; i < chunkIdsToSend.length; i++) {
      const chunkId = chunkIdsToSend[i];
      const offset = chunkId * CHUNK_SIZE;
      
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();

      // 🔥 BINARY FRAMING: Allocate 4 extra bytes for the Header
      const payload = new Uint8Array(4 + buffer.byteLength);
      const view = new DataView(payload.buffer);
      
      // Write the chunkId into the first 4 bytes
      view.setUint32(0, chunkId, true); 
      // Copy the raw file data starting at byte 4
      payload.set(new Uint8Array(buffer), 4); 

      const canContinue = peer.send(payload);
      onProgress(Math.min(100, Math.floor(((chunkId + 1) / totalChunks) * 100)));

      // Backpressure Check
      if (!canContinue) {
        await new Promise((resolve) => peer.once("drain", resolve));
      }
    }
  };

  // 3. Ignite the initial blast
  const initialChunks = Array.from({ length: totalChunks }, (_, i) => i);
  await sendChunks(initialChunks);

  // 4. Trigger the Integrity Audit
  peer.send(JSON.stringify({ check_missing: true }));

  // 5. Listen for NACKs (Missing Chunks)
  peer.on("data", async (data: any) => {
    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        if (parsed.request_retries) {
          // Receiver found holes. Resend only the missing chunks.
          await sendChunks(parsed.missingIds);
          peer.send(JSON.stringify({ check_missing: true }));
        } else if (parsed.transfer_complete) {
          onComplete();
        }
      } catch (e) {}
    }
  });
};
