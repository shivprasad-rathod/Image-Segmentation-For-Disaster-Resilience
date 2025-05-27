from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json # For more complex JSON structures if needed
import time # To simulate processing delay

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)  # This will enable CORS for all routes

# Sample data (mimicking what your frontend expects or what AI might produce)
# This would eventually come from your AI model and data processing logic
dummy_analysis_data = {
    "coastal_city": {
        "analysis_summary": {
            "affected_area": "Approx. 15 sq km",
            "overall_damage_severity": "75%",
            "confidence_score": "92%", # Kept for completeness if UI uses it
            "detected_incidents": 120   # Kept for completeness
        },
        "damage_classification": {
            "buildings_damaged": 75,
            "roads_blocked": 30,
            "flooded_areas": 40,
            "population_at_risk": 1500
        },
        "ai_recommendations": [
            {"priority": "high", "text": "Evacuate Zone A immediately due to structural collapse risk."},
            {"priority": "high", "text": "Deploy emergency water pumps to Main Street and Ocean Drive."},
            {"priority": "medium", "text": "Set up temporary shelters at City Hall and North Park."},
            {"priority": "medium", "text": "Request National Guard assistance for search and rescue."},
            {"priority": "low", "text": "Monitor dam integrity upstream."},
            {"priority": "general", "text": "Establish a public hotline for information dissemination."}
        ],
        "resource_allocation": [
            {"type": "medical_teams", "recommendation": "Deploy 3 additional teams to coastal_city_west."},
            {"type": "shelter_capacity", "recommendation": "Increase by 500 beds at coastal_city_north_shelter."},
            {"type": "food_water_supplies", "recommendation": "Distribute 2000 emergency kits."}
        ],
        "map_markers": [
            {"lat": 12.9750, "lon": 77.6000, "popupText": "Severe flooding reported at MG Road."},
            {"lat": 12.9700, "lon": 77.5900, "popupText": "Building collapse near Cubbon Park - Critical."},
            {"lat": 12.9650, "lon": 77.5850, "popupText": "Road blocked at Trinity Circle."}
        ],
        "lastUpdated": "Not available yet" # This will be updated by the API
    },
    "mountain_valley": {
        "analysis_summary": {
            "affected_area": "Approx. 25 sq km (landslides)",
            "overall_damage_severity": "60%",
            "confidence_score": "88%",
            "detected_incidents": 45
        },
        "damage_classification": {
            "landslides_major": 5,
            "roads_blocked": 12,
            "bridges_damaged": 2,
            "communication_down": 3
        },
        "ai_recommendations": [
            {"priority": "high", "text": "Air-lift supplies to cut-off villages (Upper Valley, West Ridge)."},
            {"priority": "high", "text": "Clear debris from Highway 1 immediately."},
            {"priority": "medium", "text": "Inspect all bridges for structural integrity."},
            {"priority": "low", "text": "Monitor weather for further landslide risk."}
        ],
        "resource_allocation": [
            {"type": "heavy_machinery", "recommendation": "Send 2 excavators to mountain_valley_pass."},
            {"type": "communication_repair", "recommendation": "Dispatch 1 team to restore cell towers."}
        ],
        "map_markers": [
            {"lat": 34.0800, "lon": 74.8000, "popupText": "Major landslide on NH1 near Dal Lake."},
            {"lat": 34.0900, "lon": 74.7950, "popupText": "Bridge damaged at River Crossing X."}
        ],
        "lastUpdated": "Not available yet"
    },
    # Add similar structured data for desert_oasis and urban_center
    "desert_oasis": {
        "analysis_summary": {
            "affected_area": "Approx. 5 sq km (sandstorm)",
            "overall_damage_severity": "40%",
            "confidence_score": "90%",
            "detected_incidents": 15
        },
        "damage_classification": {
            "visibility_reduced": 10, # Arbitrary scale
            "structures_sand_damage": 5,
            "water_sources_affected": 2
        },
        "ai_recommendations": [
            {"priority": "high", "text": "Advise residents to stay indoors."},
            {"priority": "medium", "text": "Check on vulnerable populations, provide water if needed."},
            {"priority": "low", "text": "Assess damage to agricultural areas after storm."}
        ],
        "resource_allocation": [
            {"type": "water_tankers", "recommendation": "Position 2 tankers near oasis_center."},
            {"type": "medical_teams", "recommendation": "1 team on standby for respiratory issues."}
        ],
        "map_markers": [
            {"lat": 26.9150, "lon": 70.9200, "popupText": "Sandstorm warning: Low visibility reported."},
            {"lat": 26.9100, "lon": 70.9250, "popupText": "Water source potentially contaminated."}
        ],
        "lastUpdated": "Not available yet"
    },
    "urban_center": {
        "analysis_summary": {
            "affected_area": "Approx. 10 sq km (civil unrest)",
            "overall_damage_severity": "55%",
            "confidence_score": "85%",
            "detected_incidents": 200
        },
        "damage_classification": {
            "property_damage": 150,
            "roads_barricaded": 20,
            "public_transport_disrupted": 5
        },
        "ai_recommendations": [
            {"priority": "high", "text": "Increase security presence in downtown and market square."},
            {"priority": "medium", "text": "Advise public to avoid affected areas."},
            {"priority": "medium", "text": "Facilitate dialogue between involved parties."},
            {"priority": "low", "text": "Monitor social media for misinformation."}
        ],
        "resource_allocation": [
            {"type": "security_personnel", "recommendation": "Deploy 100 additional officers to urban_center_hotspots."},
            {"type": "emergency_transport", "recommendation": "Arrange 5 buses for evacuations if needed."}
        ],
        "map_markers": [
            {"lat": 19.0790, "lon": 72.8700, "popupText": "Protest reported at Andheri Station."},
            {"lat": 19.0700, "lon": 72.8800, "popupText": "Roadblock at Bandra Junction."}
        ],
        "lastUpdated": "Not available yet"
    },
    "default_view": { # For when no specific region is selected or on initial load
        "analysis_summary": {
            "affected_area": "N/A",
            "overall_damage_severity": "N/A",
            "confidence_score": "N/A",
            "detected_incidents": "N/A"
        },
        "damage_classification": {
            "buildings_damaged": "N/A",
            "roads_blocked": "N/A"
        },
        "ai_recommendations": [
            {"priority": "general", "text": "Select a region and disaster type to begin analysis."}
        ],
        "resource_allocation": [
            {"type": "medical_teams", "recommendation": "N/A"}
        ],
        "map_markers": [
            {"lat": 20.5937, "lon": 78.9629, "popupText": "India Overview. Please select a region."}
        ],
        "lastUpdated": "N/A"
    }
}

@app.route('/')
def serve_index():
    # Serves index.html from the static_folder (which is now '.')
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/analysis_results', methods=['GET'])
def get_analysis_results():
    # In a real app, you'd get parameters like region, disaster_type from the request
    # e.g., region = request.args.get('region', default='coastal_city', type=str)
    region_key = request.args.get('region', default='coastal_city')
    analysis_mode = request.args.get('mode', default='quick_scan') # Example

    print(f"Received request for region: {region_key}, mode: {analysis_mode}")

    # Simulate some processing time based on analysis_mode
    if analysis_mode == 'deep_analysis':
        time.sleep(2.5) # Longer delay for deep analysis
    else:
        time.sleep(0.5) # Shorter delay for quick scan

    data_to_return = dummy_analysis_data.get(region_key)

    if data_to_return:
        # Update timestamp for freshness
        data_to_return["lastUpdated"] = time.strftime("%A, %B %d, %Y %I:%M:%S %p")
        return jsonify(data_to_return)
    else:
        return jsonify({"error": "Data not found for the specified region"}), 404

if __name__ == '__main__':
    # Note: For development, debug=True is fine. For production, use a proper WSGI server.
    app.run(debug=True, port=5001) # Running on port 5001 to avoid conflict if 5000 is in use 