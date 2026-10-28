class Sensor:
    def __init__(self, name, channel, min_value, max_value, unit):
        self.name = name
        self.channel = channel
        self.min_value = min_value
        self.max_value = max_value
        self.unit = unit

    def current_to_value(self, current):
        """
        Convert 4-20mA to engineering units
        """

        value = (
            (current - 4)
            / 16
            * (self.max_value - self.min_value)
            + self.min_value
        )

        return round(value, 2)

    def read(self):
        raise NotImplementedError
    
    def get_channel(self):
        return self.channel
    def get_name(self):
        return self.name
    def get_unit(self):
        return self.unit