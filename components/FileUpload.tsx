"use client";
import React from "react";
import { Button } from "./ui/button";
import { Send, X } from "lucide-react";
import { Progress } from "./ui/progress";
import { truncateString } from "@/utils/funtions";

type fileUploadProps = {
  fileName: string;
  fileProgress: number;
  handleClick: any;
  showProgress: boolean;
};

const FileUpload = ({
  fileName,
  fileProgress,
  handleClick,
  showProgress,
}: fileUploadProps) => {
  return (
    <div className="flex flex-col border border-primary/20 bg-background rounded-lg px-3 py-3 text-sm w-full gap-y-2 transition-all shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex font-medium">{truncateString(fileName)}</div>
        <div className="flex">
          <Button
            type="button"
            variant={showProgress ? "destructive" : "default"}
            className="h-[30px] px-3 transition-all"
            onClick={() => {
              handleClick();
            }}
          >
            {showProgress ? (
              <span className="flex items-center"><X size={14} className="mr-1" /> Cancel</span>
            ) : (
              <span className="flex items-center"><Send size={14} className="mr-1" /> Send</span>
            )}
          </Button>
        </div>
      </div>

      {showProgress ? (
        <div className="mt-1">
          <Progress value={fileProgress} className="h-1.5" />
        </div>
      ) : null}
    </div>
  );
};

export default FileUpload;
