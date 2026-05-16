export type ActivityType = "Palestra" | "Oficina";

export type ActivityShift = "morning" | "afternoon" | "night";

export type AcademicActivity = {
  id: string;
  groupId: string;
  type: ActivityType;
  title: string;
  speakers: string[];
  description: string;
  dayId: string;
  dateLabel: string;
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
  activities: AcademicActivity[];
};

export type ActivityAvailability = {
  activityId: string;
  filledSpots: number;
  capacity: number;
};
