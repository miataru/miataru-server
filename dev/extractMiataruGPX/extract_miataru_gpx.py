#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request
import xml.etree.ElementTree as ET


API_URL = "https://service.miataru.com/v1/GetLocationHistory"
GPX_NS = "http://www.topografix.com/GPX/1/1"
MIATARU_EXT_NS = "https://miataru.com/ns/gpx/1"
DEFAULT_AMOUNT = "2147483647"


class MiataruAPIError(Exception):
    pass


class MiataruDataError(Exception):
    pass


def mask_secret(value: str, keep: int = 2) -> str:
    if value == "":
        return "<empty>"
    if len(value) <= keep * 2:
        return "*" * len(value)
    return f"{value[:keep]}{'*' * (len(value) - (keep * 2))}{value[-keep:]}"


def _local_tz():
    return datetime.now().astimezone().tzinfo or timezone.utc


def build_history_request(own_id: str, own_key: str, target_id: str, amount: str) -> dict[str, Any]:
    return {
        "MiataruConfig": {
            "RequestMiataruDeviceID": own_id,
            "RequestMiataruDeviceKey": own_key,
        },
        "MiataruGetLocationHistory": {
            "Device": target_id,
            "Amount": str(amount),
        },
    }


def parse_local_datetime(text: str) -> datetime:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=_local_tz())
        except ValueError:
            continue
    raise ValueError(
        f"Invalid datetime '{text}'. Expected 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD HH:MM:SS'."
    )


def normalize_miataru_timestamp(value: Any) -> datetime:
    try:
        timestamp = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid timestamp: {value}") from exc

    if abs(timestamp) >= 1_000_000_000_000:
        timestamp /= 1000.0

    try:
        return datetime.fromtimestamp(timestamp, tz=timezone.utc)
    except (OverflowError, OSError, ValueError) as exc:
        raise ValueError(f"Timestamp out of range: {value}") from exc


def extract_points_from_response(json_obj: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(json_obj, dict):
        raise MiataruDataError("API response is not a JSON object.")

    if "error" in json_obj:
        raise MiataruAPIError(str(json_obj["error"]))

    locations = json_obj.get("MiataruLocation")
    if locations is None:
        raise MiataruDataError("API response does not contain MiataruLocation.")
    if not isinstance(locations, list):
        raise MiataruDataError("MiataruLocation is not a list.")

    points: list[dict[str, Any]] = []
    for location in locations:
        if not isinstance(location, dict):
            continue

        try:
            point = {
                "device": str(location.get("Device", "")),
                "time": normalize_miataru_timestamp(location["Timestamp"]),
                "lat": float(location["Latitude"]),
                "lon": float(location["Longitude"]),
            }
        except (KeyError, TypeError, ValueError):
            continue

        for src_key, dst_key in (
            ("Altitude", "altitude"),
            ("Speed", "speed"),
            ("HorizontalAccuracy", "horizontal_accuracy"),
            ("BatteryLevel", "battery_level"),
        ):
            value = location.get(src_key)
            if value is None:
                continue
            try:
                point[dst_key] = float(value)
            except (TypeError, ValueError):
                continue

        points.append(point)

    points.sort(key=lambda p: p["time"])
    return points


def filter_points(
    points: list[dict[str, Any]],
    start_dt: datetime | None,
    end_dt: datetime | None,
) -> list[dict[str, Any]]:
    if start_dt and end_dt and start_dt > end_dt:
        raise ValueError("start datetime must be <= end datetime")

    start_utc = start_dt.astimezone(timezone.utc) if start_dt else None
    end_utc = end_dt.astimezone(timezone.utc) if end_dt else None

    filtered: list[dict[str, Any]] = []
    for point in points:
        point_time = point["time"]
        if start_utc and point_time < start_utc:
            continue
        if end_utc and point_time > end_utc:
            continue
        filtered.append(point)

    return filtered


def build_gpx(points: list[dict[str, Any]], metadata: dict[str, Any]) -> str:
    ET.register_namespace("", GPX_NS)
    ET.register_namespace("miataru", MIATARU_EXT_NS)
    ns = f"{{{GPX_NS}}}"
    ext_ns = f"{{{MIATARU_EXT_NS}}}"

    gpx = ET.Element(
        f"{ns}gpx",
        {
            "version": "1.1",
            "creator": str(metadata.get("creator", "extract_miataru_gpx")),
        },
    )
    trk = ET.SubElement(gpx, f"{ns}trk")
    name = str(metadata.get("name", "Miataru Track"))
    ET.SubElement(trk, f"{ns}name").text = name
    trkseg = ET.SubElement(trk, f"{ns}trkseg")

    for point in points:
        trkpt = ET.SubElement(
            trkseg,
            f"{ns}trkpt",
            {"lat": str(point["lat"]), "lon": str(point["lon"])},
        )
        if "altitude" in point:
            ET.SubElement(trkpt, f"{ns}ele").text = str(point["altitude"])
        ET.SubElement(trkpt, f"{ns}time").text = point["time"].astimezone(timezone.utc).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        ext_fields = []
        if "horizontal_accuracy" in point:
            ext_fields.append(("horizontalAccuracy", point["horizontal_accuracy"]))
        if "speed" in point:
            ext_fields.append(("speed", point["speed"]))
        if "battery_level" in point:
            ext_fields.append(("batteryLevel", point["battery_level"]))

        if ext_fields:
            extensions = ET.SubElement(trkpt, f"{ns}extensions")
            for key, value in ext_fields:
                ET.SubElement(extensions, f"{ext_ns}{key}").text = str(value)

    return ET.tostring(gpx, encoding="utf-8", xml_declaration=True).decode("utf-8")


def fetch_history(
    payload: dict[str, Any], timeout_seconds: int = 20, debug: bool = False
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        API_URL,
        data=data,
        method="POST",
        headers={"Content-Type": "application/json"},
    )

    if debug:
        payload_for_log = json.loads(json.dumps(payload))
        cfg = payload_for_log.get("MiataruConfig", {})
        if isinstance(cfg, dict) and "RequestMiataruDeviceKey" in cfg:
            cfg["RequestMiataruDeviceKey"] = mask_secret(str(cfg["RequestMiataruDeviceKey"]))
        print(f"[debug] POST {API_URL}", file=sys.stderr)
        print(f"[debug] request payload: {json.dumps(payload_for_log, ensure_ascii=False)}", file=sys.stderr)

    try:
        with request.urlopen(req, timeout=timeout_seconds) as response:
            body = response.read().decode("utf-8")
            if debug:
                print(f"[debug] HTTP status: {getattr(response, 'status', 'unknown')}", file=sys.stderr)
                print(f"[debug] response bytes: {len(body.encode('utf-8'))}", file=sys.stderr)
    except error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        detail = response_body.strip()
        try:
            parsed = json.loads(response_body)
            if isinstance(parsed, dict) and parsed.get("error"):
                detail = str(parsed["error"])
        except json.JSONDecodeError:
            pass
        raise MiataruAPIError(f"HTTP {exc.code}: {detail}") from exc
    except error.URLError as exc:
        raise MiataruAPIError(f"Network error: {exc.reason}") from exc
    except TimeoutError as exc:
        raise MiataruAPIError("Request timed out.") from exc

    try:
        parsed_body = json.loads(body)
    except json.JSONDecodeError as exc:
        raise MiataruDataError("Server returned non-JSON response.") from exc

    if not isinstance(parsed_body, dict):
        raise MiataruDataError("Server returned unexpected JSON structure.")

    if debug:
        keys = sorted(parsed_body.keys())
        print(f"[debug] response keys: {keys}", file=sys.stderr)
        server_cfg = parsed_body.get("MiataruServerConfig")
        if isinstance(server_cfg, dict):
            max_updates = server_cfg.get("MaximumNumberOfLocationUpdates")
            available = server_cfg.get("AvailableDeviceLocationUpdates")
            print(
                "[debug] MiataruServerConfig: "
                f"MaximumNumberOfLocationUpdates={max_updates}, "
                f"AvailableDeviceLocationUpdates={available}",
                file=sys.stderr,
            )

    return parsed_body


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Fetch Miataru location history and export it as GPX."
    )
    parser.add_argument("own_device_id", help="Requester device id (RequestMiataruDeviceID)")
    parser.add_argument("own_device_key", help="Requester device key (can be empty string)")
    parser.add_argument("target_device_id", help="Target device id to fetch history for")
    parser.add_argument("outputfile", help="Output GPX file path")
    parser.add_argument(
        "--start",
        dest="start",
        help="Filter start datetime in local time: YYYY-MM-DD HH:MM[:SS]",
    )
    parser.add_argument(
        "--end",
        dest="end",
        help="Filter end datetime in local time: YYYY-MM-DD HH:MM[:SS]",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print verbose debug diagnostics to stderr.",
    )
    parser.add_argument(
        "--debug-response",
        action="store_true",
        help="Print full raw JSON server response to stderr (implies --debug).",
    )
    return parser


def run_cli(argv: list[str]) -> int:
    parser = create_parser()

    try:
        args = parser.parse_args(argv)
    except SystemExit as exc:
        return int(exc.code) if isinstance(exc.code, int) else 2

    try:
        start_dt = parse_local_datetime(args.start) if args.start else None
        end_dt = parse_local_datetime(args.end) if args.end else None
        if start_dt and end_dt and start_dt > end_dt:
            print("Input error: --start must be <= --end.", file=sys.stderr)
            return 2

        payload = build_history_request(
            args.own_device_id,
            args.own_device_key,
            args.target_device_id,
            DEFAULT_AMOUNT,
        )
        debug_enabled = bool(args.debug or args.debug_response)
        response = fetch_history(payload, debug=debug_enabled)
        if args.debug_response:
            print(
                f"[debug] full response JSON: {json.dumps(response, ensure_ascii=False)}",
                file=sys.stderr,
            )
        points = extract_points_from_response(response)
        filtered_points = filter_points(points, start_dt, end_dt)

        if debug_enabled:
            available_updates = None
            server_cfg = response.get("MiataruServerConfig")
            if isinstance(server_cfg, dict):
                available_updates = server_cfg.get("AvailableDeviceLocationUpdates")
            print(
                f"[debug] points received={len(points)}, points after filter={len(filtered_points)}",
                file=sys.stderr,
            )
            if points:
                first_ts = points[0]["time"].strftime("%Y-%m-%dT%H:%M:%SZ")
                last_ts = points[-1]["time"].strftime("%Y-%m-%dT%H:%M:%SZ")
                print(f"[debug] data time range (UTC): {first_ts} .. {last_ts}", file=sys.stderr)
                if len(filtered_points) == 0:
                    print(
                        "[debug] All points were filtered out by --start/--end window.",
                        file=sys.stderr,
                    )
            else:
                print(
                    "[debug] Server returned no usable location history points. "
                    f"AvailableDeviceLocationUpdates={available_updates}.",
                    file=sys.stderr,
                )
                print(
                    "[debug] Hint: This can mean no history exists OR access is restricted by "
                    "allowed-device permissions on the target device.",
                    file=sys.stderr,
                )
            if start_dt or end_dt:
                start_text = start_dt.isoformat() if start_dt else "<none>"
                end_text = end_dt.isoformat() if end_dt else "<none>"
                print(f"[debug] filter window (local tz): start={start_text}, end={end_text}", file=sys.stderr)

        gpx_content = build_gpx(
            filtered_points,
            {
                "creator": "extract_miataru_gpx",
                "name": f"Miataru {args.target_device_id}",
            },
        )
        output_path = Path(args.outputfile)
        output_path.write_text(gpx_content, encoding="utf-8")

        print(f"Wrote {len(filtered_points)} points to {output_path}", file=sys.stderr)
        return 0
    except ValueError as exc:
        print(f"Input error: {exc}", file=sys.stderr)
        return 2
    except MiataruAPIError as exc:
        print(f"API/HTTP error: {exc}", file=sys.stderr)
        return 3
    except OSError as exc:
        print(f"File error: {exc}", file=sys.stderr)
        return 4
    except MiataruDataError as exc:
        print(f"Data error: {exc}", file=sys.stderr)
        return 5
    except Exception as exc:  # pragma: no cover
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 5


def main() -> None:
    sys.exit(run_cli(sys.argv[1:]))


if __name__ == "__main__":
    main()
