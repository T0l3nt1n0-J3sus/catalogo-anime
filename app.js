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
    notificacionCuerpo: 'Te avisaremos cuando se estrene: ',
    traduciendo: 'Traduciendo sinopsis al español...'
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
    notificacionCuerpo: 'We will notify you upon release of: ',
    traduciendo: 'Translating synopsis...'
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
    const sep = String.fromCharCode(47);
    const urlApi = 'https:' + sep + sep + 'graphql.anilist.co';

    const respuesta = await fetch(urlApi, {
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
  const textoLimpio = textoHTML.replace(/<[^>]*>?/gm, '');
  const fragmento = textoLimpio.substring(0, 450);

  try {
    const sep = String.fromCharCode(47);
    const preg = String.fromCharCode(63);
    const igual = String.fromCharCode(61);
    const apiTraductor = 'https:' + sep + sep + 'api.mymemory.translated.net' + sep + 'get' + preg + 'q' + igual + encodeURIComponent(fragmento) + '&langpair' + igual + 'en|es';
    
    const respuesta = await fetch(apiTraductor);
    const datos = await respuesta.json();
    
    if (datos && datos.responseData && datos.responseData.translatedText) {
      return datos.responseData.translatedText + (textoLimpio.length > 450 ? '...' : '');
    }
    return textoLimpio;
  } catch (error) {
    return textoLimpio;
  }
}

async function abrirModal(anime, titulo, puntuacion) {
  const t = textos[idiomaActual];
  const sinopsisOriginal = anime.description || t.sinSinopsis;
  const tieneTrailer = anime.trailer && anime.trailer.site === 'youtube' && anime.trailer.id;
const tieneAlarma = obtenerAlarmas().some(a => a.id === anime.id);
const f = anime.startDate;
let fechaTexto = 'Por confirmar';
if (f && f.year) {
const d = f.day || '01';
const m = f.month || '01';
fechaTexto = d + '/' + m + '/' + f.year;
}
const sep = String.fromCharCode(47);
const preg = String.fromCharCode(63);
const igual = String.fromCharCode(61);
const protocolo = 'https:' + sep + sep;
const tituloSeguro = encodeURIComponent(titulo);
let urlYT = protocolo + 'youtube.com' + sep + 'results' + preg + 'search_query' + igual + tituloSeguro + '+anime+trailer';
if (tieneTrailer) {
urlYT = protocolo + 'youtube.com' + sep + 'watch' + preg + 'v' + igual + encodeURIComponent(anime.trailer.id);
}
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
const hoy = new Date();
const manana = new Date(hoy);
manana.setDate(hoy.getDate() + 1);
fechaInicioCal = hoy.toISOString().slice(0, 10).replace(/-/g, '');
fechaFinCal = manana.toISOString().slice(0, 10).replace(/-/g, '');
}
  const subCal = 'calendar' + '.' + 'google.com';
  const urlCal = protocolo + subCal + sep + 'calendar' + sep + 'render' + preg + 'action' + igual + 'TEMPLATE' +
    '&text' + igual + encodeURIComponent('Estreno Anime: ' + titulo) +
    '&dates' + igual + fechaInicioCal + sep + fechaFinCal +
    '&details' + igual + encodeURIComponent('Ver estreno en AnimeWorld');
modalCuerpo.innerHTML = '';
const h2 = document.createElement('h2');
h2.textContent = titulo;
const pInfo = document.createElement('p');
pInfo.innerHTML = '' + t.estado + ': ' + anime.status + ' | ' + t.puntuacion + ': ⭐ ' + puntuacion;
const pFecha = document.createElement('p');
pFecha.innerHTML = '' + t.estreno + ': 📅 ' + fechaTexto;
const divSinopsis = document.createElement('div');
divSinopsis.id = 'caja-sinopsis';
divSinopsis.style.lineHeight = '1.5';
divSinopsis.style.color = '#ccc';
divSinopsis.style.margin = '15px 0';
divSinopsis.textContent = (idiomaActual === 'es' && anime.description) ? t.traduciendo : sinopsisOriginal.replace(/<[^>]*>?/gm, '');
const divAcciones = document.createElement('div');
divAcciones.className = 'acciones-modal';
const btnTrailer = document.createElement('button');
btnTrailer.className = 'btn-trailer';
btnTrailer.textContent = tieneTrailer ? t.verTrailer : t.buscarTrailer;
btnTrailer.onclick = function() {
window.open(urlYT, '_blank', 'noopener,noreferrer');
};
const btnAlarma = document.createElement('button');
btnAlarma.className = tieneAlarma ? 'btn-alarma activa' : 'btn-alarma';
btnAlarma.textContent = tieneAlarma ? t.alarmaActiva : t.activarAlarma;
btnAlarma.onclick = function() {
alternarAlarma(anime.id);
};
const btnCalendar = document.createElement('button');
btnCalendar.className = 'btn-calendario';
btnCalendar.textContent = t.agendarCal;
btnCalendar.onclick = function() {
window.open(urlCal, '_blank', 'noopener,noreferrer');
};
divAcciones.appendChild(btnTrailer);
divAcciones.appendChild(btnAlarma);
divAcciones.appendChild(btnCalendar);
modalCuerpo.appendChild(h2);
modalCuerpo.appendChild(pInfo);
modalCuerpo.appendChild(pFecha);
modalCuerpo.appendChild(divSinopsis);
modalCuerpo.appendChild(divAcciones);
modal.classList.remove('oculto');
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