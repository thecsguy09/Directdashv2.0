import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";

export const useMediaStream = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoActive, setVideoActive] = useState(true);
  const [audioActive, setAudioActive] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  const attachRemoteStream = useCallback((remoteStream: MediaStream) => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => console.warn(err));
    }
  }, []);

  const getMediaStream = useCallback(async () => {
    if (stream) return stream;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(newStream);
      return newStream;
    } catch (err) {
      toast.error("Camera access required");
      return null;
    }
  }, [stream]);

  const toggleVideo = () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !videoActive;
      setVideoActive(!videoActive);
    }
  };

  const toggleAudio = () => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !audioActive;
      setAudioActive(!audioActive);
    }
  };

  const stopMediaStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setVideoActive(true); 
    setAudioActive(true); 
  };

  return { stream, getMediaStream, attachRemoteStream, toggleVideo, toggleAudio, stopMediaStream, videoActive, audioActive, localVideoRef, remoteVideoRef };
};