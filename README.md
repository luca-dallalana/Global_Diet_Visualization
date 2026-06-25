# Global Dietary Behaviour Visualization

An interactive data visualization dashboard built with D3.js that lets users explore global nutrition trends from 1961 to 2022. It connects dietary patterns (daily calorie intake, macronutrient breakdown, GDP) to obesity rates across 150+ countries, giving an at-a-glance picture of how food consumption has changed over six decades.

## Tech Stack

**Frontend**
- HTML / CSS / Vanilla JavaScript
- D3.js v7
- TopoJSON (world map rendering)

**Data**
- Three CSV datasets covering daily calorie intake vs. GDP, obesity rates, and macronutrient distributions per country per year

## Features

- World choropleth map color-coded by any of five metrics: total calories, protein calories, carbohydrate calories, fat calories, or obesity rate
- Click up to five countries on the map to highlight and track them across all charts simultaneously
- Scatter plot with three configurable axes (GDP vs. Calories, GDP vs. Obesity, Calories vs. Obesity), including a live regression line and brush selection tool
- Zoom on both the map (1×–8×) and scatter plot (scroll or shift+scroll), with axes and regression updating in real time
- Line chart showing the selected metric over time for chosen countries
- Donut chart showing the average macronutrient split (carbs / fats / proteins) for the selected countries in the current year
- Dual-handle year range slider controlling both the visible window for the line chart and the "current year" snapshot for the map, scatter plot, and donut chart
- Country search and checkbox list for bulk filtering which countries appear in the scatter plot

## Architecture / How It Works

All chart state lives in a single `globalState` object in `script.js`. Each visualization module (`choropleth.js`, `scatterplot.js`, `linechart.js`, `donutchart.js`, `rangeslider.js`) reads state exclusively through getter functions exposed on `window` (e.g. `window.getSelectedFilter()`, `window.getChoroplethSelectedCountries()`). Any interaction that changes state calls `updateGlobalState()`, which triggers a full re-render of all four charts.

The choropleth uses a first-render / update pattern: the TopoJSON world geometry is fetched and the SVG paths are created only once; subsequent state changes update only fill and stroke attributes, avoiding repeated network requests. Country names in TopoJSON are reconciled with dataset names via a manual mapping table (e.g. `'United States of America' → 'United States'`).

Up to five countries can be "highlighted" at a time. Each highlighted country is assigned a color from a fixed five-color palette; that color is shared across the choropleth border, scatter plot dots, and line chart lines, making cross-chart tracking straightforward.

The scatter plot applies a logarithmic x-scale when GDP is on that axis (GDP is log-normally distributed across countries), and switches to linear when it is not. The regression calculation also adapts — logarithmic regression against `ln(x)` for the GDP axis, linear otherwise — and recalculates dynamically as the user zooms. The obesity dataset only starts in 1990, so the year range slider automatically adjusts its domain when that filter is selected.

## Getting Started

No build step or package manager is needed. The project runs entirely in the browser.

1. Clone the repository:
   ```bash
   git clone https://github.com/luca-dallalana/Global_Diet_Visualization.git
   cd Global_Diet_Visualization
   ```

2. Serve the files from a local HTTP server (required because the app loads CSV and JSON files via `fetch`/`d3.csv`):
   ```bash
   # Python 3
   python3 -m http.server 8080

   # Node (if you have npx available)
   npx serve .
   ```

3. Open `http://localhost:8080` in a browser.

> Opening `index.html` directly as a `file://` URL will fail due to CORS restrictions on local file loading.

## Usage

**Exploring a single year**
Move the orange circle on the year range slider to any year between 1961 and 2022. The map, scatter plot, and donut chart update to show data for that year.

**Comparing countries over time**
Click up to five countries directly on the map (or on scatter plot dots). Each selected country gets a unique color. Switch to the line chart panel to see their trends side by side over the selected year range.

**Investigating correlations**
Use the "Scatter Plot Data" dropdown to switch between GDP vs. Calories, GDP vs. Obesity, and Calories vs. Obesity. A regression line is drawn automatically. Enable the brush tool (paint icon, top-right of the scatter plot) to drag-select a region and dim everything outside it.

## What I Learned / Challenges

The hardest part was keeping five distinct visualizations in sync without a framework. I implemented a lightweight shared-state pattern — a single `globalState` object with getter functions exposed on `window`, so each chart module remains self-contained and only re-reads what it needs. A related challenge was cross-chart country highlighting: the same country had to appear in the same color on the map border, the scatter plot dot, and the line chart line simultaneously, which required a centralized color map that all modules query rather than each picking its own color independently. Handling country name mismatches between the TopoJSON geometry and the CSV datasets required building a manual reconciliation table, which taught me a lot about how inconsistently geographic data is named across sources.
