// components/SubNavbar.tsx
"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

type TabType = "details" | "attendance" | "payment" | "results";

interface SubNavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function SubNavbar({ activeTab, setActiveTab }: SubNavbarProps) {
  const [open, setOpen] = useState(false);

  const tabs: { key: TabType; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "attendance", label: "Attendance" },
    { key: "payment", label: "Payment Status" },
    { key: "results", label: "Results" },
  ];

  return (
    <div className="mb-4">
      {/* Desktop nav */}
      <nav className="hidden md:flex space-x-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-4 font-medium ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Mobile nav with sheet */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center space-x-2 p-2 border rounded-lg">
              <Menu className="w-5 h-5" />
              <span>Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="p-6">
            <h2 className="text-lg font-semibold mb-4">Navigation</h2>
            <ul className="space-y-2">
              {tabs.map((tab) => (
                <li key={tab.key}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.key);
                      setOpen(false);
                    }}
                    className={`w-full text-left py-2 px-3 rounded-lg ${
                      activeTab === tab.key
                        ? "bg-blue-100 text-blue-600 font-medium"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}