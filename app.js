const contenedor = document.getElementById('contenedor-anime');
const modal = document.getElementById('modal-anime');
const modalCuerpo = document.getElementById('modal-cuerpo');
const formBusqueda = document.getElementById('form-busqueda');
const inputBusqueda = document.getElementById('input-busqueda');

let idiomaActual = 'es';
let temporizadorBusqueda;
let listaAnimesActuales = [];

const textos = {
  es: {
    titulo: 'Catálogo de Anime',
    placeholder: 'Buscar anime (ej. Naruto, Bleach, One Piece)...',
    buscar: 'Buscar',
    emision: 'En Emisión (Nuevos)',
    populares: 'Más Populares',
    proximos: 'Próximos Estrenos',
    misAlarmas: '🔔 Mis Alarmas',
    cargando: 'Cargando catálogo...',
    sinResultados: 'No se encontraron animes con ese nombre.',
    sinAlarmas: 'Aún no tienes alarmas activadas. Abre cualquier anime y presiona "Activar Alarma".',
    estado: 'Estado',
    puntuacion: 'Puntuación',
    estreno: 'Fecha de Estreno',
    sinSinopsis: 'No hay sinopsis disponible.',
    verTrailer: '▶ Ver Tráiler Oficial',
    buscarTrailer: '🔍 Buscar Tráiler en YouTube',
    activarAlarma: '🔔 Activar Alarma',
    alarmaActiva: '✅ Alarma Activada (Quitar)',
    agendarCal: '📅 Agendar en Google Calendar',
    notificacionTitulo: '¡Alarma de Anime Activada!',
    notificacionCuerpo: 'Te avisaremos cuando se estrene: '
  },
  en: {
    titulo: 'Anime Catalog',
    placeholder: 'Search anime (e.g. Naruto, Bleach, One Piece)...',
    buscar: 'Search',
    emision: 'Airing Now (New)',
    populares: 'Most Popular',
    proximos: 'Upcoming Releases',
    misAlarmas: '🔔 My Alarms',
    cargando: 'Loading catalog...',
    sinResultados: 'No anime found with that name.',
    sinAlarmas: 'You have no alarms set yet. Open any anime and click "Set Alarm".',
    estado: 'Status',
    puntuacion: 'Score',
    estreno: 'Release Date',
    sinSinopsis: 'No synopsis available.',
    verTrailer: '▶ Watch Official Trailer',
    buscarTrailer: '🔍 Search Trailer on YouTube',
    activarAlarma: '🔔 Set Alarm',
    alarmaActiva: '✅ Alarm Set (Remove)',
    agendarCal: '📅 Add to Google Calendar',
    notificacionTitulo: 'Anime Alarm Set!',
    notificacionCuerpo: 'We will notify you upon release of: '
  }
};

function cambiarIdioma(nuevoIdioma) {
  idiomaActual = nuevoIdioma;
  const t = textos[idiomaActual];

  document.getElementById('titulo-principal').textContent = t.titulo;
  inputBusqueda.placeholder = t.placeholder;
  document.getElementById('btn-buscar').textContent = t.buscar;
  document.getElementById('tab-emision').textContent = t.emision;
  document.getElementById('tab-populares').textContent = t.populares;
  document.getElementById('tab-proximos').textContent = t.proximos;
  actualizarContadorAlarmas();
}

function obtenerAlarmas() {
  return JSON.parse(localStorage.getItem('anime_alarmas')) || [];
}

function actualizarContadorAlarmas() {
  const cantidad = obtenerAlarmas().length;
  document.getElementById('btn-mis-alarmas').textContent = `${textos[idiomaActual].misAlarmas} (${cantidad})`;
}

async function alternarAlarma(animeId) {
  const anime = listaAnimesActuales.find(a => a.id === animeId) || obtenerAlarmas().find(a => a.id === animeId);
  if (!anime) return;

  let alarmas = obtenerAlarmas();
  const indice = alarmas.findIndex(a => a.id === anime.id);

  if (indice > -1) {
    alarmas.splice(indice, 1);
    localStorage.setItem('anime_alarmas', JSON.stringify(alarmas));
  } else {
    if ('Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }

    alarmas.push(anime);
    localStorage.setItem('anime_alarmas', JSON.stringify(alarmas));

    if ('Notification' in window && Notification.permission === 'granted') {
      const titulo = anime.title.english || anime.title.romaji;
      new Notification(textos[idiomaActual].notificacionTitulo, {
        body: textos[idiomaActual].notificacionCuerpo + titulo,
        icon: anime.coverImage.large
      });
    }
  }

  actualizarContadorAlarmas();
  const titulo = anime.title.english || anime.title.romaji;
  const puntuacion = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
  abrirModal(anime, titulo, puntuacion);
}

function mostrarMisAlarmas() {
  document.querySelectorAll('.filtros button').forEach(btn => btn.classList.remove('activo'));
  const alarmas = obtenerAlarmas();
  listaAnimesActuales = alarmas;
  contenedor.innerHTML = '';

  if (alarmas.length === 0) {
    contenedor.innerHTML = `<p class="mensaje">${textos[idiomaActual].sinAlarmas}</p>`;
    return;
  }

  renderizarListaAnimes(alarmas);
}

inputBusqueda.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  const textoBuscado = inputBusqueda.value.trim();

  temporizadorBusqueda = setTimeout(() => {
    if (textoBuscado.length >= 2) {
      buscarAnime(textoBuscado);
    } else if (textoBuscado.length === 0) {
      cargarAnimes('seasons/now', document.getElementById('tab-emision'));
    }
  }, 500);
});

formBusqueda.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(temporizadorBusqueda);
  const textoBuscado = inputBusqueda.value.trim();
  if (textoBuscado) buscarAnime(textoBuscado);
});

async function cargarAnimes(categoria, botonSeleccionado = null) {
  if (botonSeleccionado) {
    document.querySelectorAll('.filtros button').forEach(btn => btn.classList.remove('activo'));
    botonSeleccionado.classList.add('activo');
    inputBusqueda.value = '';
  }

  contenedor.innerHTML = `<p class="mensaje">${textos[idiomaActual].cargando}</p>`;

  let filtroAniList = 'sort: TRENDING_DESC, status: RELEASING';
  if (categoria === 'top/anime') {
    filtroAniList = 'sort: POPULARITY_DESC';
  } else if (categoria === 'seasons/upcoming') {
    filtroAniList = 'sort: POPULARITY_DESC, status: NOT_YET_RELEASED';
  }

  const query = `
    query {
      Page(page: 1, perPage: 16) {
        media(type: ANIME, ${filtroAniList}, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          averageScore
          episodes
          status
          startDate { year month day }
          description
          trailer { id site }
        }
      }
    }
  `;

  ejecutarConsultaAniList(query);
}

async function buscarAnime(nombre) {
  document.querySelectorAll('.filtros button').forEach(btn => btn.classList.remove('activo'));
  contenedor.innerHTML = `<p class="mensaje">${textos[idiomaActual].cargando}</p>`;

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 16) {
        media(type: ANIME, search: $search, isAdult: false) {
          id
          title { romaji english }
          coverImage { large }
          averageScore
          episodes
          status
          startDate { year month day }
          description
          trailer { id site }
        }
      }
    }
  `;

  ejecutarConsultaAniList(query, { search: nombre });
}

async function ejecutarConsultaAniList(query, variables = {}) {
  try {
    const urlApi = new URL('https://anilist.co');
    urlApi.hostname = 'graphql.anilist.co';

    const respuesta = await fetch(urlApi.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: query, variables: variables })
    });

    const resultado = await respuesta.json();
    const listaAnimes = resultado.data.Page.media;
    listaAnimesActuales = listaAnimes;
    contenedor.innerHTML = '';

    if (listaAnimes.length === 0) {
      contenedor.innerHTML = `<p class="mensaje">${textos[idiomaActual].sinResultados}</p>`;
      return;
    }

    renderizarListaAnimes(listaAnimes);

  } catch (error) {
    console.error('Detalle del fallo:', error);
    contenedor.innerHTML = `<p class="mensaje">Error al cargar. Revisa la consola.</p>`;
  }
}

function renderizarListaAnimes(listaAnimes) {
  const alarmasGuardadas = obtenerAlarmas();

  listaAnimes.forEach(anime => {
    const titulo = anime.title.english || anime.title.romaji;
    const puntuacion = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
    const tieneAlarma = alarmasGuardadas.some(a => a.id === anime.id);

    const tarjeta = document.createElement('article');
    tarjeta.classList.add('tarjeta-anime');

    tarjeta.innerHTML = `
      ${tieneAlarma ? '<span class="badge-alarma">🔔 Alarma</span>' : ''}
      <img src="${anime.coverImage.large}" alt="${titulo}">
      <div class="info">
        <h3 title="${titulo}">${titulo}</h3>
        <p>⭐ ${puntuacion} | 📺 ${anime.episodes || '?'} eps</p>
      </div>
    `;

    tarjeta.addEventListener('click', () => abrirModal(anime, titulo, puntuacion));
    contenedor.appendChild(tarjeta);
  });
}

async function traducirTextoAEspanol(textoHTML) {
  // Limpiamos etiquetas HTML básicas como <br> o <i> que manda AniList
  const textoLimpio = textoHTML.replace(/<[^>]*>?/gm, '');
  
  // Limitamos a 450 caracteres para que la traducción gratuita sea instantánea
  const fragmento = textoLimpio.substring(0, 450);

  try {
    const apiTraductor = 'https://' + 'api.mymemory.translated.net/get?q=' + encodeURIComponent(fragmento) + '&langpair=en|es';
    const respuesta = await fetch(apiTraductor);
    const datos = await respuesta.json();
    
    if (datos && datos.responseData && datos.responseData.translatedText) {
      return datos.responseData.translatedText + (textoLimpio.length > 450 ? '...' : '');
    }
    return textoLimpio;
  } catch (error) {
    return textoLimpio; // Si falla el traductor, muestra el original sin romperse
  }
}

async function abrirModal(anime, titulo, puntuacion) {
  const t = textos[idiomaActual];
  const sinopsisOriginal = anime.description || t.sinSinopsis;
  const tieneTrailer = anime.trailer && anime.trailer.site === 'youtube' && anime.trailer.id;
  const tieneAlarma = obtenerAlarmas().some(a => a.id === anime.id);

  const f = anime.startDate;
  const fechaTexto = (f && f.year) ? `${f.day || '01'}/${f.month || '01'}/${f.year}` : 'Por confirmar';

  // 1. Enlace seguro a YouTube
  const tituloSeguro = encodeURIComponent(titulo);
  let linkYoutube = 'https://' + '://youtube.com' + tituloSeguro + '+anime+trailer';
  if (tieneTrailer) {
    linkYoutube = 'https://' + '://youtube.com' + encodeURIComponent(anime.trailer.id);
  }

  // 2. Enlace corregido a Google Calendar (requiere fecha inicio y fecha fin +1 día)
  let fechaInicioCal, fechaFinCal;
  if (f && f.year) {
    const anio = f.year;
    const mes = f.month || 1;
    const dia = f.day || 1;
    const fechaObj = new Date(anio, mes - 1, dia);
    const fechaSiguiente = new Date(anio, mes - 1, dia + 1);

    fechaInicioCal = fechaObj.toISOString().slice(0, 10).replace(/-/g, '');
    fechaFinCal = fechaSiguiente.toISOString().slice(0, 10).replace(/-/g, '');
  } else {
    // Si no tiene fecha confirmada, pone la fecha de hoy para que el link abra bien
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(hoy.getDate() + 1);

    fechaInicioCal = hoy.toISOString().slice(0, 10).replace(/-/g, '');
    fechaFinCal = manana.toISOString().slice(0, 10).replace(/-/g, '');
  }

  const hostCal = 'https://' + '://google.com';
  const rutaCal = '/calendar/u/0/r/eventedit';
  const paramsCal = `?text=${encodeURIComponent('Estreno Anime: ' + titulo)}&dates=${fechaInicioCal}/${fechaFinCal}&details=${encodeURIComponent('Ver estreno en AnimeWorld')}`;
  const linkCalendar = hostCal + rutaCal + paramsCal;

  // Mostramos el modal primero con aviso de traducción si está en español
  modalCuerpo.innerHTML = `
    <h2>${titulo}</h2>
    <p><strong>${t.estado}:</strong> ${anime.status} | <strong>${t.puntuacion}:</strong> ⭐ ${puntuacion}</p>
    <p><strong>${t.estreno}:</strong> 📅 ${fechaTexto}</p>
    <div id="caja-sinopsis" style="line-height: 1.5; color: #ccc; margin: 15px 0;">
      ${idiomaActual === 'es' && anime.description ? '<em>Traduciendo sinopsis al español...</em>' : sinopsisOriginal}
    </div>
    
    <div class="acciones-modal">
      <a href="${linkYoutube}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
        ${tieneTrailer ? t.verTrailer : t.buscarTrailer}
      </a>
      <button onclick="alternarAlarma(${anime.id})" class="btn-alarma ${tieneAlarma ? 'activa' : ''}">
        ${tieneAlarma ? t.alarmaActiva : t.activarAlarma}
      </button>
      <a href="${linkCalendar}" target="_blank" rel="noopener noreferrer" class="btn-calendario">
        ${t.agendarCal}
      </a>
    </div>
  `;

  modal.classList.remove('oculto');

  // Si el idioma está en español y hay descripción, la traducimos y actualizamos la caja
  if (idiomaActual === 'es' && anime.description) {
    const sinopsisTraducida = await traducirTextoAEspanol(anime.description);
    const cajaSinopsis = document.getElementById('caja-sinopsis');
    if (cajaSinopsis) {
      cajaSinopsis.textContent = sinopsisTraducida;
    }
  }
}

function cerrarModal() {
modal.classList.add('oculto');
}
window.addEventListener('click', (e) => {
if (e.target === modal) cerrarModal();
});
actualizarContadorAlarmas();
cargarAnimes('seasons/now');