import json


class ConfigurationService:

    def __init__(self, config_file="config.json"):
        self.config_file = config_file
        self.config = self.load()
        self.validate()

    def load(self):
        """
        Load configuration from file.
        """

        with open(self.config_file, "r") as file:
            return json.load(file)

    def save(self):
        """
        Save current configuration.
        """

        with open(self.config_file, "w") as file:
            json.dump(
                self.config,
                file,
                indent=4
            )

    def reload(self):
        """
        Reload configuration from disk.
        """

        self.config = self.load()

    def get_sensor_config(self, sensor_name):

        return self.config[sensor_name]

    def get_alarm_limits(self, sensor_name):

        sensor = self.config[sensor_name]

        return {
            "low": sensor["alarm_low"],
            "high": sensor["alarm_high"]
        }

    def update_sensor_range(self, sensor_name, minimum, maximum):

        self.config[sensor_name]["min"] = minimum
        self.config[sensor_name]["max"] = maximum

        self.save()

    def update_alarm_limits(self, sensor_name, low, high):

        self.config[sensor_name]["alarm_low"] = low
        self.config[sensor_name]["alarm_high"] = high

        self.save()
    
    def validate(self):

        for sensor_name, sensor in self.config.items():

            if sensor["min"] >= sensor["max"]:
                raise ValueError(f"{sensor_name}: min must be lower than max")

            if sensor["alarm_low"] >= sensor["alarm_high"]:
                raise ValueError(f"{sensor_name}: invalid alarm limits")

        return True