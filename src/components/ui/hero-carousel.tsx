"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";

const images = [
    "/hero/fotouno.jpeg",
    "/hero/fotodos.jpeg",
    "/hero/fototres.jpeg",
    "/hero/fotocuatro.jpeg",
    "/hero/fotocinco.jpeg",
];

export default function HeroCarousel() {
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
        Autoplay({ delay: 5000, stopOnInteraction: false }),
    ]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on("select", onSelect);
    }, [emblaApi, onSelect]);

    return (
        <div className="absolute inset-0 z-0 h-full w-full overflow-hidden">
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/40" />

            <div className="h-full w-full" ref={emblaRef}>
                <div className="flex h-full w-full touch-pan-y">
                    {images.map((src, index) => (
                        <div className="relative h-full w-full min-w-0 flex-[0_0_100%]" key={index}>
                            <Image
                                src={src}
                                alt={`Hero image ${index + 1}`}
                                fill
                                className="object-cover"
                                priority={index === 0}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {images.map((_, index) => (
                    <button
                        key={index}
                        className={`h-2 rounded-full transition-all duration-300 ${selectedIndex === index ? "w-8 bg-indigo-500" : "w-2 bg-white/50"
                            }`}
                        onClick={() => emblaApi && emblaApi.scrollTo(index)}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
