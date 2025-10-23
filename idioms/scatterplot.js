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

function prepareScatterplotDataForBrushing() {
  const dataType = window.getSelectedDataType();
  const currentYear = window.getCurrentYear();

  // Usa getters pra aceder ao GlobalState
  const caloriesGdpData = window.getCaloriesGdpData();
  const obesityData = window.getObesityData();

  let baseData = [];

  // Prepara dados baseado no tipo selecionado no dropdown
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

  // Aplica filtros de ano mas INCLUI TODOS OS PAÍSES para brushing
  return baseData.filter(d =>
    d.year === currentYear &&
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
    .domain([0, d3.max(validData, d => d.y)])
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

          // Marca checkbox do país adicionado
          const countryCheckbox = d3.select(`#country-${countryName.replace(/\s+/g, '-')}`);
          if (!countryCheckbox.empty()) {
            countryCheckbox.property('checked', true);
          }
        } else {
          // Não permite selecionar mais de 5 países
          return;
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
      .tickValues([0, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000])
      .tickFormat(d => d < 1000 ? d.toString() : (d / 1000) + 'k') :
    d3.axisBottom(xScale).ticks(6);

  const yAxis = d3.axisLeft(yScale).ticks(6);

  svg.append('g')
    .attr('class', 'x-axis axis')
    .attr('transform', `translate(0,${config.height - config.margin.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('class', 'y-axis axis')
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

  // Add brush functionality
  const brush = d3.brush()
    .extent([[config.margin.left, config.margin.top], [config.width - config.margin.right, config.height - config.margin.bottom]])
    .on('start brush end', function(event) {
      const selection = event.selection;

      if (selection) {
        // Get brush coordinates
        const [[x0, y0], [x1, y1]] = selection;

        // Convert to data coordinates
        const xMin = xScale.invert(x0);
        const xMax = xScale.invert(x1);
        const yMin = yScale.invert(y1); // Note: y1 is top, y0 is bottom due to SVG coordinate system
        const yMax = yScale.invert(y0);

        // Get all data points (not just selected countries) for brushing
        const allData = prepareScatterplotDataForBrushing();

        // Find points within brush selection from all available data
        const brushedCountries = new Set();
        allData.forEach(d => {
          if (d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax) {
            brushedCountries.add(d.country);
          }
        });

        // Update point styling - only visible points can be styled
        svg.selectAll('.circle')
          .attr('opacity', d => {
            const isInBrush = d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax;
            return isInBrush ? 1 : 0.3;
          })
          .attr('stroke-width', d => {
            const isInBrush = d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax;
            return isInBrush ? 2 : 0;
          })
          .attr('stroke', d => {
            const isInBrush = d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax;
            return isInBrush ? '#ff6600' : 'none';
          });

      } else {
        // No selection - reset all points to normal styling
        svg.selectAll('.circle')
          .each(function(d) {
            const choroplethSelected = window.getChoroplethSelectedCountries();
            const isChoroplethSelected = choroplethSelected.includes(d.country);

            d3.select(this)
              .attr('opacity', isChoroplethSelected ? 1 : 0.8)
              .attr('stroke-width', isChoroplethSelected ? 2 : 0)
              .attr('stroke', isChoroplethSelected ? '#ff0000' : 'none');
          });
      }

    });

  // Add zoom functionality
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .extent([[config.margin.left, config.margin.top], [config.width - config.margin.right, config.height - config.margin.bottom]])
    .filter(function(event) {
      // Allow zoom only with wheel events or when shift key is pressed
      return event.type === 'wheel' || event.shiftKey;
    })
    .on('zoom', function(event) {
      const transform = event.transform;

      // Create new scales based on zoom transform with capping at 0
      let newXScale = transform.rescaleX(xScale);
      let newYScale = transform.rescaleY(yScale);

      // Cap domains at 0 (no negative values)
      const xDomain = newXScale.domain();
      const yDomain = newYScale.domain();

      if (xDomain[0] < 0) {
        const cappedXDomain = [0, xDomain[1]];
        newXScale = newXScale.copy().domain(cappedXDomain);
      }

      if (yDomain[0] < 0) {
        const cappedYDomain = [0, yDomain[1]];
        newYScale = newYScale.copy().domain(cappedYDomain);
      }

      // Update axes with new scales
      const newXAxis = isGdpOnX ?
        d3.axisBottom(newXScale)
          .tickValues([250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000].filter(d => {
            const domain = newXScale.domain();
            return d >= domain[0] && d <= domain[1];
          }))
          .tickFormat(d => d < 1000 ? d.toString() : (d / 1000) + 'k') :
        d3.axisBottom(newXScale).ticks(6);

      const newYAxis = d3.axisLeft(newYScale).ticks(6);

      svg.select('.x-axis').call(newXAxis);
      svg.select('.y-axis').call(newYAxis);

      // Get current visible domains
      const visibleXDomain = newXScale.domain();
      const visibleYDomain = newYScale.domain();

      // Update circle positions and visibility
      svg.selectAll('.circle')
        .attr('cx', d => newXScale(d.x))
        .attr('cy', d => newYScale(d.y))
        .style('display', d => {
          // Hide points that are outside the current zoom domain
          const isVisible = d.x >= visibleXDomain[0] && d.x <= visibleXDomain[1] &&
                           d.y >= visibleYDomain[0] && d.y <= visibleYDomain[1];
          return isVisible ? 'block' : 'none';
        });

      // Update regression line if it exists
      const regressionLine = svg.select('.regression-line');
      if (!regressionLine.empty()) {
        // Filter regression line data to only include visible points
        const visibleData = scatterplotData.filter(d =>
          d.x >= visibleXDomain[0] && d.x <= visibleXDomain[1] &&
          d.y >= visibleYDomain[0] && d.y <= visibleYDomain[1]
        );

        if (visibleData.length >= 2) {
          const visibleRegression = calculateLinearRegression(visibleData);
          if (visibleRegression) {
            const xMin = Math.max(d3.min(visibleData, d => d.x), visibleXDomain[0]);
            const xMax = Math.min(d3.max(visibleData, d => d.x), visibleXDomain[1]);
            const lineData = [
              { x: xMin, y: visibleRegression.slope * xMin + visibleRegression.intercept },
              { x: xMax, y: visibleRegression.slope * xMax + visibleRegression.intercept }
            ];

            regressionLine.attr('d', d3.line()
              .x(d => newXScale(d.x))
              .y(d => newYScale(d.y))(lineData));

            // Update R² display
            svg.select('.regression-info')
              .text(`R² = ${visibleRegression.rSquared.toFixed(3)}`);
          }
        } else {
          regressionLine.style('display', 'none');
          svg.select('.regression-info').style('display', 'none');
        }
      }

      // Update brush extent to match zoom
      brushGroup.call(brush.move, null);
    });

  // Apply zoom to the entire SVG
  svg.call(zoom);

  // Add brush to SVG (after zoom so brush can override zoom events)
  const brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);
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