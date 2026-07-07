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
        [stripCertificateSuffix(normalized), grade].filter(
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
  const normalizedCandidate = normalize(candidateText);

  return buildCertificateProfiles(certificates)
    .filter((profile) => {
      return profile.keywords.some((keyword) => {
        return keyword && normalizedCandidate.includes(normalize(keyword));
      });
    })
    .map((profile) => {
      const gradeText = profile.grade ? ` · ${profile.grade}` : "";
      return `${profile.original}${gradeText}`;
    });
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

  return undefined;
}

function stripCertificateSuffix(value: string) {
  let keyword = value;

  for (const suffix of CERTIFICATE_SUFFIXES) {
    keyword = keyword.replaceAll(suffix, "");
  }

  return keyword.trim();
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
