from database.water_monitor_database import insert_alarm


class AlarmService:

    def __init__(self, config):
        self.config = config

        # Actieve alarmen
        self.active_alarms = set()

    def check_alarm(self, sensor_name, value):
        sensor_config = self.config[sensor_name]

        low_limit = sensor_config["alarm_low"]
        high_limit = sensor_config["alarm_high"]

        low_key = f"{sensor_name}_LOW"
        high_key = f"{sensor_name}_HIGH"

        # LOW alarm
        if value < low_limit:

            if low_key not in self.active_alarms:

                self.active_alarms.add(low_key)

                insert_alarm(sensor_name, value, "LOW")

                return {"sensor": sensor_name, "value": value, "status": "LOW"}

            return None

        elif low_key in self.active_alarms:

            self.active_alarms.remove(low_key)

            insert_alarm(sensor_name, value, "NORMALIZED")

        # HIGH alarm
        if value > high_limit:

            if high_key not in self.active_alarms:

                self.active_alarms.add(high_key)

                insert_alarm(sensor_name, value, "HIGH")

                return {"sensor": sensor_name, "value": value, "status": "HIGH"}

            return None

        elif high_key in self.active_alarms:

            self.active_alarms.remove(high_key)

            insert_alarm(sensor_name, value, "NORMALIZED")

        return None