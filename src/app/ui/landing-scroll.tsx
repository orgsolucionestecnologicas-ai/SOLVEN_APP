"use client";

import { useEffect } from "react";

export function LandingScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

    const nav = document.querySelector("nav");
    function handleScroll() {
      if (!nav) return;
      nav.style.boxShadow = window.scrollY > 20 ? "0 4px 24px rgba(0,0,0,0.08)" : "none";
    }
    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}
