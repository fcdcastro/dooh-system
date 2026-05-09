// --- CONFIGURAÇÃO ---
const HARDCODED_WEATHER_KEY = '70ade7bd675907645ae4a62fe903f525'; // COLE SUA CHAVE AQUI ENTRE AS ASPAS

// Configuration State
let settings = JSON.parse(localStorage.getItem('dooh_settings')) || {
    interval: 15,
    weatherCity: 'Sao Paulo',
    weatherKey: '',
    activeSources: [],
    sourceUrls: [
        { id: 'g1-brasil', name: 'G1 - Brasil', url: 'https://g1.globo.com/rss/g1/' },
        { id: 'cnn-br', name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' }
    ]
};

// Prioritize hardcoded key if present
if (HARDCODED_WEATHER_KEY) {
    settings.weatherKey = HARDCODED_WEATHER_KEY;
}

let newsItems = [];
let currentIndex = 0;
let progressInterval;

// Elements
const newsImg = document.getElementById('news-img');
const newsSource = document.getElementById('news-source');
const newsTitle = document.getElementById('news-title');
const newsSummary = document.getElementById('news-summary');
const progressBar = document.getElementById('progress-bar');
const btnSpeak = document.getElementById('btn-speak');

let synth = window.speechSynthesis;
let currentUtterance = null;

async function init() {
    updateClock();
    setInterval(updateClock, 1000);
    
    await fetchCurrencies();
    setInterval(fetchCurrencies, 300000); // 5 min
    
    await fetchWeather();
    setInterval(fetchWeather, 900000); // 15 min

    await refreshNews();
    setInterval(refreshNews, 1800000); // 30 min

    // Audio Button Logic
    btnSpeak.addEventListener('click', toggleSpeech);
}

function toggleSpeech() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        updateSpeechUI(false);
        return;
    }

    const text = `${newsTitle.textContent}. ${newsSummary.textContent}. Fonte: ${newsSource.textContent}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    
    // Tenta carregar vozes para Chrome/Android
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.includes('pt-BR')) || voices.find(v => v.lang.includes('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => updateSpeechUI(true);
    utterance.onend = () => updateSpeechUI(false);
    utterance.onerror = (e) => {
        console.error('Erro na fala:', e);
        updateSpeechUI(false);
    };

    window.speechSynthesis.speak(utterance);
}

function updateSpeechUI(isSpeaking) {
    const btn = document.getElementById('btn-speak');
    const status = document.getElementById('speech-status');
    if (isSpeaking) {
        btn.classList.add('speaking');
        if (status) status.style.display = 'inline';
    } else {
        btn.classList.remove('speaking');
        if (status) status.style.display = 'none';
    }
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
}

// Escuta mudança de vozes
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// --- Data Fetching ---

async function fetchCurrencies() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
        const data = await response.json();
        
        document.getElementById('usd-rate').textContent = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
        document.getElementById('eur-rate').textContent = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
    } catch (e) {
        console.error('Error fetching currencies', e);
    }
}

async function fetchWeather() {
    if (!settings.weatherKey) {
        document.getElementById('weather-desc').textContent = 'Chave API necessária';
        return;
    }

    const descEl = document.getElementById('weather-desc');
    descEl.textContent = 'Detectando localização...';
    
    // Try to get current position
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=pt_br&appid=${settings.weatherKey}`;
            await updateWeatherUI(url);
        },
        async (error) => {
            console.warn('Geolocation failed, falling back to city', error);
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${settings.weatherCity}&units=metric&lang=pt_br&appid=${settings.weatherKey}`;
            await updateWeatherUI(url);
        },
        { timeout: 5000 } // Wait max 5 seconds for geolocation
    );
}

async function updateWeatherUI(url) {
    const descEl = document.getElementById('weather-desc');
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.cod !== 200) {
            descEl.textContent = `Erro: ${data.message}`;
            console.error('Weather API Error:', data);
            return;
        }
        
        document.getElementById('weather-city').textContent = data.name;
        document.getElementById('weather-temp').textContent = `${Math.round(data.main.temp)}°C`;
        descEl.textContent = data.weather[0].description;
        
        // Icon
        const iconCode = data.weather[0].icon;
        const iconEl = document.getElementById('weather-icon');
        iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        iconEl.style.display = 'block';
    } catch (e) {
        descEl.textContent = 'Erro de Conexão';
        console.error('Error fetching weather', e);
    }
}

async function refreshNews() {
    const allNews = [];
    
    for (const source of settings.sourceUrls) {
        try {
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            
            if (data.status === 'ok') {
                data.items.forEach(item => {
                    allNews.push({
                        title: item.title,
                        summary: cleanHTML(item.description || item.content),
                        source: source.name,
                        image: item.enclosure?.link || item.thumbnail || extractImg(item.content) || `https://picsum.photos/seed/${Math.random()}/1200/800`,
                        date: new Date(item.pubDate || Date.now()) // Captura a data
                    });
                });
            }
        } catch (e) {
            console.error(`Error fetching news from ${source.name}`, e);
        }
    }

    if (allNews.length > 0) {
        // Ordena por data (mais recente primeiro)
        allNews.sort((a, b) => b.date - a.date);
        
        // Limita a 50 notícias para manter o sistema leve e atual
        newsItems = allNews.slice(0, 50);
        
        if (newsItems.length > 0) startCycling();
    }
}

// --- Display Logic ---

function startCycling() {
    displayNews(currentIndex);
    
    if (progressInterval) clearInterval(progressInterval);
    
    let timeLeft = settings.interval;
    progressInterval = setInterval(() => {
        timeLeft -= 0.1;
        const progress = ((settings.interval - timeLeft) / settings.interval) * 100;
        progressBar.style.width = `${progress}%`;
        
        if (timeLeft <= 0) {
            stopSpeech(); // Para a fala se a notícia mudar
            currentIndex = (currentIndex + 1) % newsItems.length;
            displayNews(currentIndex);
            timeLeft = settings.interval;
        }
    }, 100);
}

function displayNews(index) {
    const item = newsItems[index];
    if (!item) return;

    // Fade out effect
    const container = document.getElementById('news-container');
    container.style.opacity = '0.8';
    
    setTimeout(() => {
        newsImg.src = item.image;
        newsSource.textContent = item.source;
        newsTitle.textContent = item.title;
        newsSummary.textContent = item.summary.substring(0, 200) + (item.summary.length > 200 ? '...' : '');
        
        container.style.opacity = '1';
        container.classList.remove('fade-in');
        void container.offsetWidth; // Trigger reflow
        container.classList.add('fade-in');
    }, 300);
}

// --- Helpers ---

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('pt-BR');
    document.getElementById('date').textContent = now.toLocaleDateString('pt-BR', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
}

function cleanHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
}

function extractImg(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    const img = div.querySelector('img');
    return img ? img.src : null;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

init();
