const BRANDS = {
  mjsec: { key: "mjsec", name: "MJSEC", kind: "emblem", shape: "angular" },
  swing: { key: "swing", name: "SWING", kind: "wordmark", shape: "wide" },
  ycert: { key: "ycert", name: "Y-CERT", kind: "emblem", shape: "shield" },
  sekurity: {
    key: "sekurity",
    name: "seKUrity",
    kind: "wordmark",
    shape: "wide",
  },
  codecure: {
    key: "codecure",
    name: "CodeCure",
    kind: "emblem",
    shape: "round",
  },
  aegis: { key: "aegis", name: "Aegis", kind: "emblem", shape: "round" },
};

export function getFestivalBrand(name) {
  const key =
    typeof name === "string" ? name.toLowerCase().replace(/[\s-]/g, "") : "";
  if (!Object.hasOwn(BRANDS, key)) return null;
  const brand = BRANDS[key];
  return { ...brand, src: `/assets/signatures/club-${brand.key}-fitted.svg` };
}

export function getBoothProgress(club, status = "success") {
  const problems =
    status === "success" && Array.isArray(club?.problems) ? club.problems : [];
  const solved = problems.filter(
    (problem) => problem.is_solved === true,
  ).length;
  const total = problems.length;
  return {
    solved,
    total,
    visited: solved > 0,
    complete: total > 0 && solved === total,
  };
}
