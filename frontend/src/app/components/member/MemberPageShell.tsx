import { ReactNode } from "react";
import { HomeHeader } from "../home";
import { MemberSidebar } from "./MemberSidebar";

export function MemberPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <HomeHeader />
      <div className="flex">
        <MemberSidebar />
        <main id="main-content" className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10" tabIndex={-1}>
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
