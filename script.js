// Global variables
let caloriesGdpData = [];
let obesityData = [];
let macronutrientData = [];
let currentData = [];
let scatterplot;

// Chart configuration Removi resizing
function getChartConfig() {
  return {
    width: 500,
    height: 250,
    margin: { top: 20, right: 40, bottom: 40, left: 50 }
  };
}

// Load all datasets
async function loadData() {
  try {
    // Load GDP per capita vs calories data
    caloriesGdpData = await d3.csv('./dataset_files/Daily_calories_X_GDP_per_capita.csv', d => ({
      country: d.Country,
      year: +d.Year,
      calories: +d['Total Daily Calories'],
      gdp: +d['GDP per capita']
    }));

    // Load obesity data
    obesityData = await d3.csv('./dataset_files/Obesity_rate_per_year.csv', d => ({
      country: d.Country,
      year: +d.Year,
      obesity: +d['Obesity Percentage']
    }));

    // Load macronutrient data
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

    // Initialize the visualization
    populateFilters();
    initializeDefaults();
    setCurrentData();
    createScatterplot();
    createDonutChart();
    createYearRangeSlider();

  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Populate filter dropdowns
function populateFilters() {
  // Get unique years
  const allYears = [...new Set([
    ...caloriesGdpData.map(d => d.year),
    ...obesityData.map(d => d.year),
    ...macronutrientData.map(d => d.year)
  ])].sort();

  const yearSelect = d3.select('#yearSelect');
  yearSelect.selectAll('option:not([value="all"])').remove();
  yearSelect.selectAll('.year-option')
    .data(allYears)
    .enter()
    .append('option')
    .attr('class', 'year-option')
    .attr('value', d => d)
    .text(d => d);

  // Get unique countries
  const allCountries = [...new Set([
    ...caloriesGdpData.map(d => d.country),
    ...obesityData.map(d => d.country),
    ...macronutrientData.map(d => d.country)
  ])].sort();

  // Populate country checkboxes
  populateCountryCheckboxes(allCountries);
}

// Initialize default selections
function initializeDefaults() {
  // Set default year for slider
  d3.select('#yearSlider').property('value', defaultYear);
  d3.select('#yearValue').text(defaultYear);
}

// Default selected countries and year
const defaultCountries = ['United States', 'Portugal', 'Spain', 'Brazil', 'Germany', 'France', 'Qatar', 'Mexico', 'Canada', 'Egypt'];
const defaultYear = '2022';

// Populate country checkboxes with search functionality
function populateCountryCheckboxes(countries, preserveSelections = false) {
  const container = d3.select('#countryCheckboxes');

  // Store current selections if preserving
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
      return defaultCountries.includes(d);
    })
    .on('change', function() {
      setCurrentData();
      createScatterplot();
      createDonutChart();
    });

  checkboxes.append('label')
    .attr('for', d => `country-${d.replace(/\s+/g, '-')}`)
    .text(d => d);
}

// Set current data based on selected filters
function setCurrentData() {
  const dataType = d3.select('#dataSelect').property('value');
  // Get current year from D3 slider circle or fall back to default
  const currentYear = window.getCurrentYear ? window.getCurrentYear() : 2022;
  const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
    .map(checkbox => checkbox.value);

  let baseData;

  switch(dataType) {
    case 'calories-gdp':
      baseData = caloriesGdpData.map(d => ({
        ...d,
        x: d.gdp,
        y: d.calories,
        xLabel: 'GDP per Capita ($)',
        yLabel: 'Daily Calories'
      }));
      break;
    case 'obesity-gdp':
      // Merge obesity and GDP data
      baseData = [];
      obesityData.forEach(obesityRecord => {
        const gdpRecord = caloriesGdpData.find(gdp =>
          gdp.country === obesityRecord.country && gdp.year === obesityRecord.year
        );
        if (gdpRecord) {
          baseData.push({
            country: obesityRecord.country,
            year: obesityRecord.year,
            x: gdpRecord.gdp,
            y: obesityRecord.obesity,
            xLabel: 'GDP per Capita ($)',
            yLabel: 'Obesity Rate (%)'
          });
        }
      });
      break;
    case 'calories-obesity':
      // Merge calories and obesity data
      baseData = [];
      caloriesGdpData.forEach(caloriesRecord => {
        const obesityRecord = obesityData.find(obesity =>
          obesity.country === caloriesRecord.country && obesity.year === caloriesRecord.year
        );
        if (obesityRecord) {
          baseData.push({
            country: caloriesRecord.country,
            year: caloriesRecord.year,
            x: caloriesRecord.calories,
            y: obesityRecord.obesity,
            xLabel: 'Daily Calories',
            yLabel: 'Obesity Rate (%)'
          });
        }
      });
      break;
  }

  // Apply filters
  currentData = baseData.filter(d => {
    const yearMatch = d.year === currentYear;
    const countryMatch = selectedCountries.length > 0 && selectedCountries.includes(d.country);
    return yearMatch && countryMatch && !isNaN(d.x) && !isNaN(d.y);
  });
}


// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners for filters
  d3.select('#dataSelect').on('change', function() {
    setCurrentData();
    createScatterplot();
  });

  // Note: Year slider functionality is now handled by the D3 range slider component

  // Country search functionality
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

  // Country selection controls
  d3.select('#selectAllCountries').on('click', function() {
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', true);
    setCurrentData();
    createScatterplot();
    createDonutChart();
  });

  d3.select('#clearAllCountries').on('click', function() {
    d3.selectAll('#countryCheckboxes input[type="checkbox"]')
      .property('checked', false);
    setCurrentData();
    createScatterplot();
    createDonutChart();
  });

  // Load data and initialize
  loadData();

});