import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Base 44 Background - Grid + Dynamic Glow */}
      <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden bg-black">
        {/* Grid Pattern */}
        <div className="absolute inset-0 h-full w-full bg-[linear-gradient(to_right,#121212_1px,transparent_1px),linear-gradient(to_bottom,#121212_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Dynamic Glow Orbs */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px] animate-blob" />
        <div className="absolute top-2/3 right-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-1/4 left-1/2 h-60 w-60 rounded-full bg-purple-600/5 blur-[90px] animate-blob animation-delay-4000" />
      </div>
      
      <Navbar />
      <main className="flex-1 pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}