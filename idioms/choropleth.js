function createChoropleth(selector = '.Map') {
  const container = d3.select(selector);
  container.selectAll('svg').remove(); 

  // Usa getters pra aceder a GlobalSTate
  const selectedFilter = window.getSelectedFilter();
  const currentYear = window.getCurrentYear();
  const obesityData = window.getObesityData();
  const macronutrientData = window.getMacronutrientData();
  const caloriesGdpData = window.getCaloriesGdpData();

  const containerElement = container.node();
  const containerRect = containerElement.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;

  const svg = container
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('background-color', '#f0f8ff');

  const projection = d3.geoNaturalEarth1(); 
  const path = d3.geoPath().projection(projection); 

  let mapData = [];
  let valueField, colorScale, legendTitle;

  // Escolhe dados a mostrat baseado no filtro selecionado
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

  const dataByCountry = new Map();
  mapData.forEach(d => {
    dataByCountry.set(d.country, d[valueField]);
  });

  // logica de hover 
  const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

  // TopoJSON do mundo
  d3.json('./libs/countries-110m.json').then(function(world) {
    // Converte TopoJSON para GeoJSON
    const countries = topojson.feature(world, world.objects.countries);

    projection.fitSize([width, height], countries);

    // Nomes do dataset são diferentes dos do TOPO, faz um mapzinho
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

    svg.selectAll('.country')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'country')
      .attr('d', path) 
      .attr('fill', function(d) {
        // Pega o nome do pais e os dados do tal
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const countryValue = dataByCountry.get(countryName);
        return countryValue ? colorScale(countryValue) : '#ccc'; // Ve a hue do valor ou cinza se n tiver
      })
      .attr('stroke', function(d) {
        // Red outline for selected countries
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const choroplethSelected = window.getChoroplethSelectedCountries();
        return choroplethSelected.includes(countryName) ? '#ff0000' : '#333';
      })
      .attr('stroke-width', function(d) {
        // Thicker outline for selected countries
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const choroplethSelected = window.getChoroplethSelectedCountries();
        return choroplethSelected.includes(countryName) ? 2 : 0.5;
      }) 
      .style('cursor', 'pointer') // maozinha
      // Hover 
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2);
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const countryValue = dataByCountry.get(countryName);
        const value = countryValue || 'No data';

        // Mostrar os dados no tooltip
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
        d3.select(this).attr('stroke-width', 0.5); // Reseta o outline 
        tooltip.style('opacity', 0); 
      })
      // Click pra selecionar/deselecionar pais
      .on('click', function(event, d) {
        tooltip.style('opacity', 0); 

        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const currentChoroplethSelection = window.getChoroplethSelectedCountries();
        const isCurrentlySelected = currentChoroplethSelection.includes(countryName);

        let newChoroplethSelection;
        if (isCurrentlySelected) {
          // Remove se ja ta selecionado
          newChoroplethSelection = currentChoroplethSelection.filter(c => c !== countryName);
        } else {
          // deixa add até 5 paises
          if (currentChoroplethSelection.length < 5) {
            newChoroplethSelection = [...currentChoroplethSelection, countryName];
          } else {
            // FIFO remover o mais antigo
            newChoroplethSelection = [...currentChoroplethSelection.slice(1), countryName];
          }

          // Marcar o checkbox do pais selecionado
          const countryCheckbox = d3.select(`#country-${countryName.replace(/\s+/g, '-')}`);
          if (!countryCheckbox.empty()) {
            countryCheckbox.property('checked', true);
          }
        }

        // Fazer update do GlobalState
        const selectedCountries = window.getSelectedCountries();
        window.updateGlobalState({
          choroplethSelectedCountries: newChoroplethSelection,
          selectedCountries: selectedCountries
        });
      });
  }).catch(function(error) {
    console.error('Error loading world data:', error);
  });


  // Legenda de cor com buckets
  const legendWidth = Math.min(200, width * 0.25);
  const legendHeight = 20;
  const legendX = width - legendWidth - 20;
  const legendY = height - 60;

  const legend = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${legendX}, ${legendY})`);

  // Cria buckets discretos baseados no domínio
  const domain = colorScale.domain();
  const numBuckets = 5;
  const bucketWidth = legendWidth / numBuckets;

  // Calcula valores dos buckets
  const bucketValues = [];
  for (let i = 0; i <= numBuckets; i++) {
    bucketValues.push(domain[0] + (domain[1] - domain[0]) * i / numBuckets);
  }

  // Cria retângulos dos buckets
  for (let i = 0; i < numBuckets; i++) {
    const bucketValue = domain[0] + (domain[1] - domain[0]) * (i + 0.5) / numBuckets;

    legend.append('rect')
      .attr('x', i * bucketWidth)
      .attr('y', 0)
      .attr('width', bucketWidth)
      .attr('height', legendHeight)
      .attr('fill', colorScale(bucketValue))
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
  }

  // Adiciona valores nos buckets
  for (let i = 0; i <= numBuckets; i++) {
    if (i === 0 || i === numBuckets) { // Apenas min e max
      legend.append('text')
        .attr('x', i * bucketWidth)
        .attr('y', legendHeight + 15)
        .attr('text-anchor', i === 0 ? 'start' : 'end')
        .attr('font-size', '10px')
        .text(bucketValues[i].toFixed(selectedFilter === 'obesity-rate' ? 1 : 0));
    }
  }

  // Título da legenda
  legend.append('text')
    .attr('x', legendWidth / 2)
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text(legendTitle);
}

