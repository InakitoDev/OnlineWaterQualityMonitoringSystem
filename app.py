"""Flask dashboard for the water quality monitor."""
import threading

from flask import Flask, jsonify, render_template, request

from database.water_monitor_database import (
    create_database,
    get_alarm_history,
    get_latest_measurements,
)
from datalogger import DataLogger
from sensors import OxygenSensor, PHSensor, TemperatureSensor
from services.alarmservice import AlarmService
from services.configurationservice import ConfigurationService

app = Flask(__name__, template_folder="web/templates", static_folder="web/static")
configuration = ConfigurationService("config.json")
alarm_service = AlarmService(configuration.config)
create_database()
_sensor_lock = threading.Lock()
_collector_start_lock = threading.Lock()
_collector_started = False


def build_sensors():
    config = configuration.config
    return (
        TemperatureSensor("Temperature", config["temperature"]["channel"], config["temperature"]["min"], config["temperature"]["max"], config["temperature"]["unit"]),
        PHSensor("pH", config["ph"]["channel"], config["ph"]["min"], config["ph"]["max"], config["ph"]["unit"]),
        OxygenSensor("Oxygen", config["oxygen"]["channel"], config["oxygen"]["min"], config["oxygen"]["max"], config["oxygen"]["unit"]),
    )


def dashboard_data():
    return {
        "measurements": get_latest_measurements(100),
        "alarms": get_alarm_history(20),
        "config": configuration.config,
    }


def collect_sensor_reading():
    """Read and persist one set of values, serializing ADC access."""
    from services.measurementservice import MeasurementService

    with _sensor_lock:
        service = MeasurementService(*build_sensors(), DataLogger())
        reading = service.collect_measurement()
        if reading is not None:
            alarm_service.check_all(
                reading["temperature"], reading["ph"], reading["oxygen"]
            )
        return reading


def _sensor_collection_loop():
    """Collect continuously while the Flask process is running."""
    while True:
        try:
            reading = collect_sensor_reading()
            if reading is None:
                app.logger.error("Automatic sensor reading failed")
        except Exception:
            app.logger.exception("Automatic sensor reading failed")
        # Wait after each attempt so errors do not create a tight retry loop.
        threading.Event().wait(60)


@app.before_request
def ensure_sensor_collection_running():
    """Start one collector on first access, including under Flask's reloader."""
    global _collector_started
    if _collector_started:
        return
    with _collector_start_lock:
        if not _collector_started:
            thread = threading.Thread(
                target=_sensor_collection_loop,
                name="water-sensor-collector",
                daemon=True,
            )
            thread.start()
            _collector_started = True


@app.get("/")
def dashboard():
    return render_template("dashboard.html", **dashboard_data())


@app.get("/api/dashboard")
def api_dashboard():
    data = dashboard_data()
    return jsonify({
        "measurements": [dict(id=r[0], timestamp=r[1], temperature=r[2], ph=r[3], oxygen=r[4]) for r in reversed(data["measurements"])],
        "alarms": [dict(id=r[0], timestamp=r[1], sensor=r[2], value=r[3], status=r[4]) for r in data["alarms"]],
        "config": data["config"],
    })


@app.post("/api/measure")
def measure_now():
    """Read the configured physical sensors once and persist the result."""
    try:
        reading = collect_sensor_reading()
        if reading is None:
            return jsonify(error="Sensor reading failed. Check the ADC connection and sensor wiring."), 503
        return jsonify(reading), 201
    except Exception as error:
        app.logger.exception("Unable to read sensors")
        return jsonify(error=str(error)), 503


@app.post("/api/config")
def save_config():
    payload = request.get_json(silent=True) or request.form
    updated = {}
    try:
        for key in ("temperature", "ph", "oxygen"):
            low, high = float(payload[f"{key}_min"]), float(payload[f"{key}_max"])
            if low >= high:
                raise ValueError(f"{key}: minimum must be lower than maximum")
            updated[key] = (low, high)
        original = {key: dict(configuration.config[key]) for key in updated}
        try:
            for key, (low, high) in updated.items():
                configuration.update_sensor_range(key, low, high)
        except Exception:
            configuration.config.update(original)
            configuration.save()
            raise
        return jsonify(message="Sensor ranges saved", config=configuration.config)
    except (KeyError, TypeError, ValueError) as error:
        return jsonify(error=str(error)), 400


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
