import json
import time

from database.water_monitor_database import create_database
from datalogger import DataLogger

from sensors import TemperatureSensor, PHSensor, OxygenSensor

from services.measurementservice import MeasurementService
from services.alarmservice import AlarmService
from services.configurationservice import ConfigurationService


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



configuration_service = ConfigurationService()


temperature_sensor, ph_sensor, oxygen_sensor = setup_sensors(configuration_service.config)

create_database()
logger = DataLogger()

alarm_service = AlarmService(configuration_service.config)

measurement_service = MeasurementService(temperature_sensor, ph_sensor, oxygen_sensor, logger)

while True:

    measurement = measurement_service.collect_measurement()
    alarms = alarm_service.check_all(measurement["temperature"], measurement["ph"], measurement["oxygen"])
    
    print(measurement)
    print(alarms)

    time.sleep(60)

