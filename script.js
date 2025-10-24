let caloriesGdpData = [];
let obesityData = [];
let macronutrientData = [];

// Informação geral da vis
let globalState = {
  selectedCountries: [],
  currentYear: 2022,
  yearRange: { start: 1961, end: 2022 },
  selectedFilter: 'total-calories',
  selectedDataType: 'calories-gdp',
  choroplethSelectedCountries: [],
  countryColorMap: new Map() // Maps country name to assigned random color
};

// Tamanho geral da vis
function getChartConfig() {
  return {
    width: 500,
    height: 250,
    margin: { top: 20, right: 40, bottom: 40, left: 57 }
  };
}

// Cores para destacar países selecionados
function getCountryHighlightColors() {
  return ['#e41a1c', '#e3e300ff', '#4daf4a', '#e7298a', '#ff7f00'];
}

// Função para obter cor de um país selecionado
function getCountryColor(country) {
  return globalState.countryColorMap.get(country) || '#ff0000'; // fallback to red if not found
}

// Função para atribuir cor aleatória a um país quando selecionado
function assignRandomCountryColor(country) {
  if (!globalState.countryColorMap.has(country)) {
    const colors = getCountryHighlightColors();
    const usedColors = new Set(globalState.countryColorMap.values());
    const availableColors = colors.filter(color => !usedColors.has(color));

    // If all colors are used, fall back to any color
    const colorPool = availableColors.length > 0 ? availableColors : colors;
    const randomColor = colorPool[Math.floor(Math.random() * colorPool.length)];
    globalState.countryColorMap.set(country, randomColor);
  }
}

// Função para remover cor de um país quando desselecionado
function removeCountryColor(country) {
  globalState.countryColorMap.delete(country);
}

// Carregar dados dos csvs e criar o primeiro estado da vis
async function loadData() {
  try {
    caloriesGdpData = await d3.csv('./dataset_files/Daily_calories_X_GDP_per_capita.csv', d => ({
      country: d.Country,
      year: +d.Year,
      calories: +d['Total Daily Calories'],
      gdp: +d['GDP per capita']
    }));

    obesityData = await d3.csv('./dataset_files/Obesity_rate_per_year.csv', d => ({
      country: d.Country,
      year: +d.Year,
      obesity: +d['Obesity Percentage']
    }));

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

    populateFilters();
    setInitialData();
    createChoropleth('.Map');
    createScatterplot('.ScatterPlot');
    createDonutChart('.DonutChart');
    createLineChart('.LineChart');
    createYearRangeSlider();
    setupEventListeners();

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Seleciona os paises pra checkbox 
function populateFilters() {
  const allCountries = [...new Set([
    ...caloriesGdpData.map(d => d.country),
    ...obesityData.map(d => d.country),
    ...macronutrientData.map(d => d.country)
  ])].sort();

  populateCountryCheckboxes(allCountries);
}

// Actually cria a caixa dos paises
function populateCountryCheckboxes(countries, preserveSelections = false) {
  const container = d3.select('#countryCheckboxes');

  let currentSelections = [];
  if (preserveSelections) {
    currentSelections = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
      .map(checkbox => checkbox.value);
  }

  container.selectAll('*').remove();

  const checkboxes = container.selectAll('.country-checkbox')
    .data(countries)
    .enter()
    .append('div')
    .attr('class', 'country-checkbox');

  checkboxes.append('input')
    .attr('type', 'checkbox')
    .attr('id', d => `country-${d.replace(/\s+/g, '-')}`)
    .attr('value', d => d)
    .property('checked', d => {
      if (preserveSelections) {
        return currentSelections.includes(d);
      }
      return true;
    })
    .on('change', function() {
      const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
        .map(checkbox => checkbox.value);

      // Update choropleth selection to match checkbox selection
      const currentChoroplethSelection = globalState.choroplethSelectedCountries;
      const newChoroplethSelection = currentChoroplethSelection.filter(country => selectedCountries.includes(country));

      // Remove colors for countries that are being deselected
      const deselectedCountries = globalState.selectedCountries.filter(country => !selectedCountries.includes(country));
      deselectedCountries.forEach(country => {
        window.removeCountryColor(country);
      });

      // Assign colors for newly selected countries
      const newlySelectedCountries = selectedCountries.filter(country => !globalState.selectedCountries.includes(country));
      newlySelectedCountries.forEach(country => {
        window.assignRandomCountryColor(country);
      });

      updateGlobalState({
        selectedCountries: selectedCountries,
        choroplethSelectedCountries: newChoroplethSelection
      });
    });

  checkboxes.append('label')
    .attr('for', d => `country-${d.replace(/\s+/g, '-')}`)
    .text(d => d);
}

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

// Updates pode ser qualquer atualização de um atributo do globalState
function updateGlobalState(updates) {
  Object.assign(globalState, updates);
  updateAllIdioms();
}

// Faz com que essa função esteja disponível globalmente
window.updateGlobalState = updateGlobalState;

function updateAllIdioms() {
  createChoropleth('.Map');
  createScatterplot('.ScatterPlot');
  createDonutChart('.DonutChart');
  createLineChart('.LineChart');
}

function setInitialData() {
  // Define países iniciais para o choropleth
  const initialChoroplethCountries = ['Canada', 'Brazil', 'India', 'China', 'Australia'];
  globalState.choroplethSelectedCountries = initialChoroplethCountries;

  // Assign colors in order to initial countries
  const colors = getCountryHighlightColors();
  initialChoroplethCountries.forEach((country, index) => {
    globalState.countryColorMap.set(country, colors[index]);
  });

  // Pre-seleciona os checkboxes dos países iniciais
  initialChoroplethCountries.forEach(country => {
    const checkbox = d3.select(`#country-${country.replace(/\s+/g, '-')}`);
    if (!checkbox.empty()) {
      checkbox.property('checked', true);
    }
  });

  globalState.selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
    .map(checkbox => checkbox.value);

  globalState.selectedFilter = d3.select('#filterSelect').property('value') || 'total-calories';
  globalState.selectedDataType = d3.select('#dataSelect').property('value') || 'calories-gdp';

  // Essas verificações precisam existir pq inicialmente essas funções não existem (são criadas no rangeslider.js)
  if (typeof window.getRangeSliderCurrentYear === 'function') {
    globalState.currentYear = window.getRangeSliderCurrentYear();
  }
  if (typeof window.getRangeSliderYearRange === 'function') {
    globalState.yearRange = window.getRangeSliderYearRange();
  }

}


function init() {
  loadData();
}

function setupEventListeners() {
  // Atualiza quando alguém troca o filtro do scatterplot 
  d3.select('#dataSelect').on('change', function() {
    const selectedDataType = this.value;
    updateGlobalState({ selectedDataType: selectedDataType });
  });

  // Atualiza quando alguém troca o filtro das calorias 
  d3.select('#filterSelect').on('change', function() {
    const selectedFilter = this.value;

    if (window.updateSliderForFilter) {
      window.updateSliderForFilter();
    }

    updateGlobalState({ selectedFilter: selectedFilter });
  });

  // Atualiza quando alguém restringe os paises pela pesquisa
  d3.select('#countrySearch').on('input', function() {
    const searchTerm = this.value.toLowerCase();
    const allCountries = [...new Set([
      ...caloriesGdpData.map(d => d.country),
      ...obesityData.map(d => d.country),
      ...macronutrientData.map(d => d.country)
    ])].sort();

    const filteredCountries = allCountries.filter(country =>
      country.toLowerCase().includes(searchTerm)
    );

    populateCountryCheckboxes(filteredCountries, true);
  });

    // Atualiza quando alguém escolhe todos na checkbox
  d3.select('#selectAllCountries').on('click', function() {
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', true);

    const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
      .map(checkbox => checkbox.value);

    updateGlobalState({ selectedCountries: selectedCountries });
  });

    // Atualiza quando alguém da unselect de todos na checkbox
  d3.select('#clearAllCountries').on('click', function() {
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', false);

    // Clear all country color assignments
    globalState.countryColorMap.clear();

    updateGlobalState({
      selectedCountries: [],
      choroplethSelectedCountries: []
    });
  });
}window.getCountryColor = getCountryColor;
window.assignRandomCountryColor = assignRandomCountryColor;
window.removeCountryColor = removeCountryColor;