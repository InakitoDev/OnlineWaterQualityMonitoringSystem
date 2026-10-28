class AlarmService:

    def __init__(self, config):
        self.config = config

    def check_alarm(self, sensor_name, value):
        sensor_config = self.config[sensor_name]

        low_limit = sensor_config["alarm_low"]
        high_limit = sensor_config["alarm_high"]

        if value < low_limit:
            return {"sensor": sensor_name, "value": value, "status": "LOW"}

        if value > high_limit:
            return {"sensor": sensor_name, "value": value, "status": "HIGH"}

        return None

    def check_all(self, temperature, ph, oxygen):

        alarms = []

        temp_alarm = self.check_alarm("temperature", temperature)

        ph_alarm = self.check_alarm("ph", ph)

        oxygen_alarm = self.check_alarm("oxygen", oxygen)

        if temp_alarm:
            alarms.append(temp_alarm)

        if ph_alarm:
            alarms.append(ph_alarm)

        if oxygen_alarm:
            alarms.append(oxygen_alarm)

        return alarms