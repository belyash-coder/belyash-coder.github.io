// ==========================================
// 1. НАСТРОЙКИ СЕРВИСОВ (ВСТАВЬ СВОИ КЛЮЧИ)
// ==========================================

// --- ИНИЦИАЛИЗАЦИЯ FIREBASE ---
const firebaseConfig = {
            apiKey: "AIzaSyApms5m5o0JPl1Y4Jqubu5NLgQN_KQJa6A",
            authDomain: "random-genre-e3924.firebaseapp.com",
            projectId: "random-genre-e3924",
            storageBucket: "random-genre-e3924.firebasestorage.app",
            messagingSenderId: "288570895876",
            appId: "1:288570895876:web:249cc37618866560518f51"
        };

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth(); 
}

// --- НАСТРОЙКИ SPOTIFY API ---
const spotifyClientId = '631ff3f6b3e5434fb1d50c201ae509ae';
const spotifyClientSecret = 'c439abc33c074f6391eb001a31cb0930';
let spotifyAccessToken = '';
let spotifyIFrameAPI = null; // Сюда загрузится пульт управления
window.onSpotifyIframeApiReady = (IFrameAPI) => {
    spotifyIFrameAPI = IFrameAPI;
};

// ==========================================
// 2. ФУНКЦИИ SPOTIFY API
// ==========================================

async function getSpotifyToken() {
    const authString = btoa(`${spotifyClientId}:${spotifyClientSecret}`);
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });
        const data = await response.json();
        spotifyAccessToken = data.access_token;
        console.log("Токен Spotify получен!");
    } catch (error) {
        console.error("Ошибка при получении токена Spotify:", error);
    }
}

async function fetchTracksByGenre(genre) {
    if (!spotifyAccessToken) {
        await getSpotifyToken();
    }
    try {
        const query = encodeURIComponent(`genre:"${genre.toLowerCase()}"`);
        const url = `https://api.spotify.com/v1/search?q=${query}&type=track&limit=3`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${spotifyAccessToken}` }
        });
        
        const data = await response.json();
        return data.tracks ? data.tracks.items : [];
    } catch (error) {
        console.error("Ошибка при поиске треков:", error);
        return [];
    }
}

// ==========================================
// 3. ПЕРЕМЕННЫЕ ИНТЕРФЕЙСА
// ==========================================

// База жанров (из database.js)
const genres = typeof musicGenres !== 'undefined' ? musicGenres : [];

// Левое меню (фильтры)
const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");
const closeFilterBtn = document.getElementById("closeFilterBtn"); // Теперь это кнопка "Применить"
let activeFilter = "all"; 
let activeRegion = "all"; 

// Рулетка и главная страница
const wheel = document.getElementById("rouletteWheel");
const button = document.getElementById("spinBtn");
const dailyGenreDisplay = document.getElementById("dailyGenre");
const hint = document.getElementById("genreHint");
const orDivider = document.getElementById("orDivider");
const rouletteBox = document.querySelector(".roulette-box");

// Модальное окно (информация о жанре)
const modal = document.getElementById("genreModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalTitle = document.getElementById("modalGenreTitle");

let isSpinning = false;
let hasResult = false; 

// ==========================================
// 4. ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ
// ==========================================

// ЖАНР ДНЯ
if (dailyGenreDisplay && genres.length > 0) {
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate(); 
    const dailyIndex = dateSeed % genres.length;
    dailyGenreDisplay.innerText = genres[dailyIndex];
}

// ЛОГИКА РУЛЕТКИ
if (button && wheel) {
    button.addEventListener("click", () => {
        if (isSpinning) return; 
        
        isSpinning = true;
        hasResult = false; 
        rouletteBox.style.cursor = "default";
        button.style.opacity = "0.5";
        if (hint) hint.classList.remove("show");
        
        wheel.style.transition = "none";
        wheel.style.transform = "translateY(0)";
        wheel.innerHTML = "";

        const tapeLength = 40;
        const itemHeight = 120;

        // Фильтруем массив: Жанр + Регион
        let pool = genres.filter(genre => {
            const g = genre.toLowerCase();
            
            let matchGenre = false;
            if (activeFilter === "all") matchGenre = true;
            else if (activeFilter === "rock") matchGenre = g.includes("rock") || g.includes("metal") || g.includes("punk") || g.includes("grunge");
            else if (activeFilter === "pop") matchGenre = g.includes("pop") && !g.includes("rock") && !g.includes("punk");
            else if (activeFilter === "electronic") {
                matchGenre = g.includes("techno") || g.includes("house") || 
                             g.includes("electro") || g.includes("trance") || 
                             g.includes("step") || g.includes("bass") || 
                             g.includes("ambient") || g.includes("synth");
            }
            else if (activeFilter === "hiphop") matchGenre = g.includes("hop") || g.includes("rap") || g.includes("trap") || g.includes("r&b");
            else if (activeFilter === "jazz") matchGenre = g.includes("jazz") || g.includes("blues") || g.includes("soul") || g.includes("funk");
            
            let matchRegion = false;
            if (activeRegion === "all") matchRegion = true;
            else if (activeRegion === "russian") matchRegion = g.includes("russian") || g.includes("soviet") || g.includes("belarusian") || g.includes("ukrainian");
            else if (activeRegion === "asian") matchRegion = g.includes("j-") || g.includes("k-") || g.includes("japanese") || g.includes("korean") || g.includes("chinese");
            else if (activeRegion === "latin") matchRegion = g.includes("latin") || g.includes("spanish") || g.includes("mexican") || g.includes("brazilian") || g.includes("cumbia");

            return matchGenre && matchRegion;
        });

        if (pool.length === 0) pool = ["Не найдено (сбрось фильтры)"];

        for (let i = 0; i < tapeLength; i++) {
            const div = document.createElement("div");
            div.className = "genre-item";
            div.innerText = pool[Math.floor(Math.random() * pool.length)];
            wheel.appendChild(div);
        }

        const stopPosition = (tapeLength - 1) * itemHeight;

        setTimeout(() => {
            wheel.style.transition = "transform 4.5s cubic-bezier(0.4, 0, 0.1, 1)";
            wheel.style.transform = `translateY(-${stopPosition}px)`;
        }, 50);

        setTimeout(() => {
            isSpinning = false;
            button.style.opacity = "1";
            wheel.lastElementChild.classList.add("highlight-result");
            
            if (hint) hint.classList.add("show");
            button.innerText = "Попробовать еще";
            if (orDivider) orDivider.classList.add("show");
            
            hasResult = true;
            rouletteBox.style.cursor = "pointer";
        }, 4550);
    });
}

// --- ЛОГИКА ОТКРЫТИЯ ОКНА ЖАНРА + SPOTIFY ---
let activePlayer = null; // 1. Выносим переменную на самый верх блока, чтобы она была "видна" всем

if (rouletteBox && modal && closeModalBtn) {
    // Полная замена обработчика клика по рулетке
rouletteBox.addEventListener("click", async () => {
    if (hasResult && !isSpinning) {
        const finalGenre = wheel.lastElementChild.innerText;
        modalTitle.innerText = finalGenre;
        
        // 1. Очищаем описание
        const descriptionBlock = document.getElementById("genreDescription");
        descriptionBlock.innerHTML = `Погрузитесь в атмосферу <b>${finalGenre}</b>.`;
        
        // 2. Очищаем контейнер ПЕРЕД показом окна
        const container = document.getElementById("spotifyTracksContainer");
        container.innerHTML = `<div style="text-align:center; padding:20px;">Загрузка...</div>`;
        
        modal.classList.add("active");
        
        // 3. Запрос треков
        const tracks = await fetchTracksByGenre(finalGenre);
        
        // 4. Отрисовка
        if (tracks && tracks.length > 0) {
            container.innerHTML = ''; // Вот тут мы УБИВАЕМ спиннер
            const listWrapper = document.createElement('div');
            listWrapper.className = 'spotify-embed-list';
            container.appendChild(listWrapper);

            tracks.forEach((track, index) => {
                const item = document.createElement('div');
                item.className = 'spotify-embed-item loading';
                item.id = `embed-wrapper-${index}`;
                item.innerHTML = `<div id="spotify-player-${index}"></div>`;
                listWrapper.appendChild(item);
            });

            // 5. Инициализация
            if (spotifyIFrameAPI) {
                tracks.forEach((track, index) => {
                    const targetDiv = document.getElementById(`spotify-player-${index}`);
                    const wrapper = document.getElementById(`embed-wrapper-${index}`);
                    
                    spotifyIFrameAPI.createController(targetDiv, {
                        width: '100%',
                        height: '80',
                        uri: `spotify:track:${track.id}`,
                        theme: '0'
                    }, (EmbedController) => {
                        EmbedController.addListener('ready', () => {
                            if (wrapper) wrapper.classList.remove('loading');
                        });
                        EmbedController.addListener('playback_update', e => {
                            if (e.data && e.data.isPaused === false) {
                                if (activePlayer && activePlayer !== EmbedController) activePlayer.pause();
                                activePlayer = EmbedController;
                            }
                        });
                    });
                });
            }
        } else {
            container.innerHTML = `<p style="text-align:center; padding:20px;">Треки не найдены.</p>`;
        }
    }
});

    // 2. Функция для закрытия окна и остановки музыки
    const closeGenreModal = () => {
        modal.classList.remove("active");
        if (activePlayer) {
            activePlayer.pause(); // Останавливаем музыку
            activePlayer = null;  // Сбрасываем плеер
        }
    };

    // Привязываем функцию к кнопке и клику по фону
    closeModalBtn.addEventListener("click", closeGenreModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeGenreModal();
    });
}

// ==========================================
// 5. ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ СОБЫТИЙ (Ожидаем загрузки страницы)
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    
    // Заставка
    const splash = document.getElementById("splashScreen");
    if (splash) {
        setTimeout(() => splash.classList.add("hidden"), 3300);
    }

    // Бургер-меню (справа)
    const burgerBtn = document.getElementById('burgerBtn');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    if (burgerBtn && sidebarMenu && sidebarOverlay && closeSidebarBtn) {
        burgerBtn.addEventListener('click', () => {
            sidebarMenu.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
        const closeSidebar = () => {
            sidebarMenu.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        };
        closeSidebarBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    // Модальное окно фильтров (слева)
    const chips = document.querySelectorAll(".filter-chip");
    const rChips = document.querySelectorAll(".region-chip");

    if (filterBtn && filterModal && closeFilterBtn) {
        filterBtn.addEventListener("click", () => {
            if (!isSpinning) filterModal.classList.add("active");
        });

        // Теперь closeFilterBtn — это кнопка "Применить"
        closeFilterBtn.addEventListener("click", () => filterModal.classList.remove("active"));
        filterModal.addEventListener("click", (e) => {
            if (e.target === filterModal) filterModal.classList.remove("active");
        });

        if (chips.length > 0) {
            chips.forEach(chip => {
                chip.addEventListener("click", () => {
                    chips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    activeFilter = chip.getAttribute("data-filter");
                });
            });
        }

        if (rChips.length > 0) {
            rChips.forEach(chip => {
                chip.addEventListener("click", () => {
                    rChips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    activeRegion = chip.getAttribute("data-region");
                });
            });
        }
    }

    // Нижняя навигация
    const navItems = document.querySelectorAll('.nav-item');
    if (navItems.length > 0) {
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
});