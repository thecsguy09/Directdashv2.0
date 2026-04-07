import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';

interface VideoProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isAudioOn: boolean;
  isVideoOn: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
}

const Video: React.FC<VideoProps> = ({
  localStream,
  remoteStream,
  isAudioOn,
  isVideoOn,
  toggleAudio,
  toggleVideo,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!localStream && !remoteStream) return null;

  return (
    <div className="relative w-full h-[300px] md:h-[400px] bg-black/95 rounded-xl overflow-hidden border border-primary/20 shadow-xl animate-in fade-in zoom-in duration-300">
      
      {/* Remote Video (Main Background) */}
      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        className="absolute inset-0 w-full h-full object-cover" 
      />
      {!remoteStream && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70 text-sm">
          Waiting for partner's video...
        </div>
      )}

      {/* Local Video (Picture-in-Picture overlay) */}
      <div className="absolute top-4 right-4 w-[100px] md:w-[140px] aspect-video bg-black/80 rounded-lg overflow-hidden border-2 border-primary/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-10">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform -scale-x-100" 
        />
        <div className="absolute bottom-1 left-1 text-[9px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
          You
        </div>
      </div>

      {/* Media Controls Overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-background/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 z-10">
        <Button 
          variant={isAudioOn ? "default" : "destructive"} 
          size="icon" 
          onClick={toggleAudio} 
          className="h-10 w-10 rounded-full shadow-lg transition-all"
        >
          {isAudioOn ? <Mic size={18} /> : <MicOff size={18} />}
        </Button>
        <Button 
          variant={isVideoOn ? "default" : "destructive"} 
          size="icon" 
          onClick={toggleVideo} 
          className="h-10 w-10 rounded-full shadow-lg transition-all"
        >
          {isVideoOn ? <VideoIcon size={18} /> : <VideoOff size={18} />}
        </Button>
      </div>
    </div>
  );
};

export default Video;
