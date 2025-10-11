// Lista global de países selecionados no choropleth (máximo 10)
window.choroplethSelectedCountries = window.choroplethSelectedCountries || [];

// Mapa global de nomes de países para usar em funções externas
let globalCountryNameMap = {};
let globalSvg = null;

function createChoropleth(selector = '.Map') {
  // Limpa o mapa anterior
  const container = d3.select(selector);
  container.selectAll('svg').remove();

  // Obtém o filtro selecionado
  const selectedFilter = d3.select('#filterSelect').property('value');
  const currentYear = window.getCurrentYear ? window.getCurrentYear() : 2022;

  // Configuração das dimensões - preenche todo o container sem margens
  const containerElement = container.node();
  const containerRect = containerElement.getBoundingClientRect();
  const width = containerRect.width || 800;  // Fallback se não conseguir obter largura
  const height = containerRect.height || 500; // Fallback se não conseguir obter altura

  console.log('Container dimensions:', width, 'x', height);

  // Cria SVG que preenche todo o container
  const svg = container
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('background-color', '#f0f8ff');

  // Armazena referência global do SVG
  globalSvg = svg;

  // Projeção do mapa - será ajustada depois de carregar os dados
  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath().projection(projection);

  // Prepara dados baseado no filtro selecionado
  let mapData = [];
  let valueField, colorScale, legendTitle;

  switch(selectedFilter) {
    case 'obesity-rate':
      mapData = obesityData.filter(d => d.year === currentYear);
      valueField = 'obesity';
      colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain(d3.extent(mapData, d => d.obesity));
      legendTitle = 'Obesity Rate (%)';
      break;
    case 'protein-calories':
      mapData = macronutrientData.filter(d => d.year === currentYear)
        .map(d => ({
          ...d,
          value: (d.animalProtein || 0) + (d.vegetalProtein || 0)
        }));
      valueField = 'value';
      colorScale = d3.scaleSequential(d3.interpolateGreens)
        .domain(d3.extent(mapData, d => d.value));
      legendTitle = 'Protein Calories';
      break;
    case 'carbs-calories':
      mapData = macronutrientData.filter(d => d.year === currentYear);
      valueField = 'carbohydrates';
      colorScale = d3.scaleSequential(d3.interpolateOranges)
        .domain(d3.extent(mapData, d => d.carbohydrates));
      legendTitle = 'Carbohydrate Calories';
      break;
    case 'fat-calories':
      mapData = macronutrientData.filter(d => d.year === currentYear);
      valueField = 'fat';
      colorScale = d3.scaleSequential(d3.interpolatePurples)
        .domain(d3.extent(mapData, d => d.fat));
      legendTitle = 'Fat Calories';
      break;
    case 'total-calories':
    default:
      mapData = caloriesGdpData.filter(d => d.year === currentYear);
      valueField = 'calories';
      colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(d3.extent(mapData, d => d.calories));
      legendTitle = 'Daily Calories';
      break;
  }

  // Cria um mapa de dados por país para lookup rápido
  const dataByCountry = new Map();
  mapData.forEach(d => {
    dataByCountry.set(d.country, d[valueField]);
  });

  // Tooltip
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  // Carrega dados do mundo usando TopoJSON local
  d3.json('./libs/countries-110m.json').then(function(world) {
    // Converte TopoJSON para GeoJSON
    const countries = topojson.feature(world, world.objects.countries);

    // Ajusta a projeção para preencher todo o container
    projection.fitSize([width, height], countries);
    console.log('Projection fitted to:', width, 'x', height);
    console.log('Projection scale:', projection.scale());
    console.log('Projection translate:', projection.translate());

    // Mapeamento de nomes de países (TopoJSON para nomes em nossos dados)
    const countryNameMap = {
      'United States of America': 'United States',
      'Russia': 'Russia',
      'Czech Republic': 'Czechia',
      'Dem. Rep. Congo': 'Democratic Republic of Congo',
      'Central African Rep.': 'Central African Republic',
      'Bosnia and Herz.': 'Bosnia and Herzegovina',
      'Trinidad and Tobago': 'Trinidad and Tobago',
      'Eq. Guinea': 'Equatorial Guinea',
      'Solomon Is.': 'Solomon Islands',
      'Papua New Guinea': 'Papua New Guinea',
      'Timor-Leste': 'Timor-Leste',
      'Costa Rica': 'Costa Rica',
      'Dominican Rep.': 'Dominican Republic',
      'El Salvador': 'El Salvador',
      'Puerto Rico': 'Puerto Rico',
      'Côte d\'Ivoire': 'Cote d\'Ivoire',
      'Myanmar': 'Myanmar',
      'Iran': 'Iran',
      'Syria': 'Syria',
      'Venezuela': 'Venezuela',
      'Bolivia': 'Bolivia',
      'Tanzania': 'Tanzania',
      'Macedonia': 'North Macedonia',
      'Moldova': 'Moldova',
      'Lao PDR': 'Laos',
      'Vietnam': 'Viet Nam',
      'Republic of the Congo': 'Congo',
      'Brunei': 'Brunei Darussalam',
      'Gambia': 'Gambia',
      'Bahamas': 'Bahamas',
      'Cape Verde': 'Cape Verde',
      'eSwatini': 'Eswatini',
      'S. Sudan': 'South Sudan',
      'W. Sahara': 'Western Sahara'
    };

    // Armazena o mapeamento globalmente
    globalCountryNameMap = countryNameMap;

    // Desenha todos os países
    svg.selectAll('.country')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', function(d) {
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const countryValue = dataByCountry.get(countryName);
        return countryValue ? colorScale(countryValue) : '#ccc';
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2);
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const countryValue = dataByCountry.get(countryName);
        const value = countryValue || 'No data';
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${countryName}</strong><br/>
            ${legendTitle}: ${typeof value === 'number' ? value.toFixed(selectedFilter === 'obesity-rate' ? 1 : 0) : value}${selectedFilter === 'obesity-rate' && typeof value === 'number' ? '%' : ''}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.5);
        tooltip.style('opacity', 0);
      })
      .on('click', function(event, d) {
        console.log('Country clicked:', d.properties.name);
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        console.log('Mapped country name:', countryName);

        // Verifica se o país existe nos dados
        const allCountries = [...new Set([
          ...caloriesGdpData.map(d => d.country),
          ...obesityData.map(d => d.country),
          ...macronutrientData.map(d => d.country)
        ])];
        const countryExists = allCountries.includes(countryName);
        console.log('Country exists in data:', countryExists);
        console.log('Current choropleth selection:', window.choroplethSelectedCountries);

        if (countryExists) {
          // Toggle da seleção no choropleth (separado dos checkboxes)
          const isCurrentlySelected = window.choroplethSelectedCountries.includes(countryName);
          console.log('Currently selected:', isCurrentlySelected);

          let newChoroplethSelection;
          if (isCurrentlySelected) {
            // Remove da seleção
            newChoroplethSelection = window.choroplethSelectedCountries.filter(c => c !== countryName);
            console.log('Removed from selection. New list:', newChoroplethSelection);
          } else {
            // Adiciona à seleção (máximo 10)
            if (window.choroplethSelectedCountries.length < 10) {
              newChoroplethSelection = [...window.choroplethSelectedCountries, countryName];
              console.log('Added to selection. New list:', newChoroplethSelection);
            } else {
              // Remove o primeiro e adiciona o novo (FIFO)
              newChoroplethSelection = [...window.choroplethSelectedCountries.slice(1), countryName];
              console.log('FIFO replacement. New list:', newChoroplethSelection);
            }
          }

          // Atualiza estado global com nova seleção
          if (window.updateGlobalState) {
            window.updateGlobalState({ choroplethSelectedCountries: newChoroplethSelection });
          } else {
            // Fallback se updateGlobalState não existir
            window.choroplethSelectedCountries = newChoroplethSelection;
            // Atualiza visuais do mapa
            updateAllCountryVisuals();
            // Atualiza os gráficos para destacar países selecionados no choropleth
            createScatterplot('.ScatterPlot');
            createLineChart('.LineChart');
          }
        } else {
          console.log('Country not found in data. Available countries:', allCountries.slice(0, 10));
        }
      });
  }).catch(function(error) {
    console.error('Error loading world data:', error);
    // Fallback para países de exemplo em caso de erro
    drawExampleCountries();
  });

  // Função para atualizar visual do país baseado nos dois tipos de seleção
  function updateCountryVisual(countryElement, countryName) {
    const selectedCountries = window.getSelectedCountries ? window.getSelectedCountries() : [];
    const isCheckboxSelected = selectedCountries.includes(countryName);
    const choroplethSelected = window.getChoroplethSelectedCountries ? window.getChoroplethSelectedCountries() : [];
    const isChoroplethSelected = choroplethSelected.includes(countryName);

    if (isChoroplethSelected) {
      // Choropleth selection: dark black thick outline
      countryElement
        .attr('stroke', '#000')
        .attr('stroke-width', 4)
        .style('stroke-dasharray', 'none');
    } else if (isCheckboxSelected) {
      // Checkbox selection: orange dashed outline
      countryElement
        .attr('stroke', '#ff6600')
        .attr('stroke-width', 2)
        .style('stroke-dasharray', '5,5');
    } else {
      // No selection: default gray outline
      countryElement
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .style('stroke-dasharray', 'none');
    }
  }

  // Função para atualizar todos os países baseado nas duas listas de seleção
  function updateAllCountryVisuals() {
    if (globalSvg && globalCountryNameMap) {
      globalSvg.selectAll('.country').each(function(d) {
        const countryName = globalCountryNameMap[d.properties.name] || d.properties.name;
        updateCountryVisual(d3.select(this), countryName);
      });
    }
  }

  // Exporta função para uso externo
  window.updateMapSelection = updateAllCountryVisuals;

  // Atualiza visuais iniciais baseado nos países já selecionados
  setTimeout(updateAllCountryVisuals, 100); // Pequeno delay para garantir que os checkboxes estejam prontos

  // Adiciona legenda - posicionada no canto inferior direito
  const legendWidth = Math.min(200, width * 0.25);  // Máximo 25% da largura
  const legendHeight = 20;
  const legendX = width - legendWidth - 20;
  const legendY = height - 60;

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendX}, ${legendY})`);

  // Gradiente para a legenda
  const defs = svg.append('defs');
  const gradient = defs.append('linearGradient')
    .attr('id', 'legend-gradient')
    .attr('x1', '0%')
    .attr('x2', '100%')
    .attr('y1', '0%')
    .attr('y2', '0%');

  // Adiciona cores do gradiente
  const domain = colorScale.domain();
  gradient.append('stop')
    .attr('offset', '0%')
    .attr('stop-color', colorScale(domain[0]));
  gradient.append('stop')
    .attr('offset', '100%')
    .attr('stop-color', colorScale(domain[1]));

  // Retângulo da legenda
  legend.append('rect')
    .attr('width', legendWidth)
    .attr('height', legendHeight)
    .style('fill', 'url(#legend-gradient)')
    .attr('stroke', '#333')
    .attr('stroke-width', 1);

  // Labels da legenda
  legend.append('text')
    .attr('x', 0)
    .attr('y', legendHeight + 15)
    .attr('text-anchor', 'start')
    .attr('font-size', '12px')
    .text(domain[0].toFixed(selectedFilter === 'obesity-rate' ? 1 : 0));

  legend.append('text')
    .attr('x', legendWidth)
    .attr('y', legendHeight + 15)
    .attr('text-anchor', 'end')
    .attr('font-size', '12px')
    .text(domain[1].toFixed(selectedFilter === 'obesity-rate' ? 1 : 0));

  // Título da legenda
  legend.append('text')
    .attr('x', legendWidth / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text(legendTitle);
}

// Função para atualizar line chart quando um país é clicado
function updateLineChartForCountry(countryName) {
  // Desseleciona todos os países
  d3.selectAll('#countryCheckboxes input[type="checkbox"]')
    .property('checked', false);

  // Seleciona apenas o país clicado
  d3.select(`#country-${countryName.replace(/\s+/g, '-')}`)
    .property('checked', true);

  // Atualiza os gráficos
  setCurrentData();
  createScatterplot('.ScatterPlot');
  createDonutChart('.DonutChart');
  createLineChart('.LineChart');
}