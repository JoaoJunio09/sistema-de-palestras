import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/Home/HomePage";

const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
const InscriptionPage = lazy(() => import("./pages/Inscription/InscriptionPage"));
const AdminPage = lazy(() => import("./pages/Admin/AdminPage"));

function RoutesApp() {
	return (
		<BrowserRouter>
			<Suspense fallback={<div className="route-loading">Carregando...</div>}>
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/sac/admin" element={<AdminPage />} />
					<Route path="/:studentSlug/inscricao" element={<InscriptionPage />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	)
}

export default RoutesApp;
