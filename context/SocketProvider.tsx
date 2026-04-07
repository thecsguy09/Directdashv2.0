"use client";
import { nanoid } from "nanoid";
import React, { createContext, useContext, useMemo, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext<any>({});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useMemo(() => {
    // HARDCODED: Using your exact Railway production URL with the required https:// protocol
    return io("https://directdash-backend-production.up.railway.app", {
      transports: ["websocket"], // Forces WebSocket for faster, more stable P2P signaling
    });
  }, []);

  const [peerState, setpeerState] = useState<any>();
  const userId = useMemo(() => nanoid(10), []);

  return (
    <SocketContext.Provider value={{ socket, userId, peerState, setpeerState }}>
      {children}
    </SocketContext.Provider>
  );
};
