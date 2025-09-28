// Global variables
let caloriesGdpData = [];
let obesityData = [];
let macronutrientData = [];
let currentData = [];
let scatterplot;

// Chart configuration
const config = {
  width: 800,
  height: 600,
  margin: { top: 50, right: 80, bottom: 80, left: 80 }
};

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
    setCurrentData();
    createScatterplot();

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

  const countrySelect = d3.select('#countrySelect');
  countrySelect.selectAll('option:not([value="all"])').remove();
  countrySelect.selectAll('.country-option')
    .data(allCountries)
    .enter()
    .append('option')
    .attr('class', 'country-option')
    .attr('value', d => d)
    .text(d => d);
}

// Set current data based on selected filters
function setCurrentData() {
  const dataType = d3.select('#dataSelect').property('value');
  const selectedYear = d3.select('#yearSelect').property('value');
  const selectedCountry = d3.select('#countrySelect').property('value');

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
    const yearMatch = selectedYear === 'all' || d.year === +selectedYear;
    const countryMatch = selectedCountry === 'all' || d.country === selectedCountry;
    return yearMatch && countryMatch && !isNaN(d.x) && !isNaN(d.y);
  });
}

// Create scatter plot
function createScatterplot() {
  // Clear previous chart
  d3.select('#scatterplot').selectAll('*').remove();

  if (currentData.length === 0) {
    d3.select('#scatterplot')
      .append('div')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('No data available for the selected filters');
    return;
  }

  // Create SVG
  const svg = d3.select('#scatterplot')
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height);

  // Create scales
  const xScale = d3.scaleLinear()
    .domain(d3.extent(currentData, d => d.x))
    .nice()
    .range([config.margin.left, config.width - config.margin.right]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(currentData, d => d.y))
    .nice()
    .range([config.height - config.margin.bottom, config.margin.top]);

  // Color scale by country
  const uniqueCountries = [...new Set(currentData.map(d => d.country))];
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(uniqueCountries);

  // Create tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  // Draw circles
  svg.selectAll('.circle')
    .data(currentData)
    .enter()
    .append('circle')
    .attr('class', 'circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .attr('fill', d => colorScale(d.country))
    .on('mouseover', function(event, d) {
      d3.select(this).attr('r', 7);
      tooltip
        .style('opacity', 1)
        .html(`
          <strong>${d.country}</strong><br/>
          Year: ${d.year}<br/>
          ${d.xLabel}: ${d.x.toLocaleString()}<br/>
          ${d.yLabel}: ${d.y.toFixed(2)}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this).attr('r', 5);
      tooltip.style('opacity', 0);
    });

  // Add regression line
  const regression = calculateLinearRegression(currentData);
  if (regression) {
    const lineData = [
      { x: d3.min(currentData, d => d.x), y: regression.slope * d3.min(currentData, d => d.x) + regression.intercept },
      { x: d3.max(currentData, d => d.x), y: regression.slope * d3.max(currentData, d => d.x) + regression.intercept }
    ];

    svg.append('path')
      .datum(lineData)
      .attr('class', 'regression-line')
      .attr('d', d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
      );

    // Add regression equation
    svg.append('text')
      .attr('class', 'regression-info')
      .attr('x', config.width - config.margin.right - 10)
      .attr('y', config.margin.top + 20)
      .attr('text-anchor', 'end')
      .text(`R² = ${regression.rSquared.toFixed(3)}`);
  }

  // Add axes
  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${config.height - config.margin.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${config.margin.left},0)`)
    .call(d3.axisLeft(yScale));

  // Add axis labels
  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', config.width / 2)
    .attr('y', config.height - 20)
    .attr('text-anchor', 'middle')
    .text(currentData[0]?.xLabel || 'X Axis');

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -config.height / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .text(currentData[0]?.yLabel || 'Y Axis');
}

// Calculate linear regression
function calculateLinearRegression(data) {
  if (data.length < 2) return null;

  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const n = data.length;

  const xMean = d3.mean(xValues);
  const yMean = d3.mean(yValues);

  let numerator = 0;
  let denominator = 0;
  let totalSumSquares = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
    totalSumSquares += (yValues[i] - yMean) ** 2;
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let residualSumSquares = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    residualSumSquares += (yValues[i] - predicted) ** 2;
  }
  const rSquared = 1 - (residualSumSquares / totalSumSquares);

  return { slope, intercept, rSquared };
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Add event listeners for filters
  d3.select('#dataSelect').on('change', function() {
    setCurrentData();
    createScatterplot();
  });

  d3.select('#yearSelect').on('change', function() {
    setCurrentData();
    createScatterplot();
  });

  d3.select('#countrySelect').on('change', function() {
    setCurrentData();
    createScatterplot();
  });

  // Load data and initialize
  loadData();
});