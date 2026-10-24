from sensors.sensor import Sensor


class TemperatureSensor(Sensor):

    def read(self, current):
        return self.current_to_value(current)