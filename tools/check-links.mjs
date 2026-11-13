import { existsSync, readFileSync } from "node:fs";

const pages = [
  "index.html",
  "about-us.html",
  "what-we-do.html",
  "get-involved.html",
  "impact.html",
  "contact.html",
  "give.html",
];

const ids = new Map();
const hrefs = [];

for (const page of pages) {
  const html = readFileSync(page, "utf8");
  const found = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const dupes = found.filter((id, index) => found.indexOf(id) !== index);
  if (dupes.length) console.log("DUPES", page, dupes.join(", "));
  ids.set(page, new Set(found));

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    hrefs.push({ page, href: match[1] });
  }

  for (const match of html.matchAll(/(?:src|srcset|data)="([^"]+)"/g)) {
    for (const part of match[1].split(",")) {
      const url = part.trim().split(" ")[0];
      if (!url.startsWith("/")) continue;
      if (/^\/(https?:)/.test(url)) continue;
      const file = decodeURIComponent(url.split("?")[0].slice(1));
      if (!file || file.endsWith("/")) continue;
      if (!existsSync(file)) console.log("MISSING", page, file);
    }
  }
}

for (const { page, href } of hrefs) {
  if (!href.includes("#")) continue;
  let targetPage = page;
  let hash = "";
  if (href.startsWith("/")) {
    const [pathname, fragment = ""] = href.split("#");
    targetPage = pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
    hash = fragment;
  } else if (href.startsWith("#")) {
    hash = href.slice(1);
  } else {
    continue;
  }
  if (!hash) continue;
  const set = ids.get(targetPage);
  if (!set) {
    console.log("NO PAGE", page, href);
    continue;
  }
  if (!set.has(hash)) console.log("BROKEN ANCHOR", page, "->", href);
}

console.log("checked", pages.length, "pages");
