import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  academicDays,
  getAllAcademicActivities,
  groupActivitiesByShift,
} from "../../data/academicActivities";
import { auth, isFirebaseConfigured } from "../../lib/firebase";
import {
  getActivityAvailabilities,
  getStudentRegistrations,
  registerStudentActivity,
} from "../../services/registrationService";
import { getStudentProfile } from "../../services/studentProfileService";
import type { AcademicActivity, ActivityAvailability } from "../../types/activity";
import type { StudentRegistration } from "../../types/registration";
import type { StudentProfile } from "../../types/student";
import { buildStudentPanelPath } from "../../utils/studentSlug";
import "./InscriptionPage.css";

type PageStatus = "checking" | "ready" | "missing-config";
type ConfirmationStep = "warning" | "typing";

function buildSlotKey(activity: AcademicActivity) {
  return `${activity.dayId}_${activity.shift}`;
}

export default function InscriptionPage() {
  const { studentSlug } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PageStatus>(() =>
    auth && isFirebaseConfigured ? "checking" : "missing-config",
  );
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState(
    () => new Map<string, ActivityAvailability>(),
  );
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [selectedDayId, setSelectedDayId] = useState(() => academicDays[0]?.id ?? "");
  const [pendingActivity, setPendingActivity] = useState<AcademicActivity | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<ConfirmationStep>("warning");
  const [confirmationText, setConfirmationText] = useState("");
  const [feedback, setFeedback] = useState("");

  const selectedActivityIds = useMemo(() => {
    return new Set(registrations.map((registration) => registration.activityId));
  }, [registrations]);

  const selectedSlotKeys = useMemo(() => {
    return new Set(
      registrations.map((registration) => `${registration.dayId}_${registration.shift}`),
    );
  }, [registrations]);

  const selectedGroupIds = useMemo(() => {
    return new Set(registrations.map((registration) => registration.activityGroupId));
  }, [registrations]);

  const availableDays = useMemo(() => {
    if (!studentProfile) {
      return [];
    }

    return academicDays
      .map((day) => ({
        ...day,
        activities: day.activities.filter((activity) => {
          return activity.period === studentProfile.period;
        }),
      }))
      .filter((day) => day.activities.length > 0);
  }, [studentProfile]);

  const activeDayId = useMemo(() => {
    const hasSelectedDay = availableDays.some((day) => day.id === selectedDayId);

    return hasSelectedDay ? selectedDayId : availableDays[0]?.id ?? "";
  }, [availableDays, selectedDayId]);

  const visibleDays = useMemo(() => {
    return availableDays.filter((day) => day.id === activeDayId);
  }, [activeDayId, availableDays]);

  async function loadRegistrationState(userId: string) {
    const activities = getAllAcademicActivities();
    const [studentRegistrations, activityAvailabilities] = await Promise.all([
      getStudentRegistrations(userId),
      getActivityAvailabilities(activities.map((activity) => activity.id)),
    ]);

    setRegistrations(studentRegistrations);
    setAvailabilityMap(activityAvailabilities);
  }

  useEffect(() => {
    if (!auth || !isFirebaseConfigured) {
      return undefined;
    }

    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive) {
        return;
      }

      if (!firebaseUser) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const profile = await getStudentProfile(firebaseUser.uid);

        if (!isActive) {
          return;
        }

        if (!profile) {
          navigate("/login", { replace: true });
          return;
        }

        if (studentSlug !== profile.slug) {
          navigate(`${buildStudentPanelPath(profile.slug)}/inscricao`, {
            replace: true,
          });
          return;
        }

        await loadRegistrationState(firebaseUser.uid);

        if (!isActive) {
          return;
        }

        setStudentProfile(profile);
        setStatus("ready");
      } catch {
        if (!isActive) {
          return;
        }

        setFeedback("Não foi possível carregar as inscrições. Tente novamente.");
        setStatus("ready");
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigate, studentSlug]);

  async function handleRegister(activity: AcademicActivity) {
    if (!studentProfile || !auth?.currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    setSelectedActivityId(activity.id);
    setFeedback("");

    try {
      await registerStudentActivity({
        userId: studentProfile.uid,
        studentName: studentProfile.fullName,
        studentEmail: studentProfile.email,
        studentSlug: studentProfile.slug,
        studentCourseName: studentProfile.courseName,
        studentCourseShortName: studentProfile.courseShortName,
        studentPeriod: studentProfile.period,
        activityId: activity.id,
      });
      await loadRegistrationState(studentProfile.uid);
      setFeedback(`Inscrição confirmada em "${activity.title}".`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível realizar a inscrição.";

      setFeedback(message);
    } finally {
      setSelectedActivityId("");
    }
  }

  function openConfirmation(activity: AcademicActivity) {
    setPendingActivity(activity);
    setConfirmationStep("warning");
    setConfirmationText("");
    setFeedback("");
  }

  function closeConfirmation() {
    if (selectedActivityId) {
      return;
    }

    setPendingActivity(null);
    setConfirmationStep("warning");
    setConfirmationText("");
  }

  async function handleFinalConfirmation() {
    if (!pendingActivity || confirmationText !== "Confirmar") {
      return;
    }

    await handleRegister(pendingActivity);
    setPendingActivity(null);
    setConfirmationStep("warning");
    setConfirmationText("");
  }

  function getButtonState(activity: AcademicActivity) {
    const availability = availabilityMap.get(activity.id);
    const filledSpots = availability?.filledSpots ?? 0;
    const capacity = availability?.capacity ?? activity.capacity;
    const isSelected = selectedActivityIds.has(activity.id);
    const hasSlotSelected = selectedSlotKeys.has(buildSlotKey(activity));
    const hasGroupSelected = selectedGroupIds.has(activity.groupId);
    const isFull = filledSpots >= capacity;

    if (isSelected) {
      return { label: "Inscrito", disabled: true };
    }

    if (isFull) {
      return { label: "Esgotado", disabled: true };
    }

    if (hasSlotSelected) {
      return { label: "Turno já escolhido", disabled: true };
    }

    if (hasGroupSelected) {
      return { label: "Já escolhido", disabled: true };
    }

    return { label: "Inscrever-se", disabled: false };
  }

  if (status === "checking") {
    return (
      <main className="inscription-page">
        <section className="inscription-state-card">
          <p>Carregando sua área de inscrição...</p>
        </section>
      </main>
    );
  }

  if (status === "missing-config") {
    return (
      <main className="inscription-page">
        <section className="inscription-state-card">
          <h1>Firebase não configurado</h1>
          <p>Configure o arquivo `.env` para acessar a área de inscrição.</p>
          <Link className="inscription-primary-link" to="/login">
            Voltar para o login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="inscription-page">
      <section className="inscription-shell" aria-labelledby="inscription-title">
        <header className="inscription-header">
          <div>
            <Link className="inscription-back-link" to="/">
              Voltar para o início
            </Link>
            <h1 id="inscription-title">Escolha suas palestras e oficinas</h1>
            <p>
              Você está visualizando apenas atividades do seu período. Escolha
              com atenção: depois de confirmar uma inscrição, ela não poderá ser
              alterada ou removida pelo aluno.
            </p>
          </div>

          <aside className="student-summary" aria-label="Dados do aluno">
            <span>{studentProfile?.fullName}</span>
            <strong>{studentProfile?.courseShortName} • {studentProfile?.period}</strong>
            <small>{registrations.length} inscrição(ões) confirmada(s)</small>
          </aside>
        </header>

        {feedback ? <p className="inscription-feedback">{feedback}</p> : null}

        <nav className="day-filter-tabs" aria-label="Filtrar atividades por dia">
          {availableDays.map((day) => (
            <button
              className={
                activeDayId === day.id
                  ? "day-filter-button day-filter-button-active"
                  : "day-filter-button"
              }
              key={day.id}
              type="button"
              onClick={() => setSelectedDayId(day.id)}
            >
              {day.tabLabel}
            </button>
          ))}
        </nav>

        <div className="inscription-days">
          {visibleDays.map((day) => (
            <section className="academic-day-section" key={day.id}>
              <div className="academic-day-header">
                <span>{day.dateLabel}</span>
                <h2>{day.title}</h2>
              </div>

              <div className="shift-sections">
                {groupActivitiesByShift(day.activities).map((shiftGroup) => (
                  <section className="shift-section" key={`${day.id}-${shiftGroup.shift}`}>
                    <div className="shift-header">
                      <h3>{shiftGroup.shiftLabel}</h3>
                      <span>{shiftGroup.activities.length} atividade(s)</span>
                    </div>

                    <div className="activity-grid">
                      {shiftGroup.activities.map((activity) => {
                        const availability = availabilityMap.get(activity.id);
                        const filledSpots = availability?.filledSpots ?? 0;
                        const capacity = availability?.capacity ?? activity.capacity;
                        const availableSpots = Math.max(capacity - filledSpots, 0);
                        const buttonState = getButtonState(activity);

                        return (
                          <article className="activity-card" key={activity.id}>
                            <div className="activity-card-topline">
                              <span>{activity.type}</span>
                              <strong>
                                {availableSpots > 0
                                  ? `${availableSpots} vaga(s)`
                                  : "Esgotado"}
                              </strong>
                            </div>

                            <h4>{activity.title}</h4>

                            <p>{activity.description}</p>

                            <dl className="activity-details">
                              <div>
                                <dt>Palestrante(s)</dt>
                                <dd>{activity.speakers.join(", ")}</dd>
                              </div>
                              <div>
                                <dt>Sala</dt>
                                <dd>{activity.room}</dd>
                              </div>
                              <div>
                                <dt>Horário</dt>
                                <dd>{activity.time}</dd>
                              </div>
                              <div>
                                <dt>Período</dt>
                                <dd>{activity.period}</dd>
                              </div>
                              <div>
                                <dt>Vagas</dt>
                                <dd>{filledSpots} / {capacity}</dd>
                              </div>
                            </dl>

                            <button
                              className={
                                buttonState.label === "Inscrito"
                                  ? "activity-button activity-button-confirmed"
                                  : "activity-button"
                              }
                              type="button"
                              onClick={() => openConfirmation(activity)}
                              disabled={buttonState.disabled || selectedActivityId === activity.id}
                            >
                              {selectedActivityId === activity.id
                                ? "Salvando..."
                                : buttonState.label}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      {pendingActivity ? (
        <div className="confirmation-overlay" role="presentation">
          <section
            className="confirmation-dialog"
            aria-labelledby="confirmation-title"
            aria-modal="true"
            role="dialog"
          >
            {confirmationStep === "warning" ? (
              <>
                <span className="confirmation-kicker">Atenção</span>
                <h2 id="confirmation-title">Confirme antes de continuar</h2>
                <p>
                  Você está escolhendo <strong>{pendingActivity.title}</strong>.
                  Após confirmar, não será possível alterar ou remover essa
                  inscrição pelo sistema.
                </p>
                <div className="confirmation-summary">
                  <span>{pendingActivity.dateLabel}</span>
                  <span>{pendingActivity.shiftLabel}</span>
                  <span>{pendingActivity.time}</span>
                  <span>{pendingActivity.room}</span>
                </div>
                <div className="confirmation-actions">
                  <button
                    className="confirmation-secondary-button"
                    type="button"
                    onClick={closeConfirmation}
                  >
                    Cancelar
                  </button>
                  <button
                    className="confirmation-primary-button"
                    type="button"
                    onClick={() => setConfirmationStep("typing")}
                  >
                    Próximo
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="confirmation-kicker">Última confirmação</span>
                <h2 id="confirmation-title">Digite Confirmar</h2>
                <p>
                  Para concluir sua inscrição, digite exatamente a palavra
                  <strong> Confirmar</strong> no campo abaixo.
                </p>
                <label className="confirmation-field">
                  <span>Palavra de confirmação</span>
                  <input
                    autoFocus
                    value={confirmationText}
                    onChange={(event) => setConfirmationText(event.target.value)}
                    placeholder="Confirmar"
                  />
                </label>
                <div className="confirmation-actions">
                  <button
                    className="confirmation-secondary-button"
                    type="button"
                    onClick={closeConfirmation}
                  >
                    Cancelar
                  </button>
                  <button
                    className="confirmation-primary-button"
                    type="button"
                    onClick={() => void handleFinalConfirmation()}
                    disabled={confirmationText !== "Confirmar" || Boolean(selectedActivityId)}
                  >
                    {selectedActivityId ? "Salvando..." : "Confirmar"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}
