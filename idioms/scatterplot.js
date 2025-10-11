// Função para preparar dados do scatterplot baseado no tipo selecionado
function prepareScatterplotData() {
  const dataType = window.getSelectedDataType ? window.getSelectedDataType() : 'calories-gdp';
  const currentYear = window.getCurrentYear ? window.getCurrentYear() : 2022;
  const selectedCountries = window.getSelectedCountries ? window.getSelectedCountries() : [];

  // Obtém dados usando getters
  const caloriesGdpData = window.getCaloriesGdpData ? window.getCaloriesGdpData() : [];
  const obesityData = window.getObesityData ? window.getObesityData() : [];
  const macronutrientData = window.getMacronutrientData ? window.getMacronutrientData() : [];

  let baseData = [];

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
  return baseData.filter(d => {
    const yearMatch = d.year === currentYear;                              // Ano do círculo do slider
    const countryMatch = selectedCountries.length > 0 && selectedCountries.includes(d.country); // Países selecionados
    return yearMatch && countryMatch && !isNaN(d.x) && !isNaN(d.y);       // Remove dados inválidos
  });
}

function createScatterplot(selector = '#scatterplot') {
  // Limpa o gráfico anterior para evitar sobreposições
  const container = selector.startsWith('.') ? d3.select(selector).select('#scatterplot') : d3.select(selector);
  container.selectAll('*').remove();

  // Prepara dados para o scatterplot
  const scatterplotData = prepareScatterplotData();

  // Verifica se há dados para mostrar com os filtros atuais
  if (scatterplotData.length === 0) {
    container
      .append('div')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('No data available for the selected filters');
    return;
  }

  // Obtém configurações de dimensões fixas do gráfico
  const config = getChartConfig();

  // Cria elemento SVG principal
  const svg = container
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height)
    .style('margin-down', '5px')
    .style('margin-left', '40px');

  // Cria escalas - limita escala do PIB para máximo $160,000
  const isGdpOnX = scatterplotData[0]?.xLabel?.includes('GDP');
  const xDomain = isGdpOnX ?
    [0, Math.min(160000, d3.max(scatterplotData, d => d.x))] : // Alterar 160000 para mudar limite máximo
    d3.extent(scatterplotData, d => d.x);

  // Escala X: mapeia valores dos dados para posições horizontais
  const xScale = d3.scaleLinear()
    .domain(xDomain) // Intervalo dos dados
    .nice() // Arredonda os valores para números "limpos"
    .range([config.margin.left, config.width - config.margin.right]); // Posições em pixels

  // Escala Y: mapeia valores dos dados para posições verticais
  const yScale = d3.scaleLinear()
    .domain(d3.extent(scatterplotData, d => d.y)) // Min/max dos dados Y
    .nice()
    .range([config.height - config.margin.bottom, config.margin.top]); // Invertido (topo = menor valor)

  const pointColor = 'steelblue';

  // Cria tooltip para mostrar informações ao passar o mouse
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  // Desenha círculos para cada ponto de dados com destaque para países selecionados no choropleth
  svg.selectAll('.circle')
    .data(scatterplotData)
    .enter()
    .append('circle')
    .attr('class', 'circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', d => {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      return isChoroplethSelected ? 7 : 5;
    })
    .attr('fill', d => {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      return isChoroplethSelected ? '#ff4444' : pointColor;
    })
    .attr('stroke', d => {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      return isChoroplethSelected ? '#000' : 'none';
    })
    .attr('stroke-width', d => {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      return isChoroplethSelected ? 2 : 0;
    })
    .style('opacity', d => {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      return isChoroplethSelected ? 1 : 0.8;
    })
    .on('mouseover', function(event, d) {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      d3.select(this).attr('r', isChoroplethSelected ? 9 : 7);
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
    .on('mouseout', function(event, d) {
      const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      d3.select(this).attr('r', isChoroplethSelected ? 7 : 5);
      tooltip.style('opacity', 0);
    });

  // Add regression line
  const regression = calculateLinearRegression(scatterplotData);
  if (regression) {
    const lineData = [
      { x: d3.min(scatterplotData, d => d.x), y: regression.slope * d3.min(scatterplotData, d => d.x) + regression.intercept },
      { x: d3.max(scatterplotData, d => d.x), y: regression.slope * d3.max(scatterplotData, d => d.x) + regression.intercept }
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

  // Create custom tick values and formatters
  const isGdpOnXAxis = scatterplotData[0]?.xLabel?.includes('GDP');

  // X-axis with custom ticks
  let xAxis;
  if (isGdpOnXAxis) {
    const xTickValues = [0, 20000, 40000, 60000, 80000, 100000, 120000, 140000, 160000];
    xAxis = d3.axisBottom(xScale)
      .tickValues(xTickValues)
      .tickFormat(d => d / 1000);
  } else {
    xAxis = d3.axisBottom(xScale).ticks(8);
  }

  // Y-axis with custom ticks
  const yTickValues = d3.range(d3.min(scatterplotData, d => d.y), d3.max(scatterplotData, d => d.y) + 1,
    (d3.max(scatterplotData, d => d.y) - d3.min(scatterplotData, d => d.y)) / 6);
  const yAxis = d3.axisLeft(yScale).tickValues(yTickValues);

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${config.height - config.margin.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${config.margin.left},0)`)
    .call(yAxis);

  // Add axis labels with thousands notation
  let xLabel = scatterplotData[0]?.xLabel;
  if (isGdpOnXAxis) {
    xLabel = xLabel.replace('($)', '(thousands $)');
  }

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', config.width / 2 )
    .attr('y', config.height - 5)
    .attr('text-anchor', 'middle')
    .text(xLabel);

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -config.height / 2)
    .attr('y', 12)
    .attr('text-anchor', 'middle')
    .text(scatterplotData[0]?.yLabel || 'Y Axis');
}

function calculateLinearRegression(data) {
  if (data.length < 2) return null;

  // Extrai valores X e Y dos dados
  const xValues = data.map(d => d.x);
  const yValues = data.map(d => d.y);
  const n = data.length;

  // Calcula médias dos valores X e Y
  const xMean = d3.mean(xValues);
  const yMean = d3.mean(yValues);

  // Variáveis para cálculo da regressão linear
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

  let residualSumSquares = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    residualSumSquares += (yValues[i] - predicted) ** 2;
  }
  const rSquared = 1 - (residualSumSquares / totalSumSquares);

  return { slope, intercept, rSquared };
}