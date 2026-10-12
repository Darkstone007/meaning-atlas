import { Link } from "@tanstack/react-router";

export function Landing() {
  return (
    <div className="atlas">
      <header>
        <div className="brand">
          Meaning Atlas
          <small>WORDS HOLD MORE THAN DEFINITIONS</small>
        </div>
        <nav aria-label="Main navigation">
          <Link to="/archive" search={{ start: undefined }} className="nav-link">
            Enter
          </Link>
          <Link to="/archive" search={{ start: "contribute" }} className="nav-link">
            Contribute
          </Link>
        </nav>
      </header>
      <main className="landing">
        <div>
          <span className="eyebrow">An archive shaped by the people who speak</span>
          <h1>
            A word is only
            <br />
            the beginning.
          </h1>
          <p className="intro">
            Someone names an expression and says what it means to them. That account stays theirs. Another person can use the same spelling and mean something else. A line between them appears only when they share a label you can read.
          </p>
          <div className="row landing-actions">
            <Link to="/archive" search={{ start: undefined }} className="primary nav-link">
              Enter the web
            </Link>
            <Link to="/archive" search={{ start: "contribute" }} className="nav-link">
              Add your voice
            </Link>
            <Link to="/archive" search={{ start: "method" }} className="nav-link">
              How a link is made
            </Link>
          </div>
          <p className="quiet landing-note">
            The contribution form is the survey. You can also bring a CSV export of that form. Writing is shown only with permission. Names are the ones people asked to show. Email and phone are not collected.
          </p>
        </div>
        <figure className="landing-figure">
          <svg viewBox="0 0 440 400" aria-hidden="true">
            <line x1="110" y1="72" x2="110" y2="148" stroke="#779081" strokeOpacity="0.75" />
            <line x1="330" y1="72" x2="330" y2="148" stroke="#779081" strokeOpacity="0.75" />
            <line x1="220" y1="292" x2="220" y2="348" stroke="#779081" strokeOpacity="0.75" />
            <line x1="166" y1="164" x2="266" y2="164" stroke="#c9b8f2" strokeDasharray="5 5" />
            <g className="landing-node word" fontSize="18" transform="translate(110 64)">
              <rect x="-52" y="-18" width="104" height="36" rx="9" />
              <text y="5">Massa</text>
            </g>
            <g className="landing-node word" fontSize="18" transform="translate(330 64)">
              <rect x="-52" y="-18" width="104" height="36" rx="9" />
              <text y="5">Massa</text>
            </g>
            <g className="landing-node" fontSize="13" transform="translate(110 164)">
              <rect x="-46" y="-16" width="92" height="32" rx="9" />
              <text y="4">Ndeye</text>
            </g>
            <g className="landing-node" fontSize="13" transform="translate(330 164)">
              <rect x="-58" y="-16" width="116" height="32" rx="9" />
              <text y="4">Khadidjatou</text>
            </g>
            <g className="landing-node word wide" fontSize="18" transform="translate(220 276)">
              <rect x="-88" y="-18" width="176" height="36" rx="9" />
              <text y="5">Čist račun</text>
            </g>
            <g className="landing-node" fontSize="13" transform="translate(220 364)">
              <rect x="-36" y="-16" width="72" height="32" rx="9" />
              <text y="4">Lana</text>
            </g>
          </svg>
          <figcaption>
            Solid: a response branch. Dashed: a shared label, not a translation.
          </figcaption>
        </figure>
        <ol className="landing-rules">
          <li>
            <strong>The word</strong>
            <span>The entrance. Same spelling can still be two words when the language or community label differs.</span>
          </li>
          <li>
            <strong>The account</strong>
            <span>One person’s meaning, example, feeling, and what changes when they explain it. Accounts are not merged.</span>
          </li>
          <li>
            <strong>The layer</strong>
            <span>Feeling, context, or intention. The line names the shared label. It does not claim the meanings are the same.</span>
          </li>
        </ol>
      </main>
      <footer>Original accounts stay distinct. A shared label is not a translation.</footer>
    </div>
  );
}
