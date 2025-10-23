function createChoropleth(selector = '.Map') {
  const container = d3.select(selector);

  // Check if SVG already exists
  let svg = container.select('svg');
  const isFirstRender = svg.empty(); 

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

  if (isFirstRender) {
    svg = container
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background-color', '#f0f8ff');

    // Create a group for the map that will be transformed during zoom
    svg.append('g')
      .attr('class', 'map-group');
  }

  const projection = d3.geoNaturalEarth1();
  const path = d3.geoPath().projection(projection);
  const mapGroup = svg.select('.map-group'); 

  let mapData = [];
  let valueField, colorScale, legendTitle;

  // Escolhe dados a mostrat baseado no filtro selecionado
  switch(selectedFilter) {
    case 'obesity-rate':
      mapData = obesityData.filter(d => d.year === currentYear);
      valueField = 'obesity';
      colorScale = d3.scaleSequential(d3.interpolateBlues)
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
      colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(d3.extent(mapData, d => d.value));
      legendTitle = 'Protein Calories';
      break;
    case 'carbs-calories':
      mapData = macronutrientData.filter(d => d.year === currentYear);
      valueField = 'carbohydrates';
      colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(d3.extent(mapData, d => d.carbohydrates));
      legendTitle = 'Carbohydrate Calories';
      break;
    case 'fat-calories':
      mapData = macronutrientData.filter(d => d.year === currentYear);
      valueField = 'fat';
      colorScale = d3.scaleSequential(d3.interpolateBlues)
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

  let tooltip = d3.select('body').select('.tooltip');
  if (tooltip.empty()) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  // Function to update country styling
  function updateCountries() {
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

    // Update existing countries or create new ones
    mapGroup.selectAll('.country')
      .attr('fill', function(d) {
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const countryValue = dataByCountry.get(countryName);
        return countryValue ? colorScale(countryValue) : '#ccc';
      })
      .attr('stroke', function(d) {
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const choroplethSelected = window.getChoroplethSelectedCountries();
        return choroplethSelected.includes(countryName) ? window.getCountryColor(countryName) : '#333';
      })
      .attr('stroke-width', function(d) {
        const countryName = countryNameMap[d.properties.name] || d.properties.name;
        const choroplethSelected = window.getChoroplethSelectedCountries();
        return choroplethSelected.includes(countryName) ? 3 : 0.5;
      });
  }

  if (isFirstRender) {
    // TopoJSON do mundo - load only on first render
    d3.json('./libs/countries-110m.json').then(function(world) {
      // Converte TopoJSON para GeoJSON
      const countries = topojson.feature(world, world.objects.countries);

      projection.fitSize([width, height], countries);

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

      mapGroup.selectAll('.country')
        .data(countries.features)
        .enter()
        .append('path')
        .attr('class', 'country')
        .attr('d', path) 
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          const currentElement = d3.select(this);
          const originalStrokeWidth = currentElement.attr('stroke-width');
          currentElement.attr('data-original-stroke-width', originalStrokeWidth);
          currentElement.attr('stroke-width', 3);

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
          const currentElement = d3.select(this);
          const originalStrokeWidth = currentElement.attr('data-original-stroke-width') || 0.5;
          currentElement.attr('stroke-width', originalStrokeWidth);
          tooltip.style('opacity', 0);
        })
        .on('click', function(event, d) {
          tooltip.style('opacity', 0);

          const countryName = countryNameMap[d.properties.name] || d.properties.name;
          const currentChoroplethSelection = window.getChoroplethSelectedCountries();
          const isCurrentlySelected = currentChoroplethSelection.includes(countryName);

          let newChoroplethSelection;
          if (isCurrentlySelected) {
            newChoroplethSelection = currentChoroplethSelection.filter(c => c !== countryName);
          } else {
            if (currentChoroplethSelection.length < 5) {
              newChoroplethSelection = [...currentChoroplethSelection, countryName];

              const countryCheckbox = d3.select(`#country-${countryName.replace(/\s+/g, '-')}`);
              if (!countryCheckbox.empty()) {
                countryCheckbox.property('checked', true);
              }
            } else {
              return;
            }
          }

          const selectedCountries = window.getSelectedCountries();
          window.updateGlobalState({
            choroplethSelectedCountries: newChoroplethSelection,
            selectedCountries: selectedCountries
          });
        });

      // Initial styling
      updateCountries();

    // Add zoom functionality after countries are added
    const zoom = d3.zoom()
      .scaleExtent([1, 8]) // Scale from 1x (initial view) to 8x zoom
      .on('zoom', function(event) {
        const transform = event.transform;

        // When at minimum zoom (scale = 1), reset to original position
        if (transform.k <= 1) {
          const resetTransform = d3.zoomIdentity;
          mapGroup.attr('transform', resetTransform);
          // Update the zoom behavior to reflect the reset
          svg.call(zoom.transform, resetTransform);
        } else {
          // Apply transform directly without constraints
          mapGroup.attr('transform', transform);
        }
      });

    // Apply zoom to the SVG
    svg.call(zoom);

  }).catch(function(error) {
    console.error('Error loading world data:', error);
  });
  } else {
    // On subsequent renders, just update the styling
    updateCountries();
  }

  // Update or create legend
  const legendWidth = Math.min(200, width * 0.25);
  const legendHeight = 20;
  const legendX = width - legendWidth - 20;
  const legendY = height - 60;

  let legend = svg.select('.legend');
  if (legend.empty()) {
    legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX}, ${legendY})`);
  } else {
    legend.selectAll('*').remove();
  }

  // Cria buckets 
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

