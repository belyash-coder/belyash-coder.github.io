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

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ БАЗЫ ---
let globalDatabase = {};
let genres = []; 
let appGenres = []; 

// --- ЛОГИКА ЖАНРА ДНЯ (АБСОЛЮТНАЯ СИНХРОНИЗАЦИЯ) ---
function getDailyGenreName(genresRawData) {
    // Берем ВСЕ сырые ключи из базы и жестко сортируем
    const allGenres = Object.keys(genresRawData).sort();
    if (allGenres.length === 0) return null;

    const moscowTime = new Date(Date.now() + (3 * 60 * 60 * 1000));
    const year = moscowTime.getUTCFullYear();
    const month = moscowTime.getUTCMonth() + 1;
    const day = moscowTime.getUTCDate();

    // Сид сегодняшнего дня (например, 20260623)
    const seed = year * 10000 + month * 100 + day;

    // Идеальный детерминированный генератор случайных чисел
    function randomFromSeed(s) {
        s = Math.imul(s ^ (s >>> 15), 1597334677);
        s = Math.imul(s ^ (s >>> 15), 3812015801);
        return ((s ^ (s >>> 16)) >>> 0) / 4294967296;
    }

    let attempt = 0;
    while (attempt < 1000) {
        const rand = randomFromSeed(seed + attempt);
        const index = Math.floor(rand * allGenres.length);
        const candidateName = allGenres[index];
        const candidateData = genresRawData[candidateName];

        const isDescEmpty = !candidateData.description || 
                            candidateData.description.includes("Описание пока не собрано") || 
                            candidateData.description.includes("Описание временно недоступно");
        const hasNoTracks = !candidateData.tracks || candidateData.tracks.length === 0;

        if (!isDescEmpty && !hasNoTracks) {
            return candidateName.charAt(0).toUpperCase() + candidateName.slice(1);
        }
        attempt++;
    }
    return null;
}

// --- ЗАГРУЗКА БАЗЫ И ИНИЦИАЛИЗАЦИЯ ---
const cacheBuster = new Date().toISOString().slice(0, 10);
fetch(`genres_data.json?v=${cacheBuster}`)
    .then(response => response.json())
    .then(data => {
        globalDatabase = data;
        
        // Вычисляем Жанр дня ДО фильтрации, из сырой базы
        const dailyGenreName = getDailyGenreName(data);
        
        genres = [];
        appGenres = [];
        let skippedCount = 0;
        
        for (let key in data) {
            const genreData = data[key];
            
            const isDescEmpty = !genreData.description || 
                                genreData.description.includes("Описание пока не собрано") || 
                                genreData.description.includes("Описание временно недоступно");
            
            const hasNoTracks = !genreData.tracks || genreData.tracks.length === 0;
            
            if (isDescEmpty && hasNoTracks) {
                skippedCount++;
                continue; 
            }

            let niceName = key.charAt(0).toUpperCase() + key.slice(1);
            genres.push(niceName);
            appGenres.push({
                name: niceName,
                desc: genreData.description || `Погрузитесь в атмосферу жанра ${niceName}.`
            });
        }
        
        console.log(`✅ База загружена! Рабочих жанров: ${genres.length}. Отфильтровано пустых: ${skippedCount}`);
        
        if (typeof setDailyGenre === 'function' && dailyGenreName) {
            setDailyGenre(dailyGenreName);
        }
    })
    .catch(error => console.error("❌ Ошибка загрузки базы жанров:", error));


// ==========================================
// 2. ПЕРЕМЕННЫЕ ИНТЕРФЕЙСА
// ==========================================
const filterBtn = document.getElementById("filterBtn");
const filterModal = document.getElementById("filterModal");
const closeFilterBtn = document.getElementById("closeFilterBtn"); 
let activeFilter = localStorage.getItem("activeFilter") || "all"; 
let activeRegion = localStorage.getItem("activeRegion") || "all";

const wheel = document.getElementById("rouletteWheel");
const button = document.getElementById("spinBtn");
const dailyGenreDisplay = document.getElementById("dailyGenre");
const hint = document.getElementById("genreHint");
const orDivider = document.getElementById("orDivider");
const rouletteBox = document.querySelector(".roulette-box");

const modal = document.getElementById("genreModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalTitle = document.getElementById("modalGenreTitle");

let isSpinning = false;
let hasResult = false; 

// ==========================================
// 3. ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ
// ==========================================

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

        setTimeout(() => {
            isSpinning = false;
            button.style.opacity = "1";
            wheel.lastElementChild.classList.add("highlight-result");
            
            if (hint) hint.classList.add("show");
            button.innerText = "Попробовать еще";
            if (orDivider) orDivider.classList.add("show");
            
            hasResult = true;
            rouletteBox.style.cursor = "pointer";
            
            const finalRolledGenre = wheel.lastElementChild.innerText;
            
            spinHistory = spinHistory.filter(g => g !== finalRolledGenre);
            spinHistory.push(finalRolledGenre);
            
            if (spinHistory.length > 30) spinHistory.shift();
            
            localStorage.setItem("spinHistory", JSON.stringify(spinHistory));
            if (typeof updateHistoryUI === 'function') updateHistoryUI();

            let isUserLoggedIn = false;
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                isUserLoggedIn = true;
            }
            
            const hasSeenPrompt = localStorage.getItem("hasSeenRegPrompt");
            
            if (!isUserLoggedIn && !hasSeenPrompt) {
                setTimeout(() => {
                    const promptModal = document.getElementById("registerPromptModal");
                    if (promptModal) {
                        promptModal.classList.add("active");
                        localStorage.setItem("hasSeenRegPrompt", "true");
                    }
                }, 1000); 
            }
        }, 4550);
    });
}

// --- ЛОГИКА АУДИО И ОБЛОЖЕК ---
let currentAudio = null;
let currentPlayBtn = null;

function renderTracksInModal(genreName) {
    const container = document.getElementById("tracksContainer");
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

    container.innerHTML = ""; 
    
    const sortedTracks = [...genreInfo.tracks].sort((a, b) => {
        const aHasApple = a.streaming_ids?.apple ? 1 : 0;
        const bHasApple = b.streaming_ids?.apple ? 1 : 0;
        return bHasApple - aHasApple; 
    });

    const tracksToShow = sortedTracks; 

    tracksToShow.forEach(track => {
        const title = track.title || "Неизвестный трек";
        const artist = track.artist || "Неизвестный исполнитель";
        const appleId = track.streaming_ids?.apple;

        const wrapper = document.createElement("div");
        const card = document.createElement("div");
        card.className = "track-card";

       if (appleId) {
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

            card.addEventListener("click", function(e) {
                const playBtn = document.getElementById(`btn-${appleId}`);
                const audioUrl = playBtn.dataset.audioUrl;
                const seekBarContainer = document.getElementById(`seek-container-${appleId}`);
                const progressBar = document.getElementById(`seek-progress-${appleId}`);

                if (!audioUrl) return; 

                if (e.target.closest('.seek-bar-container')) {
                    if (currentAudio && currentAudio.trackId === appleId) {
                        const rect = seekBarContainer.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percent = clickX / rect.width;
                        currentAudio.currentTime = percent * currentAudio.duration;
                    }
                    return; 
                }

                if (e.target.closest('.play-btn')) {
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
                    
                    if (currentAudio) {
                        currentAudio.pause();
                        if (currentPlayBtn) currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        const prevProgress = document.getElementById(`seek-progress-${currentAudio.trackId}`);
                        if (prevProgress) prevProgress.style.width = '0%';
                    }
                    
                    currentAudio = new Audio(audioUrl);
                    currentAudio.trackId = appleId;
                    currentPlayBtn = playBtn;
                    
                    currentAudio.play();
                    playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; 
                    
                    currentAudio.addEventListener('timeupdate', () => {
                        if (currentAudio.duration) {
                            const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
                            if (progressBar) progressBar.style.width = percent + '%';
                        }
                    });

                    currentAudio.onended = () => { 
                        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
                        if (progressBar) progressBar.style.width = '0%'; 
                    };
                }
            });

        } else {
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
            history.pushState({ modal: 'genre' }, ''); // Запись в историю для кнопки Назад
            const finalGenre = wheel.lastElementChild.innerText;
            modalTitle.innerText = finalGenre;
            
            const descriptionBlock = document.getElementById("genreDescription");
            const dbKey = finalGenre.toLowerCase();
            const genreInfo = globalDatabase[dbKey];

            if (genreInfo) {
                descriptionBlock.innerText = genreInfo.description;
            } else {
                descriptionBlock.innerHTML = `Погрузитесь в атмосферу <b>${finalGenre}</b>.<br><br><span style="font-size: 0.9em; opacity: 0.7;">Информация о жанре скоро появится.</span>`;
            }

            renderTracksInModal(finalGenre);
            modal.classList.add("active");
        }
    });
    
    const closeGenreModal = () => {
        modal.classList.remove("active");
        
        if (currentAudio) {
            currentAudio.pause();
            if (currentPlayBtn) currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
        
        setTimeout(() => {
            document.getElementById("tracksContainer").innerHTML = ""; 
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
    
    const splash = document.getElementById("splashScreen");
    if (splash) {
        setTimeout(() => splash.classList.add("hidden"), 3300);
    }

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

    const chips = document.querySelectorAll(".filter-chip");
    const rChips = document.querySelectorAll(".region-chip");

    if (filterBtn && filterModal && closeFilterBtn) {
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
                    localStorage.setItem("activeFilter", activeFilter); 
                });
            });
        }

        if (rChips.length > 0) {
            rChips.forEach(chip => {
                chip.addEventListener("click", function() {
                    rChips.forEach(c => c.classList.remove("active"));
                    chip.classList.add("active");
                    activeRegion = chip.getAttribute("data-region");
                    localStorage.setItem("activeRegion", activeRegion); 
                });
            });
        }
    }

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
    openSettingsBtn.addEventListener("click", () => {
        settingsMenu.classList.add("active");
    });
    closeSettingsBtn.addEventListener("click", () => {
        settingsMenu.classList.remove("active");
    });
    document.addEventListener("click", (event) => {
        if (!settingsMenu.contains(event.target) && event.target !== openSettingsBtn) {
            settingsMenu.classList.remove("active");
        }
    });
}

const authModal = document.getElementById("authModal");
const sidebarAuthBtn = document.getElementById("sidebarAuthBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");

if (sidebarAuthBtn && authModal) {
    sidebarAuthBtn.addEventListener("click", () => {
        document.getElementById("sidebarMenu").classList.remove("active");
        document.getElementById("sidebarOverlay").classList.remove("active");
        setTimeout(() => {
            authModal.classList.add("active"); 
        }, 300); 
    });
}
if (closeAuthBtn) {
    closeAuthBtn.addEventListener("click", () => authModal.classList.remove("active"));
}

// --- ЛОГИКА ТЕМ ОФОРМЛЕНИЯ С АВТОСОХРАНЕНИЕМ ---
const menuThemeBtn = document.getElementById("menuTheme");
const themeModal = document.getElementById("themeModal");
const closeThemeBtn = document.getElementById("closeThemeBtn");
const themeCards = document.querySelectorAll(".theme-card");

const savedTheme = localStorage.getItem("appTheme") || "default";
document.body.classList.remove("theme-light", "theme-lavender");
if (savedTheme !== "default") {
    document.body.classList.add(`theme-${savedTheme}`);
}

themeCards.forEach(card => {
    if (card.dataset.theme === savedTheme) {
        card.classList.add("active");
    } else {
        card.classList.remove("active");
    }
});

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
            localStorage.setItem("appTheme", selectedTheme); 
        });
    });
}

// --- ЛОГИКА НИЖНЕЙ НАВИГАЦИИ ---
const navHome = document.getElementById("navHome");
const navSearch = document.getElementById("navSearch");
const navLibrary = document.getElementById("navLibrary"); 
const navProfile = document.getElementById("navProfile");

const homeView = document.getElementById("homeView");
const searchView = document.getElementById("searchView");
const libraryView = document.getElementById("libraryView");
const profileView = document.getElementById("profileView");

const viewNavItems = [navHome, navSearch, navLibrary, navProfile];
const appViews = [homeView, searchView, libraryView, profileView];

function switchView(activeNav, activeView) {
    if (!activeNav || !activeView) return;
    viewNavItems.forEach(item => { if (item) item.classList.remove("active"); });
    appViews.forEach(view => { if (view) view.classList.remove("active"); });
    activeNav.classList.add("active");
    activeView.classList.add("active");
}

if (navHome && homeView) navHome.addEventListener("click", () => switchView(navHome, homeView));
if (navSearch && searchView) navSearch.addEventListener("click", () => switchView(navSearch, searchView));
if (navLibrary && libraryView) navLibrary.addEventListener("click", () => switchView(navLibrary, libraryView));
if (navProfile && profileView) navProfile.addEventListener("click", () => switchView(navProfile, profileView));

// --- УМНАЯ ЛОГИКА ПОИСКА ---
const searchInput = document.getElementById("genreSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchResultsContainer = document.getElementById("searchResults");

let globalSearchTimeout = null;

if (searchInput && clearSearchBtn && searchResultsContainer) {
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchResultsContainer.innerHTML = "";
    });

    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        clearTimeout(globalSearchTimeout);
        
        if (query.length < 2) {
            searchResultsContainer.innerHTML = "";
            return;
        }

        searchResultsContainer.innerHTML = '<div style="text-align: center; color: #8FDDCB; padding: 20px;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

        globalSearchTimeout = setTimeout(async () => {
            searchResultsContainer.innerHTML = ""; 

            const filteredGenres = appGenres.filter(g => 
                g.name.toLowerCase().includes(query) || 
                g.desc.toLowerCase().includes(query)
            ).slice(0, 5); 

            if (filteredGenres.length > 0) {
                const genreTitle = document.createElement("h4");
                genreTitle.style.cssText = "color: rgba(168,159,205,0.6); font-size: 11px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;";
                genreTitle.innerText = "Жанры";
                searchResultsContainer.appendChild(genreTitle);

                filteredGenres.forEach(genre => {
                    const card = document.createElement("div");
                    card.className = "search-result-card";
                    card.style.cssText = "padding: 12px; margin-bottom: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; cursor: pointer; border-left: 3px solid #B57EDC; transition: 0.3s; display: flex; justify-content: space-between; align-items: center;";
                    
                    card.innerHTML = `
                        <div class="search-result-info" style="flex-grow: 1; padding-right: 15px;">
                            <h4 style="color: #fff; margin: 0 0 5px 0; font-size: 14px;">${genre.name}</h4>
                            <p style="color: rgba(168,159,205,0.8); font-size: 12px; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${genre.desc}</p>
                        </div>
                        <i class="fa-solid fa-chevron-right search-arrow" style="color: #8FDDCB;"></i>
                    `;
                    
                    card.addEventListener("click", () => {
                        const genreModal = document.getElementById("genreModal");
                        const modalTitle = document.getElementById("modalGenreTitle");
                        const modalDesc = document.getElementById("genreDescription");
                        
                        if (genreModal && modalTitle && modalDesc) {
                            history.pushState({ modal: 'genre' }, ''); // Запись в историю
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

            try {
                const res = await fetch(`https://belyash-coder-github-io.vercel.app/search-artist?name=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                if (!data.error && data.name) {
                    const artistTitle = document.createElement("h4");
                    const marginTop = filteredGenres.length > 0 ? "20px" : "0px";
                    artistTitle.style.cssText = `color: rgba(168,159,205,0.6); font-size: 11px; margin: ${marginTop} 0 10px 0; text-transform: uppercase; letter-spacing: 1px;`;
                    artistTitle.innerText = "Артисты";
                    searchResultsContainer.appendChild(artistTitle);

                    const img = data.avatar || ''; 
                    const artistCard = document.createElement("div");
                    artistCard.className = "artist-search-card";
                    artistCard.style.cssText = "display: flex; align-items: center; padding: 10px; margin-bottom: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; cursor: pointer; transition: 0.3s; border: 1px solid transparent;";
                    
                    artistCard.innerHTML = `
                        <div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('${img}'); background-size: cover; background-position: center; margin-right: 15px; background-color: #140f1c; border: 1px solid rgba(143, 221, 203, 0.3);"></div>
                        <div style="flex-grow: 1; overflow: hidden;">
                            <div style="color: #fff; font-size: 14px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${data.name}</div>
                            <div style="color: rgba(143, 221, 203, 0.8); font-size: 11px;"><i class="fa-solid fa-microphone-lines"></i> Артист</div>
                        </div>
                    `;

                    artistCard.addEventListener("click", () => {
                        searchResultsContainer.innerHTML = "";
                        openArtistProfile(data.name);
                    });

                    searchResultsContainer.appendChild(artistCard);
                }
            } catch (error) {
                console.error("Ошибка поиска артиста:", error);
            }

            if (searchResultsContainer.innerHTML === "") {
                searchResultsContainer.innerHTML = '<div style="text-align: center; color: rgba(168,159,205,0.5); padding: 20px; font-size: 14px;">Ничего не найдено</div>';
            }

        }, 500); 
    });
}

searchInput.addEventListener("input", (e) => {
    clearSearchBtn.style.display = e.target.value.length > 0 ? "block" : "none";
});

clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
    searchResultsContainer.innerHTML = ""; 
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

const navProfileIcon = document.getElementById("navProfileIcon");
const navProfileAvatar = document.getElementById("navProfileAvatar");

function updateProfileUI(user) {
    const menuAuthBtn = document.getElementById("sidebarAuthBtn");

    if (user) {
        if (profileNameDisplay) profileNameDisplay.textContent = user.displayName || "Пользователь";
        
        const savedBio = localStorage.getItem(`userBio_${user.uid}`);
        if (profileEmailDisplay) profileEmailDisplay.textContent = savedBio || user.email || "Музыкальный исследователь";
        
        const customAvatar = localStorage.getItem(`userAvatar_${user.uid}`);
        const finalAvatarUrl = customAvatar || user.photoURL;
        
        if (finalAvatarUrl && profileAvatar) {
            profileAvatar.style.backgroundImage = `url('${finalAvatarUrl}')`;
            if (avatarPlaceholderIcon) avatarPlaceholderIcon.style.display = "none";
            if (avatarEditOverlay) avatarEditOverlay.style.display = "none";
            if (navProfileAvatar && navProfileIcon) {
                navProfileAvatar.style.backgroundImage = `url('${finalAvatarUrl}')`;
                navProfileAvatar.style.display = "block";
                navProfileIcon.style.display = "none";
            }
        }

        if (logoutBtn) logoutBtn.style.display = "flex";
        if (loginFromProfileBtn) loginFromProfileBtn.style.display = "none";
        if (openProfileSettingsBtn) openProfileSettingsBtn.style.display = "block"; 
        if (menuAuthBtn) menuAuthBtn.style.display = "none";
    } else {
        if (profileNameDisplay) profileNameDisplay.textContent = "Гость";
        if (profileEmailDisplay) profileEmailDisplay.textContent = "Неавторизованный пользователь";
        
        if (profileAvatar) profileAvatar.style.backgroundImage = "none";
        if (avatarPlaceholderIcon) avatarPlaceholderIcon.style.display = "block";
        if (avatarEditOverlay) avatarEditOverlay.style.display = "none";
        if (navProfileAvatar && navProfileIcon) {
            navProfileAvatar.style.display = "none";
            navProfileIcon.style.display = "block";
        }

        if (logoutBtn) logoutBtn.style.display = "none";
        if (loginFromProfileBtn) loginFromProfileBtn.style.display = "flex";
        if (openProfileSettingsBtn) openProfileSettingsBtn.style.display = "none"; 
        if (menuAuthBtn) menuAuthBtn.style.display = "flex"; 
    }
}

if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        updateProfileUI(user);
    });
}

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

// --- ЛОГИКА НАСТРОЕК ПРОФИЛЯ И ОБРЕЗКИ ФОТО ---
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
let tempCroppedBase64 = null; 

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
        
        tempCroppedBase64 = null; 
        profileSettingsModal.classList.add("active");
    }
};

if (openProfileSettingsBtn) openProfileSettingsBtn.addEventListener("click", openSettings);
if (profileAvatar) profileAvatar.addEventListener("click", () => {
    if (firebase.auth().currentUser) openSettings();
});

if (closeProfileSettingsBtn) {
    closeProfileSettingsBtn.addEventListener("click", () => profileSettingsModal.classList.remove("active"));
}

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

if (cancelCropBtn) {
    cancelCropBtn.addEventListener("click", () => {
        cropModal.classList.remove("active");
        if (cropper) cropper.destroy();
    });
}

if (applyCropBtn) {
    applyCropBtn.addEventListener("click", () => {
        if (cropper) {
            const squareCanvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
            const roundCanvas = document.createElement('canvas');
            roundCanvas.width = 300;
            roundCanvas.height = 300;
            const ctx = roundCanvas.getContext('2d');
            
            ctx.beginPath();
            ctx.arc(150, 150, 150, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.clip(); 
            
            ctx.drawImage(squareCanvas, 0, 0, 300, 300);
            tempCroppedBase64 = roundCanvas.toDataURL("image/png");
            
            settingsAvatarPreview.style.backgroundImage = `url('${tempCroppedBase64}')`;
            settingsAvatarPreview.innerHTML = ""; 
            
            cropModal.classList.remove("active");
            cropper.destroy();
        }
    });
}

if (saveProfileSettingsBtn) {
    saveProfileSettingsBtn.addEventListener("click", () => {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const newName = settingsNameInput.value.trim();
        const newBio = settingsBioInput.value.trim();
        
        const originalBtnText = saveProfileSettingsBtn.innerText;
        saveProfileSettingsBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Сохранение...`;
        saveProfileSettingsBtn.style.pointerEvents = "none";

        if (newBio) localStorage.setItem(`userBio_${user.uid}`, newBio);
        if (tempCroppedBase64) localStorage.setItem(`userAvatar_${user.uid}`, tempCroppedBase64);

        user.updateProfile({
            displayName: newName || user.displayName
        }).then(() => {
            profileSettingsModal.classList.remove("active");
            updateProfileUI(user); 
            
            saveProfileSettingsBtn.innerText = originalBtnText;
            saveProfileSettingsBtn.style.pointerEvents = "auto";
        }).catch(error => {
            console.error("Ошибка обновления:", error);
            saveProfileSettingsBtn.innerText = originalBtnText;
            saveProfileSettingsBtn.style.pointerEvents = "auto";
        });
    });
}

// --- ЛОГИКА ИЗБРАННОГО ---
const favoritesList = document.getElementById("favoritesList");
const emptyLibrary = document.getElementById("emptyLibrary");
const statsFavorites = document.getElementById("statsFavorites");
const modalFavBtn = document.getElementById("modalFavBtn");

let favoriteGenres = JSON.parse(localStorage.getItem("favoriteGenres")) || [];
let currentModalGenre = null; 

function updateFavorites() {
    if (statsFavorites) {
        statsFavorites.textContent = favoriteGenres.length;
    }

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
            
            card.querySelector(".remove-fav-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                favoriteGenres = favoriteGenres.filter(g => g.name !== genre.name);
                localStorage.setItem("favoriteGenres", JSON.stringify(favoriteGenres));
                updateFavorites();
                
                if (currentModalGenre && currentModalGenre.name === genre.name && modalFavBtn) {
                    modalFavBtn.classList.remove("active");
                    modalFavBtn.classList.replace("fa-solid", "fa-regular");
                }
            });
            
            favoritesList.appendChild(card);
        });
    }
}

if (modalFavBtn) {
    modalFavBtn.addEventListener("click", () => {
        if (!currentModalGenre) return;
        
        const index = favoriteGenres.findIndex(g => g.name === currentModalGenre.name);
        
        if (index === -1) {
            favoriteGenres.push(currentModalGenre);
            modalFavBtn.classList.add("active");
            modalFavBtn.classList.replace("fa-regular", "fa-solid");
        } else {
            favoriteGenres.splice(index, 1);
            modalFavBtn.classList.remove("active");
            modalFavBtn.classList.replace("fa-solid", "fa-regular");
        }
        
        localStorage.setItem("favoriteGenres", JSON.stringify(favoriteGenres));
        updateFavorites();
    });
}

updateFavorites();

// --- ЖАНР ДНЯ ---
const dailyGenreElement = document.getElementById("dailyGenre");

if (dailyGenreElement) {
    // Эта функция вызывается один раз при успешной загрузке базы
    function setDailyGenre(genreName) {
        let currentDaily = appGenres.find(g => g.name === genreName);
        if (!currentDaily) {
            currentDaily = { name: genreName, desc: `Погрузитесь в атмосферу жанра ${genreName}.` };
        }

        dailyGenreElement.textContent = currentDaily.name;
        
        dailyGenreElement.style.cursor = "pointer";
        dailyGenreElement.style.color = "#E6E6FA"; 
        dailyGenreElement.style.textDecoration = "underline";
        dailyGenreElement.style.textDecorationColor = "rgba(152, 255, 152, 0.4)"; 
        dailyGenreElement.style.textUnderlineOffset = "4px";
        dailyGenreElement.style.transition = "color 0.3s ease";
        
        dailyGenreElement.addEventListener("mouseenter", () => dailyGenreElement.style.color = "#ffffff");
        dailyGenreElement.addEventListener("mouseleave", () => dailyGenreElement.style.color = "#E6E6FA");
        
        dailyGenreElement.addEventListener("click", () => {
            const genreModal = document.getElementById("genreModal");
            const modalTitle = document.getElementById("modalGenreTitle");
            const modalDesc = document.getElementById("genreDescription");
            
            if (genreModal && modalTitle && modalDesc) {
                history.pushState({ modal: 'genre' }, ''); // Запись в историю
                modalTitle.textContent = currentDaily.name;
                modalDesc.textContent = currentDaily.desc;
                
                currentModalGenre = currentDaily;
                
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
                
                renderTracksInModal(currentDaily.name);
                genreModal.classList.add("active");
            }
        });
    }
}

// --- ЛОГИКА АВТОРИЗАЦИИ ЧЕРЕЗ GOOGLE ---
const googleAuthBtn = document.getElementById("googleAuthBtn");

if (googleAuthBtn) {
    googleAuthBtn.addEventListener("click", () => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const provider = new firebase.auth.GoogleAuthProvider();
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            
            if (isMobile) {
                firebase.auth().signInWithRedirect(provider);
            } else {
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
        }
    });
}

// --- ЛОГИКА АВТОРИЗАЦИИ EMAIL/PASSWORD ---
const authEmailInput = document.getElementById("emailInput");
const authPasswordInput = document.getElementById("passwordInput");
const authContinueBtn = document.querySelector(".auth-btn");

const errorMsgDisplay = document.createElement("div");
errorMsgDisplay.style.cssText = "color: #ff6b6b; font-size: 12px; margin-bottom: 15px; text-align: center; display: none;";

if (authContinueBtn) {
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
        authContinueBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; 

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then(() => {
                document.getElementById("authModal").classList.remove("active");
                authEmailInput.value = ""; 
                authPasswordInput.value = "";
                authContinueBtn.innerText = originalBtnText;
            })
            .catch((error) => {
                if (error.code === 'auth/user-not-found') {
                    firebase.auth().createUserWithEmailAndPassword(email, password)
                        .then(() => {
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

// --- ЛОГИКА КНОПОК ПОДСКАЗКИ ДЛЯ НЕЗАРЕГИСТРИРОВАННЫХ ---
const regPromptModal = document.getElementById("registerPromptModal");
const closeRegPromptBtn = document.getElementById("closeRegPromptBtn");
const goFromPromptToAuthBtn = document.getElementById("goFromPromptToAuthBtn");

if (closeRegPromptBtn && regPromptModal) {
    closeRegPromptBtn.addEventListener("click", () => regPromptModal.classList.remove("active"));
}

if (goFromPromptToAuthBtn && regPromptModal) {
    goFromPromptToAuthBtn.addEventListener("click", () => {
        regPromptModal.classList.remove("active"); 
        const authModal = document.getElementById("authModal");
        if (authModal) authModal.classList.add("active"); 
    });
}

// --- ЛОГИКА ОКОН БОКОВОГО МЕНЮ И ИСТОРИИ ---
const historyModal = document.getElementById("historyModal");
const aboutModal = document.getElementById("aboutModal");
const supportModal = document.getElementById("supportModal");

const menuHistoryBtn = document.getElementById("menuHistory");
const menuAboutBtn = document.getElementById("menuAbout");
const menuSupportBtn = document.getElementById("menuSupport");

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

document.getElementById("closeHistoryBtn")?.addEventListener("click", () => historyModal.classList.remove("active"));
document.getElementById("closeAboutBtn")?.addEventListener("click", () => aboutModal.classList.remove("active"));
document.getElementById("closeSupportBtn")?.addEventListener("click", () => supportModal.classList.remove("active"));

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

    [...spinHistory].reverse().forEach(genreName => {
        const item = document.createElement("div");
        item.className = "search-result-card"; 
        item.style.marginBottom = "10px";
        
        item.innerHTML = `
            <div class="search-result-info" style="pointer-events: none;">
                <h4 style="margin: 0; font-size: 16px;">${genreName}</h4>
            </div>
            <i class="fa-solid fa-rotate-right search-arrow" style="color: #8FDDCB; pointer-events: none;"></i>
        `;

        item.addEventListener("click", () => {
            const genreModal = document.getElementById("genreModal");
            const modalTitle = document.getElementById("modalGenreTitle");
            const modalDesc = document.getElementById("genreDescription");
            
            const dbKey = genreName.toLowerCase();
            const genreInfo = globalDatabase[dbKey];

            if (genreModal && modalTitle && modalDesc) {
                history.pushState({ modal: 'genre' }, ''); // Запись в историю
                modalTitle.innerText = genreName;
                if (genreInfo) {
                    modalDesc.innerText = genreInfo.description;
                } else {
                    modalDesc.innerHTML = `Погрузитесь в атмосферу <b>${genreName}</b>.<br><br><span style="font-size: 0.9em; opacity: 0.7;">Информация скоро появится.</span>`;
                }

                currentModalGenre = { name: genreName }; 
                
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
                
                historyModal.classList.remove("active"); 
                setTimeout(() => genreModal.classList.add("active"), 300); 
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

updateHistoryUI(); 

// --- ЛОГИКА ПРОФИЛЕЙ АРТИСТОВ И ИХ ИСТОРИИ ---
const artistModal = document.getElementById("artistModal");
const closeArtistBtn = document.getElementById("closeArtistBtn");

let artistHistoryStack = [];
let currentArtistInModal = null;

if (closeArtistBtn && artistModal) {
    const oldCloseClone = closeArtistBtn.cloneNode(true);
    closeArtistBtn.parentNode.replaceChild(oldCloseClone, closeArtistBtn);
    oldCloseClone.addEventListener("click", () => {
        artistModal.classList.remove("active");
        artistHistoryStack = [];
        currentArtistInModal = null;
        if (typeof currentAudio !== 'undefined' && currentAudio && currentAudio.trackId && currentAudio.trackId.startsWith('artist-track')) {
            currentAudio.pause();
            if (typeof currentPlayBtn !== 'undefined' && currentPlayBtn) {
                currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        }
    });
}

const artistBackBtn = document.getElementById("artistBackBtn");
if (artistBackBtn) {
    artistBackBtn.addEventListener("click", () => {
        if (artistHistoryStack.length > 0) {
            const prevArtist = artistHistoryStack.pop();
            openArtistProfile(prevArtist, true); 
        }
    });
}

async function openArtistProfile(artistName, isBack = false) {
    if (!artistModal) return;

    if (!isBack) {
        history.pushState({ modal: 'artist', name: artistName }, '');
    }

    if (!isBack && currentArtistInModal && currentArtistInModal !== artistName) {
        artistHistoryStack.push(currentArtistInModal);
    }
    if (!isBack && !currentArtistInModal) {
        artistHistoryStack = []; 
    }
    currentArtistInModal = artistName;

    const backBtn = document.getElementById("artistBackBtn");
    if (backBtn) {
        backBtn.style.display = artistHistoryStack.length > 0 ? "block" : "none";
    }
    
    document.getElementById("artistNameDisplay").innerText = "Загрузка...";
    const followersDisplay = document.getElementById("artistFollowers");
    if (followersDisplay) followersDisplay.innerHTML = '<i class="fa-solid fa-users"></i> Загрузка...';
    
    const headerEl = document.getElementById("artistHeader");
    if (headerEl) headerEl.style.backgroundImage = "none";
    
    artistModal.classList.add("active");

    try {
        const response = await fetch(`https://belyash-coder-github-io.vercel.app/search-artist?name=${encodeURIComponent(artistName)}`);
        const data = await response.json();

        if (data.error) {
            document.getElementById("artistNameDisplay").innerText = "Не найдено";
            if (followersDisplay) followersDisplay.innerHTML = "";
            return;
        }

        document.getElementById("artistNameDisplay").innerText = data.name;

        if (data.avatar && headerEl) {
            headerEl.style.backgroundImage = `url('${data.avatar}')`;
        }

        if (followersDisplay) {
            if (data.fans && data.fans > 0) {
                const formattedFans = data.fans.toLocaleString('ru-RU');
                followersDisplay.innerHTML = `<i class="fa-solid fa-users"></i> ${formattedFans} фанатов`;
            } else {
                followersDisplay.innerHTML = `<i class="fa-solid fa-music"></i> Исполнитель`;
            }
        }

        const tracksContainer = document.getElementById("artistTopTracksContainer");
        tracksContainer.innerHTML = ""; 

        if (data.tracks && data.tracks.length > 0) {
            data.tracks.forEach((track, index) => {
                const safeArtistId = data.name.replace(/[^a-zA-Z0-9]/g, '');
                const trackId = `artist-track-${safeArtistId}-${index}`;
                
                const card = document.createElement("div");
                card.className = "track-card artist-track-card";
                
                card.innerHTML = `
                    <div class="track-left" style="flex-grow: 1; min-width: 0; display: flex; align-items: center;">
                        <div style="width: 45px; height: 45px; min-width: 45px; border-radius: 4px; background-image: url('${track.cover || ''}'); background-size: cover; margin-right: 12px; background-color: #140f1c; border: 1px solid rgba(143, 221, 203, 0.3);"></div>
                        <div class="track-info" style="width: 100%; overflow: hidden; padding-right: 10px;">
                            <div class="track-title" style="color: #fff; font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${track.name}</div>
                            <div class="track-artist" style="color: rgba(168,159,205,0.6); font-size: 10px; margin-top: 2px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${track.album}</div>
                            <div class="seek-bar-container" id="seek-container-${trackId}" style="margin-top: 6px;">
                                <div class="seek-bar-progress" id="seek-progress-${trackId}"></div>
                            </div>
                        </div>
                    </div>
                    <div class="play-btn" id="btn-${trackId}" data-audio-url="${track.preview_url}">
                        <i class="fa-solid fa-play"></i>
                    </div>
                `;
                
                tracksContainer.appendChild(card);

                card.addEventListener("click", function(e) {
                    const playBtn = document.getElementById(`btn-${trackId}`);
                    const audioUrl = playBtn.dataset.audioUrl;
                    const seekBarContainer = document.getElementById(`seek-container-${trackId}`);
                    const progressBar = document.getElementById(`seek-progress-${trackId}`);

                    if (!audioUrl) return; 

                    if (e.target.closest('.seek-bar-container')) {
                        if (currentAudio && currentAudio.trackId === trackId) {
                            const rect = seekBarContainer.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percent = clickX / rect.width;
                            currentAudio.currentTime = percent * currentAudio.duration;
                        }
                        return;
                    }

                    if (e.target.closest('.play-btn')) {
                        if (currentAudio && currentAudio.trackId === trackId) {
                            if (!currentAudio.paused) {
                                currentAudio.pause();
                                playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                            } else {
                                currentAudio.play();
                                playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                            }
                            return;
                        }
                        
                        if (currentAudio) {
                            currentAudio.pause();
                            if (currentPlayBtn) currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                            const prevProgress = document.getElementById(`seek-progress-${currentAudio.trackId}`);
                            if (prevProgress) prevProgress.style.width = '0%';
                        }
                        
                        currentAudio = new Audio(audioUrl);
                        currentAudio.trackId = trackId;
                        currentPlayBtn = playBtn;
                        
                        currentAudio.play();
                        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; 
                        
                        currentAudio.addEventListener('timeupdate', () => {
                            if (currentAudio.duration) {
                                const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
                                if (progressBar) progressBar.style.width = percent + '%';
                            }
                        });

                        currentAudio.onended = () => { 
                            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; 
                            if (progressBar) progressBar.style.width = '0%'; 
                        };
                    }
                });
            });
        } else {
            tracksContainer.innerHTML = '<div style="color: rgba(168,159,205,0.5); font-size: 13px; text-align: center;">Треки не найдены</div>';
        }

        if (data.similar && data.similar.length > 0) {
            document.getElementById("relatedArtistsContainer").innerHTML = data.similar.map(artistObj => {
                const safeName = artistObj.name.replace(/'/g, "\\'");
                const photoHtml = artistObj.picture 
                    ? `<div class="related-artist-photo" style="background-image: url('${artistObj.picture}'); background-size: cover; background-position: center; border: 1px solid rgba(143, 221, 203, 0.3);"></div>`
                    : `<div class="related-artist-photo" style="background-color: #140f1c; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(143, 221, 203, 0.3);"><i class="fa-solid fa-music" style="color: rgba(143, 221, 203, 0.5);"></i></div>`;

                return `
                <div class="related-artist-card" onclick="openArtistProfile('${safeName}')" style="cursor: pointer;">
                    ${photoHtml}
                    <div class="related-artist-name">${artistObj.name}</div>
                </div>
                `;
            }).join('');
        } else {
            document.getElementById("relatedArtistsContainer").innerHTML = '<div style="color: rgba(168,159,205,0.5); font-size: 13px; text-align: center;">Нет данных</div>';
        }

    } catch (error) {
        console.error("Системная ошибка:", error);
        document.getElementById("artistNameDisplay").innerText = "Ошибка соединения";
        if (followersDisplay) followersDisplay.innerHTML = "";
    }
}

// --- ОБРАБОТЧИК СИСТЕМНОЙ КНОПКИ "НАЗАД" НА СМАРТФОНАХ ---
window.addEventListener('popstate', (event) => {
    // 1. Проверяем окно артиста
    if (typeof artistModal !== 'undefined' && artistModal && artistModal.classList.contains('active')) {
        if (typeof artistHistoryStack !== 'undefined' && artistHistoryStack.length > 0) {
            const prevArtist = artistHistoryStack.pop();
            openArtistProfile(prevArtist, true);
        } else {
            artistModal.classList.remove('active');
            if (typeof currentArtistInModal !== 'undefined') currentArtistInModal = null;
            if (typeof currentAudio !== 'undefined' && currentAudio && currentAudio.trackId && currentAudio.trackId.startsWith('artist-track')) {
                currentAudio.pause();
                if (typeof currentPlayBtn !== 'undefined' && currentPlayBtn) {
                    currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                }
            }
        }
        return; // Останавливаем выполнение, если закрыли артиста
    }

    // 2. Проверяем окно жанра
    const genreModal = document.getElementById("genreModal");
    if (genreModal && genreModal.classList.contains('active')) {
        genreModal.classList.remove('active');
        if (typeof currentAudio !== 'undefined' && currentAudio) {
            currentAudio.pause();
            if (typeof currentPlayBtn !== 'undefined' && currentPlayBtn) {
                currentPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        }
    }
});