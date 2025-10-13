function prepareScatterplotData() {
  const dataType = window.getSelectedDataType();
  const currentYear = window.getCurrentYear();
  const selectedCountries = window.getSelectedCountries();

  // Usa getters pra aceder ao GlobalState
  const caloriesGdpData = window.getCaloriesGdpData();
  const obesityData = window.getObesityData();

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
  return baseData.filter(d =>
    d.year === currentYear &&
    selectedCountries.length > 0 &&
    selectedCountries.includes(d.country) &&
    !isNaN(d.x) && !isNaN(d.y)
  );
}

function createScatterplot(selector = '#scatterplot') {
  const container = selector.startsWith('.') ? d3.select(selector).select('#scatterplot') : d3.select(selector);
  container.selectAll('*').remove();

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

  const svg = container
    .append('svg')
    .attr('width', config.width)
    .attr('height', config.height)
    .style('margin-down', '5px')
    .style('margin-left', '40px');

  // limita escala do PIB para máximo $140,000
  const isGdpOnX = scatterplotData[0]?.xLabel?.includes('GDP');

  const validData = scatterplotData.filter(d => {
    if (isGdpOnX) {
      return d.x >= 250 && d.x <= 140000 && d.y > 0;
    }
    return d.x >= 0 && d.y > 0;
  });

  const xScale = isGdpOnX ?
    d3.scaleLog()
      .domain([250, 140000])
      .range([config.margin.left, config.width - config.margin.right]) :
    d3.scaleLinear()
      .domain(d3.extent(validData, d => d.x))
      .nice()
      .range([config.margin.left, config.width - config.margin.right]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(validData, d => d.y))
    .nice()
    .range([config.height - config.margin.bottom, config.margin.top]);

  const pointColor = 'steelblue';

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
    .each(function(d) {
      const choroplethSelected = window.getChoroplethSelectedCountries();
      const isChoroplethSelected = choroplethSelected.includes(d.country);

      d3.select(this)
        .attr('r', isChoroplethSelected ? 7 : 5)
        .attr('fill', isChoroplethSelected ? '#ff4444' : pointColor)
        .attr('stroke', isChoroplethSelected ? '#ff0000' : 'none')
        .attr('stroke-width', isChoroplethSelected ? 2 : 0)
        .style('opacity', isChoroplethSelected ? 1 : 0.8);
    })
    .on('mouseover', function(event, d) {
      const choroplethSelected = window.getChoroplethSelectedCountries();
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
      const choroplethSelected = window.getChoroplethSelectedCountries();
      const isChoroplethSelected = choroplethSelected.includes(d.country);
      d3.select(this).attr('r', isChoroplethSelected ? 7 : 5);
      tooltip.style('opacity', 0);
    })
    .on('click', function(event, d) {
      tooltip.style('opacity', 0);

      const countryName = d.country;
      const currentChoroplethSelection = window.getChoroplethSelectedCountries();
      const isCurrentlySelected = currentChoroplethSelection.includes(countryName);

      let newChoroplethSelection;
      if (isCurrentlySelected) {
        // Remove da seleção
        newChoroplethSelection = currentChoroplethSelection.filter(c => c !== countryName);
      } else {
        // Adiciona à seleção no mac 5
        if (currentChoroplethSelection.length < 5) {
          newChoroplethSelection = [...currentChoroplethSelection, countryName];
        } else {
          // Remove o primeiro e adiciona o novo 
          newChoroplethSelection = [...currentChoroplethSelection.slice(1), countryName];
        }

        // Marca checkbox do país adicionado 
        const countryCheckbox = d3.select(`#country-${countryName.replace(/\s+/g, '-')}`);
        if (!countryCheckbox.empty()) {
          countryCheckbox.property('checked', true);
        }
      }

      // Atualiza estado global com nova escolha
      const selectedCountries = Array.from(d3.selectAll('#countryCheckboxes input[type="checkbox"]:checked').nodes())
        .map(checkbox => checkbox.value);
      window.updateGlobalState({
        choroplethSelectedCountries: newChoroplethSelection,
        selectedCountries: selectedCountries
      });
    });

  const regression = calculateLinearRegression(validData);
  if (regression) {
    const xMin = d3.min(validData, d => d.x);
    const xMax = d3.max(validData, d => d.x);
    const lineData = [
      { x: xMin, y: regression.slope * xMin + regression.intercept },
      { x: xMax, y: regression.slope * xMax + regression.intercept }
    ];

    svg.append('path')
      .datum(lineData)
      .attr('class', 'regression-line')
      .attr('d', d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
      );

    svg.append('text')
      .attr('class', 'regression-info')
      .attr('x', config.width - 10)
      .attr('y', 15)
      .attr('text-anchor', 'end')
      .text(`R² = ${regression.rSquared.toFixed(3)}`);
  }

  const xAxis = isGdpOnX ?
    d3.axisBottom(xScale)
      .tickValues([250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000])
      .tickFormat(d => d < 1000 ? d.toString() : (d / 1000) + 'k') :
    d3.axisBottom(xScale).ticks(6);

  const yAxis = d3.axisLeft(yScale).ticks(6);

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${config.height - config.margin.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(${config.margin.left},0)`)
    .call(yAxis);

  let xLabel = scatterplotData[0]?.xLabel;
  if (isGdpOnX) {
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