import tempfile
import unittest
from unittest import mock

from extract_miataru_gpx import run_cli


class CLILocalTests(unittest.TestCase):
    def test_cli_argument_error_returns_2(self):
        exit_code = run_cli([])
        self.assertEqual(exit_code, 2)

    def test_start_greater_than_end_returns_2(self):
        with tempfile.NamedTemporaryFile(suffix=".gpx") as tmp:
            args = [
                "webclient",
                "",
                "BF0160F5-4138-402C-A5F0-DEB1AA1F4216",
                tmp.name,
                "--start",
                "2026-03-03 11:00:00",
                "--end",
                "2026-03-03 10:00:00",
            ]
            exit_code = run_cli(args)
        self.assertEqual(exit_code, 2)

    @mock.patch("extract_miataru_gpx.fetch_history")
    def test_api_error_payload_returns_3(self, mock_fetch_history):
        mock_fetch_history.return_value = {"error": "Forbidden"}
        with tempfile.NamedTemporaryFile(suffix=".gpx") as tmp:
            args = [
                "webclient",
                "",
                "BF0160F5-4138-402C-A5F0-DEB1AA1F4216",
                tmp.name,
            ]
            exit_code = run_cli(args)
        self.assertEqual(exit_code, 3)

    @mock.patch("pathlib.Path.write_text", side_effect=OSError("disk full"))
    @mock.patch("extract_miataru_gpx.fetch_history")
    def test_file_write_error_returns_4(self, mock_fetch_history, _mock_write):
        mock_fetch_history.return_value = {
            "MiataruLocation": [
                {
                    "Device": "A",
                    "Timestamp": "1700000000",
                    "Latitude": "48.1",
                    "Longitude": "11.6",
                }
            ]
        }
        args = [
            "webclient",
            "",
            "BF0160F5-4138-402C-A5F0-DEB1AA1F4216",
            "dummy.gpx",
        ]
        exit_code = run_cli(args)
        self.assertEqual(exit_code, 4)


if __name__ == "__main__":
    unittest.main()
