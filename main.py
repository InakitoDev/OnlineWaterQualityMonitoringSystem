import json
import time

from database.water_monitor_database import create_database
from datalogger import DataLogger

from sensors import TemperatureSensor, PHSensor, OxygenSensor

from services.measurementservice import MeasurementService




#region configuration from config.json and initialize sensors

with open("config.json") as file:
    config = json.load(file)



def setup_sensors(config):
    """Initialize sensors using the configuration."""
    temperature_sensor = TemperatureSensor(
        "Temperature",
        config["temperature"]["channel"],
        config["temperature"]["min"],
        config["temperature"]["max"],
        config["temperature"]["unit"]
    )

    ph_sensor = PHSensor(
        "pH",
        config["ph"]["channel"],
        config["ph"]["min"],
        config["ph"]["max"],
        config["ph"]["unit"]
    )

    oxygen_sensor = OxygenSensor(
        "Oxygen",
        config["oxygen"]["channel"],
        config["oxygen"]["min"],
        config["oxygen"]["max"],
        config["oxygen"]["unit"]
    )

    return temperature_sensor, ph_sensor, oxygen_sensor
#endregion

temperature_sensor, ph_sensor, oxygen_sensor = setup_sensors(config)

create_database()
logger = DataLogger()


service = MeasurementService(temperature_sensor, ph_sensor, oxygen_sensor, logger)

while True:

    measurement = service.collect_measurement()
    
    print(measurement)

    time.sleep(60)

