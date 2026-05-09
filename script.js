// --- CONFIGURAÇÃO ---
const HARDCODED_WEATHER_KEY = '70ade7bd675907645ae4a62fe903f525';

// Configuration State
let settings = JSON.parse(localStorage.getItem('dooh_settings')) || {
    interval: 15,
    weatherCity: 'Sao Paulo',
    weatherKey: HARDCODED_WEATHER_KEY,
    activeSources: ['g1-brasil', 'cnn-br'],
    sourceUrls: [
        { id: 'g1-brasil', name: 'G1 - Brasil', url: 'https://g1.globo.com/rss/g1/' },
        { id: 'cnn-br', name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' }
    ]
};

// State Variables
let newsItems = [];
let currentIndex = 0;
let progressInterval;
let voices = [];

// Elements
const newsImg = document.getElementById('news-img');
const newsSource = document.getElementById('news-source');
const newsTitle = document.getElementById('news-title');
const newsSummary = document.getElementById('news-summary');
const progressBar = document.getElementById('progress-bar');
const btnSpeak = document.getElementById('btn-speak');
const loadingOverlay = document.getElementById('loading-overlay');

async function init() {
    console.log('Iniciando DOOH News Dashboard...');
    
    updateClock();
    setInterval(updateClock, 1000);
    
    // Safety timeout for loading screen (max 6 seconds)
    const loadTimeout = setTimeout(hideLoading, 6000);

    // Data fetching (Parallel)
    try {
        await Promise.all([
            fetchCurrencies(),
            fetchWeather(),
            refreshNews()
        ]);
        clearTimeout(loadTimeout);
        hideLoading();
    } catch (e) {
        console.error('Erro no carregamento inicial:', e);
        hideLoading();
    }

    setInterval(fetchCurrencies, 300000);
    setInterval(fetchWeather, 900000);
    setInterval(refreshNews, 1800000);

    btnSpeak.addEventListener('click', toggleSpeech);
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
}

function hideLoading() {
    if (loadingOverlay && loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);
    }
}

function loadVoices() {
    voices = window.speechSynthesis.getVoices();
}

function toggleSpeech() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        updateSpeechUI(false);
        return;
    }
    if (newsItems.length === 0) return;

    const item = newsItems[currentIndex];
    const text = item.title; 
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    
    const ptVoice = voices.find(v => v.lang.includes('pt-BR')) || voices.find(v => v.lang.includes('pt'));
    if (ptVoice) utterance.voice = ptVoice;

    utterance.onstart = () => updateSpeechUI(true);
    utterance.onend = () => updateSpeechUI(false);
    utterance.onerror = () => updateSpeechUI(false);
    window.speechSynthesis.speak(utterance);
}

function updateSpeechUI(isSpeaking) {
    const status = document.getElementById('speech-status');
    if (isSpeaking) {
        btnSpeak.classList.add('speaking');
        if (status) status.style.display = 'inline';
    } else {
        btnSpeak.classList.remove('speaking');
        if (status) status.style.display = 'none';
    }
}

function stopSpeech() {
    window.speechSynthesis.cancel();
    updateSpeechUI(false);
}

async function fetchCurrencies() {
    try {
        const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL');
        const data = await response.json();
        document.getElementById('usd-rate').textContent = `R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
        document.getElementById('eur-rate').textContent = `R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
    } catch (e) { console.error('Erro moedas:', e); }
}

async function fetchWeather() {
    const apiKey = settings.weatherKey || HARDCODED_WEATHER_KEY;
    if (!apiKey) return;

    const updateUI = async (url) => {
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.cod === 200) {
                document.getElementById('weather-city').textContent = data.name;
                document.getElementById('weather-temp').textContent = `${Math.round(data.main.temp)}°C`;
                document.getElementById('weather-desc').textContent = data.weather[0].description;
                const iconEl = document.getElementById('weather-icon');
                iconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
                iconEl.style.display = 'block';
            }
        } catch (e) { console.error('Erro clima:', e); }
    };

    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            updateUI(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&lang=pt_br&appid=${apiKey}`);
        },
        () => {
            updateUI(`https://api.openweathermap.org/data/2.5/weather?q=${settings.weatherCity}&units=metric&lang=pt_br&appid=${apiKey}`);
        },
        { timeout: 4000 }
    );
}

async function refreshNews() {
    const sources = settings.sourceUrls && settings.sourceUrls.length > 0 ? settings.sourceUrls : [
        { id: 'g1-brasil', name: 'G1 - Brasil', url: 'https://g1.globo.com/rss/g1/' }
    ];

    const fetchSource = async (source) => {
        try {
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();
            if (data.status === 'ok') {
                return data.items.map(item => ({
                    title: item.title,
                    summary: cleanHTML(item.description || item.content),
                    source: source.name,
                    image: item.enclosure?.link || item.thumbnail || extractImg(item.content) || `https://picsum.photos/seed/${Math.random()}/1200/800`,
                    date: new Date(item.pubDate || Date.now())
                }));
            }
        } catch (e) { console.error(`Erro ${source.name}:`, e); }
        return [];
    };

    const results = await Promise.all(sources.map(fetchSource));
    const allNews = results.flat();

    if (allNews.length > 0) {
        allNews.sort((a, b) => b.date - a.date);
        newsItems = allNews.slice(0, 50);
        startCycling();
    }
}

function startCycling() {
    if (progressInterval) clearInterval(progressInterval);
    displayNews(currentIndex);
    let timeLeft = settings.interval;
    progressInterval = setInterval(() => {
        timeLeft -= 0.1;
        const progress = ((settings.interval - timeLeft) / settings.interval) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (timeLeft <= 0) {
            stopSpeech();
            currentIndex = (currentIndex + 1) % newsItems.length;
            displayNews(currentIndex);
            timeLeft = settings.interval;
        }
    }, 100);
}

function displayNews(index) {
    const item = newsItems[index];
    if (!item) return;
    const container = document.getElementById('news-container');
    container.style.opacity = '0.7';
    setTimeout(() => {
        newsImg.src = item.image;
        newsSource.textContent = item.source;
        newsTitle.textContent = item.title;
        newsSummary.textContent = item.summary.length > 250 ? item.summary.substring(0, 250) + '...' : item.summary;
        container.style.opacity = '1';
        container.classList.remove('fade-in');
        void container.offsetWidth;
        container.classList.add('fade-in');
        newsImg.classList.remove('ken-burns');
        void newsImg.offsetWidth;
        newsImg.classList.add('ken-burns');
    }, 400);
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString('pt-BR');
    document.getElementById('date').textContent = now.toLocaleDateString('pt-BR', { 
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
    }).replace('.', '');
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

init();


