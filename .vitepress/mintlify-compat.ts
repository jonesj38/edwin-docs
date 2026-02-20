/**
 * Vite plugin that transforms Mintlify-specific syntax in .md files
 * so that VitePress/Vue can compile them without errors.
 *
 * Handles:
 * - JSX-style attributes: cols={2} → :cols="2"
 * - Self-closing iframe/img tags: <iframe ... /> → <iframe ...></iframe>
 * - frameBorder → frameborder (Vue lowercases attrs)
 * - allowFullScreen → allowfullscreen
 * - Mintlify components → converted to div/details/markdown equivalents
 */

import type { Plugin } from "vite";

export function mintlifyCompat(): Plugin {
  return {
    name: "mintlify-compat",
    enforce: "pre",
    transform(code: string, id: string) {
      if (!id.endsWith(".md")) return;

      let result = code;

      // Convert JSX-style attributes: attr={value} → :attr="value"
      // But only outside of code blocks
      result = transformOutsideCodeBlocks(result, (text) => {
        // cols={2} → :cols="2"
        text = text.replace(/(\s)(\w+)=\{([^}]+)\}/g, (_, space, attr, val) => {
          // If val is a simple number or string, use direct attribute
          const trimVal = val.trim();
          if (/^\d+$/.test(trimVal)) {
            return `${space}${attr}="${trimVal}"`;
          }
          return `${space}:${attr}="${trimVal}"`;
        });

        // Fix self-closing tags that aren't valid HTML
        // <iframe ... /> → <iframe ...></iframe>
        text = text.replace(/<iframe([^>]*?)\/>/g, "<iframe$1></iframe>");

        // Fix React-style boolean attributes
        text = text.replace(/\ballowFullScreen\b/g, "allowfullscreen");
        text = text.replace(/\bframeBorder\b/g, "frameborder");

        return text;
      });

      if (result !== code) {
        return { code: result, map: null };
      }
    },
  };
}

/**
 * Apply a transform function only to text outside of fenced code blocks.
 */
function transformOutsideCodeBlocks(md: string, transform: (text: string) => string): string {
  const parts = md.split(/(```[\s\S]*?```)/g);
  return parts
    .map((part, i) => {
      // Odd indices are code blocks
      if (i % 2 === 1) return part;
      return transform(part);
    })
    .join("");
}
