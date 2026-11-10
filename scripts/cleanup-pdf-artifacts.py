import json
import os
import subprocess
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

delete_artifacts = os.environ["DELETE_ARTIFACTS"] == "true"
cutoff_input = os.environ["CUTOFF_DATETIME"].strip()
if delete_artifacts and not cutoff_input:
    raise SystemExit("Enter a cutoff time before enabling deletion.")
if cutoff_input:
    try:
        cutoff = datetime.strptime(cutoff_input, "%Y-%m-%d %H:%M")
    except ValueError:
        raise SystemExit("Enter a valid cutoff time in YYYY-MM-DD HH:MM format.")
    cutoff = cutoff.replace(tzinfo=ZoneInfo("Asia/Tokyo"))
else:
    cutoff = datetime.now(timezone.utc)
print(f"Cutoff (UTC): {cutoff.astimezone(timezone.utc).isoformat()}")

endpoint = f"repos/{os.environ['REPOSITORY']}/actions/artifacts"
response = subprocess.check_output(
    ["gh", "api", "--paginate", "--slurp", f"{endpoint}?name=ebook.pdf&per_page=100"],
    text=True,
)
candidates = []
for page in json.loads(response):
    for artifact in page["artifacts"]:
        if artifact["name"] != "ebook.pdf":
            continue
        created_at = datetime.fromisoformat(artifact["created_at"].replace("Z", "+00:00"))
        if created_at < cutoff:
            candidates.append(artifact)

if not candidates:
    print("No matching artifacts.")
    raise SystemExit(0)

with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
    print("### ebook.pdf cleanup candidates\n", file=summary)
    print("| Artifact ID | Created (UTC) | Size (bytes) |", file=summary)
    print("| --- | --- | --- |", file=summary)
    for artifact in candidates:
        print(
            f"| {artifact['id']} | {artifact['created_at']} | {artifact['size_in_bytes']} |",
            file=summary,
        )

if delete_artifacts:
    for artifact in candidates:
        artifact_id = artifact["id"]
        subprocess.run(
            ["gh", "api", "--method", "DELETE", f"{endpoint}/{artifact_id}", "--silent"],
            check=True,
        )
        print(f"Deleted artifact {artifact_id}")
else:
    print("Preview only. See the job summary for candidates.")
