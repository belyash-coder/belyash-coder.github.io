const genres = musicGenres; // Подтягиваем данные из файла database.js

const wheel = document.getElementById("rouletteWheel");
const button = document.getElementById("spinBtn");
const dailyGenreDisplay = document.getElementById("dailyGenre");
const hint = document.getElementById("genreHint");
const orDivider = document.getElementById("orDivider"); // Подключили разделитель
const rouletteBox = document.querySelector(".roulette-box");

// Элементы модального окна
const modal = document.getElementById("genreModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalTitle = document.getElementById("modalGenreTitle");

let isSpinning = false;
let hasResult = false; 

// Вычисляем жанр дня на основе текущей даты
const today = new Date();
const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate(); 
const dailyIndex = dateSeed % genres.length;
dailyGenreDisplay.innerText = genres[dailyIndex];

// Логика запуска рулетки
button.addEventListener("click", () => {
    if (isSpinning) return; 
    
    isSpinning = true;
    hasResult = false; 
    rouletteBox.style.cursor = "default";
    button.style.opacity = "0.5";
    hint.classList.remove("show");
    
    // Возвращаем ленту в самое начало
    wheel.style.transition = "none";
    wheel.style.transform = "translateY(0)";
    wheel.innerHTML = "";

    const tapeLength = 40;
    const itemHeight = 120; // Высота одной строки

    for (let i = 0; i < tapeLength; i++) {
        const div = document.createElement("div");
        div.className = "genre-item";
        div.innerText = genres[Math.floor(Math.random() * genres.length)];
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
        
        // Подсветка выпавшего жанра
        wheel.lastElementChild.classList.add("highlight-result");
        
        // Показ надписи "Узнать больше"
        hint.classList.add("show");
        
        // Меняем текст кнопки и плавно показываем "или"
        button.innerText = "Попробовать еще";
        orDivider.classList.add("show");
        
        // Разрешаем клик по рулетке
        hasResult = true;
        rouletteBox.style.cursor = "pointer";
    }, 4550);
});

// Логика открытия модального окна
rouletteBox.addEventListener("click", () => {
    if (hasResult && !isSpinning) {
        const finalGenre = wheel.lastElementChild.innerText;
        modalTitle.innerText = finalGenre;
        modal.classList.add("active");
    }
});

// Закрытие окна по крестику
closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
});

// Закрытие окна по клику на темный фон
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.classList.remove("active");
    }
});