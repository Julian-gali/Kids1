/**
 * OptoKids — SPA Router & Application Logic
 * Manages view navigation, animations, case counter state,
 * and the full clinical case module.
 */

(function () {
  'use strict';

  // Si no estamos en el navegador (ej. durante el build en Node.js o Vercel), evitamos cualquier ejecución
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // ─── State ────────────────────────────────────────────────
  const state = {
    currentView: 'inicio',
    casesResolved: 0,
    casesData: [],
    currentCaseIndex: 0,
    selectedOption: null,
    evaluated: false,
  };

  // ─── DOM References ───────────────────────────────────────
  let $, $$;

  // Referencias UI declaradas con let (se asignan dentro de initDOMReferences)
  let header, counterValue, btnStart, btnLearnMore;
  let navLinks = [];
  let views = [];

  // Referencias del módulo de casos clínicos (declaradas con let)
  let caseTitle, caseCurrent, caseTotal;
  let fieldEdad, fieldMotivo, fieldAntecedentes;
  let fieldCoverTest, fieldMotilidad;
  let fieldAgudeza, fieldRetinoscopia;
  let radioGroup, textarea, btnEvaluate, evaluateBtnWrapper;
  let feedbackPanel, feedbackBanner;
  let feedbackIcon, feedbackTitle, feedbackSubtitle;
  let feedbackStudentAnswer, feedbackCorrect, feedbackJustification, feedbackBiblio;
  let btnNextCase, btnNextLabel;

  /**
   * Inicializa todas las referencias al DOM.
   * Solo se ejecuta en el navegador una vez el DOM esté disponible.
   */
  function initDOMReferences() {
    if (typeof document === 'undefined') return;

    $ = (sel) => document.querySelector(sel);
    $$ = (sel) => document.querySelectorAll(sel);

    header       = $('#app-header');
    counterValue = $('#counter-value');
    btnStart     = $('#btn-start-cases');
    btnLearnMore = $('#btn-learn-more');
    navLinks     = $$('.nav-link[data-view]');
    views        = $$('.view[data-view]');

    // Módulo de Casos Clínicos
    caseTitle      = $('#case-title');
    caseCurrent    = $('#case-current-num');
    caseTotal      = $('#case-total-num');
    fieldEdad      = $('#field-edad');
    fieldMotivo    = $('#field-motivo');
    fieldAntecedentes = $('#field-antecedentes');
    fieldCoverTest = $('#field-cover-test');
    fieldMotilidad = $('#field-motilidad');
    fieldAgudeza   = $('#field-agudeza');
    fieldRetinoscopia = $('#field-retinoscopia');
    radioGroup     = $('#radio-group-conduct');
    textarea       = $('#textarea-justification');
    btnEvaluate    = $('#btn-evaluate');
    evaluateBtnWrapper = $('#evaluate-btn-wrapper');
    feedbackPanel  = $('#feedback-panel');
    feedbackBanner = $('#feedback-banner');
    feedbackIcon   = $('#feedback-icon');
    feedbackTitle  = $('#feedback-title');
    feedbackSubtitle = $('#feedback-subtitle');
    feedbackStudentAnswer = $('#feedback-student-answer');
    feedbackCorrect       = $('#feedback-correct');
    feedbackJustification = $('#feedback-justification');
    feedbackBiblio        = $('#feedback-biblio');
    btnNextCase    = $('#btn-next-case');
    btnNextLabel   = $('#btn-next-label');
  }

  // Alias para mantener compatibilidad
  const cacheCaseDom = initDOMReferences;
  const cacheMainDom = initDOMReferences;


  // ─── SPA Router ───────────────────────────────────────────

  /**
   * Navigate to a view by name.
   * @param {string} viewName — must match a [data-view] attribute.
   */
  function navigateTo(viewName) {
    if (viewName === state.currentView) return;

    // 1. Hide current view
    views.forEach((v) => {
      if (v.classList.contains('visible')) {
        v.classList.remove('visible');
        // Wait for fade-out, then remove 'active'
        setTimeout(() => {
          v.classList.remove('active');
          showView(viewName);
        }, 250);
      }
    });

    // Update nav links
    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.view === viewName);
    });

    state.currentView = viewName;
    window.location.hash = viewName;

    // If navigating to cases, load the current case
    if (viewName === 'casos') {
      setTimeout(() => loadCurrentCase(), 300);
    }
  }

  /**
   * Show a specific view with enter animation.
   * @param {string} viewName
   */
  function showView(viewName) {
    const target = $(`#view-${viewName}`);
    if (!target) return;

    target.classList.add('active');
    // Force reflow so the transition fires
    void target.offsetWidth;
    target.classList.add('visible');

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Read hash and navigate on load / popstate.
   */
  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'inicio';
    const valid = $(`#view-${hash}`);
    if (valid) {
      // Direct show on initial load (no animation needed)
      views.forEach((v) => {
        v.classList.remove('active', 'visible');
      });
      const target = $(`#view-${hash}`);
      target.classList.add('active');
      void target.offsetWidth;
      target.classList.add('visible');

      navLinks.forEach((link) => {
        link.classList.toggle('active', link.dataset.view === hash);
      });

      state.currentView = hash;

      // Load case if starting on cases view
      if (hash === 'casos') {
        loadCurrentCase();
      }
    }
  }

  // ─── Case Counter ─────────────────────────────────────────

  /**
   * Load resolved count from sessionStorage (resets on page refresh).
   */
  function loadCounter() {
    const saved = sessionStorage.getItem('optokids_resolved');
    state.casesResolved = saved ? parseInt(saved, 10) : 0;
    renderCounter();
  }

  /**
   * Increment counter and persist in sessionStorage.
   */
  function incrementCounter() {
    state.casesResolved += 1;
    sessionStorage.setItem('optokids_resolved', state.casesResolved);
    renderCounter(true);
  }

  /**
   * Render the counter value with optional pop animation.
   * @param {boolean} animate
   */
  function renderCounter(animate = false) {
    counterValue.textContent = state.casesResolved;

    if (animate) {
      counterValue.style.transition = 'transform 0.2s cubic-bezier(0.22,1,0.36,1)';
      counterValue.style.transform = 'scale(1.35)';
      setTimeout(() => {
        counterValue.style.transform = 'scale(1)';
      }, 200);
    }
  }

  // Make increment available globally so future case modules can call it
  if (typeof window !== 'undefined') {
    window.OptoKids = window.OptoKids || {};
    window.OptoKids.incrementCounter = incrementCounter;
    window.OptoKids.navigateTo = navigateTo;
  }

  // ─── Header Scroll Effect ────────────────────────────────

  function handleScroll() {
    header.classList.toggle('scrolled', window.scrollY > 10);
  }

  // ─── Smooth scroll to info section ────────────────────────

  function scrollToInfo() {
    const infoSection = $('#info-section');
    if (infoSection) {
      infoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }


  // ═════════════════════════════════════════════════════════
  //  CASE MODULE
  // ═════════════════════════════════════════════════════════

  /**
   * Helper to strip citation markers like [cite: 1] from text.
   */
  function cleanCite(text) {
    if (!text) return '—';
    return text.replace(/\[cite:[^\]]*\]/gi, '').trim();
  }

  /**
   * Load clinical cases from the JSON file.
   */
  // ── Casos clínicos predeterminados actualizados (garantiza funcionamiento offline o sin servidor local) ──
  const DEFAULT_CASES_DATA = [
    {
      "id": "1",
      "titulo": "Discapacidad Visual de Origen Cortical sin Ambliopía Concurrente",
      "edad": "5 años",
      "motivo_consulta": "Remisión especializada por déficit en el neurodesarrollo visual y alteraciones de la integración visomotora.",
      "antecedentes": "Producto de embarazo gemelar heterocigoto (37 semanas), bajo peso al nacer (percentil 10). Antecedente materno de preeclampsia. Encefalopatía hipóxico-isquémica perinatal leve (estadio 1 de Sarnat), alteraciones de la vía visual posterior y dispraxia.",
      "examen_motor": {
        "cover_test": "Ortoforia, sin evidencia clínica de estrabismo manifiesto o latente.",
        "motilidad": "Dificultad en la coordinación motora fina y gruesa (dispraxia), sin disfunciones oculomotoras primarias asociadas."
      },
      "refraccion": {
        "agudeza_visual": "Agudeza visual mejor corregida (AVMC): OD 2/10 (20/100); OI 5/10 (20/40).",
        "retinoscopia": "Astigmatismo hipermetrópico compuesto con la regla bilateral. Refracción bajo cicloplejía OD +1.00 -0.50 x 170°; OI +1.25 -0.75 x 10°."
      },
      "opciones_conducta": [
        "Observación clínica estricta sin prescripción óptica",
        "Prescripción óptica total y oclusión terapéutica del ojo dominante",
        "Terapia neurosensorial exclusiva sin penalización oclusiva"
      ],
      "conducta_correcta": "Prescripción óptica total y oclusión terapéutica del ojo dominante.",
      "justificacion_clinica": "El abordaje neuro-optométrico mediante prescripción no ciclopléjica y oclusión secundaria diaria del ojo con mejor visión durante 8 meses, en sinergia con estimulación visual, optimizó la neuroplasticidad de las vías visuales posquiasmáticas, incrementando la AVCC OD 6/10 (20/33) ; OI 8/10 (20/25) a pesar de la ausencia de ambliopía clásica.",
      "bibliografia": "Sica A, Michieletto P, Pensiero S, Barbi E. Successful treatment of cortical visual impairment in children using anti-amblyopia treatment despite the absence of amblyopia: a case report. Ital J Pediatr. 2024;50(1):123."
    },
    {
      "id": "2",
      "titulo": "Endotropía Acomodativa Refractiva y Ambliopía Anisometrópica",
      "edad": "9 meses",
      "motivo_consulta": "Endodesviación del ojo derecho advertida por los padres desde los 4 meses de edad.",
      "antecedentes": "Nacido a término con neurodesarrollo normotípico. Sin antecedentes sistémicos, historia familiar de estrabismo o ambliopía.",
      "examen_motor": {
        "cover_test": "Endotropía intermitente del ojo derecho de 30-35 dioptrías prismáticas (DP), de mayor magnitud en visión próxima.",
        "motilidad": "Versiones y ducciones completas. Presencia de tortícolis compensatoria hacia la derecha con preferencia de fijación cruzada a la izquierda."
      },
      "refraccion": {
        "agudeza_visual": "Fijación central, estable y mantenida (CSM) en OD, pero con endodesviación manifiesta.",
        "retinoscopia": "Refracción bajo cicloplejía: OD +4.75 -0.75 x 175°; OI +2.25 -0.75 x 175°."
      },
      "opciones_conducta": [
        "Intervención quirúrgica temprana de musculatura extraocular",
        "Prescripción óptica total bajo cicloplejía, terapia ortóptica y penalización oclusiva",
        "Quimiodenervación de rectos medios con toxina botulínica"
      ],
      "conducta_correcta": "Prescripción óptica total bajo cicloplejía, terapia ortóptica y penalización oclusiva.",
      "justificacion_clinica": "La corrección óptica oportuna del defecto anisometrópico hipermetrópico mitiga la convergencia acomodativa excesiva, restaurando la ortotropía. La integración de terapia visual y oclusión contrarresta el déficit neurosensorial y previene la instauración de una ambliopía refractiva profunda.",
      "bibliografia": "Al-Tamimi N, Khan MW, Ali MA, Graini F. Orthotropic Outcome With Spectacle Correction in a Pediatric Case of Refractive Esotropia and Anisometropic Amblyopia. Clin Case Rep. 2026."
    },
    {
      "id": "3",
      "titulo": "Miopía Axial Magna Degenerativa Secundaria a Glaucoma Congénito Primario",
      "edad": "11 años",
      "motivo_consulta": "Disminución progresiva de la agudeza visual en todas las distancias de trabajo.",
      "antecedentes": "Glaucoma congénito primario (GCP) bilateral, miopía magna, endotropía, nistagmo y ambliopía profunda. Iridectomía superior bilateral a los 5 días de vida y corrección quirúrgica del estrabismo a los 2 años. Terapia hipotensora actual con Latanoprost 0.005%.",
      "examen_motor": {
        "cover_test": "Endotropía básica concomitante alternante de gran ángulo (65 DP) con dominancia del ojo derecho.",
        "motilidad": "Nistagmo latente horizontal puro. Versiones conservadas y ducciones simétricas sin paresias oculomotoras."
      },
      "refraccion": {
        "agudeza_visual": "Agudeza visual no corregida (AVSC) en visión lejana: 20/200 en ambos ojos (OU).",
        "retinoscopia": "Miopía axial alta con astigmatismo miópico compuesto. OD: -15.00 -1.25 x 15° AV 20/160; OI: -14.50 -2.00 x 140° AV 20/125."
      },
      "opciones_conducta": [
        "Mantenimiento de corrección oftálmica con lentes de alto índice",
        "Adaptación de lentes de contacto rígidos gas permeables (LCRGP)",
        "Adaptación especializada de lentes de contacto blandos (LCB) personalizados"
      ],
      "conducta_correcta": "Adaptación especializada de lentes de contacto blandos (LCB) personalizados.",
      "justificacion_clinica": "Ante la intolerancia corneal a los LCRGP, la adaptación de LCB personalizados optimizó la calidad de la imagen retiniana reduciendo las aberraciones periféricas, estabilizó el componente sensoriomotor disminuyendo la amplitud del nistagmo, y proporcionó un mayor nivel de confort, mejorando significativamente la calidad de vida de la paciente.",
      "bibliografia": "Carvajal Ortiz AM, Muñoz Gómez PA, Peñaloza Silva MA, Narváez Rumié OM. Impacto visual desde el abordaje oftálmico y contactológico en paciente pediátrica con miopía alta degenerativa secundaria a glaucoma congénito primario, 2025-2006: Reporte de caso. Univ Santo Tomás; 2025."
    },
    {
      "id": "4",
      "titulo": "Persistencia de la Vasculatura Fetal (PVF) Asociada a Catarata Congénita",
      "edad": "14 años",
      "motivo_consulta": "Control optométrico de rutina. El paciente refiere pobre adherencia al uso de la corrección óptica.",
      "antecedentes": "Leucocoria unilateral congénita OD, persistencia de la vasculatura fetal (PVF), afaquia OD por facoemulsificación y vitrectomía anterior a los 2 meses. Corrección quirúrgica de estrabismo comitante convergente en 2014.",
      "examen_motor": {
        "cover_test": "Ortoforia/micromotropía con mejoría posquirúrgica de la endodesviación adquirida.",
        "motilidad": "Microftalmia leve, heterocromía de iris, y pupila amplia e hiporreactiva en OD."
      },
      "refraccion": {
        "agudeza_visual": "OD: Limitación visual funcional indicativa de ambliopía ex anopsia profunda; OI: 20/20 sin corrección.",
        "retinoscopia": "OD: Neutro (afaquia no corregida funcionalmente en controles previos); OI: Equivalente esférico de +0.25 D."
      },
      "opciones_conducta": [
        "Reintervención quirúrgica de polo posterior para vitrectomía extendida",
        "Adaptación de lente de contacto con sobre-refracción hipermetrópica agresiva en OD",
        "Prescripción de lente oftálmico de protección (policarbonato) para ojo sano y manejo cosmoprotésico"
      ],
      "conducta_correcta": "Prescripción de lente oftálmico de protección (policarbonato) para ojo sano y manejo cosmoprotésico.",
      "justificacion_clinica": "Dado el compromiso estructural subyacente (microftalmia) y la ambliopía por deprivación consolidada a pesar de la intervención temprana, el potencial visual del OD es nulo. El objetivo terapéutico prioritario debe enfocarse en la profilaxis de trauma del ojo fijador (OI) y la rehabilitación estética del paciente.",
      "bibliografia": "Ramírez Herrera NY, Jaimes Rueda AC, Moreno S, Narváez R OM. Abordaje clínico visual de un paciente pediátrico con persistencia de la vasculatura fetal y catarata congénita: reporte de caso. 2024."
    },
    {
      "id": "5",
      "titulo": "Ambliopía Severa Anisometrópica Secundaria a Miopía Magna Unilateral",
      "edad": "8 años",
      "motivo_consulta": "Control optométrico por disminución de la agudeza visual en todas las distancias de trabajo asociado al deterioro de los lentes oftálmicos actuales.",
      "antecedentes": "Exotropía del OI diagnosticada a los 2 años. Tratamiento de penalización oclusiva previa con nula adherencia terapéutica y sin corrección óptica instaurada. Antecedente familiar (madre) de miopía magna.",
      "examen_motor": {
        "cover_test": "Ortoforia en visión lejana; exoforia fisiológica de 4 dioptrías prismáticas (DP) en visión próxima.",
        "motilidad": "Exotropía histórica estabilizada a exoforia leve compensada. Versiones y ducciones completas."
      },
      "refraccion": {
        "agudeza_visual": "AVSC: OD 20/30, OI 20/1200. AVMC: OD 20/20, OI 20/150.",
        "retinoscopia": "Refracción bajo cicloplejía con ciclopentolato al 1%: OD Neutro -1.00 x 0° AV 20/20; OI -9.50 -1.50 x 170° AV 20/150."
      },
      "opciones_conducta": [
        "Terapia de penalización farmacológica oftálmica con ciclopentolato/atropina",
        "Corrección óptica en gafas asféricas y oclusión directa de tiempo parcial",
        "Adaptación de lente de contacto blando tórico, parcheo estructurado y terapia ortóptica progresiva"
      ],
      "conducta_correcta": "Adaptación de lente de contacto blando tórico, parcheo estructurado y terapia ortóptica progresiva.",
      "justificacion_clinica": "La adaptación del lente de contacto neutraliza la aniseiconia y las aberraciones ópticas inherentes a la anisometropía extrema. Esto, en sinergia con un régimen de oclusión estructurada y entrenamiento ortóptico progresivo, restableció de manera eficaz las vías neurosensoriales binoculares y mejoró la AVMC del ojo ambliope.",
      "bibliografia": "Morales López A, Calderón Alvarado L, Casillas E, Narváez OM. Manejo integral de ambliopía severa anisometrópica en paciente pediátrico con miopía magna unilateral en Barranquilla Colombia 2025: reporte de caso clínico. 2025."
    },
    {
      "id": "6",
      "titulo": "Ambliopía Refractiva Binocular Anisometrópica No Estrábica",
      "edad": "8 años",
      "motivo_consulta": "Remisión escolar por déficit visual persistente, astenopia al esfuerzo acomodativo y bajo rendimiento académico manifestado por disfunción en la integración visomotora.",
      "antecedentes": "Déficit atencional secundario, dificultades en el aprendizaje lectoescritor y torpeza motriz leve en evaluación del neurodesarrollo.",
      "examen_motor": {
        "cover_test": "Cover test en visión lejana: Endoforia compensada de 3 a 4 dioptrías prismáticas (DP).",
        "motilidad": "Movimientos sacádicos hipométricos y deficiencias en la ejecución de la motricidad gruesa afectando el equilibrio dinámico."
      },
      "refraccion": {
        "agudeza_visual": "Agudeza visual mejor corregida (AVMC): OD 0.7 (+2) 20/30; OI 0.4 20/50 (esfuerzo visual marcado y lectura lenta).",
        "retinoscopia": "Astigmatismo hipermetrópico compuesto anisometrópico: OD +2.00 sph; OI +5.00 -1.50 x 180°."
      },
      "opciones_conducta": [
        "Adición positiva progresiva en lentes oftálmicos bifocales",
        "Terapia de fototerapia optométrica (Syntonics), integración de reflejos primitivos y optimización de corrección óptica",
        "Manejo expectante o intervención quirúrgica temprana"
      ],
      "conducta_correcta": "Terapia de fototerapia optométrica (Syntonics), integración de reflejos primitivos y optimización de corrección óptica.",
      "justificacion_clinica": "El estímulo lumínico dirigido (fototerapia Alfa delta/Mu delta) permitió la expansión de los campos visuales funcionales. La terapia neurosensomotora consolidó la integración de los reflejos motores y, mediante la hipocorrección esférica graduada en OI (+3.25 esf), se logró estabilizar la función acomodativa alcanzando una AVMC binocular de 1.2 y una estereopsis de 20 segundos de arco.",
      "bibliografia": "Ambliopía binocular anisometrópica no estrábica. Caso Clínico."
    },
    {
      "id": "7",
      "titulo": "Ambliopía Ametrópica Bilateral Secundaria a Astigmatismo Mixto Elevado",
      "edad": "7 años",
      "motivo_consulta": "Remisión de tamizaje visual básico para evaluación optométrica especializada y refracción.",
      "antecedentes": "Desarrollo sistémico y ocular normotípico. Antecedentes heredo-familiares, patológicos y quirúrgicos negativos.",
      "examen_motor": {
        "cover_test": "Ortoforia en posiciones primarias de mirada (visión lejana, 40 cm y 20 cm).",
        "motilidad": "Dominancia motora derecha, test de Hirschberg centrado bilateralmente y ángulo Kappa positivo fisiológico. Ducciones y versiones sin restricciones."
      },
      "refraccion": {
        "agudeza_visual": "Agudeza visual no corregida (AVSC) en visión lejana: OD 20/100, OI 20/100.",
        "retinoscopia": "Refracción estática bajo cicloplejía en formato de cilindro negativo: OD +2.00 -2.00 x 20°; OI +2.00 -2.00 x 0°."
      },
      "opciones_conducta": [
        "Prescripción de régimen de oclusión alterna estricta a tiempo completo",
        "Prescripción óptica total bajo cicloplejia de uso permanente y control evolutivo al mes",
        "Terapia visual acomodativa exclusiva sin prescripción de lentes oftálmicos"
      ],
      "conducta_correcta": "Prescripción óptica total bajo cicloplejia de uso permanente y control evolutivo al mes.",
      "justificacion_clinica": "Ante una ambliopía ametrópica secundaria a un defecto astigmático mixto altamente ambliogénico y simétrico (AVSC 20/100 OU), la primera línea terapéutica consiste en la corrección óptica exacta determinada bajo cicloplejia. Su uso ininterrumpido actúa como profilaxis contra el empeoramiento del déficit neurosensorial y fomenta el adecuado desarrollo de la vía visual aferente.",
      "bibliografia": "REPORTE DE CASO. Consulta de ortóptica."
    }
  ];

  /**
   * Carga los casos clínicos desde Casos Clinicos.json (si se sirve mediante HTTP),
   * o utiliza los datos integrados como respaldo si se ejecuta directamente sin servidor.
   */
  async function loadCasesData() {
    try {
      const response = await fetch('Casos Clinicos.json');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          state.casesData = data;
        } else {
          state.casesData = DEFAULT_CASES_DATA;
        }
      } else {
        state.casesData = DEFAULT_CASES_DATA;
      }
    } catch (err) {
      console.info('Cargando casos clínicos desde datos integrados:', err.message);
      state.casesData = DEFAULT_CASES_DATA;
    }

    // Restaurar índice guardado de la sesión
    const savedIndex = sessionStorage.getItem('optokids_case_index');
    state.currentCaseIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
    if (state.currentCaseIndex >= state.casesData.length) {
      state.currentCaseIndex = 0;
    }
  }

  /**
   * Render the current case into the DOM.
   */
  function loadCurrentCase() {
    if (!state.casesData.length) return;
    if (!caseTitle) cacheCaseDom();

    const c = state.casesData[state.currentCaseIndex];
    if (!c) return;

    // Reset state
    state.selectedOption = null;
    state.evaluated = false;

    // Header
    caseTitle.textContent = cleanCite(c.titulo);
    caseTitle.title = cleanCite(c.titulo); // tooltip for long titles
    caseCurrent.textContent = state.currentCaseIndex + 1;
    caseTotal.textContent = state.casesData.length;

    // Patient fields
    fieldEdad.textContent = cleanCite(c.edad);
    fieldMotivo.textContent = cleanCite(c.motivo_consulta);
    fieldAntecedentes.textContent = cleanCite(c.antecedentes);

    // Motor exam
    fieldCoverTest.textContent = cleanCite(c.examen_motor?.cover_test);
    fieldMotilidad.textContent = cleanCite(c.examen_motor?.motilidad);

    // Refraction
    fieldAgudeza.textContent = cleanCite(c.refraccion?.agudeza_visual);
    fieldRetinoscopia.textContent = cleanCite(c.refraccion?.retinoscopia);

    // Build radio buttons
    renderRadioOptions(c.opciones_conducta);

    // Reset form
    textarea.value = '';
    textarea.disabled = false;
    btnEvaluate.disabled = true;

    // Show evaluate button, hide feedback
    if (evaluateBtnWrapper) evaluateBtnWrapper.classList.remove('is-hidden');
    feedbackPanel.style.display = 'none';
    feedbackPanel.classList.remove('fb-enter');
    if (feedbackBanner) feedbackBanner.className = 'feedback-banner';

    // Label for next-case button (last case = volver al inicio)
    if (btnNextLabel) {
      btnNextLabel.textContent =
        state.currentCaseIndex >= state.casesData.length - 1
          ? 'Volver al Inicio'
          : 'Siguiente Caso';
    }

    // Save current index
    sessionStorage.setItem('optokids_case_index', state.currentCaseIndex);
  }

  /**
   * Render radio option elements for the conduct options.
   */
  function renderRadioOptions(options) {
    if (!radioGroup) return;
    radioGroup.innerHTML = '';

    options.forEach((opt, i) => {
      const label = document.createElement('label');
      label.className = 'radio-option';
      label.setAttribute('data-index', i);

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'conduct-option';
      radio.value = i;
      radio.id = `conduct-opt-${i}`;

      const span = document.createElement('span');
      span.className = 'radio-option-text';
      span.textContent = opt;

      label.appendChild(radio);
      label.appendChild(span);

      // Selection handler
      label.addEventListener('click', () => {
        if (state.evaluated) return;
        state.selectedOption = i;

        // Visual selection
        radioGroup.querySelectorAll('.radio-option').forEach((el) => {
          el.classList.remove('selected');
        });
        label.classList.add('selected');
        radio.checked = true;

        // Enable evaluate button
        btnEvaluate.disabled = false;
      });

      radioGroup.appendChild(label);
    });
  }

  /**
   * Evaluate the student's answer — pure frontend logic.
   * Hides the evaluate button and shows the Retroalimentación Académica panel.
   */
  function evaluateConduct() {
    if (state.selectedOption === null || state.evaluated) return;

    const c = state.casesData[state.currentCaseIndex];
    if (!c) return;

    state.evaluated = true;

    // ── 1. Find the correct option index by fuzzy matching ──────────────────
    const correctText = cleanCite(c.conducta_correcta).replace(/\.$/, '').trim();
    const correctIndex = c.opciones_conducta.findIndex((opt) => {
      const cleaned = cleanCite(opt).replace(/\.$/, "").trim();
      return (
        correctText.toLowerCase().includes(cleaned.toLowerCase()) ||
        cleaned.toLowerCase().includes(correctText.toLowerCase())
      );
    });

    const isCorrect     = state.selectedOption === correctIndex;
    const selectedLabel = c.opciones_conducta[state.selectedOption] ?? '—';
    const correctLabel  = correctIndex >= 0
      ? c.opciones_conducta[correctIndex]
      : cleanCite(c.conducta_correcta);

    // ── 2. Mark radio options visually ──────────────────────────────────────
    radioGroup.querySelectorAll('.radio-option').forEach((el, i) => {
      el.classList.add('disabled');
      el.querySelector('input[type="radio"]').disabled = true;
      if (i === correctIndex)                          el.classList.add('correct');
      if (i === state.selectedOption && !isCorrect)    el.classList.add('incorrect');
    });

    // ── 3. Lock textarea ────────────────────────────────────────────────────
    textarea.disabled = true;

    // ── 4. Hide the evaluate button wrapper ─────────────────────────────────
    if (evaluateBtnWrapper) evaluateBtnWrapper.classList.add('is-hidden');

    // ── 5. Populate and reveal the feedback panel ───────────────────────────
    feedbackPanel.style.display = 'block';
    void feedbackPanel.offsetWidth; // force reflow → animation triggers
    feedbackPanel.classList.add('fb-enter');

    // Banner: correcto / incorrecto
    if (isCorrect) {
      feedbackBanner.className = 'feedback-banner feedback-banner--correct';
      feedbackIcon.textContent     = '✓';
      feedbackTitle.textContent    = '¡Respuesta Correcta!';
      feedbackSubtitle.textContent = 'Tu criterio clínico coincide con la conducta óptica recomendada.';
      incrementCounter();
    } else {
      feedbackBanner.className = 'feedback-banner feedback-banner--incorrect';
      feedbackIcon.textContent     = '✗';
      feedbackTitle.textContent    = 'Respuesta Incorrecta';
      feedbackSubtitle.textContent = 'Revisa la justificación clínica para entender el razonamiento correcto.';
    }

    // Respuesta del estudiante vs correcta
    feedbackStudentAnswer.textContent = selectedLabel;
    feedbackStudentAnswer.className   = isCorrect
      ? 'feedback-row-value feedback-row-value--ok'
      : 'feedback-row-value feedback-row-value--ko';
    feedbackCorrect.textContent = correctLabel;

    // Justificación clínica
    feedbackJustification.textContent = cleanCite(c.justificacion_clinica);

    // Bibliografía en formato Vancouver
    feedbackBiblio.textContent = c.bibliografia || 'Sin referencia disponible.';

    // ── 6. Scroll suave al panel ────────────────────────────────────────────
    setTimeout(() => {
      feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  /**
   * Move to the next case, or back to home if all done.
   */
  function nextCase() {
    if (state.currentCaseIndex >= state.casesData.length - 1) {
      // All cases done — reset counter and go back to home
      state.currentCaseIndex = 0;
      sessionStorage.setItem('optokids_case_index', 0);
      state.casesResolved = 0;
      sessionStorage.setItem('optokids_resolved', 0);
      renderCounter();
      navigateTo('inicio');
    } else {
      state.currentCaseIndex += 1;
      loadCurrentCase();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }


  // ─── Event Listeners ─────────────────────────────────────

  function bindEvents() {
    // Nav links
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(link.dataset.view);
      });
    });

    // "Iniciar Casos Clínicos" button
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        navigateTo('casos');
      });
    }

    // "Learn more" scrolls to info section
    if (btnLearnMore) {
      btnLearnMore.addEventListener('click', scrollToInfo);
    }

    // Any element with [data-navigate] attribute
    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-navigate]');
      if (navEl) {
        e.preventDefault();
        navigateTo(navEl.dataset.navigate);
      }
    });

    // Hash change
    window.addEventListener('popstate', handleHash);

    // Scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Case module events (use delegation for safety)
    document.addEventListener('click', (e) => {
      // Evaluate button
      if (e.target.closest('#btn-evaluate')) {
        evaluateConduct();
      }
      // Next case button
      if (e.target.closest('#btn-next-case')) {
        nextCase();
      }
    });
  }

  // ─── Init ─────────────────────────────────────────────────

  async function init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    initDOMReferences();
    loadCounter();
    await loadCasesData();
    handleHash();
    handleScroll();
    bindEvents();
  }

  // Boot: only run in browser environments
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
