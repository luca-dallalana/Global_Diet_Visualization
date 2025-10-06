let caloriesGdpData = [];    
let obesityData = [];        
let macronutrientData = [];  
let currentData = [];        // Dados atualmente filtrados para os gráficos
let scatterplot;

// Configuração das dimensões do Scatterplot (fixas, sem redimensionamento)
function getChartConfig() {
  return {
    width: 500,  // Largura total do gráfico 
    height: 250, // Altura total do gráfico 
    margin: { top: 20, right: 40, bottom: 40, left: 50 } // Margens internas (espaço para eixos)
  };
}

// Carrega todos os datasets de forma assíncrona
async function loadData() {
  try {
    caloriesGdpData = await d3.csv('./dataset_files/Daily_calories_X_GDP_per_capita.csv', d => ({
      country: d.Country,
      year: +d.Year,                    // + converte string para número
      calories: +d['Total Daily Calories'],
      gdp: +d['GDP per capita']
    }));

    obesityData = await d3.csv('./dataset_files/Obesity_rate_per_year.csv', d => ({
      country: d.Country,
      year: +d.Year,
      obesity: +d['Obesity Percentage']
    }));

    // Inclui valores absolutos e percentuais para cada macronutriente
    macronutrientData = await d3.csv('./dataset_files/Total_calorie_distribution_per_macronutrient.csv', d => ({
      country: d.Country,
      year: +d.Year,
      animalProtein: +d['Animal protein'],      
      vegetalProtein: +d['Vegetal protein'],    
      fat: +d.Fat,                              
      carbohydrates: +d.Carbohydrates,          
      totalCalories: +d['Total calories'],
      animalProteinPct: +d['Animal protein percentage'],
      vegetalProteinPct: +d['Vegetal protein percentage'],
      fatPct: +d['Fat percentage'],
      carbohydratesPct: +d['Carbohydrates percentage']
    }));

    // Inicializa a visualização após carregar todos os dados
    populateFilters();        // Popula dropdowns e listas de países
    setCurrentData();         // Filtra dados baseado nas seleções iniciais
    createChoropleth('.Map'); // Cria mapa coroplético
    createScatterplot('.ScatterPlot');      // Cria Scatterplot
    createDonutChart('.DonutChart');        // Cria Donut Plot
    createLineChart('.LineChart');          // Cria Line Chart
    createYearRangeSlider();  // Cria slider D3 de anos
    setupEventListeners();    // Configura event listeners

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Popula dropdowns e listas de filtros com dados únicos dos datasets
function populateFilters() {
  // Extrai países únicos de todos os datasets e ordena alfabeticamente
  const allCountries = [...new Set([
    ...caloriesGdpData.map(d => d.country),
    ...obesityData.map(d => d.country),
    ...macronutrientData.map(d => d.country)
  ])].sort();

  // Cria checkboxes para seleção de países
  populateCountryCheckboxes(allCountries);
}

// Países e ano selecionados por padrão ao carregar a aplicação
const defaultCountries = ['United States', 'Portugal', 'Spain', 'Brazil', 'Germany', 'France', 'Qatar', 'Mexico', 'Canada', 'Egypt'];
const defaultYear = '2022'; // Ano padrão inicial

// Cria checkboxes para seleção de países com funcionalidade de busca
function populateCountryCheckboxes(countries, preserveSelections = false) {
  const container = d3.select('#countryCheckboxes');

  // Armazena seleções atuais se preserveSelections = true (usado na busca)
  let currentSelections = [];
  if (preserveSelections) {
    currentSelections = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
      .map(checkbox => checkbox.value);
  }

  // Remove checkboxes anteriores
  container.selectAll('*').remove();

  // Cria containers para cada país
  const checkboxes = container.selectAll('.country-checkbox')
    .data(countries)
    .enter()
    .append('div')
    .attr('class', 'country-checkbox');

  // Adiciona checkbox para cada país
  checkboxes.append('input')
    .attr('type', 'checkbox')
    .attr('id', d => `country-${d.replace(/\s+/g, '-')}`) // Remove espaços do ID
    .attr('value', d => d)
    .property('checked', d => {
      if (preserveSelections) {
        return currentSelections.includes(d); // Mantém seleção anterior
      }
      return defaultCountries.includes(d); // Usa seleção padrão
    })
    .on('change', function() {
      // Verifica se um país foi desmarcado e remove da seleção do choropleth
      const countryName = this.value;
      const isChecked = this.checked;

      if (!isChecked && window.choroplethSelectedCountries) {
        // Remove o país da lista de seleção do choropleth se foi desmarcado
        window.choroplethSelectedCountries = window.choroplethSelectedCountries.filter(c => c !== countryName);
      }

      // Atualiza gráficos quando país é selecionado/desselecionado
      setCurrentData();
      createScatterplot();
      createDonutChart();
      createLineChart();
      // Atualiza visuais do mapa
      if (window.updateMapSelection) {
        window.updateMapSelection();
      }
    });

  // Adiciona label clicável para cada país
  checkboxes.append('label')
    .attr('for', d => `country-${d.replace(/\s+/g, '-')}`)
    .text(d => d);
}

// Define dados atuais baseado nos filtros selecionados
function setCurrentData() {
  const dataType = d3.select('#dataSelect').property('value');
  // Obtém ano atual do círculo do slider D3 ou usa padrão
  const currentYear = window.getCurrentYear ? window.getCurrentYear() : 2022;
  const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
    .map(checkbox => checkbox.value);

  let baseData;

  // Prepara dados baseado no tipo selecionado no dropdown
  switch(dataType) {
    case 'calories-gdp':
      // PIB per capita vs Calorias diárias
      baseData = caloriesGdpData.map(d => ({
        ...d,
        x: d.gdp,                           // Eixo X = PIB
        y: d.calories,                      // Eixo Y = Calorias
        xLabel: 'GDP per Capita ($)',
        yLabel: 'Daily Calories'
      }));
      break;
    case 'obesity-gdp':
      // Combina dados de obesidade com PIB
      baseData = [];
      obesityData.forEach(obesityRecord => {
        const gdpRecord = caloriesGdpData.find(gdp =>
          gdp.country === obesityRecord.country && gdp.year === obesityRecord.year
        );
        if (gdpRecord) {
          baseData.push({
            country: obesityRecord.country,
            year: obesityRecord.year,
            x: gdpRecord.gdp,               // Eixo X = PIB
            y: obesityRecord.obesity,       // Eixo Y = Taxa de obesidade
            xLabel: 'GDP per Capita ($)',
            yLabel: 'Obesity Rate (%)'
          });
        }
      });
      break;
    case 'calories-obesity':
      // Combina dados de calorias com obesidade
      baseData = [];
      caloriesGdpData.forEach(caloriesRecord => {
        const obesityRecord = obesityData.find(obesity =>
          obesity.country === caloriesRecord.country && obesity.year === caloriesRecord.year
        );
        if (obesityRecord) {
          baseData.push({
            country: caloriesRecord.country,
            year: caloriesRecord.year,
            x: caloriesRecord.calories,     // Eixo X = Calorias
            y: obesityRecord.obesity,       // Eixo Y = Taxa de obesidade
            xLabel: 'Daily Calories',
            yLabel: 'Obesity Rate (%)'
          });
        }
      });
      break;
  }

  // Aplica filtros de ano e países selecionados
  currentData = baseData.filter(d => {
    const yearMatch = d.year === currentYear;                              // Ano do círculo do slider
    const countryMatch = selectedCountries.length > 0 && selectedCountries.includes(d.country); // Países selecionados
    return yearMatch && countryMatch && !isNaN(d.x) && !isNaN(d.y);       // Remove dados inválidos
  });
}


function init() {
  loadData();
}

// Configura event listeners após carregamento dos dados
function setupEventListeners() {
  // Listener para mudança no tipo de dados do scatter plot
  d3.select('#dataSelect').on('change', function() {
    setCurrentData();        // Refiltra dados com novo tipo
    createScatterplot('.ScatterPlot');     // Redesenha scatter plot
  });

  // Listener para mudança no filtro do line chart
  d3.select('#filterSelect').on('change', function() {
    // Atualiza o slider para o novo filtro (restrições de ano)
    if (window.updateSliderForFilter) {
      window.updateSliderForFilter();
    }
    createChoropleth('.Map');          // Redesenha mapa com novo filtro
    createLineChart('.LineChart');     // Redesenha line chart com novo filtro
  });

  // Funcionalidade de busca de países
  d3.select('#countrySearch').on('input', function() {
    const searchTerm = this.value.toLowerCase();
    const allCountries = [...new Set([
      ...caloriesGdpData.map(d => d.country),
      ...obesityData.map(d => d.country),
      ...macronutrientData.map(d => d.country)
    ])].sort();

    // Filtra países que contêm o termo de busca
    const filteredCountries = allCountries.filter(country =>
      country.toLowerCase().includes(searchTerm)
    );

    // Reconstrói lista mantendo seleções atuais (preserveSelections = true)
    populateCountryCheckboxes(filteredCountries, true);
  });

  // Controles de seleção de países
  d3.select('#selectAllCountries').on('click', function() {
    // Seleciona todos os países visíveis
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', true);
    setCurrentData();
    createScatterplot('.ScatterPlot');
    createDonutChart('.DonutChart');
    createLineChart('.LineChart');
    // Atualiza visuais do mapa
    if (window.updateMapSelection) {
      window.updateMapSelection();
    }
  });

  d3.select('#clearAllCountries').on('click', function() {
    // Desseleciona todos os países
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', false);

    // Limpa também a seleção do choropleth
    if (window.choroplethSelectedCountries) {
      window.choroplethSelectedCountries = [];
    }

    setCurrentData();
    createScatterplot('.ScatterPlot');
    createDonutChart('.DonutChart');
    createLineChart('.LineChart');
    // Atualiza visuais do mapa
    if (window.updateMapSelection) {
      window.updateMapSelection();
    }
  });
}