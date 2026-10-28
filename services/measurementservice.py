from hardware.adc import ADCReader

class MeasurementService:

    def __init__(self, temperature_sensor, ph_sensor, oxygen_sensor, logger):
        self.temperature_sensor = temperature_sensor
        self.ph_sensor = ph_sensor
        self.oxygen_sensor = oxygen_sensor
        self.logger = logger
        self.adc = ADCReader()

    def collect_measurement(self):

        try:

            temperature_current = self.adc.read_current(self.temperature_sensor.get_channel())
            ph_current = self.adc.read_current(self.ph_sensor.get_channel())
            oxygen_current = self.adc.read_current(self.oxygen_sensor.get_channel())

            temperature = self.temperature_sensor.read(temperature_current)

            ph = self.ph_sensor.read(ph_current)

            oxygen = self.oxygen_sensor.read(oxygen_current)

            self.logger.save_measurement(temperature, ph, oxygen)
     
            return {
                "temperature": temperature,
                "ph": ph,
                "oxygen": oxygen
            }

        except Exception as error:

            print(f"Measurement Error: {error}")

            return None