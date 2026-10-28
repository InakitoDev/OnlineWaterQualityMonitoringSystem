import board
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn


RESISTOR_VALUE = 165  # Resistance in ohms


class ADCReader:
    def __init__(self):
        # Initialize I2C and ADS1115
        self.i2c = board.I2C()
        self.ads = ADS.ADS1115(self.i2c)

        # Initialize the four analog input channels
        self.channels = {
            0: AnalogIn(self.ads, 0),
            1: AnalogIn(self.ads, 1),
            2: AnalogIn(self.ads, 2),
            3: AnalogIn(self.ads, 3),
        }

        
    def voltage_to_current(self, voltage):
        """Convert voltage to current in milliamps."""
        return (voltage / RESISTOR_VALUE) * 1000

    def read_current(self, channel):
        """Read current in milliamps from an ADC channel."""
        if channel not in self.channels:
            raise ValueError(
                f"Invalid ADC channel {channel}. Use 0, 1, 2, or 3."
            )

        voltage = self.channels[channel].voltage
        return self.voltage_to_current(voltage)

    def read_voltage(self, channel):
        """Read voltage from an ADC channel."""
        if channel not in self.channels:
            raise ValueError(
                f"Invalid ADC channel {channel}. Use 0, 1, 2, or 3."
            )

        return self.channels[channel].voltage