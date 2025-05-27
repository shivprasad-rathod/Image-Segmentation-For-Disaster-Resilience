document.addEventListener('DOMContentLoaded', () => {
    // Globalish variables for the dashboard, declared early
    let map = null;
    let markerLayerGroup = null;
    let regionSelect = null;
    let runAnalysisBtn = null;
    let exportReportBtn = null;
    let loadingIndicator = null;
    let errorMessageArea = null;
    let disasterTypeButtons = null;
    let analysisModeButtons = null;
    let detectionThresholdSlider = null;
    let detectionThresholdValueDisplay = null;
    let layersButtons = null;
    let layersPanel = null;
    let layerCheckboxes = null; // Added for layers panel

    // regionCoordinates remains useful for map.setView on regionSelect change
    const regionCoordinates = {
        "coastal_city": { lat: 12.9716, lon: 77.5946, zoom: 10, name: "Coastal City (Bangalore Sample)" },
        "mountain_valley": { lat: 34.0837, lon: 74.7973, zoom: 9, name: "Mountain Valley (Srinagar Sample)" },
        "desert_oasis": { lat: 26.9124, lon: 70.9229, zoom: 10, name: "Desert Oasis (Jaisalmer Sample)" },
        "urban_center": { lat: 19.0760, lon: 72.8777, zoom: 11, name: "Urban Center (Mumbai Sample)" },
        "default_view": { lat: 20.5937, lon: 78.9629, zoom: 5, name: "Default All India View" }
    };

    // Initialize DOM element references once DOM is loaded
    function initializeDOMElements() {
        loadingIndicator = document.getElementById('loading-indicator');
        errorMessageArea = document.getElementById('error-message-area');
        runAnalysisBtn = document.querySelector('.run-analysis-btn');
        exportReportBtn = document.querySelector('.export-report-btn');
        regionSelect = document.getElementById('region-selection');
        disasterTypeButtons = document.querySelectorAll('.disaster-type-buttons button');
        analysisModeButtons = document.querySelectorAll('.analysis-mode-buttons button');
        detectionThresholdSlider = document.getElementById('detection-threshold');
        detectionThresholdValueDisplay = document.getElementById('detection-threshold-value');
        layersButtons = document.querySelectorAll('.layers-control button');
        layersPanel = document.getElementById('layers-panel');
        layerCheckboxes = layersPanel ? layersPanel.querySelectorAll('input[type="checkbox"]') : [];
        console.log("DOM elements initialized.");
    }
    
    // Call this first
    initializeDOMElements(); 

    // --- Utility Functions (show/hide spinners/errors) ---
    function showLoadingSpinner() { 
        if(loadingIndicator) loadingIndicator.style.display = 'block';
        if(errorMessageArea) errorMessageArea.style.display = 'none';
        if(runAnalysisBtn) runAnalysisBtn.disabled = true;
        if(exportReportBtn) exportReportBtn.disabled = true;
    }
    function hideLoadingSpinner() { 
        if(loadingIndicator) loadingIndicator.style.display = 'none';
        if(runAnalysisBtn) runAnalysisBtn.disabled = false;
        if(exportReportBtn) exportReportBtn.disabled = false;
    }
    function showErrorMessage(message) { 
        if(errorMessageArea) {
            errorMessageArea.textContent = message;
            errorMessageArea.style.display = 'block';
        }
    }
    function hideErrorMessage() { 
        if(errorMessageArea) {
            errorMessageArea.style.display = 'none';
        }
    }
    const escapeCSV = (text) => {
        if (text === null || text === undefined) return '';
        text = String(text);
        // If the text contains a comma, newline, or double quote, enclose it in double quotes.
        // Also, any existing double quotes within the text must be escaped by doubling them.
        if (text.includes(',') || text.includes('\n') || text.includes('"')) {
            return '"' + text.replace(/"/g, '""') + '"';
        }
        return text;
    };

    // --- Map Initialization and Updates ---
    function initMap() {
        if (document.getElementById('map')) {
            if (map !== null) { map.remove(); }
            // Use default_view coordinates for initial map setup
            map = L.map('map').setView([regionCoordinates.default_view.lat, regionCoordinates.default_view.lon], regionCoordinates.default_view.zoom);
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            }).addTo(map);
            markerLayerGroup = L.layerGroup().addTo(map);
            console.log("Map initialized successfully.");
        } else {
            console.error("Map container #map not found!");
        }
    }

    function updateMarkersFromBackend(markersData) {
        if (!markerLayerGroup || !map) {
            console.warn("Marker layer group or map not initialized. Cannot update markers from backend.");
            return;
        }
        markerLayerGroup.clearLayers();
        if (markersData && markersData.length > 0) {
            markersData.forEach(markerInfo => {
                if (markerInfo.lat && markerInfo.lon) {
                    L.marker([markerInfo.lat, markerInfo.lon])
                        .addTo(markerLayerGroup)
                        .bindPopup(markerInfo.popupText || "Damage reported");
                }
            });
            console.log("Map markers updated from backend data.");
        } else {
            console.log("No marker data received from backend or data is empty.");
        }
    }

    // --- Dashboard Update Logic ---
    function updateDashboard(data) {
        console.log("Attempting to update dashboard with data:", data);
        if (!data) {
            console.error("updateDashboard called with no data.");
            showErrorMessage("Failed to update dashboard: No data received from backend.");
            return;
        }

        // Update Analysis Results
        const lastUpdatedElement = document.getElementById('last-updated-time');
        if (lastUpdatedElement) lastUpdatedElement.textContent = data.lastUpdated || new Date().toLocaleString();

        const affectedAreaElement = document.getElementById('affected-area-value');
        if (affectedAreaElement) affectedAreaElement.textContent = data.analysis_summary?.affected_area || "N/A";
        
        const damageSeverityElement = document.getElementById('damage-severity-value');
        if (damageSeverityElement) damageSeverityElement.textContent = data.analysis_summary?.overall_damage_severity || "N/A";

        // Update Damage Classification (assuming data.damage_classification is an object)
        if (data.damage_classification) {
            for (const [type, count] of Object.entries(data.damage_classification)) {
                const element = document.getElementById(`damage-${type.toLowerCase().replace(/\s+/g, '-')}-count`);
                if (element) {
                    element.textContent = count || 0;
                } else {
                    console.warn(`Element for damage type '${type}' not found.`);
                }
            }
        }

        // Update AI Recommendations
        const recommendationsGrid = document.querySelector('.recommendations-grid');
        if (recommendationsGrid && data.ai_recommendations) {
            // Clear existing recommendations
            const priorityColumns = recommendationsGrid.querySelectorAll('.priority-column ul');
            priorityColumns.forEach(ul => ul.innerHTML = '');

            // Populate new recommendations
            data.ai_recommendations.forEach(rec => {
                let targetColumnId = 'recommendations-general'; // Default column
                if (rec.priority && typeof rec.priority === 'string') {
                     targetColumnId = `recommendations-${rec.priority.toLowerCase()}`;
                }
                const columnUl = document.getElementById(targetColumnId);
                if (columnUl) {
                    const li = document.createElement('li');
                    li.textContent = rec.text || "No recommendation text.";
                    columnUl.appendChild(li);
                } else {
                    console.warn(`Recommendation column for priority '${rec.priority}' not found.`);
                    // Optionally add to a default/general list if specific priority column isn't found
                    const generalCol = document.getElementById('recommendations-general');
                    if(generalCol){
                        const li = document.createElement('li');
                        li.textContent = `(${rec.priority || 'Unspecified'}): ${rec.text || "No recommendation text."}`;
                        generalCol.appendChild(li);
                    }
                }
            });
        }

        // Update Resource Allocation
        if (data.resource_allocation) {
            data.resource_allocation.forEach(resource => {
                const element = document.getElementById(`resource-${resource.type.toLowerCase().replace(/\s+/g, '-')}-value`);
                if (element) {
                    element.textContent = resource.recommendation || "N/A";
                } else {
                    console.warn(`Element for resource type '${resource.type}' not found.`);
                }
            });
        }

        // Update Map Markers from backend data
        if (data.map_markers) {
            updateMarkersFromBackend(data.map_markers);
        }
        console.log("Dashboard update process finished.");
    }

    // --- Event Listener Setup ---
    function setupEventListeners() {
        console.log("Setting up event listeners...");

        // Run Analysis Button
        if (runAnalysisBtn) {
            runAnalysisBtn.addEventListener('click', async () => {
                console.log("Run Analysis clicked. About to show spinner.");
                showLoadingSpinner();
                hideErrorMessage(); 

                console.log("Spinner shown. Constructing API URL.");
                const selectedRegion = regionSelect ? regionSelect.value : 'default_view';
                const selectedDisasterType = document.querySelector('.disaster-type-buttons button.active')?.dataset.type || 'flood';
                const selectedAnalysisMode = document.querySelector('.analysis-mode-buttons button.active')?.dataset.mode || 'quick';
                const detectionThreshold = detectionThresholdSlider ? detectionThresholdSlider.value : '50';

                const apiUrl = `http://127.0.0.1:5001/api/analysis_results?region=${selectedRegion}&disaster_type=${selectedDisasterType}&mode=${selectedAnalysisMode}&threshold=${detectionThreshold}`;
                console.log(`Constructed API URL: ${apiUrl}`);

                try {
                    console.log("About to fetch data from backend.");
                    const response = await fetch(apiUrl);
                    console.log("Fetch response received. Status:", response.status);

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error("Backend Error:", response.status, errorText);
                        throw new Error(`Network response was not ok: ${response.status} - ${errorText}`);
                    }
                    const data = await response.json();
                    console.log("Data successfully parsed from backend:", data);
                    updateDashboard(data);
                    console.log("Dashboard update called after successful fetch.");
                } catch (error) {
                    console.error('Error during analysis or updating dashboard:', error);
                    showErrorMessage(`Error: ${error.message}`);
                } finally {
                    console.log("Hiding spinner in finally block.");
                    hideLoadingSpinner();
                }
            });
        } else {
            console.error("Run Analysis button not found for event listener setup.");
        }

        // Region Selection Listener for map panning
        if (regionSelect && map) { // Ensure map is initialized before adding this listener
            regionSelect.addEventListener('change', (event) => {
                const selectedRegionKey = event.target.value;
                const regionData = regionCoordinates[selectedRegionKey];
                if (regionData && map) { // map check again just in case
                    console.log(`Map view changing to: ${regionData.name}`);
                    map.setView([regionData.lat, regionData.lon], regionData.zoom);
                    // Markers are now updated by updateDashboard via backend call
                } else {
                    console.warn("Selected region data not found for map pan/zoom or map not ready.");
                }
            });
        } else {
            console.warn("Region select dropdown or map not found for event listener setup.");
        }
        
        // Tab-like functionality for disaster type buttons
        if (disasterTypeButtons) {
            disasterTypeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    disasterTypeButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    console.log("Disaster type selected:", button.dataset.type);
                });
            });
        }

        // Tab-like functionality for analysis mode buttons
        if (analysisModeButtons) {
            analysisModeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    analysisModeButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    console.log("Analysis mode selected:", button.dataset.mode);
                });
            });
        }

        // Detection Threshold Slider Value Display
        if (detectionThresholdSlider && detectionThresholdValueDisplay) {
            detectionThresholdValueDisplay.textContent = detectionThresholdSlider.value + '%';
            detectionThresholdSlider.addEventListener('input', () => {
                detectionThresholdValueDisplay.textContent = detectionThresholdSlider.value + '%';
            });
        } else {
             console.warn("Detection threshold slider or value display not found for event listener setup.");
        }

        // Layers Panel Logic
        if (layersButtons.length > 0 && layersPanel && map) { // Ensure map is available
            const layersToggleButton = layersButtons[0]; // Assuming the first button is the Layers toggle
            const zoomInButton = Array.from(layersButtons).find(btn => btn.textContent.includes('+'));
            const zoomOutButton = Array.from(layersButtons).find(btn => btn.textContent.includes('-'));

            if(layersToggleButton){
                layersToggleButton.addEventListener('click', () => {
                    layersPanel.classList.toggle('hidden');
                    console.log("Layers panel toggled.");
                });
            }

            if(zoomInButton) {
                zoomInButton.addEventListener('click', () => {
                    if (map) map.zoomIn();
                    console.log("Zoom In clicked");
                });
            }
            if(zoomOutButton) {
                zoomOutButton.addEventListener('click', () => {
                    if (map) map.zoomOut();
                    console.log("Zoom Out clicked");
                });
            }
            
            // Event listeners for layer checkboxes
            if (layerCheckboxes) {
                layerCheckboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        console.log(`Layer ${checkbox.id} changed to ${checkbox.checked}`);
                        if (checkbox.id === 'detected-damage-layer') {
                            if (markerLayerGroup && map) markerLayerGroup.addTo(map);
                            console.log("Detected Damage Layer shown.");
                        } else {
                            if (markerLayerGroup && map) markerLayerGroup.removeFrom(map);
                            console.log("Detected Damage Layer hidden.");
                        }
                        // Add more layer controls here as needed
                    });
                });
            }
        } else {
            console.warn("Layers controls, panel, or map not found for event listener setup.");
        }

        // Export Report Functionality
        if (exportReportBtn) {
            exportReportBtn.addEventListener('click', () => {
                const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
                const filename = `DisasterSight_Report_${timestamp}.csv`;
                let csvContent = "data:text/csv;charset=utf-8,";
                
                csvContent += "Section,Parameter,Value\n";
                csvContent += "Analysis Summary,Report Generated,"+escapeCSV(new Date().toLocaleString())+"\n";
                document.querySelectorAll('.analysis-results .result-item').forEach(item => {
                    const label = item.children[0] ? item.children[0].textContent.trim() : '';
                    let value = item.children[item.children.length -1] ? item.children[item.children.length -1].textContent.trim() : '';
                    if (label && value) {
                        csvContent += "Analysis Summary,"+escapeCSV(label)+","+escapeCSV(value)+"\n";
                    }
                });
                csvContent += "\n"; 

                csvContent += "Section,Damage Type,Count\n";
                document.querySelectorAll('.damage-classification .classification-item').forEach(item => {
                    const type = item.children[0] ? item.children[0].textContent.trim() : '';
                    const count = item.children[1] ? item.children[1].textContent.trim() : '';
                    if (type && count) {
                        csvContent += "Damage Classification,"+escapeCSV(type)+","+escapeCSV(count)+"\n";
                    }
                });
                csvContent += "\n";

                csvContent += "Section,Priority,Recommendation\n";
                document.querySelectorAll('.recommendations-grid .priority-column').forEach(column => {
                    const priorityTitle = column.querySelector('h3') ? column.querySelector('h3').textContent.trim().replace(" Priority","") : 'General';
                    column.querySelectorAll('li').forEach(item => {
                        csvContent += "AI Recommendations,"+escapeCSV(priorityTitle)+","+escapeCSV(item.textContent.trim())+"\n";
                    });
                });
                csvContent += "\n";

                csvContent += "Section,Resource,Recommendation\n";
                document.querySelectorAll('.resource-allocation .resource-item').forEach(item => {
                    const resourceName = item.children[0] ? item.children[0].textContent.trim() : '';
                    const resourceValue = item.children[2] ? item.children[2].textContent.trim() : ''; 
                    if (resourceName && resourceValue) {
                        csvContent += "Resource Allocation,"+escapeCSV(resourceName)+","+escapeCSV(resourceValue)+"\n";
                    }
                });
                csvContent += "\n";

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', filename);
                document.body.appendChild(link); 
                link.click();
                document.body.removeChild(link);
                console.log("Report exported.");
            });
        } else {
            console.error("Export Report button not found for event listener setup.");
        }
        console.log("Event listeners setup complete.");
    }

    // --- Main Initialization Flow ---
    initMap();             
    setupEventListeners(); 

    console.log('DisasterSight AI frontend initialized comprehensively.');
}); 