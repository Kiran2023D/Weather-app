from flask import Flask, render_template, request
import requests
import var
import os

app = Flask(__name__)

def get_weather(api_key, city):
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        'q': city,
        'appid': api_key,
        'units': 'metric'
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        if response.status_code == 200:
            return data
        else:
            return None
    except Exception as e:
        print("Error:", e)
        return None

@app.route('/', methods=['GET', 'POST'])
def index():
    weather_data = None
    if request.method == 'POST':
        city = request.form['city']
        api_key = var.key
        weather_data = get_weather(api_key, city)
    return render_template('index.html', weather_data=weather_data)

from datetime import datetime

@app.template_filter('datetimefilter')
def datetimefilter(timestamp):
    return datetime.fromtimestamp(timestamp).strftime('%I:%M %p')

if __name__ == "__main__":
    # app.run(debug=True, port=5000)
    #app.run(port=int(os.environ.get("PORT", 8080)), host='0.0.0.0', debug=True)
    app.run(port=5000, host='127.0.0.1', debug=True)


