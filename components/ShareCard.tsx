"use client";
import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Check, CopyIcon, Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { useSocket } from "@/context/SocketProvider";
import toast from "react-hot-toast";
import { TailSpin } from "react-loader-spinner";
import Peer from "simple-peer";
import FileUpload from "./FileUpload";
import FileUploadBtn from "./FileUploadBtn";
import FileDownload from "./FileDownload";
import ShareLink from "./ShareLink";
import { useSearchParams } from "next/navigation";
import { useMediaStream } from "../utils/mediaHelper"; 
import { motion } from "framer-motion"; // ✅ Draggable Logic

const ShareCard = () => {
  const userDetails = useSocket();
  const media = useMediaStream(); 
  const [partnerId, setpartnerId] = useState("");
  const [isLoading, setisLoading] = useState(false);
  const [isCopied, setisCopied] = useState(false);
  const [currentConnection, setcurrentConnection] = useState(false);
  const peerRef = useRef<any>();
  const [userId, setuserId] = useState<any>();
  const [signalingData, setsignalingData] = useState<any>();
  const [acceptCaller, setacceptCaller] = useState(false);
  const [terminateCall, setterminateCall] = useState(false);
  const [fileUpload, setfileUpload] = useState<any>();
  const fileInputRef = useRef<any>();
  const [downloadFile, setdownloadFile] = useState<any>();
  const [fileUploadProgress, setfileUploadProgress] = useState<number>(0);
  const [fileDownloadProgress, setfileDownloadProgress] = useState<number>(0);
  const [fileNameState, setfileNameState] = useState<any>();
  const [fileSending, setfileSending] = useState(false);
  const [fileReceiving, setfileReceiving] = useState(false);
  const searchParams = useSearchParams();

  const workerRef = useRef<Worker>();
  const isDisconnecting = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const constraintsRef = useRef(null); // ✅ For dynamic drag constraints

  // --- NAVIGATION PROTECTION ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentConnection) {
        e.preventDefault();
        e.returnValue = ""; 
      }
    };
    const handlePopState = () => {
      if (currentConnection) {
        const confirmLeave = window.confirm("Leave call and break connection?");
        if (!confirmLeave) window.history.pushState(null, "", window.location.pathname);
        else handleTerminate(true);
      }
    };
    if (currentConnection) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.history.pushState(null, "", window.location.pathname);
      window.addEventListener("popstate", handlePopState);
    }
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [currentConnection]);

  // --- TERMINATION HANDLER (Handshake Logic) ---
  const handleTerminate = (shouldSendSignal = true) => {
    if (isDisconnecting.current) return;
    isDisconnecting.current = true;

    if (peerRef.current) {
      if (shouldSendSignal && peerRef.current?.connected) {
        try {
          peerRef.current.send(JSON.stringify({ type: "terminate" }));
        } catch (e) { console.log(e); }
      }
      peerRef.current.destroy();
    }
  };

  useEffect(() => {
    media.getMediaStream();
    workerRef.current = new Worker(new URL("../utils/worker.ts", import.meta.url));
    
    userDetails.socket.on("connect", () => {
      setuserId(userDetails.userId);
      userDetails.socket.emit("details", { socketId: userDetails.socket.id, uniqueId: userDetails.userId });
    });

    if (searchParams.get("code")) setpartnerId(String(searchParams.get("code")));

    userDetails.socket.on("signaling", (data: any) => {
      setacceptCaller(true);
      setsignalingData(data);
      setpartnerId(data.from);
    });

    workerRef.current?.addEventListener("message", (event: any) => {
      if (event.data?.progress) setfileDownloadProgress(Number(event.data.progress));
      else if (event.data?.blob) {
        setdownloadFile(event.data?.blob);
        setfileDownloadProgress(0);
        setfileReceiving(false);
      }
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      peerRef.current?.destroy();
      media.stopMediaStream();
      workerRef.current?.terminate();
      userDetails.socket.off("callAccepted");
      userDetails.socket.off("signaling");
    };
  }, []);

  const callUser = async () => {
    const currentStream = await media.getMediaStream();
    if (!currentStream) { setisLoading(false); return; }

    timeoutRef.current = setTimeout(() => {
      if (!currentConnection) {
        setisLoading(false);
        toast.error("Request timed out");
        if (peerRef.current) peerRef.current.destroy();
      }
    }, 15000); 

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    });
    peerRef.current = peer;
    isDisconnecting.current = false;

    peer.on("stream", (remoteStream) => { media.attachRemoteStream(remoteStream); });

    peer.on("signal", (data) => {
      userDetails.socket.emit("send-signal", { from: userDetails.userId, signalData: data, to: partnerId });
    });

    peer.on("data", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.type === "terminate") { handleTerminate(false); return; }
      if (parsedData.chunk) { setfileReceiving(true); handleReceivingData(parsedData.chunk); }
      else if (parsedData.done) { handleReceivingData(parsedData); toast.success("File received"); }
      else if (parsedData.info) handleReceivingData(parsedData);
    });

    userDetails.socket.off("callAccepted"); 
    userDetails.socket.on("callAccepted", (data: any) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      peer.signal(data.signalData);
      setisLoading(false);
      setcurrentConnection(true);
      setterminateCall(true);
      toast.success(`Connected to ${partnerId}`);
      userDetails.setpeerState(peer);
    });

    peer.on("close", () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setpartnerId("");
      setcurrentConnection(false);
      setterminateCall(false);
      setisLoading(false);
      userDetails.setpeerState(undefined);
      media.stopMediaStream(); 
      toast.error("Connection terminated");
    });
  };

  const acceptUser = async () => {
    const currentStream = await media.getMediaStream();
    if (!currentStream) return;

    const peer = new Peer({ initiator: false, trickle: false, stream: currentStream });
    peerRef.current = peer;
    isDisconnecting.current = false;
    userDetails.setpeerState(peer);

    peer.on("stream", (remoteStream) => { media.attachRemoteStream(remoteStream); });

    peer.on("signal", (data) => {
      userDetails.socket.emit("accept-signal", { signalData: data, to: partnerId });
      setcurrentConnection(true);
      setacceptCaller(false);
      setterminateCall(true);
      toast.success(`Connected to ${partnerId}`);
    });

    peer.on("data", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.type === "terminate") { handleTerminate(false); return; }
      if (parsedData.chunk) { setfileReceiving(true); handleReceivingData(parsedData.chunk); }
      else if (parsedData.done) { handleReceivingData(parsedData); toast.success("File received"); }
      else if (parsedData.info) handleReceivingData(parsedData);
    });

    peer.signal(signalingData.signalData);
    peer.on("close", () => {
      setpartnerId("");
      setcurrentConnection(false);
      setterminateCall(false);
      media.stopMediaStream();
      userDetails.setpeerState(undefined);
    });
  };

  const handleConnectionMaking = () => {
    if (currentConnection) return;
    setisLoading(true);
    if (partnerId && partnerId.length === 10) callUser();
    else { setisLoading(false); toast.error("Invalid Peer ID"); }
  };

  const handleCancelConnection = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setisLoading(false);
    if (peerRef.current) peerRef.current.destroy();
    toast.error("Cancelled");
  };

  const handleFileUploadBtn = () => { fileInputRef.current.click(); };
  const handleFileChange = (e: any) => { setfileUpload(e.target.files); };

  function handleReceivingData(data: any) {
    if (data.info) {
      workerRef.current?.postMessage({ status: "fileInfo", fileSize: data.fileSize });
      setfileNameState(data.fileName);
    } else if (data.done) workerRef.current?.postMessage("download");
    else { setdownloadFile("active"); workerRef.current?.postMessage(data); }
  }

  const handleWebRTCUpload = () => {
    const peer = peerRef.current;
    const file = fileUpload[0];
    const chunkSize = 16 * 1024;
    let offset = 0;
    const readAndSendChunk = () => {
      const chunk = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();
      if (offset === 0) {
        setfileSending(true);
        peer.write(JSON.stringify({ info: true, fileName: file.name, fileSize: file.size, fileType: file.type }));
      }
      reader.onload = (event) => {
        if (event.target?.result) {
          const uint8ArrayChunk = new Uint8Array(event.target.result as ArrayBuffer);
          peer.write(JSON.stringify({ chunk: Array.from(uint8ArrayChunk), progress: (offset / file.size) * 100 }));
          setfileUploadProgress((offset / file.size) * 100);
          offset += chunkSize;
          if (offset < file.size) readAndSendChunk();
          else {
            peer.write(JSON.stringify({ done: true, fileName: file.name, fileSize: file.size, fileType: file.type }));
            setfileUploadProgress(100); setfileSending(false); toast.success("File sent");
          }
        }
      };
      reader.readAsArrayBuffer(chunk);
    };
    readAndSendChunk();
  };

  return (
    <Card className="w-full lg:w-[450px] backdrop-blur-xl bg-card/60 border-primary/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden transition-all duration-300">
      
      {/* --- DRAGGABLE VIDEO UI --- */}
      <div ref={constraintsRef} className="relative aspect-video bg-black/95 border-b border-primary/10 overflow-hidden group">
        <video ref={media.remoteVideoRef} autoPlay playsInline controls={false} className="w-full h-full object-cover" />
        
        {/* Local Draggable PIP with persistent layout */}
        <motion.div 
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{ scale: 1.05, zIndex: 50 }}
          layout // ✅ Prevents position resetting during state changes
          className="absolute bottom-3 right-3 w-32 aspect-video bg-card rounded-lg overflow-hidden border border-primary/40 shadow-xl z-20 cursor-grab active:cursor-grabbing touch-none"
        >
          <video 
            ref={media.localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            controls={false}
            className="w-full h-full object-cover scale-x-[-1] pointer-events-none" 
          />
        </motion.div>

        <div className="absolute bottom-3 left-3 flex gap-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" type="button" className="rounded-full h-9 w-9 bg-background/80" onClick={media.toggleVideo}>
            {media.videoActive ? <Video size={16} /> : <VideoOff size={16} className="text-destructive" />}
          </Button>
          <Button size="icon" variant="secondary" type="button" className="rounded-full h-9 w-9 bg-background/80" onClick={media.toggleAudio}>
            {media.audioActive ? <Mic size={16} /> : <MicOff size={16} className="text-destructive" />}
          </Button>
        </div>
      </div>

      <CardContent className="mt-6 relative z-10">
        <form onSubmit={(e) => { e.preventDefault(); handleConnectionMaking(); }}>
          <div className="grid w-full items-center gap-6">
            <div className="flex flex-col gap-y-2 group">
              <Label className="text-muted-foreground">My ID</Label>
              <div className="flex flex-row space-x-2">
                <div className="flex items-center border border-primary/20 rounded-lg px-4 h-11 w-full bg-primary/5 text-primary font-mono text-sm">
                  {userId || "Loading..."}
                </div>
                <Button variant="outline" type="button" className="h-11 w-11 p-0" onClick={() => {toast.success("Copied"); navigator.clipboard.writeText(userDetails?.userId);}}>
                  <CopyIcon size={18} />
                </Button>
                <ShareLink userCode={userId} />
              </div>
            </div>

            <div className="flex flex-col gap-y-2 group">
              <Label className="text-muted-foreground">Peer's ID</Label>
              <div className="flex flex-row space-x-2">
                <Input placeholder="Enter 10-character ID" className="h-11 font-mono" onChange={(e) => setpartnerId(e.target.value)} disabled={terminateCall || isLoading} value={partnerId} />
                <Button className="h-11 w-[120px]" type="button" disabled={terminateCall} onClick={isLoading ? handleCancelConnection : handleConnectionMaking}>
                  {isLoading ? <span className="flex items-center gap-1"><TailSpin color="white" height={14} width={14} /> Cancel</span> : <b>Connect</b>}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-y-2">
              <div className={`flex items-center border rounded-lg px-4 h-11 w-full transition-all ${currentConnection ? 'border-green-500/40 bg-green-500/10 text-green-500' : 'bg-muted/30 text-muted-foreground'}`}>
                <div className={`h-2 w-2 rounded-full mr-2 ${currentConnection ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                {currentConnection ? `Connected` : "Ready to connect"}
                {terminateCall && <Button variant="destructive" size="sm" className="ml-auto h-7 px-2" onClick={() => handleTerminate(true)}>
                    <PhoneOff size={14} className="mr-1" /> Terminate
                </Button>}
              </div>
            </div>

            <div className="flex flex-col border border-primary/10 bg-primary/5 rounded-xl p-4 gap-y-3">
              <Label className="font-semibold text-foreground">Transfer Files</Label>
              <FileUploadBtn inputRef={fileInputRef} uploadBtn={handleFileUploadBtn} handleFileChange={handleFileChange} />
              {fileUpload && <FileUpload fileName={fileUpload[0]?.name} fileProgress={fileUploadProgress} handleClick={handleWebRTCUpload} showProgress={fileSending} />}
            </div>

            {downloadFile && <FileDownload fileName={fileNameState} fileReceivingStatus={fileReceiving} fileProgress={fileDownloadProgress} fileRawData={downloadFile} />}
          </div>
        </form>
      </CardContent>
      
      {acceptCaller && (
        <CardFooter className="pt-4 animate-in slide-in-from-bottom-4">
          <Button className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-semibold" onClick={acceptUser}>
            Accept connection from {signalingData.from}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ShareCard;
