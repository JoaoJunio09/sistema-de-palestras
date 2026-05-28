import { Link } from "react-router-dom";
import { homePageContent } from "../../content/HomeContent";

import './Home.css';

import logo from '../../assets/WhatsApp_Image_2026-05-25_at_11.07.57-removebg-preview.png';

function Home() {
	return (
		<main className="home-page">
      <section className="hero-section" aria-labelledby="home-title">
        <div className="hero-content">
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: -50 }}>
            <img src={logo} alt="" style={{ width: 200 }} />
          </div>
          <h1 id="home-title">{homePageContent.title}</h1>

          <p>{homePageContent.description}</p>

          <div className="hero-actions">
            <Link className="hero-cta" to={homePageContent.ctaHref}>
              {homePageContent.ctaLabel}
            </Link>

            <Link className="hero-cta hero-cta-secondary" to="/login">
              Já estou inscrito, entrar
            </Link>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-card visual-card-primary">
            <span>ETEC Frei Arnaldo Maria de Itaporanga</span>
            <strong>2026</strong>
          </div>

          <div className="visual-card visual-card-secondary">
            <span>Palestras</span>
            <span>Oficinas</span>
            <span>Futuro</span>
          </div>

          <div className="visual-line visual-line-one" />
          <div className="visual-line visual-line-two" />
        </div>
      </section>
    </main>
	)
}

export default Home;
