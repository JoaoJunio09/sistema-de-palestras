import {
  collection,
  deleteDoc,
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
import type { ActivityAvailability } from "../types/activity";
import type {
  RegisterStudentActivityInput,
  StudentRegistration,
} from "../types/registration";

const REGISTRATIONS_COLLECTION = "registrations";
const ACTIVITY_COUNTERS_COLLECTION = "activityCounters";
const STUDENT_SLOT_COLLECTION = "studentRegistrationSlots";
const STUDENT_ACTIVITY_GROUP_COLLECTION = "studentActivityGroups";

function buildSlotId(userId: string, dayId: string, shift: string) {
  return `${userId}_${dayId}_${shift}`;
}

function buildActivityGroupSelectionId(userId: string, activityGroupId: string) {
  return `${userId}_${activityGroupId}`;
}

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

export async function getActivityAvailabilities(activityIds: string[]) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  if (activityIds.length === 0) {
    return new Map<string, ActivityAvailability>();
  }

  const countersSnapshot = await getDocs(collection(db, ACTIVITY_COUNTERS_COLLECTION));
  const requestedActivityIds = new Set(activityIds);
  const availabilityMap = new Map<string, ActivityAvailability>();

  countersSnapshot.docs.forEach((counterDocument) => {
    if (!requestedActivityIds.has(counterDocument.id)) {
      return;
    }

    const activity = getActivityById(counterDocument.id);
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

    const activity = getActivityById(activityId);

    availabilityMap.set(activityId, {
      activityId,
      filledSpots: 0,
      capacity: activity?.capacity ?? 40,
    });
  });

  return availabilityMap;
}

export async function registerStudentActivity(input: RegisterStudentActivityInput) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const activity = getActivityById(input.activityId);

  if (!activity) {
    throw new Error("Atividade não encontrada.");
  }

  const registrationRef = doc(
    db,
    REGISTRATIONS_COLLECTION,
    `${input.userId}_${activity.id}`,
  );
  const counterRef = doc(db, ACTIVITY_COUNTERS_COLLECTION, activity.id);
  const slotRef = doc(
    db,
    STUDENT_SLOT_COLLECTION,
    buildSlotId(input.userId, activity.dayId, activity.shift),
  );
  const activityGroupRef = doc(
    db,
    STUDENT_ACTIVITY_GROUP_COLLECTION,
    buildActivityGroupSelectionId(input.userId, activity.groupId),
  );

  await runTransaction(db, async (transaction) => {
    const [registrationSnapshot, counterSnapshot, slotSnapshot, activityGroupSnapshot] =
      await Promise.all([
        transaction.get(registrationRef),
        transaction.get(counterRef),
        transaction.get(slotRef),
        transaction.get(activityGroupRef),
      ]);

    if (registrationSnapshot.exists()) {
      throw new Error("Você já está inscrito nessa atividade.");
    }

    if (slotSnapshot.exists()) {
      throw new Error("Você já escolheu uma atividade nesse turno.");
    }

    if (activityGroupSnapshot.exists()) {
      throw new Error("Essa atividade já foi escolhida em outro turno.");
    }

    const filledSpots = Number(counterSnapshot.data()?.filledSpots ?? 0);

    if (filledSpots >= activity.capacity) {
      throw new Error("As vagas dessa atividade estão esgotadas.");
    }

    const registrationData = {
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
      shift: activity.shift,
      shiftLabel: activity.shiftLabel,
      room: activity.room,
      time: activity.time,
      capacity: activity.capacity,
      registeredAt: serverTimestamp(),
    };

    transaction.set(registrationRef, registrationData);
    transaction.set(slotRef, {
      userId: input.userId,
      dayId: activity.dayId,
      shift: activity.shift,
      activityId: activity.id,
      registrationId: registrationRef.id,
    });
    transaction.set(activityGroupRef, {
      userId: input.userId,
      activityGroupId: activity.groupId,
      activityId: activity.id,
      registrationId: registrationRef.id,
    });
    transaction.set(
      counterRef,
      {
        activityId: activity.id,
        capacity: activity.capacity,
        filledSpots: increment(1),
      },
      { merge: true },
    );
  });
}

export async function deleteStudentRegistration(registration: StudentRegistration) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const firestore = db;

  await runTransaction(firestore, async (transaction) => {
    const registrationRef = doc(firestore, REGISTRATIONS_COLLECTION, registration.id);
    const counterRef = doc(firestore, ACTIVITY_COUNTERS_COLLECTION, registration.activityId);
    const slotRef = doc(
      firestore,
      STUDENT_SLOT_COLLECTION,
      buildSlotId(registration.userId, registration.dayId, registration.shift),
    );
    const activityGroupRef = doc(
      firestore,
      STUDENT_ACTIVITY_GROUP_COLLECTION,
      buildActivityGroupSelectionId(registration.userId, registration.activityGroupId),
    );

    transaction.delete(registrationRef);
    transaction.delete(slotRef);
    transaction.delete(activityGroupRef);
    transaction.set(
      counterRef,
      {
        filledSpots: increment(-1),
      },
      { merge: true },
    );
  });
}

export async function deleteRegistrationDocument(registrationId: string) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  await deleteDoc(doc(db, REGISTRATIONS_COLLECTION, registrationId));
}
