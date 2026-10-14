"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

// fit "contain" shows the whole image on `background` (for graphics with text).
export type HeroSlide = { src: string; alt: string; href: string; position?: string; fit?: "cover" | "contain"; background?: string };

const AUTOPLAY_MS = 6000;

// Swipeable hero (native scroll-snap, so touch and trackpad swipes just work).
// Autoplay stops for good once the visitor interacts, and never runs for people
// who prefer reduced motion.
export function HeroCarousel({ slides, sizes }: { slides: HeroSlide[]; sizes: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, []);

  // Any manual navigation ends autoplay.
  const goManual = (i: number) => {
    setAutoplay(false);
    go(Math.max(0, Math.min(i, slides.length - 1)));
  };

  // Keep the current slide aligned when the width changes (rotation, resize).
  const indexRef = useRef(0);
  indexRef.current = index;
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => el.scrollTo({ left: indexRef.current * el.clientWidth, behavior: "auto" }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || paused || slides.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => go((index + 1) % slides.length), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [autoplay, paused, index, slides.length, go]);

  return (
    <div
      className="hc"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") goManual(index + 1);
        if (e.key === "ArrowLeft") goManual(index - 1);
      }}
    >
      <div
        className="hc-track"
        ref={track}
        onPointerDown={() => setAutoplay(false)}
        onWheel={(e) => {
          if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setAutoplay(false);
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {slides.map((s, i) => (
          <Link
            key={s.src}
            href={s.href}
            className="hc-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}: ${s.alt}`}
            tabIndex={i === index ? 0 : -1}
            style={s.background ? { background: s.background } : undefined}
          >
            <Image
              src={s.src}
              alt={s.alt}
              fill
              sizes={sizes}
              style={{ objectFit: s.fit ?? "cover", objectPosition: s.position ?? "center" }}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" className="hc-arrow hc-prev" aria-label="Previous slide" disabled={index === 0} onClick={() => goManual(index - 1)}>
            <Icon name="prev" size={20} />
          </button>
          <button
            type="button"
            className="hc-arrow hc-next"
            aria-label="Next slide"
            disabled={index === slides.length - 1}
            onClick={() => goManual(index + 1)}
          >
            <Icon name="next" size={20} />
          </button>
          <div className="hc-dots">
            {slides.map((s, i) => (
              <button
                key={s.src}
                type="button"
                className="hc-dot"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => goManual(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
