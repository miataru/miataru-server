import unittest
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

from extract_miataru_gpx import (
    GPX_NS,
    MIATARU_EXT_NS,
    build_gpx,
    extract_points_from_response,
    filter_points,
    normalize_miataru_timestamp,
    parse_local_datetime,
)


class UnitTests(unittest.TestCase):
    def test_parse_local_datetime_valid(self):
        dt1 = parse_local_datetime("2026-03-03 10:15")
        dt2 = parse_local_datetime("2026-03-03 10:15:30")
        self.assertEqual(dt1.year, 2026)
        self.assertEqual(dt1.minute, 15)
        self.assertEqual(dt2.second, 30)
        self.assertIsNotNone(dt1.tzinfo)

    def test_parse_local_datetime_invalid(self):
        with self.assertRaises(ValueError):
            parse_local_datetime("03/03/2026 10:15")

    def test_normalize_timestamp_seconds(self):
        dt = normalize_miataru_timestamp("1441360863")
        self.assertEqual(int(dt.timestamp()), 1441360863)

    def test_normalize_timestamp_milliseconds(self):
        dt = normalize_miataru_timestamp("1441360863000")
        self.assertEqual(int(dt.timestamp()), 1441360863)

    def test_extract_points_skips_invalid(self):
        response = {
            "MiataruLocation": [
                {
                    "Device": "A",
                    "Timestamp": "1700000000",
                    "Latitude": "48.1",
                    "Longitude": "11.6",
                    "Altitude": "501.2",
                    "Speed": "3.5",
                    "HorizontalAccuracy": "5.0",
                    "BatteryLevel": "81",
                },
                {
                    "Device": "A",
                    "Timestamp": "bad",
                    "Latitude": "48.1",
                    "Longitude": "11.6",
                },
            ]
        }
        points = extract_points_from_response(response)
        self.assertEqual(len(points), 1)
        self.assertEqual(points[0]["device"], "A")
        self.assertAlmostEqual(points[0]["altitude"], 501.2)

    def test_filter_points_inclusive(self):
        points = [
            {"time": datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc), "lat": 1.0, "lon": 2.0},
            {"time": datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc), "lat": 1.1, "lon": 2.1},
            {"time": datetime(2026, 1, 1, 14, 0, tzinfo=timezone.utc), "lat": 1.2, "lon": 2.2},
        ]
        start = datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc)
        end = datetime(2026, 1, 1, 14, 0, tzinfo=timezone.utc)
        filtered = filter_points(points, start, end)
        self.assertEqual(len(filtered), 2)
        self.assertEqual(filtered[0]["time"], start)
        self.assertEqual(filtered[1]["time"], end)

    def test_build_gpx_structure_and_optional_fields(self):
        points = [
            {
                "device": "A",
                "time": datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
                "lat": 48.1234,
                "lon": 11.5678,
                "altitude": 500.2,
                "speed": 4.5,
                "horizontal_accuracy": 3.2,
                "battery_level": 77.0,
            },
            {
                "device": "A",
                "time": datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc),
                "lat": 48.2234,
                "lon": 11.6678,
            },
        ]
        xml_text = build_gpx(points, {"name": "UnitTest", "creator": "unittest"})
        root = ET.fromstring(xml_text)

        ns = {"g": GPX_NS, "m": MIATARU_EXT_NS}
        self.assertEqual(root.tag, f"{{{GPX_NS}}}gpx")
        self.assertEqual(root.attrib.get("creator"), "unittest")

        trk = root.find("g:trk", ns)
        self.assertIsNotNone(trk)
        trkseg = root.find("g:trk/g:trkseg", ns)
        self.assertIsNotNone(trkseg)

        trkpts = root.findall(".//g:trkpt", ns)
        self.assertEqual(len(trkpts), 2)
        self.assertIn("lat", trkpts[0].attrib)
        self.assertIn("lon", trkpts[0].attrib)
        self.assertIsNotNone(trkpts[0].find("g:time", ns))

        speed_node = trkpts[0].find("g:extensions/m:speed", ns)
        self.assertIsNotNone(speed_node)
        self.assertIsNone(trkpts[1].find("g:extensions", ns))


if __name__ == "__main__":
    unittest.main()
