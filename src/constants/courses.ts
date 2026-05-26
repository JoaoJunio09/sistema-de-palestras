import type { CourseId, CoursePeriod } from "../types/student";

export type CourseOption = {
  id: CourseId;
  label: string;
  shortName: string;
  period: CoursePeriod;
};

export const courseOptions: CourseOption[] = [
  {
    id: "adm",
    label: "Administração",
    shortName: "ADM",
    period: "Integral",
  },
  {
    id: "informatica",
    label: "Informática",
    shortName: "Informática",
    period: "Integral",
  },
  {
    id: "rh",
    label: "Recursos Humanos",
    shortName: "RH",
    period: "Noturno",
  },
  {
    id: "ds",
    label: "Desenvolvimento de Sistemas",
    shortName: "DS",
    period: "Noturno",
  },
];

export function findCourseById(courseId: CourseId) {
  return courseOptions.find((course) => course.id === courseId);
}
