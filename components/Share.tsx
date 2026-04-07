"use client";
import React from "react";
import ShareCard from "./ShareCard";
import Chat from "./Chat";

const Share = () => {  
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden py-10 px-4">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      
      <div className="flex flex-col lg:flex-row w-full max-w-6xl gap-6 lg:gap-8 justify-center items-start z-10">
        <ShareCard />
        <Chat/>
      </div>
    </div>
  );
};

export default Share;