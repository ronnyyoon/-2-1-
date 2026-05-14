export interface SubjectInfo {
  id: string;
  name: string;
  units: number;
  average: number;
}

export interface Student {
  id: string;
  name: string;
  class: string;
  number: string;
  scores: { [subjectId: string]: number | null };
}

export interface StudentStats {
  score: number | null;
  rank: number | null;
  percentile: number | null;
  grade: number | null;
  grade5: number | null;
}

export interface DetailedSubjectStats {
  id: string;
  name: string;
  average: number;
  totalStudents: number;
  cuts5: { [grade: number]: number };
  cuts9: { [grade: number]: number };
  studentStats: { [studentId: string]: StudentStats };
}

export interface CollegeAdmission {
  id: string;
  admissionGrade: number;
  university: string;
  selectionType: string;
  detailType: string;
  department: string;
  admissionType: '합격' | '충원합격';
}
