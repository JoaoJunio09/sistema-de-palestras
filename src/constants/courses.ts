import type { CourseId, CoursePeriod } from "../types/student";

export type CourseOption = {
  id: CourseId;
  label: string;
  shortName: string;
  period: CoursePeriod;
};

export const courseOptions: CourseOption[] = [
  {
    id: "infonet",
    label: "Informática para Internet",
    shortName: "Infonet",
    period: "Integral",
  },
  {
    id: "adm",
    label: "Administração",
    shortName: "ADM",
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
  {
    id: "agro-a",
    label: "Agropecuária (Turma A)",
    shortName: "Agro A",
    period: "Integral",
  },
  {
    id: "agro-b",
    label: "Agropecuária (Turma B)",
    shortName: "Agro B",
    period: "Integral",
  },
];

export function findCourseById(courseId: CourseId) {
  return courseOptions.find((course) => course.id === courseId);
}
