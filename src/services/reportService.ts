import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AcademicActivity } from "../types/activity";
import type { StudentRegistration } from "../types/registration";

export function generateActivityReportPdf(
  activity: AcademicActivity,
  registrations: StudentRegistration[],
) {
  const doc = new jsPDF({ orientation: "landscape" });
  const speakers = activity.speakers.join(", ");

  doc.setFontSize(18);
  doc.text(`${activity.type}: ${activity.title}`, 14, 18);

  doc.setFontSize(10);
  doc.text(`Data: ${activity.dateLabel}`, 14, 28);
  doc.text(`Horário: ${activity.time}`, 54, 28);
  doc.text(`Sala: ${activity.room}`, 100, 28);
  doc.text(`Período: ${activity.period}`, 144, 28);
  doc.text(`Vagas: ${registrations.length} / ${activity.capacity}`, 194, 28);

  doc.text(`Palestrante(s): ${speakers}`, 14, 36);
  doc.text(`Descrição: ${activity.description}`, 14, 44, {
    maxWidth: 260,
  });

  autoTable(doc, {
    startY: 56,
    head: [["#", "Aluno", "E-mail", "Curso", "Período"]],
    body: registrations.map((registration, index) => [
      String(index + 1),
      registration.studentName,
      registration.studentEmail,
      registration.studentCourseName,
      registration.studentPeriod,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [29, 78, 216],
    },
  });

  doc.save(`${activity.title}-${activity.dateLabel}-${activity.time}.pdf`);
}
