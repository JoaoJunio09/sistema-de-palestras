import {
  collection,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { getActivityById } from "../data/academicActivities";
import { db } from "../lib/firebase";
import { getActivityOverrides, getActivityWithOverride } from "./activityService";
import type { AcademicActivity, ActivityAvailability } from "../types/activity";
import type {
  RegisterStudentActivityInput,
  StudentRegistration,
} from "../types/registration";

const REGISTRATIONS_COLLECTION = "registrations";
const ACTIVITY_COUNTERS_COLLECTION = "activityCounters";

function parseRegistrationDocument(
  documentId: string,
  data: Record<string, unknown>,
): StudentRegistration {
  return {
    id: documentId,
    userId: String(data.userId ?? ""),
    studentName: String(data.studentName ?? ""),
    studentEmail: String(data.studentEmail ?? ""),
    studentSlug: String(data.studentSlug ?? ""),
    studentCourseName: String(data.studentCourseName ?? ""),
    studentCourseShortName: String(data.studentCourseShortName ?? ""),
    studentPeriod: String(data.studentPeriod ?? "Integral") as StudentRegistration["studentPeriod"],
    activityId: String(data.activityId ?? ""),
    activityGroupId: String(data.activityGroupId ?? ""),
    activityTitle: String(data.activityTitle ?? "Atividade sem título"),
    activityType: String(data.activityType ?? "Palestra") as StudentRegistration["activityType"],
    activitySpeakers: Array.isArray(data.activitySpeakers)
      ? data.activitySpeakers.map(String)
      : [],
    activityDescription: String(data.activityDescription ?? ""),
    dayId: String(data.dayId ?? ""),
    dateLabel: String(data.dateLabel ?? ""),
    activityPeriod: String(data.activityPeriod ?? "Integral") as StudentRegistration["activityPeriod"],
    shift: String(data.shift ?? "morning") as StudentRegistration["shift"],
    shiftLabel: String(data.shiftLabel ?? ""),
    room: String(data.room ?? ""),
    time: String(data.time ?? ""),
    capacity: Number(data.capacity ?? 40),
  };
}

export async function getStudentRegistrations(userId: string) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const registrationsQuery = query(
    collection(db, REGISTRATIONS_COLLECTION),
    where("userId", "==", userId),
  );
  const registrationsSnapshot = await getDocs(registrationsQuery);

  return registrationsSnapshot.docs
    .map((registrationDocument) =>
      parseRegistrationDocument(
        registrationDocument.id,
        registrationDocument.data(),
      ),
    )
    .sort((firstRegistration, secondRegistration) => {
      const dateOrder = firstRegistration.dayId.localeCompare(secondRegistration.dayId);

      if (dateOrder !== 0) {
        return dateOrder;
      }

      return firstRegistration.time.localeCompare(secondRegistration.time);
    });
}

export async function getAllRegistrations() {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const registrationsSnapshot = await getDocs(collection(db, REGISTRATIONS_COLLECTION));

  return registrationsSnapshot.docs
    .map((registrationDocument) =>
      parseRegistrationDocument(
        registrationDocument.id,
        registrationDocument.data(),
      ),
    )
    .sort((firstRegistration, secondRegistration) => {
      const activityOrder = firstRegistration.activityTitle.localeCompare(
        secondRegistration.activityTitle,
      );

      if (activityOrder !== 0) {
        return activityOrder;
      }

      return firstRegistration.studentName.localeCompare(secondRegistration.studentName);
    });
}

export async function getActivityAvailabilities(activityIds: string[]) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const activityOverrides = await getActivityOverrides();
  const countersSnapshot = await getDocs(collection(db, ACTIVITY_COUNTERS_COLLECTION));
  const requestedActivityIds = new Set(activityIds);
  const availabilityMap = new Map<string, ActivityAvailability>();

  function getConfiguredActivity(activityId: string) {
    const activity = getActivityById(activityId);

    if (!activity) {
      return undefined;
    }

    return {
      ...activity,
      ...activityOverrides.get(activityId),
    };
  }

  countersSnapshot.docs.forEach((counterDocument) => {
    if (!requestedActivityIds.has(counterDocument.id)) {
      return;
    }

    const activity = getConfiguredActivity(counterDocument.id);
    const data = counterDocument.data();

    availabilityMap.set(counterDocument.id, {
      activityId: counterDocument.id,
      filledSpots: Number(data.filledSpots ?? 0),
      capacity: Number(data.capacity ?? activity?.capacity ?? 40),
    });
  });

  activityIds.forEach((activityId) => {
    if (availabilityMap.has(activityId)) {
      return;
    }

    const activity = getConfiguredActivity(activityId);

    availabilityMap.set(activityId, {
      activityId,
      filledSpots: 0,
      capacity: activity?.capacity ?? 40,
    });
  });

  return availabilityMap;
}

function validateStudentRules(
  activity: AcademicActivity,
  studentRegistrations: StudentRegistration[],
) {
  const hasSameShiftRegistration = studentRegistrations.some((registration) => {
    return registration.dayId === activity.dayId && registration.shift === activity.shift;
  });

  if (hasSameShiftRegistration) {
    throw new Error("Você já escolheu uma atividade nesse turno.");
  }

  const hasSameActivityGroup = studentRegistrations.some((registration) => {
    return registration.activityGroupId === activity.groupId;
  });

  if (hasSameActivityGroup) {
    throw new Error("Essa atividade já foi escolhida em outro horário.");
  }

  return activity;
}

export async function registerStudentActivity(input: RegisterStudentActivityInput) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const studentRegistrations = await getStudentRegistrations(input.userId);
  const activity = await getActivityWithOverride(input.activityId);

  if (!activity) {
    throw new Error("Atividade não encontrada.");
  }

  validateStudentRules(activity, studentRegistrations);

  if (activity.period !== input.studentPeriod) {
    throw new Error("Essa atividade não pertence ao seu período.");
  }

  const registrationRef = doc(
    db,
    REGISTRATIONS_COLLECTION,
    `${input.userId}_${activity.id}`,
  );
  const counterRef = doc(db, ACTIVITY_COUNTERS_COLLECTION, activity.id);

  await runTransaction(db, async (transaction) => {
    const [registrationSnapshot, counterSnapshot] = await Promise.all([
      transaction.get(registrationRef),
      transaction.get(counterRef),
    ]);

    if (registrationSnapshot.exists()) {
      throw new Error("Você já está inscrito nessa atividade.");
    }

    const filledSpots = Number(counterSnapshot.data()?.filledSpots ?? 0);

    if (filledSpots >= activity.capacity) {
      throw new Error("As vagas dessa atividade estão esgotadas.");
    }

    transaction.set(registrationRef, {
      userId: input.userId,
      studentName: input.studentName,
      studentEmail: input.studentEmail,
      studentSlug: input.studentSlug,
      studentCourseName: input.studentCourseName,
      studentCourseShortName: input.studentCourseShortName,
      studentPeriod: input.studentPeriod,
      activityId: activity.id,
      activityGroupId: activity.groupId,
      activityTitle: activity.title,
      activityType: activity.type,
      activitySpeakers: activity.speakers,
      activityDescription: activity.description,
      dayId: activity.dayId,
      dateLabel: activity.dateLabel,
      activityPeriod: activity.period,
      shift: activity.shift,
      shiftLabel: activity.shiftLabel,
      room: activity.room,
      time: activity.time,
      capacity: activity.capacity,
      registeredAt: serverTimestamp(),
    });
    transaction.set(
      counterRef,
      {
        activityId: activity.id,
        activityTitle: activity.title,
        activityPeriod: activity.period,
        capacity: activity.capacity,
        filledSpots: increment(1),
      },
      { merge: true },
    );
  });
}
