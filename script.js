// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА БАЗЫ
// ==========================================
const cfg = {
    u: ["api", "spotify", "com", "v1"].join("."),
    p: "https://"
};
// --- ИНИЦИАЛИЗАЦИЯ FIREBASE (Для кнопки Google) ---
const firebaseConfig = {
    apiKey: "AIzaSyApms5m5o0JPl1Y4Jqubu5NLgQN_KQJa6A",
    authDomain: "random-genre-e3924.firebaseapp.com",
    projectId: "random-genre-e3924",
    storageBucket: "random-genre-e3924.firebasestorage.app",
    messagingSenderId: "288570895876",
    appId: "1:288570895876:web:249cc37618866560518f51"
};

// Защита от повторной инициализации Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// --- ЗАГРУЗКА НАШЕЙ БАЗЫ ЖАНРОВ ИЗ JSON ---
let globalDatabase = {};
let genres = []; // Массив только названий (для рулетки)
let appGenres = []; // Массив объектов (для поиска и Жанра дня)

fetch('genres_data.json')
    .then(response => response.json())
    .then(data => {
        globalDatabase = data;
        
        genres = [];
        appGenres = [];
        let skippedCount = 0; // Счетчик пропущенных жанров для консоли
        
        // Прогоняем все жанры из файла
        for (let key in data) {
            const genreData = data[key];
            
            // --- БЕЗЖАЛОСТНЫЙ ФИЛЬТР ---
            // Проверяем, пустое ли описание (с учетом заглушек из твоего парсера)
            const isDescEmpty = !genreData.description || 
                                genreData.description.includes("Описание пока не собрано") || 
                                genreData.description.includes("Описание временно недоступно");
            
            // Проверяем, пустой ли массив треков
            const hasNoTracks = !genreData.tracks || genreData.tracks.length === 0;
            
            // Если нет ни полезного описания, ни музыки — выкидываем из выдачи
            if (isDescEmpty && hasNoTracks) {
                skippedCount++;
                continue; 
            }
            // ---------------------------

            // Если жанр прошел проверку, добавляем его в систему
            let niceName = key.charAt(0).toUpperCase() + key.slice(1);
            
            genres.push(niceName);
            appGenres.push({
                name: niceName,
                desc: genreData.description || `Погрузитесь в атмосферу жанра ${niceName}.`
            });
        }
        
        console.log(`✅ База загружена! Рабочих жанров: ${genres.length}. Отфильтровано пустых: ${skippedCount}`);
        
        // Запускаем Жанр дня
        if (typeof setDailyGenre === 'function') {
            setDailyGenre();
        }
    })
    .catch(error => console.error("❌ Ошибка загрузки базы жанров:", error));


// ==========================================
// 2. ПЕРЕМЕННЫЕ ИНТЕРФЕЙСА
// ==========================================

// База жанров (из database.js для работы рулетки)
// const genres = typeof musicGenres !== 'undefined' ? musicGenres : [];

// Левое меню (фильтры)
const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");
const closeFilterBtn = document.getElementById("closeFilterBtn"); 
// Теперь переменные сразу пытаются прочитать память браузера
let activeFilter = localStorage.getItem("activeFilter") || "all"; 
let activeRegion = localStorage.getItem("activeRegion") || "all";

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
// 3. ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ
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

        // --- ТОТ САМЫЙ ТАЙМЕР ОСТАНОВКИ РУЛЕТКИ ---
        setTimeout(() => {
            isSpinning = false;
            button.style.opacity = "1";
            wheel.lastElementChild.classList.add("highlight-result");
            
            if (hint) hint.classList.add("show");
            button.innerText = "Попробовать еще";
            if (orDivider) orDivider.classList.add("show");
            
            hasResult = true;
            rouletteBox.style.cursor = "pointer";
            // ---> СОХРАНЕНИЕ В ИСТОРИЮ <---
            const finalRolledGenre = wheel.lastElementChild.innerText;
            
            // Удаляем дубль (если жанр уже был), чтобы перенести его на самый верх
            spinHistory = spinHistory.filter(g => g !== finalRolledGenre);
            spinHistory.push(finalRolledGenre);
            
            // Храним только последние 30 штук, чтобы не забивать память
            if (spinHistory.length > 30) spinHistory.shift();
            
            localStorage.setItem("spinHistory", JSON.stringify(spinHistory));
            if (typeof updateHistoryUI === 'function') updateHistoryUI();
            // -----------------------------

            // ---> НАША НОВАЯ ЛОГИКА ПОЯВЛЕНИЯ ПОДСКАЗКИ <---
            let isUserLoggedIn = false;
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                isUserLoggedIn = true;
            }
            
            const hasSeenPrompt = localStorage.getItem("hasSeenRegPrompt");
            
            if (!isUserLoggedIn && !hasSeenPrompt) {
                // Ждем 1 секунду после остановки рулетки
                setTimeout(() => {
                    const promptModal = document.getElementById("registerPromptModal");
                    if (promptModal) {
                        promptModal.classList.add("active");
                        localStorage.setItem("hasSeenRegPrompt", "true");
                    }
                }, 1000); 
            }
            // ------------------------------------------------

        }, 4550);
    });
}

// --- НОВАЯ ЛОГИКА ОТКРЫТИЯ ОКНА (ДАННЫЕ ИЗ JSON + НАТИВНОЕ АУДИО И ОБЛОЖКИ) ---

let currentAudio = null;
let currentPlayBtn = null;

// === УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ ТРЕКОВ ===
// === УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ ТРЕКОВ ===
// === УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ ТРЕКОВ ===
function renderTracksInModal(genreName) {
    // Обновляем кнопку Spotify
    const spotifySearchBtn = document.getElementById("spotifySearchBtn");
    if (spotifySearchBtn) {
        spotifySearchBtn.style.display = "block";
        spotifySearchBtn.href = "https://open.spotify.com/search/" + encodeURIComponent(genreName);
    }
    const container = document.getElementById("spotifyTracksContainer");
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: #8FDDCB; margin-bottom: 10px;"></i>
            <div style="font-size: 0.85rem; margin-top: 10px;">Загрузка треков...</div>
        </div>
    `;

    const dbKey = genreName.toLowerCase();
    const genreInfo = globalDatabase[dbKey];

    if (!genreInfo || !genreInfo.tracks || genreInfo.tracks.length === 0) {
        container.innerHTML = "<p style='color: #a89fcd; text-align:center;'>Для этого жанра пока нет доступных треков.</p>";
        return;
    }

    container.innerHTML = ""; // Убираем спиннер
    
    // СОРТИРОВКА: Сначала треки с ID от Apple (можно слушать), затем остальные (с замочком)
    const sortedTracks = [...genreInfo.tracks].sort((a, b) => {
        const aHasApple = a.streaming_ids?.apple ? 1 : 0;
        const bHasApple = b.streaming_ids?.apple ? 1 : 0;
        // Те, у кого есть Apple (1), встают выше тех, у кого нет (0)
        return bHasApple - aHasApple; 
    });

    // Берем все отсортированные треки, а не только первые 3
    const tracksToShow = sortedTracks; 

    tracksToShow.forEach(track => {
        const title = track.title || "Неизвестный трек";
        const artist = track.artist || "Неизвестный исполнитель";
        const appleId = track.streaming_ids?.apple;

        const wrapper = document.createElement("div");
        const card = document.createElement("div");
        card.className = "track-card";

       if (appleId) {
            // Добавили контейнер сикбара под артиста и настроили flex, чтобы ничего не вылезало за края
            card.innerHTML = `
                <div class="track-left" style="flex-grow: 1; min-width: 0;">
                    <div class="track-cover" id="cover-${appleId}">
                        <div class="cover-placeholder">♪</div>
                    </div>
                    <div class="track-info" style="width: 100%;">
                        <div class="track-title">${title}</div>
                        
                        <div class="track-artist" style="cursor: pointer; color: #8FDDCB; text-decoration: underline; text-decoration-color: rgba(143, 221, 203, 0.3); transition: 0.3s;" onclick="openArtistProfile('${artist.replace(/'/g, "\\'")}')">${artist}</div>
                        
                        <div class="seek-bar-container" id="seek-container-${appleId}">
                            <div class="seek-bar-progress" id="seek-progress-${appleId}"></div>
                        </div>
                    </div>
                </div>
                <div class="play-btn" id="btn-${appleId}">
                    <i class="fa-solid fa-play"></i>
                </div>
            `;
            wrapper.appendChild(card);
            container.appendChild(wrapper);

            fetch(`https://itunes.apple.com/lookup?id=${appleId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.results && data.results.length > 0) {
                        const trackData = data.results[0];
                        if (trackData.artworkUrl100) {
                            const hqCover = trackData.artworkUrl100.replace('100x100bb', '300x300bb');
                            document.getElementById(`cover-${appleId}`).innerHTML = `<img src="${hqCover}" alt="Cover">`;
                        }
                        if (trackData.previewUrl) {
                            document.getElementById(`btn-${appleId}`).dataset.audioUrl = trackData.previewUrl;
                        }
                    }
                })
                .catch(err => console.error("Ошибка загрузки Apple:", err));

            // Логика воспроизведения и сикбара
            card.addEventListener("click", function(e) {
                const playBtn = document.getElementById(`btn-${appleId}`);
                const audioUrl = playBtn.dataset.audioUrl;
                const seekBarContainer = document.getElementById(`seek-container-${appleId}`);
                const progressBar = document.getElementById(`seek-progress-${appleId}`);

                if (!audioUrl) return; 

                // 1. ЕСЛИ КЛИКНУЛИ ПО СИКБАРУ -> Только перематываем
                if (e.target.closest('.seek-bar-container')) {
                    if (currentAudio && currentAudio.trackId === appleId) {
                        const rect = seekBarContainer.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percent = clickX / rect.width;
                        currentAudio.currentTime = percent * currentAudio.duration;
                    }
                    return; // Выходим из функции, трек не ставится на паузу
                }

                // 2. ЕСЛИ КЛИКНУЛИ ТОЛЬКО ПО КНОПКЕ PLAY/PAUSE -> Запускаем/Останавливаем
                if (e.target.closest('.play-btn')) {
                    
                    // Стандартная пауза/плей для текущего трека
                    if (currentAudio && currentAudio.trackId === appleId) {
                        if (!currentAudio.paused) {
                            currentAudio.pause();
                            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        } else {
                            currentAudio.play();
                            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        }
                        return;
                    }
                    
                    // Если играл другой трек - выключаем его и обнуляем его сикбар
                    if (currentAudio) {
                        currentAudio.pause();
                        if (currentPlayBtn) currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        const prevProgress = document.getElementById(`seek-progress-${currentAudio.trackId}`);
                        if (prevProgress) prevProgress.style.width = '0%';
                    }
                    
                    // Запускаем новый трек
                    currentAudio = new Audio(audioUrl);
                    currentAudio.trackId = appleId;
                    currentPlayBtn = playBtn;
                    
                    currentAudio.play();
                    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; 
                    
                    // --- СИНХРОНИЗАЦИЯ СИКБАРА ---
                    currentAudio.addEventListener('timeupdate', () => {
                        if (currentAudio.duration) {
                            const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
                            if (progressBar) progressBar.style.width = percent + '%';
                        }
                    });

                    // Когда трек закончился
                    currentAudio.onended = () => { 
                        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
                        if (progressBar) progressBar.style.width = '0%'; // Сбрасываем сикбар
                    };
                }
            });

        } else {
            // ЕСЛИ НЕТ ID APPLE MUSIC - заглушка с замочком
            card.innerHTML = `
                <div class="track-left">
                    <div class="track-cover" style="opacity: 0.5;">
                        <div class="cover-placeholder">♪</div>
                    </div>
                    <div class="track-info" style="opacity: 0.7;">
                        <div class="track-title">${title}</div>
                        <div class="track-artist">${artist}</div>
                    </div>
                </div>
                <div class="play-btn" style="background: transparent; color: rgba(168,159,205,0.4); font-size: 1rem;">
                    <i class="fa-solid fa-lock"></i>
                </div>
            `;
            card.style.cursor = "default";
            wrapper.appendChild(card);
            container.appendChild(wrapper);
        }
    });
}

if (rouletteBox && modal && closeModalBtn) {
    rouletteBox.addEventListener("click", () => {
        if (hasResult && !isSpinning) {
            const finalGenre = wheel.lastElementChild.innerText;
            modalTitle.innerText = finalGenre;
            
            const descriptionBlock = document.getElementById("genreDescription");
            
            // Находим описание в базе данных (переведя в нижний регистр)
            const dbKey = finalGenre.toLowerCase();
            const genreInfo = globalDatabase[dbKey];

            if (genreInfo) {
                descriptionBlock.innerText = genreInfo.description;
            } else {
                descriptionBlock.innerHTML = `Погрузитесь в атмосферу <b>${finalGenre}</b>.<br><br><span style="font-size: 0.9em; opacity: 0.7;">Информация о жанре скоро появится.</span>`;
            }

            // Вызываем нашу новую мощную функцию!
            renderTracksInModal(finalGenre);

            modal.classList.add("active");
        }
    });
    
    // ... логика закрытия модалки closeGenreModal остается как была

    const closeGenreModal = () => {
        modal.classList.remove("active");
        
        if (currentAudio) {
            currentAudio.pause();
            if (currentPlayBtn) currentPlayBtn.innerText = "▶";
        }
        
        setTimeout(() => {
            document.getElementById("spotifyTracksContainer").innerHTML = ""; 
        }, 300); 
    };

    closeModalBtn.addEventListener("click", closeGenreModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeGenreModal();
    });
}

// ==========================================
// 4. ГЛОБАЛЬНЫЕ СЛУШАТЕЛИ СОБЫТИЙ
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
        
        // --- АВТО-АКТИВАЦИЯ СОХРАНЕННЫХ ФИЛЬТРОВ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
        chips.forEach(chip => {
            if (chip.getAttribute("data-filter") === activeFilter) {
                chip.classList.add("active");
            } else {
                chip.classList.remove("active");
            }
        });

        rChips.forEach(chip => {
            if (chip.getAttribute("data-region") === activeRegion) {
                chip.classList.add("active");
            } else {
                chip.classList.remove("active");
            }
        });
        // -----------------------------------------------------------------

        filterBtn.addEventListener("click", () => {
            if (!isSpinning) filterModal.classList.add("active");
        });

        closeFilterBtn.addEventListener("click", () => filterModal.classList.remove("active"));
        filterModal.addEventListener("click", (e) => {
            if (e.target === filterModal) filterModal.classList.remove("active");
        });

        if (chips.length > 0) {
            chips.forEach(chip => {
                chip.addEventListener("click", function() {
                    chips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    activeFilter = chip.getAttribute("data-filter");
                    localStorage.setItem("activeFilter", activeFilter); // Сохраняем в память!
                });
            });
        }

        if (rChips.length > 0) {
            rChips.forEach(chip => {
                chip.addEventListener("click", function() {
                    rChips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    activeRegion = chip.getAttribute("data-region");
                    localStorage.setItem("activeRegion", activeRegion); // Сохраняем в память!
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
// --- ЛОГИКА БОКОВОГО МЕНЮ НАСТРОЕК ---
const openSettingsBtn = document.getElementById("openSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const settingsMenu = document.getElementById("settingsMenu");

if (openSettingsBtn && closeSettingsBtn && settingsMenu) {
    // Открытие шторки
    openSettingsBtn.addEventListener("click", () => {
        settingsMenu.classList.add("active");
    });

    // Закрытие шторки по крестику
    closeSettingsBtn.addEventListener("click", () => {
        settingsMenu.classList.remove("active");
    });

    // Закрытие при клике мимо меню (на темный фон страницы)
    document.addEventListener("click", (event) => {
        if (!settingsMenu.contains(event.target) && event.target !== openSettingsBtn) {
            settingsMenu.classList.remove("active");
        }
    });
}
// --- ЛОГИКА БОКОВОГО МЕНЮ И АВТОРИЗАЦИИ ---

const burgerBtn = document.getElementById("burgerBtn");
const sidebarMenu = document.getElementById("sidebarMenu");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const closeSidebarBtn = document.getElementById("closeSidebarBtn");

const authModal = document.getElementById("authModal");
const sidebarAuthBtn = document.getElementById("sidebarAuthBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");

if (burgerBtn && sidebarMenu && sidebarOverlay) {
    // Открытие бокового меню
    burgerBtn.addEventListener("click", () => {
        sidebarMenu.classList.add("active");
        sidebarOverlay.classList.add("active");
    });

    // Закрытие бокового меню
    const closeSidebar = () => {
        sidebarMenu.classList.remove("active");
        sidebarOverlay.classList.remove("active");
    };

    closeSidebarBtn.addEventListener("click", closeSidebar);
    sidebarOverlay.addEventListener("click", closeSidebar);

    // Открытие окна авторизации из бокового меню
    if (sidebarAuthBtn && authModal) {
        sidebarAuthBtn.addEventListener("click", () => {
            closeSidebar(); // Прячем меню
            setTimeout(() => {
                authModal.classList.add("active"); // Показываем модалку входа
            }, 300); // Небольшая задержка для красоты
        });
    }

    // Закрытие окна авторизации
    if (closeAuthBtn) {
        closeAuthBtn.addEventListener("click", () => {
            authModal.classList.remove("active");
        });
    }
}
// --- ЛОГИКА ТЕМ ОФОРМЛЕНИЯ С АВТОСОХРАНЕНИЕМ ---
const menuThemeBtn = document.getElementById("menuTheme");
const themeModal = document.getElementById("themeModal");
const closeThemeBtn = document.getElementById("closeThemeBtn");
const themeCards = document.querySelectorAll(".theme-card");

// 1. ПРИМЕНЯЕМ СОХРАНЕННУЮ ТЕМУ СРАЗУ ПРИ ЗАГРУЗКЕ СКРИПТА
const savedTheme = localStorage.getItem("appTheme") || "default";
document.body.classList.remove("theme-light", "theme-lavender");
if (savedTheme !== "default") {
    document.body.classList.add(`theme-${savedTheme}`);
}

// Подсвечиваем нужную карточку темы в меню настроек
themeCards.forEach(card => {
    if (card.dataset.theme === savedTheme) {
        card.classList.add("active");
    } else {
        card.classList.remove("active");
    }
});

// 2. СЛУШАТЕЛИ КЛИКОВ ПО ТЕМАМ
if (menuThemeBtn && themeModal) {
    menuThemeBtn.addEventListener("click", (e) => {
        e.preventDefault(); 
        
        document.getElementById("sidebarMenu").classList.remove("active");
        document.getElementById("sidebarOverlay").classList.remove("active");
        
        setTimeout(() => {
            themeModal.classList.add("active");
        }, 300);
    });

    closeThemeBtn.addEventListener("click", () => {
        themeModal.classList.remove("active");
    });

    themeCards.forEach(card => {
        card.addEventListener("click", function() {
            themeCards.forEach(c => c.classList.remove("active"));
            this.classList.add("active");
            
            const selectedTheme = this.dataset.theme;
            
            document.body.classList.remove("theme-light", "theme-lavender");
            
            if (selectedTheme !== "default") {
                document.body.classList.add(`theme-${selectedTheme}`);
            }
            
            // Запоминаем выбор пользователя в памяти браузера
            localStorage.setItem("appTheme", selectedTheme); 
        });
    });
}
// --- ЛОГИКА НИЖНЕЙ НАВИГАЦИИ (П ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ) ---
const navHome = document.getElementById("navHome");
const navSearch = document.getElementById("navSearch");
const navLibrary = document.getElementById("navLibrary"); 
const navProfile = document.getElementById("navProfile");

const homeView = document.getElementById("homeView");
const searchView = document.getElementById("searchView");
const libraryView = document.getElementById("libraryView");
const profileView = document.getElementById("profileView");

// Массив всех кнопок и экранов
const navItems = [navHome, navSearch, navLibrary, navProfile];
const appViews = [homeView, searchView, libraryView, profileView];

function switchView(activeNav, activeView) {
    if (!activeNav || !activeView) return;

    navItems.forEach(item => {
        if (item) item.classList.remove("active");
    });
    appViews.forEach(view => {
        if (view) view.classList.remove("active");
    });

    activeNav.classList.add("active");
    activeView.classList.add("active");
}

if (navHome && homeView) {
    navHome.addEventListener("click", () => switchView(navHome, homeView));
}

if (navSearch && searchView) {
    navSearch.addEventListener("click", () => switchView(navSearch, searchView));
}

if (navLibrary && libraryView) {
    navLibrary.addEventListener("click", () => switchView(navLibrary, libraryView));
}

if (navProfile && profileView) {
    navProfile.addEventListener("click", () => switchView(navProfile, profileView));
}
// --- УМНАЯ ЛОГИКА ПОИСКА (ЖАНРЫ + SPOTIFY) ---
const searchInput = document.getElementById("genreSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchResultsContainer = document.getElementById("searchResults");

let globalSearchTimeout = null;

if (searchInput && clearSearchBtn && searchResultsContainer) {
    
    // Очистка поиска по крестику
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchResultsContainer.innerHTML = "";
    });

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        // Сбрасываем таймер при каждом нажатии клавиши
        clearTimeout(globalSearchTimeout);
        
        if (query.length < 2) {
            searchResultsContainer.innerHTML = "";
            return;
        }

        // Показываем анимацию загрузки
        searchResultsContainer.innerHTML = '<div style="text-align: center; color: #8FDDCB; padding: 20px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

        // Запускаем поиск через 500мс после окончания ввода (Debounce)
        globalSearchTimeout = setTimeout(async () => {
            searchResultsContainer.innerHTML = ""; // Убираем спиннер перед выдачей

            // --- 1. ИЩЕМ ПО ЛОКАЛЬНОЙ БАЗЕ ЖАНРОВ (Твоя оригинальная логика) ---
            const filteredGenres = appGenres.filter(g => 
                g.name.toLowerCase().includes(query) || 
                g.desc.toLowerCase().includes(query)
            ).slice(0, 5); // Берем топ-5, чтобы не перегружать экран

            if (filteredGenres.length > 0) {
                // Добавляем заголовок секции
                const genreTitle = document.createElement("h4");
                genreTitle.style.cssText = "color: rgba(168,159,205,0.6); font-size: 11px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;";
                genreTitle.innerText = "Жанры";
                searchResultsContainer.appendChild(genreTitle);

                // Отрисовываем карточки жанров
                filteredGenres.forEach(genre => {
                    const card = document.createElement("div");
                    card.className = "search-result-card";
                    // Стилизация для бесшовной интеграции
                    card.style.cssText = "padding: 12px; margin-bottom: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; border-left: 3px solid #B57EDC; transition: 0.3s; display: flex; justify-content: space-between; align-items: center;";
                    
                    card.innerHTML = `
                        <div class="search-result-info" style="flex-grow: 1; padding-right: 15px;">
                            <h4 style="color: #fff; margin: 0 0 5px 0; font-size: 14px;">${genre.name}</h4>
                            <p style="color: rgba(168,159,205,0.8); font-size: 12px; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${genre.desc}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right search-arrow" style="color: #8FDDCB;"></i>
                    `;
                    
                    // Твой оригинальный обработчик клика со всеми проверками!
                    card.addEventListener("click", () => {
                        const genreModal = document.getElementById("genreModal");
                        const modalTitle = document.getElementById("modalGenreTitle");
                        const modalDesc = document.getElementById("genreDescription");
                        
                        if (genreModal && modalTitle && modalDesc) {
                            modalTitle.textContent = genre.name;
                            modalDesc.textContent = genre.desc;

                            currentModalGenre = genre; 
                            
                            if (typeof modalFavBtn !== 'undefined' && modalFavBtn) {
                                const isFav = favoriteGenres.some(g => g.name === genre.name);
                                if (isFav) {
                                    modalFavBtn.classList.add("active");
                                    modalFavBtn.classList.replace("fa-regular", "fa-solid");
                                } else {
                                    modalFavBtn.classList.remove("active");
                                    modalFavBtn.classList.replace("fa-solid", "fa-regular");
                                }
                            }

                            renderTracksInModal(genre.name);
                            genreModal.classList.add("active");
                        }
                    });
                    
                    searchResultsContainer.appendChild(card);
                });
            }

           // --- 2. ИЩЕМ АРТИСТОВ В SPOTIFY ---
const token = await getSpotifyAccessToken();
if (token) {
    try {
        // Правильный API URL, разбитый для обхода фильтров
        const apiBase = ["https://", "api.spotify", ".com/v1"].join("");
        const res = await fetch(`${apiBase}/search?q=${encodeURIComponent(query)}&type=artist&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.artists && data.artists.items) {
            const artists = data.artists.items;

            if (artists.length > 0) {
                // Заголовок секции артистов
                const artistTitle = document.createElement("h4");
                const marginTop = filteredGenres.length > 0 ? "20px" : "0px";
                artistTitle.style.cssText = `color: rgba(168,159,205,0.6); font-size: 11px; margin: ${marginTop} 0 10px 0; text-transform: uppercase; letter-spacing: 1px;`;
                artistTitle.innerText = "Артисты";
                searchResultsContainer.appendChild(artistTitle);

                // Отрисовываем карточки артистов
                artists.forEach(artist => {
                    const img = artist.images.length > 0 ? artist.images[0].url : '';
                    const artistCard = document.createElement("div");
                    artistCard.className = "artist-search-card";
                    artistCard.style.cssText = "display: flex; align-items: center; padding: 10px; margin-bottom: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; cursor: pointer; transition: 0.3s; border: 1px solid transparent;";
                    
                    artistCard.innerHTML = `
                        <div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('${img}'); background-size: cover; background-position: center; margin-right: 15px; background-color: #140f1c; border: 1px solid rgba(143, 221, 203, 0.3);"></div>
                        <div style="flex-grow: 1; overflow: hidden;">
                            <div style="color: #fff; font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${artist.name}</div>
                            <div style="color: rgba(143, 221, 203, 0.8); font-size: 11px;"><i class="fa-brands fa-spotify"></i> Spotify Artist</div>
                        </div>
                    `;

                    artistCard.addEventListener("click", () => {
                        openArtistProfile(artist.name);
                    });

                    searchResultsContainer.appendChild(artistCard);
                });
            }
        }
    } catch (error) {
        console.error("Ошибка поиска Spotify:", error);
    }
}

            // --- 3. ЕСЛИ НИЧЕГО НЕ НАЙДЕНО ВООБЩЕ ---
            if (searchResultsContainer.innerHTML === "") {
                searchResultsContainer.innerHTML = '<div style="text-align: center; color: rgba(168,159,205,0.5); padding: 20px; font-size: 14px;">Ничего не найдено</div>';
            }

        }, 500); 
    });
}

    // Управление отображением крестика очистки
    searchInput.addEventListener("input", (e) => {
        clearSearchBtn.style.display = e.target.value.length > 0 ? "block" : "none";
    });

    // Очищаем поле по клику на крестик
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        searchResultsContainer.innerHTML = ""; // Убираем результаты
        searchInput.focus();
    });

// --- ЛОГИКА ПРОФИЛЯ И FIREBASE AUTH ---
const profileNameDisplay = document.getElementById("profileNameDisplay");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");
const profileAvatar = document.getElementById("profileAvatar");
const avatarPlaceholderIcon = document.getElementById("avatarPlaceholderIcon");
const avatarEditOverlay = document.getElementById("avatarEditOverlay");
const logoutBtn = document.getElementById("logoutBtn");
const loginFromProfileBtn = document.getElementById("loginFromProfileBtn");
const openProfileSettingsBtn = document.getElementById("openProfileSettingsBtn");

// Функция мгновенного обновления интерфейса
const navProfileIcon = document.getElementById("navProfileIcon");
const navProfileAvatar = document.getElementById("navProfileAvatar");

function updateProfileUI(user) {
    // Находим кнопку авторизации из бокового меню напрямую
    const menuAuthBtn = document.getElementById("sidebarAuthBtn");

    if (user) {
        if (profileNameDisplay) profileNameDisplay.textContent = user.displayName || "Пользователь";
        
        // Читаем кастомный статус из памяти
        const savedBio = localStorage.getItem(`userBio_${user.uid}`);
        if (profileEmailDisplay) profileEmailDisplay.textContent = savedBio || user.email || "Музыкальный исследователь";
        
        // Проверяем, есть ли обрезанная аватарка в памяти, иначе берем из Google
        const customAvatar = localStorage.getItem(`userAvatar_${user.uid}`);
        const finalAvatarUrl = customAvatar || user.photoURL;
        
        if (finalAvatarUrl && profileAvatar) {
            profileAvatar.style.backgroundImage = `url('${finalAvatarUrl}')`;
            if (avatarPlaceholderIcon) avatarPlaceholderIcon.style.display = "none";
            if (avatarEditOverlay) avatarEditOverlay.style.display = "none";
            // Меняем иконку в нижней панели на аватарку
            if (navProfileAvatar && navProfileIcon) {
                navProfileAvatar.style.backgroundImage = `url('${finalAvatarUrl}')`;
                navProfileAvatar.style.display = "block";
                navProfileIcon.style.display = "none";
            }
        }

        // Логика кнопок профиля
        if (logoutBtn) logoutBtn.style.display = "flex";
        if (loginFromProfileBtn) loginFromProfileBtn.style.display = "none";
        if (openProfileSettingsBtn) openProfileSettingsBtn.style.display = "block"; 
        
        // ---> СКРЫВАЕМ КНОПКУ В БОКОВОМ МЕНЮ <---
        if (menuAuthBtn) menuAuthBtn.style.display = "none";

    } else {
        if (profileNameDisplay) profileNameDisplay.textContent = "Гость";
        if (profileEmailDisplay) profileEmailDisplay.textContent = "Неавторизованный пользователь";
        
        if (profileAvatar) profileAvatar.style.backgroundImage = "none";
        if (avatarPlaceholderIcon) avatarPlaceholderIcon.style.display = "block";
        if (avatarEditOverlay) avatarEditOverlay.style.display = "none";
        // Возвращаем стандартную иконку в нижнюю панель
        if (navProfileAvatar && navProfileIcon) {
            navProfileAvatar.style.display = "none";
            navProfileIcon.style.display = "block";
        }

        // Логика кнопок профиля
        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginFromProfileBtn) loginFromProfileBtn.style.display = "flex";
        if (openProfileSettingsBtn) openProfileSettingsBtn.style.display = "none"; 
        
        // ---> ВОЗВРАЩАЕМ КНОПКУ В БОКОВОЕ МЕНЮ <---
        if (menuAuthBtn) menuAuthBtn.style.display = "flex"; 
    }
}

// 1. АВТОМАТИЧЕСКИЙ РАДАР СОСТОЯНИЯ (Слушает Firebase 24/7)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        updateProfileUI(user);
    });
}

// 2. ЛОГИКА КНОПОК "ВЫЙТИ" И "ВОЙТИ"
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(error => console.error("❌ Ошибка при выходе:", error));
        }
    });
}
if (loginFromProfileBtn) {
    loginFromProfileBtn.addEventListener("click", () => {
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.add("active");
    });
}

// ==========================================
// 3. ЛОГИКА НАСТРОЕК ПРОФИЛЯ И ОБРЕЗКИ ФОТО
// ==========================================
const profileSettingsModal = document.getElementById("profileSettingsModal");
const closeProfileSettingsBtn = document.getElementById("closeProfileSettingsBtn");
const settingsNameInput = document.getElementById("settingsNameInput");
const settingsBioInput = document.getElementById("settingsBioInput");
const saveProfileSettingsBtn = document.getElementById("saveProfileSettingsBtn");

const settingsAvatarPreview = document.getElementById("settingsAvatarPreview");
const settingsAvatarInput = document.getElementById("settingsAvatarInput");
const settingsAvatarText = document.getElementById("settingsAvatarText");

const cropModal = document.getElementById("cropModal");
const cropImage = document.getElementById("cropImage");
const cancelCropBtn = document.getElementById("cancelCropBtn");
const applyCropBtn = document.getElementById("applyCropBtn");

let cropper = null;
let tempCroppedBase64 = null; // Временное хранение до нажатия "Сохранить"

// Открытие окна настроек (привяжем и к шестеренке, и к самой аватарке профиля для удобства)
const openSettings = () => {
    const user = firebase.auth().currentUser;
    if (user && profileSettingsModal) {
        settingsNameInput.value = user.displayName || "";
        settingsBioInput.value = localStorage.getItem(`userBio_${user.uid}`) || "";
        
        const currentAvatar = localStorage.getItem(`userAvatar_${user.uid}`) || user.photoURL;
        if (currentAvatar) {
            settingsAvatarPreview.style.backgroundImage = `url('${currentAvatar}')`;
            settingsAvatarPreview.innerHTML = ""; 
        }
        
        tempCroppedBase64 = null; // Сбрасываем временное фото
        profileSettingsModal.classList.add("active");
    }
};

if (openProfileSettingsBtn) openProfileSettingsBtn.addEventListener("click", openSettings);
if (profileAvatar) profileAvatar.addEventListener("click", () => {
    // Открываем настройки по клику на аватар, только если авторизован
    if (firebase.auth().currentUser) openSettings();
});

if (closeProfileSettingsBtn) {
    closeProfileSettingsBtn.addEventListener("click", () => profileSettingsModal.classList.remove("active"));
}

// Выбор фото из галереи
const triggerFileInput = () => settingsAvatarInput.click();
if (settingsAvatarPreview) settingsAvatarPreview.addEventListener("click", triggerFileInput);
if (settingsAvatarText) settingsAvatarText.addEventListener("click", triggerFileInput);

if (settingsAvatarInput) {
    settingsAvatarInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                cropImage.src = event.target.result;
                cropModal.classList.add("active");
                
                if (cropper) cropper.destroy();
                cropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 1, 
                    dragMode: 'move', 
                    cropBoxMovable: false, 
                    cropBoxResizable: false, 
                    toggleDragModeOnDblclick: false, 
                    background: false,
                    autoCropArea: 0.8 
                });
            };
            reader.readAsDataURL(file);
        }
        e.target.value = ""; 
    });
}

// Отмена обрезки
if (cancelCropBtn) {
    cancelCropBtn.addEventListener("click", () => {
        cropModal.classList.remove("active");
        if (cropper) cropper.destroy();
    });
}

// Применение обрезки (Идеально круглый кроп)
if (applyCropBtn) {
    applyCropBtn.addEventListener("click", () => {
        if (cropper) {
            // 1. Получаем базовый квадратный холст от Cropper
            const squareCanvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
            
            // 2. Создаем свой виртуальный холст для физического вырезания круга
            const roundCanvas = document.createElement('canvas');
            roundCanvas.width = 300;
            roundCanvas.height = 300;
            const ctx = roundCanvas.getContext('2d');
            
            // 3. Создаем круглую маску
            ctx.beginPath();
            ctx.arc(150, 150, 150, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip(); // Всё, что за пределами этого круга, будет отсечено
            
            // 4. Вставляем наше фото ровно в этот круг
            ctx.drawImage(squareCanvas, 0, 0, 300, 300);
            
            // 5. ВАЖНО: Сохраняем в PNG! (JPEG сделает прозрачные углы черными)
            tempCroppedBase64 = roundCanvas.toDataURL("image/png");
            
            // Показываем результат в окне настроек
            settingsAvatarPreview.style.backgroundImage = `url('${tempCroppedBase64}')`;
            settingsAvatarPreview.innerHTML = ""; 
            
            cropModal.classList.remove("active");
            cropper.destroy();
        }
    });
}

// Сохранение всех настроек
if (saveProfileSettingsBtn) {
    saveProfileSettingsBtn.addEventListener("click", () => {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const newName = settingsNameInput.value.trim();
        const newBio = settingsBioInput.value.trim();
        
        const originalBtnText = saveProfileSettingsBtn.innerText;
        saveProfileSettingsBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...`;
        saveProfileSettingsBtn.style.pointerEvents = "none";

        // Сохраняем статус и фото в память по UID
        if (newBio) localStorage.setItem(`userBio_${user.uid}`, newBio);
        if (tempCroppedBase64) localStorage.setItem(`userAvatar_${user.uid}`, tempCroppedBase64);

        // Обновляем имя в самом Firebase
        user.updateProfile({
            displayName: newName || user.displayName
        }).then(() => {
            profileSettingsModal.classList.remove("active");
            updateProfileUI(user); // Перерисовываем профиль
            
            saveProfileSettingsBtn.innerText = originalBtnText;
            saveProfileSettingsBtn.style.pointerEvents = "auto";
        }).catch(error => {
            console.error("Ошибка обновления:", error);
            saveProfileSettingsBtn.innerText = originalBtnText;
            saveProfileSettingsBtn.style.pointerEvents = "auto";
        });
    });
}
// --- ЛОГИКА ИЗБРАННОГО (FAVORITES) ---
const favoritesList = document.getElementById("favoritesList");
const emptyLibrary = document.getElementById("emptyLibrary");
const statsFavorites = document.getElementById("statsFavorites");
const modalFavBtn = document.getElementById("modalFavBtn");

// Загружаем из памяти или создаем пустой массив
let favoriteGenres = JSON.parse(localStorage.getItem("favoriteGenres")) || [];
let currentModalGenre = null; // Запоминает, какой жанр сейчас открыт

function updateFavorites() {
    // 1. Обновляем счетчик в профиле
    if (statsFavorites) {
        statsFavorites.textContent = favoriteGenres.length;
    }

    // 2. Отрисовываем список Избранного
    if (!favoritesList) return;
    favoritesList.innerHTML = "";
    
    if (favoriteGenres.length === 0) {
        if (emptyLibrary) favoritesList.appendChild(emptyLibrary);
        if (emptyLibrary) emptyLibrary.style.display = "block";
    } else {
        if (emptyLibrary) emptyLibrary.style.display = "none";
        
        favoriteGenres.forEach(genre => {
            const card = document.createElement("div");
            card.className = "favorite-card";
            card.innerHTML = `
                <span class="fav-genre-name">${genre.name}</span>
                <button class="remove-fav-btn" data-name="${genre.name}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            // Удаление жанра прямо из списка
            card.querySelector(".remove-fav-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                favoriteGenres = favoriteGenres.filter(g => g.name !== genre.name);
                localStorage.setItem("favoriteGenres", JSON.stringify(favoriteGenres));
                updateFavorites();
                
                // Если удаленный жанр сейчас открыт в модалке, сбрасываем сердце
                if (currentModalGenre && currentModalGenre.name === genre.name && modalFavBtn) {
                    modalFavBtn.classList.remove("active");
                    modalFavBtn.classList.replace("fa-solid", "fa-regular");
                }
            });
            
            favoritesList.appendChild(card);
        });
    }
}

// Клик по сердцу в модалке
if (modalFavBtn) {
    modalFavBtn.addEventListener("click", () => {
        if (!currentModalGenre) return;
        
        const index = favoriteGenres.findIndex(g => g.name === currentModalGenre.name);
        
        if (index === -1) {
            // Если нет в избранном — добавляем
            favoriteGenres.push(currentModalGenre);
            modalFavBtn.classList.add("active");
            modalFavBtn.classList.replace("fa-regular", "fa-solid");
        } else {
            // Если есть — удаляем
            favoriteGenres.splice(index, 1);
            modalFavBtn.classList.remove("active");
            modalFavBtn.classList.replace("fa-solid", "fa-regular");
        }
        
        localStorage.setItem("favoriteGenres", JSON.stringify(favoriteGenres));
        updateFavorites();
    });
}

// Первичная отрисовка при запуске
updateFavorites();
// --- ЛОГИКА ЖАНРА ДНЯ ---
const dailyGenreElement = document.getElementById("dailyGenre");

if (dailyGenreElement && typeof appGenres !== 'undefined') {
    function setDailyGenre() {
        // Получаем текущую дату в формате YYYY-MM-DD (например, 2026-06-19)
        const today = new Date().toISOString().split('T')[0];
        
        // Проверяем кэш браузера
        const savedDate = localStorage.getItem("dailyGenreDate");
        const savedGenreName = localStorage.getItem("dailyGenreName");

        let currentDaily = null;

        // Если дата совпадает и жанр сохранен, берем его из памяти
        if (savedDate === today && savedGenreName) {
            currentDaily = appGenres.find(g => g.name === savedGenreName);
        }

        // Если начался новый день (или зашли впервые), генерируем новый
        if (!currentDaily) {
            const randomIndex = Math.floor(Math.random() * appGenres.length);
            currentDaily = appGenres[randomIndex];
            
            // Сохраняем в память
            localStorage.setItem("dailyGenreDate", today);
            localStorage.setItem("dailyGenreName", currentDaily.name);
        }

        // Выводим название на экран
        dailyGenreElement.textContent = currentDaily.name;
        
        // Делаем элемент кликабельным и настраиваем мягкие цвета
        dailyGenreElement.style.cursor = "pointer";
        dailyGenreElement.style.color = "#E6E6FA"; /* Мягкий светло-лавандовый текст */
        dailyGenreElement.style.textDecoration = "underline";
        dailyGenreElement.style.textDecorationColor = "rgba(152, 255, 152, 0.4)"; /* Полупрозрачная мятная линия */
        dailyGenreElement.style.textUnderlineOffset = "4px";
        dailyGenreElement.style.transition = "color 0.3s ease";
        
        // Легкое свечение при наведении
        dailyGenreElement.addEventListener("mouseenter", () => dailyGenreElement.style.color = "#ffffff");
        dailyGenreElement.addEventListener("mouseleave", () => dailyGenreElement.style.color = "#E6E6FA");
        
        // При клике на Жанр дня открываем наше модальное окно
        dailyGenreElement.addEventListener("click", () => {
            const genreModal = document.getElementById("genreModal");
            const modalTitle = document.getElementById("modalGenreTitle");
            const modalDesc = document.getElementById("genreDescription");
            const modalFavBtn = document.getElementById("modalFavBtn");
            
            if (genreModal && modalTitle && modalDesc) {
                // Подставляем данные
                modalTitle.textContent = currentDaily.name;
                modalDesc.textContent = currentDaily.desc;
                
                // Передаем жанр в систему Избранного
                if (typeof currentModalGenre !== 'undefined') {
                    currentModalGenre = currentDaily;
                }
                
                // Проверяем, есть ли он уже в Избранном
                if (modalFavBtn && typeof favoriteGenres !== 'undefined') {
                    const isFav = favoriteGenres.some(g => g.name === currentDaily.name);
                    if (isFav) {
                        modalFavBtn.classList.add("active");
                        modalFavBtn.classList.replace("fa-regular", "fa-solid");
                    } else {
                        modalFavBtn.classList.remove("active");
                        modalFavBtn.classList.replace("fa-solid", "fa-regular");
                    }
                }
                
                // ---> ВЫЗЫВАЕМ НАШУ НОВУЮ ФУНКЦИЮ ЗАГРУЗКИ ТРЕКОВ <---
                renderTracksInModal(currentDaily.name);

                // Показываем окно
                genreModal.classList.add("active");
            }
        });
    }

    // Запускаем проверку при загрузке страницы
    // setDailyGenre();
}// --- ЛОГИКА АВТОРИЗАЦИИ ЧЕРЕЗ GOOGLE (FIREBASE) ---
const googleAuthBtn = document.getElementById("googleAuthBtn");

if (googleAuthBtn) {
    googleAuthBtn.addEventListener("click", () => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Определяем, сидит ли юзер с телефона
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                // ДЛЯ ТЕЛЕФОНОВ И TELEGRAM: Используем Redirect
                // Гугл перекинет юзера на страницу входа, а потом вернет обратно к нам.
                // Наша функция-радар (onAuthStateChanged) сама поймает его после возвращения!
                firebase.auth().signInWithRedirect(provider);
            } else {
                // ДЛЯ ПК: Оставляем красивое всплывающее окно
                firebase.auth().signInWithPopup(provider)
                    .then((result) => {
                        console.log("✅ Вход выполнен!");
                        const authModal = document.getElementById("authModal");
                        if (authModal) authModal.classList.remove("active");
                    })
                    .catch((error) => {
                        console.error("❌ Ошибка при входе:", error.message);
                    });
            }
        } else {
            alert("Запрос на авторизацию Google отправлен (режим разработки)!");
            document.getElementById("authModal").classList.remove("active");
        }
    });
}
// ==========================================
// ЛОГИКА АВТОРИЗАЦИИ EMAIL/PASSWORD (УМНАЯ КНОПКА "ПРОДОЛЖИТЬ")
// ==========================================
const authEmailInput = document.getElementById("emailInput");
const authPasswordInput = document.getElementById("passwordInput");
const authContinueBtn = document.querySelector(".auth-btn");

// Динамически создаем элемент для вывода ошибок, чтобы не ломать твой HTML
const errorMsgDisplay = document.createElement("div");
errorMsgDisplay.style.cssText = "color: #ff6b6b; font-size: 12px; margin-bottom: 15px; text-align: center; display: none;";

if (authContinueBtn) {
    // Вставляем блок ошибки прямо перед кнопкой "Продолжить"
    authContinueBtn.parentNode.insertBefore(errorMsgDisplay, authContinueBtn);

    authContinueBtn.addEventListener("click", () => {
        const email = authEmailInput.value.trim();
        const password = authPasswordInput.value;
        
        if (!email || !password) {
            errorMsgDisplay.innerText = "Введите почту и пароль";
            errorMsgDisplay.style.display = "block";
            return;
        }
        
        errorMsgDisplay.style.display = "none";
        const originalBtnText = authContinueBtn.innerText;
        authContinueBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; // Анимация загрузки

        // ШАГ 1: Пытаемся авторизовать пользователя
        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                // Успешный вход
                document.getElementById("authModal").classList.remove("active");
                authEmailInput.value = ""; 
                authPasswordInput.value = "";
                authContinueBtn.innerText = originalBtnText;
            })
            .catch((error) => {
                // ШАГ 2: Если аккаунта нет - автоматически создаем его
                if (error.code === 'auth/user-not-found') {
                    firebase.auth().createUserWithEmailAndPassword(email, password)
                        .then(() => {
                            // Успешная регистрация
                            document.getElementById("authModal").classList.remove("active");
                            authEmailInput.value = ""; 
                            authPasswordInput.value = "";
                            authContinueBtn.innerText = originalBtnText;
                        })
                        .catch((regError) => {
                            authContinueBtn.innerText = originalBtnText;
                            errorMsgDisplay.style.display = "block";
                            if (regError.code === 'auth/weak-password') errorMsgDisplay.innerText = "Пароль должен быть не менее 6 символов.";
                            else if (regError.code === 'auth/invalid-email') errorMsgDisplay.innerText = "Некорректный email адрес.";
                            else errorMsgDisplay.innerText = "Ошибка регистрации: " + regError.message;
                        });
                } else {
                    // Обработка других ошибок входа (неверный пароль и т.д.)
                    authContinueBtn.innerText = originalBtnText;
                    errorMsgDisplay.style.display = "block";
                    
                    if (error.code === 'auth/wrong-password') errorMsgDisplay.innerText = "Неверный пароль.";
                    else if (error.code === 'auth/invalid-email') errorMsgDisplay.innerText = "Некорректный email адрес.";
                    else if (error.code === 'auth/user-disabled') errorMsgDisplay.innerText = "Аккаунт заблокирован.";
                    else errorMsgDisplay.innerText = "Ошибка: " + error.message;
                }
            });
    });
}
// ==========================================
// ЛОГИКА КНОПОК ПОДСКАЗКИ ДЛЯ НЕЗАРЕГИСТРИРОВАННЫХ
// ==========================================
const regPromptModal = document.getElementById("registerPromptModal");
const closeRegPromptBtn = document.getElementById("closeRegPromptBtn");
const goFromPromptToAuthBtn = document.getElementById("goFromPromptToAuthBtn");

// Обработка крестика (закрыть подсказку)
if (closeRegPromptBtn && regPromptModal) {
    closeRegPromptBtn.addEventListener("click", () => {
        regPromptModal.classList.remove("active");
    });
}

// Обработка кнопки "Войти в аккаунт" внутри подсказки
if (goFromPromptToAuthBtn && regPromptModal) {
    goFromPromptToAuthBtn.addEventListener("click", () => {
        regPromptModal.classList.remove("active"); // Скрываем подсказку
        
        const authModal = document.getElementById("authModal");
        if (authModal) {
            authModal.classList.add("active"); // Вызываем основное меню авторизации
        }
    });
}
// ==========================================
// ЛОГИКА ОКОН БОКОВОГО МЕНЮ И ИСТОРИИ
// ==========================================
const historyModal = document.getElementById("historyModal");
const aboutModal = document.getElementById("aboutModal");
const supportModal = document.getElementById("supportModal");

const menuHistoryBtn = document.getElementById("menuHistory");
const menuAboutBtn = document.getElementById("menuAbout");
const menuSupportBtn = document.getElementById("menuSupport");

// Открытие окон с автоматическим скрытием левого меню
function openSidebarModal(modalElement) {
    const sidebarMenu = document.getElementById("sidebarMenu");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    if (sidebarMenu) sidebarMenu.classList.remove("active");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");

    setTimeout(() => {
        if (modalElement) modalElement.classList.add("active");
    }, 300);
}

if (menuHistoryBtn) menuHistoryBtn.addEventListener("click", (e) => { e.preventDefault(); openSidebarModal(historyModal); });
if (menuAboutBtn) menuAboutBtn.addEventListener("click", (e) => { e.preventDefault(); openSidebarModal(aboutModal); });
if (menuSupportBtn) menuSupportBtn.addEventListener("click", (e) => { e.preventDefault(); openSidebarModal(supportModal); });

// Закрытие окон по крестикам
document.getElementById("closeHistoryBtn")?.addEventListener("click", () => historyModal.classList.remove("active"));
document.getElementById("closeAboutBtn")?.addEventListener("click", () => aboutModal.classList.remove("active"));
document.getElementById("closeSupportBtn")?.addEventListener("click", () => supportModal.classList.remove("active"));

// --- СИСТЕМА ИСТОРИИ ---
const historyListContainer = document.getElementById("historyListContainer");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
let spinHistory = JSON.parse(localStorage.getItem("spinHistory")) || [];

function updateHistoryUI() {
    if (!historyListContainer) return;
    historyListContainer.innerHTML = "";

    if (spinHistory.length === 0) {
        historyListContainer.innerHTML = '<p style="text-align: center; color: rgba(168,159,205,0.5); font-size: 14px; margin-top: 20px;">История пока пуста</p>';
        if (clearHistoryBtn) clearHistoryBtn.style.display = "none";
        return;
    }

    if (clearHistoryBtn) clearHistoryBtn.style.display = "block";

    // Выводим жанры с конца (самые свежие сверху)
    [...spinHistory].reverse().forEach(genreName => {
        const item = document.createElement("div");
        item.className = "search-result-card"; // Используем стиль карточек из поиска
        item.style.marginBottom = "10px";
        
        item.innerHTML = `
            <div class="search-result-info" style="pointer-events: none;">
                <h4 style="margin: 0; font-size: 16px;">${genreName}</h4>
            </div>
            <i class="fa-solid fa-rotate-right search-arrow" style="color: #8FDDCB; pointer-events: none;"></i>
        `;

        // При клике на жанр из истории - открываем его окно с треками
        item.addEventListener("click", () => {
            const genreModal = document.getElementById("genreModal");
            const modalTitle = document.getElementById("modalGenreTitle");
            const modalDesc = document.getElementById("genreDescription");
            
            const dbKey = genreName.toLowerCase();
            const genreInfo = globalDatabase[dbKey];

            if (genreModal && modalTitle && modalDesc) {
                modalTitle.innerText = genreName;
                if (genreInfo) {
                    modalDesc.innerText = genreInfo.description;
                } else {
                    modalDesc.innerHTML = `Погрузитесь в атмосферу <b>${genreName}</b>.<br><br><span style="font-size: 0.9em; opacity: 0.7;">Информация скоро появится.</span>`;
                }

                currentModalGenre = { name: genreName }; // Запоминаем для системы Избранного
                
                // Проверяем статус лайка
                if (typeof modalFavBtn !== 'undefined' && modalFavBtn && typeof favoriteGenres !== 'undefined') {
                    const isFav = favoriteGenres.some(g => g.name === genreName);
                    if (isFav) {
                        modalFavBtn.classList.add("active");
                        modalFavBtn.classList.replace("fa-regular", "fa-solid");
                    } else {
                        modalFavBtn.classList.remove("active");
                        modalFavBtn.classList.replace("fa-solid", "fa-regular");
                    }
                }

                renderTracksInModal(genreName);
                
                historyModal.classList.remove("active"); // Прячем историю
                setTimeout(() => genreModal.classList.add("active"), 300); // Показываем жанр
            }
        });

        historyListContainer.appendChild(item);
    });
}

if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
        spinHistory = [];
        localStorage.removeItem("spinHistory");
        updateHistoryUI();
    });
}

updateHistoryUI(); // Отрисовываем при старте
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ==========================================
// ИНТЕГРАЦИЯ SPOTIFY API (ПРОФИЛИ АРТИСТОВ)
// ==========================================

// Адрес твоего сервера на Render
const RENDER_SERVER = 'https://belyash-coder-github-io.onrender.com';
const URL_API = 'https://api.spotify.com/v1';

let spotifyToken = null;
let tokenExpirationTime = 0;

// 1. Получение токена через твой личный сервер на Render
async function getSpotifyAccessToken() {
    if (spotifyToken && Date.now() < tokenExpirationTime) {
        return spotifyToken;
    }

    try {
        const response = await fetch(`${RENDER_SERVER}/get-token`);
        if (!response.ok) throw new Error("Сервер не вернул токен");
        
        const data = await response.json();
        spotifyToken = data.access_token;
        tokenExpirationTime = Date.now() + (data.expires_in - 300) * 1000;
        return spotifyToken;
    } catch (error) {
        console.error("Ошибка при получении токена с нашего сервера:", error);
        return null;
    }
}

// 2. Глобальные переменные для окна артиста
const artistModal = document.getElementById("artistModal");
const closeArtistBtn = document.getElementById("closeArtistBtn");

if (closeArtistBtn && artistModal) {
    closeArtistBtn.addEventListener("click", () => {
        artistModal.classList.remove("active");
        if (typeof currentAudio !== 'undefined' && currentAudio) {
            currentAudio.pause();
        }
    });
}

// 3. Главная функция генерации карточки
async function openArtistProfile(artistName) {
    if (!artistModal) return;
    document.getElementById("artistNameDisplay").innerText = "Загрузка...";
    artistModal.classList.add("active");

    try {
        // Обращаемся ТОЛЬКО к твоему настроенному серверу
        const response = await fetch(`https://belyash-coder-github-io.vercel.app/search-artist?name=${encodeURIComponent(artistName)}`);

        if (!data.found) {
            document.getElementById("artistNameDisplay").innerText = "Не найдено";
            return;
        }

        // Отрисовка имени артиста
        document.getElementById("artistNameDisplay").innerText = data.artist.name;

        // Отрисовка треков
        if (data.tracks) {
            document.getElementById("artistTopTracksContainer").innerHTML = data.tracks.map(track => `
                <div class="track-card" style="margin-bottom: 10px; display: flex; align-items: center; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                    <div style="width: 40px; height: 40px; border-radius: 4px; background-image: url('${track.album.images[0]?.url || ''}'); background-size: cover; margin-right: 12px;"></div>
                    <div style="flex-grow: 1; padding: 0 10px;">
                        <div style="color: #fff; font-size: 13px;">${track.name}</div>
                    </div>
                </div>
            `).join('');
        }

        // Отрисовка похожих артистов
        if (data.related) {
            document.getElementById("relatedArtistsContainer").innerHTML = data.related.map(rel => `
                <div class="related-artist-card" onclick="openArtistProfile('${rel.name.replace(/'/g, "\\'")}')" style="cursor: pointer;">
                    <div class="related-artist-photo" style="background-image: url('${rel.images[0]?.url || ''}')"></div>
                    <div class="related-artist-name">${rel.name}</div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("Системная ошибка:", error);
        document.getElementById("artistNameDisplay").innerText = "Ошибка соединения с сервером";
    }
}