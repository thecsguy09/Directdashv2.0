"use client";
import React from "react";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Download, X } from "lucide-react";
import { saveAs } from "file-saver";
import { Progress } from "./ui/progress";
import { truncateString } from "@/utils/funtions";

type fileDownloadProps = {
  fileReceivingStatus: boolean;
  fileName: string;
  fileProgress: number;
  fileRawData: any;
  cancelTransfer?: any; // ✅ Added to support receiver cancellation
};

const FileDownload = ({
  fileName,
  fileProgress,
  fileReceivingStatus,
  fileRawData,
  cancelTransfer,
}: fileDownloadProps) => {
  
  const handleFileDownload = (fileRawData: any, tempFile: any) => {
    const blob = fileRawData;
    saveAs(blob, tempFile);
  };

  return (
    <>
      <div className="flex flex-col border border-primary/20 bg-primary/5 rounded-xl px-4 py-4 w-full gap-y-3 shadow-sm">
        <div className="flex justify-between items-center">
          <Label className="font-semibold text-[16px] flex items-center">
            {fileReceivingStatus ? (
              <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            ) : null}
            Download
          </Label>
          
          {/* ✅ Receiver Cancel Button */}
          {fileReceivingStatus && cancelTransfer && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive" onClick={cancelTransfer}>
              <X size={14} className="mr-1" /> Cancel
            </Button>
          )}
        </div>

        <div className="flex flex-col border border-primary/10 bg-background rounded-lg px-3 py-3 text-sm w-full gap-y-2">
          <div className="flex justify-between items-center">
            <div className="flex font-medium">
              {fileReceivingStatus ? "Receiving..." : truncateString(fileName)}
            </div>
            <div className="flex">
              <Button
                type="button"
                variant="outline"
                className="h-[30px] px-3"
                disabled={!fileRawData}
                onClick={() => handleFileDownload(fileRawData, fileName)}
              >
                <Download size={14} className="mr-1" /> Save
              </Button>
            </div>
          </div>

          {fileReceivingStatus ? (
            <div className="mt-1">
              {/* Changed color slightly to distinguish receiving from sending */}
              <Progress value={fileProgress} className="h-1.5 [&>div]:bg-blue-500" />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default FileDownload;
