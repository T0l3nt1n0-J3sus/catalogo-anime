const contenedor = document.getElementById('contenedor-anime');
const modal = document.getElementById('modal-anime');
const modalCuerpo = document.getElementById('modal-cuerpo');
const formBusqueda = document.getElementById('form-busqueda');
const inputBusqueda = document.getElementById('input-busqueda');

let temporizadorBusqueda;

// 1. Búsqueda en tiempo real mientras escribes
inputBusqueda.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  const textoBuscado = inputBusqueda.value.trim();

  temporizadorBusqueda = setTimeout(() => {
    if (textoBuscado.length >= 2) {
      buscarAnime(textoBuscado);
    } else if (textoBuscado.length === 0) {
      const botonInicial = document.querySelector('.filtros button');
      cargarAnimes('seasons/now', botonInicial);
    }
  }, 500);
});

// Evita que la página se recargue si presionas Enter o el botón Buscar
formBusqueda.addEventListener('submit', (e) => {
  e.preventDefault();
  clearTimeout(temporizadorBusqueda);
  const textoBuscado = inputBusqueda.value.trim();
  if (textoBuscado) {
    buscarAnime(textoBuscado);
  }
});

// 2. Cargar categorías principales
async function cargarAnimes(categoria, botonSeleccionado = null) {
  if (botonSeleccionado) {
    document.querySelectorAll('.filtros button').forEach(btn => btn.classList.remove('activo'));
    botonSeleccionado.classList.add('activo');
    inputBusqueda.value = '';
  }

  contenedor.innerHTML = '<p class="mensaje">Cargando catálogo...</p>';

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
          title { romaji english }
          coverImage { large }
          averageScore
          episodes
          status
          description
          trailer { id site }
        }
      }
    }
  `;

  ejecutarConsultaAniList(query);
}

// 3. Buscar por nombre
async function buscarAnime(nombre) {
  document.querySelectorAll('.filtros button').forEach(btn => btn.classList.remove('activo'));
  contenedor.innerHTML = `<p class="mensaje">Buscando "${nombre}"...</p>`;

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 16) {
        media(type: ANIME, search: $search, isAdult: false) {
          title { romaji english }
          coverImage { large }
          averageScore
          episodes
          status
          description
          trailer { id site }
        }
      }
    }
  `;

  ejecutarConsultaAniList(query, { search: nombre });
}

// 4. Conectar con AniList y dibujar las tarjetas
async function ejecutarConsultaAniList(query, variables = {}) {
  try {
    // Construimos la URL de la API por partes para que nunca se recorte al copiar
    const urlApi = new URL('https://anilist.co');
    urlApi.hostname = 'graphql.anilist.co';

    const respuesta = await fetch(urlApi.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: query, variables: variables })
    });

    const resultado = await respuesta.json();
    const listaAnimes = resultado.data.Page.media;
    
    contenedor.innerHTML = '';

    if (listaAnimes.length === 0) {
      contenedor.innerHTML = '<p class="mensaje">No se encontraron animes con ese nombre.</p>';
      return;
    }

    listaAnimes.forEach(anime => {
      const titulo = anime.title.english || anime.title.romaji;
      const puntuacion = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'Sin nota';

      const tarjeta = document.createElement('article');
      tarjeta.classList.add('tarjeta-anime');

      tarjeta.innerHTML = `
        <img src="${anime.coverImage.large}" alt="${titulo}">
        <div class="info">
          <h3 title="${titulo}">${titulo}</h3>
          <p>⭐ ${puntuacion} | 📺 ${anime.episodes || '?'} eps</p>
        </div>
      `;

      tarjeta.addEventListener('click', () => abrirModal(anime, titulo, puntuacion));
      contenedor.appendChild(tarjeta);
    });

  } catch (error) {
    console.error('Detalle del fallo:', error);
    contenedor.innerHTML = `<p class="mensaje">Error al cargar. Revisa la consola.</p>`;
  }
}

// 5. Ventana emergente con sinopsis y enlace directo al tráiler
function abrirModal(anime, titulo, puntuacion) {
  const sinopsis = anime.description || 'No hay sinopsis disponible.';
  const tieneTrailer = anime.trailer && anime.trailer.site === 'youtube' && anime.trailer.id;

  const urlYoutube = new URL('https://youtube.com');

  if (tieneTrailer) {
    urlYoutube.pathname = '/watch';
    urlYoutube.searchParams.set('v', anime.trailer.id);
  } else {
    urlYoutube.pathname = '/results';
    urlYoutube.searchParams.set('search_query', titulo + ' anime trailer');
  }

  modalCuerpo.innerHTML = `
    <h2>${titulo}</h2>
    <p><strong>Estado:</strong> ${anime.status} | <strong>Puntuación:</strong> ⭐ ${puntuacion}</p>
    <div style="line-height: 1.5; color: #ccc; margin: 15px 0;">${sinopsis}</div>
    <a href="${urlYoutube.href}" target="_blank" rel="noopener noreferrer" class="btn-trailer">
      ${tieneTrailer ? '▶ Ver Tráiler Oficial en YouTube' : '🔍 Buscar Tráiler en YouTube'}
    </a>
  `;

  modal.classList.remove('oculto');
}

function cerrarModal() {
  modal.classList.add('oculto');
}

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    cerrarModal();
  }
});

// Iniciar cargando En Emisión
cargarAnimes('seasons/now');
