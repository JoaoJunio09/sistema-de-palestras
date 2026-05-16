import type { ActivityShift, ActivityType } from "./activity";
import type { CoursePeriod } from "./student";

export type StudentRegistration = {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentSlug: string;
  studentCourseName: string;
  studentCourseShortName: string;
  studentPeriod: CoursePeriod;
  activityId: string;
  activityGroupId: string;
  activityTitle: string;
  activityType: ActivityType;
  activitySpeakers: string[];
  activityDescription: string;
  dayId: string;
  dateLabel: string;
  shift: ActivityShift;
  shiftLabel: string;
  room: string;
  time: string;
  capacity: number;
};

export type RegisterStudentActivityInput = {
  userId: string;
  studentName: string;
  studentEmail: string;
  studentSlug: string;
  studentCourseName: string;
  studentCourseShortName: string;
  studentPeriod: CoursePeriod;
  activityId: string;
};
