import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SendHorizonal } from "lucide-react";
import { useSocket } from "@/context/SocketProvider";

// GLOBAL DECODER: Prevent UI stutter during intense chat sessions
const globalDecoder = new TextDecoder();

const Chat = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<any>("");
  const inputRef = useRef<any>();
  const btnRef = useRef<any>();
  const Socket = useSocket();

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
        
        const payload = new TextEncoder().encode(JSON.stringify(messageData));
        const framedMessage = new Uint8Array(payload.byteLength + 1);
        framedMessage[0] = 0; 
        framedMessage.set(payload, 1); 
        
        peer.send(framedMessage); 
      }
    }
  };

  useEffect(() => {
    const peer = Socket.peerState;

    if (peer) {
      peer.on("data", (data: any) => {
        if (!data || data.byteLength === 0) return;

        if (data[0] === 0) {
          try {
            const payload = data.subarray ? data.subarray(1) : data.slice(1);
            
            // REUSE GLOBAL DECODER
            const textData = globalDecoder.decode(payload);
            const receivedMessage = JSON.parse(textData);
            
            if (receivedMessage.text && receivedMessage.type === "messages") {
              setMessages((prevMessages) => [...prevMessages, receivedMessage]);
            }
          } catch (error) {
            console.error("Failed to parse chat message", error);
          }
        }
      });
    }
  }, [Socket.peerState]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current.focus();
      } else if (e.key === "Enter") {
        btnRef.current.click();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {Socket.peerState && (
        <div className="flex w-full lg:w-[400px] animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="flex flex-col border border-primary/20 rounded-xl bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_0_40px_rgba(59,130,246,0.1)] w-full h-[550px] overflow-hidden">
            
            <div className="px-4 py-3 border-b border-primary/10 bg-primary/5 backdrop-blur-md">
              <h3 className="font-semibold text-sm flex items-center">
                <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                Secure Chat
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto w-full p-4 space-y-3 custom-scrollbar">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.sender === "me" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex flex-wrap max-w-[85%] text-sm rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${
                      message.sender === "me"
                        ? "bg-gradient-to-br from-blue-500 to-primary text-white rounded-tr-sm shadow-[0_4px_15px_rgba(59,130,246,0.25)]"
                        : "bg-muted/80 backdrop-blur-sm text-foreground border border-border/50 rounded-tl-sm"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-background/50 backdrop-blur-md border-t border-primary/10">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  ref={inputRef}
                  placeholder="Type a message..."
                  className="h-11 rounded-full bg-background border-primary/20 focus-visible:ring-primary/50 shadow-inner px-4 transition-all duration-300"
                />
                <Button
                  className="h-11 w-11 rounded-full p-0 flex-shrink-0 bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)] hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition-all duration-300"
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