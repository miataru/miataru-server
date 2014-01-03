# timestamp=$((`date +%s`*1000+`date +%-N`/1000000))
timestamp=$(date +%s)
curl -H 'Content-Type: application/json' -X POST 'http://service.miataru.com/UpdateLocation' -d '{"MiataruConfig":{"EnableLocationHistory":"True","LocationDataRetentionTime":"15"},"MiataruLocation":[{"Device":"BF0160F5-4138-402C-A5F0-DEB1AA1F4216","Timestamp":"'$timestamp'","Longitude":"'$1'","Latitude":"'$2'","HorizontalAccuracy":"50.00"}]}' --user-agent 'SimulateDevice'
echo
