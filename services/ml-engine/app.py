from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Guardian Shield Backend is running"})

@app.route('/api/scan/phishing', methods=['POST'])
def scan_phishing():
    data = request.json
    url = data.get('url', '')
    # Mock logic for demo
    if "malicious" in url or "fake" in url:
        return jsonify({"safe": False, "reason": "Phishing attempt detected! Known malicious pattern."})
    return jsonify({"safe": True, "message": "URL appears safe."})

if __name__ == '__main__':
    app.run(debug=True, port=5000)