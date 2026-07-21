#!/usr/bin/env bash
# Runs the daily batch, then stops this EC2 instance.
# Triggered on boot by systemd/entertainment-ai-pipeline.service.
#
# Requires:
#   - awscli installed (`sudo apt-get install -y awscli` or `pip install awscli`)
#   - an IAM instance profile attached to this EC2 instance with permission
#     to stop *itself* (see pipeline/README.md, step 4)
set -euo pipefail

cd "$(dirname "$0")"

echo "[run.sh] $(date -u) starting batch pipeline"
python3 process_queue.py
echo "[run.sh] $(date -u) queue drain finished"

echo "[run.sh] $(date -u) starting autonomous content generation"
python3 generate_content.py
echo "[run.sh] $(date -u) content generation finished"

INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $(curl -s -X PUT 'http://169.254.169.254/latest/api/token' -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')" http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $(curl -s -X PUT 'http://169.254.169.254/latest/api/token' -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600')" http://169.254.169.254/latest/meta-data/placement/region)

echo "[run.sh] stopping instance $INSTANCE_ID in $REGION to save cost"
aws ec2 stop-instances --instance-ids "$INSTANCE_ID" --region "$REGION"
