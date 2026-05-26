export type CourseId =
  | "adm"
  | "informatica"
  | "rh"
  | "ds";

export type CoursePeriod = "Integral" | "Noturno";

export type StudentProfile = {
  uid: string;
  fullName: string;
  slug: string;
  email: string;
  courseId: CourseId;
  courseName: string;
  courseShortName: string;
  period: CoursePeriod;
  photoUrl?: string;
};

export type StudentProfileFormData = {
  fullName: string;
  courseId: CourseId | "";
};
