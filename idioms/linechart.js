function createLineChart(selector = '#linechart') {
  // Limpa o gráfico anterior para evitar sobreposições
  const container = selector.startsWith('.') ? d3.select(selector).select('#linechart') : d3.select(selector);
  container.selectAll('*').remove();

  // Obtém dados usando getters centralizados
  const selectedFilter = window.getSelectedFilter ? window.getSelectedFilter() : 'total-calories';
  const yearRange = window.getSelectedYearRange ? window.getSelectedYearRange() : { start: 1961, end: 2022 };
  const selectedCountries = window.getSelectedCountries ? window.getSelectedCountries() : [];

  // Obtém datasets usando getters
  const obesityData = window.getObesityData ? window.getObesityData() : [];
  const macronutrientData = window.getMacronutrientData ? window.getMacronutrientData() : [];
  const caloriesGdpData = window.getCaloriesGdpData ? window.getCaloriesGdpData() : [];

  // Limita a 10 países no máximo
  const limitedCountries = selectedCountries.slice(0, 10);

  let filteredData = [];
  let dataSource;
  let valueField;
  let yAxisLabel;
  let chartTitle;

  // Determina qual dataset e campo usar baseado no filtro selecionado
  switch(selectedFilter) {
    case 'obesity-rate':
      dataSource = obesityData;
      valueField = 'obesity';
      yAxisLabel = 'Obesity Rate (%)';
      chartTitle = 'Obesity Rate Trends Over Time';
      break;
    case 'protein-calories':
      dataSource = macronutrientData;
      valueField = d => (d.animalProtein || 0) + (d.vegetalProtein || 0);
      yAxisLabel = 'Protein Calories';
      chartTitle = 'Protein Calorie Trends Over Time';
      break;
    case 'carbs-calories':
      dataSource = macronutrientData;
      valueField = 'carbohydrates';
      yAxisLabel = 'Carbohydrate Calories';
      chartTitle = 'Carbohydrate Calorie Trends Over Time';
      break;
    case 'fat-calories':
      dataSource = macronutrientData;
      valueField = 'fat';
      yAxisLabel = 'Fat Calories';
      chartTitle = 'Fat Calorie Trends Over Time';
      break;
    case 'total-calories':
    default:
      dataSource = caloriesGdpData;
      valueField = 'calories';
      yAxisLabel = 'Daily Calories';
      chartTitle = 'Daily Calorie Trends Over Time';
      break;
  }

  // Filtra dados baseado no dataset selecionado
  filteredData = dataSource.filter(d => {
    const value = typeof valueField === 'function' ? valueField(d) : d[valueField];
    return limitedCountries.includes(d.country) &&
           d.year >= yearRange.start &&
           d.year <= yearRange.end &&
           !isNaN(value);
  });

  // Adiciona o campo de valor calculado aos dados
  filteredData = filteredData.map(d => ({
    ...d,
    value: typeof valueField === 'function' ? valueField(d) : d[valueField]
  }));

  // Atualiza o título do gráfico
  d3.select('#linechart-title').text(chartTitle);

  if (filteredData.length === 0) {
    container
      .append('div')
      .style('text-align', 'center')
      .style('padding', '50px')
      .style('color', '#666')
      .text('No data available for the selected filters');
    return;
  }

  // Configuração das dimensões
  const width = 500;
  const height = 250;
  const margin = { top: 20, right: 80, bottom: 40, left: 50 };

  // Agrupa dados por país
  const dataByCountry = d3.group(filteredData, d => d.country);

  // Escalas
  const xScale = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => d.year))
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain(d3.extent(filteredData, d => d.value))
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Escala de cores para países
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Cria SVG
  const svg = container
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('margin-left', '10px')
    .style('margin-top', '10px');

  // Cria tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip');

  // Gerador de linha
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

  // Desenha linhas para cada país
  dataByCountry.forEach((countryData, country) => {
    const sortedData = countryData.sort((a, b) => a.year - b.year);
    const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
    const isChoroplethSelected = choroplethSelected.includes(country);

    // Linha com destaque para países selecionados no choropleth
    svg.append('path')
      .datum(sortedData)
      .attr('fill', 'none')
      .attr('stroke', isChoroplethSelected ? d3.color(colorScale(country)).brighter(0.5) : colorScale(country))
      .attr('stroke-width', isChoroplethSelected ? 4 : 2)
      .attr('d', line);

    // Adiciona pontos com destaque
    svg.selectAll(`.point-${country.replace(/\s+/g, '-')}`)
      .data(sortedData)
      .enter()
      .append('circle')
      .attr('class', `point-${country.replace(/\s+/g, '-')}`)
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d.value))
      .attr('r', isChoroplethSelected ? 4 : 3)
      .attr('fill', isChoroplethSelected ? d3.color(colorScale(country)).brighter(0.5) : colorScale(country))
      .attr('stroke', isChoroplethSelected ? '#000' : 'none')
      .attr('stroke-width', isChoroplethSelected ? 2 : 0)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', isChoroplethSelected ? 6 : 5);
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${d.country}</strong><br/>
            Year: ${d.year}<br/>
            ${yAxisLabel}: ${d.value.toFixed(selectedFilter === 'obesity-rate' ? 1 : 0)}${selectedFilter === 'obesity-rate' ? '%' : ''}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', isChoroplethSelected ? 4 : 3);
        tooltip.style('opacity', 0);
      });
  });

  // Eixos
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format('d'));
  const yAxis = d3.axisLeft(yScale);

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis);

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis);

  // Labels dos eixos
  svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', height - 5)
    .attr('text-anchor', 'middle')
    .text('Year');

  svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .text(yAxisLabel);

  // Legenda
  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - margin.right + 10}, ${margin.top})`);

  let legendY = 0;
  dataByCountry.forEach((countryData, country) => {
    const legendItem = legend.append('g')
      .attr('transform', `translate(0, ${legendY})`);

    legendItem.append('line')
      .attr('x1', 0)
      .attr('x2', 15)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', colorScale(country))
      .attr('stroke-width', 2);

    legendItem.append('text')
      .attr('x', 20)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .style('font-size', '10px')
      .text(country.length > 12 ? country.substring(0, 12) + '...' : country);

    legendY += 15;
  });
}