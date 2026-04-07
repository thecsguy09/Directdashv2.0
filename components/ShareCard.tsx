"use client";
import React, { useEffect, useRef, useState } from "react";

import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Check, CopyIcon } from "lucide-react";
import { useSocket } from "@/context/SocketProvider";
import toast from "react-hot-toast";
import { TailSpin } from "react-loader-spinner";
import Peer from "simple-peer";
import FileUpload from "./FileUpload";
import FileUploadBtn from "./FileUploadBtn";
import FileDownload from "./FileDownload";
import ShareLink from "./ShareLink";
import { useSearchParams } from "next/navigation";
import Video from "./Video";

const ShareCard = () => {
  const userDetails = useSocket();
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
  const [name, setname] = useState<any>();
  const searchParams = useSearchParams();

  // --- MEDIA STATES ---
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  // --------------------

  const workerRef = useRef<Worker>();

  const addUserToSocketDB = () => {
    userDetails.socket.on("connect", () => {
      setuserId(userDetails.userId);
      userDetails.socket.emit("details", {
        socketId: userDetails.socket.id,
        uniqueId: userDetails.userId,
      });
    });
  };

  function CopyToClipboard(value: any) {
    setisCopied(true);
    toast.success("Copied");
    navigator.clipboard.writeText(value);
    setTimeout(() => { setisCopied(false); }, 3000);
  }

  // --- CLEANUP MEDIA ---
  const resetMedia = () => {
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIsAudioOn(false);
    setIsVideoOn(false);
  };

  useEffect(() => {
    // @ts-ignore test
    workerRef.current = new Worker(new URL("../utils/worker.ts", import.meta.url));

    addUserToSocketDB();

    if (searchParams.get("code")) {
      setpartnerId(String(searchParams.get("code")));
    }

    userDetails.socket.on("signaling", (data: any) => {
      if (peerRef.current && peerRef.current.connected) {
        peerRef.current.signal(data.signalData);
      } else {
        setacceptCaller(true);
        setsignalingData(data);
        setpartnerId(data.from);
      }
    });

    workerRef.current?.addEventListener("message", (event: any) => {
      if (event.data?.progress) {
        setfileDownloadProgress(Number(event.data.progress));
      } else if (event.data?.blob) {
        setdownloadFile(event.data?.blob);
        setfileDownloadProgress(0);
        setfileReceiving(false);
      }
    });

    return () => {
      peerRef.current?.destroy();
      if (peerRef.current) {
        setacceptCaller(false);
        userDetails.socket.off();
      }
      workerRef.current?.terminate();
      resetMedia();
    };
  }, []);

  // --- MEDIA HANDLING FUNCTIONS ---
  const handleMediaTrack = async (type: "audio" | "video") => {
    if (localStream) {
      const track = type === "audio" ? localStream.getAudioTracks()[0] : localStream.getVideoTracks()[0];
      
      if (track) {
        // Mute / Unmute existing track
        track.enabled = !track.enabled;
        type === "audio" ? setIsAudioOn(track.enabled) : setIsVideoOn(track.enabled);
      } else {
        // Add new track to existing stream
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ [type]: true });
          const newTrack = type === "audio" ? newStream.getAudioTracks()[0] : newStream.getVideoTracks()[0];
          
          localStream.addTrack(newTrack);
          if (peerRef.current) peerRef.current.addTrack(newTrack, localStream);

          type === "audio" ? setIsAudioOn(true) : setIsVideoOn(true);
        } catch (err) {
          toast.error(`Could not access ${type}.`);
        }
      }
    } else {
      // First time requesting media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ [type]: true });
        setLocalStream(stream);
        type === "audio" ? setIsAudioOn(true) : setIsVideoOn(true);
        
        if (peerRef.current) peerRef.current.addStream(stream);
      } catch (err) {
        toast.error(`Could not access ${type}.`);
      }
    }
  };

  const toggleAudio = () => handleMediaTrack("audio");
  const toggleVideo = () => handleMediaTrack("video");
  // --------------------------------

  const callUser = () => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:free.expressturn.com:3478",
            username: "0000000002090581751",
            credential: "RQWvdnxlvgWaUOexD0JKsEmgi8c=",
          },
        ],
      },
    });
    peerRef.current = peer;

    peer.on("signal", (data) => {
      userDetails.socket.emit("send-signal", {
        from: userDetails.userId,
        signalData: data,
        to: partnerId,
      });
    });

    peer.on("stream", (stream) => {
      setRemoteStream(stream);
    });

    peer.on("data", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.chunk) {
        setfileReceiving(true);
        handleReceivingData(parsedData.chunk);
      } else if (parsedData.done) {
        handleReceivingData(parsedData);
        toast.success("File received successfully");
      } else if (parsedData.info) {
        handleReceivingData(parsedData);
      }
    });

    userDetails.socket.on("callAccepted", (data: any) => {
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.signal(data.signalData);
      }
      
      setcurrentConnection((prev) => {
        if (!prev) {
          setisLoading(false);
          setterminateCall(true);
          toast.success(`Successful connection with ${partnerId}`);
          userDetails.setpeerState(peerRef.current);
          return true;
        }
        return prev;
      });
    });

    peer.on("close", () => {
      setpartnerId("");
      setcurrentConnection(false);
      toast.error(`${partnerId} disconnected`);
      setfileUpload(false);
      setterminateCall(false);
      setpartnerId("");
      userDetails.setpeerState(undefined);
      resetMedia();
    });
  };

  const acceptUser = () => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:free.expressturn.com:3478",
            username: "0000000002090581751",
            credential: "RQWvdnxlvgWaUOexD0JKsEmgi8c=",
          },
        ],
      },
    });

    peerRef.current = peer;
    userDetails.setpeerState(peer);
    
    peer.on("signal", (data) => {
      userDetails.socket.emit("accept-signal", {
        signalData: data,
        to: partnerId,
      });
      
      setcurrentConnection((prev) => {
         if (!prev) {
            setacceptCaller(false);
            setterminateCall(true);
            toast.success(`Successful connection with ${partnerId}`);
            return true;
         }
         return prev;
      });
    });

    peer.on("stream", (stream) => {
      setRemoteStream(stream);
    });

    peer.on("data", (data) => {
      const parsedData = JSON.parse(data);
      if (parsedData.chunk) {
        setfileReceiving(true);
        handleReceivingData(parsedData.chunk);
      } else if (parsedData.done) {
        handleReceivingData(parsedData);
        toast.success("File received successfully");
      } else if (parsedData.info) {
        handleReceivingData(parsedData);
      }
    });

    peer.signal(signalingData.signalData);

    peer.on("close", () => {
      setpartnerId("");
      setcurrentConnection(false);
      toast.error(`${partnerId} disconnected`);
      setfileUpload(false);
      setterminateCall(false);
      setpartnerId("");
      userDetails.setpeerState(undefined);
      resetMedia();
    });
  };

  const handleConnectionMaking = () => {
    setisLoading(true);
    if (partnerId && partnerId.length == 10) {
      callUser();
    } else {
      setisLoading(false);
      toast.error("Enter correct Peer's Id");
    }
  };

  const handleFileUploadBtn = () => fileInputRef.current.click();

  const handleFileChange = (e: any) => setfileUpload(e.target.files);

  function handleReceivingData(data: any) {
    if (data.info) {
      workerRef.current?.postMessage({ status: "fileInfo", fileSize: data.fileSize });
      setfileNameState(data.fileName);
      setname(data.fileName);
    } else if (data.done) {
      workerRef.current?.postMessage("download");
    } else {
      setdownloadFile("sjdf");
      workerRef.current?.postMessage(data);
    }
  }

  const handleWebRTCUpload = () => {
    const peer = peerRef.current;
    const file = fileUpload[0];
    const chunkSize = 16 * 1024; 
    let offset = 0;

    const readAndSendChunk = () => {
      const chunk = file.slice(offset, offset + chunkSize);
      const reader = new FileReader();

      if (offset == 0) {
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
            setfileUploadProgress(100);
            setfileSending(false);
            toast.success("Sent file successfully");
          }
        }
      };
      reader.readAsArrayBuffer(chunk);
    };

    readAndSendChunk();
  };

  return (
    <Card className="w-full lg:w-[450px] backdrop-blur-xl bg-card/60 border-primary/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_0_40px_rgba(59,130,246,0.1)] relative overflow-hidden transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
      <CardContent className="mt-8 relative z-10">
        <form onSubmit={(e) => { e.preventDefault(); handleConnectionMaking(); }}>
          <div className="grid w-full items-center gap-6">
            
            {/* My ID Section */}
            <div className="flex flex-col gap-y-2 group">
              <Label htmlFor="name" className="text-muted-foreground group-focus-within:text-primary transition-colors">My ID</Label>
              <div className="flex flex-row justify-left items-center space-x-2">
                <div className="flex items-center border border-primary/20 rounded-lg px-4 py-2 text-sm h-11 w-full bg-primary/5 text-primary font-mono tracking-wider shadow-inner transition-all duration-300">
                  {userId ? userId : <span className="animate-pulse">Loading...</span>}
                </div>
                <Button variant="outline" type="button" className="h-11 w-11 p-0 rounded-lg border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300" onClick={() => CopyToClipboard(userDetails?.userId)} disabled={!userId}>
                  {isCopied ? <Check size={18} className="text-green-500" /> : <CopyIcon size={18} />}
                </Button>
                <ShareLink userCode={userId} />
              </div>
            </div>

            {/* Peer ID Section */}
            <div className="flex flex-col gap-y-2 group">
              <Label htmlFor="name" className="text-muted-foreground group-focus-within:text-primary transition-colors">Peer's ID</Label>
              <div className="flex flex-row justify-left items-center space-x-2">
                <Input id="name" placeholder="Enter 10-character ID" className="h-11 rounded-lg bg-background/50 border-primary/20 focus-visible:ring-primary shadow-inner font-mono tracking-wider transition-all duration-300" onChange={(e) => setpartnerId(e.target.value)} disabled={terminateCall} value={partnerId} />
                <Button variant="default" type="button" className="h-11 w-[120px] rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300" onClick={handleConnectionMaking} disabled={terminateCall}>
                  {isLoading ? <TailSpin color="currentColor" height={18} width={18} /> : <span className="font-semibold">Connect</span>}
                </Button>
              </div>
            </div>

            {/* Connection Status Section */}
            <div className="flex flex-col gap-y-2">
              <Label className="text-muted-foreground">Connection Status</Label>
              <div className="flex flex-row justify-left items-center space-x-2">
                <div className={`flex items-center border rounded-lg px-4 py-2 text-sm h-11 w-full transition-all duration-500 ${currentConnection ? 'border-green-500/40 bg-green-500/10 text-green-500 font-mono' : 'border-border/50 bg-muted/30 text-muted-foreground'}`}>
                  <div className={`h-2 w-2 rounded-full mr-2 ${currentConnection ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                  {currentConnection ? `Connected: ${partnerId}` : "Waiting for connection..."}
                </div>
                {terminateCall && (
                  <Button variant="destructive" type="button" className="h-11 px-4 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]" onClick={() => { peerRef.current.destroy(); }}>
                    Terminate
                  </Button>
                )}
              </div>
            </div>

            {/* --- MEDIA SETUP & CONTROLS (Appears ONLY after connection) --- */}
            {currentConnection && (
              <div className="flex flex-col gap-y-4 border border-primary/10 bg-primary/5 rounded-xl px-4 py-4 text-sm w-full transition-all duration-500 animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-[16px] text-foreground text-center w-full">Live Meeting</Label>
                </div>
                
                <Video 
                  localStream={localStream}
                  remoteStream={remoteStream}
                  isAudioOn={isAudioOn}
                  isVideoOn={isVideoOn}
                  toggleAudio={toggleAudio}
                  toggleVideo={toggleVideo}
                />
              </div>
            )}

            {/* File Upload Section */}
            <div className="flex flex-col border border-primary/10 bg-primary/5 rounded-xl px-4 py-4 text-sm w-full transition-all duration-500 gap-y-3 mt-2">
              <div>
                <Label className="font-semibold text-[16px] text-foreground">Transfer Files</Label>
              </div>
              <div>
                <FileUploadBtn inputRef={fileInputRef} uploadBtn={handleFileUploadBtn} handleFileChange={handleFileChange} />
              </div>
              {fileUpload && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                  <FileUpload fileName={fileUpload[0]?.name} fileProgress={fileUploadProgress} handleClick={handleWebRTCUpload} showProgress={fileSending} />
                </div>
              )}
            </div>

            {/* Download File Section */}
            {downloadFile && (
              <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
                <FileDownload fileName={fileNameState} fileReceivingStatus={fileReceiving} fileProgress={fileDownloadProgress} fileRawData={downloadFile} />
              </div>
            )}
          </div>
        </form>
      </CardContent>
      
      {acceptCaller && (
        <CardFooter className="flex justify-center border-t border-primary/10 pt-4 bg-background/30 backdrop-blur-md animate-in slide-in-from-bottom-8">
          <Button className="w-full h-12 rounded-lg bg-green-500 hover:bg-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all text-md font-semibold" onClick={acceptUser}>
            Accept connection from {signalingData.from}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default ShareCard;
