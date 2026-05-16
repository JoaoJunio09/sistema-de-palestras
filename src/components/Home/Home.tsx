import { homePageContent } from "../../content/HomeContent";

import './Home.css';

function Home() {
	return (
		<main className="home-page">
      <section className="hero-section" aria-labelledby="home-title">
        <div className="hero-content">
          <h1 id="home-title">{homePageContent.title}</h1>

          <p>{homePageContent.description}</p>

          <a className="hero-cta" href={homePageContent.ctaHref}>
            {homePageContent.ctaLabel}
          </a>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-card visual-card-primary">
            <span>ETEC - Frei Arnaldo Maria de Itaporanga</span>
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