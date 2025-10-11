let caloriesGdpData = [];
let obesityData = [];
let macronutrientData = [];
let currentData = [];        // Dados atualmente filtrados para os gráficos
let scatterplot;

// Estado global centralizado
let globalState = {
  selectedCountries: [],
  currentYear: 2022,
  yearRange: { start: 1961, end: 2022 },
  selectedFilter: 'total-calories',
  selectedDataType: 'calories-gdp',
  choroplethSelectedCountries: []
};

// Configuração das dimensões da vis
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
    createChoropleth('.Map'); // Cria mapa
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

      // Atualiza estado global quando país é selecionado/desselecionado
      const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
        .map(checkbox => checkbox.value);

      updateGlobalState({ selectedCountries: selectedCountries });
    });

  // Adiciona label clicável para cada país
  checkboxes.append('label')
    .attr('for', d => `country-${d.replace(/\s+/g, '-')}`)
    .text(d => d);
}

// Funções getter para acesso ao estado global
window.getGlobalState = function() {
  return globalState;
};

window.getSelectedCountries = function() {
  return globalState.selectedCountries;
};

window.getCurrentYear = function() {
  return globalState.currentYear;
};

window.getSelectedYearRange = function() {
  return globalState.yearRange;
};

window.getSelectedFilter = function() {
  return globalState.selectedFilter;
};

window.getSelectedDataType = function() {
  return globalState.selectedDataType;
};

window.getChoroplethSelectedCountries = function() {
  return globalState.choroplethSelectedCountries;
};

window.getCaloriesGdpData = function() {
  return caloriesGdpData;
};

window.getObesityData = function() {
  return obesityData;
};

window.getMacronutrientData = function() {
  return macronutrientData;
};

// Função para atualizar estado e disparar atualizações nos idiomas
function updateGlobalState(updates) {
  Object.assign(globalState, updates);
  updateAllIdioms();
}

// Exporta função para uso externo
window.updateGlobalState = updateGlobalState;

// Função para atualizar todos os idiomas
function updateAllIdioms() {
  createChoropleth('.Map');
  createScatterplot('.ScatterPlot');
  createDonutChart('.DonutChart');
  createLineChart('.LineChart');

  // Atualiza visuais do mapa se função existir
  if (window.updateMapSelection) {
    window.updateMapSelection();
  }
}

// Define dados atuais baseado nos filtros selecionados
function setCurrentData() {
  // Atualiza estado global baseado nos controles da UI
  globalState.selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
    .map(checkbox => checkbox.value);

  globalState.selectedFilter = d3.select('#filterSelect').property('value') || 'total-calories';
  globalState.selectedDataType = d3.select('#dataSelect').property('value') || 'calories-gdp';

  // Obtém informações de ano do slider usando as funções exportadas do rangeslider
  if (typeof window.getRangeSliderCurrentYear === 'function') {
    globalState.currentYear = window.getRangeSliderCurrentYear();
  }
  if (typeof window.getRangeSliderYearRange === 'function') {
    globalState.yearRange = window.getRangeSliderYearRange();
  }

  currentData = [];
}


function init() {
  loadData();
}

// Configura event listeners após carregamento dos dados
function setupEventListeners() {
  // Listener para mudança no tipo de dados do scatter plot
  d3.select('#dataSelect').on('change', function() {
    const selectedDataType = this.value;
    updateGlobalState({ selectedDataType: selectedDataType });
  });

  // Listener para mudança no filtro do line chart
  d3.select('#filterSelect').on('change', function() {
    const selectedFilter = this.value;

    // Atualiza o slider para o novo filtro (restrições de ano)
    if (window.updateSliderForFilter) {
      window.updateSliderForFilter();
    }

    updateGlobalState({ selectedFilter: selectedFilter });
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

    const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
      .map(checkbox => checkbox.value);

    updateGlobalState({ selectedCountries: selectedCountries });
  });

  d3.select('#clearAllCountries').on('click', function() {
    // Desseleciona todos os países
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', false);

    updateGlobalState({
      selectedCountries: [],
      choroplethSelectedCountries: []
    });
  });
}