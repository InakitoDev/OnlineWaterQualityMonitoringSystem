import board
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn


RESISTOR_VALUE = 165  # RISISTOR VALUE IN OHMS

# ADS1115 initialization
i2c = board.I2C()
ads = ADS.ADS1115(i2c)

# Channels initialization
ch0 = AnalogIn(ads, 0)
ch1 = AnalogIn(ads, 1)
ch2 = AnalogIn(ads, 2)
ch3 = AnalogIn(ads, 3)


def voltage_to_current(voltage):
    """
    Convert voltage to current (mA)
    when using a 165Ω resistor
    """

    current = (voltage / RESISTOR_VALUE) * 1000
    return current


def read_current(channel):
    """
    Read current from an ADS1115 channel
    """

    voltage = channel.voltage
    return voltage_to_current(voltage)