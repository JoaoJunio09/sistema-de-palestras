import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  academicDays,
  getActivityById,
} from "../data/academicActivities";
import { db } from "../lib/firebase";
import type { AcademicActivity, AcademicDay } from "../types/activity";

const ACTIVITIES_COLLECTION = "activities";
const REGISTRATIONS_COLLECTION = "registrations";
const ACTIVITY_COUNTERS_COLLECTION = "activityCounters";

export type ActivityEditableFields = Pick<
  AcademicActivity,
  | "title"
  | "speakers"
  | "description"
  | "room"
  | "time"
  | "shift"
  | "shiftLabel"
  | "period"
  | "capacity"
>;

type ActivityOverride = Partial<ActivityEditableFields>;

function parseActivityOverride(data: Record<string, unknown>): ActivityOverride {
  return {
    title: data.title ? String(data.title) : undefined,
    speakers: Array.isArray(data.speakers) ? data.speakers.map(String) : undefined,
    description: data.description ? String(data.description) : undefined,
    room: data.room ? String(data.room) : undefined,
    time: data.time ? String(data.time) : undefined,
    shift: data.shift ? (String(data.shift) as AcademicActivity["shift"]) : undefined,
    shiftLabel: data.shiftLabel ? String(data.shiftLabel) : undefined,
    period: data.period ? (String(data.period) as AcademicActivity["period"]) : undefined,
    capacity: data.capacity ? Number(data.capacity) : undefined,
  };
}

function mergeActivity(activity: AcademicActivity, override?: ActivityOverride) {
  return {
    ...activity,
    ...override,
  };
}

export async function getActivityOverrides() {
  if (!db) {
    return new Map<string, ActivityOverride>();
  }

  const overridesSnapshot = await getDocs(collection(db, ACTIVITIES_COLLECTION));
  const overrides = new Map<string, ActivityOverride>();

  overridesSnapshot.docs.forEach((overrideDocument) => {
    overrides.set(
      overrideDocument.id,
      parseActivityOverride(overrideDocument.data()),
    );
  });

  return overrides;
}

export async function getAcademicDaysWithOverrides(): Promise<AcademicDay[]> {
  const overrides = await getActivityOverrides();

  return academicDays.map((day) => ({
    ...day,
    activities: day.activities.map((activity) => {
      return mergeActivity(activity, overrides.get(activity.id));
    }),
  }));
}

export async function getActivityWithOverride(activityId: string) {
  const baseActivity = getActivityById(activityId);

  if (!baseActivity) {
    return undefined;
  }

  if (!db) {
    return baseActivity;
  }

  const overrideSnapshot = await getDoc(doc(db, ACTIVITIES_COLLECTION, activityId));

  if (!overrideSnapshot.exists()) {
    return baseActivity;
  }

  return mergeActivity(baseActivity, parseActivityOverride(overrideSnapshot.data()));
}

export async function saveActivityDetails(
  activityId: string,
  fields: ActivityEditableFields,
) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const batch = writeBatch(db);
  const activityRef = doc(db, ACTIVITIES_COLLECTION, activityId);
  const counterRef = doc(db, ACTIVITY_COUNTERS_COLLECTION, activityId);
  const registrationsQuery = query(
    collection(db, REGISTRATIONS_COLLECTION),
    where("activityId", "==", activityId),
  );
  const registrationsSnapshot = await getDocs(registrationsQuery);

  batch.set(
    activityRef,
    {
      ...fields,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  batch.set(
    counterRef,
    {
      activityId,
      activityTitle: fields.title,
      activityPeriod: fields.period,
      capacity: fields.capacity,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  registrationsSnapshot.docs.forEach((registrationDocument) => {
    batch.update(registrationDocument.ref, {
      activityTitle: fields.title,
      activitySpeakers: fields.speakers,
      activityDescription: fields.description,
      activityPeriod: fields.period,
      shift: fields.shift,
      shiftLabel: fields.shiftLabel,
      room: fields.room,
      time: fields.time,
      capacity: fields.capacity,
    });
  });

  await batch.commit();
}
