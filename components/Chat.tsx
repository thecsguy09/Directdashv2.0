import React, { useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SendHorizonal } from "lucide-react";
import { useSocket } from "@/context/SocketProvider";

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
      if (peer && peer.connected) {
        peer.send(JSON.stringify({ type: "messages", text: newMessage, sender: "other" }));
      }
    }
  };

  useEffect(() => {
    const peer = Socket.peerState;
    if (!peer) return;

    const handleData = (data: any) => {
      if (data instanceof Uint8Array || data instanceof ArrayBuffer || data.buffer !== undefined) return;
      try {
        const receivedMessage = JSON.parse(data.toString());
        if (receivedMessage.type === "messages" && receivedMessage.text) {
          setMessages((prevMessages) => [...prevMessages, receivedMessage]);
        }
      } catch (err) {}
    };

    peer.on("data", handleData);
    return () => peer.off("data", handleData);
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
          <div className="flex flex-col border border-primary/20 rounded-xl bg-card/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full h-[550px] overflow-hidden">
            <div className="px-4 py-3 border-b border-primary/10 bg-primary/5 backdrop-blur-md">
              <h3 className="font-semibold text-sm flex items-center">
                <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                Secure Chat
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto w-full p-4 space-y-3 custom-scrollbar">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`flex flex-wrap max-w-[85%] text-sm rounded-2xl px-4 py-2.5 shadow-sm transition-all duration-200 ${message.sender === "me" ? "bg-gradient-to-br from-blue-500 to-primary text-white rounded-tr-sm" : "bg-muted/80 text-foreground border rounded-tl-sm"}`}>
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-primary/10">
              <div className="flex items-center gap-2">
                <Input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} ref={inputRef} placeholder="Type a message..." className="h-11 rounded-full" />
                <Button className="h-11 w-11 rounded-full p-0 flex-shrink-0" onClick={handleSendMessage} ref={btnRef}>
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
