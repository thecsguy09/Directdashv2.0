"use client";
import React from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { File } from "lucide-react";

type fileUploadBtn = {
  inputRef: any;
  handleFileChange: any;
  uploadBtn: any;
};

const FileUploadBtn = ({
  inputRef,
  handleFileChange,
  uploadBtn,
}: fileUploadBtn) => {
  return (
    <>
      <Input
        type="file"
        className="hidden"
        ref={inputRef}
        onChange={(e) => handleFileChange(e)}
      />
      <Button
        variant="outline"
        type="button"
        onClick={uploadBtn}
        className="flex gap-x-2 border-dashed border-2 hover:bg-primary/5 transition-colors"
      >
        <File size={15} />
        Select File
      </Button>
    </>
  );
};

export default FileUploadBtn;
