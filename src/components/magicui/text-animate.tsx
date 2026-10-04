"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimationType = "text" | "word" | "character" | "line";
type AnimationVariant =
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown";
type MotionElementType =
  | "article"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "li"
  | "p"
  | "section"
  | "span";

interface TextAnimateProps {
  children: string;
  className?: string;
  segmentClassName?: string;
  delay?: number;
  duration?: number;
  variants?: Variants;
  as?: MotionElementType;
  by?: AnimationType;
  startOnView?: boolean;
  once?: boolean;
  animation?: AnimationVariant;
  accessible?: boolean;
}

const motionElements = {
  article: motion.article,
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  h5: motion.h5,
  h6: motion.h6,
  li: motion.li,
  p: motion.p,
  section: motion.section,
  span: motion.span
};

const animationVariants: Record<AnimationVariant, Variants> = {
  fadeIn: { hidden: { opacity: 0 }, show: { opacity: 1 } },
  blurIn: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    show: { opacity: 1, filter: "blur(0px)" }
  },
  blurInUp: {
    hidden: { opacity: 0, filter: "blur(10px)", y: 20 },
    show: { opacity: 1, filter: "blur(0px)", y: 0 }
  },
  blurInDown: {
    hidden: { opacity: 0, filter: "blur(10px)", y: -20 },
    show: { opacity: 1, filter: "blur(0px)", y: 0 }
  },
  slideUp: { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } },
  slideDown: { hidden: { opacity: 0, y: -20 }, show: { opacity: 1, y: 0 } },
  slideLeft: { hidden: { opacity: 0, x: 20 }, show: { opacity: 1, x: 0 } },
  slideRight: { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } },
  scaleUp: { hidden: { opacity: 0, scale: 0.5 }, show: { opacity: 1, scale: 1 } },
  scaleDown: { hidden: { opacity: 0, scale: 1.5 }, show: { opacity: 1, scale: 1 } }
};

function TextAnimateBase({
  children,
  className,
  segmentClassName,
  delay = 0,
  duration = 0.3,
  variants,
  as = "p",
  by = "word",
  startOnView = true,
  once = true,
  animation = "fadeIn",
  accessible = true
}: TextAnimateProps) {
  const MotionComponent = motionElements[as];
  const segments =
    by === "text"
      ? [children]
      : by === "character"
        ? children.split("")
        : by === "line"
          ? children.split("\n")
          : children.split(/(\s+)/);
  const itemVariants = variants ?? animationVariants[animation];

  return (
    <MotionComponent
      className={cn("whitespace-pre-wrap", className)}
      initial="hidden"
      animate={startOnView ? undefined : "show"}
      whileInView={startOnView ? "show" : undefined}
      viewport={{ once }}
      variants={{
        hidden: { opacity: 1 },
        show: {
          opacity: 1,
          transition: {
            delayChildren: delay,
            staggerChildren: by === "text" ? 0 : duration / Math.max(segments.length, 1)
          }
        }
      }}
      aria-label={accessible ? children : undefined}
    >
      {accessible && <span className="sr-only">{children}</span>}
      {segments.map((segment, index) => (
        <motion.span
          key={`${by}-${index}`}
          aria-hidden={accessible || undefined}
          className={cn(by === "line" ? "block" : "inline-block whitespace-pre", segmentClassName)}
          variants={{
            ...itemVariants,
            show: {
              ...(itemVariants.show as object),
              transition: { duration }
            }
          }}
        >
          {segment}
        </motion.span>
      ))}
    </MotionComponent>
  );
}

export const TextAnimate = memo(TextAnimateBase);
