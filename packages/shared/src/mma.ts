export type PageRequest = {
  pageNo?: number;
  numOfRows?: number;
};

export type MmaApiPage<T> = {
  items: T[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
};

export type MmaRawItem = Record<string, string | undefined>;

export type MmaResource =
  | "specialties"
  | "documents"
  | "scores"
  | "eligibility"
  | "recruitmentStatus"
  | "customizedSpecialties"
  | "socialServiceVacancies";

export type MilitarySpecialty = {
  specialtyCode: string;
  specialtyName?: string;
  branchCode: string;
  branchName?: string;
  categoryCode?: string;
  categoryName?: string;
  requirementItemName?: string;
  minValue?: string;
  maxValue?: string;
  recruitYear: string;
  recruitRound: string;
  scheduleId: string;
  applicationStartAt?: string;
  applicationEndAt?: string;
};

export type RequiredDocument = {
  specialtyCode: string;
  specialtyName?: string;
  branchCode: string;
  branchName?: string;
  documentCode: string;
  documentName?: string;
  categoryCode?: string;
  categoryName?: string;
  isRequired: boolean;
};

export type SelectionScoreRule = {
  specialtyCode: string;
  specialtyName?: string;
  branchCode: string;
  branchName?: string;
  scoreGroupCode: string;
  scoreGroupName?: string;
  scoreGradeCode?: string;
  scoreGradeName?: string;
  scoreDetailCode: string;
  scoreDetailName?: string;
  minValue?: string;
  maxValue?: string;
  directScore?: number;
  indirectScore?: number;
  scheduleId: string;
  recruitYear: string;
  recruitRound: string;
};

export type RecruitmentStatus = {
  specialtyCode: string;
  specialtyName?: string;
  branchName?: string;
  recruitTypeName?: string;
  recruitYear?: string;
  recruitRound?: string;
  selectionQuota?: number;
  applicantCount?: number;
  shortageCount?: number;
  competitionRate?: number;
  applicationStartAt?: string;
  applicationEndAt?: string;
  enlistStartMonth?: string;
  enlistEndMonth?: string;
  enlistDate?: string;
};

export type SpecialtyDetail = {
  specialty: MilitarySpecialty;
  documents: RequiredDocument[];
  scores: SelectionScoreRule[];
  recruitmentStatuses: RecruitmentStatus[];
};

export type RecommendationInput = {
  desiredBranch?: string;
  major?: string;
  certificates: string[];
  physicalGrade?: number;
  interests: string[];
  desiredEnlistDate?: string;
  serviceType?: "any" | "active" | "social";
};

export type RecommendationResult = {
  specialtyCode: string;
  specialtyName: string;
  branchName: string;
  score: number;
  status: "eligible" | "partial" | "ineligible";
  reasons: string[];
  missingConditions: string[];
};
