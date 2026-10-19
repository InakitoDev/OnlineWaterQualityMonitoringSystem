from sensor import Sensor


class OxygenSensor(Sensor):

    def read(self, current):
        return self.current_to_value(current)