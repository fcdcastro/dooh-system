const HARDCODED_WEATHER_KEY = '70ade7bd675907645ae4a62fe903f525';

const DEFAULT_SOURCES = [
    { id: 'g1-brasil', name: 'G1 - Brasil', url: 'https://g1.globo.com/rss/g1/' },
    { id: 'cnn-br', name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
    { id: 'uol-noticias', name: 'UOL Notícias', url: 'https://noticias.uol.com.br/ultimas-noticias/index.xml' },
    { id: 'bbc-brasil', name: 'BBC Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    { id: 'valor', name: 'Valor Econômico', url: 'https://valor.globo.com/rss/valor/' },
    { id: 'exame', name: 'Exame - Negócios', url: 'https://exame.com/feed/' },
    { id: 'tecmundo', name: 'TecMundo', url: 'https://www.tecmundo.com.br/rss' }
];

document.addEventListener('DOMContentLoaded', () => {
    const sourcesList = document.getElementById('sources-list');
    const saveBtn = document.getElementById('save-settings');
    const viewPlayerBtn = document.getElementById('view-player');
    const addSourceBtn = document.getElementById('add-source');
    const testTTSBtn = document.getElementById('test-tts');

    let settings = JSON.parse(localStorage.getItem('dooh_settings')) || {
        interval: 15,
        weatherCity: 'Sao Paulo',
        weatherKey: HARDCODED_WEATHER_KEY,
        activeSources: DEFAULT_SOURCES.map(s => s.id),
        customSources: [],
        sourceUrls: DEFAULT_SOURCES
    };

    // Initialize fields
    document.getElementById('news-interval').value = settings.interval;
    document.getElementById('weather-city-input').value = settings.weatherCity;
    document.getElementById('weather-api-key').value = settings.weatherKey || HARDCODED_WEATHER_KEY;

    function renderSources() {
        sourcesList.innerHTML = '';
        const allSources = [...DEFAULT_SOURCES, ...(settings.customSources || [])];
        
        allSources.forEach(source => {
            const item = document.createElement('div');
            item.className = 'source-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `source-${source.id}`;
            checkbox.checked = settings.activeSources.includes(source.id);
            
            const label = document.createElement('label');
            label.htmlFor = `source-${source.id}`;
            label.textContent = source.name;
            label.style.flex = '1';
            label.style.cursor = 'pointer';

            item.appendChild(checkbox);
            item.appendChild(label);

            if (!DEFAULT_SOURCES.find(s => s.id === source.id)) {
                const delBtn = document.createElement('button');
                delBtn.textContent = '×';
                delBtn.style.background = 'transparent';
                delBtn.style.color = '#ff4444';
                delBtn.style.border = 'none';
                delBtn.style.fontSize = '24px';
                delBtn.style.cursor = 'pointer';
                delBtn.onclick = () => {
                    settings.customSources = settings.customSources.filter(s => s.id !== source.id);
                    settings.activeSources = settings.activeSources.filter(id => id !== source.id);
                    renderSources();
                };
                item.appendChild(delBtn);
            }

            sourcesList.appendChild(item);
        });
    }

    renderSources();

    // Add Custom Source
    addSourceBtn.addEventListener('click', () => {
        const name = document.getElementById('custom-source-name').value;
        const url = document.getElementById('custom-source-url').value;

        if (name && url) {
            const id = 'custom-' + Date.now();
            settings.customSources = settings.customSources || [];
            settings.customSources.push({ id, name, url });
            settings.activeSources.push(id);
            
            document.getElementById('custom-source-name').value = '';
            document.getElementById('custom-source-url').value = '';
            renderSources();
        } else {
            alert('Por favor, preencha nome e URL do RSS.');
        }
    });

    // Save Settings
    saveBtn.addEventListener('click', () => {
        const allSources = [...DEFAULT_SOURCES, ...(settings.customSources || [])];
        const activeIds = allSources
            .filter(s => document.getElementById(`source-${s.id}`).checked)
            .map(s => s.id);

        const newSettings = {
            interval: parseInt(document.getElementById('news-interval').value),
            weatherCity: document.getElementById('weather-city-input').value,
            weatherKey: document.getElementById('weather-api-key').value,
            activeSources: activeIds,
            customSources: settings.customSources || [],
            sourceUrls: allSources.filter(s => activeIds.includes(s.id))
        };

        localStorage.setItem('dooh_settings', JSON.stringify(newSettings));
        alert('Configurações salvas com sucesso!');
    });

    // Test TTS
    testTTSBtn.addEventListener('click', () => {
        const text = 'Teste de áudio do sistema DOOH. Se você está ouvindo isso, a síntese de voz está funcionando corretamente.';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
    });

    viewPlayerBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});

