"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  
  // Pages that should NOT show the sidebar
  const noSidebarPages = ["/login", "/register", "/"];
  const showSidebar = !noSidebarPages.includes(pathname);

  if (!showSidebar) {
    return <div className="container-narrow py-8">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 pt-20 lg:pt-0">
        <div className="container-narrow py-8">{children}</div>
      </div>
    </div>
  );
}