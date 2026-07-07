export type CertificateProfile = {
  original: string;
  normalized: string;
  grade?: "기사급이상" | "산업기사급" | "기능사급" | "일반면허공인" | "일반면허비공인";
  keywords: string[];
};

const CERTIFICATE_SUFFIXES = [
  "기능장",
  "산업기사",
  "기능사",
  "기사",
  "면허",
  "자격증"
];

export function buildCertificateProfiles(certificates: string[]): CertificateProfile[] {
  return certificates.map((certificate) => {
    const normalized = normalize(certificate);
    const grade = inferCertificateGrade(normalized);
    const keywords = [
      ...new Set(
        [
          stripCertificateSuffix(normalized),
          ...inferCertificateAliases(normalized),
          grade
        ].filter(
          (keyword): keyword is string => typeof keyword === "string" && Boolean(keyword)
        )
      )
    ];

    return {
      original: certificate,
      normalized,
      grade,
      keywords
    };
  });
}

export function expandCertificateKeywords(certificates: string[]): string[] {
  return buildCertificateProfiles(certificates).flatMap((profile) => profile.keywords);
}

export function certificateMatchesCandidateText(
  certificates: string[],
  candidateText: string
): boolean {
  const normalizedCandidate = normalize(candidateText);

  return buildCertificateProfiles(certificates).some((profile) => {
    const hasKeyword = profile.keywords.some((keyword) => {
      return keyword && normalizedCandidate.includes(normalize(keyword));
    });

    return hasKeyword || normalizedCandidate.includes(profile.normalized);
  });
}

export function certificateMatchReasons(
  certificates: string[],
  candidateText: string
): string[] {
  return findMatchingCertificateProfiles(certificates, candidateText)
    .map((profile) => {
      const gradeText = profile.grade ? ` · ${profile.grade}` : "";
      return `${profile.original}${gradeText}`;
    });
}

export function unmatchedCertificateNames(
  certificates: string[],
  candidateText: string
): string[] {
  const matched = new Set(
    findMatchingCertificateProfiles(certificates, candidateText).map((profile) => profile.original)
  );

  return certificates.filter((certificate) => !matched.has(certificate));
}

export function certificateMatchScore(certificates: string[], candidateText: string): number {
  const matches = findMatchingCertificateProfiles(certificates, candidateText);

  if (!matches.length) {
    return 0;
  }

  const rawScore = matches.reduce((sum, profile) => {
    return sum + certificateGradeWeight(profile.grade);
  }, 0);

  return Math.min(rawScore, 40);
}

export function findMatchingCertificateProfiles(
  certificates: string[],
  candidateText: string
): CertificateProfile[] {
  const normalizedCandidate = normalize(candidateText);

  return buildCertificateProfiles(certificates).filter((profile) => {
    return profile.keywords.some((keyword) => {
      return keyword && normalizedCandidate.includes(normalize(keyword));
    });
  });
}

function certificateGradeWeight(grade: CertificateProfile["grade"]) {
  if (grade === "기사급이상") {
    return 22;
  }

  if (grade === "산업기사급") {
    return 18;
  }

  if (grade === "기능사급") {
    return 15;
  }

  if (grade === "일반면허공인") {
    return 12;
  }

  return 10;
}

function inferCertificateGrade(value: string): CertificateProfile["grade"] {
  if (value.includes("산업기사")) {
    return "산업기사급";
  }

  if (value.includes("기능사")) {
    return "기능사급";
  }

  if (value.includes("기사") || value.includes("기능장")) {
    return "기사급이상";
  }

  if (value.includes("운전") || value.includes("면허")) {
    return "일반면허공인";
  }

  if (value.includes("sql") || value.includes("데이터") || value.includes("db")) {
    return "일반면허공인";
  }

  return undefined;
}

function stripCertificateSuffix(value: string) {
  let keyword = value;

  for (const suffix of CERTIFICATE_SUFFIXES) {
    keyword = keyword.replaceAll(suffix, "");
  }

  return keyword.trim();
}

function inferCertificateAliases(value: string): string[] {
  const aliases: string[] = [];

  if (value.includes("조리") || value.includes("제과") || value.includes("제빵")) {
    aliases.push("조리");
  }

  if (value.includes("sql") || value.includes("데이터") || value.includes("db")) {
    aliases.push("정보", "전산", "데이터");
  }

  if (value.includes("정보처리") || value.includes("정보보안") || value.includes("네트워크")) {
    aliases.push("정보", "전산", "통신");
  }

  if (value.includes("전기") || value.includes("전자") || value.includes("무선")) {
    aliases.push("전기", "전자", "통신");
  }

  if (value.includes("자동차") || value.includes("운전") || value.includes("면허")) {
    aliases.push("차량", "운전", "수송");
  }

  if (value.includes("건축") || value.includes("토목") || value.includes("측량") || value.includes("콘크리트")) {
    aliases.push("공병", "건설", "시설");
  }

  if (value.includes("cad") || value.includes("제도") || value.includes("설계")) {
    aliases.push("설계", "정비", "공병");
  }

  if (value.includes("소방") || value.includes("화재")) {
    aliases.push("소방", "화생방", "안전");
  }

  if (value.includes("항공")) {
    aliases.push("항공", "헬기", "정비");
  }

  if (value.includes("의공") || value.includes("임상") || value.includes("방사선") || value.includes("물리치료") || value.includes("응급") || value.includes("간호")) {
    aliases.push("의무", "의료", "전문의무");
  }

  if (value.includes("위험물") || value.includes("가스") || value.includes("화학") || value.includes("환경")) {
    aliases.push("화생방", "화학", "환경");
  }

  if (value.includes("선박") || value.includes("수상") || value.includes("항로") || value.includes("잠수")) {
    aliases.push("해군", "수송", "항만");
  }

  return aliases;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
