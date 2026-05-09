const DEFAULT_SOURCES = [
    { id: 'g1-brasil', name: 'G1 - Brasil', url: 'https://g1.globo.com/rss/g1/' },
    { id: 'g1-mundo', name: 'G1 - Mundo', url: 'https://g1.globo.com/rss/g1/mundo/' },
    { id: 'cnn-br', name: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
    { id: 'uol-noticias', name: 'UOL Notícias', url: 'https://noticias.uol.com.br/ultimas-noticias/index.xml' },
    { id: 'folha-mundo', name: 'Folha de S.Paulo - Mundo', url: 'https://feeds.folha.uol.com.br/mundo/rss091.xml' },
    { id: 'estadao', name: 'Estadão - Últimas', url: 'https://www.estadao.com.br/arc/outboundfeeds/rss/category/ultimas-noticias/' },
    { id: 'bbc-brasil', name: 'BBC Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
    { id: 'reuters-br', name: 'Reuters Brasil', url: 'https://br.reuters.com/rssFeed/topNews' },
    { id: 'el-pais', name: 'El País Brasil', url: 'https://brasil.elpais.com/rss/brasil/portada.xml' },
    { id: 'valor', name: 'Valor Econômico', url: 'https://valor.globo.com/rss/valor/' },
    { id: 'exame', name: 'Exame - Negócios', url: 'https://exame.com/feed/' },
    { id: 'tecmundo', name: 'TecMundo', url: 'https://www.tecmundo.com.br/rss' },
    { id: 'meio-bit', name: 'Meio Bit', url: 'https://meiobit.com/feed/' },
    { id: 'gzh', name: 'GZH', url: 'https://gauchazh.clicrbs.com.br/rss/ultimas-noticias/' },
    { id: 'oglobo', name: 'O Globo - Brasil', url: 'https://oglobo.globo.com/rss/brasil/' }
];

document.addEventListener('DOMContentLoaded', () => {
    const sourcesList = document.getElementById('sources-list');
    const saveBtn = document.getElementById('save-settings');
    const viewPlayerBtn = document.getElementById('view-player');

    // Load saved settings
    const savedSettings = JSON.parse(localStorage.getItem('dooh_settings')) || {
        interval: 15,
        weatherCity: 'Sao Paulo',
        weatherKey: '',
        activeSources: DEFAULT_SOURCES.map(s => s.id)
    };

    // Render sources list
    DEFAULT_SOURCES.forEach(source => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '10px';
        div.style.marginBottom = '5px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `source-${source.id}`;
        checkbox.style.width = 'auto';
        checkbox.checked = savedSettings.activeSources.includes(source.id);

        const label = document.createElement('label');
        label.htmlFor = `source-${source.id}`;
        label.textContent = source.name;
        label.style.marginBottom = '0';

        div.appendChild(checkbox);
        div.appendChild(label);
        sourcesList.appendChild(div);
    });

    // Populate other fields
    document.getElementById('news-interval').value = savedSettings.interval;
    document.getElementById('weather-city-input').value = savedSettings.weatherCity;
    document.getElementById('weather-api-key').value = savedSettings.weatherKey;

    saveBtn.addEventListener('click', () => {
        const activeSources = DEFAULT_SOURCES
            .filter(s => document.getElementById(`source-${s.id}`).checked)
            .map(s => s.id);

        const settings = {
            interval: parseInt(document.getElementById('news-interval').value),
            weatherCity: document.getElementById('weather-city-input').value,
            weatherKey: document.getElementById('weather-api-key').value,
            activeSources: activeSources,
            sourceUrls: DEFAULT_SOURCES.filter(s => activeSources.includes(s.id))
        };

        localStorage.setItem('dooh_settings', JSON.stringify(settings));
        alert('Configurações salvas com sucesso!');
    });

    viewPlayerBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});
