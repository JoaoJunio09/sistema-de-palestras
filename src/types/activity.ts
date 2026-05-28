import type { CoursePeriod } from "./student";

export type ActivityType = "Palestra" | "Oficina";

export type ActivityShift = "slot0830" | "slot1030" | "night1930" | "night2130";

export type AcademicActivity = {
  id: string;
  groupId: string;
  type: ActivityType;
  title: string;
  speakers: string[];
  description: string;
  dayId: string;
  dateLabel: string;
  period: CoursePeriod;
  shift: ActivityShift;
  shiftLabel: string;
  room: string;
  time: string;
  capacity: number;
};

export type AcademicDay = {
  id: string;
  dateLabel: string;
  title: string;
  tabLabel: string;
  activities: AcademicActivity[];
};

export type ActivityAvailability = {
  activityId: string;
  filledSpots: number;
  capacity: number;
};
