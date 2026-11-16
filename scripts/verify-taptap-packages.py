"""Inspect the exact upload packages, not just the source tree."""
import hashlib
import json
from pathlib import Path
import re
import zipfile

root = Path(__file__).resolve().parent.parent
report = {}
for kind, filename in [
    ("android", "LeanGarden-0.13.2-taptap.apk"),
    ("minigame", "LeanGarden-0.13.2-taptap-minigame.zip"),
]:
    package = root / "dist" / "taptap" / filename
    with zipfile.ZipFile(package) as archive:
        assert archive.testzip() is None, "Archive CRC failed"
        names = archive.namelist()
        forbidden = []
        for name in names:
            assert not name.startswith(("/", "\\")) and ".." not in Path(name).parts
            assert not name.endswith((".jks", ".pem", ".key", ".p12")) and ".signing" not in name
            if re.search(r"umeng|appwin|umcrash|efs.sdk|unionads", name, re.I):
                forbidden.append(name)
            if name.endswith((".dex", ".xml", ".js", ".json", ".html")) or name.startswith("assets/blobs/"):
                if re.search(rb"com[/.]umeng|umeng-appwin|UMUnionSdk|com[/.]efs[/.]sdk|u-mobads", archive.read(name), re.I):
                    forbidden.append(name)
        assert not forbidden, forbidden
        libraries = [n for n in names if n.startswith("lib/") and n.endswith(".so")]
        if kind == "android":
            # Java-only self-test channel. A future SDK store build may have ARM64 libraries.
            for name in libraries:
                if name.startswith("lib/armeabi-v7a/"):
                    assert name.replace("lib/armeabi-v7a/", "lib/arm64-v8a/") in names
            manifest = json.loads(archive.read("assets/manifest.json"))
            assert not any(a["url"] == "/reward-ads.js" for a in manifest["assets"])
            for asset in manifest["assets"]:
                data = archive.read("assets/blobs/" + asset["sha256"])
                assert len(data) == asset["bytes"] and hashlib.sha256(data).hexdigest() == asset["sha256"]
            dex = b"".join(archive.read(n) for n in names if n.endswith(".dex"))
            assert not re.search(rb"/api/(?:ads|energy/ad)|reward-ad|REQUEST_INSTALL_PACKAGES", dex, re.I)
        else:
            assert all(n in names for n in ["game.js", "game.json", "project.config.json"])
            assert sum(n.file_size for n in archive.infolist()) < 60000000
            runtime = archive.read("game.js")
            assert b"createRewardedVideoAd" in runtime
            assert not re.search(rb"\b(?:document|window|XMLHttpRequest)\b", runtime)
        report[kind] = {
            "file": str(package),
            "bytes": package.stat().st_size,
            "uncompressedBytes": sum(n.file_size for n in archive.infolist()),
            "files": len(names),
            "forbiddenSDKs": forbidden,
            "nativeLibraries": libraries,
            "sha256": hashlib.sha256(package.read_bytes()).hexdigest(),
        }
(root / "artifacts" / "taptap-package-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf8")
print(json.dumps(report, ensure_ascii=True))
