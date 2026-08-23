import { CSSProperties, lazy, PointerEvent, ReactNode, Suspense, useEffect, useRef, useState } from "react";

const LazyThreeShelf = lazy(() =>
  import("./ThreeShelf").then((module) => ({ default: module.ThreeShelf })),
);

type Direction = "center" | "left" | "right" | "up" | "down" | "up-left" | "up-right" | "down-left" | "down-right";
type Section = { id: string; title: string; body: ReactNode };
type Book = {
  title: string;
  label: string;
  note: string;
  color: string;
  accent: string;
  author?: string;
  isbn?: string;
  cover?: string;
  coverAlt?: string;
  featured?: boolean;
};

const faceFrames: Direction[] = ["center", "left", "right", "up", "down", "up-left", "up-right", "down-left", "down-right"];

const career = [
  {
    company: "Northstar Systems",
    role: "Principal Product Architect",
    period: "2023 — Present",
    place: "Copenhagen, Denmark",
    highlights: [
      "Shapes product and platform strategy across a distributed suite of customer-facing services.",
      "Creates simple architectural guardrails that help teams make consistent decisions independently.",
      "Explores practical uses of AI agents in research, documentation, and operational workflows.",
    ],
  },
  {
    company: "Fieldnote Labs",
    role: "Staff Software Architect",
    period: "2020 — 2023",
    place: "Remote",
    highlights: [
      "Led the transition from a monolith to domain-oriented services and an event-driven platform.",
      "Partnered with product teams on discovery, technical strategy, and incremental modernization.",
    ],
  },
  {
    company: "Civic Grid",
    role: "Senior Software Engineer",
    period: "2017 — 2020",
    place: "Amsterdam, Netherlands",
    highlights: [
      "Built accessible data products that helped city teams understand mobility and energy usage.",
      "Introduced shared frontend foundations, automated delivery, and observability practices.",
    ],
  },
  {
    company: "Paper Kite Studio",
    role: "Software Engineer",
    period: "2014 — 2017",
    place: "Singapore",
    highlights: [
      "Delivered web applications for early-stage teams and public-interest organisations.",
      "Turned ambiguous product ideas into testable prototypes and maintainable software.",
    ],
  },
];

const books: Book[] = [
  {
    title: "Systems That Scale",
    author: "Rowan Hale",
    label: "Architecture 01",
    note: "A fictional field guide to making distributed systems easier to reason about as teams, traffic, and constraints grow.",
    color: "#1ea6be",
    accent: "#10242a",
  },
  {
    title: "The Useful Boundary",
    author: "Cora Vale",
    label: "Domain design",
    note: "A fictional exploration of boundaries, language, ownership, and the small design choices that keep complex domains coherent.",
    color: "#d84d39",
    accent: "#fff4e6",
  },
  {
    title: "Designing for Change",
    author: "Imani Brooks",
    label: "Enterprise design",
    note: "A fictional handbook for connecting strategy, operating models, platforms, and change without freezing an organisation in place.",
    color: "#eae6dc",
    accent: "#175b57",
  },
  {
    title: "Quiet Interfaces",
    author: "Leo Park",
    label: "Product design",
    note: "A fictional collection of principles for creating calm, legible interfaces that reveal complexity only when it becomes useful.",
    color: "#161c29",
    accent: "#edf5f5",
  },
  {
    title: "The Shape of Information",
    author: "Mina Cole",
    label: "Information architecture",
    note: "A fictional guide to organising, labelling, navigating, and searching information across products and digital ecosystems.",
    color: "#766da5",
    accent: "#fffdf7",
  },
  {
    title: "Agents at Work",
    author: "Nia Foster",
    label: "Featured AI field guide",
    note: "A fictional, practical introduction to tools, memory, workflows, evaluation, and responsible human oversight for useful AI agents.",
    color: "#ee532b",
    accent: "#fff7e9",
    featured: true,
  },
  {
    title: "Durable Decisions",
    author: "Owen Reed",
    label: "Systems thinking",
    note: "A fictional set of tools for identifying trade-offs, recording intent, and making decisions that age gracefully.",
    color: "#d61f3a",
    accent: "#fff9f1",
  },
  {
    title: "Small Tools, Big Leverage",
    author: "Ava Stone",
    label: "Creative engineering",
    note: "A fictional collection of practical habits for building adaptable tools, learning quickly, and preserving momentum.",
    color: "#2c2822",
    accent: "#f3ead8",
  },
  {
    title: "Everyday Experiments",
    author: "Sofia Lin",
    label: "Popular read",
    note: "A fictional invitation to turn large ambitions into small, observable experiments and learn from ordinary days.",
    color: "#f0ede2",
    accent: "#b52d2d",
  },
];

function CursorPortrait() {
  const portrait = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = frame.current;
    if (!image) return;
    const ring: Exclude<Direction, "center">[] = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
    const endpoint = (direction: Direction) => `/assets/portrait/frames/${direction}.jpg`;
    const between = (direction: Exclude<Direction, "center">, _step: number) => endpoint(direction);
    const orbitFrame = (_from: Exclude<Direction, "center">, to: Exclude<Direction, "center">, _step: number) => endpoint(to);
    const motionSteps = [1];
    const orbitSteps = [1];
    const orbitPairs = ring.map((direction, index) => [direction, ring[(index + 1) % ring.length]] as const);
    const assets = [...faceFrames.map(endpoint), ...ring.flatMap((direction) => motionSteps.map((step) => between(direction, step))), ...orbitPairs.flatMap(([from, to]) => orbitSteps.map((step) => orbitFrame(from, to, step)))];
    let current: Direction = "center";
    let requested: Direction = "center";
    let animating = false;
    let timer = 0;
    let disposed = false;

    const directionForPoint = (clientX: number, clientY: number): Direction => {
      const bounds = portrait.current?.getBoundingClientRect();
      if (!bounds) return "center";
      const dx = clientX - (bounds.left + bounds.width / 2);
      const dy = clientY - (bounds.top + bounds.height / 2);
      if (Math.hypot(dx, dy) < 54) return "center";
      const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
      return ring[Math.round(angle / (Math.PI / 4)) % ring.length];
    };

    const framesAroundRing = (from: Exclude<Direction, "center">, to: Exclude<Direction, "center">) => {
      const fromIndex = ring.indexOf(from);
      const toIndex = ring.indexOf(to);
      const forwardDistance = (toIndex - fromIndex + ring.length) % ring.length;
      const backwardDistance = (fromIndex - toIndex + ring.length) % ring.length;
      const step = forwardDistance <= backwardDistance ? 1 : -1;
      const sequence: string[] = [];
      let index = fromIndex;
      while (index !== toIndex) {
        const nextIndex = (index + step + ring.length) % ring.length;
        const currentDirection = ring[index];
        const nextDirection = ring[nextIndex];
        if (step === 1) {
          sequence.push(...orbitSteps.map((frameStep) => orbitFrame(currentDirection, nextDirection, frameStep)), endpoint(nextDirection));
        } else {
          sequence.push(...[...orbitSteps].reverse().map((frameStep) => orbitFrame(nextDirection, currentDirection, frameStep)), endpoint(nextDirection));
        }
        index = nextIndex;
      }
      return sequence;
    };

    const framesFor = (from: Direction, to: Direction) => {
      if (from === to) return [];
      if (from === "center") {
        const direction = to as Exclude<Direction, "center">;
        return [...motionSteps.map((step) => between(direction, step)), endpoint(direction)];
      }
      if (to === "center") {
        const direction = from as Exclude<Direction, "center">;
        return [...[...motionSteps].reverse().map((step) => between(direction, step)), endpoint("center")];
      }
      const leaving = from as Exclude<Direction, "center">;
      const arriving = to as Exclude<Direction, "center">;
      return framesAroundRing(leaving, arriving);
    };

    const play = (target: Direction) => {
      if (disposed || animating || target === current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        image.src = endpoint(target);
        current = target;
        portrait.current?.setAttribute("data-direction", target);
        return;
      }
      animating = true;
      const sequence = framesFor(current, target);
      let index = 0;
      const tick = () => {
        if (disposed) return;
        image.src = sequence[index];
        index += 1;
        if (index < sequence.length) {
          timer = window.setTimeout(tick, 28);
          return;
        }
        current = target;
        animating = false;
        portrait.current?.setAttribute("data-direction", current);
        if (requested !== current) play(requested);
      };
      tick();
    };

    const preloaded = assets.map((src) => {
      const asset = new Image();
      asset.src = src;
      return asset.decode().catch(() => undefined);
    });
    const follow = (event: globalThis.PointerEvent) => {
      requested = directionForPoint(event.clientX, event.clientY);
      if (!animating) play(requested);
    };
    const reset = () => { requested = "center"; if (!animating) play("center"); };
    Promise.all(preloaded).then(() => {
      if (disposed) return;
      portrait.current?.setAttribute("data-ready", "true");
      window.addEventListener("pointermove", follow, { passive: true });
      document.addEventListener("mouseleave", reset);
    });
    return () => {
      disposed = true;
      window.removeEventListener("pointermove", follow);
      document.removeEventListener("mouseleave", reset);
      window.clearTimeout(timer);
    };
  }, []);

  return <div className="portrait" ref={portrait} data-direction="center">
    <img ref={frame} src="/assets/portrait/frames/center.jpg" alt="Fictional portrait of Maya Chen following the cursor" width="320" height="320" fetchPriority="high" />
  </div>;
}

function BookShelf() {
  const [selected, setSelected] = useState(2);
  const [hovered, setHovered] = useState<number | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [rotation, setRotation] = useState({ x: -8, y: -24 });
  const [spinning, setSpinning] = useState(true);
  const shelf = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, x: 0, y: 0, selected: 0, rotationX: 0, rotationY: 0, moved: false });
  const choose = (index: number) => setSelected((index + books.length) % books.length);
  const moveSelection = (direction: -1 | 1) => choose(selected + direction);

  const startShelfDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, x: event.clientX, y: event.clientY, selected, rotationX: rotation.x, rotationY: rotation.y, moved: false };
    shelf.current?.setPointerCapture(event.pointerId);
  };
  const moveShelfDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const delta = event.clientX - drag.current.x;
    if (Math.abs(delta) > 8) drag.current.moved = true;
    choose(drag.current.selected - Math.round(delta / 68));
  };
  const startInspectDrag = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { active: true, x: event.clientX, y: event.clientY, selected, rotationX: rotation.x, rotationY: rotation.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSpinning(false);
  };
  const moveInspectDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    setRotation({ x: Math.max(-55, Math.min(55, drag.current.rotationX - (event.clientY - drag.current.y) * .32)), y: drag.current.rotationY + (event.clientX - drag.current.x) * .45 });
  };
  const release = () => { drag.current.active = false; };
  const book = books[selected];
  const previewIndex = hovered ?? selected;
  const previewBook = books[previewIndex];
  const inspectBook = (index = previewIndex) => {
    choose(index);
    setHovered(null);
    setInspecting(true);
  };

  if (inspecting) return <div className="book-inspector" style={{ "--book": book.color, "--book-ink": book.accent } as CSSProperties}>
    <div className="inspector-bar"><button onClick={() => setInspecting(false)}>← Back to shelf</button><span>Drag to rotate · double-click for auto-spin</span></div>
    <div className="inspect-stage" onPointerDown={startInspectDrag} onPointerMove={moveInspectDrag} onPointerUp={release} onPointerCancel={release} onDoubleClick={() => setSpinning((value) => !value)}>
      <div className={`inspect-auto ${spinning ? "spinning" : ""}`}><div className="inspect-book" style={{ "--rx": `${rotation.x}deg`, "--ry": `${rotation.y}deg` } as CSSProperties}>
        <div className="inspect-face inspect-front"><small>{book.label}</small><b>{book.title}</b><i>CURSOR &amp; COVERS / FIELD NOTES</i></div>
        <div className="inspect-face inspect-back"><small>FIELD NOTE {String(selected + 1).padStart(2, "0")}</small><p>{book.note}</p><i>DEMO EDITION · 2026</i></div>
        <div className="inspect-face inspect-spine"><b>{book.title}</b></div><div className="inspect-face inspect-pages" /><div className="inspect-face inspect-top" /><div className="inspect-face inspect-bottom" />
      </div></div>
    </div>
    <div className="inspect-copy"><span>{String(selected + 1).padStart(2, "0")} / {String(books.length).padStart(2, "0")}</span><h3>{book.title}</h3><p>{book.note}</p></div>
  </div>;

  return <div className="bookshelf-wrap">
    <div className="shelf-lead"><p>Hover a volume to open its field note. Click the open book to lift it into the 3D inspector, or drag the shelf to browse.</p><div><button onClick={() => moveSelection(-1)} aria-label="Previous dossier">←</button><span>{String(selected + 1).padStart(2, "0")} / {String(books.length).padStart(2, "0")}</span><button onClick={() => moveSelection(1)} aria-label="Next dossier">→</button></div></div>
    <div className={`bookshelf ${hovered !== null ? "has-hover" : ""}`} ref={shelf} role="listbox" aria-label="Architecture practice dossiers" tabIndex={0} onKeyDown={(event) => { if (event.key === "ArrowLeft") moveSelection(-1); if (event.key === "ArrowRight") moveSelection(1); if (event.key === "Enter") inspectBook(); }} onPointerDown={startShelfDrag} onPointerMove={moveShelfDrag} onPointerUp={release} onPointerCancel={release}>
      <div className="shelf-depth" />
      <aside id="shelf-preview" className={`shelf-hover-card ${hovered !== null ? "visible" : ""}`} aria-live="polite">
        <span>{previewBook.label}</span><h3>{previewBook.title}</h3><p>{previewBook.note}</p><small>Click the open volume to inspect it in 3D</small>
      </aside>
      {books.map((item, index) => {
        let offset = index - selected;
        if (offset > books.length / 2) offset -= books.length;
        if (offset < -books.length / 2) offset += books.length;
        const distance = Math.abs(offset);
        const style = { "--book": item.color, "--book-ink": item.accent, "--x": `${offset * 75}px`, "--z": `${95 - distance * 42}px`, "--ry": `${offset * -10}deg`, "--scale": String(1 - Math.min(distance, 4) * .05), "--order": String(20 - distance) } as CSSProperties;
        return <button key={item.title} className={`shelf-book ${selected === index ? "selected" : ""} ${hovered === index ? "hovered" : ""}`} style={style} onPointerEnter={() => { if (!drag.current.active) setHovered(index); }} onPointerLeave={() => setHovered((current) => current === index ? null : current)} onFocus={() => setHovered(index)} onBlur={() => setHovered((current) => current === index ? null : current)} onClick={(event) => { event.stopPropagation(); if (!drag.current.moved) inspectBook(index); }} role="option" aria-selected={selected === index} aria-describedby="shelf-preview">
          <span className="cover-inside"><small>{item.label}</small><b>{item.title}</b><em>{item.note}</em></span><span className="cover-front"><small>{item.label}</small><b>{item.title}</b><i>C&amp;C · {String(index + 1).padStart(2, "0")}</i></span><span className="cover-spine"><b>{item.title}</b></span><span className="cover-pages" /><span className="cover-top" />
        </button>;
      })}
    </div>
    <div className="shelf-board"><span /></div>
    <div className="shelf-note"><div><span>{hovered === null ? "Selected dossier" : "Open dossier"}</span><h3>{previewBook.title}</h3></div><p>{previewBook.note}</p><button onClick={() => inspectBook()}>Inspect in 3D ↗</button></div>
  </div>;
}

function Career() {
  return <div className="career-list">{career.map((job, index) => <article className="career-entry" key={job.company}>
    <div className="career-index">{String(index + 1).padStart(2, "0")}</div>
    <div className="career-heading"><div><h3>{job.company}</h3><p>{job.role}</p></div><div><span>{job.period}</span><small>{job.place}</small></div></div>
    <ul>{job.highlights.map((item) => <li key={item}>{item}</li>)}</ul>
  </article>)}</div>;
}

export default function App() {
  const [palette, setPalette] = useState<"color" | "mono">("mono");
  const [open, setOpen] = useState("bookshelf");
  const [contactOpen, setContactOpen] = useState(false);
  useEffect(() => { document.documentElement.dataset.palette = palette; }, [palette]);

  const sections: Section[] = [
    { id: "about", title: "About", body: <div className="about-grid"><p className="about-lead">I’m Maya Chen, a fictional product architect used to demonstrate this open-source portfolio starter.</p><div><p>I help teams turn complex product and technology landscapes into clear systems, useful boundaries, and decisions people can act on. My current interests include platform strategy, information architecture, and responsible AI products.</p><dl><div><dt>Base</dt><dd>Copenhagen, Denmark</dd></div><div><dt>Languages</dt><dd>English · Mandarin · Danish</dd></div><div><dt>Focus</dt><dd>Product architecture · Platforms · Responsible AI</dd></div></dl></div></div> },
    { id: "career", title: "Career", body: <Career /> },
    { id: "capabilities", title: "Capabilities", body: <div className="capability-grid"><article><span>01 / Architecture</span><h3>Direction before diagrams.</h3><p>Product strategy, domain modeling, target states, decision records, and standards that teams can actually use.</p></article><article><span>02 / Platforms</span><h3>Build the shared path.</h3><p>Platform boundaries, developer experience, service ownership, APIs, and evolutionary modernization.</p></article><article><span>03 / Information</span><h3>Make systems legible.</h3><p>Content models, navigation, taxonomy, portfolio maps, and evidence that supports better decisions.</p></article><article><span>04 / Responsible AI</span><h3>Explore with guardrails.</h3><p>Useful agent workflows, human oversight, evaluation, privacy, and accountable product delivery.</p></article></div> },
    { id: "credentials", title: "Education & credentials", body: <div className="credentials"><div><span>Education</span><article><h3>MSc, Human-Centered Computing</h3><p>Northbridge Institute · 2012—2014</p></article><article><h3>BSc, Computer Science</h3><p>Harbour College · 2008—2012</p></article></div><div><span>Practice areas</span><ul><li>Product and platform architecture</li><li>Domain-driven design</li><li>Cloud-native systems</li><li>Information architecture</li><li>Responsible AI delivery</li><li>Technical facilitation</li></ul></div></div> },
    { id: "bookshelf", title: "Reading library", body: <Suspense fallback={<div className="shelf-loading" role="status">Preparing the 3D library…</div>}><LazyThreeShelf books={books} /></Suspense> },
  ];

  return <div className="site-shell">
    <main>
      <section className="hero" id="top"><div className="hero-topline"><CursorPortrait /><button className="palette-toggle" onClick={() => setPalette(palette === "color" ? "mono" : "color")} aria-label={`Switch to ${palette === "color" ? "monochrome" : "color"} mode`}><span className="toggle-dot" />{palette === "color" ? "Mono" : "Color"}</button></div><div className="hero-copy"><h1>Maya Chen</h1><p className="hero-summary">I turn complex product and technology landscapes into <em>clear systems</em>, useful boundaries, and decisions teams can act on.</p></div>
      </section>
      <section className="accordion-list">{sections.map((section) => { const isOpen = open === section.id; return <section className={`accordion ${isOpen ? "open" : ""}`} id={section.id} key={section.id}><button className="accordion-trigger" onClick={() => setOpen(isOpen ? "" : section.id)} aria-expanded={isOpen}><span className="chevron">›</span><h2>{section.title}</h2><small>{isOpen ? "Close" : "Open"}</small></button><div className="accordion-panel" aria-hidden={!isOpen}><div>{section.id !== "bookshelf" || isOpen ? section.body : null}</div></div></section>; })}</section>
      <section className="contact"><span>Architecture · transformation · advisory</span><h2>Building a clearer<br />technology future?</h2><p>Let’s discuss the landscape, the decisions, and the path forward.</p><button onClick={() => setContactOpen(true)}>How I can help ↗</button></section>
    </main>
    <footer><span>© 2026 Maya Chen · Demo profile</span><nav><a href="https://github.com/your-handle" target="_blank" rel="noreferrer">GitHub ↗</a><a href="mailto:hello@example.com">Email ↗</a></nav><a href="#top">Top ↑</a></footer>
    {contactOpen && <div className="modal-backdrop" onMouseDown={() => setContactOpen(false)}><div className="contact-card" role="dialog" aria-modal="true" aria-labelledby="contact-title" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setContactOpen(false)} aria-label="Close">×</button><span>Product architecture & systems design</span><h2 id="contact-title">Let’s make complexity navigable.</h2><p>This is fictional demonstration content. Replace it with a short invitation that suits your own work and audience.</p><a href="mailto:hello@example.com?subject=Portfolio%20conversation">hello@example.com <b>↗</b></a></div></div>}
  </div>;
}
