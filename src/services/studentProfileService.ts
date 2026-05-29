import { collection, doc, getDocs, getDoc, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import type { User } from "firebase/auth";
import { findCourseById } from "../constants/courses";
import { db } from "../lib/firebase";
import type { CourseId, StudentProfile, StudentProfileFormData } from "../types/student";
import { createStudentSlug } from "../utils/studentSlug";

const STUDENTS_COLLECTION = "students";

export async function hasStudentProfile(uid: string) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  const studentSnapshot = await getDoc(doc(db, STUDENTS_COLLECTION, uid));

  return studentSnapshot.exists();
}

function parseStudentProfile(data: Record<string, unknown>): StudentProfile {
  return {
    uid: String(data.uid ?? ""),
    fullName: String(data.fullName ?? ""),
    slug: String(data.slug ?? createStudentSlug(String(data.fullName ?? ""))),
    email: String(data.email ?? ""),
    courseId: String(data.courseId ?? "") as CourseId,
    courseName: String(data.courseName ?? ""),
    courseShortName: String(data.courseShortName ?? ""),
    period: String(data.period ?? "Integral") as StudentProfile["period"],
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
  };
}

export async function getStudentProfile(uid: string, email?: string) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  // Tenta primeiro pelo UID (comportamento normal)
  const studentSnapshot = await getDoc(doc(db, STUDENTS_COLLECTION, uid));

  if (studentSnapshot.exists()) {
    return parseStudentProfile(studentSnapshot.data());
  }

  // UID não encontrado — fallback por email (usado após migração de projeto)
  if (email) {
    const emailQuery = query(
      collection(db, STUDENTS_COLLECTION),
      where("email", "==", email),
    );

    const emailSnapshot = await getDocs(emailQuery);

    if (!emailSnapshot.empty) {
      return parseStudentProfile(emailSnapshot.docs[0].data());
    }
  }

  return null;
}

export async function saveStudentProfile(
  user: User,
  formData: StudentProfileFormData,
) {
  if (!db) {
    throw new Error("Firebase não está configurado.");
  }

  if (!formData.courseId) {
    throw new Error("Selecione o curso.");
  }

  const course = findCourseById(formData.courseId as CourseId);

  if (!course) {
    throw new Error("Curso inválido.");
  }

  const fullName = formData.fullName.trim();

  if (!fullName) {
    throw new Error("Informe seu nome e sobrenome.");
  }

  const slug = createStudentSlug(fullName);

  await setDoc(
    doc(db, STUDENTS_COLLECTION, user.uid),
    {
      uid: user.uid,
      fullName,
      slug,
      email: user.email ?? "",
      courseId: course.id,
      courseName: course.label,
      courseShortName: course.shortName,
      period: course.period,
      photoUrl: user.photoURL ?? "",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return {
    uid: user.uid,
    fullName,
    slug,
    email: user.email ?? "",
    courseId: course.id,
    courseName: course.label,
    courseShortName: course.shortName,
    period: course.period,
    photoUrl: user.photoURL ?? "",
  } satisfies StudentProfile;
}