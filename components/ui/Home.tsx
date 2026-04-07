import React from "react";
import { Button } from "./button";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Globe } from "lucide-react";
import InfoToolTip from "./InfoToolTip";

const Home = () => {
  return (
    <div className="relative flex flex-col min-h-[85vh] justify-center items-center px-4 sm:px-6 overflow-hidden">
      {/* Primary Glowing Background Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      {/* Secondary accent glow */}
      <div className="absolute top-1/4 right-1/4 w-[200px] h-[200px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

      <div className="z-10 flex flex-col items-center space-y-8 text-center max-w-4xl animate-in slide-in-from-bottom-8 fade-in duration-700">
        
        {/* Modern Status Badge */}
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-background/50 px-4 py-1.5 text-sm font-medium text-foreground backdrop-blur-md shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
          100% Secure Client-Side Connection
        </div>

        {/* Responsive, Glowing Typography */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight drop-shadow-sm">
          Share Files Fast, <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-primary to-purple-500 pb-2">
            Connect Instantly.
          </span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl max-w-[700px] leading-relaxed">
          Experience lightning-fast file sharing with DirectDash. No intermediate servers, no file size limits—just direct, peer-to-peer connections.
        </p>

        {/* Feature Highlights (New Addition for a modern feel) */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 pt-4 pb-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Zap className="w-4 h-4 mr-2 text-primary" /> WebRTC Speeds
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Shield className="w-4 h-4 mr-2 text-primary" /> End-to-End Secure
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Globe className="w-4 h-4 mr-2 text-primary" /> Any Network
          </div>
        </div>

        {/* Action Area */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full sm:w-auto">
          <Link href="/transfer" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all duration-300 ease-out text-lg font-semibold"
            >
              Start Sharing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <div className="hidden sm:block">
            <InfoToolTip />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;