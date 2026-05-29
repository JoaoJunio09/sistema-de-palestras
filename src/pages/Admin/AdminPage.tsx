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

type Filters = {
  dayId: string;
  shift: string;
  period: string;
  search: string;
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
      .map((s) => s.trim())
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

const SHIFT_LABELS: Record<string, string> = {
  slot0830: "8h30",
  slot1030: "10h30",
  night1930: "19h30",
  night2130: "21h30",
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState<AdminLoginForm>({ username: "", password: "" });
  const [days, setDays] = useState<AcademicDay[]>([]);
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);
  const [editingActivityId, setEditingActivityId] = useState("");
  const [activityForm, setActivityForm] = useState<ActivityFormData | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    dayId: "",
    shift: "",
    period: "",
    search: "",
  });

  const [appliedFilters, setAppliedFilters] = useState<Filters | null>(null);

  // ── derived data ──────────────────────────────────────────────────────────

  const registrationsByActivityId = useMemo(() => {
    const map = new Map<string, StudentRegistration[]>();
    registrations.forEach((reg) => {
      const current = map.get(reg.activityId) ?? [];
      map.set(reg.activityId, [...current, reg]);
    });
    return map;
  }, [registrations]);

  const allActivities = useMemo(
    () => days.flatMap((day) => day.activities),
    [days],
  );

  // Unique days / shifts / periods for filter dropdowns
  const filterOptions = useMemo(() => {
    const uniqueDays = days.map((d) => ({ id: d.id, label: `${d.dateLabel} — ${d.title}` }));
    const uniqueShifts = [...new Set(allActivities.map((a) => a.shift))];
    const uniquePeriods = [...new Set(allActivities.map((a) => a.period))];
    return { uniqueDays, uniqueShifts, uniquePeriods };
  }, [days, allActivities]);

  const totals = useMemo(() => ({
    activities: allActivities.length,
    registrations: registrations.length,
    students: new Set(registrations.map((r) => r.userId)).size,
  }), [allActivities, registrations]);

  // Filtered activities (only shown after "Aplicar filtros")
  const filteredActivities = useMemo(() => {
    if (!appliedFilters) return [];

    return allActivities.filter((activity) => {
      if (appliedFilters.dayId && activity.dayId !== appliedFilters.dayId) return false;
      if (appliedFilters.shift && activity.shift !== appliedFilters.shift) return false;
      if (appliedFilters.period && activity.period !== appliedFilters.period) return false;
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const matchTitle = activity.title.toLowerCase().includes(q);
        const matchSpeaker = activity.speakers.some((s) => s.toLowerCase().includes(q));
        const matchRoom = activity.room.toLowerCase().includes(q);
        if (!matchTitle && !matchSpeaker && !matchRoom) return false;
      }
      return true;
    });
  }, [allActivities, appliedFilters]);

  // ── data loading ──────────────────────────────────────────────────────────

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
      setHasLoaded(true);
    } catch {
      setFeedback("Não foi possível carregar os dados do painel.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── handlers ──────────────────────────────────────────────────────────────

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginForm.username !== ADMIN_USERNAME || loginForm.password !== ADMIN_PASSWORD) {
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
    setAppliedFilters(null);
    setHasLoaded(false);
  }

  function handleApplyFilters() {
    setAppliedFilters({ ...filters });
  }

  function handleClearFilters() {
    const empty: Filters = { dayId: "", shift: "", period: "", search: "" };
    setFilters(empty);
    setAppliedFilters(null);
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
          a.id === activity.id ? { ...a, ...updatedFields } : a,
        ),
      })),
    );

    setEditingActivityId("");
    setActivityForm(null);
    setFeedback("Atividade atualizada com sucesso.");
  }

  // ── login screen ──────────────────────────────────────────────────────────

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
                onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              />
            </label>
            <label>
              <span>Senha</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            <button type="submit">Entrar</button>
          </form>

          {feedback ? <p className="admin-feedback">{feedback}</p> : null}
        </section>
      </main>
    );
  }

  // ── main screen ───────────────────────────────────────────────────────────

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

        {/* Summary */}
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

        {/* Filters */}
        {hasLoaded && (
          <section className="admin-filters">
            <h2>Filtrar atividades</h2>

            <div className="admin-filters-grid">
              <label>
                <span>Dia</span>
                <select
                  value={filters.dayId}
                  onChange={(e) => setFilters((f) => ({ ...f, dayId: e.target.value }))}
                >
                  <option value="">Todos os dias</option>
                  {filterOptions.uniqueDays.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Horário</span>
                <select
                  value={filters.shift}
                  onChange={(e) => setFilters((f) => ({ ...f, shift: e.target.value }))}
                >
                  <option value="">Todos os horários</option>
                  {filterOptions.uniqueShifts.map((s) => (
                    <option key={s} value={s}>{SHIFT_LABELS[s] ?? s}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Período</span>
                <select
                  value={filters.period}
                  onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
                >
                  <option value="">Todos os períodos</option>
                  {filterOptions.uniquePeriods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Buscar</span>
                <input
                  placeholder="Palestra, palestrante ou sala..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                />
              </label>
            </div>

            <div className="admin-filters-actions">
              <button type="button" onClick={handleApplyFilters}>
                Aplicar filtros
              </button>
              <button type="button" onClick={handleClearFilters}>
                Limpar
              </button>
            </div>

            {appliedFilters && (
              <p className="admin-filter-result">
                {filteredActivities.length === 0
                  ? "Nenhuma atividade encontrada com esses filtros."
                  : `${filteredActivities.length} atividade(s) encontrada(s).`}
              </p>
            )}
          </section>
        )}

        {/* Activity list — only shown after filter is applied */}
        {appliedFilters && filteredActivities.length > 0 && (
          <div className="admin-days">
            {filteredActivities.map((activity) => {
              const activityRegistrations = registrationsByActivityId.get(activity.id) ?? [];
              const isEditing = editingActivityId === activity.id;
              const dayTitle = days.find((d) => d.id === activity.dayId)?.title ?? "";

              return (
                <article className="admin-activity-card" key={activity.id}>
                  <div className="admin-activity-header">
                    <div>
                      <span>
                        {activity.dateLabel} • {activity.time} • {activity.room} • {activity.period}
                        {dayTitle ? ` • ${dayTitle}` : ""}
                      </span>
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
                          onChange={(e) =>
                            setActivityForm((f) => f ? { ...f, title: e.target.value } : f)
                          }
                        />
                      </label>
                      <label>
                        <span>Palestrante(s)</span>
                        <input
                          value={activityForm.speakers}
                          onChange={(e) =>
                            setActivityForm((f) => f ? { ...f, speakers: e.target.value } : f)
                          }
                        />
                      </label>
                      <label>
                        <span>Sala</span>
                        <input
                          value={activityForm.room}
                          onChange={(e) =>
                            setActivityForm((f) => f ? { ...f, room: e.target.value } : f)
                          }
                        />
                      </label>
                      <label>
                        <span>Horário</span>
                        <input
                          value={activityForm.time}
                          onChange={(e) =>
                            setActivityForm((f) => f ? { ...f, time: e.target.value } : f)
                          }
                        />
                      </label>
                      <label>
                        <span>Vagas</span>
                        <input
                          value={activityForm.capacity}
                          onChange={(e) =>
                            setActivityForm((f) => f ? { ...f, capacity: e.target.value } : f)
                          }
                        />
                      </label>
                      <label>
                        <span>Período</span>
                        <select
                          value={activityForm.period}
                          onChange={(e) =>
                            setActivityForm((f) =>
                              f ? { ...f, period: e.target.value as AcademicActivity["period"] } : f,
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
                          onChange={(e) =>
                            setActivityForm((f) => f ? { ...f, description: e.target.value } : f)
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  <div className="admin-activity-actions">
                    {isEditing ? (
                      <>
                        <button type="button" onClick={() => void handleSaveActivity(activity)}>
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setEditingActivityId(""); setActivityForm(null); }}
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
                      onClick={() => generateActivityReportPdf(activity, activityRegistrations)}
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
                          activityRegistrations.map((reg) => (
                            <tr key={reg.id}>
                              <td>{reg.studentName}</td>
                              <td>{reg.studentCourseName}</td>
                              <td>{reg.studentPeriod}</td>
                              <td>{reg.studentEmail}</td>
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
        )}

        {/* Empty state before first filter */}
        {!appliedFilters && hasLoaded && (
          <div className="admin-empty-state">
            <p>Use os filtros acima para buscar atividades e visualizar inscrições.</p>
          </div>
        )}
      </section>
    </main>
  );
}
