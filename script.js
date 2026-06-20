// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА БАЗЫ
// ==========================================

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
        
        // Автоматически прогоняем все жанры из файла
        for (let key in data) {
            let niceName = key.charAt(0).toUpperCase() + key.slice(1); // rap -> Rap
            
            genres.push(niceName);
            appGenres.push({
                name: niceName,
                desc: data[key].description || `Погрузитесь в атмосферу жанра ${niceName}.`
            });
        }
        
        console.log(`✅ База загружена! Жанров в системе: ${genres.length}`);
        
        // Запускаем Жанр дня только после того, как база загрузилась
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
// 3. ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ
// ==========================================

// ЖАНР ДНЯ
if (dailyGenreDisplay && genres.length > 0) {
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate(); 
    const dailyIndex = dateSeed % genres.length;
    dailyGenreDisplay.innerText = genres[dailyIndex];
}

// ЛОГИКА РУЛЕТКИ (Оставил без изменений, работает идеально)
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

// --- НОВАЯ ЛОГИКА ОТКРЫТИЯ ОКНА (ДАННЫЕ ИЗ JSON + НАТИВНОЕ АУДИО И ОБЛОЖКИ) ---

let currentAudio = null;
let currentPlayBtn = null;

// === УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ ТРЕКОВ ===
function renderTracksInModal(genreName) {
    const container = document.getElementById("spotifyTracksContainer");
    if (!container) return;

    // Сразу показываем красивый мятный спиннер загрузки
    container.innerHTML = `
        <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: #8FDDCB; margin-bottom: 10px;"></i>
            <div style="font-size: 0.85rem; margin-top: 10px;">Загрузка треков...</div>
        </div>
    `;

    // ПЕРЕВОДИМ НАЗВАНИЕ В НИЖНИЙ РЕГИСТР, чтобы найти в JSON (Pop -> pop)
    const dbKey = genreName.toLowerCase();
    const genreInfo = globalDatabase[dbKey];

    // Если жанра нет в базе или нет треков
    if (!genreInfo || !genreInfo.tracks || genreInfo.tracks.length === 0) {
        container.innerHTML = "<p style='color: #a89fcd; text-align:center;'>Для этого жанра пока нет доступных треков.</p>";
        return;
    }

    container.innerHTML = ""; // Убираем спиннер
    const tracksToShow = genreInfo.tracks.slice(0, 3); // Берем первые 3 трека

    tracksToShow.forEach(track => {
        const title = track.title || "Неизвестный трек";
        const artist = track.artist || "Неизвестный исполнитель";
        const appleId = track.streaming_ids?.apple;

        const wrapper = document.createElement("div");
        const card = document.createElement("div");
        card.className = "track-card";

        // ЕСЛИ ЕСТЬ ID APPLE MUSIC - создаем рабочую карточку
        if (appleId) {
            card.innerHTML = `
                <div class="track-left">
                    <div class="track-cover" id="cover-${appleId}">
                        <div class="cover-placeholder">♪</div>
                    </div>
                    <div class="track-info">
                        <div class="track-title">${title}</div>
                        <div class="track-artist">${artist}</div>
                    </div>
                </div>
                <div class="play-btn" id="btn-${appleId}">▶</div>
            `;
            wrapper.appendChild(card);
            container.appendChild(wrapper);

            // Идем в Apple за обложкой и звуком
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

            // Логика кнопки PLAY
            card.addEventListener("click", function() {
                const playBtn = document.getElementById(`btn-${appleId}`);
                const audioUrl = playBtn.dataset.audioUrl;

                if (!audioUrl) return; 

                if (currentAudio && currentAudio.trackId === appleId) {
                    if (!currentAudio.paused) {
                        currentAudio.pause();
                        playBtn.innerText = "▶";
                    } else {
                        currentAudio.play();
                        playBtn.innerText = "⏸";
                    }
                    return;
                }
                if (currentAudio) {
                    currentAudio.pause();
                    if (currentPlayBtn) currentPlayBtn.innerText = "▶";
                }
                currentAudio = new Audio(audioUrl);
                currentAudio.trackId = appleId;
                currentPlayBtn = playBtn;
                currentAudio.play();
                playBtn.innerText = "⏸"; 
                currentAudio.onended = () => { playBtn.innerText = "▶"; };
            });

        } else {
            // ЕСЛИ НЕТ ID APPLE MUSIC - создаем красивую заглушку без плеера
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
            // Убираем анимации при наведении с карточки-заглушки
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
        filterBtn.addEventListener("click", () => {
            if (!isSpinning) filterModal.classList.add("active");
        });

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
// --- ЛОГИКА ТЕМ ОФОРМЛЕНИЯ ---
const menuThemeBtn = document.getElementById("menuTheme");
const themeModal = document.getElementById("themeModal");
const closeThemeBtn = document.getElementById("closeThemeBtn");
const themeCards = document.querySelectorAll(".theme-card");

if (menuThemeBtn && themeModal) {
    // Открытие окна тем из бокового меню
    menuThemeBtn.addEventListener("click", (e) => {
        e.preventDefault(); // Запрещаем ссылке перезагружать страницу
        
        // Прячем боковое меню (используем уже существующие классы)
        document.getElementById("sidebarMenu").classList.remove("active");
        document.getElementById("sidebarOverlay").classList.remove("active");
        
        // Показываем окно тем с небольшой задержкой
        setTimeout(() => {
            themeModal.classList.add("active");
        }, 300);
    });

    // Закрытие окна тем
    closeThemeBtn.addEventListener("click", () => {
        themeModal.classList.remove("active");
    });

    // Смена темы по клику на карточку
    themeCards.forEach(card => {
        card.addEventListener("click", function() {
            // 1. Убираем зеленую рамку у всех карточек
            themeCards.forEach(c => c.classList.remove("active"));
            
            // 2. Делаем активной ту, на которую кликнули
            this.classList.add("active");
            
            // 3. Берем название темы и вешаем класс на body
            const selectedTheme = this.dataset.theme;
            
            // Сбрасываем все возможные темы
            document.body.classList.remove("theme-light", "theme-lavender",);
            
            // Если тема не по умолчанию, добавляем нужный класс
            if (selectedTheme !== "default") {
                document.body.classList.add(`theme-${selectedTheme}`);
            }
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
// --- ЛОГИКА ПОИСКА (ФИЛЬТРАЦИЯ И ОЧИСТКА) ---
const searchInput = document.getElementById("genreSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchResultsContainer = document.getElementById("searchResults");



if (searchInput && clearSearchBtn && searchResultsContainer) {
    
    // Функция отрисовки результатов
    function renderSearchResults(query) {
        searchResultsContainer.innerHTML = ""; // Очищаем старые результаты
        
        if (query.trim().length === 0) return; // Если пусто, ничего не выводим
        
        const lowerQuery = query.toLowerCase();
        // Ищем совпадения и в названии, и в описании
        const filtered = appGenres.filter(g => 
            g.name.toLowerCase().includes(lowerQuery) || 
            g.desc.toLowerCase().includes(lowerQuery)
        );
        
        if (filtered.length === 0) {
            searchResultsContainer.innerHTML = `<p style="text-align: center; color: rgba(168, 159, 205, 0.5); padding: 20px;">Ничего не найдено</p>`;
            return;
        }
        
        // Создаем карточки для найденных жанров
        filtered.forEach(genre => {
            const card = document.createElement("div");
            card.className = "search-result-card";
            card.innerHTML = `
                <div class="search-result-info">
                    <h4>${genre.name}</h4>
                    <p>${genre.desc}</p>
                </div>
                <i class="fa-solid fa-chevron-right search-arrow"></i>
            `;
            
            // Обработчик клика: открываем модальное окно с данными жанра
            // Обработчик клика: открываем модальное окно с данными жанра
            card.addEventListener("click", () => {
                const genreModal = document.getElementById("genreModal");
                const modalTitle = document.getElementById("modalGenreTitle");
                const modalDesc = document.getElementById("genreDescription");
                
                if (genreModal && modalTitle && modalDesc) {
                    // Подставляем данные жанра в окно
                    modalTitle.textContent = genre.name;
                    modalDesc.textContent = genre.desc;

                    currentModalGenre = genre; // Запоминаем текущий жанр для системы Избранного
                    
                    // Проверяем, залайкан ли он уже
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

                    // ---> ВЫЗЫВАЕМ НАШУ НОВУЮ ФУНКЦИЮ ЗАГРУЗКИ ТРЕКОВ <---
                    renderTracksInModal(genre.name);
                    
                    // Выводим окно на экран
                    genreModal.classList.add("active");
                }
            });
            
            searchResultsContainer.appendChild(card);
        });
    }

    // Слушаем ввод текста
    searchInput.addEventListener("input", (e) => {
        const value = e.target.value;
        
        // Показываем/скрываем крестик
        clearSearchBtn.style.display = value.length > 0 ? "block" : "none";
        
        // Запускаем поиск
        renderSearchResults(value);
    });

    // Очищаем поле по клику на крестик
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearSearchBtn.style.display = "none";
        searchResultsContainer.innerHTML = ""; // Убираем результаты
        searchInput.focus();
    });
}
// --- ЛОГИКА ЗАГРУЗКИ АВАТАРА ---
const avatarWrapper = document.getElementById("avatarWrapper");
const avatarInput = document.getElementById("avatarInput");
const profileAvatar = document.getElementById("profileAvatar");
const avatarPlaceholderIcon = document.getElementById("avatarPlaceholderIcon");

// Функция для установки аватара
function setAvatar(savedImage) {
    profileAvatar.style.backgroundImage = `url('${savedImage}')`;
    if (avatarPlaceholderIcon) {
        avatarPlaceholderIcon.style.display = "none"; // Скрываем иконку космонавта
    }
}

// Загрузка аватара из памяти при старте страницы
const savedAvatar = localStorage.getItem("userAvatar");
if (savedAvatar && profileAvatar) {
    setAvatar(savedAvatar);
}

if (avatarWrapper && avatarInput) {
    // Клик по аватару вызывает окно выбора файла
    avatarWrapper.addEventListener("click", () => {
        avatarInput.click();
    });

    // Обработка выбора файла
    avatarInput.addEventListener("change", function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const base64Image = e.target.result;
                localStorage.setItem("userAvatar", base64Image); // Сохраняем в localStorage
                setAvatar(base64Image); // Обновляем на экране
            };
            
            reader.readAsDataURL(file);
        }
    });
}
// --- ЛОГИКА ЗАКРЫТИЯ ОКНА ЖАНРА ---
if (typeof genreModal !== 'undefined' && genreModal) {
    // Закрытие по крестику
    if (typeof closeModalBtn !== 'undefined' && closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            genreModal.classList.remove("active");
        });
    }

    // Закрытие по клику на темный фон вокруг окна
    genreModal.addEventListener("click", (e) => {
        if (e.target === genreModal) {
            genreModal.classList.remove("active");
        }
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
        // Проверяем, инициализирован ли Firebase на странице
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const provider = new firebase.auth.GoogleAuthProvider();
            
            firebase.auth().signInWithPopup(provider)
                .then((result) => {
                    console.log("✅ Успешный вход через Google!", result.user);
                    
                    // Закрываем окно авторизации
                    const authModal = document.getElementById("authModal");
                    if (authModal) authModal.classList.remove("active");
                    
                    // Обновляем данные на экране профиля (пример)
                    const profileName = document.querySelector(".profile-name");
                    if (profileName && result.user.displayName) {
                        profileName.textContent = result.user.displayName;
                    }
                })
                .catch((error) => {
                    console.error("❌ Ошибка при входе через Google:", error.message);
                });
        } else {
            // Заглушка на случай, если Firebase временно не доступен/отключен
            console.log("🤖 Имитация входа: Firebase Auth не подключен к сети.");
            alert("Запрос на авторизацию Google отправлен (режим разработки)!");
            document.getElementById("authModal").classList.remove("active");
        }
    });
}