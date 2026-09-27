// 순서는 축제장 원화의 왼쪽 위부터 오른쪽 아래까지의 천막 위치와 같다
export const FESTIVAL_CLUBS = [
  { key: "mjsec", name: "MJSEC", university: "명지대학교" },
  { key: "swing", name: "SWING", university: "서울여자대학교" },
  { key: "ycert", name: "Y-CERT", university: "연세대학교 미래캠퍼스" },
  { key: "sekurity", name: "seKUrity", university: "건국대학교 글로컬캠퍼스" },
  { key: "codecure", name: "CodeCure", university: "상명대학교 천안캠퍼스" },
  { key: "aegis", name: "Aegis", university: "단국대학교" },
];

const clubKey = (name) => name.toLowerCase().replace(/[\s-]/g, "");

export function groupSignatureClubs(signatures) {
  const grouped = new Map();
  for (const entry of signatures) {
    if (!grouped.has(entry.club_id)) {
      const known = FESTIVAL_CLUBS.find(
        (club) => club.key === clubKey(entry.club_name),
      );
      grouped.set(entry.club_id, {
        clubId: entry.club_id,
        key: known?.key || entry.club_id,
        name: known?.name || entry.club_name,
        university: known?.university || "",
        problems: [],
        solvedCount: 0,
      });
    }
    const club = grouped.get(entry.club_id);
    club.problems.push(entry);
    if (entry.is_solved) club.solvedCount += 1;
  }
  return [...grouped.values()];
}

export function buildFestivalBooths(signatures) {
  const groups = groupSignatureClubs(signatures);
  const assigned = new Set();
  const booths = FESTIVAL_CLUBS.map((club, index) => {
    const group = groups.find(
      (entry) => entry.key === club.key && !assigned.has(entry.clubId),
    );
    if (group) assigned.add(group.clubId);
    return {
      ...club,
      clubId: null,
      problems: [],
      solvedCount: 0,
      ...group,
      position: index,
    };
  });
  return {
    booths,
    otherClubs: groups.filter((group) => !assigned.has(group.clubId)),
  };
}
