/**
 * OptoKids — SPA Router & Application Logic
 * Updated to support casos_clinicos_optometria_pediatrica.json format
 * with A–D options, detailed feedback, and clinical tables.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') return;

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
  let header, counterValue, btnStart, btnLearnMore;
  let navLinks = [];
  let views = [];
  let caseTitle, caseCurrent, caseTotal;
  let fieldEdad, fieldMotivo, fieldAntecedentes;
  let fieldCoverTest, fieldMotilidad;
  let fieldAgudeza, fieldRetinoscopia;
  let caseExtraInfo;
  let radioGroup, textarea, btnEvaluate, evaluateBtnWrapper;
  let feedbackPanel, feedbackBanner;
  let feedbackIcon, feedbackTitle, feedbackSubtitle;
  let feedbackStudentAnswer, feedbackCorrect, feedbackJustification, feedbackBiblio;
  let btnNextCase, btnNextLabel;

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

    caseTitle         = $('#case-title');
    caseCurrent       = $('#case-current-num');
    caseTotal         = $('#case-total-num');
    fieldEdad         = $('#field-edad');
    fieldMotivo       = $('#field-motivo');
    fieldAntecedentes = $('#field-antecedentes');
    fieldCoverTest    = $('#field-cover-test');
    fieldMotilidad    = $('#field-motilidad');
    fieldAgudeza      = $('#field-agudeza');
    fieldRetinoscopia = $('#field-retinoscopia');
    caseExtraInfo     = $('#case-extra-info');
    radioGroup        = $('#radio-group-conduct');
    textarea          = $('#textarea-justification');
    btnEvaluate       = $('#btn-evaluate');
    evaluateBtnWrapper= $('#evaluate-btn-wrapper');
    feedbackPanel     = $('#feedback-panel');
    feedbackBanner    = $('#feedback-banner');
    feedbackIcon      = $('#feedback-icon');
    feedbackTitle     = $('#feedback-title');
    feedbackSubtitle  = $('#feedback-subtitle');
    feedbackStudentAnswer = $('#feedback-student-answer');
    feedbackCorrect       = $('#feedback-correct');
    feedbackJustification = $('#feedback-justification');
    feedbackBiblio        = $('#feedback-biblio');
    btnNextCase  = $('#btn-next-case');
    btnNextLabel = $('#btn-next-label');
  }

  const cacheCaseDom = initDOMReferences;

  // ─── SPA Router ───────────────────────────────────────────
  function navigateTo(viewName) {
    if (viewName === state.currentView) return;
    views.forEach((v) => {
      if (v.classList.contains('visible')) {
        v.classList.remove('visible');
        setTimeout(() => { v.classList.remove('active'); showView(viewName); }, 250);
      }
    });
    navLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === viewName));
    state.currentView = viewName;
    window.location.hash = viewName;
    if (viewName === 'casos') setTimeout(() => loadCurrentCase(), 300);
  }

  function showView(viewName) {
    const target = $(`#view-${viewName}`);
    if (!target) return;
    target.classList.add('active');
    void target.offsetWidth;
    target.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'inicio';
    const valid = $(`#view-${hash}`);
    if (valid) {
      views.forEach((v) => v.classList.remove('active', 'visible'));
      const target = $(`#view-${hash}`);
      target.classList.add('active');
      void target.offsetWidth;
      target.classList.add('visible');
      navLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === hash));
      state.currentView = hash;
      if (hash === 'casos') loadCurrentCase();
    }
  }

  // ─── Counter ─────────────────────────────────────────────
  function loadCounter() {
    const saved = sessionStorage.getItem('optokids_resolved');
    state.casesResolved = saved ? parseInt(saved, 10) : 0;
    renderCounter();
  }

  function incrementCounter() {
    state.casesResolved += 1;
    sessionStorage.setItem('optokids_resolved', state.casesResolved);
    renderCounter(true);
  }

  function renderCounter(animate = false) {
    if (!counterValue) return;
    counterValue.textContent = state.casesResolved;
    if (animate) {
      counterValue.style.transition = 'transform 0.2s cubic-bezier(0.22,1,0.36,1)';
      counterValue.style.transform = 'scale(1.35)';
      setTimeout(() => { counterValue.style.transform = 'scale(1)'; }, 200);
    }
  }

  if (typeof window !== 'undefined') {
    window.OptoKids = window.OptoKids || {};
    window.OptoKids.incrementCounter = incrementCounter;
    window.OptoKids.navigateTo = navigateTo;
  }

  function handleScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  }

  function scrollToInfo() {
    const infoSection = $('#info-section');
    if (infoSection) infoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ═════════════════════════════════════════════════════════
  //  CASE MODULE — NEW FORMAT (casos_clinicos_optometria_pediatrica.json)
  // ═════════════════════════════════════════════════════════

  function cleanCite(text) {
    if (!text) return '—';
    return String(text).replace(/\[cite:[^\]]*\]/gi, '').trim();
  }

  function buildTableHTML(bloque) {
    if (!bloque.columnas || !bloque.filas) return '';
    const headers = bloque.columnas.map(c => `<th>${c}</th>`).join('');
    const rows = bloque.filas.map(fila => {
      const cells = bloque.columnas.map(c => `<td>${cleanCite(fila[c] || '—')}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<div class="table-wrapper"><table class="clinical-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function normalizeCase(raw) {
    // ── NEW FORMAT: has ficha_paciente and item_evaluacion ──
    if (raw.ficha_paciente && raw.item_evaluacion) {
      const ficha = raw.ficha_paciente || [];
      const item  = raw.item_evaluacion;

      const getField = (campo) => {
        const f = ficha.find(f => f.campo && f.campo.toLowerCase().includes(campo.toLowerCase()));
        return f ? f.dato : '—';
      };

      const edadField   = getField('edad');
      const motivoField = getField('motivo');

      const antFields = ficha.filter(f =>
        f.campo && !f.campo.toLowerCase().includes('edad') &&
        !f.campo.toLowerCase().includes('motivo') &&
        !f.campo.toLowerCase().includes('fecha')
      );

      // Extract hallazgos clínicos
      const hallazgos = raw.secciones?.find(s => s.id?.includes('hallazgos'));
      let agudezaVal = '—', retinoVal = '—', coverVal = '—', motilidadVal = '—';

      if (hallazgos?.contenido) {
        hallazgos.contenido.forEach(bloque => {
          if (bloque.tipo === 'tabla' && bloque.filas?.length) {
            bloque.filas.forEach(fila => {
              const prueba = (fila.Prueba || '').toLowerCase();
              if ((prueba.includes('av ') || prueba.startsWith('av') || prueba.includes('agudeza')) && agudezaVal === '—') {
                agudezaVal = `OD: ${fila.OD || '—'} | OI: ${fila.OI || '—'}`;
              }
              if ((prueba.includes('refracción') || prueba.includes('retinoscopía') || prueba.includes('retinoscopia')) && retinoVal === '—') {
                retinoVal = `OD: ${fila.OD || '—'} | OI: ${fila.OI || '—'}`;
              }
            });
          }
          if (bloque.tipo === 'lista' && bloque.items?.length) {
            bloque.items.forEach(it => {
              const low = it.toLowerCase();
              if (coverVal === '—' && (low.includes('ct:') || low.includes('endotropía') || low.includes('exotropía') || low.includes('ortoforia') || low.includes('krimsky'))) {
                coverVal = it;
              }
              if (motilidadVal === '—' && (low.includes('versiones') || low.includes('ducciones') || low.includes('nistagmo') || low.includes('sensoriomotor'))) {
                motilidadVal = it;
              }
            });
          }
        });
      }

      // Build extra HTML
      const extraParts = [];
      if (raw.resumen) {
        extraParts.push(`<div class="case-summary-box"><p>${cleanCite(raw.resumen)}</p></div>`);
      }
      if (raw.secciones) {
        raw.secciones.forEach(sec => {
          if (sec.id === 'diagnostico_y_conducta_real' || sec.id === 'diagnostico') return;
          extraParts.push(`<h4 class="extra-section-title">${sec.titulo || ''}</h4>`);
          sec.contenido?.forEach(bloque => {
            if (bloque.tipo === 'tabla') {
              extraParts.push(buildTableHTML(bloque));
            } else if (bloque.tipo === 'lista') {
              const items = bloque.items.map(i => `<li>${cleanCite(i)}</li>`).join('');
              extraParts.push(`<ul class="extra-list">${items}</ul>`);
            } else if (bloque.tipo === 'lista_numerada') {
              const items = bloque.items.map(i => `<li>${cleanCite(i)}</li>`).join('');
              extraParts.push(`<ol class="extra-list">${items}</ol>`);
            } else if (bloque.tipo === 'parrafo') {
              extraParts.push(`<p class="extra-para">${cleanCite(bloque.texto)}</p>`);
            }
          });
        });
      }

      const opciones = item.opciones || [];
      const correctaOpcion = opciones.find(o => o.es_correcta);
      const correctaIdx    = opciones.findIndex(o => o.es_correcta);
      const retroAll = item.retroalimentacion_distractores || {};

      return {
        _newFormat: true,
        id: raw.id,
        titulo: raw.titulo,
        edad: edadField,
        motivo_consulta: motivoField,
        antecedentes: antFields.map(f => `${f.campo}: ${f.dato}`).join(' | '),
        examen_motor: { cover_test: coverVal, motilidad: motilidadVal },
        refraccion: { agudeza_visual: agudezaVal, retinoscopia: retinoVal },
        opciones_conducta: opciones.map(o => `${o.id}. ${o.texto}`),
        _opciones_raw: opciones,
        conducta_correcta: correctaOpcion ? correctaOpcion.texto : '—',
        _correcta_index: correctaIdx,
        _correcta_letra: item.respuesta_correcta,
        justificacion_clinica: item.justificacion_modelo || correctaOpcion?.retroalimentacion || '—',
        _retroalimentacion_all: { ...retroAll, [item.respuesta_correcta]: correctaOpcion?.retroalimentacion },
        bibliografia: raw.fuente || '—',
        _extra_html: extraParts.join(''),
        _enunciado: item.enunciado || 'Seleccione la conducta óptica recomendada:',
        ficha_paciente: ficha,
      };
    }

    // ── OLD FORMAT ──
    const opts = (raw.opciones_conducta || []);
    return {
      _newFormat: false,
      id: raw.id,
      titulo: raw.titulo,
      edad: raw.edad,
      motivo_consulta: raw.motivo_consulta,
      antecedentes: raw.antecedentes,
      examen_motor: raw.examen_motor,
      refraccion: raw.refraccion,
      opciones_conducta: opts,
      _opciones_raw: opts.map((t, i) => ({
        id: String.fromCharCode(65 + i), texto: t,
        es_correcta: t === raw.conducta_correcta
      })),
      conducta_correcta: raw.conducta_correcta,
      _correcta_index: opts.findIndex(o => o === raw.conducta_correcta),
      _correcta_letra: null,
      justificacion_clinica: raw.justificacion_clinica,
      _retroalimentacion_all: {},
      bibliografia: raw.bibliografia,
      _extra_html: '',
      _enunciado: 'Seleccione la conducta óptica recomendada:',
      ficha_paciente: [],
    };
  }

  // ─── Default 7 Cases Data (Offline Fallback) ─────────────
  const DEFAULT_CASES_DATA = [{"id":"caso_01","numero":1,"titulo":"Discapacidad visual cerebral por encefalopatía hipóxico-isquémica","resumen":"Niña de 5 años con DVC secundaria a encefalopatía hipóxico-isquémica perinatal leve, sin ambliopía ni estrabismo, que mejoró de 20/100 a 20/32 (OD) con corrección de una ametropía leve y oclusión secundaria del ojo de mejor AV. Fuente: Sica et al., Italian Journal of Pediatrics 2024;50:123. Es el caso de la captura de la app.","fuente":"Sica et al., Italian Journal of Pediatrics 2024;50:123","ficha_paciente":[{"campo":"Edad / sexo","dato":"5 años (recién cumplidos), femenino"},{"campo":"Motivo de consulta","dato":"Remisión por disminución de AV; déficit del neurodesarrollo visual y de la integración visomotora"},{"campo":"Antecedentes perinatales","dato":"Gemelar heterocigoto, 37+3 semanas; peso 2.400 g (p10), talla 46,5 cm (p8), perímetro cefálico 32,5 cm (p6); APGAR 5/7/9 (1, 5 y 10 min); madre con preeclampsia; gemela sana"},{"campo":"Antecedentes neurológicos","dato":"Encefalopatía hipóxico-isquémica perinatal leve (estadio 1 de Sarnat); dispraxia simétrica; lenguaje adecuado (Test Fono Léxico); la madre la describe como \"torpe\""}],"secciones":[{"id":"hallazgos_clinicos","titulo":"Hallazgos clínicos","contenido":[{"tipo":"tabla","columnas":["Prueba","OD","OI"],"filas":[{"Prueba":"AV inicial","OD":"2/10 (20/100)","OI":"5/10 (20/40)"},{"Prueba":"Refracción (no ciclopléjica, prescrita)","OD":"+1,00 -0,50 × 170°","OI":"+1,25 -0,75 × 10°"},{"Prueba":"OCT CFNR (S/I/N/T, µm)","OD":"108 / 106 / 70 / 74","OI":"108 / 102 / 67 / 69"},{"Prueba":"PEV patrón 15′","OD":"Latencia 126 ms, amplitud 5 µV","OI":"Latencia 110 ms, amplitud 8 µV"},{"Prueba":"PEV flash","OD":"120 ms","OI":"116 ms"}]},{"tipo":"lista","items":["Ametropía descrita como astigmatismo hipermetrópico compuesto bilateral moderado; sin estrabismo.","Segmento anterior, fondo de ojo y OCT macular normales, sin hipoplasia foveal; disco y CFNR normales para la edad (se descarta hipoplasia o atrofia del nervio óptico).","Motilidad: dificultad para provocar movimientos oculares extrínsecos.","RM cerebral (3 semanas después): dilatación asimétrica de ventrículos laterales, aumento leve de espacios pericerebrales en polo temporal izquierdo, adelgazamiento y gliosis de sustancia blanca periventricular posterior (predominio derecho); cuerpo calloso adelgazado en región posterior (diámetro AP 55,3 mm, <p3; rodilla 6,63 mm y esplenio 6,46 mm, cerca de p3).","DTVP-2 a los 5 años: coordinación ojo-mano 48 (p5), copia 2 (p9)."]}]},{"id":"diagnostico_y_conducta_real","titulo":"Diagnóstico y conducta real","contenido":[{"tipo":"parrafo","texto":"Diagnóstico: discapacidad visual cerebral por daño de las radiaciones ópticas y áreas visuales, con astigmatismo hipermetrópico compuesto leve bilateral. No cumple criterios de ambliopía refractiva bilateral (AVMC ≤ 20/40 en AO con ≥ 4,00 D de hipermetropía en equivalente esférico o ≥ 2,00 D de astigmatismo)."},{"tipo":"parrafo","texto":"Conducta y evolución:"},{"tipo":"lista_numerada","items":["Mes 1: gafas con la refracción no ciclopléjica, bajo la hipótesis de un componente ambliopénico refractivo sumado al daño neurológico.","Mes 5: OI sube a 7/10 (20/28), OD sin cambio. Se inicia oclusión secundaria del OI 3 h/día con estimulación visual en tableta (dibujos animados, dibujar, colorear) y programa de rehabilitación de praxias.","Mes 9: OD 4/10 (20/50), OI estable; se prolonga la oclusión 4 meses.","Mes 13: OD 6/10 (20/32), OI 8/10 (20/25). DTVP-2: ojo-mano 140 (p37), copia 13 (p25).","Mantenimiento: oclusión 1 h/día por 6 meses; AV final estable a los 19 meses."]}]}],"item_evaluacion":{"respuesta_correcta":"C","enunciado":"Seleccione la conducta óptica recomendada:","opciones":[{"id":"A","texto":"Observación clínica estricta sin prescripción óptica, porque la DVC es de origen retroquiasmático y la ametropía está por debajo de los umbrales ambliogénicos.","es_correcta":false,"retroalimentacion":"la DVC no contraindica la corrección óptica; observar sin intervenir desperdicia el periodo de plasticidad. El caso mejoró de 20/100 a 20/32 con tratamiento."},{"id":"B","texto":"Prescripción óptica total y oclusión terapéutica del OD, por ser el ojo con mayor latencia en los PEV, para forzar la fijación con el OI y estabilizar la vía menos lesionada.","es_correcta":false,"retroalimentacion":"invierte la lógica de la oclusión. Se ocluye el ojo con mejor AV (OI) para estimular el de peor rendimiento (OD), no al revés."},{"id":"C","texto":"Prescripción de la ametropía leve (+1,00 -0,50 × 170° / +1,25 -0,75 × 10°) y, ante respuesta asimétrica, oclusión secundaria del OI (mejor AV) 3 h/día con estimulación visual activa, integrada a rehabilitación de praxias.","es_correcta":true,"retroalimentacion":"Aunque el déficit es cortical (PEV con latencia aumentada en OD, RM con leucomalacia periventricular posterior y adelgazamiento del esplenio), la ametropía y la asimetría interocular de AV añaden un componente funcional tratable. Neutralizar incluso un astigmatismo leve optimiza la calidad de la imagen retiniana que llega a una vía ya comprometida. La diferencia de AV de más de dos líneas justifica la oclusión secundaria del ojo de mejor AV, para obligar al uso de la vía más lesionada mediante estimulación activa (plasticidad dependiente de uso). El abordaje se completa con rehabilitación de la integración visomotora, cuya mejora se documenta en el DTVP-2."},{"id":"D","texto":"Terapia neurosensorial exclusiva (estimulación con contraste alto y entorno simplificado) sin corrección ni penalización oclusiva, ya que la oclusión carece de sustrato sin ambliopía demostrada.","es_correcta":false,"retroalimentacion":"la estimulación ambiental es complementaria, pero omitir la corrección y la oclusión renuncia a la intervención que produjo la ganancia de AV en este caso."}],"justificacion_modelo":"Aunque el déficit es cortical (PEV con latencia aumentada en OD, RM con leucomalacia periventricular posterior y adelgazamiento del esplenio), la ametropía y la asimetría interocular de AV añaden un componente funcional tratable. Neutralizar incluso un astigmatismo leve optimiza la calidad de la imagen retiniana que llega a una vía ya comprometida. La diferencia de AV de más de dos líneas justifica la oclusión secundaria del ojo de mejor AV, para obligar al uso de la vía más lesionada mediante estimulación activa (plasticidad dependiente de uso). El abordaje se completa con rehabilitación de la integración visomotora, cuya mejora se documenta en el DTVP-2.","retroalimentacion_distractores":{"A":"la DVC no contraindica la corrección óptica; observar sin intervenir desperdicia el periodo de plasticidad. El caso mejoró de 20/100 a 20/32 con tratamiento.","B":"invierte la lógica de la oclusión. Se ocluye el ojo con mejor AV (OI) para estimular el de peor rendimiento (OD), no al revés.","D":"la estimulación ambiental es complementaria, pero omitir la corrección y la oclusión renuncia a la intervención que produjo la ganancia de AV en este caso."}}},{"id":"caso_02","numero":2,"titulo":"Esotropía refractiva acomodativa con ambliopía anisometrópica","resumen":"Lactante de 9 meses con endotropía derecha intermitente de 30–35 Δ por hipermetropía anisometrópica; la corrección ciclopléjica total produjo ortotropía y, con oclusión y terapia dicóptica, AV de 6/6− en el ojo amblíope. Fuente: Al-Tamimi et al., Clinical Case Reports 2026;14:e72407.","fuente":"Al-Tamimi et al., Clinical Case Reports 2026;14:e72407","ficha_paciente":[{"campo":"Edad / sexo","dato":"9 meses, masculino (primera consulta 24/03/2022)"},{"campo":"Motivo de consulta","dato":"Desviación del OD hacia adentro, notada desde los 4 meses; mayor en visión próxima"},{"campo":"Signos asociados","dato":"Giro compensatorio de cabeza a la derecha; preferencia de mirada izquierda"},{"campo":"Antecedentes","dato":"A término, desarrollo normal, sin enfermedad sistémica; sin antecedentes familiares de estrabismo ni ambliopía; sin exámenes previos"}],"secciones":[{"id":"hallazgos_clinicos","titulo":"Hallazgos clínicos","contenido":[{"tipo":"tabla","columnas":["Prueba","OD","OI"],"filas":[{"Prueba":"AV (9 meses)","OD":"Fija y sigue","OI":"Fija y sigue"},{"Prueba":"Refracción ciclopléjica inicial","OD":"+4,75 -0,75 × 175°","OI":"+2,25 -0,75 × 175°"},{"Prueba":"Refracción ciclopléjica (3 a 11 m)","OD":"+4,50 -0,75 × 175°","OI":"+1,75 -0,50 × 175°"},{"Prueba":"AV sin corrección (3 a 4 m)","OD":"6/36","OI":"6/12"},{"Prueba":"AV con corrección (3 a 4 m)","OD":"6/18","OI":"6/9"}]},{"tipo":"lista","items":["Sensoriomotor inicial: endotropía derecha intermitente de 30–35 Δ, confirmada por reflejo corneal; ducciones y versiones completas.","Segmentos anterior y posterior normales (fondo dilatado con lente Volk de 20 D); valoración neurológica normal.","Anisometropía hipermetrópica de +2,50 D (supera el umbral de ≥ +1,50 D a los 2–3 años y el de AAPOS > 1,25 D).","A los 4 a 2 meses: AC/A 7,5:1, AA 17,3 D, estereopsis 40″ de arco."]}]},{"id":"diagnostico_y_conducta_real","titulo":"Diagnóstico y conducta real","contenido":[{"tipo":"parrafo","texto":"Diagnóstico: astigmatismo hipermetrópico compuesto AO, ambliopía anisometrópica OD y endotropía refractiva (acomodativa) que se resuelve con gafas. Diagnósticos diferenciales descartados: endotropía infantil (inicio antes de 6 meses, ángulo constante, nistagmo latente, DVD), parcialmente acomodativa (sin desviación residual), sensorial (sin lesión estructural) y neurológica."},{"tipo":"parrafo","texto":"Conducta y evolución:"},{"tipo":"lista_numerada","items":["9 meses: corrección ciclopléjica total de uso permanente y remisión a neurología.","1 a 1 m y 1 a 7 m: ortotropía con gafas.","3 a 4 m: AV con corrección OD 6/18, OI 6/9; se inicia oclusión del OI 2–3 h/día.","3 a 11 m: OD 6/12, OI 6/6; se actualiza la fórmula y se mantiene la oclusión.","4 años: terapia dicóptica digital Bynocs con gafas anaglíficas rojo-azul, 30 min/día, 5 días/semana, 40–80 sesiones; OD 6/6−, OI 6/6. Oclusión reducida a 1 h/día.","Tras 35 sesiones: ortotropía estable; continuar hasta OD 6/6 y 10 sesiones de consolidación. Control cada 3–6 meses con refracción ciclopléjica."]}]}],"item_evaluacion":{"respuesta_correcta":"A","enunciado":"En la primera consulta (9 meses), ¿cuál es la conducta óptica indicada?","opciones":[{"id":"A","texto":"Corrección ciclopléjica total de uso permanente, incluida la anisometropía, con reevaluación del ángulo con gafas antes de decidir oclusión o cirugía.","es_correcta":true,"retroalimentacion":"La hipermetropía no corregida del OD (+4,75 -0,75 × 175°) exige un esfuerzo acomodativo que, por la sincinesia acomodación-convergencia, genera exceso de convergencia acomodativa y endodesviación. La anisometropía de 2,50 D añade una imagen retiniana desenfocada y monocular que favorece supresión y ambliopía del OD. La corrección ciclopléjica total relaja la demanda acomodativa, elimina el componente acomodativo de la desviación y equipara la nitidez interocular. La respuesta de alineación con gafas es a la vez tratamiento y prueba diagnóstica entre esotropía acomodativa refractiva, parcialmente acomodativa e infantil."},{"id":"B","texto":"Subcorrección simétrica de 1,50 D sobre la refracción ciclopléjica para no interferir con la emetropización, con control a 6 meses.","es_correcta":false,"retroalimentacion":"subcorregir es aceptable en hipermetropía sin estrabismo; con endotropía presente se indica la corrección total."},{"id":"C","texto":"Cirugía de dos músculos rectos horizontales antes del año, por tratarse de una endotropía de gran ángulo de inicio precoz.","es_correcta":false,"retroalimentacion":"la cirugía solo se plantea ante una desviación residual con la corrección total. Aquí el inicio a los 4 meses, la intermitencia y la hipermetropía significativa apuntan a etiología acomodativa, y las gafas lograron ortotropía."},{"id":"D","texto":"Corrección de la anisometropía más bifocal ejecutivo +3,00 D, por ser una desviación mayor en visión próxima.","es_correcta":false,"retroalimentacion":"el bifocal se reserva para exceso de convergencia con AC/A alto y desviación residual en cerca con la corrección total. Este paciente fue ortótropo en lejos y cerca solo con la fórmula ciclopléjica. Los prismas tampoco serían la primera línea: son más eficaces en desviaciones menores de 25 Δ."}],"justificacion_modelo":"La hipermetropía no corregida del OD (+4,75 -0,75 × 175°) exige un esfuerzo acomodativo que, por la sincinesia acomodación-convergencia, genera exceso de convergencia acomodativa y endodesviación. La anisometropía de 2,50 D añade una imagen retiniana desenfocada y monocular que favorece supresión y ambliopía del OD. La corrección ciclopléjica total relaja la demanda acomodativa, elimina el componente acomodativo de la desviación y equipara la nitidez interocular. La respuesta de alineación con gafas es a la vez tratamiento y prueba diagnóstica entre esotropía acomodativa refractiva, parcialmente acomodativa e infantil.","retroalimentacion_distractores":{"B":"subcorregir es aceptable en hipermetropía sin estrabismo; con endotropía presente se indica la corrección total.","C":"la cirugía solo se plantea ante una desviación residual con la corrección total. Aquí el inicio a los 4 meses, la intermitencia y la hipermetropía significativa apuntan a etiología acomodativa, y las gafas lograron ortotropía.","D":"el bifocal se reserva para exceso de convergencia con AC/A alto y desviación residual en cerca con la corrección total. Este paciente fue ortótropo en lejos y cerca solo con la fórmula ciclopléjica. Los prismas tampoco serían la primera línea: son más eficaces en desviaciones menores de 25 Δ."}}},{"id":"caso_03","numero":3,"titulo":"Ambliopía anisometrópica severa por miopía magna unilateral","resumen":"Niño de 8 años con anisometropía miópica axial de unas 9,50 D en el OI, que pasó de 20/150 a 20/100 en 12 meses con LCB tórico, oclusión del OD y terapia visual por etapas, pese a estar fuera del periodo crítico. Fuente: Calderón et al., reporte de caso, Barranquilla 2025–2026.","fuente":"Calderón et al., reporte de caso, Barranquilla 2025–2026","ficha_paciente":[{"campo":"Edad / sexo","dato":"8 años, masculino, región Caribe colombiana"},{"campo":"Motivo de consulta","dato":"Control por dificultad en visión lejana y próxima; gafas deterioradas"},{"campo":"Antecedentes oculares","dato":"Desviación divergente del OI desde los 2 años. A los 3 años: gafas permanentes y oclusión 2 h/día por cerca de 1 año, con baja adherencia; la oclusión se hacía sin la corrección puesta"},{"campo":"Antecedentes personales","dato":"A término (39 semanas), sin riesgo perinatal; lenguaje tardío (primeras palabras a los 3 años)"},{"campo":"Antecedentes familiares","dato":"Madre con miopía operada con cirugía refractiva"}],"secciones":[{"id":"hallazgos_clinicos_iniciales","titulo":"Hallazgos clínicos iniciales","contenido":[{"tipo":"tabla","columnas":["Prueba","OD","OI"],"filas":[{"Prueba":"AV sin corrección","OD":"20/30","OI":"20/1200"},{"Prueba":"AV con agujero estenopeico","OD":"20/20","OI":"20/400"},{"Prueba":"AV con corrección","OD":"20/20","OI":"20/150"},{"Prueba":"Refracción ciclopléjica (ciclopentolato 1 %)","OD":"Neutro −1,00 × 0°","OI":"−9,50 −1,50 × 170°"},{"Prueba":"Queratometría","OD":"42,75 / 44,02 × 10°","OI":"43,91 / 45,18 × 175°"},{"Prueba":"Paquimetría","OD":"530 µm","OI":"533 µm"},{"Prueba":"Longitud axial (Myopia Expert 700)","OD":"23,07 mm","OI":"26,18 mm"},{"Prueba":"Excavación papilar","OD":"0,5","OI":"0,7–0,8"}]},{"tipo":"lista","items":["Anisometropía de unas 9,50 D en equivalente esférico, de origen axial (diferencia de 3,11 mm de longitud axial con queratometrías similares).","Segmento anterior normal; nervio óptico rosado, retina aplicada, fondo sin lesiones; OCT de CFNR solicitada.","Sensoriomotor: ortoforia en VL y exoforia de 4 Δ en VP. Estereopsis no evaluada al inicio.","LCB tórico OI: 20/150. Prueba con LCRGP: 20/150, sin ganancia."]}]},{"id":"diagnostico_y_conducta_real","titulo":"Diagnóstico y conducta real","contenido":[{"tipo":"parrafo","texto":"Diagnóstico: ambliopía anisometrópica severa del OI por miopía magna unilateral (anisometropía > 9 D), con baja adherencia durante el periodo crítico."},{"tipo":"parrafo","texto":"Conducta:"},{"tipo":"lista_numerada","items":["LCB tórico OI de uso diario (comfilcon A), reemplazo bimensual, unas 12 h/día supervisado.","Gafa permanente con la fórmula del OD y neutro en OI, con filtro UV, antirreflejo y fotosensible, como protección bilateral.","Oclusión del OD 6 h/día (meses 1–3) y 4 h/día (meses 4–12), siempre con el LC puesto.","Terapia visual de 12 meses en fases monocular, biocular y binocular: fijación y discriminación, sacádicos y seguimientos, flippers acomodativos, integración binocular y PPC. Controles en consultorio cada 3 meses y oftalmológicos cada 6."]},{"tipo":"parrafo","texto":"Resultados tras más de 1 año:"},{"tipo":"tabla","columnas":["Parámetro","Inicial","Final"],"filas":[{"Parámetro":"AV OI con corrección","Inicial":"20/150","Final":"20/100"},{"Parámetro":"AA OD / OI","Inicial":"12 D / 4 D","Final":"12 D / 6 D"},{"Parámetro":"FA OD / OI (ciclos/min)","Inicial":"6 / 3","Final":"9 / 5"},{"Parámetro":"Sacádicos OI","Inicial":"Hipometría leve","Final":"Mejor precisión, hipometría leve"},{"Parámetro":"Estereopsis (Frisby)","Inicial":"300″","Final":"300″"},{"Parámetro":"Luces de Worth 3 m","Inicial":"Dos rojas (supresión del OI)","Final":"Igual"},{"Parámetro":"Luces de Worth 1 m","Inicial":"Cuatro luces intermitentes","Final":"Más estable"},{"Parámetro":"Luces de Worth 40 cm","Inicial":"Fusión (cuatro luces)","Final":"Igual"},{"Parámetro":"PPC","Inicial":"19 cm","Final":"15 cm"}]}]}],"item_evaluacion":{"respuesta_correcta":"D","enunciado":"Seleccione el criterio de corrección y manejo más adecuado:","opciones":[{"id":"A","texto":"Gafa con la corrección anisometrópica total (OI −9,50 −1,50 × 170°) y oclusión del OD 2 h/día, repitiendo el esquema inicial con mejor supervisión.","es_correcta":false,"retroalimentacion":"repite el esquema que ya fracasó y mantiene una gafa con alta disparidad de potencia, mal tolerada y con efectos prismáticos diferenciales; 2 h/día es una dosis baja para una ambliopía severa a los 8 años."},{"id":"B","texto":"LCRGP en el OI como primera elección por su mejor calidad óptica en miopía alta, más penalización atropínica del OD.","es_correcta":false,"retroalimentacion":"el LCRGP se probó sin ganancia (20/150); su ventaja se da en astigmatismo irregular, no en una córnea regular. La atropina no es la primera opción en ambliopía severa."},{"id":"C","texto":"Gafa de protección de policarbonato y control anual, ya que a los 8 años se cerró el periodo crítico y la ambliopía severa no es recuperable.","es_correcta":false,"retroalimentacion":"la plasticidad residual permite ganancias después de los 7–8 años, como muestra la mejora a 20/100 y de la AA y la FA."},{"id":"D","texto":"LCB tórico en el OI de uso diario, gafa de protección con fórmula del OD y neutro en OI, oclusión del OD 6 h/día con el LC puesto y terapia visual activa monocular, biocular y binocular.","es_correcta":true,"retroalimentacion":"Con una anisometropía axial de unas 9,50 D, la gafa induce minificación del OI, efecto prismático diferencial fuera del centro óptico (anisoforia inducida) y peso o grosor que bajan la adherencia. El LC sitúa la corrección en el plano corneal, elimina ese efecto prismático y da mejor calidad de imagen macular, lo que favorece una estimulación sensorial más equilibrada. El LCRGP no añadió AV porque la córnea es regular, así que el LCB tórico es la opción funcional. La oclusión solo es eficaz con el ojo amblíope corregido; el fracaso previo se explica por ocluir sin corrección. La terapia visual activa trabaja acomodación, sacádicos y fusión, déficits que la oclusión pasiva no corrige."}],"justificacion_modelo":"Con una anisometropía axial de unas 9,50 D, la gafa induce minificación del OI, efecto prismático diferencial fuera del centro óptico (anisoforia inducida) y peso o grosor que bajan la adherencia. El LC sitúa la corrección en el plano corneal, elimina ese efecto prismático y da mejor calidad de imagen macular, lo que favorece una estimulación sensorial más equilibrada. El LCRGP no añadió AV porque la córnea es regular, así que el LCB tórico es la opción funcional. La oclusión solo es eficaz con el ojo amblíope corregido; el fracaso previo se explica por ocluir sin corrección. La terapia visual activa trabaja acomodación, sacádicos y fusión, déficits que la oclusión pasiva no corrige.","retroalimentacion_distractores":{"A":"repite el esquema que ya fracasó y mantiene una gafa con alta disparidad de potencia, mal tolerada y con efectos prismáticos diferenciales; 2 h/día es una dosis baja para una ambliopía severa a los 8 años.","B":"el LCRGP se probó sin ganancia (20/150); su ventaja se da en astigmatismo irregular, no en una córnea regular. La atropina no es la primera opción en ambliopía severa.","C":"la plasticidad residual permite ganancias después de los 7–8 años, como muestra la mejora a 20/100 y de la AA y la FA."}}},{"id":"caso_04","numero":4,"titulo":"Ambliopía anisometrópica hipermetrópica no estrábica con alteración del neurodesarrollo","resumen":"Niña de 8 años (JPA) con ambliopía bilateral anisometrópica, peor en el OI, supresión y déficit oculomotor y lector tras 3 años de oclusión; alcanzó AV 1,2 AO y estereopsis de 20″ con LC de máxima binocularidad y terapia visual por etapas. Fuente: documento \"Caso ampliopía\" (reporte de terapia visual).","fuente":"documento \"Caso ampliopía\" (reporte de terapia visual)","ficha_paciente":[{"campo":"Edad / sexo","dato":"8 años, femenino"},{"campo":"Motivo de consulta","dato":"Remitida por la escuela: ve mal pese a las gafas, se acerca al papel, no copia de la pizarra, muecas, lectura lenta, faltas de ortografía, distracción"},{"campo":"Síntomas","dato":"Ojos cansados, frotamiento, cefalea ocasional; se salta líneas, confunde y repite palabras; letras \"como hormiguitas\"; agarre del lápiz anómalo"},{"campo":"Antecedentes oculares","dato":"\"Ojo vago\" a los 3,5 años. Gafas y parche todo el día: 3 días OD / 1 día OI durante 2 años; de los 5 a los 6,5 años, OD ocluido todo el día. Usa cicloplejía en cada control"},{"campo":"Antecedentes del desarrollo","dato":"Embarazo y parto normales, 3.220 g, APGAR 9; no gateó (\"gateo de culo\"), marcha a los 14 meses; insegura y torpe en la época del parche"}],"secciones":[{"id":"hallazgos_clinicos","titulo":"Hallazgos clínicos","contenido":[{"tipo":"tabla","columnas":["Prueba","OD","OI"],"filas":[{"Prueba":"Rx en uso","OD":"+2,50","OI":"+5,75 −2,25 × 175°"},{"Prueba":"AV lejos (4 m)","OD":"0,6 (multiestenopeico 0,8)","OI":"0,3 (multiestenopeico 0,4+)"},{"Prueba":"AV cerca","OD":"0,8 con dificultad","OI":"0,4 con dificultad"},{"Prueba":"Retinoscopía estática","OD":"+2,00","OI":"+5,00 −1,75 × 180°"},{"Prueba":"Lag acomodativo (MEM)","OD":"+0,75","OI":"+1,25"},{"Prueba":"Refracción subjetiva","OD":"+2,00 (0,7+2)","OI":"+5,00 −1,50 × 180° (0,4)"},{"Prueba":"Donders (borroso / recobro)","OD":"10 / 15 cm","OI":"25 / 29 cm"},{"Prueba":"Seguimientos (escala 0–4)","OD":"1+","OI":"1−"},{"Prueba":"Visuoscopía","OD":"Fijación central algo inestable","OI":"Fijación levemente excéntrica, inestable"}]},{"tipo":"lista","items":["AV binocular lejos 0,6 (una letra de 0,7); cerca 0,8.","CT: endoforia de 3–4 Δ en lejos y 5–6 Δ en cerca (Thorington y Howell similares), comitante.","Worth lejos: suprime el OI. Worth cerca: fusiona con supresión intermitente. Brückner: reflejo más brillante en el OI. Gafas polarizadas: suprime a 60 cm.","Prisma de 6 Δ BE: sin movimiento de refijación (supresión); sin SILO en vectograma.","Estereopsis: Titmus mosca dudosa, no ve animales. Sacádicos hipométricos (1/4); DEM p8. Fondo de ojo normal.","Lectura (Bisquerra): 19 palabras/min, percentil < 1, silábica. Campos (Syntonics) muy estrechos; punto ciego no medible.","Motor: torpeza y desequilibrio; reflejos tónico laberíntico y tónico asimétrico del cuello muy activos."]}]},{"id":"diagnostico_y_conducta_real","titulo":"Diagnóstico y conducta real","contenido":[{"tipo":"parrafo","texto":"Diagnóstico: ambliopía binocular anisometrópica, más severa en el OI, con supresión, insuficiencia acomodativa (marcada en OI), disfunción oculomotora y dificultades de aprendizaje asociadas a la ambliopía y al neurodesarrollo."},{"tipo":"parrafo","texto":"Conducta:"},{"tipo":"lista_numerada","items":["Rx de máxima binocularidad en LC: OD +2,25 / OI +3,00 −1,50 × 180°.","Fototerapia sintónica, 20 sesiones (4/semana). Es parte del protocolo del autor; tiene evidencia limitada.","Terapia visual semanal con trabajo diario en casa. Etapa monocular (3 sesiones): MIT, Marsden, saltos prismáticos, negativo mental. Etapa monocular en campo binocular (15 sesiones): filtro rojo con letras naranjas, metrónomo, tablas de Hart, flippers. Etapa binocular (10 sesiones): vectogramas, cordón de Brock, cheiroscopio, flippers con SILO, percepción (TVPS) e integración de reflejos primitivos."]},{"tipo":"parrafo","texto":"Evolución:"},{"tipo":"tabla","columnas":["Momento","AV OD / OI","Estereopsis","Rx OD / OI","Lectura"],"filas":[{"Momento":"Inicial","AV OD / OI":"0,6 / 0,3","Estereopsis":"No ve animales","Rx OD / OI":"+2,00 / +5,00 −1,50 × 180°","Lectura":"19 ppm (p<1)"},{"Momento":"Fin etapa 2","AV OD / OI":"1+ / 1","Estereopsis":"30″","Rx OD / OI":"+2,00 / +3,00 −1,25 × 180°","Lectura":"54 ppm (p36)"},{"Momento":"Alta","AV OD / OI":"1,2 / 1,2","Estereopsis":"20″","Rx OD / OI":"+2,00 / +3,25 −1,25 × 180°","Lectura":"71 ppm (p58)"},{"Momento":"6 meses","AV OD / OI":"1,2 / 1,2","Estereopsis":"20″","Rx OD / OI":"+1,75 / +3,00 −1,25 × 180°","Lectura":"79 ppm (p67)"}]},{"tipo":"parrafo","texto":"Al alta: sin supresión, Donders normal AO, DEM p68 (p75 a los 3 meses); vergencias en cerca BT 14/16/12 y BN 8/6."}]}],"item_evaluacion":{"respuesta_correcta":"C","enunciado":"Seleccione el criterio de corrección y manejo más adecuado:","opciones":[{"id":"A","texto":"Mantener la Rx ciclopléjica total en gafa (OI +5,00 −1,75 × 180°) y reiniciar la oclusión total del OD hasta igualar las AV.","es_correcta":false,"retroalimentacion":"repite una oclusión total ya agotada que además se asoció a inseguridad motora; no aborda la supresión ni la binocularidad."},{"id":"B","texto":"Gafa con la Rx de lejos y adición de +2,00 en bifocal por la insuficiencia acomodativa del OI (lag MEM +1,25), sin terapia visual.","es_correcta":false,"retroalimentacion":"la adición compensa el síntoma pero no recupera la AA del OI (Donders 4 D frente a un mínimo de Hofstetter de unos 13 D a los 8 años), ni la supresión ni la fijación excéntrica."},{"id":"C","texto":"LC con Rx de máxima binocularidad (OD +2,25 / OI +3,00 −1,50 × 180°) y terapia visual activa por etapas (monocular, monocular en campo binocular con antisupresión, binocular), ajustando la Rx según AV, estereopsis y MEM.","es_correcta":true,"retroalimentacion":"Tras 3 años de oclusión la paciente sigue con AV 0,3 en el OI, supresión (Worth, prisma de 6 Δ, Brückner) y sin estereopsis. El componente que falta es la cooperación binocular, no más privación del ojo dominante. En anisometropía refractiva el LC reduce la aniseiconia y los efectos prismáticos diferenciales de la gafa. La Rx se fija por respuesta binocular (AV, estereopsis, supresión) y no solo por la retinoscopía: reducir el positivo del OI acercó ambos ojos a una demanda acomodativa similar. La terapia activa por etapas trabaja fijación, acomodación, sacádicos y fusión con antisupresión; la mejora de lectura y DEM confirma que el déficit era funcional."},{"id":"D","texto":"Penalización atropínica del OD al 1 % los fines de semana, conservando la gafa actual.","es_correcta":false,"retroalimentacion":"la penalización es pasiva y de baja dosis; no trata la fijación excéntrica, la disfunción oculomotora ni la falta de estereopsis."}],"justificacion_modelo":"Tras 3 años de oclusión la paciente sigue con AV 0,3 en el OI, supresión (Worth, prisma de 6 Δ, Brückner) y sin estereopsis. El componente que falta es la cooperación binocular, no más privación del ojo dominante. En anisometropía refractiva el LC reduce la aniseiconia y los efectos prismáticos diferenciales de la gafa. La Rx se fija por respuesta binocular (AV, estereopsis, supresión) y no solo por la retinoscopía: reducir el positivo del OI acercó ambos ojos a una demanda acomodativa similar. La terapia activa por etapas trabaja fijación, acomodación, sacádicos y fusión con antisupresión; la mejora de lectura y DEM confirma que el déficit era funcional.","retroalimentacion_distractores":{"A":"repite una oclusión total ya agotada que además se asoció a inseguridad motora; no aborda la supresión ni la binocularidad.","B":"la adición compensa el síntoma pero no recupera la AA del OI (Donders 4 D frente a un mínimo de Hofstetter de unos 13 D a los 8 años), ni la supresión ni la fijación excéntrica.","D":"la penalización es pasiva y de baja dosis; no trata la fijación excéntrica, la disfunción oculomotora ni la falta de estereopsis."}}},{"id":"caso_05","numero":5,"titulo":"Ambliopía bilateral ametrópica por astigmatismo hipermetrópico","resumen":"Menor con AV de 20/100 en ambos ojos y astigmatismo hipermetrópico de 2,00 D simétrico, ortofórico; se indicó corrección total permanente y terapia visual activa. Fuente: \"Ambliopía bilateral: un abordaje integral para la restauración visual\", reporte de caso (Caso-Clínico-2).","fuente":"\"Ambliopía bilateral: un abordaje integral para la restauración visual\", reporte de caso (Caso-Clínico-2)","ficha_paciente":[{"campo":"Edad / sexo","dato":"Menor de edad; edad y sexo no reportados"},{"campo":"Fecha","dato":"24/07/2023, primera consulta de ortóptica, remitido por optometría"},{"campo":"Motivo de consulta","dato":"La madre lo trae para toma de agudeza visual"},{"campo":"Antecedentes","dato":"Niega antecedentes patológicos, sistémicos, familiares, farmacológicos, quirúrgicos y traumáticos"}],"secciones":[{"id":"hallazgos_clinicos","titulo":"Hallazgos clínicos","contenido":[{"tipo":"tabla","columnas":["Prueba","OD","OI","AO"],"filas":[{"Prueba":"AV sc VL (pantalla logarítmica de números)","OD":"20/100","OI":"20/100","AO":"20/100"},{"Prueba":"Retinoscopía dinámica","OD":"+2,50 −2,50 × 20°","OI":"+2,50 −2,00 × 0°","AO":"—"},{"Prueba":"Retinoscopía bajo cicloplejía","OD":"+2,00 −2,00 × 20°","OI":"+2,00 −2,00 × 0°","AO":"—"},{"Prueba":"AV con la corrección","OD":"20/100","OI":"20/100","AO":"20/100"}]},{"tipo":"lista","items":["Biomicroscopía normal (córnea transparente, pupilas isocóricas normorreactivas, conjuntiva sin hiperemia). Oftalmoscopía normal: retina aplicada, excavación 0,3, medios transparentes.","Dominancia ocular derecha; kappa positivo AO; Hirschberg centrado; versiones normales.","CT: ortoforia en VL, a 40 cm y a 20 cm.","Pendientes: PPC, RFP, RFN, sensibilidad al contraste y lag acomodativo.","Nota para el docente: el reporte da menos positivo bajo cicloplejía que en la dinámica, al revés de lo esperado. Puede usarse como pregunta de análisis crítico."]}]},{"id":"diagnostico_y_conducta_real","titulo":"Diagnóstico y conducta real","contenido":[{"tipo":"parrafo","texto":"Diagnóstico: ambliopía bilateral refractiva (ametrópica) por astigmatismo hipermetrópico compuesto de 2,00 D AO, con componente meridional, sin estrabismo y sin causa orgánica."},{"tipo":"parrafo","texto":"Conducta:"},{"tipo":"lista_numerada","items":["Corrección óptica de uso permanente con la fórmula ciclopléjica y control al mes.","Terapia visual de 6 sesiones de 45 min en consultorio más 10 min diarios en casa. Incluye fijación y AV; acomodación con flippers, lentes positivos y negativos y saltos de foco; vergencias con cordón de Brock, pelota de Marsden, barra de prismas y anaglifos; laberinto de Groffman; psicomotricidad y percepción visual.","Objetivo: AV 20/20 con fijación central estable, flexibilidad acomodativa y aumento de RFP y RFN."]}]}],"item_evaluacion":{"respuesta_correcta":"A","enunciado":"Seleccione la conducta óptica recomendada:","opciones":[{"id":"A","texto":"Corrección total del astigmatismo con la refracción ciclopléjica, de uso permanente, con un periodo de adaptación óptica y control al mes; luego terapia visual activa de acomodación y vergencias, sin oclusión por la simetría interocular.","es_correcta":true,"retroalimentacion":"La ambliopía ametrópica bilateral se debe al desenfoque crónico de ambas imágenes retinianas; un astigmatismo de 2,00 D sin corregir produce además privación meridional (ambliopía meridional). El tratamiento de primera línea es la corrección refractiva total, incluido el cilindro con su eje, de uso permanente. La AV suele mejorar progresivamente durante semanas solo con la gafa (adaptación óptica), y la AV con corrección del primer día no refleja el potencial. Como no hay diferencia interocular, estrabismo ni supresión, la oclusión no tiene indicación. La terapia activa refuerza la acomodación y las vergencias, a menudo deficientes en estos pacientes."},{"id":"B","texto":"Prescribir solo el equivalente esférico (+1,00 D AO) para facilitar la adaptación y reevaluar el cilindro cuando mejore la AV.","es_correcta":false,"retroalimentacion":"el equivalente esférico deja 1,00 D de desenfoque en cada meridiano principal y mantiene el estímulo ambliogénico meridional."},{"id":"C","texto":"Corrección total y oclusión del OD (dominante) 6 h/día para estimular el OI.","es_correcta":false,"retroalimentacion":"la AV es igual en AO (20/100); ocluir el ojo dominante en una ambliopía simétrica crea un desequilibrio sin justificación."},{"id":"D","texto":"Corrección total y oclusión alterna diaria, por tratarse de una ambliopía bilateral.","es_correcta":false,"retroalimentacion":"la oclusión alterna se reserva para casos con asimetría o riesgo de ambliopía inversa; aquí la corrección óptica es suficiente como primera etapa."}],"justificacion_modelo":"La ambliopía ametrópica bilateral se debe al desenfoque crónico de ambas imágenes retinianas; un astigmatismo de 2,00 D sin corregir produce además privación meridional (ambliopía meridional). El tratamiento de primera línea es la corrección refractiva total, incluido el cilindro con su eje, de uso permanente. La AV suele mejorar progresivamente durante semanas solo con la gafa (adaptación óptica), y la AV con corrección del primer día no refleja el potencial. Como no hay diferencia interocular, estrabismo ni supresión, la oclusión no tiene indicación. La terapia activa refuerza la acomodación y las vergencias, a menudo deficientes en estos pacientes.","retroalimentacion_distractores":{"B":"el equivalente esférico deja 1,00 D de desenfoque en cada meridiano principal y mantiene el estímulo ambliogénico meridional.","C":"la AV es igual en AO (20/100); ocluir el ojo dominante en una ambliopía simétrica crea un desequilibrio sin justificación.","D":"la oclusión alterna se reserva para casos con asimetría o riesgo de ambliopía inversa; aquí la corrección óptica es suficiente como primera etapa."}}},{"id":"caso_06","numero":6,"titulo":"Glaucoma congénito primario con miopía alta degenerativa, endotropía y nistagmo","resumen":"Niña de 11 años con GCP bilateral operado, miopía axial de unas −15 D, endotropía de 65 Δ y nistagmo latente; los LCB convencionales personalizados superaron a la gafa y al LCRGP en AV, tolerancia y control del nistagmo. Fuente: Carvajal, Muñoz, Peñaloza y Narváez, Universidad Santo Tomás, 2026.","fuente":"Carvajal, Muñoz, Peñaloza y Narváez, Universidad Santo Tomás, 2026","ficha_paciente":[{"campo":"Edad / sexo","dato":"11 años, femenino; 5.º de primaria; Chitagá, Norte de Santander"},{"campo":"Motivo de consulta","dato":"Disminución progresiva de AV en lejos y cerca; busca alternativas para mejorar el desempeño visual"},{"campo":"Antecedentes oculares","dato":"GCP bilateral, miopía alta, endotropía, nistagmo, ambliopía refractiva; gafas desde el primer año"},{"campo":"Antecedentes quirúrgicos","dato":"Cirugía de glaucoma con iridectomía bilateral a los 5–6 días de vida; cirugía de estrabismo a los 2 años"},{"campo":"Tratamiento actual","dato":"Latanoprost 0,005 %, 1 gota/día, desde los 7 años (entonces 6 meses sin tratamiento, PIO OD 20 / OI 12 mmHg)"},{"campo":"Antecedentes familiares","dato":"Sin glaucoma; miopía por línea materna"},{"campo":"Contexto psicosocial","dato":"Acoso escolar por el grosor de las gafas; postura cerrada y encorvada sin LC"}],"secciones":[{"id":"hallazgos_clinicos","titulo":"Hallazgos clínicos","contenido":[{"tipo":"tabla","columnas":["Prueba","OD","OI"],"filas":[{"Prueba":"AV sc VL","OD":"20/200 (PH 20/160)","OI":"20/200 (PH 20/160)"},{"Prueba":"AV con gafa en uso","OD":"20/100","OI":"20/100"},{"Prueba":"Nueva Rx en gafa","OD":"−15,00 −1,25 × 15° (20/160)","OI":"−14,50 −2,00 × 140° (20/125)"},{"Prueba":"Tomografía corneal K1 / K2 / Km","OD":"42,3 / 43,5 / 42,8 D","OI":"42,9 / 45,2 / 44,0 D"},{"Prueba":"Astigmatismo corneal","OD":"−1,2 D","OI":"−2,3 D"},{"Prueba":"Paquimetría (punto más fino / central)","OD":"539 / 555 µm","OI":"527 / 542 µm"},{"Prueba":"Longitud axial","OD":"29,75 mm","OI":"28,73 mm"},{"Prueba":"Promedio CFNR (OCT, IQV 45 / 55)","OD":"68 µm","OI":"84 µm"},{"Prueba":"Densidad endotelial","OD":"2.812 cél/mm²","OI":"3.032 cél/mm²"},{"Prueba":"CV / hexagonalidad","OD":"32 % / 53 %","OI":"29 % / 67 %"},{"Prueba":"PIO (latanoprost)","OD":"14 mmHg","OI":"14 mmHg"},{"Prueba":"Excavación clínica","OD":"0,8","OI":"0,8"}]},{"tipo":"lista","items":["Sensoriomotor: nistagmo latente horizontal puro; Krimsky directo con endotropía alternante, dominancia derecha, básica, concomitante de 65 Δ; versiones y ducciones normales.","Biomicroscopía: iridectomía superior bilateral, sin inflamación. Fondo: disco inclinado y coroidosis miópica, sin progresión aguda.","OCT con pérdida de CFNR superior e inferior AO, poco fiable por la longitud axial y el nistagmo (relación E/P OD 0,23 frente a 0,8 clínica).","Endotelio dentro de la norma (densidad > 2.500, CV < 40 %, hexagonalidad > 50 %), apto para LC."]}]},{"id":"diagnostico_y_conducta_real","titulo":"Diagnóstico y conducta real","contenido":[{"tipo":"parrafo","texto":"Diagnóstico: miopía alta axial degenerativa secundaria a GCP, con astigmatismo miópico compuesto con la regla, ambliopía refractiva isometrópica moderada, endotropía alternante de gran ángulo y nistagmo latente."},{"tipo":"parrafo","texto":"Pruebas de LC (12/02/2026):"},{"tipo":"tabla","columnas":["Lente","Parámetros","AV OD / OI","Resultado"],"filas":[{"Lente":"LCRGP Focon III (Dk 42)","Parámetros":"Ø 9,4 mm, asférico; sobrerrefracción OD −3,00 / OI −1,00","AV OD / OI":"20/125 / 20/125","Resultado":"Centrado, movimiento y fluorograma adecuados; mala tolerancia"},{"Lente":"LCB samfilcon A (Ultra)","Parámetros":"−12,00 D, Ø 14,2 mm, CB 8,5 mm, moldeado","AV OD / OI":"20/100 / 20/80","Resultado":"Mejor tolerancia y control del nistagmo; descentración inferior leve"},{"Lente":"LCB personalizado Hidrosoft (definitivo)","Parámetros":"OD esférico −12,50 (Contaflex 38 %); OI tórico −12,00 −1,25 × 140° (GM Advance 58 %); Ø 14,5 mm, CB 8,5 mm, torneado","AV OD / OI":"20/100+4 / 20/70+2 (día 12)","Resultado":"Movimiento adecuado, sin tinción con fluoresceína"}]},{"tipo":"parrafo","texto":"Con LC: Ishihara normal AO; estereopsis (Titmus, círculos) de 400″ a 200″ a los 12 días. La paciente prefiere los LC y mejoran su postura y su autoestima. Se mantiene latanoprost y control conjunto con oftalmología."}]}],"item_evaluacion":{"respuesta_correcta":"D","enunciado":"Seleccione el criterio de corrección más adecuado:","opciones":[{"id":"A","texto":"LCRGP asférico como primera elección, por ofrecer la mejor calidad óptica y seguridad en miopía elevada, con un periodo de adaptación progresivo.","es_correcta":false,"retroalimentacion":"la preferencia teórica por el LCRGP no aplica sin irregularidad corneal; la mala tolerancia impidió abrir los ojos y valorar la AV o el nistagmo."},{"id":"B","texto":"Contraindicar los LC por el antecedente quirúrgico y el uso crónico de prostaglandinas, y actualizar la gafa bicóncava en alto índice.","es_correcta":false,"retroalimentacion":"el GCP operado no contraindica por sí mismo el LC si el endotelio y la superficie están sanos; la gafa da peor AV (20/100) y tiene impacto psicosocial documentado."},{"id":"C","texto":"LCB esférico desechable de stock (−12,00 D, Ø 14,2 mm) en AO, ya que el astigmatismo corneal es bajo.","es_correcta":false,"retroalimentacion":"el lente de stock mostró descentración inferior y deja sin corregir el astigmatismo residual del OI."},{"id":"D","texto":"LCB convencional personalizado de mayor diámetro (14,5 mm), esférico en OD y tórico en OI, tras confirmar un endotelio apto, con seguimiento conjunto con oftalmología y control de la PIO.","es_correcta":true,"retroalimentacion":"En una miopía de unas −15 D, el LC elimina la minificación y las aberraciones periféricas de la gafa y aumenta el tamaño de la imagen retiniana, lo que mejora la AV. Además, al moverse con el ojo, mantiene el eje óptico centrado durante el nistagmo y puede amortiguarlo por estímulo táctil. La topografía descarta irregularidad corneal, así que el LCRGP no tiene ventaja óptica y fue mal tolerado. El LCB de stock se descentró hacia abajo y la sobrerrefracción mostró cilindro residual en el OI, por eso se personaliza el diámetro y se usa diseño tórico en ese ojo. El recuento endotelial dentro de la norma (densidad, CV < 40 %, hexagonalidad > 50 %) autoriza el uso de LC pese al GCP, con control de PIO y de la superficie ocular."}],"justificacion_modelo":"En una miopía de unas −15 D, el LC elimina la minificación y las aberraciones periféricas de la gafa y aumenta el tamaño de la imagen retiniana, lo que mejora la AV. Además, al moverse con el ojo, mantiene el eje óptico centrado durante el nistagmo y puede amortiguarlo por estímulo táctil. La topografía descarta irregularidad corneal, así que el LCRGP no tiene ventaja óptica y fue mal tolerado. El LCB de stock se descentró hacia abajo y la sobrerrefracción mostró cilindro residual en el OI, por eso se personaliza el diámetro y se usa diseño tórico en ese ojo. El recuento endotelial dentro de la norma (densidad, CV < 40 %, hexagonalidad > 50 %) autoriza el uso de LC pese al GCP, con control de PIO y de la superficie ocular.","retroalimentacion_distractores":{"A":"la preferencia teórica por el LCRGP no aplica sin irregularidad corneal; la mala tolerancia impidió abrir los ojos y valorar la AV o el nistagmo.","B":"el GCP operado no contraindica por sí mismo el LC si el endotelio y la superficie están sanos; la gafa da peor AV (20/100) y tiene impacto psicosocial documentado.","C":"el lente de stock mostró descentración inferior y deja sin corregir el astigmatismo residual del OI."}}},{"id":"caso_07","numero":7,"titulo":"Persistencia de vasculatura fetal con catarata congénita unilateral","resumen":"Varón seguido desde los 5 días hasta los 14 años por PVF y catarata congénita densa del OD; pese a cirugía al mes de vida, LC afáquico y oclusión, terminó con ambliopía profunda, microftalmos y endotropía sensorial operada. Fuente: Ramírez, Jaimes, Moreno y Narváez, Universidad Santo Tomás (reporte de caso).","fuente":"Ramírez, Jaimes, Moreno y Narváez, Universidad Santo Tomás (reporte de caso)","ficha_paciente":[{"campo":"Edad / sexo","dato":"Neonato (5 días) al diagnóstico; 14 años en el último control; masculino"},{"campo":"Motivo de consulta","dato":"Leucocoria unilateral del OD detectada en los primeros días de vida; remitido a oftalmología pediátrica"},{"campo":"Antecedentes familiares","dato":"Sin antecedentes oftalmológicos relevantes"},{"campo":"Hallazgos neonatales OD","dato":"Catarata densa, microftalmos leve, vasos en iris, placa calcárea nasal sobre el eje visual; fondo no visible"},{"campo":"Ecografía OD","dato":"Longitud axial disminuida, retina aplicada, sin membranas; compatible con PVF"},{"campo":"OI","dato":"Biomicroscopía normal"}],"secciones":[{"id":"evolucion_clinica","titulo":"Evolución clínica","contenido":[{"tipo":"tabla","columnas":["Edad / año","Hallazgos","AV OD / OI","Rx OD / OI","Conducta"],"filas":[{"Edad / año":"5 días (2010)","Hallazgos":"Catarata densa OD, microftalmos, vasos persistentes","AV OD / OI":"No valorable","Rx OD / OI":"No valorable","Conducta":"Diagnóstico de PVF; indicación quirúrgica"},{"Edad / año":"1 mes (2010)","Hallazgos":"Afaquia OD tras cirugía","AV OD / OI":"No cuantificable","Rx OD / OI":"OD ≈ +18,00 D","Conducta":"LC OD y oclusión OI 3–4 h/día"},{"Edad / año":"2011","Hallazgos":"Eje visual transparente, megapapila","AV OD / OI":"No cuantificable","Rx OD / OI":"OD +12,00 a +15,00 D","Conducta":"LC permanente y oclusión"},{"Edad / año":"2012","Hallazgos":"Mejor cooperación, heterocromía","AV OD / OI":"20/30 / 20/30 (mirada preferencial)","Rx OD / OI":"OD +12,00 D","Conducta":"LC y oclusión"},{"Edad / año":"2013","Hallazgos":"Endotropía comitante adquirida","AV OD / OI":"20/60 / 20/30","Rx OD / OI":"OD +11,00 / OI +3,00","Conducta":"Gafas; valoración de estrabismo"},{"Edad / año":"2014 (4 años)","Hallazgos":"Endotropía persistente","AV OD / OI":"< 20/80 / 20/30","Rx OD / OI":"OD +11,00","Conducta":"Cirugía de 2 rectos del OD"},{"Edad / año":"2016","Hallazgos":"Estabilidad anatómica, PIO normal","AV OD / OI":"Cuenta dedos a 1 m / 20/25","Rx OD / OI":"OD neutro / OI +2,00","Conducta":"Seguimiento"},{"Edad / año":"2024 (14 años)","Hallazgos":"Microftalmos, pupila rígida, eje transparente","AV OD / OI":"Baja visión / 20/20 sc","Rx OD / OI":"OD neutro / OI +0,25","Conducta":"Gafa de protección de ojo único, control anual, opción de LC cosmoprotésico"}]},{"tipo":"lista","items":["Cirugía (≈ 1 mes): capsulectomía, aspiración de masas, vitrectorrexis posterior y vitrectomía anterior, preservando el sector nasal muy vascularizado; sin complicaciones.","Primer semestre: mala adherencia al LC y a la oclusión por la edad; ajustes frecuentes de potencia y uso alternante de gafa como protección.","Secuelas: microftalmia leve, heterocromía de iris, pupila amplia, rígida y descentrada a nasal, megapapila; PIO normal a límite alto, sin glaucoma.","A los 14 años no usa corrección de forma regular y está asintomático."]}]},{"id":"diagnostico","titulo":"Diagnóstico","contenido":[{"tipo":"parrafo","texto":"Persistencia de vasculatura fetal (forma anterior/mixta) con catarata congénita unilateral del OD; afaquia quirúrgica; ambliopía profunda por deprivación; endotropía sensorial comitante operada; microftalmos. Pronóstico visual reservado para el OD."}]}],"item_evaluacion":{"respuesta_correcta":"B","enunciado":"Lactante de 1 mes con afaquia unilateral del OD tras extracción de catarata por PVF. Seleccione el criterio de corrección:","opciones":[{"id":"A","texto":"Gafa afáquica de +18,00 D en el OD y neutro en el OI, por su facilidad de manejo y menor riesgo infeccioso.","es_correcta":false,"retroalimentacion":"la gafa afáquica sirve en afaquia bilateral, no unilateral, por la aniseiconia y la anisoforia inducidas."},{"id":"B","texto":"LC afáquico de alta potencia en el OD (unos +18,00 D), con ajustes frecuentes por el crecimiento axial, más oclusión del OI 3–4 h/día y gafa como protección y respaldo.","es_correcta":true,"retroalimentacion":"La afaquia unilateral en el primer mes de vida es el escenario de mayor riesgo de ambliopía por deprivación, y cada semana sin imagen enfocada compromete el desarrollo cortical. Una gafa de +18 D en un solo ojo produce aniseiconia muy alta (del orden del 25–30 %) y efectos prismáticos que impiden cualquier fusión. El LC reduce la magnificación relativa a niveles compatibles con visión binocular. El ojo afáquico pierde la acomodación y compite en desventaja con el OI, por eso la oclusión parcial (3–4 h/día) es obligatoria. El crecimiento axial reduce la hipermetropía afáquica (+18 a +11 D en 3 años), lo que exige reajustes frecuentes. La mala adherencia y la microftalmia explican el resultado limitado."},{"id":"C","texto":"Diferir la corrección óptica hasta que se pueda medir la AV (unos 2 años) y vigilar mientras tanto la PIO.","es_correcta":false,"retroalimentacion":"diferir la corrección en el periodo crítico garantiza una ambliopía por deprivación irreversible."},{"id":"D","texto":"LC afáquico en el OD sin oclusión, porque en el lactante la oclusión del ojo sano provoca ambliopía inversa.","es_correcta":false,"retroalimentacion":"sin oclusión, el OI dominante suprime al ojo afáquico; el riesgo de ambliopía inversa se controla con oclusión parcial y controles cercanos, no evitando la oclusión."}],"justificacion_modelo":"La afaquia unilateral en el primer mes de vida es el escenario de mayor riesgo de ambliopía por deprivación, y cada semana sin imagen enfocada compromete el desarrollo cortical. Una gafa de +18 D en un solo ojo produce aniseiconia muy alta (del orden del 25–30 %) y efectos prismáticos que impiden cualquier fusión. El LC reduce la magnificación relativa a niveles compatibles con visión binocular. El ojo afáquico pierde la acomodación y compite en desventaja con el OI, por eso la oclusión parcial (3–4 h/día) es obligatoria. El crecimiento axial reduce la hipermetropía afáquica (+18 a +11 D en 3 años), lo que exige reajustes frecuentes. La mala adherencia y la microftalmia explican el resultado limitado.","retroalimentacion_distractores":{"A":"la gafa afáquica sirve en afaquia bilateral, no unilateral, por la aniseiconia y la anisoforia inducidas.","C":"diferir la corrección en el periodo crítico garantiza una ambliopía por deprivación irreversible.","D":"sin oclusión, el OI dominante suprime al ojo afáquico; el riesgo de ambliopía inversa se controla con oclusión parcial y controles cercanos, no evitando la oclusión."},"item_adicional_sugerido":"Segunda decisión para un ítem adicional: a los 14 años, con OD de baja visión y OI 20/20, la conducta correcta es gafa de protección de ojo único (policarbonato o Trivex), control anual y valorar un LC cosmoprotésico, no reiniciar terapia antiambliopíca."}}];

  // ─── Data Loading ─────────────────────────────────────────
  async function loadCasesData() {
    let rawData = null;

    try {
      const r = await fetch('casos_clinicos_optometria_pediatrica.json');
      if (r.ok) {
        const json = await r.json();
        if (json.casos && Array.isArray(json.casos) && json.casos.length > 0) rawData = json.casos;
      }
    } catch (_) {}

    if (!rawData) {
      try {
        const r = await fetch('Casos Clinicos.json');
        if (r.ok) {
          const json = await r.json();
          if (Array.isArray(json) && json.length > 0) rawData = json;
        }
      } catch (_) {}
    }

    if (!rawData || rawData.length === 0) { rawData = DEFAULT_CASES_DATA; }
    state.casesData = rawData.map(normalizeCase);

    const savedIndex = sessionStorage.getItem('optokids_case_index');
    state.currentCaseIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
    if (state.currentCaseIndex >= state.casesData.length) state.currentCaseIndex = 0;

    // Update hero stat count
    const statEl = document.querySelector('[data-stat="casos"]');
    if (statEl) statEl.textContent = state.casesData.length;
  }

  // ─── Case Rendering ───────────────────────────────────────
  function loadCurrentCase() {
    if (!state.casesData.length) return;
    if (!caseTitle) cacheCaseDom();

    const c = state.casesData[state.currentCaseIndex];
    if (!c) return;

    state.selectedOption = null;
    state.evaluated = false;

    caseTitle.textContent = cleanCite(c.titulo);
    caseTitle.title = cleanCite(c.titulo);
    caseCurrent.textContent = state.currentCaseIndex + 1;
    caseTotal.textContent = state.casesData.length;

    if (fieldEdad) fieldEdad.textContent = cleanCite(c.edad);
    if (fieldMotivo) fieldMotivo.textContent = cleanCite(c.motivo_consulta);

    if (fieldAntecedentes) {
      if (c._newFormat && c.ficha_paciente?.length > 0) {
        const antFields = c.ficha_paciente.filter(f =>
          f.campo && !f.campo.toLowerCase().includes('edad') &&
          !f.campo.toLowerCase().includes('motivo') &&
          !f.campo.toLowerCase().includes('fecha')
        );
        if (antFields.length > 0) {
          fieldAntecedentes.innerHTML = antFields.map(f =>
            `<span class="ant-row"><strong>${f.campo}:</strong> ${cleanCite(f.dato)}</span>`
          ).join('');
        } else {
          fieldAntecedentes.textContent = cleanCite(c.antecedentes);
        }
      } else {
        fieldAntecedentes.textContent = cleanCite(c.antecedentes);
      }
    }

    if (fieldCoverTest) fieldCoverTest.textContent = cleanCite(c.examen_motor?.cover_test);
    if (fieldMotilidad) fieldMotilidad.textContent = cleanCite(c.examen_motor?.motilidad);
    if (fieldAgudeza) fieldAgudeza.textContent = cleanCite(c.refraccion?.agudeza_visual);
    if (fieldRetinoscopia) fieldRetinoscopia.textContent = cleanCite(c.refraccion?.retinoscopia);

    if (caseExtraInfo) {
      if (c._extra_html) {
        caseExtraInfo.innerHTML = c._extra_html;
        caseExtraInfo.style.display = 'block';
      } else {
        caseExtraInfo.style.display = 'none';
      }
    }

    const enunciadoEl = $('#form-label-conduct');
    if (enunciadoEl) enunciadoEl.textContent = c._enunciado || 'Seleccione la conducta óptica recomendada:';

    renderRadioOptions(c);

    if (textarea) { textarea.value = ''; textarea.disabled = false; }
    if (btnEvaluate) btnEvaluate.disabled = true;
    if (evaluateBtnWrapper) evaluateBtnWrapper.classList.remove('is-hidden');
    if (feedbackPanel) {
      feedbackPanel.style.display = 'none';
      feedbackPanel.classList.remove('fb-enter');
    }
    if (feedbackBanner) feedbackBanner.className = 'feedback-banner';

    if (btnNextLabel) {
      btnNextLabel.textContent = state.currentCaseIndex >= state.casesData.length - 1
        ? 'Volver al Inicio' : 'Siguiente Caso';
    }
    sessionStorage.setItem('optokids_case_index', state.currentCaseIndex);
  }

  function renderRadioOptions(c) {
    if (!radioGroup) return;
    radioGroup.innerHTML = '';

    const opts = c._opciones_raw?.length > 0 ? c._opciones_raw
      : c.opciones_conducta.map((t, i) => ({ id: String.fromCharCode(65 + i), texto: t }));

    opts.forEach((opt, i) => {
      const label = document.createElement('label');
      label.className = 'radio-option';
      label.setAttribute('data-index', i);
      label.setAttribute('data-id', opt.id || i);

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'conduct-option';
      radio.value = i;
      radio.id = `conduct-opt-${i}`;

      const badge = document.createElement('span');
      badge.className = 'radio-option-badge';
      badge.textContent = opt.id || String.fromCharCode(65 + i);

      const span = document.createElement('span');
      span.className = 'radio-option-text';
      const rawText = opt.texto || '';
      span.textContent = rawText.replace(/^[A-D]\.\s*/, '');

      label.appendChild(radio);
      label.appendChild(badge);
      label.appendChild(span);

      label.addEventListener('click', () => {
        if (state.evaluated) return;
        state.selectedOption = i;
        radioGroup.querySelectorAll('.radio-option').forEach(el => el.classList.remove('selected'));
        label.classList.add('selected');
        radio.checked = true;
        if (btnEvaluate) btnEvaluate.disabled = false;
      });

      radioGroup.appendChild(label);
    });
  }

  // ─── Evaluation ───────────────────────────────────────────
  function evaluateConduct() {
    if (state.selectedOption === null || state.evaluated) return;
    const c = state.casesData[state.currentCaseIndex];
    if (!c) return;
    state.evaluated = true;

    let correctIndex = c._correcta_index;
    if (correctIndex < 0 || correctIndex === undefined) {
      const correctText = cleanCite(c.conducta_correcta).replace(/\.$/, '').trim();
      correctIndex = (c.opciones_conducta || []).findIndex(opt => {
        const cleaned = cleanCite(opt).replace(/\.$/, '').trim();
        return correctText.toLowerCase().includes(cleaned.toLowerCase()) ||
               cleaned.toLowerCase().includes(correctText.toLowerCase());
      });
    }

    const isCorrect = state.selectedOption === correctIndex;
    const opts = c._opciones_raw || [];
    const selectedOpt = opts[state.selectedOption] || { texto: c.opciones_conducta?.[state.selectedOption] || '—' };
    const correctOpt  = opts[correctIndex] || { texto: c.conducta_correcta || '—' };

    radioGroup.querySelectorAll('.radio-option').forEach((el, i) => {
      el.classList.add('disabled');
      const inp = el.querySelector('input[type="radio"]');
      if (inp) inp.disabled = true;
      if (i === correctIndex) el.classList.add('correct');
      if (i === state.selectedOption && !isCorrect) el.classList.add('incorrect');

      const optId = el.getAttribute('data-id');
      const retroText = c._retroalimentacion_all?.[optId];
      if (retroText && i !== correctIndex) {
        const hint = document.createElement('span');
        hint.className = 'radio-option-hint';
        hint.textContent = retroText;
        el.appendChild(hint);
      }
    });

    if (textarea) textarea.disabled = true;
    if (evaluateBtnWrapper) evaluateBtnWrapper.classList.add('is-hidden');

    if (feedbackPanel) {
      feedbackPanel.style.display = 'block';
      void feedbackPanel.offsetWidth;
      feedbackPanel.classList.add('fb-enter');
    }

    if (isCorrect) {
      if (feedbackBanner) feedbackBanner.className = 'feedback-banner feedback-banner--correct';
      if (feedbackIcon) feedbackIcon.textContent = '✓';
      if (feedbackTitle) feedbackTitle.textContent = '¡Respuesta Correcta!';
      if (feedbackSubtitle) feedbackSubtitle.textContent = 'Tu criterio clínico coincide con la conducta óptica recomendada.';
      incrementCounter();
    } else {
      if (feedbackBanner) feedbackBanner.className = 'feedback-banner feedback-banner--incorrect';
      if (feedbackIcon) feedbackIcon.textContent = '✗';
      if (feedbackTitle) feedbackTitle.textContent = 'Respuesta Incorrecta';
      if (feedbackSubtitle) feedbackSubtitle.textContent = 'Revisa la justificación clínica para entender el razonamiento correcto.';
    }

    const selectedText = (selectedOpt.texto || '').replace(/^[A-D]\.\s*/, '') || '—';
    const correctText  = (correctOpt.texto || '').replace(/^[A-D]\.\s*/, '') || cleanCite(c.conducta_correcta);

    if (feedbackStudentAnswer) {
      feedbackStudentAnswer.textContent = selectedText;
      feedbackStudentAnswer.className = isCorrect
        ? 'feedback-row-value feedback-row-value--ok'
        : 'feedback-row-value feedback-row-value--ko';
    }
    if (feedbackCorrect) feedbackCorrect.textContent = correctText;
    if (feedbackJustification) feedbackJustification.textContent = cleanCite(c.justificacion_clinica);
    if (feedbackBiblio) feedbackBiblio.textContent = c.bibliografia || 'Sin referencia disponible.';

    setTimeout(() => {
      if (feedbackPanel) feedbackPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  function nextCase() {
    if (state.currentCaseIndex >= state.casesData.length - 1) {
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
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(link.dataset.view); });
    });
    if (btnStart) btnStart.addEventListener('click', () => navigateTo('casos'));
    if (btnLearnMore) btnLearnMore.addEventListener('click', scrollToInfo);

    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-navigate]');
      if (navEl) { e.preventDefault(); navigateTo(navEl.dataset.navigate); }
    });

    window.addEventListener('popstate', handleHash);
    window.addEventListener('scroll', handleScroll, { passive: true });

    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-evaluate')) evaluateConduct();
      if (e.target.closest('#btn-next-case')) nextCase();
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

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
