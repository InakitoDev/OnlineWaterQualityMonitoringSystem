from database.water_monitor_database import insert_measurement
from datetime import datetime


class DataLogger:

    def __init__(self):
        print("DataLogger initialized")

    def save_measurement(self, temperature, ph, oxygen):    

        insert_measurement(temperature, ph, oxygen)

        print(
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] "
            f"Temperature= {temperature:.2f} °C | "
            f"pH= {ph:.2f} | "
            f"O2= {oxygen:.2f} mg/L"
        )