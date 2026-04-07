"use client";
import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SendHorizonal, Video, VideoOff, Mic, MicOff } from "lucide-react";
import { useSocket } from "@/context/SocketProvider";

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<any>("");
  const inputRef = useRef<any>();
  const btnRef = useRef<any>();
  const Socket = useSocket();

  // --- MEDIA STATES ---
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVidOn, setIsVidOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const userVideo = useRef<HTMLVideoElement>(null);

  const handleSendMessage = () => {
    if (newMessage.trim() !== "") {
      const newMessages = [...messages, { text: newMessage, sender: "me" }];
      setMessages(newMessages);
      setNewMessage("");

      const peer = Socket.peerState;
      if (peer) {
        const messageData = {
          type: "messages",
          text: newMessage,
          sender: "other",
        };
        peer.send(JSON.stringify(messageData));
      }
    }
  };

  // --- TOGGLE LOGIC (Audio/Video Only) ---
  const toggleCamera = () => {
    const peer = Socket.peerState;
    const localStream = peer?.streams?.[0];
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVidOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    const peer = Socket.peerState;
    const localStream = peer?.streams?.[0];
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  useEffect(() => {
    const peer = Socket.peerState;

    if (peer) {
      const handleData = (data: any) => {
        try {
          const receivedMessage = JSON.parse(data);
          if (receivedMessage.text) {
            setMessages((prevMessages) => [...prevMessages, receivedMessage]);
          }
        } catch (e) {}
      };

      const handleStream = (stream: MediaStream) => {
        setRemoteStream(stream);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      };

      peer.on("data", handleData);
      peer.on("stream", handleStream);

      return () => {
        peer.off("data", handleData);
        peer.off("stream", handleStream);
      };
    }
  }, [Socket.peerState]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Enter") {
        btnRef.current?.click();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {Socket.peerState && (
        <div className="flex w-full lg:w-[400px] animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex flex-col border border-primary/20 rounded-xl bg-card/60 backdrop-blur-xl shadow-lg w-full h-[550px] overflow-hidden">
            
            {/* VIDEO AREA */}
            {remoteStream && (
              <div className="relative w-full aspect-video bg-black border-b border-primary/20 group">
                <video 
                  playsInline 
                  ref={userVideo} 
                  autoPlay 
                  muted={false} 
                  className="w-full h-full object-contain" 
                />
                
                {/* FLOATING CONTROLS */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                   <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70" onClick={toggleCamera}>
                    {isVidOn ? <Video size={14}/> : <VideoOff size={14} className="text-red-500"/>}
                   </Button>
                   <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 text-white hover:bg-black/70" onClick={toggleMic}>
                    {isMicOn ? <Mic size={14}/> : <MicOff size={14} className="text-red-500"/>}
                   </Button>
                </div>
              </div>
            )}

            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-primary/10 bg-primary/5 backdrop-blur-md">
              <h3 className="font-semibold text-sm flex items-center">
                <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                Secure Chat
              </h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto w-full p-4 space-y-3 custom-scrollbar">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] text-sm rounded-2xl px-4 py-2.5 shadow-sm ${message.sender === "me" ? "bg-primary text-white" : "bg-muted/80"}`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input Area */}
            <div className="p-3 bg-background/50 border-t border-primary/10">
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  ref={inputRef} 
                  placeholder="Type a message..." 
                  className="h-11 rounded-full px-4 focus-visible:ring-primary/50 transition-all duration-300" 
                />
                <Button 
                  className="h-11 w-11 rounded-full p-0 flex-shrink-0 transition-all duration-300" 
                  onClick={handleSendMessage} 
                  ref={btnRef}
                >
                  <SendHorizonal size={18} className="ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chat;
