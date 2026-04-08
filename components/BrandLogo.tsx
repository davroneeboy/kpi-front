"use client";

import Image from "next/image";

const sizes = {
  sm: { box: "h-10 w-10", img: 40 },
  md: { box: "h-20 w-20 sm:h-24 sm:w-24", img: 96 },
} as const;

type Props = {
  size?: keyof typeof sizes;
  className?: string;
};

export function BrandLogo({
  size = "md",
  className = "",
}: Props) {
  const s = sizes[size];

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-full ${s.box} ${className}`}>
      <Image
        src="/uzbekistan-emblem.png"
        alt="Oʻzbekiston Respublikasi davlat gerbi"
        width={s.img}
        height={s.img}
        className="h-full w-full object-contain"
        priority={size === "md"}
        sizes={`${s.img}px`}
      />
    </div>
  );
}
