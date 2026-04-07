import React from "react";
import ThemeBtn from "./ThemeBtn";
import { GithubIcon } from "lucide-react";
import { Button } from "./ui/button";
import Image from "next/image";
import fastDropDark from "../public/fastdrop.png"
import fastDropLight from "../public/fastdroplight.png"
import Link from "next/link";

const Navbar = () => {
  return (
    <div className="sticky top-0 z-50 w-full flex justify-center border-b border-border/40 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex px-4 sm:px-6 py-3 w-full max-w-7xl items-center justify-between">
        <div className="flex justify-center items-center gap-2">
          <Image className="h-8 w-8 sm:h-10 sm:w-10 p-0 rotate-90 scale-0 hidden dark:flex dark:scale-100 transition-transform hover:rotate-180 duration-500" src={fastDropLight} alt="DirectDash"/>
          <Image className="h-8 w-8 sm:h-10 sm:w-10 p-0 rotate-90 scale-100 flex dark:scale-0 dark:hidden transition-transform hover:rotate-180 duration-500" src={fastDropDark} alt="DirectDash"/>
          <span className="font-extrabold textxl sm:text-[24px] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
            DirectDash
          </span>
        </div>
        <div className="flex gap-x-1 sm:gap-x-2 items-center">
          <Button type="button" className="p-2 sm:p-3 rounded-full hover:bg-primary/10 transition-colors" variant="ghost" asChild>
            <Link href={"https://github.com/thecsguy09/DirectDash"} target="_blank">
              <GithubIcon size={20} className="text-foreground/80 hover:text-primary transition-colors" />
            </Link>
          </Button>
          <ThemeBtn />
        </div>
      </div>
    </div>
  );
};

export default Navbar;