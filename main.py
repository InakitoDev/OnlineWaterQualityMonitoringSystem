import json

from sensors.temperaturesensor import TemperatureSensor
from sensors.phsensor import PHSensor
from sensors.oxygensensor import OxygenSensor

with open("config.json") as file:
    config = json.load(file)

temp = TemperatureSensor(
    "Temperature",
    0,
    config["temperature"]["min"],
    config["temperature"]["max"],
    config["temperature"]["unit"]
)

ph = PHSensor(
    "pH",
    1,
    config["ph"]["min"],
    config["ph"]["max"],
    config["ph"]["unit"]
)

oxygen = OxygenSensor(
    "Oxygen",
    2,
    config["oxygen"]["min"],
    config["oxygen"]["max"],
    config["oxygen"]["unit"]
)

# Example currents

temp_current = 12
ph_current = 11
oxygen_current = 15

print(
    f"Temperature: {temp.read(temp_current)} "
    f"{temp.unit}"
)

print(
    f"pH: {ph.read(ph_current)} "
    f"{ph.unit}"
)

print(
    f"Oxygen: {oxygen.read(oxygen_current)} "
    f"{oxygen.unit}"
)