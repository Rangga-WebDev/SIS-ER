/** @format */

"use client";

import { useEffect, useState } from "react";
import { navItems } from "@/lib/landing-data";
import BackgroundDecoration from "@/components/landing/BackgroundDecoration";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ServicesSection from "@/components/landing/ServicesSection";
import WorkflowSection from "@/components/landing/WorkflowSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FaqSection from "@/components/landing/FaqSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";
import FloatingHelp from "@/components/landing/FloatingHelp";

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("beranda");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const sections = navItems.map((item) => item.href.replace("#", ""));
    const handleScroll = () => {
      let current = "beranda";
      for (const id of sections) {
        const section = document.getElementById(id);
        if (section && window.scrollY >= section.offsetTop - 140) current = id;
      }
      setActiveSection(current);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    const id = href.replace("#", "");
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
      setMobileOpen(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7fbff] text-slate-900">
      <BackgroundDecoration />
      <Navbar activeSection={activeSection} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} onNavClick={handleNavClick} />
      <HeroSection onNavClick={handleNavClick} />
      <ServicesSection />
      <WorkflowSection />
      <FeaturesSection />
      <FaqSection openFaq={openFaq} setOpenFaq={setOpenFaq} />
      <ContactSection />
      <Footer onNavClick={handleNavClick} />
      <FloatingHelp />
    </main>
  );
}
