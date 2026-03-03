import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
import xml.etree.ElementTree as ET

from extract_miataru_gpx import GPX_NS


RUN_LIVE = os.getenv("LIVE_MIATARU_TESTS") == "1"
ROOT_DIR = Path(__file__).resolve().parents[1]
SCRIPT_PATH = ROOT_DIR / "extract_miataru_gpx.py"


@unittest.skipUnless(RUN_LIVE, "Set LIVE_MIATARU_TESTS=1 to run live server tests.")
class LiveServerLoopTests(unittest.TestCase):
    OWN_DEVICE_ID = "webclient"
    OWN_DEVICE_KEY = ""
    TARGET_DEVICE_ID = "BF0160F5-4138-402C-A5F0-DEB1AA1F4216"
    MAX_RETRIES = 2

    @classmethod
    def setUpClass(cls):
        try:
            cls.loops = max(1, int(os.getenv("MIATARU_LIVE_LOOPS", "3")))
        except ValueError:
            cls.loops = 3

    def _run_once(self, extra_args=None):
        with tempfile.NamedTemporaryFile(suffix=".gpx", delete=False) as tmp:
            output_file = tmp.name

        cmd = [
            sys.executable,
            str(SCRIPT_PATH),
            self.OWN_DEVICE_ID,
            self.OWN_DEVICE_KEY,
            self.TARGET_DEVICE_ID,
            output_file,
        ]
        if extra_args:
            cmd.extend(extra_args)

        completed = subprocess.run(
            cmd,
            cwd=str(ROOT_DIR),
            text=True,
            capture_output=True,
            check=False,
        )
        return completed, output_file

    def _is_transient_failure(self, completed):
        text = f"{completed.stdout}\n{completed.stderr}".lower()
        transient_markers = (
            "timed out",
            "timeout",
            "network error",
            "temporary",
            "connection reset",
            "connection refused",
            "http 500",
            "http 502",
            "http 503",
            "http 504",
            "bad gateway",
            "gateway timeout",
            "service unavailable",
        )
        return completed.returncode == 3 and any(marker in text for marker in transient_markers)

    def _run_with_retries(self, extra_args=None):
        last_result = None
        for attempt in range(self.MAX_RETRIES + 1):
            completed, output_file = self._run_once(extra_args=extra_args)
            if completed.returncode == 0:
                return completed, output_file

            last_result = (completed, output_file)
            if attempt < self.MAX_RETRIES and self._is_transient_failure(completed):
                Path(output_file).unlink(missing_ok=True)
                time.sleep(0.5 * (attempt + 1))
                continue
            return completed, output_file

        return last_result

    def _assert_valid_gpx_schema(self, output_file):
        ns = {"g": GPX_NS}
        root = ET.parse(output_file).getroot()
        self.assertEqual(root.tag, f"{{{GPX_NS}}}gpx")

        trk = root.find("g:trk", ns)
        self.assertIsNotNone(trk, "Missing gpx/trk")
        trkseg = root.find("g:trk/g:trkseg", ns)
        self.assertIsNotNone(trkseg, "Missing gpx/trk/trkseg")

        for trkpt in root.findall(".//g:trkpt", ns):
            self.assertIn("lat", trkpt.attrib)
            self.assertIn("lon", trkpt.attrib)
            self.assertIsNotNone(trkpt.find("g:time", ns))

        return root

    def test_live_e2e_loop_with_server(self):
        for index in range(self.loops):
            completed, output_file = self._run_with_retries()
            try:
                self.assertEqual(
                    completed.returncode,
                    0,
                    msg=f"Loop {index + 1}/{self.loops} failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}",
                )
                self._assert_valid_gpx_schema(output_file)
            finally:
                Path(output_file).unlink(missing_ok=True)

    def test_live_future_filter_returns_empty_track(self):
        completed, output_file = self._run_with_retries(
            extra_args=[
                "--start",
                "2100-01-01 00:00:00",
                "--end",
                "2100-01-02 00:00:00",
            ]
        )
        try:
            self.assertEqual(
                completed.returncode,
                0,
                msg=f"Future filter live test failed.\nSTDOUT:\n{completed.stdout}\nSTDERR:\n{completed.stderr}",
            )
            root = self._assert_valid_gpx_schema(output_file)
            ns = {"g": GPX_NS}
            trackpoints = root.findall(".//g:trkpt", ns)
            self.assertEqual(len(trackpoints), 0)
        finally:
            Path(output_file).unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
