import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  getAcademicDaysWithOverrides,
  saveActivityDetails,
  type ActivityEditableFields,
} from "../../services/activityService";
import { getAllRegistrations } from "../../services/registrationService";
import { generateActivityReportPdf } from "../../services/reportService";
import type { AcademicActivity, AcademicDay, ActivityShift } from "../../types/activity";
import type { StudentRegistration } from "../../types/registration";
import "./AdminPage.css";

const ADMIN_USERNAME = "sacetec2026";
const ADMIN_PASSWORD = "sacetec2026";

type AdminLoginForm = {
  username: string;
  password: string;
};

type ActivityFormData = {
  title: string;
  speakers: string;
  description: string;
  room: string;
  time: string;
  period: AcademicActivity["period"];
  capacity: string;
};

function createActivityFormData(activity: AcademicActivity): ActivityFormData {
  return {
    title: activity.title,
    speakers: activity.speakers.join(", "),
    description: activity.description,
    room: activity.room,
    time: activity.time,
    period: activity.period,
    capacity: String(activity.capacity),
  };
}

function inferShiftFromTime(time: string): Pick<AcademicActivity, "shift" | "shiftLabel"> {
  const normalizedTime = time.trim().toLowerCase();

  if (normalizedTime.startsWith("8")) {
    return { shift: "slot0830", shiftLabel: "8h30" };
  }

  if (normalizedTime.startsWith("10")) {
    return { shift: "slot1030", shiftLabel: "10h30" };
  }

  if (normalizedTime.startsWith("19")) {
    return { shift: "night1930", shiftLabel: "19h30" };
  }

  if (normalizedTime.startsWith("21")) {
    return { shift: "night2130", shiftLabel: "21h30" };
  }

  return { shift: "night1930", shiftLabel: "19h30" };
}

function toEditableFields(formData: ActivityFormData): ActivityEditableFields {
  const inferredShift = inferShiftFromTime(formData.time);

  return {
    title: formData.title.trim(),
    speakers: formData.speakers
      .split(",")
      .map((speaker) => speaker.trim())
      .filter(Boolean),
    description: formData.description.trim(),
    room: formData.room.trim(),
    time: formData.time.trim(),
    shift: inferredShift.shift as ActivityShift,
    shiftLabel: inferredShift.shiftLabel,
    period: formData.period,
    capacity: Number(formData.capacity) || 40,
  };
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState<AdminLoginForm>({
    username: "",
    password: "",
  });
  const [days, setDays] = useState<AcademicDay[]>([]);
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [editingActivityId, setEditingActivityId] = useState("");
  const [activityForm, setActivityForm] = useState<ActivityFormData | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const registrationsByActivityId = useMemo(() => {
    const registrationsMap = new Map<string, StudentRegistration[]>();

    registrations.forEach((registration) => {
      const currentRegistrations = registrationsMap.get(registration.activityId) ?? [];
      registrationsMap.set(registration.activityId, [
        ...currentRegistrations,
        registration,
      ]);
    });

    return registrationsMap;
  }, [registrations]);

  const totals = useMemo(() => {
    const activities = days.flatMap((day) => day.activities);

    return {
      activities: activities.length,
      registrations: registrations.length,
      students: new Set(registrations.map((registration) => registration.userId)).size,
    };
  }, [days, registrations]);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setFeedback("");

    try {
      const [daysWithOverrides, allRegistrations] = await Promise.all([
        getAcademicDaysWithOverrides(),
        getAllRegistrations(),
      ]);

      setDays(daysWithOverrides);
      setRegistrations(allRegistrations);
    } catch {
      setFeedback("Não foi possível carregar os dados do painel.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      loginForm.username !== ADMIN_USERNAME ||
      loginForm.password !== ADMIN_PASSWORD
    ) {
      setFeedback("Usuário ou senha inválidos.");
      return;
    }

    setIsAuthenticated(true);
    void loadAdminData();
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setDays([]);
    setRegistrations([]);
  }

  function startEditing(activity: AcademicActivity) {
    setEditingActivityId(activity.id);
    setActivityForm(createActivityFormData(activity));
  }

  async function handleSaveActivity(activity: AcademicActivity) {
    if (!activityForm) return;

    const updatedFields = toEditableFields(activityForm);
    await saveActivityDetails(activity.id, updatedFields);

    setDays((currentDays) =>
      currentDays.map((day) => ({
        ...day,
        activities: day.activities.map((a) =>
          a.id === activity.id ? { ...a, ...updatedFields } : a
        ),
      }))
    );

    setEditingActivityId("");
    setActivityForm(null);
    setFeedback("Atividade atualizada com sucesso.");
  }

  if (!isAuthenticated) {
    return (
      <main className="admin-page">
        <section className="admin-login-card">
          <h1>Painel administrativo</h1>
          <p>Acesse para visualizar inscritos, editar atividades e gerar relatórios.</p>

          <form className="admin-login-form" onSubmit={handleLogin}>
            <label>
              <span>Usuário</span>
              <input
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((currentForm) => ({
                    ...currentForm,
                    username: event.target.value,
                  }))
                }
              />
            </label>

            <label>
              <span>Senha</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((currentForm) => ({
                    ...currentForm,
                    password: event.target.value,
                  }))
                }
              />
            </label>

            <button type="submit">Entrar</button>
          </form>

          {feedback ? <p className="admin-feedback">{feedback}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <div>
            <h1>Dashboard administrativo</h1>
            <p>Gerencie inscrições, atividades e relatórios da Semana Acadêmica.</p>
          </div>

          <div className="admin-header-actions">
            <button type="button" onClick={() => void loadAdminData()}>
              {isLoading ? "Atualizando..." : "Atualizar dados"}
            </button>
            <button type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </header>

        <div className="admin-summary-grid">
          <article>
            <span>Atividades</span>
            <strong>{totals.activities}</strong>
          </article>
          <article>
            <span>Inscrições</span>
            <strong>{totals.registrations}</strong>
          </article>
          <article>
            <span>Alunos únicos</span>
            <strong>{totals.students}</strong>
          </article>
        </div>

        {feedback ? <p className="admin-feedback">{feedback}</p> : null}

        <div className="admin-days">
          {days.map((day) => (
            <section className="admin-day-card" key={day.id}>
              <div className="admin-day-title">
                <span>{day.dateLabel}</span>
                <h2>{day.title}</h2>
              </div>

              <div className="admin-activity-list">
                {day.activities.map((activity) => {
                  const activityRegistrations =
                    registrationsByActivityId.get(activity.id) ?? [];
                  const isEditing = editingActivityId === activity.id;

                  return (
                    <article className="admin-activity-card" key={activity.id}>
                      <div className="admin-activity-header">
                        <div>
                          <span>{activity.time} • {activity.room}</span>
                          <h3>{activity.title}</h3>
                          <p>{activity.speakers.join(", ")}</p>
                        </div>

                        <strong>{activityRegistrations.length} / {activity.capacity}</strong>
                      </div>

                      {isEditing && activityForm ? (
                        <div className="admin-edit-grid">
                          <label>
                            <span>Título</span>
                            <input
                              value={activityForm.title}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? { ...currentForm, title: event.target.value }
                                    : currentForm,
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Palestrante(s)</span>
                            <input
                              value={activityForm.speakers}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? { ...currentForm, speakers: event.target.value }
                                    : currentForm,
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Sala</span>
                            <input
                              value={activityForm.room}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? { ...currentForm, room: event.target.value }
                                    : currentForm,
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Horário</span>
                            <input
                              value={activityForm.time}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? { ...currentForm, time: event.target.value }
                                    : currentForm,
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Vagas</span>
                            <input
                              value={activityForm.capacity}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? { ...currentForm, capacity: event.target.value }
                                    : currentForm,
                                )
                              }
                            />
                          </label>
                          <label>
                            <span>Período</span>
                            <select
                              value={activityForm.period}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? {
                                        ...currentForm,
                                        period: event.target.value as AcademicActivity["period"],
                                      }
                                    : currentForm,
                                )
                              }
                            >
                              <option value="Integral">Integral</option>
                              <option value="Noturno">Noturno</option>
                            </select>
                          </label>
                          <label className="admin-edit-full">
                            <span>Descrição</span>
                            <textarea
                              value={activityForm.description}
                              onChange={(event) =>
                                setActivityForm((currentForm) =>
                                  currentForm
                                    ? { ...currentForm, description: event.target.value }
                                    : currentForm,
                                )
                              }
                            />
                          </label>
                        </div>
                      ) : null}

                      <div className="admin-activity-actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSaveActivity(activity)}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingActivityId("");
                                setActivityForm(null);
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => startEditing(activity)}>
                            Editar atividade
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            generateActivityReportPdf(activity, activityRegistrations)
                          }
                        >
                          Gerar PDF
                        </button>
                      </div>

                      <div className="admin-registration-table-wrapper">
                        <table className="admin-registration-table">
                          <thead>
                            <tr>
                              <th>Aluno</th>
                              <th>Curso</th>
                              <th>Período</th>
                              <th>E-mail</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activityRegistrations.length > 0 ? (
                              activityRegistrations.map((registration) => (
                                <tr key={registration.id}>
                                  <td>{registration.studentName}</td>
                                  <td>{registration.studentCourseName}</td>
                                  <td>{registration.studentPeriod}</td>
                                  <td>{registration.studentEmail}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4}>Nenhum aluno inscrito.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
