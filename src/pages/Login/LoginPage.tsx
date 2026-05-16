import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { courseOptions, findCourseById } from "../../constants/courses";
import { auth, googleProvider, isFirebaseConfigured } from "../../lib/firebase";
import {
  getStudentProfile,
  saveStudentProfile,
} from "../../services/studentProfileService";
import type { StudentProfileFormData } from "../../types/student";
import { buildStudentPanelPath } from "../../utils/studentSlug";
import "./LoginPage.css";

type LoginStep = "google" | "profile";

const stepLabels: Record<LoginStep, string> = {
  google: "Etapa 1 de 2",
  profile: "Etapa 2 de 2",
};

const initialFormData: StudentProfileFormData = {
  fullName: "",
  courseId: "",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<LoginStep>("google");
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<StudentProfileFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const selectedCourse = useMemo(() => {
    if (!formData.courseId) {
      return undefined;
    }

    return findCourseById(formData.courseId);
  }, [formData.courseId]);

  useEffect(() => {
    if (!auth) {
      return undefined;
    }

    let isActive = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isActive) {
        return;
      }

      if (!firebaseUser) {
        setUser(null);
        setCurrentStep("google");
        return;
      }

      setUser(firebaseUser);

      try {
        const studentProfile = await getStudentProfile(firebaseUser.uid);

        if (!isActive) {
          return;
        }

        if (studentProfile) {
          navigate(`${buildStudentPanelPath(studentProfile.slug)}/inscricao`, { replace: true });
          return;
        }

        setCurrentStep("profile");
        setFormData((currentData) => ({
          ...currentData,
          fullName: currentData.fullName || firebaseUser.displayName || "",
        }));
      } catch {
        if (!isActive) {
          return;
        }

        setCurrentStep("profile");
        setFeedback("Não foi possível verificar seu cadastro. Complete seus dados para continuar.");
        setFormData((currentData) => ({
          ...currentData,
          fullName: currentData.fullName || firebaseUser.displayName || "",
        }));
      }
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [navigate]);

  async function handleGoogleLogin() {
    if (!auth) {
      setFeedback("Configure o Firebase antes de iniciar o login.");
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const studentProfile = await getStudentProfile(credential.user.uid);

      if (studentProfile) {
        navigate(`${buildStudentPanelPath(studentProfile.slug)}/inscricao`, { replace: true });
        return;
      }

      setUser(credential.user);
      setCurrentStep("profile");
      setFormData((currentData) => ({
        ...currentData,
        fullName: currentData.fullName || credential.user.displayName || "",
      }));
    } catch {
      setFeedback("Não foi possível entrar com Google. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      setFeedback("Faça login com Google antes de finalizar.");
      setCurrentStep("google");
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const studentProfile = await saveStudentProfile(user, formData);
      navigate(`${buildStudentPanelPath(studentProfile.slug)}/inscricao`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o login.";

      setFeedback(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-intro">
          <a className="login-back-link" href="/">
            Voltar para o início
          </a>

          <h1 id="login-title">Entre na Semana Acadêmica</h1>

          <p>
            Faça login com sua conta Google e complete seus dados para liberar
            sua inscrição nas palestras e oficinas.
          </p>

          <div className="login-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="login-card">
          <div className="login-progress" aria-label="Progresso do login">
            <div className="login-progress-header">
              <span>{stepLabels[currentStep]}</span>
              <strong>{currentStep === "google" ? "Login Google" : "Dados do aluno"}</strong>
            </div>

            <div className="login-stepper">
              <span className="login-stepper-dot active" />
              <span className={currentStep === "profile" ? "login-stepper-line active" : "login-stepper-line"} />
              <span className={currentStep === "profile" ? "login-stepper-dot active" : "login-stepper-dot"} />
            </div>
          </div>

          {!isFirebaseConfigured ? (
            <div className="login-alert">
              Configure as variáveis de ambiente do Firebase para ativar o login.
            </div>
          ) : null}

          {currentStep === "google" ? (
            <div className="login-step">
              <h2>Primeiro, confirme sua conta</h2>
              <p>
                O sistema usa apenas o Google para identificar o aluno antes da
                inscrição.
              </p>

              <button
                className="google-login-button"
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading || !isFirebaseConfigured}
              >
                <span className="google-icon" aria-hidden="true">
                  G
                </span>
                {isLoading ? "Conectando..." : "Entrar com Google"}
              </button>

              <button
                className="next-button"
                type="button"
                onClick={() => setCurrentStep(user ? "profile" : "google")}
                disabled={!user}
              >
                Próximo
              </button>
            </div>
          ) : (
            <form className="login-step" onSubmit={handleSubmit}>
              <h2>Agora complete seu perfil</h2>
              <p>
                Esses dados serão usados para organizar suas inscrições e filtrar
                atividades por período.
              </p>

              <label className="login-field">
                <span>Nome e sobrenome</span>
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="login-field">
                <span>Curso</span>
                <select
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Selecione seu curso</option>
                  {courseOptions.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="period-preview">
                <span>Período detectado</span>
                <strong>{selectedCourse?.period ?? "Selecione um curso"}</strong>
              </div>

              <div className="login-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setCurrentStep("google")}
                >
                  Voltar
                </button>

                <button className="finish-button" type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Finalizar Login"}
                </button>
              </div>
            </form>
          )}

          {feedback ? <p className="login-feedback">{feedback}</p> : null}
        </div>
      </section>
    </main>
  );
}
