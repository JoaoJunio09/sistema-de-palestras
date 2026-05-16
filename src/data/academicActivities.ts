import type { AcademicActivity, AcademicDay, ActivityShift } from "../types/activity";

export const MAX_ACTIVITY_CAPACITY = 40;

export const shiftOrder: ActivityShift[] = ["morning", "afternoon", "night"];

export const shiftLabels: Record<ActivityShift, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  night: "Noite",
};

export const academicDays: AcademicDay[] = [
  {
    id: "2026-06-01",
    dateLabel: "01/06",
    title: "Dia 01/06",
    activities: [
      {
        id: "design-morning-0106",
        groupId: "design",
        type: "Palestra",
        title: "Design para Produtos Digitais",
        speakers: ["Marina Lopes"],
        description:
          "Como transformar ideias em interfaces claras, bonitas e úteis para pessoas reais.",
        dayId: "2026-06-01",
        dateLabel: "01/06",
        shift: "morning",
        shiftLabel: "Manhã",
        room: "Sala 1",
        time: "8h20",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "medicina-morning-0106",
        groupId: "medicina",
        type: "Palestra",
        title: "Carreiras na Medicina",
        speakers: ["Dr. Rafael Andrade"],
        description:
          "Rotina, formação, desafios e possibilidades para quem pensa em seguir na área da saúde.",
        dayId: "2026-06-01",
        dateLabel: "01/06",
        shift: "morning",
        shiftLabel: "Manhã",
        room: "Sala 2",
        time: "10h10",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "dev-afternoon-0106",
        groupId: "desenvolvimento-software",
        type: "Palestra",
        title: "Desenvolvimento de Software na Prática",
        speakers: ["João Martins"],
        description:
          "O caminho entre aprender programação, criar projetos e entrar no mercado de tecnologia.",
        dayId: "2026-06-01",
        dateLabel: "01/06",
        shift: "afternoon",
        shiftLabel: "Tarde",
        room: "Laboratório 1",
        time: "13h20",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "marketing-afternoon-0106",
        groupId: "marketing",
        type: "Palestra",
        title: "Marketing Digital e Criatividade",
        speakers: ["Camila Rocha"],
        description:
          "Estratégias, conteúdo e comunicação para marcas que querem se destacar online.",
        dayId: "2026-06-01",
        dateLabel: "01/06",
        shift: "afternoon",
        shiftLabel: "Tarde",
        room: "Sala 3",
        time: "15h10",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "dev-night-0106",
        groupId: "desenvolvimento-software",
        type: "Palestra",
        title: "Desenvolvimento de Software na Prática",
        speakers: ["João Martins"],
        description:
          "Turma extra da palestra de desenvolvimento para estudantes do período noturno.",
        dayId: "2026-06-01",
        dateLabel: "01/06",
        shift: "night",
        shiftLabel: "Noite",
        room: "Laboratório 2",
        time: "19h30",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
    ],
  },
  {
    id: "2026-06-02",
    dateLabel: "02/06",
    title: "Dia 02/06",
    activities: [
      {
        id: "robotica-morning-0206",
        groupId: "robotica",
        type: "Oficina",
        title: "Robótica com Arduino",
        speakers: ["Equipe de Automação"],
        description:
          "Montagem de circuitos básicos e lógica de controle para protótipos inteligentes.",
        dayId: "2026-06-02",
        dateLabel: "02/06",
        shift: "morning",
        shiftLabel: "Manhã",
        room: "Laboratório 3",
        time: "8h20",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "curriculo-morning-0206",
        groupId: "curriculo",
        type: "Oficina",
        title: "Currículo e LinkedIn",
        speakers: ["Ana Beatriz Souza", "Pedro Henrique Lima"],
        description:
          "Como organizar experiências, apresentar projetos e criar um perfil profissional.",
        dayId: "2026-06-02",
        dateLabel: "02/06",
        shift: "morning",
        shiftLabel: "Manhã",
        room: "Sala 4",
        time: "10h10",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "ia-afternoon-0206",
        groupId: "inteligencia-artificial",
        type: "Oficina",
        title: "IA para Estudos e Projetos",
        speakers: ["Prof. Gean Santos"],
        description:
          "Uso responsável de ferramentas de inteligência artificial para estudar, pesquisar e prototipar.",
        dayId: "2026-06-02",
        dateLabel: "02/06",
        shift: "afternoon",
        shiftLabel: "Tarde",
        room: "Sala Maker",
        time: "13h20",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
      {
        id: "empreendedorismo-afternoon-0206",
        groupId: "empreendedorismo",
        type: "Palestra",
        title: "Empreendedorismo Jovem",
        speakers: ["Denise Martin"],
        description:
          "Como transformar problemas do cotidiano em ideias de negócio com planejamento e atitude.",
        dayId: "2026-06-02",
        dateLabel: "02/06",
        shift: "afternoon",
        shiftLabel: "Tarde",
        room: "Auditório",
        time: "15h10",
        capacity: MAX_ACTIVITY_CAPACITY,
      },
    ],
  },
];

export function getAllAcademicActivities() {
  return academicDays.flatMap((day) => day.activities);
}

export function getActivityById(activityId: string) {
  return getAllAcademicActivities().find((activity) => activity.id === activityId);
}

export function groupActivitiesByShift(activities: AcademicActivity[]) {
  return shiftOrder
    .map((shift) => ({
      shift,
      shiftLabel: shiftLabels[shift],
      activities: activities.filter((activity) => activity.shift === shift),
    }))
    .filter((shiftGroup) => shiftGroup.activities.length > 0);
}
