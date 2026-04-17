import React, { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/layout/Footer";

export default function Landing() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.href = "/dashboard";
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </div>
  );
}