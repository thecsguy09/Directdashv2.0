"use client" // Added this just to be safe since it uses interactive elements

import React from 'react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "./tooltip"
import { Button } from './button'
import { InfoIcon } from 'lucide-react'

const InfoToolTip = () => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            className="rounded-full h-12 w-12 p-0 border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <InfoIcon size={20} className="text-foreground/80" />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          className="w-[280px] bg-background/95 border border-primary/20 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-4 rounded-xl"
          sideOffset={8}
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-primary block mb-1">Network Requirement</span>
            Ensure that both peers are on the same network to enable WebRTC file transfers.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default InfoToolTip