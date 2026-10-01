import type { Config } from "tailwindcss";

// Design tokens for JodBill.
//
// The rules the whole app follows:
//  - Spacing: only the 4px-based steps below. No arbitrary values.
//  - Type:    only the named sizes below. Each pairs a size with its
//             line-height and tracking, so headings cannot drift.
//  - Colour:  ink/brand/surface roles, every text pair verified at
//             WCAG AA or better against the surface it sits on.
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Text. Contrast on the page surface: 17.4 / 7.7 / 4.6
        ink: {
          900: "#14171A", // headings, numbers
          600: "#4A5258", // body
          450: "#6B747B", // captions, labels — AA at 4.6
        },
        // Brand. 5.9 on page, 6.1 on card, white-on-brand 6.1
        brand: {
          50: "#EAF6F3",
          100: "#D2EDE7",
          300: "#5FD6C4", // for dark surfaces only (10.0 on ink-dark)
          600: "#0B6E62",
          700: "#095A50",
        },
        // Text on the dark hero/footer surface.
        ondark: {
          DEFAULT: "#C8D3D0",
          muted: "#A9B5B2",
        },
        surface: {
          DEFAULT: "#FBFBF9", // page
          raised: "#FFFFFF", // cards
          sunken: "#F4F4F0", // wells, table headers
          dark: "#0F1B19", // hero, footer
        },
        line: {
          DEFAULT: "#E6E6E0",
          strong: "#D2D2CA",
        },
        // Money semantics, carried over from the validated chart palette.
        money: {
          in: "#1baf7a",
          out: "#eb6834",
        },
      },
      // Named steps only. A heading picks a step; it never sets a raw size.
      fontSize: {
        // Chart axis ticks and tab labels only — never body copy.
        micro: ["0.6875rem", { lineHeight: "0.875rem" }],
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        small: ["0.875rem", { lineHeight: "1.375rem" }],
        body: ["1rem", { lineHeight: "1.625rem" }],
        lead: ["1.125rem", { lineHeight: "1.75rem" }],
        h4: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        h3: ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        h2: ["2rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        h1: ["2.5rem", { lineHeight: "3rem", letterSpacing: "-0.025em" }],
        display: ["3.25rem", { lineHeight: "3.5rem", letterSpacing: "-0.03em" }],
      },
      spacing: {
        // Section rhythm, so vertical spacing between blocks is never ad hoc.
        section: "5rem",
        "section-lg": "7rem",
      },
      borderRadius: {
        card: "1rem",
        pill: "9999px",
      },
      boxShadow: {
        // One soft elevation, used sparingly. Minimal means borders, not shadows.
        card: "0 1px 2px rgba(20, 23, 26, 0.04), 0 8px 24px -12px rgba(20, 23, 26, 0.12)",
        lift: "0 2px 4px rgba(20, 23, 26, 0.05), 0 16px 40px -16px rgba(20, 23, 26, 0.18)",
      },
      maxWidth: {
        prose: "40rem",
        shell: "72rem",
      },
    },
  },
  plugins: [],
};
export default config;
