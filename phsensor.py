from sensor import Sensor


class PHSensor(Sensor):

    def read(self, current):
        return self.current_to_value(current)