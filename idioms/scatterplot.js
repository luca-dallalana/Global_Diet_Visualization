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

  // Ensure the container can position absolutely-placed controls
  container.style('position', 'relative');

  // Create a compact top-right brush toggle button showing only a brush emoji. Default: enabled.
  const brushButton = container.append('button')
    .attr('class', 'brush-toggle-button')
    .attr('aria-label', 'Toggle brush')
    .style('position', 'absolute')
  .style('right', '10px')
  .style('top', '2px')
    .style('z-index', 10)
    // Compact square button
    .style('width', '34px')
    .style('height', '34px')
    .style('padding', '4px')
    .style('background', '#fff')
    .style('border', '1px solid #ccc')
    .style('border-radius', '6px')
    .style('cursor', 'pointer')
    .style('display', 'flex')
    .style('align-items', 'center')
    .style('justify-content', 'center')
    .style('font-size', '18px')
    .attr('title', 'Disable Brush')
    .text('🖌️');

  // Store brush-active state on the DOM node so it persists within this invocation
  // Default: brushing deactivated
  container.node().__brushActive = false;
  brushButton.attr('aria-pressed', 'false').attr('title', 'Enable Brush');

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
    .style('margin-down', '5px');

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
        .attr('fill', isChoroplethSelected ? window.getCountryColor(d.country) : pointColor)
        .attr('stroke', isChoroplethSelected ? window.getCountryColor(d.country) : 'none')
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
        // Remove any assigned color for the country
        if (typeof window.removeCountryColor === 'function') {
          window.removeCountryColor(countryName);
        } else if (window.getGlobalState) {
          // fallback: directly remove from the countryColorMap
          const gs = window.getGlobalState();
          if (gs && gs.countryColorMap) gs.countryColorMap.delete(countryName);
        }
        // Uncheck the corresponding checkbox if present
        const removedCheckbox = d3.select(`#country-${countryName.replace(/\s+/g, '-')}`);
        if (!removedCheckbox.empty()) removedCheckbox.property('checked', false);
      } else {
        // Adiciona à seleção no mac 5
        if (currentChoroplethSelection.length < 5) {
          newChoroplethSelection = [...currentChoroplethSelection, countryName];

          // Assign an unused color from the highlight palette 
          const colors = (typeof window.getCountryHighlightColors === 'function')
            ? window.getCountryHighlightColors()
            : ['#e41a1c', '#e3e300ff', '#4daf4a', '#e7298a', '#ff7f00'];

          if (window.getGlobalState && window.getGlobalState().countryColorMap) {
            const gs = window.getGlobalState();
            const usedColors = new Set(Array.from(gs.countryColorMap.values()));
            const available = colors.filter(c => !usedColors.has(c));
            const chosenColor = available.length > 0 ? available[0] : colors[0];
            gs.countryColorMap.set(countryName, chosenColor);
          } else if (typeof window.assignRandomCountryColor === 'function') {
            window.assignRandomCountryColor(countryName);
          }

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

  // After creating circles, bring choropleth-selected circles to front so they're easy to see
  const initialChoroSelected = window.getChoroplethSelectedCountries();
  svg.selectAll('.circle')
    .filter(d => initialChoroSelected.includes(d.country))
    .raise();

  const regression = calculateRegression(validData, isGdpOnX);
  if (regression) {
    const xMin = d3.min(validData, d => d.x);
    const xMax = d3.max(validData, d => d.x);

    let lineData;
    if (isGdpOnX) {
      // For logarithmic regression, create more points for smooth curve
      const logXMin = Math.log(xMin);
      const logXMax = Math.log(xMax);
      const numPoints = 50;
      lineData = [];

      for (let i = 0; i <= numPoints; i++) {
        const logX = logXMin + (logXMax - logXMin) * i / numPoints;
        const x = Math.exp(logX);
        const y = regression.slope * logX + regression.intercept;
        lineData.push({ x, y });
      }
    } else {
      // Linear regression for non-logarithmic cases
      lineData = [
        { x: xMin, y: regression.slope * xMin + regression.intercept },
        { x: xMax, y: regression.slope * xMax + regression.intercept }
      ];
    }

    svg.append('path')
      .datum(lineData)
      .attr('class', 'regression-line')
      .attr('d', d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y))
      );

  }

  const xAxis = isGdpOnX ?
    d3.axisBottom(xScale)
      .tickValues([500, 1000, 2000, 5000, 10000, 20000, 50000, 100000])
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

  const brush = d3.brush()
    .extent([[config.margin.left, config.margin.top], [config.width - config.margin.right, config.height - config.margin.bottom]])
    .on('start brush end', function(event) {
      const selection = event.selection;

      if (selection) {
        const transform = d3.zoomTransform(svg.node());
        const curXScale = transform.rescaleX(xScale);
        const curYScale = transform.rescaleY(yScale);

       
        const [[x0, y0], [x1, y1]] = selection;

        const xMin = curXScale.invert(x0);
        const xMax = curXScale.invert(x1);
        const yMin = curYScale.invert(y1); 
        const yMax = curYScale.invert(y0);

        const allData = prepareScatterplotDataForBrushing();

        // Encontra pontos dentro da selecao de brush 
        const brushedCountries = new Set();
        allData.forEach(d => {
          if (d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax) {
            brushedCountries.add(d.country);
          }
        });

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

        // Tras pontos brushed para a frente para visibilidade
        svg.selectAll('.circle')
          .filter(d => d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax)
          .raise();

      } else {
        svg.selectAll('.circle')
          .each(function(d) {
            const choroplethSelected = window.getChoroplethSelectedCountries();
            const isChoroplethSelected = choroplethSelected.includes(d.country);

            d3.select(this)
              .attr('opacity', isChoroplethSelected ? 1 : 0.8)
              .attr('stroke-width', isChoroplethSelected ? 2 : 0)
              .attr('stroke', isChoroplethSelected ? window.getCountryColor(d.country) : 'none');
          });

        const chSelected = window.getChoroplethSelectedCountries();
        svg.selectAll('.circle')
          .filter(d => chSelected.includes(d.country))
          .raise();
      }

    });

  const zoom = d3.zoom()
    .scaleExtent([0.5, 10])
    .extent([[config.margin.left, config.margin.top], [config.width - config.margin.right, config.height - config.margin.bottom]])
    .filter(function(event) {
      return event.type === 'wheel' || event.shiftKey;
    })
    .on('zoom', function(event) {
      const transform = event.transform;

      // Cria nova escala
      let newXScale = transform.rescaleX(xScale);
      let newYScale = transform.rescaleY(yScale);

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

      const visibleXDomain = newXScale.domain();
      const visibleYDomain = newYScale.domain();

      
      svg.selectAll('.circle')
        .attr('cx', d => newXScale(d.x))
        .attr('cy', d => newYScale(d.y))
        .style('display', d => {
          const isVisible = d.x >= visibleXDomain[0] && d.x <= visibleXDomain[1] &&
                           d.y >= visibleYDomain[0] && d.y <= visibleYDomain[1];
          return isVisible ? 'block' : 'none';
        });

      // Mantem pontos highlighted a frente
      const currentlySelected = window.getChoroplethSelectedCountries();
      svg.selectAll('.circle')
        .filter(d => currentlySelected.includes(d.country))
        .raise();


      const regressionLine = svg.select('.regression-line');
      if (!regressionLine.empty()) {

        const visibleData = scatterplotData.filter(d =>
          d.x >= visibleXDomain[0] && d.x <= visibleXDomain[1] &&
          d.y >= visibleYDomain[0] && d.y <= visibleYDomain[1]
        );

        if (visibleData.length >= 2) {
          const visibleRegression = calculateRegression(visibleData, isGdpOnX);
          if (visibleRegression) {
            const xMin = Math.max(d3.min(visibleData, d => d.x), visibleXDomain[0]);
            const xMax = Math.min(d3.max(visibleData, d => d.x), visibleXDomain[1]);

            let lineData;
            if (isGdpOnX) {

              const logXMin = Math.log(xMin);
              const logXMax = Math.log(xMax);
              const numPoints = 30;
              lineData = [];

              for (let i = 0; i <= numPoints; i++) {
                const logX = logXMin + (logXMax - logXMin) * i / numPoints;
                const x = Math.exp(logX);
                const y = visibleRegression.slope * logX + visibleRegression.intercept;
                lineData.push({ x, y });
              }
            } else {

              lineData = [
                { x: xMin, y: visibleRegression.slope * xMin + visibleRegression.intercept },
                { x: xMax, y: visibleRegression.slope * xMax + visibleRegression.intercept }
              ];
            }

            regressionLine.attr('d', d3.line()
              .x(d => newXScale(d.x))
              .y(d => newYScale(d.y))(lineData));


           
              
          }
        } else {
          regressionLine.style('display', 'none');
          svg.select('.regression-info').style('display', 'none');
        }
      }

      // Update brush para corresponder a zoom
      brushGroup.call(brush.move, null);
    });


  svg.call(zoom);


  const brushGroup = svg.append('g')
    .attr('class', 'brush')
    .call(brush);

  if (!container.node().__brushActive) {
    brushGroup.style('display', 'none');
  }

  brushButton.on('click', function() {
    const active = !container.node().__brushActive;
    container.node().__brushActive = active;

    brushGroup.style('display', active ? null : 'none');

    // Apaga selecao quando brush desativa
    if (!active) {
      brushGroup.call(brush.move, null);
      svg.selectAll('.circle')
        .each(function(d) {
          const choroplethSelected = window.getChoroplethSelectedCountries();
          const isChoroplethSelected = choroplethSelected.includes(d.country);

          d3.select(this)
            .attr('opacity', isChoroplethSelected ? 1 : 0.8)
            .attr('stroke-width', isChoroplethSelected ? 2 : 0)
            .attr('stroke', isChoroplethSelected ? window.getCountryColor(d.country) : 'none');
        });
    }

    d3.select(this)
      .text('🖌️')
      .attr('title', active ? 'Disable Brush' : 'Enable Brush')
      .attr('aria-pressed', active ? 'true' : 'false')
      .style('border-color', active ? '#ff6600' : '#ccc')
      .style('box-shadow', active ? '0 0 6px rgba(255,102,0,0.25)' : 'none');
  });
}

function calculateRegression(data, isLogarithmic = false) {
  if (data.length < 2) return null;

  const yValues = data.map(d => d.y);
  const n = data.length;

  let xValues, xMean, yMean;

  if (isLogarithmic) {
    xValues = data.map(d => Math.log(d.x));
  } else {
    xValues = data.map(d => d.x);
  }

  xMean = d3.mean(xValues);
  yMean = d3.mean(yValues);

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

function calculateLinearRegression(data) {
  return calculateRegression(data, false);
}